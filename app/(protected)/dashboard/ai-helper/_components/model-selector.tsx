"use client"
/**
 * Model selection component for AI helper
 * Allows users to choose between different AI models
 * Only shows models that are available (have API keys configured)
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Brain, Cpu, Zap, AlertTriangle, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

import { AUTO_MODEL_ID } from "../_constants"

export interface ModelInfo {
  id: string
  name: string
  description: string
  icon?: React.ReactNode
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
}

const getIconForModel = (id: string) => {
  switch (id) {
    case AUTO_MODEL_ID:
      return <Sparkles className="h-4 w-4" />
    case "gpt-oss-120b":
    case "nova-pro":
      return <Brain className="h-4 w-4" />
    case "nova-lite":
      return <Zap className="h-4 w-4" />
    case "claude-4-5-sonnet":
      return <Cpu className="h-4 w-4" />
    default:
      return <Brain className="h-4 w-4" />
  }
}

const AUTO_MODEL_OPTION: ModelInfo = {
  id: AUTO_MODEL_ID,
  name: "Smart Auto Route",
  description: "MentorMind chooses the best model for each request.",
  icon: getIconForModel(AUTO_MODEL_ID),
  badge: "Auto",
  badgeVariant: "secondary",
}

// Default models as fallback
const DEFAULT_MODELS: ModelInfo[] = [
  AUTO_MODEL_OPTION,
  {
    id: "claude-4-5-sonnet",
    name: "Claude 4.5 Sonnet",
    description: "Balanced reasoning model recommended for most study help.",
    icon: <Cpu className="h-4 w-4" />,
    badge: "Recommended",
    badgeVariant: "default",
  },
  {
    id: "nova-lite",
    name: "Nova Lite",
    description: "Fast and efficient for quick responses",
    icon: <Zap className="h-4 w-4" />,
    badge: "Fast",
    badgeVariant: "secondary",
  },
  {
    id: "nova-pro",
    name: "Nova Pro",
    description: "Balanced performance for most tasks",
    icon: <Brain className="h-4 w-4" />,
    badge: "Pro",
    badgeVariant: "outline",
  },
  {
    id: "gpt-oss-120b",
    name: "GPT OSS 120B",
    description: "OpenAI OSS model kept as a reliable fallback option",
    icon: <Brain className="h-4 w-4" />,
    badgeVariant: "outline",
  },
] as const

interface ModelSelectorProps {
  selectedModel: string
  resolvedModel: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

export function ModelSelector({ selectedModel, resolvedModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>(DEFAULT_MODELS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch available models on component mount
  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/ai-helper/models')

        if (!response.ok) {
          throw new Error('Failed to fetch available models')
        }

        const data = await response.json()

        const fetchedModels: ModelInfo[] = Array.isArray(data.models)
          ? data.models.map((model: ModelInfo) => ({
              ...model,
              icon: getIconForModel(model.id),
            }))
          : []

        if (fetchedModels.length > 0) {
          const mergedModels = [AUTO_MODEL_OPTION, ...fetchedModels]
          setAvailableModels(mergedModels)

          if (
            selectedModel !== AUTO_MODEL_ID &&
            !fetchedModels.some(model => model.id === selectedModel)
          ) {
            onModelChange(fetchedModels[0].id)
          }
        } else {
          setError('No models available')
          setAvailableModels(DEFAULT_MODELS)
        }
      } catch (err) {
        console.error('Error fetching models:', err)
        setError('Failed to load models')
        setAvailableModels(DEFAULT_MODELS)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAvailableModels()
  }, [selectedModel, onModelChange])

  const currentModel = availableModels.find(model => model.id === selectedModel) || availableModels[0]
  const resolvedModelInfo = availableModels.find(model => model.id === resolvedModel)

  if (error) {
    return (
      <div className="flex items-center gap-2 w-full p-2 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-xs">{error}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 w-full sm:flex-1">
      <span className="text-sm text-muted-foreground hidden lg:inline shrink-0">Model:</span>
      <Select value={selectedModel} onValueChange={onModelChange} disabled={disabled || isLoading}>
        <SelectTrigger className="w-full h-10 text-sm touch-manipulation">
          <SelectValue>
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0">{currentModel?.icon}</span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-xs sm:text-sm font-medium">
                  {isLoading ? 'Loading...' : currentModel?.name}
                </span>
                {selectedModel === AUTO_MODEL_ID && resolvedModelInfo && resolvedModelInfo.id !== AUTO_MODEL_ID && !isLoading && (
                  <span className="hidden md:inline text-[10px] text-muted-foreground truncate">
                    Routing to {resolvedModelInfo.name}
                  </span>
                )}
              </div>
              {currentModel?.badge && !isLoading && (
                <Badge variant={currentModel.badgeVariant} className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 shrink-0">
                  {currentModel.badge}
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-[calc(100vw-2rem)] sm:w-[360px] max-w-md" align="start">
          {availableModels.map((model) => (
            <SelectItem key={model.id} value={model.id} className="cursor-pointer touch-manipulation py-3">
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center gap-2">
                  {model.icon}
                  <span className="font-medium text-sm">{model.name}</span>
                  {model.badge && (
                    <Badge variant={model.badgeVariant} className="text-xs px-1.5 py-0.5">
                      {model.badge}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground pl-6 leading-snug">
                  {model.id === AUTO_MODEL_ID && resolvedModelInfo && resolvedModelInfo.id !== AUTO_MODEL_ID
                    ? `Current: ${resolvedModelInfo.name}`
                    : model.description}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
