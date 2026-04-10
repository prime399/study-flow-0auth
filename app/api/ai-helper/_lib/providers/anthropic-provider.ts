/**
 * Anthropic provider adapter
 * Supports both BYOK and platform keys
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  ProviderAdapter,
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from "./types";

export class AnthropicProvider implements ProviderAdapter {
  private client: Anthropic;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async chat(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      // Convert OpenAI-style messages to Anthropic format
      const systemMessage = request.messages.find((m) => m.role === "system");
      const conversationMessages = request.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      // Convert OpenAI tools to Anthropic tools if present
      let tools: Anthropic.Messages.Tool[] | undefined;
      if (request.tools && request.tools.length > 0) {
        tools = request.tools
          .filter((tool) => tool.type === "function")
          .map((tool) => ({
            name: tool.function.name,
            description: tool.function.description || "",
            input_schema: {
              type: "object" as const,
              ...(tool.function.parameters as Record<string, unknown>),
            },
          }));
      }

      const response = await this.client.messages.create({
        model: request.model || this.config.modelId,
        messages: conversationMessages,
        system: systemMessage?.content,
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature || 0.7,
        tools: tools,
      });

      // Convert Anthropic response to OpenAI format
      let content = "";
      let toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | undefined;

      for (const block of response.content) {
        if (block.type === "text") {
          content += block.text;
        } else if (block.type === "tool_use") {
          if (!toolCalls) {
            toolCalls = [];
          }
          toolCalls.push({
            id: block.id,
            type: "function",
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          });
        }
      }

      return {
        content,
        model: response.model,
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens:
            response.usage.input_tokens + response.usage.output_tokens,
        },
        toolCalls,
      };
    } catch (error: any) {
      console.error("Anthropic chat error:", error);
      throw new Error(
        `Anthropic API error: ${error.message || "Unknown error"}`
      );
    }
  }

  async validateKey(): Promise<boolean> {
    try {
      // Make a minimal test request
      await this.client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      });
      return true;
    } catch (error) {
      console.error("Anthropic key validation error:", error);
      return false;
    }
  }
}
