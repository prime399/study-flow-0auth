/**
 * Tool execution loop — calls Chat Completions API, executes tool calls
 * via the executor registry, feeds results back, and repeats.
 */

import OpenAI from 'openai'
import type { McpTool, ToolExecutionResult } from './mcp-types'

type FunctionToolCall =
  OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall
import { executeWithRegistry } from './tool-executors'
import {
  createOpenAIClient,
  fetchChatCompletion,
  getDefaultCompletionOptions,
  type OpenAIConfig,
  type ChatCompletionOptions,
} from './openai-client'

const MAX_ITERATIONS = 10

// OpenAI function names must match ^[a-zA-Z0-9_-]+$ — no slashes.
// We replace `/` with `__` and maintain a reverse map.
function sanitizeToolName(id: string): string {
  return id.replace(/\//g, '__')
}

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam

export function mcpToolsToOpenAITools(
  mcpTools: McpTool[]
): {
  tools: OpenAI.Chat.Completions.ChatCompletionTool[]
  nameMap: Map<string, string> // sanitized → original id
} {
  const nameMap = new Map<string, string>()

  const tools = mcpTools
    .filter((t) => t.id && typeof t.id === 'string')
    .map((tool) => {
      const safeName = sanitizeToolName(tool.id)
      nameMap.set(safeName, tool.id)
      return {
        type: 'function' as const,
        function: {
          name: safeName,
          description: tool.description || '',
          parameters: (tool.inputSchema as Record<string, unknown>) || {
            type: 'object',
            properties: {},
          },
        },
      }
    })

  return { tools, nameMap }
}

function parseToolCallId(
  sanitizedName: string,
  nameMap: Map<string, string>
): { namespace: string; toolName: string } {
  // Resolve back to original id (e.g. "google-calendar-local/list-events")
  const originalId = nameMap.get(sanitizedName) ?? sanitizedName
  const slashIndex = originalId.indexOf('/')
  if (slashIndex === -1) {
    return { namespace: '', toolName: originalId }
  }
  return {
    namespace: originalId.slice(0, slashIndex),
    toolName: originalId.slice(slashIndex + 1),
  }
}

async function executeToolCalls(
  toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
  nameMap: Map<string, string>
): Promise<Map<string, ToolExecutionResult>> {
  const results = new Map<string, ToolExecutionResult>()

  const settled = await Promise.allSettled(
    toolCalls.map(async (tc) => {
      const ftc = tc as FunctionToolCall
      const { namespace, toolName } = parseToolCallId(ftc.function.name, nameMap)
      let args: Record<string, unknown> = {}

      try {
        args = JSON.parse(ftc.function.arguments || '{}')
      } catch {
        return {
          id: ftc.id,
          result: {
            success: false,
            error: `Invalid JSON arguments: ${ftc.function.arguments}`,
          } satisfies ToolExecutionResult,
        }
      }

      const result = await executeWithRegistry({
        namespace,
        toolName,
        arguments: args,
      })

      return { id: ftc.id, result }
    })
  )

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      results.set(outcome.value.id, outcome.value.result)
    } else {
      // Promise.allSettled shouldn't reject, but handle defensively
      console.error('[ToolLoop] Unexpected rejection:', outcome.reason)
    }
  }

  return results
}

export interface ToolLoopConfig {
  maxIterations?: number
  stream?: boolean
}

