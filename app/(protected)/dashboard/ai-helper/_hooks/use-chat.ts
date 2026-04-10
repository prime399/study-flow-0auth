/**
 * Custom hook for chat functionality
 * Manages chat state, API communication, and user interactions
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  Message,
  saveMessagesToStorage,
  loadMessagesFromStorage,
  clearMessagesFromStorage,
  createUserMessage,
  createAssistantMessage,
} from "../_components/chat-state"
import {
  AUTO_MODEL_ID,
  DEFAULT_FALLBACK_MODEL_ID,
  DEFAULT_MCP_TOOL,
  MCP_TOOLS,
  type McpToolId,
} from "../_constants"

interface UseChatProps {
  studyStats: any
  groupInfo: any
  userName?: string
}

type ModelPreference = string

type AvailableModelsResponse = {
  models?: { id: string }[]
}

const COINS_PER_AI_MESSAGE = 100
const COIN_SHORTAGE_MESSAGE =
  "You need at least 100 coins to ask MentorMind. Start a study session to earn more coins (every second of study adds 1 coin)."

const MCP_TOOL_STORAGE_KEY = "preferredMcpTool"

export function useChat({ studyStats, groupInfo, userName }: UseChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pendingCoinsRef = useRef(0)

  // State management
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [selectedModelState, setSelectedModelState] = useState<ModelPreference>(AUTO_MODEL_ID)
  const [selectedMcpToolState, setSelectedMcpToolState] = useState<McpToolId>(DEFAULT_MCP_TOOL)
  const [resolvedModel, setResolvedModel] = useState<string>(DEFAULT_FALLBACK_MODEL_ID)
  const [coinBalance, setCoinBalance] = useState<number>(
    typeof studyStats?.coinsBalance === "number" ? studyStats.coinsBalance : 0,
  )

  const spendCoins = useMutation(api.study.spendCoins)
  const refundCoins = useMutation(api.study.refundCoins)

  const applyModelPreference = useCallback((modelId: string, fallbackResolved?: string) => {
    setSelectedModelState(modelId)
    if (modelId === AUTO_MODEL_ID) {
      setResolvedModel(fallbackResolved ?? DEFAULT_FALLBACK_MODEL_ID)
    } else {
      setResolvedModel(modelId)
    }
  }, [])

  // Load messages and model preference from localStorage on mount
  useEffect(() => {
    const savedMessages = loadMessagesFromStorage()
    if (savedMessages.length > 0) {
      setMessages(savedMessages)
    }

    const savedPreference = localStorage.getItem("preferredModel") ?? AUTO_MODEL_ID

    const savedMcpTool = localStorage.getItem(MCP_TOOL_STORAGE_KEY)
    if (savedMcpTool && MCP_TOOLS.some(tool => tool.id === savedMcpTool)) {
      setSelectedMcpToolState(savedMcpTool as McpToolId)
    }

    fetch("/api/ai-helper/models")
      .then(res => res.json() as Promise<AvailableModelsResponse>)
      .then(data => {
        const availableModels = Array.isArray(data.models) ? data.models : []
        const firstAvailable = availableModels[0]?.id ?? DEFAULT_FALLBACK_MODEL_ID

        if (
          savedPreference !== AUTO_MODEL_ID &&
          availableModels.some(model => model.id === savedPreference)
        ) {
          applyModelPreference(savedPreference)
        } else {
          applyModelPreference(AUTO_MODEL_ID, firstAvailable)
          localStorage.setItem("preferredModel", AUTO_MODEL_ID)
        }
      })
      .catch(err => {
        console.warn("Failed to validate model availability:", err)
        const fallbackResolved = savedPreference === AUTO_MODEL_ID ? DEFAULT_FALLBACK_MODEL_ID : undefined
        applyModelPreference(savedPreference, fallbackResolved)
      })
  }, [applyModelPreference])

  // Sync coin balance whenever stats change (and no pending deductions)
  useEffect(() => {
    if (typeof studyStats?.coinsBalance === "number" && pendingCoinsRef.current === 0) {
      setCoinBalance(studyStats.coinsBalance)
    }
  }, [studyStats?.coinsBalance])

  // Save model preference to localStorage
  useEffect(() => {
    localStorage.setItem("preferredModel", selectedModelState)
  }, [selectedModelState])

  // Save MCP tool preference to localStorage
  useEffect(() => {
    localStorage.setItem(MCP_TOOL_STORAGE_KEY, selectedMcpToolState)
  }, [selectedMcpToolState])

  // Save messages to localStorage
  useEffect(() => {
    saveMessagesToStorage(messages)
  }, [messages])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return

    if (coinBalance < COINS_PER_AI_MESSAGE) {
      setError(COIN_SHORTAGE_MESSAGE)
      toast.error("Not enough coins", {
        description: "Start a study session to earn coins. Every second of focused study gives you 1 coin.",
      })
      return
    }

    setIsLoading(true)
    setError(null)

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const spendResult = await spendCoins({ amount: COINS_PER_AI_MESSAGE, reason: "ai-helper" })
      pendingCoinsRef.current = COINS_PER_AI_MESSAGE
      setCoinBalance(spendResult.balance)

      const userMessage = createUserMessage(messageContent)
      setMessages(prev => [...prev, userMessage])
      setInput("")

      const response = await fetch("/api/ai-helper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          studyStats,
          groupInfo,
          userName,
          modelId: selectedModelState,
          mcpToolId: selectedMcpToolState !== DEFAULT_MCP_TOOL ? selectedMcpToolState : undefined,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const toolInvocations = Array.isArray(data.toolInvocations)
        ? data.toolInvocations
        : []

      if (typeof data.selectedModel === "string") {
        setResolvedModel(data.selectedModel)
      } else if (selectedModelState !== AUTO_MODEL_ID) {
        setResolvedModel(selectedModelState)
      }

      // Check if BYOK was used - if so, refund the coins
      if (data.isBYOK === true && pendingCoinsRef.current > 0) {
        try {
          const refundResult = await refundCoins({
            amount: pendingCoinsRef.current,
            reason: "byok-refund"
          })
          setCoinBalance(refundResult.balance)
          pendingCoinsRef.current = 0

          toast.success("BYOK used - coins refunded!", {
            description: `Using your ${data.provider} API key. No coins charged.`,
          })
        } catch (refundError) {
          console.error("Failed to refund coins for BYOK:", refundError)
        }
      } else {
        // Platform keys used - coins were spent
        pendingCoinsRef.current = 0
      }

      let assistantContent = ""
      if (data.choices && data.choices[0] && data.choices[0].message) {
        assistantContent = data.choices[0].message.content
      } else {
        assistantContent = "I apologize, but I couldn't generate a proper response. Please try again."
      }

      const assistantMessage = createAssistantMessage(assistantContent, toolInvocations)
      setMessages(prev => [...prev, assistantMessage])
    } catch (err: any) {
      if (pendingCoinsRef.current > 0) {
        try {
          const refundResult = await refundCoins({ amount: pendingCoinsRef.current, reason: "ai-helper-refund" })
          setCoinBalance(refundResult.balance)
        } catch (refundError) {
          console.error("Failed to refund coins after error:", refundError)
        } finally {
          pendingCoinsRef.current = 0
        }
      }

      if (err?.message === "INSUFFICIENT_COINS") {
        setError(COIN_SHORTAGE_MESSAGE)
        toast.error("Not enough coins", {
          description: "Start a study session to earn coins. Every second of focused study gives you 1 coin.",
        })
      } else if (err?.name === "AbortError") {
        toast.info("Request cancelled")
      } else {
        console.error("Error sending message:", err)
        setError(err?.message ?? "Something went wrong.")
        toast.error("Failed to get response", {
          description: err?.message ?? "Please try again.",
        })
      }
    } finally {
      setIsLoading(false)
      setAbortController(null)
    }
  }, [coinBalance, groupInfo, isLoading, messages, refundCoins, selectedModelState, selectedMcpToolState, spendCoins, studyStats, userName])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }, [input, sendMessage])

  const append = useCallback((message: { role: "user"; content: string }) => {
    sendMessage(message.content)
  }, [sendMessage])

  const stop = useCallback(() => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsLoading(false)
      toast.info("Request stopped")
    }
  }, [abortController])

  const reload = useCallback(() => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === "user")
      if (lastUserMessage) {
        // Remove the last assistant message if it exists
        const lastMessageIndex = messages.length - 1
        if (messages[lastMessageIndex]?.role === "assistant") {
          setMessages(prev => prev.slice(0, -1))
        }
        sendMessage(lastUserMessage.content)
      }
    }
  }, [messages, sendMessage])

  const clearChat = useCallback(() => {
    setMessages([])
    clearMessagesFromStorage()
    setError(null)
    toast.success("Chat history cleared")
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const setSelectedModel = useCallback((modelId: string) => {
    applyModelPreference(modelId)
  }, [applyModelPreference])

  const setSelectedMcpTool = useCallback((toolId: McpToolId) => {
    setSelectedMcpToolState(toolId)
  }, [])

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    messagesEndRef,
    selectedModel: selectedModelState,
    resolvedModel,
    coinBalance,
    coinsRequired: COINS_PER_AI_MESSAGE,
    selectedMcpTool: selectedMcpToolState,
    setSelectedModel,
    setSelectedMcpTool,
    handleSubmit,
    append,
    stop,
    reload,
    clearChat,
    clearError,
  }
}
