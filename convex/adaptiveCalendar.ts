import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Calculate productivity score based on session completion and duration
 */
function calculateProductivityScore(
  completed: boolean,
  duration: number,
  plannedDuration: number,
  breaksTaken: number = 0,
  breakDuration: number = 0
): number {
  if (!completed) return 0;

  // Base score for completion
  let score = 60;

  // Bonus for meeting duration target (max 30 points)
  const durationRatio = duration / plannedDuration;
  if (durationRatio >= 0.9 && durationRatio <= 1.1) {
    score += 30;
  } else if (durationRatio >= 0.8 && durationRatio <= 1.2) {
    score += 20;
  } else if (durationRatio >= 0.7) {
    score += 10;
  }

  // Bonus for appropriate breaks (max 10 points)
  const expectedBreaks = Math.floor(duration / (25 * 60)); // One break per 25 min
  if (breaksTaken >= expectedBreaks && breakDuration < duration * 0.2) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate focus quality based on session consistency
 */
function calculateFocusQuality(
  duration: number,
  breaksTaken: number = 0,
  breakDuration: number = 0
): number {
  // Base quality score
  let quality = 100;

  // Penalize excessive breaks
  const expectedBreaks = Math.floor(duration / (25 * 60));
  if (breaksTaken > expectedBreaks * 1.5) {
    quality -= 20;
  }

  // Penalize excessive break duration
  if (breakDuration > duration * 0.25) {
    quality -= 30;
  }

  // Bonus for sustained focus (long duration with few breaks)
  if (duration > 50 * 60 && breaksTaken <= expectedBreaks) {
    quality += 10;
  }

  return Math.min(100, Math.max(0, quality));
}

/**
 * Update session with performance metrics
 */
export const updateSessionMetrics = mutation({
  args: {
    sessionId: v.id("studySessions"),
    productivityScore: v.optional(v.number()),
    focusQuality: v.optional(v.number()),
    energyLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    breaksTaken: v.optional(v.number()),
    breakDuration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    // Calculate hour and day of week from startTime
    const startDate = new Date(session.startTime);
    const hourOfDay = startDate.getHours();
    const dayOfWeek = startDate.getDay();

    await ctx.db.patch(args.sessionId, {
      productivityScore: args.productivityScore,
      focusQuality: args.focusQuality,
      energyLevel: args.energyLevel,
      breaksTaken: args.breaksTaken,
      breakDuration: args.breakDuration,
      hourOfDay,
      dayOfWeek,
    });

    return { success: true };
  },
});

/**
 * Get hourly performance analytics
 */
export const getHourlyPerformance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Calculate fresh analytics
    const sessions = await ctx.db
      .query("studySessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("completed"), true))
      .collect();

    // Group by hour
    const hourlyData: Record<number, {
      totalSessions: number;
      avgProductivity: number;
      avgFocusQuality: number;
      totalDuration: number;
    }> = {};

    for (let hour = 0; hour < 24; hour++) {
      hourlyData[hour] = {
        totalSessions: 0,
        avgProductivity: 0,
        avgFocusQuality: 0,
        totalDuration: 0,
      };
    }

    sessions.forEach((session) => {
      const hour = session.hourOfDay ?? new Date(session.startTime).getHours();
      if (hour >= 0 && hour < 24) {
        hourlyData[hour].totalSessions++;
        hourlyData[hour].avgProductivity += session.productivityScore ?? 0;
        hourlyData[hour].avgFocusQuality += session.focusQuality ?? 0;
        hourlyData[hour].totalDuration += session.duration;
      }
    });

    // Calculate averages
    Object.keys(hourlyData).forEach((hourStr) => {
      const hour = parseInt(hourStr);
      const data = hourlyData[hour];
      if (data.totalSessions > 0) {
        data.avgProductivity = Math.round(data.avgProductivity / data.totalSessions);
        data.avgFocusQuality = Math.round(data.avgFocusQuality / data.totalSessions);
      }
    });

    return hourlyData;
  },
});

