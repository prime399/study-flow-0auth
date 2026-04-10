/**
 * OpenAI API key validator
 * Tests if an OpenAI API key is valid by making a simple API call
 */

import OpenAI from "openai";

export interface ValidatorResult {
  valid: boolean;
  error?: string;
  models?: string[];
  organization?: string;
}

/**
 * Validate an OpenAI API key
 */
export async function validateOpenAIKey(
  apiKey: string,
  baseUrl?: string
): Promise<ValidatorResult> {
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl || "https://api.openai.com/v1",
    });

    // Try to list available models as a validation test
    const response = await client.models.list();
    const models = response.data.map((model) => model.id);

    return {
      valid: true,
      models: models.slice(0, 10), // Return first 10 models
    };
  } catch (error: any) {
    console.error("OpenAI key validation error:", error);

    // Parse the error to provide helpful feedback
    if (error.status === 401) {
      return {
        valid: false,
        error: "Invalid API key. Please check your OpenAI API key.",
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
        error: "Could not connect to OpenAI API. Please check your base URL.",
      };
    }

    return {
      valid: false,
      error: error.message || "Failed to validate OpenAI API key.",
    };
  }
}

/**
 * Get available OpenAI models for a given API key
 */
export async function getOpenAIModels(
  apiKey: string,
  baseUrl?: string
): Promise<string[]> {
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl || "https://api.openai.com/v1",
    });

    const response = await client.models.list();
    return response.data.map((model) => model.id).sort();
  } catch (error) {
    console.error("Error fetching OpenAI models:", error);
    return [];
  }
}

/**
 * Common OpenAI models (as fallback if API call fails)
 */
export const COMMON_OPENAI_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
  "o1-preview",
  "o1-mini",
];
