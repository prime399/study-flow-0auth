/**
 * OpenAI client configuration and setup
 * Handles Heroku Inference API configuration with multiple model support
 */

import OpenAI from "openai"
import { randomUUID } from "crypto"

type ToolCall = OpenAI.Chat.Completions.ChatCompletionMessageToolCall
type FunctionToolCall = OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall


export interface OpenAIConfig {
  herokuBaseUrl: string
  herokuApiKey: string
  herokuModelId: string
}

// Model to environment key mapping
const MODEL_ENV_KEYS = {
  "gpt-oss-120b": "HEROKU_INFERENCE_KEY_OSS",
  "claude-4-5-sonnet": "HEROKU_INFERENCE_KEY_CLAUDE",
  "nova-lite": "HEROKU_INFERENCE_KEY_NOVA_LITE",
  "nova-pro": "HEROKU_INFERENCE_KEY_NOVA_PRO"
} as const

// Supported model IDs
export type SupportedModelId = keyof typeof MODEL_ENV_KEYS

// Get API key for specific model
function getModelApiKey(modelId: string): string {
  const envKey = MODEL_ENV_KEYS[modelId as SupportedModelId]
  if (!envKey) {
    throw new Error(`Unsupported model: ${modelId}. Supported models: ${Object.keys(MODEL_ENV_KEYS).join(", ")}`)
  }
  
  const apiKey = process.env[envKey]
  if (!apiKey) {
    throw new Error(`API key not configured for model ${modelId}. Please set ${envKey} environment variable.`)
  }
  
  return apiKey
}

// Validate that at least one model is configured
function validateModelConfiguration(): void {
  const configuredModels = Object.entries(MODEL_ENV_KEYS)
    .filter(([_, envKey]) => process.env[envKey])
    .map(([modelId, _]) => modelId)
  
  if (configuredModels.length === 0) {
    throw new Error(`No AI models configured. Please set at least one of: ${Object.values(MODEL_ENV_KEYS).join(", ")}`)
  }
}

