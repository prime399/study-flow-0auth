import { AIRequestBody, StudyStats } from "@/lib/types"
import { getAvailableModels, SupportedModelId } from "./openai-client"

export type UrgencyLevel = "low" | "medium" | "high"
export type RequirementCategory = "analysis" | "planning" | "creative" | "motivation" | "general"
export type ConditionState = "stable" | "struggling" | "burnout"

type MessageLike = AIRequestBody["messages"] extends (infer T)[] ? T : never

interface SignalAnalysis<T> {
  value: T
  signals: string[]
}

export interface RoutingAnalysis {
  urgency: SignalAnalysis<UrgencyLevel>
  requirement: SignalAnalysis<RequirementCategory>
  condition: SignalAnalysis<ConditionState>
}

export interface RoutingDecision {
  requestedModelId?: string
  resolvedModelId: SupportedModelId
  resolutionSource: "manual" | "auto" | "fallback"
  analysis: RoutingAnalysis
}

const HIGH_URGENCY_KEYWORDS = [
  "urgent",
  "asap",
  "immediately",
  "right away",
  "deadline",
  "running out of time",
  "emergency",
]

const MEDIUM_URGENCY_KEYWORDS = [
  "soon",
  "quick",
  "fast",
  "today",
  "before",
  "need to finish",
]

const ANALYSIS_KEYWORDS = [
  "analyze",
  "analysis",
  "insight",
  "explain",
  "evaluate",
  "compare",
  "breakdown",
  "detailed",
  "reason",
]

const PLANNING_KEYWORDS = [
  "plan",
  "schedule",
  "organize",
  "roadmap",
  "timeline",
  "structure",
  "outline",
]

const CREATIVE_KEYWORDS = [
  "write",
  "draft",
  "story",
  "essay",
  "script",
  "creative",
  "compose",
]

const MOTIVATION_KEYWORDS = [
  "motivate",
  "motivation",
  "encourage",
  "mindset",
  "inspire",
  "support",
]

const BURNOUT_KEYWORDS = [
  "burned out",
  "burnt out",
  "exhausted",
  "overwhelmed",
  "stressed",
  "tired",
  "fatigued",
]

const STRUGGLING_KEYWORDS = [
  "can't focus",
  "procrastinate",
  "procrastination",
  "struggling",
  "stuck",
]

function findLastUserMessage(messages: AIRequestBody["messages"]): MessageLike | undefined {
  if (!Array.isArray(messages)) return undefined

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i] as MessageLike
    if (message && typeof message === "object" && (message as any).role === "user") {
      return message
    }
  }
  return undefined
}

function textFromMessage(message?: MessageLike): string {
  if (!message) return ""
  const raw = (message as any).content
  if (typeof raw === "string") return raw
  try {
    return JSON.stringify(raw)
  } catch {
    return String(raw ?? "")
  }
}

function includesKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`\\b${escaped}\\b`, "i")
  return pattern.test(text)
}

function analyzeUrgency(text: string): SignalAnalysis<UrgencyLevel> {
  const lower = text.toLowerCase()
  const signals: string[] = []

  if (HIGH_URGENCY_KEYWORDS.some(keyword => includesKeyword(lower, keyword))) {
    signals.push("Detected high-urgency keyword")
    return { value: "high", signals }
  }

  if (MEDIUM_URGENCY_KEYWORDS.some(keyword => includesKeyword(lower, keyword))) {
    signals.push("Detected medium-urgency keyword")
    return { value: "medium", signals }
  }

  if (text.length <= 120) {
    signals.push("Short prompt defaults to low urgency")
  }

  return { value: "low", signals }
}

function analyzeRequirement(text: string): SignalAnalysis<RequirementCategory> {
  const lower = text.toLowerCase()
  const signals: string[] = []

  if (ANALYSIS_KEYWORDS.some(keyword => includesKeyword(lower, keyword))) {
    signals.push("Analysis-oriented keyword present")
    return { value: "analysis", signals }
  }

  if (PLANNING_KEYWORDS.some(keyword => includesKeyword(lower, keyword))) {
    signals.push("Planning-oriented keyword present")
    return { value: "planning", signals }
  }

  if (CREATIVE_KEYWORDS.some(keyword => includesKeyword(lower, keyword))) {
    signals.push("Creative request keyword present")
    return { value: "creative", signals }
  }

  if (MOTIVATION_KEYWORDS.some(keyword => includesKeyword(lower, keyword))) {
    signals.push("Motivational support keyword present")
    return { value: "motivation", signals }
  }

  if (text.split(/\s+/).length > 120) {
    signals.push("Long-form request treated as analysis")
    return { value: "analysis", signals }
  }

  return { value: "general", signals }
}

