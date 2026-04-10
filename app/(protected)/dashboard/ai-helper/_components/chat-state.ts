/**
 * Chat state management and persistence utilities
 * Handles localStorage integration and message state
 */

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  toolInvocations?: any[]
  timestamp: number
}

export const generateId = (): string => Math.random().toString(36).substring(2, 15)

export const saveMessagesToStorage = (messages: Message[]): void => {
  if (typeof window !== "undefined" && messages.length > 0) {
    localStorage.setItem("chatMessages", JSON.stringify(messages))
  }
}

export const loadMessagesFromStorage = (): Message[] => {
  if (typeof window === "undefined") return []
  
  try {
    const savedMessages = localStorage.getItem("chatMessages")
    return savedMessages ? JSON.parse(savedMessages) : []
  } catch (error) {
    console.error("Failed to parse saved messages:", error)
    return []
  }
}

export const clearMessagesFromStorage = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("chatMessages")
  }
}

export const createUserMessage = (content: string): Message => ({
  id: generateId(),
  role: "user",
  content: content.trim(),
  timestamp: Date.now(),
})

export const createAssistantMessage = (content: string, toolInvocations?: any[]): Message => ({
  id: generateId(),
  role: "assistant",
  content,
  toolInvocations: toolInvocations?.length ? toolInvocations : undefined,
  timestamp: Date.now(),
})