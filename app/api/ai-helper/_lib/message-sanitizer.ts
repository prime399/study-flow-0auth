/**
 * Message sanitization utilities for API processing
 * Ensures messages are properly formatted for OpenAI API
 */

import OpenAI from "openai"
import { AIRequestBody } from "@/lib/types"

export function sanitizeMessages(
  messages: AIRequestBody["messages"],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages.reduce<OpenAI.Chat.Completions.ChatCompletionMessageParam[]>((acc, message) => {
    const role = message?.role === "assistant" ? "assistant" : "user"
    const rawContent =
      typeof message?.content === "string"
        ? message.content
        : JSON.stringify(message?.content ?? "")

    const content = rawContent.trim()
    if (content.length === 0) {
      return acc
    }

    acc.push({ role, content } as OpenAI.Chat.Completions.ChatCompletionMessageParam)
    return acc
  }, [])
}