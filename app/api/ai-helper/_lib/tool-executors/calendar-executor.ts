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
      'X-API-Key': mcpApiKey,
      'Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({ name: toolName, arguments: args }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `MCP tool invocation failed (${response.status}): ${errorText}`
    )
  }

  return response.json()
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
