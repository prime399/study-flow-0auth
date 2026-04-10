import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const INITIAL_COINS = 500

export const isOnboardingComplete = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const userSettings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    return userSettings?.isOnboardingDone ?? false
  },
})

export const completeOnboarding = mutation({
  args: {
    dailyGoal: v.number(),
    studyDuration: v.number(),
    selectedGroupIds: v.array(v.id("groups")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existingSettings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        isOnboardingDone: true,
        lastUpdated: Date.now(),
      })
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        isOnboardingDone: true,
        lastUpdated: Date.now(),
      })
    }

    const existingStudySettings = await ctx.db
      .query("studySettings")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    const now = Date.now()

    if (existingStudySettings) {
      const update: Record<string, any> = {
        dailyGoal: args.dailyGoal,
        studyDuration: args.studyDuration,
        lastUpdated: now,
      }

      if (typeof existingStudySettings.coinsBalance !== "number") {
        update.coinsBalance = INITIAL_COINS
      }

      await ctx.db.patch(existingStudySettings._id, update)
    } else {
      await ctx.db.insert("studySettings", {
        userId,
        dailyGoal: args.dailyGoal,
        studyDuration: args.studyDuration,
        totalStudyTime: 0,
        coinsBalance: INITIAL_COINS,
        lastUpdated: now,
      })
    }

    for (const groupId of args.selectedGroupIds) {
      const existing = await ctx.db
        .query("groupMembers")
        .filter((q) =>
          q.and(
            q.eq(q.field("groupId"), groupId),
            q.eq(q.field("userId"), userId),
          ),
        )
        .first()

      if (!existing) {
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          joinedAt: Date.now(),
          role: "member",
        })
      }
    }
  },
})

export const getSuggestedGroups = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 4, 12))

    const groups = await ctx.db.query("groups").order("desc").take(limit)

    const groupsWithMemberCounts = await Promise.all(
      groups.map(async (group) => {
        const members = await ctx.db
          .query("groupMembers")
          .withIndex("by_group")
          .filter((q) => q.eq(q.field("groupId"), group._id))
          .collect()

        return {
          ...group,
          memberCount: members.length,
        }
      }),
    )

    return groupsWithMemberCounts
  },
})

export const importSampleStudySessions = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfToday.getDate() - 6)
    const startOfWeekMs = startOfWeek.getTime()

    const createSampleSession = (
      dayOffset: number,
      hour: number,
      minute: number,
      durationMinutes: number,
      type: string,
      completed = true,
    ) => {
      const sessionStart = new Date(startOfToday)
      sessionStart.setDate(startOfToday.getDate() - dayOffset)
      sessionStart.setHours(hour, minute, 0, 0)
      const startTime = sessionStart.getTime()
      const durationSeconds = durationMinutes * 60
      const endTime = startTime + durationSeconds * 1000

      return {
        startTime,
        endTime,
        duration: durationSeconds,
        type,
        completed,
      }
    }

    const sampleSessions = [
      createSampleSession(0, 9, 0, 50, "deep_work"),
      createSampleSession(0, 14, 30, 30, "review"),
      createSampleSession(1, 8, 30, 45, "group_study"),
      createSampleSession(1, 19, 0, 25, "flashcards"),
      createSampleSession(2, 7, 45, 40, "practice_quiz"),
      createSampleSession(2, 20, 15, 20, "light_reading", false),
      createSampleSession(3, 6, 30, 55, "deep_work"),
      createSampleSession(3, 17, 30, 35, "revision"),
      createSampleSession(4, 9, 15, 45, "mock_exam"),
      createSampleSession(4, 15, 45, 30, "group_study"),
      createSampleSession(5, 10, 30, 20, "flashcards"),
      createSampleSession(5, 19, 30, 25, "planning", false),
      createSampleSession(6, 9, 0, 60, "deep_work"),
      createSampleSession(6, 13, 30, 30, "review"),
    ]

    const existingSessions = await ctx.db
      .query("studySessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("startTime"), startOfWeekMs))
      .collect()

    const existingStartTimes = new Set(
      existingSessions.map((session) => session.startTime),
    )

    const sessionsToInsert = sampleSessions.filter(
      (session) => !existingStartTimes.has(session.startTime),
    )

    if (sessionsToInsert.length === 0) {
      return { inserted: 0, skipped: sampleSessions.length }
    }

    let totalCompletedDuration = 0

    for (const session of sessionsToInsert) {
      await ctx.db.insert("studySessions", {
        userId,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        type: session.type,
        completed: session.completed,
      })

      if (session.completed) {
        totalCompletedDuration += session.duration
      }
    }

    if (totalCompletedDuration > 0) {
      const studySettings = await ctx.db
        .query("studySettings")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first()

      const now = Date.now()

      if (studySettings) {
        const currentCoins =
          typeof studySettings.coinsBalance === "number"
            ? studySettings.coinsBalance
            : INITIAL_COINS

        await ctx.db.patch(studySettings._id, {
          totalStudyTime: studySettings.totalStudyTime + totalCompletedDuration,
          coinsBalance: currentCoins + totalCompletedDuration,
          lastUpdated: now,
        })
      } else {
        await ctx.db.insert("studySettings", {
          userId,
          studyDuration: 25 * 60,
          dailyGoal: 120 * 60,
          totalStudyTime: totalCompletedDuration,
          coinsBalance: INITIAL_COINS + totalCompletedDuration,
          lastUpdated: now,
        })
      }
    }

    return {
      inserted: sessionsToInsert.length,
      skipped: sampleSessions.length - sessionsToInsert.length,
    }
  },
})

