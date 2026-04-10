/**
 * BYOK (Bring Your Own Key) helper
 * Checks for user's API keys and provides appropriate configuration
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { decryptApiKey } from "@/convex/lib/encryption";

export interface BYOKConfig {
  provider: "openai" | "anthropic" | "openrouter";
  apiKey: string;
  baseUrl?: string;
  modelId: string;
  isBYOK: true;
}

export interface PlatformConfig {
  herokuBaseUrl: string;
  herokuApiKey: string;
  herokuModelId: string;
  isBYOK: false;
}

export type AIConfig = BYOKConfig | PlatformConfig;

/**
 * Check if user has a BYOK key configured and return appropriate config
 * Returns BYOK config if available, otherwise returns platform config
 */
export async function getAIConfig(
  convexAuthToken: string | undefined,
  convexUrl: string,
  requestedModelId?: string,
  platformConfigFn?: () => PlatformConfig
): Promise<AIConfig> {
  // If no auth token, use platform keys
  if (!convexAuthToken) {
    if (platformConfigFn) {
      return platformConfigFn();
    }
    throw new Error("No authentication token and no platform config available");
  }

  try {
    // Create Convex client and check for user's API keys
    const convexClient = new ConvexHttpClient(convexUrl);
    convexClient.setAuth(convexAuthToken);

    // Get user's active API key
    const userApiKey = await convexClient.query(api.userApiKeys.getActiveApiKey);

    if (userApiKey) {
      console.log(
        `[BYOK] Found active BYOK key: ${userApiKey.provider} (model: ${userApiKey.modelId})`
      );

      // Decrypt the API key
      const decryptedKey = await decryptApiKey(userApiKey.encryptedApiKey);

      return {
        provider: userApiKey.provider as "openai" | "anthropic" | "openrouter",
        apiKey: decryptedKey,
        baseUrl: userApiKey.baseUrl,
        modelId: requestedModelId || userApiKey.modelId,
        isBYOK: true,
      };
    }

    // No BYOK key found, fall back to platform keys
    console.log("[BYOK] No active BYOK key found, using platform keys");
    if (platformConfigFn) {
      return platformConfigFn();
    }
    throw new Error("No BYOK key found and no platform config available");
  } catch (error) {
    console.error("[BYOK] Error checking for BYOK keys:", error);

    // On error, fall back to platform keys if available
    if (platformConfigFn) {
      console.log("[BYOK] Falling back to platform keys due to error");
      return platformConfigFn();
    }
    throw error;
  }
}

/**
 * Check if a configuration is using BYOK
 */
export function isBYOKConfig(config: AIConfig): config is BYOKConfig {
  return config.isBYOK === true;
}

/**
 * Record usage of a BYOK key
 */
export async function recordBYOKUsage(
  convexAuthToken: string,
  convexUrl: string,
  provider: string
): Promise<void> {
  try {
    const convexClient = new ConvexHttpClient(convexUrl);
    convexClient.setAuth(convexAuthToken);

    const userApiKey = await convexClient.query(
      api.userApiKeys.getActiveApiKeyForProvider,
      { provider: provider as any }
    );

    if (userApiKey) {
      await convexClient.mutation(api.userApiKeys.recordApiKeyUsage, {
        keyId: userApiKey._id,
      });
    }
  } catch (error) {
    console.error("[BYOK] Error recording usage:", error);
    // Don't fail the request if usage recording fails
  }
}
