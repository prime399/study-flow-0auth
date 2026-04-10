/**
 * Provider factory
 * Creates the appropriate provider adapter based on configuration
 */

import { ProviderAdapter, ProviderConfig } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";

export function createProvider(config: ProviderConfig): ProviderAdapter {
  switch (config.provider) {
    case "openai":
    case "openrouter": // OpenRouter uses OpenAI-compatible API
      return new OpenAIProvider(config);

    case "anthropic":
      return new AnthropicProvider(config);

    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}
