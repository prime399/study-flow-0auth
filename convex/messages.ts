import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  args: {
    groupId: v.id("groups"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .order("desc")
      .take(args.limit ?? 100)

    return await Promise.all(
      messages.map(async (message) => {
        const user = await ctx.db.get(message.userId)
        const name = user?.name
        const email = user?.email
        const image = user?.image
        return {
          ...message,
          author: message.isAIMessage ? "Mind (AI Mentor)" : (name ?? email ?? "Unknown"),
          authorImage: message.isAIMessage ? null : image,
          isAIMessage: message.isAIMessage ?? false,
        }
      }),
    )
  },
})

export const send = mutation({
  args: {
    body: v.string(),
    groupId: v.id("groups"),
    mentionedUsers: v.optional(v.array(v.id("users"))),
    replyToMessageId: v.optional(v.id("messages")),
    topic: v.optional(v.string()),
    topicColor: v.optional(v.string()),
  },
  handler: async (ctx, { body, groupId, mentionedUsers, replyToMessageId, topic, topicColor }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new Error("Not signed in")
    }

    const newMessageId = await ctx.db.insert("messages", {
      body,
      userId,
      groupId,
      createdAt: Date.now(),
      mentionedUsers,
      replyToMessageId,
      topic,
      topicColor,
    })

    return newMessageId
  },
})

// Send AI message (called from API route)
export const sendAIMessage = mutation({
  args: {
    body: v.string(),
    groupId: v.id("groups"),
    userId: v.id("users"), // The user who triggered the AI
    replyToMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, { body, groupId, userId, replyToMessageId }) => {
    await ctx.db.insert("messages", {
      body,
      userId, // Store the triggering user's ID
      groupId,
      createdAt: Date.now(),
      isAIMessage: true,
      replyToMessageId,
    })
  },
})

// Get conversation context for AI
export const getConversationContext = query({
  args: {
    groupId: v.id("groups"),
    messageLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .order("desc")
      .take(args.messageLimit ?? 20)

    const messagesWithAuthors = await Promise.all(
      messages.map(async (message) => {
        const user = await ctx.db.get(message.userId)
        return {
          author: message.isAIMessage ? "Mind" : (user?.name ?? user?.email ?? "Unknown"),
          body: message.body,
          timestamp: message.createdAt,
          isAI: message.isAIMessage ?? false,
        }
      }),
    )

    return messagesWithAuthors.reverse()
  },
})

// Update conversation summary
export const updateConversationSummary = mutation({
  args: {
    groupId: v.id("groups"),
    summary: v.string(),
    messageCount: v.number(),
    topTopics: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("groupConversationContext")
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        summary: args.summary,
        lastUpdated: Date.now(),
        messageCount: args.messageCount,
        topTopics: args.topTopics,
      })
    } else {
      await ctx.db.insert("groupConversationContext", {
        groupId: args.groupId,
        summary: args.summary,
        lastUpdated: Date.now(),
        messageCount: args.messageCount,
        topTopics: args.topTopics,
      })
    }
  },
})

// Get threaded messages (Reddit-style)
export const listThreaded = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // Get all messages in the group
    const allMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .collect()

    // Separate top-level messages (threads) from replies
    const threads = allMessages.filter((m) => !m.replyToMessageId)
    const replies = allMessages.filter((m) => m.replyToMessageId)

    // Enrich messages with author info and reactions
    const enrichMessage = async (message: typeof allMessages[0]) => {
      const user = await ctx.db.get(message.userId)
      const reactions = await ctx.db
        .query("messageReactions")
        .filter((q) => q.eq(q.field("messageId"), message._id))
        .collect()

      const reactionCounts = reactions.reduce(
        (acc, r) => {
          acc[r.reaction] = (acc[r.reaction] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      return {
        ...message,
        author: message.isAIMessage
          ? "Mind (AI Mentor)"
          : user?.name ?? user?.email ?? "Unknown",
        authorImage: message.isAIMessage ? null : user?.image,
        isAIMessage: message.isAIMessage ?? false,
        reactions: reactionCounts,
        totalReactions: reactions.length,
      }
    }

    // Enrich all messages
    const enrichedThreads = await Promise.all(threads.map(enrichMessage))
    const enrichedReplies = await Promise.all(replies.map(enrichMessage))

    // Build threaded structure
    const threadsWithReplies = enrichedThreads.map((thread) => {
      const threadReplies = enrichedReplies.filter(
        (r) => r.replyToMessageId === thread._id
      )
      return {
        ...thread,
        replies: threadReplies.sort((a, b) => a.createdAt - b.createdAt),
        replyCount: threadReplies.length,
      }
    })

    // Sort: Pinned first, then by most recent activity
    return threadsWithReplies.sort((a, b) => {
      // Pinned threads always come first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1

      // Then sort by most recent activity
      const aLatest =
        a.replies.length > 0
          ? a.replies[a.replies.length - 1].createdAt
          : a.createdAt
      const bLatest =
        b.replies.length > 0
          ? b.replies[b.replies.length - 1].createdAt
          : b.createdAt
      return bLatest - aLatest
    })
  },
})

// Get all topics in a group
export const getGroupTopics = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .filter((q) =>
        q.and(
          q.eq(q.field("groupId"), args.groupId),
          q.neq(q.field("topic"), undefined)
        )
      )
      .collect()

    // Get unique topics with their colors
    const topicsMap = new Map<string, string>()
    messages.forEach((m) => {
      if (m.topic && !topicsMap.has(m.topic)) {
        topicsMap.set(m.topic, m.topicColor || "#3b82f6")
      }
    })

    return Array.from(topicsMap.entries()).map(([topic, color]) => ({
      topic,
      color,
    }))
  },
})

// Add reaction to message
export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    reaction: v.union(
      v.literal("upvote"),
      v.literal("helpful"),
      v.literal("thanks"),
      v.literal("mind_blown")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    // Check if user already reacted with this reaction
    const existing = await ctx.db
      .query("messageReactions")
      .filter((q) =>
        q.and(
          q.eq(q.field("messageId"), args.messageId),
          q.eq(q.field("userId"), userId),
          q.eq(q.field("reaction"), args.reaction)
        )
      )
      .first()

    if (existing) {
      // Remove reaction if already exists (toggle)
      await ctx.db.delete(existing._id)
    } else {
      // Add new reaction
      await ctx.db.insert("messageReactions", {
        messageId: args.messageId,
        userId,
        reaction: args.reaction,
        createdAt: Date.now(),
      })
    }
  },
})

// Get user's reactions for a message
export const getUserReactions = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const reactions = await ctx.db
      .query("messageReactions")
      .filter((q) =>
        q.and(
          q.eq(q.field("messageId"), args.messageId),
          q.eq(q.field("userId"), userId)
        )
      )
      .collect()

    return reactions.map((r) => r.reaction)
  },
})
