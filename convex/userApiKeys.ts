/**
 * Convex functions for managing user API keys (BYOK - Bring Your Own Key)
 */

import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { encryptApiKey, decryptApiKey, maskApiKey } from "./lib/encryption";
import { api } from "./_generated/api";

/**
 * Get all API keys for the current user
 * Returns masked keys for display purposes
 */
export const getUserApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const keys = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Return keys with masked API keys
    return keys.map((key) => ({
      _id: key._id,
      keyName: key.keyName,
      provider: key.provider,
      maskedApiKey: maskApiKey(key.encryptedApiKey), // Mask the encrypted key
      baseUrl: key.baseUrl,
      modelId: key.modelId,
      isActive: key.isActive,
      lastUsed: key.lastUsed,
      usageCount: key.usageCount || 0,
      lastValidated: key.lastValidated,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));
  },
});

/**
 * Get the active API key for a specific provider
 * Returns the decrypted API key for use in API calls
 * This should only be called from server-side (actions/mutations)
 */
export const getActiveApiKeyForProvider = query({
  args: {
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("openrouter")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const key = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!key) {
      return null;
    }

    return {
      _id: key._id,
      keyName: key.keyName,
      provider: key.provider,
      encryptedApiKey: key.encryptedApiKey, // Return encrypted key
      baseUrl: key.baseUrl,
      modelId: key.modelId,
      lastUsed: key.lastUsed,
      usageCount: key.usageCount || 0,
    };
  },
});

/**
 * Get the first active API key for the current user (any provider)
 */
export const getActiveApiKey = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const key = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_and_active", (q) =>
        q.eq("userId", userId).eq("isActive", true)
      )
      .first();

    if (!key) {
      return null;
    }

    return {
      _id: key._id,
      keyName: key.keyName,
      provider: key.provider,
      encryptedApiKey: key.encryptedApiKey,
      baseUrl: key.baseUrl,
      modelId: key.modelId,
      lastUsed: key.lastUsed,
      usageCount: key.usageCount || 0,
    };
  },
});

/**
 * Store a new API key or update an existing one
 */
export const storeApiKey = mutation({
  args: {
    keyName: v.string(),
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("openrouter")
    ),
    apiKey: v.string(), // Plain text API key (will be encrypted)
    baseUrl: v.optional(v.string()),
    modelId: v.string(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Encrypt the API key before storing
    const encryptedApiKey = await encryptApiKey(args.apiKey);

    const now = Date.now();

    // Check if user already has a key for this provider
    const existingKey = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .first();

    if (existingKey) {
      // Update existing key
      await ctx.db.patch(existingKey._id, {
        keyName: args.keyName,
        encryptedApiKey,
        baseUrl: args.baseUrl,
        modelId: args.modelId,
        isActive: args.isActive ?? true,
        updatedAt: now,
      });

      return existingKey._id;
    } else {
      // Create new key
      const keyId = await ctx.db.insert("userApiKeys", {
        userId,
        keyName: args.keyName,
        provider: args.provider,
        encryptedApiKey,
        baseUrl: args.baseUrl,
        modelId: args.modelId,
        isActive: args.isActive ?? true,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      return keyId;
    }
  },
});

/**
 * Update an existing API key
 */
export const updateApiKey = mutation({
  args: {
    keyId: v.id("userApiKeys"),
    keyName: v.optional(v.string()),
    modelId: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the key belongs to the user
    const key = await ctx.db.get(args.keyId);
    if (!key || key.userId !== userId) {
      throw new Error("API key not found or access denied");
    }

    // Update the key
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.keyName !== undefined) updates.keyName = args.keyName;
    if (args.modelId !== undefined) updates.modelId = args.modelId;
    if (args.baseUrl !== undefined) updates.baseUrl = args.baseUrl;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.keyId, updates);
  },
});

/**
 * Toggle the active status of an API key
 */
export const toggleApiKey = mutation({
  args: {
    keyId: v.id("userApiKeys"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const key = await ctx.db.get(args.keyId);
    if (!key || key.userId !== userId) {
      throw new Error("API key not found or access denied");
    }

    await ctx.db.patch(args.keyId, {
      isActive: !key.isActive,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete an API key
 */
export const deleteApiKey = mutation({
  args: {
    keyId: v.id("userApiKeys"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const key = await ctx.db.get(args.keyId);
    if (!key || key.userId !== userId) {
      throw new Error("API key not found or access denied");
    }

    await ctx.db.delete(args.keyId);
  },
});

/**
 * Record usage of an API key
 */
export const recordApiKeyUsage = mutation({
  args: {
    keyId: v.id("userApiKeys"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const key = await ctx.db.get(args.keyId);
    if (!key || key.userId !== userId) {
      throw new Error("API key not found or access denied");
    }

    await ctx.db.patch(args.keyId, {
      lastUsed: Date.now(),
      usageCount: (key.usageCount || 0) + 1,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Validate an API key by making a test request to the provider
 * This is an action because it needs to make external API calls
 */
export const validateApiKey = action({
  args: {
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("openrouter")
    ),
    apiKey: v.string(),
    baseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Not authenticated");
    }

    try {
      // Call the validation API endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/byok/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: args.provider,
            apiKey: args.apiKey,
            baseUrl: args.baseUrl,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Validation failed");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("API key validation error:", error);
      throw new Error(
        `Failed to validate ${args.provider} API key: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },
});

/**
 * Mark API key as validated
 */
export const markApiKeyValidated = mutation({
  args: {
    keyId: v.id("userApiKeys"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const key = await ctx.db.get(args.keyId);
    if (!key || key.userId !== userId) {
      throw new Error("API key not found or access denied");
    }

    await ctx.db.patch(args.keyId, {
      lastValidated: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
