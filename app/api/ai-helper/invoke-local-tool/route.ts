/**
 * API endpoint to invoke local MCP tools directly
 * Bypasses Heroku Agents API for local MCP servers
 */

import { injectUserTokensToMCP } from '@/lib/mcp-token-injector'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ToolInvocationRequest {
  toolId: string
  arguments: Record<string, any>
  userId: string
  convexAuthToken?: string
}

/**
 * Invoke a tool on the local Google Calendar MCP server
 */
async function invokeGoogleCalendarTool(
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  const mcpUrl = process.env.GOOGLE_CALENDAR_MCP_URL
  const mcpApiKey = process.env.GOOGLE_CALENDAR_MCP_API_KEY

  if (!mcpUrl || !mcpApiKey) {
    throw new Error('Google Calendar MCP server not configured')
  }

  // Make MCP tool invocation request
  // The MCP server exposes its tools via the standard MCP protocol
  const response = await fetch(`${mcpUrl}/tools/call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': mcpApiKey,
      'Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      name: toolName,
      arguments: args,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`MCP tool invocation failed (${response.status}): ${errorText}`)
  }

  const result = await response.json()
  return result
}

export async function POST(req: Request) {
  try {
    const { toolId, arguments: toolArgs, userId, convexAuthToken }: ToolInvocationRequest =
      await req.json()

    if (!toolId || !toolArgs || !userId) {
      return Response.json(
        { error: 'Missing required fields: toolId, arguments, userId' },
        { status: 400 }
      )
    }

    // Extract namespace and tool name from toolId
    const [namespace, toolName] = toolId.split('/')

    if (!namespace || !toolName) {
      return Response.json(
        { error: 'Invalid toolId format. Expected: namespace/toolName' },
        { status: 400 }
      )
    }

    // Handle local Google Calendar MCP tools
    if (namespace === 'google-calendar-local') {
      // Inject user tokens to MCP server before invoking tool
      if (convexAuthToken) {
        const injectionResult = await injectUserTokensToMCP(userId, convexAuthToken)

        if (!injectionResult.success) {
          return Response.json(
            {
              error: 'Token injection failed',
              message: injectionResult.message,
            },
            { status: 401 }
          )
        }
      }

      // Ensure userId is included in tool arguments
      const argsWithUserId = {
        ...toolArgs,
        userId,
      }

      // Invoke the tool
      const result = await invokeGoogleCalendarTool(toolName, argsWithUserId)

      return Response.json({
        success: true,
        toolId,
        result,
      })
    }

    // For non-local tools, return error
    return Response.json(
      {
        error: 'Unsupported tool namespace',
        message: 'This endpoint only supports local MCP tools',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error invoking local MCP tool:', error)

    return Response.json(
      {
        error: 'Tool invocation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
