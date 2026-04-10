/**
 * OpenRouter API key validator
 * Tests if an OpenRouter API key is valid by making a simple API call
 */

import OpenAI from "openai";

export interface ValidatorResult {
  valid: boolean;
  error?: string;
  models?: string[];
}

/**
 * Validate an OpenRouter API key
 */
export async function validateOpenRouterKey(
  apiKey: string,
  baseUrl?: string
): Promise<ValidatorResult> {
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl || "https://openrouter.ai/api/v1",
    });

    // Try to list available models as a validation test
    const response = await client.models.list();
    const models = response.data.map((model) => model.id);

    return {
      valid: true,
      models: models.slice(0, 20), // Return first 20 models
    };
  } catch (error: any) {
    console.error("OpenRouter key validation error:", error);

    // Parse the error to provide helpful feedback
    if (error.status === 401) {
      return {
        valid: false,
        error: "Invalid API key. Please check your OpenRouter API key.",
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
        error: "Could not connect to OpenRouter API. Please check your base URL.",
      };
    }

    return {
      valid: false,
      error: error.message || "Failed to validate OpenRouter API key.",
    };
  }
}

/**
 * Get available OpenRouter models for a given API key
 */
export async function getOpenRouterModels(
  apiKey: string,
  baseUrl?: string
): Promise<string[]> {
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl || "https://openrouter.ai/api/v1",
    });

    const response = await client.models.list();
    return response.data.map((model) => model.id).sort();
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
    return COMMON_OPENROUTER_MODELS;
  }
}

/**
 * Common OpenRouter models (popular ones)
 */
export const COMMON_OPENROUTER_MODELS = [
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.5-haiku",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "google/gemini-pro-1.5",
  "meta-llama/llama-3.1-70b-instruct",
  "mistralai/mistral-large",
];
