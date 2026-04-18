/**
 * Calendar executor — routes Google Calendar tool calls through the local
 * MCP server with per-user token injection.
 */

import { injectUserTokensToMCP } from '@/lib/mcp-token-injector'
import { isCalendarToolCall } from '../mcp-types'
import type { ToolExecutionRequest, ToolExecutionResult } from '../mcp-types'
import { registerExecutor } from './registry'

let calendarConfig: { userId: string; convexAuthToken: string } | null = null

export function configureCalendarExecutor(config: {
  userId: string
  convexAuthToken: string
}): void {
  calendarConfig = config
}

let jsonRpcId = 0

async function invokeGoogleCalendarTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const mcpUrl = process.env.GOOGLE_CALENDAR_MCP_URL
  const mcpApiKey = process.env.GOOGLE_CALENDAR_MCP_API_KEY

  if (!mcpUrl || !mcpApiKey) {
    throw new Error('Google Calendar MCP server not configured')
  }

  const response = await fetch(`${mcpUrl}/tools/call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'X-API-Key': mcpApiKey,
      'Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id: ++jsonRpcId,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `MCP tool invocation failed (${response.status}): ${errorText}`
    )
  }

  // MCP server returns SSE format: "event: message\ndata: {...}"
  const raw = await response.text()
  const dataLine = raw
    .split('\n')
    .find((line) => line.startsWith('data: '))
  if (!dataLine) {
    throw new Error(`Unexpected MCP response format: ${raw.slice(0, 200)}`)
  }

  const parsed = JSON.parse(dataLine.slice(6))
  if (parsed.error) {
    throw new Error(
      parsed.error.message || JSON.stringify(parsed.error)
    )
  }
  return parsed.result
}

async function execute(
  request: ToolExecutionRequest
): Promise<ToolExecutionResult> {
  if (!calendarConfig) {
    return {
      success: false,
      error: 'Calendar executor not configured — user not authenticated',
    }
  }

  const { userId, convexAuthToken } = calendarConfig

  try {
    // Inject tokens before each call
    const injection = await injectUserTokensToMCP(userId, convexAuthToken)
    if (!injection.success) {
      return {
        success: false,
        error: `Token injection failed: ${injection.message}`,
      }
    }

    // Add userId to arguments automatically
    const argsWithUser = { ...request.arguments, userId }

    const result = await invokeGoogleCalendarTool(
      request.toolName,
      argsWithUser
    )

    return { success: true, result }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Calendar tool call failed',
    }
  }
}

// Self-register with the registry
registerExecutor({
  match: isCalendarToolCall,
  execute,
})
