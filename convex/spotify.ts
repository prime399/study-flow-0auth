import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Store or update Spotify tokens for the authenticated user
 */
export const storeTokens = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.string(),
    tokenType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if tokens already exist for this user
    const existing = await ctx.db
      .query("spotifyTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing tokens
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scope: args.scope,
        tokenType: args.tokenType,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Insert new tokens
      return await ctx.db.insert("spotifyTokens", {
        userId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scope: args.scope,
        tokenType: args.tokenType,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Get Spotify tokens for the authenticated user
 */
export const getTokens = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const tokens = await ctx.db
      .query("spotifyTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return tokens;
  },
});

/**
 * Delete Spotify tokens for the authenticated user
 */
export const deleteTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tokens = await ctx.db
      .query("spotifyTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (tokens) {
      await ctx.db.delete(tokens._id);
    }

    return { success: true };
  },
});

/**
 * Refresh Spotify access token using refresh token
 */
export const refreshAccessToken = action({
  args: {
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Spotify credentials not configured");
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );

    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: args.refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Spotify token refresh failed: ${error}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || args.refreshToken, // Use old if not provided
        expiresAt: Date.now() + data.expires_in * 1000,
        scope: data.scope,
        tokenType: data.token_type,
      };
    } catch (error) {
      console.error("Error refreshing Spotify token:", error);
      throw error;
    }
  },
});

/**
 * Update access token after refresh
 */
export const updateAccessToken = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.string(),
    tokenType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tokens = await ctx.db
      .query("spotifyTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!tokens) {
      throw new Error("No Spotify tokens found");
    }

    await ctx.db.patch(tokens._id, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
      tokenType: args.tokenType,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
