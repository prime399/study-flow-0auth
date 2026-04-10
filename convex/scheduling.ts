import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

/**
 * Generate AI-powered scheduling recommendations
 */
export const generateScheduleRecommendations = action({
  args: {
    targetDate: v.optional(v.number()), // Default to today
    sessionType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const userId = await ctx.runQuery(api.scheduling.getCurrentUserId);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user's historical performance data
    const hourlyPerformance = await ctx.runQuery(api.adaptiveCalendar.getHourlyPerformance);
    const optimalTimesResult = await ctx.runQuery(api.adaptiveCalendar.getOptimalStudyTimes);

    if (!hourlyPerformance || !optimalTimesResult || optimalTimesResult.length === 0) {
      // Not enough data, provide default recommendations
      return await ctx.runMutation(api.scheduling.createDefaultRecommendations, {
        targetDate: args.targetDate,
        sessionType: args.sessionType,
      });
    }

    // Find optimal time slots based on historical performance
    const recommendations: any[] = [];
    const targetDay = args.targetDate ? new Date(args.targetDate) : new Date();
    targetDay.setHours(0, 0, 0, 0);

    const optimalTimes = optimalTimesResult; // Now we know it's not null

    for (const optimalTime of optimalTimes.slice(0, 3)) {
      const recommendedTime = new Date(targetDay);
      recommendedTime.setHours(optimalTime.hour, 0, 0, 0);

      // Skip past times
      if (recommendedTime.getTime() < Date.now()) {
        continue;
      }

      const confidence = Math.min(100, optimalTime.score + (optimalTime.sessionCount * 2));

      let reason: string = `Based on ${optimalTime.sessionCount} previous sessions, `;
      reason += `you average ${optimalTime.avgProductivity}% productivity at ${optimalTime.hour}:00. `;

      if (optimalTime.avgProductivity >= 80) {
        reason += "This is one of your peak performance times!";
      } else if (optimalTime.avgProductivity >= 60) {
        reason += "You typically perform well during this hour.";
      }

      const recommendation: any = await ctx.runMutation(api.scheduling.createRecommendation, {
        recommendedTime: recommendedTime.getTime(),
        duration: 25 * 60, // 25 minutes (Pomodoro)
        sessionType: args.sessionType || "Focus Session",
        confidence,
        reason,
        basedOnMetrics: JSON.stringify({
          hourlyProductivity: optimalTime.avgProductivity,
          sampleSize: optimalTime.sessionCount,
          hour: optimalTime.hour,
        }),
      });

      recommendations.push(recommendation);
    }

    return recommendations;
  },
});

/**
 * Helper query to get current user ID in actions
 */
export const getCurrentUserId = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUserId(ctx);
  },
});

/**
 * Create a schedule recommendation
 */
export const createRecommendation = mutation({
  args: {
    recommendedTime: v.number(),
    duration: v.number(),
    sessionType: v.string(),
    confidence: v.number(),
    reason: v.string(),
    basedOnMetrics: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    const recommendationId = await ctx.db.insert("adaptiveSchedule", {
      userId,
      recommendedTime: args.recommendedTime,
      duration: args.duration,
      sessionType: args.sessionType,
      confidence: args.confidence,
      reason: args.reason,
      basedOnMetrics: args.basedOnMetrics,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return recommendationId;
  },
});

/**
 * Create default recommendations when no historical data exists
 */
export const createDefaultRecommendations = mutation({
  args: {
    targetDate: v.optional(v.number()),
    sessionType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const recommendations = [];
    const targetDay = args.targetDate ? new Date(args.targetDate) : new Date();
    targetDay.setHours(0, 0, 0, 0);

    // Default optimal times: 9 AM, 2 PM, 7 PM
    const defaultHours = [9, 14, 19];

    for (const hour of defaultHours) {
      const recommendedTime = new Date(targetDay);
      recommendedTime.setHours(hour, 0, 0, 0);

      if (recommendedTime.getTime() < Date.now()) {
        continue;
      }

      const now = Date.now();

      const recommendationId = await ctx.db.insert("adaptiveSchedule", {
        userId,
        recommendedTime: recommendedTime.getTime(),
        duration: 25 * 60,
        sessionType: args.sessionType || "Focus Session",
        confidence: 50,
        reason: "Default recommendation based on common productivity patterns. Complete more sessions to get personalized recommendations.",
        basedOnMetrics: JSON.stringify({ type: "default", hour }),
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      recommendations.push(recommendationId);
    }

    return recommendations;
  },
});

/**
 * Get pending recommendations
 */
export const getPendingRecommendations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const now = Date.now();

    // Get pending recommendations that haven't expired
    const recommendations = await ctx.db
      .query("adaptiveSchedule")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "pending")
      )
      .filter((q) => q.gte(q.field("recommendedTime"), now))
      .order("desc")
      .take(10);

    return recommendations;
  },
});

/**
 * Accept a recommendation and optionally create calendar event
 */
export const acceptRecommendation = mutation({
  args: {
    recommendationId: v.id("adaptiveSchedule"),
    createCalendarEvent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const recommendation = await ctx.db.get(args.recommendationId);
    if (!recommendation || recommendation.userId !== userId) {
      throw new Error("Recommendation not found or unauthorized");
    }

    await ctx.db.patch(args.recommendationId, {
      status: "accepted",
      updatedAt: Date.now(),
    });

    return { success: true, recommendation };
  },
});

/**
 * Reject a recommendation
 */
export const rejectRecommendation = mutation({
  args: {
    recommendationId: v.id("adaptiveSchedule"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const recommendation = await ctx.db.get(args.recommendationId);
    if (!recommendation || recommendation.userId !== userId) {
      throw new Error("Recommendation not found or unauthorized");
    }

    await ctx.db.patch(args.recommendationId, {
      status: "rejected",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Expire old recommendations
 */
export const expireOldRecommendations = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    const oldRecommendations = await ctx.db
      .query("adaptiveSchedule")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "pending")
      )
      .filter((q) => q.lt(q.field("recommendedTime"), now))
      .collect();

    for (const rec of oldRecommendations) {
      await ctx.db.patch(rec._id, {
        status: "expired",
        updatedAt: now,
      });
    }

    return { expired: oldRecommendations.length };
  },
});

/**
 * Get recommendation history
 */
export const getRecommendationHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const recommendations = await ctx.db
      .query("adaptiveSchedule")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 50);

    return recommendations;
  },
});

/**
 * Get recommendation statistics
 */
export const getRecommendationStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const allRecommendations = await ctx.db
      .query("adaptiveSchedule")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const accepted = allRecommendations.filter(r => r.status === "accepted").length;
    const rejected = allRecommendations.filter(r => r.status === "rejected").length;
    const expired = allRecommendations.filter(r => r.status === "expired").length;
    const pending = allRecommendations.filter(r => r.status === "pending").length;

    const acceptanceRate = allRecommendations.length > 0
      ? Math.round((accepted / (accepted + rejected)) * 100)
      : 0;

    return {
      total: allRecommendations.length,
      accepted,
      rejected,
      expired,
      pending,
      acceptanceRate,
    };
  },
});
