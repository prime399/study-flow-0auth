/**
 * Heroku executor — catch-all that routes non-calendar tools through
 * the Heroku Agents API for server-side execution.
 */

import type { ToolExecutionRequest, ToolExecutionResult } from '../mcp-types'
import { registerExecutor } from './registry'

let herokuConfig: {
  herokuBaseUrl: string
  herokuApiKey: string
  herokuModelId: string
} | null = null

export function configureHerokuExecutor(config: {
  herokuBaseUrl: string
  herokuApiKey: string
  herokuModelId: string
}): void {
  herokuConfig = config
}

function parseSSEResponse(text: string): unknown {
  const lines = text.split('\n')
  let lastCompletion: unknown = null

  for (const line of lines) {
    if (!line.startsWith('data:')) continue

    const data = line.slice(5).trim()
    if (data === '[DONE]') break

    try {
      const parsed = JSON.parse(data) as Record<string, unknown>

      if (
        parsed.object === 'chat.completion' ||
        parsed.object === 'tool.completion'
      ) {
        lastCompletion = parsed
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  return lastCompletion
}

async function execute(
  request: ToolExecutionRequest
): Promise<ToolExecutionResult> {
  if (!herokuConfig) {
    return {
      success: false,
      error: 'Heroku executor not configured',
    }
  }

  const { herokuBaseUrl, herokuApiKey, herokuModelId } = herokuConfig
  const agentsUrl = `${herokuBaseUrl.replace(/\/$/, '')}/v1/agents/heroku`
  const toolId = `${request.namespace}/${request.toolName}`

  try {
    const response = await fetch(agentsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${herokuApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: herokuModelId,
        messages: [
          {
            role: 'user',
            content: `Use the tool ${toolId} with these arguments: ${JSON.stringify(request.arguments)}`,
          },
        ],
        tools: [{ type: 'mcp', name: toolId }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Heroku Agents API error (${response.status}): ${errorText}`
      )
    }

    const text = await response.text()
    const completion = parseSSEResponse(text)

    if (!completion) {
      throw new Error('No valid completion received from Heroku Agents API')
    }

    return { success: true, result: completion }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Heroku tool call failed',
    }
  }
}

// Self-register as catch-all (matches everything)
registerExecutor({
  match: () => true,
  execute,
})
