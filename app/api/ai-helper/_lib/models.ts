/**
 * Model configuration and metadata
 * Centralized model definitions and availability checking
 */

import { getAvailableModels, type SupportedModelId } from "./openai-client"

export interface ModelInfo {
  id: SupportedModelId
  name: string
  description: string
  iconType?: "brain" | "zap" | "cpu"
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
}

// Complete model definitions
export const ALL_MODELS: ModelInfo[] = [
  {
    id: "gpt-oss-120b",
    name: "GPT OSS 120B",
    description: "OpenAI OSS model kept as a reliable fallback option",
    iconType: "brain",
  },
  {
    id: "nova-lite",
    name: "Nova Lite",
    description: "Fast and efficient for quick responses",
    iconType: "zap",
    badge: "Fast",
    badgeVariant: "secondary",
  },
  {
    id: "nova-pro",
    name: "Nova Pro",
    description: "Balanced performance for most tasks",
    iconType: "brain",
    badge: "Pro",
    badgeVariant: "outline",
  },
  {
    id: "claude-4-5-sonnet",
    name: "Claude 4.5 Sonnet",
    description: "Advanced reasoning model recommended for most study help.",
    iconType: "cpu",
    badge: "Recommended",
    badgeVariant: "default",
  },
] as const

// Get available models with their metadata
export function getAvailableModelInfo(): ModelInfo[] {
  const availableModelIds = getAvailableModels()
  return ALL_MODELS.filter(model => availableModelIds.includes(model.id))
}

// Get model info by ID
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return ALL_MODELS.find(model => model.id === modelId)
}

// Validate if a model is available
export function isModelAvailable(modelId: string): boolean {
  const availableModels = getAvailableModels()
  return availableModels.includes(modelId as SupportedModelId)
}