/**
 * Shared MCP types used across AI helper routes and tool executors.
 */

export interface McpTool {
  id: string
  name: string
  namespace: string
  description: string
  inputSchema?: Record<string, unknown>
  isLocal?: boolean
  baseUrl?: string
}

export interface McpServer {
  namespace: string
  name: string
  version: string
  tools: McpTool[]
  isLocal?: boolean
  baseUrl?: string
}

export interface ToolExecutionRequest {
  namespace: string
  toolName: string
  arguments: Record<string, unknown>
}

export interface ToolExecutionResult {
  success: boolean
  result?: unknown
  error?: string
}

export type ToolExecutorFn = (
  request: ToolExecutionRequest
) => Promise<ToolExecutionResult>

export interface ToolExecutor {
  match: (namespace: string, toolName: string) => boolean
  execute: ToolExecutorFn
}

export const CALENDAR_TOOL_NAMES = [
  'list-calendars',
  'list-events',
  'create-event',
  'update-event',
  'delete-event',
  'get-event',
  'search-events',
  'get-freebusy',
  'list-colors',
  'get-current-time',
] as const

export const CALENDAR_NAMESPACES = [
  'mcp',
  'google-calendar',
  'google-calendar-local',
] as const

export function isCalendarTool(tool: McpTool): boolean {
  return (
    CALENDAR_NAMESPACES.includes(
      tool.namespace as (typeof CALENDAR_NAMESPACES)[number]
    ) ||
    CALENDAR_TOOL_NAMES.includes(
      tool.name as (typeof CALENDAR_TOOL_NAMES)[number]
    )
  )
}

export function isCalendarToolCall(
  namespace: string,
  toolName: string
): boolean {
  return (
    CALENDAR_NAMESPACES.includes(
      namespace as (typeof CALENDAR_NAMESPACES)[number]
    ) ||
    CALENDAR_TOOL_NAMES.includes(
      toolName as (typeof CALENDAR_TOOL_NAMES)[number]
    )
  )
}
