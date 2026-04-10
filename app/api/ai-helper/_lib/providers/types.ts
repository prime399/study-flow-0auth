/**
 * Shared types for AI provider adapters
 */

import OpenAI from "openai";

export type Provider = "openai" | "anthropic" | "openrouter" | "platform";

export interface ProviderConfig {
  provider: Provider;
  apiKey: string;
  baseUrl?: string;
  modelId: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
}

export interface ProviderAdapter {
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  validateKey(): Promise<boolean>;
}
