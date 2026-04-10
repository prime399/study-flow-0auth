/**
 * API endpoint to fetch available MCP servers from Heroku Inference
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const herokuInferenceUrl = process.env.HEROKU_INFERENCE_URL
    // Use Claude key to access calendar-mcp-server addon
    const herokuInferenceKey = process.env.HEROKU_INFERENCE_KEY_CLAUDE || process.env.HEROKU_INFERENCE_KEY_OSS

    if (!herokuInferenceUrl || !herokuInferenceKey) {
      return Response.json(
        { error: "MCP configuration not available", tools: [], servers: [] },
        { status: 200 }
      )
    }

    const mcpServersUrl = `${herokuInferenceUrl.replace(/\/$/, "")}/v1/mcp/servers`

    const response = await fetch(mcpServersUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${herokuInferenceKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch MCP servers: ${response.status}`)
    }

    const servers = await response.json()
    
    // Transform server tools into a flat list of available tools
    const tools = servers.flatMap((server: any) => {
      if (!server.tools || !Array.isArray(server.tools)) {
        return []
      }
      
      return server.tools.map((tool: any) => ({
        id: `${server.namespace}/${tool.name}`,
        name: tool.name,
        namespace: server.namespace,
        description: tool.description || "No description available",
        inputSchema: tool.inputSchema,
      }))
    })

    return Response.json({ servers, tools })
  } catch (error) {
    console.error("Error fetching MCP servers:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch MCP servers" },
      { status: 500 }
    )
  }
}