export async function runToolLoop(
  config: OpenAIConfig,
  messages: Message[],
  mcpTools: McpTool[],
  loopConfig?: ToolLoopConfig
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const client = createOpenAIClient(config)
  const { tools: openaiTools, nameMap } = mcpToolsToOpenAITools(mcpTools)
  const maxIter = loopConfig?.maxIterations ?? MAX_ITERATIONS
  const conversationMessages: Message[] = [...messages]

  for (let iteration = 0; iteration < maxIter; iteration++) {
    const options: ChatCompletionOptions = {
      model: config.herokuModelId,
      messages: conversationMessages,
      ...getDefaultCompletionOptions(config.herokuModelId),
      tools: openaiTools.length > 0 ? openaiTools : undefined,
    }

    // On last iteration, drop tools to force a text response
    if (iteration === maxIter - 1) {
      delete options.tools
      delete options.tool_choice
    }

    let completion: OpenAI.Chat.Completions.ChatCompletion
    try {
      completion = await fetchChatCompletion(client, options)
    } catch (error) {
      // If the model doesn't support tools (400), fall back to no-tools
      if (
        iteration === 0 &&
        options.tools &&
        error instanceof Error &&
        'status' in error &&
        (error as { status: number }).status === 400
      ) {
        console.warn(
          `[ToolLoop] Model ${config.herokuModelId} rejected tools param, falling back to no-tools completion`
        )
        delete options.tools
        delete options.tool_choice
        completion = await fetchChatCompletion(client, options)
        return completion
      }
      throw error
    }

    const choice = completion.choices[0]

    if (!choice) {
      return completion
    }

    const toolCalls = choice.message.tool_calls
    if (!toolCalls || toolCalls.length === 0) {
      // Model returned text — we're done
      return completion
    }

    console.log(
      `[ToolLoop] Iteration ${iteration + 1}: ${toolCalls.length} tool call(s)`
    )

    // Append assistant message with tool_calls
    // Heroku/Claude API requires non-empty, non-whitespace content even when tool_calls are present
    const assistantContent = choice.message.content || '.'
    conversationMessages.push({
      role: 'assistant',
      content: assistantContent,
      tool_calls: toolCalls,
    } as Message)

    // Execute all tool calls
    const results = await executeToolCalls(toolCalls, nameMap)

    // Append tool results as tool messages
    for (const tc of toolCalls) {
      const result = results.get(tc.id) ?? {
        success: false,
        error: 'No result returned',
      }

      let toolContent: string
      if (result.success) {
        const serialized = JSON.stringify(result.result)
        toolContent = typeof serialized === 'string' ? serialized : '{}'
      } else {
        toolContent = `Error: ${result.error}`
      }

      conversationMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: toolContent,
      } as Message)
    }

    // Validate no undefined/null content before next API call
    // Heroku/Claude API rejects null and '' — use a space as fallback
    for (let i = 0; i < conversationMessages.length; i++) {
      const msg = conversationMessages[i] as unknown as Record<string, unknown>
      if (!msg.content) {
        msg.content = '.'
      }
    }
  }

  // Shouldn't reach here, but return a final completion without tools
  const finalCompletion = await fetchChatCompletion(client, {
    model: config.herokuModelId,
    messages: conversationMessages,
    ...getDefaultCompletionOptions(config.herokuModelId),
  })

  return finalCompletion
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onToolCall?: (toolName: string) => void
}