/**
 * Get daily performance analytics
 */
export const getDailyPerformance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const sessions = await ctx.db
      .query("studySessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("completed"), true))
      .collect();

    // Group by day of week (0-6)
    const dailyData: Record<number, {
      totalSessions: number;
      avgProductivity: number;
      avgFocusQuality: number;
      totalDuration: number;
      dayName: string;
    }> = {
      0: { totalSessions: 0, avgProductivity: 0, avgFocusQuality: 0, totalDuration: 0, dayName: "Sunday" },
      1: { totalSessions: 0, avgProductivity: 0, avgFocusQuality: 0, totalDuration: 0, dayName: "Monday" },
      2: { totalSessions: 0, avgProductivity: 0, avgFocusQuality: 0, totalDuration: 0, dayName: "Tuesday" },
      3: { totalSessions: 0, avgProductivity: 0, avgFocusQuality: 0, totalDuration: 0, dayName: "Wednesday" },
      4: { totalSessions: 0, avgProductivity: 0, avgFocusQuality: 0, totalDuration: 0, dayName: "Thursday" },
      5: { totalSessions: 0, avgProductivity: 0, avgFocusQuality: 0, totalDuration: 0, dayName: "Friday" },
      6: { totalSessions: 0, avgProductivity: 0, avgFocusQuality: 0, totalDuration: 0, dayName: "Saturday" },
    };

    sessions.forEach((session) => {
      const day = session.dayOfWeek ?? new Date(session.startTime).getDay();
      dailyData[day].totalSessions++;
      dailyData[day].avgProductivity += session.productivityScore ?? 0;
      dailyData[day].avgFocusQuality += session.focusQuality ?? 0;
      dailyData[day].totalDuration += session.duration;
    });

    // Calculate averages
    Object.keys(dailyData).forEach((dayStr) => {
      const day = parseInt(dayStr);
      const data = dailyData[day];
      if (data.totalSessions > 0) {
        data.avgProductivity = Math.round(data.avgProductivity / data.totalSessions);
        data.avgFocusQuality = Math.round(data.avgFocusQuality / data.totalSessions);
      }
    });

    return dailyData;
  },
});

/**
 * Get event impact analysis
 */
export const getEventImpactAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const sessions = await ctx.db
      .query("studySessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("completed"), true))
      .collect();

    // Analyze performance by preceding event type
    const eventImpact: Record<string, {
      count: number;
      avgProductivity: number;
      avgFocusQuality: number;
    }> = {};

    sessions.forEach((session) => {
      if (session.precedingEventType) {
        if (!eventImpact[session.precedingEventType]) {
          eventImpact[session.precedingEventType] = {
            count: 0,
            avgProductivity: 0,
            avgFocusQuality: 0,
          };
        }
        eventImpact[session.precedingEventType].count++;
        eventImpact[session.precedingEventType].avgProductivity += session.productivityScore ?? 0;
        eventImpact[session.precedingEventType].avgFocusQuality += session.focusQuality ?? 0;
      }
    });

    // Calculate averages
    Object.keys(eventImpact).forEach((eventType) => {
      const data = eventImpact[eventType];
      if (data.count > 0) {
        data.avgProductivity = Math.round(data.avgProductivity / data.count);
        data.avgFocusQuality = Math.round(data.avgFocusQuality / data.count);
      }
    });

    return eventImpact;
  },
});

/**
 * Get optimal study times based on historical performance
 */
