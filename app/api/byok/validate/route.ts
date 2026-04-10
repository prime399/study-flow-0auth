/**
 * BYOK API key validation endpoint
 * Validates user-provided API keys for different providers
 */

import { NextRequest, NextResponse } from "next/server";
import { validateOpenAIKey } from "../_lib/openai-validator";
import { validateAnthropicKey } from "../_lib/anthropic-validator";
import { validateOpenRouterKey } from "../_lib/openrouter-validator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey, baseUrl } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Missing provider or apiKey" },
        { status: 400 }
      );
    }

    let result;

    switch (provider) {
      case "openai":
        result = await validateOpenAIKey(apiKey, baseUrl);
        break;

      case "anthropic":
        result = await validateAnthropicKey(apiKey, baseUrl);
        break;

      case "openrouter":
        result = await validateOpenRouterKey(apiKey, baseUrl);
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${provider}` },
          { status: 400 }
        );
    }

    if (result.valid) {
      return NextResponse.json({
        valid: true,
        models: result.models,
        message: "API key is valid",
      });
    } else {
      return NextResponse.json(
        {
          valid: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("API key validation error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: error.message || "Failed to validate API key",
      },
      { status: 500 }
    );
  }
}
