/**
 * API endpoint to get available AI models
 * Returns models that have valid API keys configured
 */

import { getAvailableModelInfo } from "../_lib/models"

export async function GET() {
  try {
    const availableModels = getAvailableModelInfo()
    
    if (availableModels.length === 0) {
      return Response.json(
        { error: "No AI models are currently available. Please configure API keys." },
        { status: 503 }
      )
    }

    // Return only serializable fields (no React nodes)
    const models = availableModels.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      badge: m.badge,
      badgeVariant: m.badgeVariant,
    }))

    return Response.json({
      models,
      count: models.length
    })
  } catch (error) {
    console.error("Error fetching available models:", error)
    
    return Response.json(
      { error: "Failed to fetch available models" },
      { status: 500 }
    )
  }
}