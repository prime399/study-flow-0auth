/**
 * OpenAI provider adapter
 * Supports both BYOK and platform keys
 */

import OpenAI from "openai";
import {
  ProviderAdapter,
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from "./types";

export class OpenAIProvider implements ProviderAdapter {
  private client: OpenAI;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || "https://api.openai.com/v1",
    });
  }

  async chat(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: request.model || this.config.modelId,
        messages: request.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: request.temperature || 0.7,
        max_tokens: request.max_tokens || 4096,
        tools: request.tools,
      });

      const choice = response.choices[0];
      if (!choice) {
        throw new Error("No response from OpenAI");
      }

      return {
        content: choice.message.content || "",
        model: response.model,
        usage: response.usage,
        toolCalls: choice.message.tool_calls,
      };
    } catch (error: any) {
      console.error("OpenAI chat error:", error);
      throw new Error(
        `OpenAI API error: ${error.message || "Unknown error"}`
      );
    }
  }

  async validateKey(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error("OpenAI key validation error:", error);
      return false;
    }
  }
}