function parseCompletionRate(stats?: StudyStats): number | undefined {
  const raw = stats?.stats?.completionRate
  if (!raw) return undefined
  const numeric = parseFloat(String(raw).replace(/%/g, ""))
  return Number.isNaN(numeric) ? undefined : numeric
}

function analyzeCondition(text: string, stats?: StudyStats): SignalAnalysis<ConditionState> {
  const lower = text.toLowerCase()
  const signals: string[] = []
  const completionRate = parseCompletionRate(stats)

  if (completionRate !== undefined && completionRate < 50) {
    signals.push(`Low completion rate detected (${completionRate}%)`)
    return { value: "struggling", signals }
  }

  if (BURNOUT_KEYWORDS.some(keyword => includesKeyword(lower, keyword))) {
    signals.push("Burnout-related keyword present")
    return { value: "burnout", signals }
  }

  if (STRUGGLING_KEYWORDS.some(keyword => includesKeyword(lower, keyword))) {
    signals.push("Struggling keyword present")
    return { value: "struggling", signals }
  }

  return { value: "stable", signals }
}

function pickFirstAvailable(
  preferences: SupportedModelId[],
  available: SupportedModelId[],
): { model: SupportedModelId; source: "auto" | "fallback" } {
  for (const candidate of preferences) {
    if (available.includes(candidate)) {
      return { model: candidate, source: "auto" }
    }
  }

  if (available.length === 0) {
    throw new Error("No AI models are configured or available")
  }

  return { model: available[0], source: "fallback" }
}

function buildPreferences(
  analysis: RoutingAnalysis,
  available: SupportedModelId[],
): { model: SupportedModelId; source: "auto" | "fallback" } {
  const { urgency, requirement, condition } = analysis

  if (urgency.value === "high") {
    return pickFirstAvailable([
      "nova-lite",
      "nova-pro",
      "claude-4-5-sonnet",
      "gpt-oss-120b",
    ], available)
  }

  if (requirement.value === "analysis") {
    return pickFirstAvailable([
      "claude-4-5-sonnet",
      "gpt-oss-120b",
      "nova-pro",
      "nova-lite",
    ], available)
  }

  if (requirement.value === "planning") {
    return pickFirstAvailable([
      "claude-4-5-sonnet",
      "nova-pro",
      "nova-lite",
      "gpt-oss-120b",
    ], available)
  }

  if (requirement.value === "creative") {
    return pickFirstAvailable([
      "nova-pro",
      "claude-4-5-sonnet",
      "gpt-oss-120b",
      "nova-lite",
    ], available)
  }

  if (requirement.value === "motivation") {
    return pickFirstAvailable([
      "claude-4-5-sonnet",
      "nova-pro",
      "gpt-oss-120b",
      "nova-lite",
    ], available)
  }

  if (condition.value === "burnout") {
    return pickFirstAvailable([
      "claude-4-5-sonnet",
      "nova-pro",
      "gpt-oss-120b",
      "nova-lite",
    ], available)
  }

  if (condition.value === "struggling") {
    return pickFirstAvailable([
      "claude-4-5-sonnet",
      "nova-pro",
      "gpt-oss-120b",
      "nova-lite",
    ], available)
  }

  return pickFirstAvailable([
    "claude-4-5-sonnet",
    "nova-pro",
    "nova-lite",
    "gpt-oss-120b",
  ], available)
}

export function resolveModelRouting(
  payload: Pick<AIRequestBody, "messages" | "studyStats"> & { modelId?: string }
): RoutingDecision {
  const availableModels = getAvailableModels()

  const requestedModelId = payload.modelId && payload.modelId !== "auto"
    ? payload.modelId
    : undefined

  if (requestedModelId && availableModels.includes(requestedModelId as SupportedModelId)) {
    const analysis: RoutingAnalysis = {
      urgency: { value: "low", signals: ["Manual selection"] },
      requirement: { value: "general", signals: [] },
      condition: { value: "stable", signals: [] },
    }

    return {
      requestedModelId,
      resolvedModelId: requestedModelId as SupportedModelId,
      resolutionSource: "manual",
      analysis,
    }
  }

  const lastMessage = findLastUserMessage(payload.messages)
  const messageText = textFromMessage(lastMessage)

  const analysis: RoutingAnalysis = {
    urgency: analyzeUrgency(messageText),
    requirement: analyzeRequirement(messageText),
    condition: analyzeCondition(messageText, payload.studyStats),
  }

  const preference = buildPreferences(analysis, availableModels)

  return {
    requestedModelId: payload.modelId,
    resolvedModelId: preference.model,
    resolutionSource: preference.source,
    analysis,
  }
}
