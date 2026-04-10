/**
 * BYOK models endpoint
 * Returns available models for a given provider
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOpenAIModels,
  COMMON_OPENAI_MODELS,
} from "../_lib/openai-validator";
import {
  getAnthropicModels,
  COMMON_ANTHROPIC_MODELS,
} from "../_lib/anthropic-validator";
import {
  getOpenRouterModels,
  COMMON_OPENROUTER_MODELS,
} from "../_lib/openrouter-validator";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const provider = searchParams.get("provider");
    const apiKey = searchParams.get("apiKey");
    const baseUrl = searchParams.get("baseUrl") || undefined;

    if (!provider) {
      return NextResponse.json(
        { error: "Missing provider parameter" },
        { status: 400 }
      );
    }

    let models: string[];

    switch (provider) {
      case "openai":
        if (apiKey) {
          models = await getOpenAIModels(apiKey, baseUrl);
        } else {
          models = COMMON_OPENAI_MODELS;
        }
        break;

      case "anthropic":
        if (apiKey) {
          models = await getAnthropicModels(apiKey, baseUrl);
        } else {
          models = COMMON_ANTHROPIC_MODELS;
        }
        break;

      case "openrouter":
        if (apiKey) {
          models = await getOpenRouterModels(apiKey, baseUrl);
        } else {
          models = COMMON_OPENROUTER_MODELS;
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${provider}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ models });
  } catch (error: any) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch models" },
      { status: 500 }
    );
  }
}