export async function runToolLoopStreaming(
  config: OpenAIConfig,
  messages: Message[],
  mcpTools: McpTool[],
  callbacks: StreamCallbacks,
  loopConfig?: ToolLoopConfig
): Promise<{ toolInvocations: { toolName: string; toolCallId: string }[] }> {
  const client = createOpenAIClient(config)
  const { tools: openaiTools, nameMap } = mcpToolsToOpenAITools(mcpTools)
  const maxIter = loopConfig?.maxIterations ?? MAX_ITERATIONS
  const conversationMessages: Message[] = [...messages]
  const allToolInvocations: { toolName: string; toolCallId: string }[] = []

  for (let iteration = 0; iteration < maxIter; iteration++) {
    const options: ChatCompletionOptions = {
      model: config.herokuModelId,
      messages: conversationMessages,
      ...getDefaultCompletionOptions(config.herokuModelId),
      tools: openaiTools.length > 0 ? openaiTools : undefined,
    }

    if (iteration === maxIter - 1) {
      delete options.tools
      delete options.tool_choice
    }

    const isLastChance = iteration === maxIter - 1 || !options.tools

    // For the potential final response, use streaming
    if (isLastChance || iteration > 0) {
      try {
        const stream = await client.chat.completions.create({
          ...options,
          stream: true,
        })

        let aggregatedContent = ''
        let hasToolCalls = false
        const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = []

        for await (const chunk of stream) {
          const choice = chunk.choices?.[0]
          if (!choice) continue

          if (choice.delta?.content) {
            callbacks.onToken(choice.delta.content)
            aggregatedContent += choice.delta.content
          }

          if (choice.delta?.tool_calls) {
            hasToolCalls = true
            for (const tcDelta of choice.delta.tool_calls) {
              const idx = tcDelta.index ?? 0
              if (!toolCalls[idx]) {
                toolCalls[idx] = {
                  id: tcDelta.id ?? `tool-${idx}`,
                  type: 'function',
                  function: { name: '', arguments: '' },
                }
              }
              if (tcDelta.id) toolCalls[idx].id = tcDelta.id
              const ftc = toolCalls[idx] as FunctionToolCall
              if (tcDelta.function?.name) {
                ftc.function.name += tcDelta.function.name
              }
              if (tcDelta.function?.arguments) {
                ftc.function.arguments += tcDelta.function.arguments
              }
            }
          }
        }

        if (!hasToolCalls) {
          return { toolInvocations: allToolInvocations }
        }

        // Process tool calls
        console.log(
          `[ToolLoop/Stream] Iteration ${iteration + 1}: ${toolCalls.length} tool call(s)`
        )

        for (const tc of toolCalls) {
          const ftc = tc as FunctionToolCall
          const { toolName } = parseToolCallId(ftc.function.name, nameMap)
          allToolInvocations.push({ toolName, toolCallId: ftc.id })
          callbacks.onToolCall?.(toolName)
        }

        conversationMessages.push({
          role: 'assistant',
          content: aggregatedContent || '.',
          tool_calls: toolCalls,
        } as Message)

        const results = await executeToolCalls(toolCalls, nameMap)

        for (const tc of toolCalls) {
          const result = results.get(tc.id) ?? {
            success: false,
            error: 'No result returned',
          }
          const toolContent = result.success
            ? JSON.stringify(result.result) || '{}'
            : `Error: ${result.error}`

          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: toolContent,
          } as Message)
        }

        for (let i = 0; i < conversationMessages.length; i++) {
          const msg = conversationMessages[i] as unknown as Record<string, unknown>
          if (!msg.content) msg.content = '.'
        }

        continue
      } catch (error) {
        if (
          iteration === 0 &&
          options.tools &&
          error instanceof Error &&
          'status' in error &&
          (error as { status: number }).status === 400
        ) {
          console.warn(
            `[ToolLoop/Stream] Model ${config.herokuModelId} rejected tools, falling back`
          )
          delete options.tools
          delete options.tool_choice
          const fallbackStream = await client.chat.completions.create({
            ...options,
            stream: true,
          })
          for await (const chunk of fallbackStream) {
            const delta = chunk.choices?.[0]?.delta?.content
            if (delta) callbacks.onToken(delta)
          }
          return { toolInvocations: allToolInvocations }
        }
        throw error
      }
    }

    // First iteration without streaming (tool calls expected)
    let completion: OpenAI.Chat.Completions.ChatCompletion
    try {
      completion = await fetchChatCompletion(client, options)
    } catch (error) {
      if (
        iteration === 0 &&
        options.tools &&
        error instanceof Error &&
        'status' in error &&
        (error as { status: number }).status === 400
      ) {
        delete options.tools
        delete options.tool_choice
        const fallbackStream = await client.chat.completions.create({
          ...options,
          stream: true,
        })
        for await (const chunk of fallbackStream) {
          const delta = chunk.choices?.[0]?.delta?.content
          if (delta) callbacks.onToken(delta)
        }
        return { toolInvocations: allToolInvocations }
      }
      throw error
    }

    const choice = completion.choices[0]
    if (!choice) return { toolInvocations: allToolInvocations }

    const completionToolCalls = choice.message.tool_calls
    if (!completionToolCalls || completionToolCalls.length === 0) {
      // Stream the text content token by token (simulate streaming for non-streamed response)
      const content = choice.message.content || ''
      const words = content.split(/(\s+)/)
      for (const word of words) {
        callbacks.onToken(word)
      }
      return { toolInvocations: allToolInvocations }
    }

    console.log(
      `[ToolLoop/Stream] Iteration ${iteration + 1}: ${completionToolCalls.length} tool call(s)`
    )

    for (const tc of completionToolCalls) {
      const ftc = tc as FunctionToolCall
      const { toolName } = parseToolCallId(ftc.function.name, nameMap)
      allToolInvocations.push({ toolName, toolCallId: ftc.id })
      callbacks.onToolCall?.(toolName)
    }

    conversationMessages.push({
      role: 'assistant',
      content: choice.message.content || '.',
      tool_calls: completionToolCalls,
    } as Message)

    const results = await executeToolCalls(completionToolCalls, nameMap)

    for (const tc of completionToolCalls) {
      const result = results.get(tc.id) ?? {
        success: false,
        error: 'No result returned',
      }
      const toolContent = result.success
        ? JSON.stringify(result.result) || '{}'
        : `Error: ${result.error}`

      conversationMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: toolContent,
      } as Message)
    }

    for (let i = 0; i < conversationMessages.length; i++) {
      const msg = conversationMessages[i] as unknown as Record<string, unknown>
      if (!msg.content) msg.content = '.'
    }
  }

  return { toolInvocations: allToolInvocations }
}