// Parse CSV env list safely
function parseCsv(value?: string): string[] {
  return (value || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
}

// Get available models based on configured environment variables
export function getAvailableModels(): SupportedModelId[] {
  const configured = Object.entries(MODEL_ENV_KEYS)
    .filter(([_, envKey]) => process.env[envKey])
    .map(([modelId, _]) => modelId as SupportedModelId)

  // If HEROKU_INFERENCE_MODEL_ID is a CSV of allowed models, filter by it
  const allowedList = parseCsv(process.env.HEROKU_INFERENCE_MODEL_ID)
  if (allowedList.length > 0) {
    return configured.filter(m => allowedList.includes(m))
  }
  return configured
}

export function validateOpenAIConfig(modelId?: string): OpenAIConfig {
  const herokuBaseUrl = process.env.HEROKU_INFERENCE_URL
  
  if (!herokuBaseUrl) {
    throw new Error("HEROKU_INFERENCE_URL environment variable is not configured.")
  }

  // Validate at least one model is configured
  validateModelConfiguration()
  
  const availableModels = getAvailableModels()

  // If a modelId is provided and available, use it
  let selectedModelId = modelId && availableModels.includes(modelId as SupportedModelId)
    ? (modelId as SupportedModelId)
    : undefined

  // Otherwise, try to use the first allowed model from CSV that is configured
  if (!selectedModelId) {
    const allowedList = parseCsv(process.env.HEROKU_INFERENCE_MODEL_ID)
    selectedModelId = (allowedList.find(m => availableModels.includes(m as SupportedModelId)) as SupportedModelId) 
      || availableModels[0]
  }

  if (!selectedModelId) {
    throw new Error("No valid AI model selected or configured.")
  }

  // Get the appropriate API key for the selected model
  const herokuApiKey = getModelApiKey(selectedModelId)

  return {
    herokuBaseUrl,
    herokuApiKey,
    herokuModelId: selectedModelId,
  }
}

export function createOpenAIClient(config: OpenAIConfig): OpenAI {
  return new OpenAI({
    apiKey: config.herokuApiKey,
    baseURL: `${config.herokuBaseUrl.replace(/\/$/, "")}/v1`,
  })
}

export interface ChatCompletionOptions {
  model: string
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[]
  tool_choice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption
}

export const DEFAULT_COMPLETION_OPTIONS = {
  temperature: 0.7,
  top_p: 0.95,
  max_tokens: 64000,
} as const

const STREAM_REQUIRED_MODELS: ReadonlySet<SupportedModelId> = new Set([
  "gpt-oss-120b",
])

function shouldUseStreaming(modelId: string): boolean {
  return STREAM_REQUIRED_MODELS.has(modelId as SupportedModelId)
}

async function streamChatCompletion(
  client: OpenAI,
  options: ChatCompletionOptions,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const stream = await client.chat.completions.create({
    ...options,
    stream: true,
  })

  let aggregatedContent = ""
  let refusal: string | null = null
  let finishReason: OpenAI.Chat.Completions.ChatCompletion.Choice["finish_reason"] = "stop"
  let id: string | undefined
  let model = options.model
  let created = Math.floor(Date.now() / 1000)
  let systemFingerprint: string | undefined
  let usage: OpenAI.Chat.Completions.ChatCompletion["usage"] | undefined
  const toolCalls: ToolCall[] = []

  for await (const chunk of stream) {
    if (!chunk) {
      continue
    }

    id = chunk.id ?? id
    model = (chunk.model as typeof model) ?? model
    systemFingerprint = chunk.system_fingerprint ?? systemFingerprint

    if (typeof chunk.created === "number") {
      created = chunk.created
    }

    if (chunk.usage) {
      usage = chunk.usage
    }

    const choice = chunk.choices?.[0]
    if (!choice) {
      continue
    }

    if (choice.finish_reason) {
      finishReason = choice.finish_reason
    }

    const delta = choice.delta

    if (delta?.content) {
      aggregatedContent += delta.content
    }

    if (delta?.refusal) {
      refusal = `${refusal ?? ""}${delta.refusal}`
    }

    if (delta?.tool_calls) {
      delta.tool_calls.forEach((toolCallDelta: any, toolIndex: number) => {
        const targetIndex = toolCallDelta.index ?? toolIndex
        let toolCall = toolCalls[targetIndex]

        if (!toolCall || toolCall.type !== "function") {
          toolCall = {
            id: toolCallDelta.id ?? `tool-${targetIndex}`,
            type: "function",
            function: {
              name: toolCallDelta.function?.name ?? "",
              arguments: "",
            },
          }
          toolCalls[targetIndex] = toolCall
        }

        const functionCall = toolCall as FunctionToolCall

        if (toolCallDelta.id) {
          functionCall.id = toolCallDelta.id
        }

        if (toolCallDelta.function?.name) {
          functionCall.function.name = toolCallDelta.function.name
        }

        if (toolCallDelta.function?.arguments) {
          functionCall.function.arguments = `${functionCall.function.arguments}${toolCallDelta.function.arguments}`
        }
      })
    }
  }

  const completionId =
    id ?? `stream-${typeof randomUUID === "function" ? randomUUID() : Date.now().toString(36)}`

  return {
    id: completionId,
    object: "chat.completion",
    created,
    model,
    system_fingerprint: systemFingerprint,
    usage: usage ?? {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
    choices: [
      {
        index: 0,
        finish_reason: finishReason ?? "stop",
        message: {
          role: "assistant",
          content: aggregatedContent,
          refusal,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        logprobs: null,
      },
    ],
  }
}

export async function fetchChatCompletion(
  client: OpenAI,
  options: ChatCompletionOptions,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  if (shouldUseStreaming(options.model)) {
    return streamChatCompletion(client, options)
  }

  return client.chat.completions.create(options)
}