export const getOptimalStudyTimes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const hourlyPerformance = await ctx.db
      .query("studySessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("completed"), true))
      .collect();

    // Group by hour and calculate composite score
    const hourScores: Record<number, {
      score: number;
      sessionCount: number;
      avgProductivity: number;
    }> = {};

    for (let hour = 0; hour < 24; hour++) {
      hourScores[hour] = { score: 0, sessionCount: 0, avgProductivity: 0 };
    }

    hourlyPerformance.forEach((session) => {
      const hour = session.hourOfDay ?? new Date(session.startTime).getHours();
      const productivity = session.productivityScore ?? 0;

      hourScores[hour].sessionCount++;
      hourScores[hour].avgProductivity += productivity;
    });

    // Calculate final scores
    Object.keys(hourScores).forEach((hourStr) => {
      const hour = parseInt(hourStr);
      const data = hourScores[hour];
      if (data.sessionCount > 0) {
        data.avgProductivity = data.avgProductivity / data.sessionCount;
        // Weight by both productivity and sample size
        data.score = data.avgProductivity * Math.min(1, data.sessionCount / 10);
      }
    });

    // Find top 5 optimal hours
    const sortedHours = Object.entries(hourScores)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 5)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        score: Math.round(data.score),
        sessionCount: data.sessionCount,
        avgProductivity: Math.round(data.avgProductivity),
      }));

    return sortedHours;
  },
});

/**
 * Get performance insights and recommendations
 */
export const getPerformanceInsights = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const sessions = await ctx.db
      .query("studySessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("completed"), true))
      .order("desc")
      .take(100); // Last 100 sessions

    if (sessions.length < 5) {
      return {
        insights: ["Complete more study sessions to get personalized insights!"],
        recommendations: [],
      };
    }

    const insights: string[] = [];
    const recommendations: string[] = [];

    // Analyze time-of-day patterns
    const morningScore = sessions.filter(s => (s.hourOfDay ?? 0) < 12).reduce((sum, s) => sum + (s.productivityScore ?? 0), 0);
    const afternoonScore = sessions.filter(s => (s.hourOfDay ?? 12) >= 12 && (s.hourOfDay ?? 12) < 18).reduce((sum, s) => sum + (s.productivityScore ?? 0), 0);
    const eveningScore = sessions.filter(s => (s.hourOfDay ?? 18) >= 18).reduce((sum, s) => sum + (s.productivityScore ?? 0), 0);

    const morningCount = sessions.filter(s => (s.hourOfDay ?? 0) < 12).length;
    const afternoonCount = sessions.filter(s => (s.hourOfDay ?? 12) >= 12 && (s.hourOfDay ?? 12) < 18).length;
    const eveningCount = sessions.filter(s => (s.hourOfDay ?? 18) >= 18).length;

    if (morningCount > 0 && afternoonCount > 0) {
      const morningAvg = morningScore / morningCount;
      const afternoonAvg = afternoonScore / afternoonCount;
      const diff = Math.abs(morningAvg - afternoonAvg);

      if (diff > 15) {
        if (morningAvg > afternoonAvg) {
          insights.push(`You're ${Math.round(((morningAvg - afternoonAvg) / afternoonAvg) * 100)}% more productive in the morning`);
          recommendations.push("Schedule your most important study sessions before noon");
        } else {
          insights.push(`You're ${Math.round(((afternoonAvg - morningAvg) / morningAvg) * 100)}% more productive in the afternoon`);
          recommendations.push("Schedule your most important study sessions after lunch");
        }
      }
    }

    // Analyze break patterns
    const avgBreaks = sessions.reduce((sum, s) => sum + (s.breaksTaken ?? 0), 0) / sessions.length;
    if (avgBreaks < 1 && sessions[0].duration > 30 * 60) {
      recommendations.push("Try taking regular breaks using the Pomodoro technique to improve focus");
    }

    // Analyze consistency
    const recentSessions = sessions.slice(0, 10);
    const consistencyScore = recentSessions.filter(s => (s.productivityScore ?? 0) > 70).length / recentSessions.length;
    if (consistencyScore > 0.7) {
      insights.push("Great consistency! You're maintaining high productivity across sessions");
    }

    return { insights, recommendations };
  },
});

/**
 * Export functions for external use
 */
export { calculateProductivityScore, calculateFocusQuality };
