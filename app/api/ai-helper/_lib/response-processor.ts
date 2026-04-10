/**
 * Response processing utilities
 * Handles AI response formatting and tool invocation creation
 */

import OpenAI from "openai"
import { extractTablesFromContent, type TableData, type ToolInvocation } from "./table-processor"

export interface ProcessedResponse {
  choices: OpenAI.Chat.Completions.ChatCompletion.Choice[]
  toolInvocations: ToolInvocation[]
}

export function processAIResponse(
  completion: OpenAI.Chat.Completions.ChatCompletion
): ProcessedResponse {
  const firstChoice = completion.choices?.[0]
  const originalContent = firstChoice?.message?.content ?? ""

  const { content: cleanedContent, tables } =
    typeof originalContent === "string"
      ? extractTablesFromContent(originalContent)
      : { content: originalContent ?? "", tables: [] as TableData[] }

  const toolInvocations: ToolInvocation[] = tables.map((table, index) => ({
    toolName: "displayTable",
    toolCallId: `table-${index}`,
    state: "result",
    result: table,
  }))

  const updatedChoices =
    completion.choices?.map((choice, index) => {
      if (!choice?.message) {
        return choice
      }

      if (index === 0) {
        return {
          ...choice,
          message: {
            ...choice.message,
            content: cleanedContent,
          },
        }
      }

      return choice
    }) ?? []

  return {
    choices: updatedChoices,
    toolInvocations,
  }
}