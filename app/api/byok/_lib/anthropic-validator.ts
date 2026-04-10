/**
 * Anthropic API key validator
 * Tests if an Anthropic API key is valid by making a simple API call
 */

import Anthropic from "@anthropic-ai/sdk";

export interface ValidatorResult {
  valid: boolean;
  error?: string;
  models?: string[];
}

/**
 * Validate an Anthropic API key
 */
export async function validateAnthropicKey(
  apiKey: string,
  baseUrl?: string
): Promise<ValidatorResult> {
  try {
    const client = new Anthropic({
      apiKey,
      baseURL: baseUrl,
    });

    // Make a minimal test request to validate the key
    // We'll use a very small request to minimize costs
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: "Hi",
        },
      ],
    });

    // If we get here, the key is valid
    return {
      valid: true,
      models: COMMON_ANTHROPIC_MODELS,
    };
  } catch (error: any) {
    console.error("Anthropic key validation error:", error);

    // Parse the error to provide helpful feedback
    if (error.status === 401) {
      return {
        valid: false,
        error: "Invalid API key. Please check your Anthropic API key.",
      };
    }

    if (error.status === 429) {
      return {
        valid: false,
        error: "Rate limit exceeded. Your API key is valid but has hit rate limits.",
      };
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return {
        valid: false,
        error: "Could not connect to Anthropic API. Please check your base URL.",
      };
    }

    return {
      valid: false,
      error: error.message || "Failed to validate Anthropic API key.",
    };
  }
}

/**
 * Common Anthropic models
 */
export const COMMON_ANTHROPIC_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
];

/**
 * Get available Anthropic models for a given API key
 * Note: Anthropic doesn't have a list models endpoint, so we return the known models
 */
export async function getAnthropicModels(
  apiKey: string,
  baseUrl?: string
): Promise<string[]> {
  // Anthropic doesn't have a models list endpoint
  // Return the common models we know about
  return COMMON_ANTHROPIC_MODELS;
}
