import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Store or update Google Calendar tokens for the authenticated user
 */
export const storeTokens = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.string(),
    tokenType: v.string(),
    calendarId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if tokens already exist for this user
    const existing = await ctx.db
      .query("googleCalendarTokens")
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
        calendarId: args.calendarId,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Insert new tokens
      return await ctx.db.insert("googleCalendarTokens", {
        userId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scope: args.scope,
        tokenType: args.tokenType,
        calendarId: args.calendarId,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Get Google Calendar tokens for the authenticated user
 */
export const getTokens = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const tokens = await ctx.db
      .query("googleCalendarTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return tokens;
  },
});

/**
 * Delete Google Calendar tokens for the authenticated user
 */
export const deleteTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tokens = await ctx.db
      .query("googleCalendarTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (tokens) {
      await ctx.db.delete(tokens._id);
    }

    return { success: true };
  },
});

/**
 * Refresh Google Calendar access token using refresh token
 */
export const refreshAccessToken = action({
  args: {
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Google credentials not configured");
    }

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: args.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google token refresh failed: ${error}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || args.refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000,
        scope: data.scope,
        tokenType: data.token_type,
      };
    } catch (error) {
      console.error("Error refreshing Google token:", error);
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
      .query("googleCalendarTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!tokens) {
      throw new Error("No Google Calendar tokens found");
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

/**
 * Update sync settings
 */
export const updateSyncSettings = mutation({
  args: {
    autoSyncEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("googleCalendarSync")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        autoSyncEnabled: args.autoSyncEnabled,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("googleCalendarSync", {
        userId,
        autoSyncEnabled: args.autoSyncEnabled,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Get sync settings
 */
export const getSyncSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const settings = await ctx.db
      .query("googleCalendarSync")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return settings;
  },
});

/**
 * Update last sync time
 */
export const updateLastSyncTime = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("googleCalendarSync")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSyncTime: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Sync a study session to Google Calendar (called after session completion)
 * This can be called from the completeSession mutation in study.ts
 * Note: For now, sync happens via the API endpoint, not directly from actions
 * This function is kept for future direct sync implementation
 */
export const syncStudySessionToCalendarDirect = action({
  args: {
    accessToken: v.string(), // Pre-decrypted token
    calendarId: v.string(),
    sessionType: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const startDate = new Date(args.startTime);
      const endDate = new Date(args.endTime);

      const event = {
        summary: `Study Session - ${args.sessionType}`,
        description: `Study session completed\nType: ${args.sessionType}\nDuration: ${Math.round((args.endTime - args.startTime) / 1000 / 60)} minutes`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: "UTC",
        },
        colorId: "2", // Green color
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${args.calendarId}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${args.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to sync to Google Calendar:", error);
        return { success: false, reason: "API error" };
      }

      return { success: true, reason: "Synced" };
    } catch (error) {
      console.error("Error syncing study session to Google Calendar:", error);
      return { success: false, reason: "Error" };
    }
  },
});

/**
 * Set or update Google Calendar permissions for the authenticated user
 */
export const updatePermissions = mutation({
  args: {
    canReadEvents: v.boolean(),
    canCreateEvents: v.boolean(),
    canModifyEvents: v.boolean(),
    canDeleteEvents: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("googleCalendarPermissions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        canReadEvents: args.canReadEvents,
        canCreateEvents: args.canCreateEvents,
        canModifyEvents: args.canModifyEvents,
        canDeleteEvents: args.canDeleteEvents,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("googleCalendarPermissions", {
        userId,
        canReadEvents: args.canReadEvents,
        canCreateEvents: args.canCreateEvents,
        canModifyEvents: args.canModifyEvents,
        canDeleteEvents: args.canDeleteEvents,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Get Google Calendar permissions for the authenticated user
 */
export const getPermissions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const permissions = await ctx.db
      .query("googleCalendarPermissions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Return default permissions if none exist
    if (!permissions) {
      return {
        canReadEvents: true,
        canCreateEvents: true,
        canModifyEvents: false,
        canDeleteEvents: false,
      };
    }

    return permissions;
  },
});

/**
 * Check if user has a specific permission
 */
export const hasPermission = query({
  args: {
    permission: v.union(
      v.literal("read"),
      v.literal("create"),
      v.literal("modify"),
      v.literal("delete")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const permissions = await ctx.db
      .query("googleCalendarPermissions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!permissions) {
      // Default permissions
      return args.permission === "read" || args.permission === "create";
    }

    switch (args.permission) {
      case "read":
        return permissions.canReadEvents;
      case "create":
        return permissions.canCreateEvents;
      case "modify":
        return permissions.canModifyEvents;
      case "delete":
        return permissions.canDeleteEvents;
      default:
        return false;
    }
  },
});

/**
 * Get unsynced study sessions that need to be added to calendar
 */
export const getUnsyncedSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get completed sessions that haven't been synced
    const sessions = await ctx.db
      .query("studySessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), true),
          q.or(
            q.eq(q.field("syncedToCalendar"), false),
            q.eq(q.field("syncedToCalendar"), undefined)
          )
        )
      )
      .order("desc")
      .take(50); // Limit to recent 50 sessions

    return sessions;
  },
});

/**
 * Mark a study session as synced to Google Calendar
 */
export const markSessionSynced = mutation({
  args: {
    sessionId: v.id("studySessions"),
    googleCalendarEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the session belongs to this user
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    await ctx.db.patch(args.sessionId, {
      syncedToCalendar: true,
      googleCalendarEventId: args.googleCalendarEventId,
    });

    return { success: true };
  },
});

/**
 * Get sync statistics
 */
export const getSyncStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const allSessions = await ctx.db
      .query("studySessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("completed"), true))
      .collect();

    const syncedSessions = allSessions.filter(
      (s) => s.syncedToCalendar === true
    );
    const unsyncedSessions = allSessions.filter(
      (s) => s.syncedToCalendar !== true
    );

    return {
      totalCompletedSessions: allSessions.length,
      syncedCount: syncedSessions.length,
      unsyncedCount: unsyncedSessions.length,
      syncPercentage:
        allSessions.length > 0
          ? Math.round((syncedSessions.length / allSessions.length) * 100)
          : 0,
    };
  },
});
