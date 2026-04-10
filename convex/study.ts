import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

const DEFAULT_STUDY_DURATION = 25 * 60
const DEFAULT_DAILY_GOAL = 120 * 60
const INITIAL_COINS = 500
const COINS_PER_SECOND = 1
export const AI_HELPER_QUERY_COST = 100

async function getStudySettings(ctx: QueryCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("studySettings")
    .filter((q) => q.eq(q.field("userId"), userId))
    .first()

  if (existing) {
    return existing
  }

  // Return default values if no settings exist
  return {
    _id: "" as any,
    _creationTime: Date.now(),
    userId,
    studyDuration: DEFAULT_STUDY_DURATION,
    dailyGoal: DEFAULT_DAILY_GOAL,
    totalStudyTime: 0,
    coinsBalance: INITIAL_COINS,
    lastUpdated: Date.now(),
  }
}

async function ensureStudySettings(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("studySettings")
    .filter((q) => q.eq(q.field("userId"), userId))
    .first()

  if (existing) {
    if (typeof existing.coinsBalance !== "number") {
      const coinsBalance = INITIAL_COINS
      await ctx.db.patch(existing._id, {
        coinsBalance,
        lastUpdated: Date.now(),
      })
      return { ...existing, coinsBalance }
    }
    // Ensure coinsBalance is always a number
    return { ...existing, coinsBalance: existing.coinsBalance ?? INITIAL_COINS }
  }

  const _id = await ctx.db.insert("studySettings", {
    userId,
    studyDuration: DEFAULT_STUDY_DURATION,
    dailyGoal: DEFAULT_DAILY_GOAL,
    totalStudyTime: 0,
    coinsBalance: INITIAL_COINS,
    lastUpdated: Date.now(),
  })

  const created = await ctx.db.get(_id)
  if (!created) {
    throw new Error("Failed to initialize study settings")
  }
  return { ...created, coinsBalance: created.coinsBalance ?? INITIAL_COINS }
}

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const settings = await getStudySettings(ctx, userId)

    return {
      studyDuration: settings.studyDuration ?? DEFAULT_STUDY_DURATION,
      totalStudyTime: settings.totalStudyTime ?? 0,
      dailyGoal: settings.dailyGoal ?? DEFAULT_DAILY_GOAL,
      coinsBalance: settings.coinsBalance ?? INITIAL_COINS,
    }
  },
})

export const updateSettings = mutation({
  args: {
    studyDuration: v.number(),
    dailyGoal: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const settings = await ensureStudySettings(ctx, userId)

    await ctx.db.patch(settings._id, {
      studyDuration: args.studyDuration,
      dailyGoal: args.dailyGoal,
      lastUpdated: Date.now(),
    })
  },
})

export const completeSession = mutation({
  args: {
    duration: v.number(),
    type: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    if (args.completed) {
      const settings = await ensureStudySettings(ctx, userId)
      const coinsEarned = args.duration * COINS_PER_SECOND
      const currentCoins = settings.coinsBalance ?? INITIAL_COINS

      await ctx.db.patch(settings._id, {
        totalStudyTime: settings.totalStudyTime + args.duration,
        coinsBalance: currentCoins + coinsEarned,
        lastUpdated: Date.now(),
      })
    }

    await ctx.db.insert("studySessions", {
      userId,
      startTime: Date.now() - args.duration * 1000,
      endTime: Date.now(),
      duration: args.duration,
      type: args.type,
      completed: args.completed,
    })
  },
})

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const settings = await getStudySettings(ctx, userId)

    const recentSessions = await ctx.db
      .query("studySessions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(10)

    return {
      totalStudyTime: settings.totalStudyTime ?? 0,
      coinsBalance: settings.coinsBalance ?? INITIAL_COINS,
      recentSessions: recentSessions ?? [],
    }
  },
})

export const getFullStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const settings = await getStudySettings(ctx, userId)

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentSessions = await ctx.db
      .query("studySessions")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.gt(q.field("startTime"), sevenDaysAgo),
        ),
      )
      .order("desc")
      .collect()

    const completedSessions = recentSessions.filter(
      (session) => session.completed,
    )
    const totalSessionsCount = recentSessions.length
    const completedSessionsCount = completedSessions.length

    return {
      totalStudyTime: settings.totalStudyTime ?? 0,
      studyDuration: settings.studyDuration ?? DEFAULT_STUDY_DURATION,
      dailyGoal: settings.dailyGoal ?? DEFAULT_DAILY_GOAL,
      coinsBalance: settings.coinsBalance ?? INITIAL_COINS,
      recentSessions: recentSessions.map((session) => ({
        startTime: new Date(session.startTime).toISOString(),
        endTime: session.endTime
          ? new Date(session.endTime).toISOString()
          : null,
        duration: session.duration,
        type: session.type,
        completed: session.completed,
      })),
      stats: {
        totalSessions: totalSessionsCount,
        completedSessions: completedSessionsCount,
        completionRate:
          totalSessionsCount > 0
            ? ((completedSessionsCount / totalSessionsCount) * 100).toFixed(1)
            : 0,
      },
    }
  },
})

export const spendCoins = mutation({
  args: {
    amount: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const amount = Math.max(0, Math.floor(args.amount))
    const settings = await ensureStudySettings(ctx, userId)
    const currentBalance = settings.coinsBalance ?? INITIAL_COINS

    if (amount <= 0) {
      return { balance: currentBalance }
    }

    if (currentBalance < amount) {
      throw new Error("INSUFFICIENT_COINS")
    }

    const newBalance = currentBalance - amount
    await ctx.db.patch(settings._id, {
      coinsBalance: newBalance,
      lastUpdated: Date.now(),
    })

    return { balance: newBalance }
  },
})

export const refundCoins = mutation({
  args: {
    amount: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const amount = Math.max(0, Math.floor(args.amount))
    const settings = await ensureStudySettings(ctx, userId)
    const currentBalance = settings.coinsBalance ?? INITIAL_COINS

    if (amount <= 0) {
      return { balance: currentBalance }
    }

    const newBalance = currentBalance + amount
    await ctx.db.patch(settings._id, {
      coinsBalance: newBalance,
      lastUpdated: Date.now(),
    })

    return { balance: newBalance }
  },
})
