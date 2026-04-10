import { query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"

export const getStudyTimeLeaderboard = query({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page || 1
    const pageSize = args.pageSize || 10
    const skip = (page - 1) * pageSize

    const allSettings = await ctx.db
      .query("studySettings")
      .withIndex("by_total_time")
      .order("desc")
      .collect()

    const totalCount = allSettings.length
    const paginatedSettings = allSettings.slice(skip, skip + pageSize)

    const leaderboard = await Promise.all(
      paginatedSettings.map(async (setting, index) => {
        const user = await ctx.db.get(setting.userId)
        return {
          rank: skip + index + 1,
          userId: setting.userId,
          name: user?.name || "Unknown User",
          email: user?.email,
          avatar: user?.image,
          totalStudyTime: setting.totalStudyTime || 0,
        }
      }),
    )

    return {
      data: leaderboard,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNext: page < Math.ceil(totalCount / pageSize),
        hasPrev: page > 1,
      },
    }
  },
})

export const getUserRanking = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const userSettings = await ctx.db
      .query("studySettings")
      .withIndex("by_user")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (!userSettings) {
      return {
        rank: null,
        totalStudyTime: 0,
      }
    }

    const allSettings = await ctx.db
      .query("studySettings")
      .withIndex("by_total_time")
      .order("desc")
      .collect()

    const userRank =
      allSettings.findIndex((setting) => setting.userId === userId) + 1

    return {
      rank: userRank || null,
      totalStudyTime: userSettings.totalStudyTime || 0,
    }
  },
})

export const getGroupLeaderboard = query({
  args: {
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, args) => {
    let memberIds: string[] = []

    if (args.groupId) {
      const members = await ctx.db
        .query("groupMembers")
        .withIndex("by_group")
        .filter((q) => q.eq(q.field("groupId"), args.groupId))
        .collect()
      memberIds = members.map((m) => m.userId)
    }

    if (memberIds.length === 0) {
      return []
    }

    const settings = await ctx.db
      .query("studySettings")
      .withIndex("by_total_time")
      .filter((q) =>
        memberIds.length === 1
          ? q.eq(q.field("userId"), memberIds[0])
          : q.or(...memberIds.map((id) => q.eq(q.field("userId"), id))),
      )
      .order("desc")
      .take(10)

    const leaderboard = await Promise.all(
      settings.map(async (setting, index) => {
        const user = await ctx.db.get(setting.userId)
        return {
          rank: index + 1,
          userId: setting.userId,
          name: user?.name || "Unknown User",
          email: user?.email,
          avatar: user?.image,
          totalStudyTime: setting.totalStudyTime || 0,
        }
      }),
    )

    return leaderboard
  },
})
