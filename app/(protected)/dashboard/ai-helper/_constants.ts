export const AUTO_MODEL_ID = "auto"
export const DEFAULT_FALLBACK_MODEL_ID = "claude-4-5-sonnet"

export const MODEL_LABELS: Record<string, string> = {
  [AUTO_MODEL_ID]: "Smart Auto Route",
  "gpt-oss-120b": "GPT OSS 120B",
  "nova-lite": "Nova Lite",
  "nova-pro": "Nova Pro",
  "claude-4-5-sonnet": "Claude 4.5 Sonnet",
}



export const MCP_TOOLS = [
  {
    id: "none",
    label: "Auto-Select Tools",
    description: "Let MentorMind automatically choose the best tool for each task.",
  },
] as const

export type McpToolId = string

export const DEFAULT_MCP_TOOL: McpToolId = MCP_TOOLS[0].id

export interface DynamicMcpTool {
  id: string
  name: string
  namespace: string
  description: string
  inputSchema?: any
}

