import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { Id } from "./_generated/dataModel"

// Define Auth0 permissions for moderator actions
export const MODERATOR_PERMISSIONS = {
  PIN_MESSAGE: "group:message:pin",
  DELETE_MESSAGE: "group:message:delete",
  EDIT_MESSAGE: "group:message:edit",
  LOCK_THREAD: "group:thread:lock",
  ASSIGN_MODERATOR: "group:moderator:assign",
  REMOVE_MODERATOR: "group:moderator:remove",
  VIEW_AUDIT_LOG: "group:audit:view",
} as const

// Helper to check if user is admin or moderator in a group
async function checkModeratorPermission(
  ctx: any,
  groupId: Id<"groups">,
  userId: Id<"users">,
  action: string
): Promise<boolean> {
  const membership = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_and_user", (q: any) =>
      q.eq("groupId", groupId).eq("userId", userId)
    )
    .first()

  if (!membership) return false

  // Admins have all permissions
  if (membership.role === "admin") return true

  // Check if moderator has the specific permission
  if (membership.role === "moderator") {
    // If Auth0 permissions are synced, check them
    if (membership.auth0Permissions && Array.isArray(membership.auth0Permissions)) {
      return membership.auth0Permissions.includes(action)
    }
    // Default: moderators have all permissions except assigning/removing moderators
    if (
      action === MODERATOR_PERMISSIONS.ASSIGN_MODERATOR ||
      action === MODERATOR_PERMISSIONS.REMOVE_MODERATOR
    ) {
      return false
    }
    return true
  }

  return false
}

// Helper to log moderator actions
async function logModeratorAction(
  ctx: any,
  {
    groupId,
    moderatorId,
    action,
    targetId,
    targetType,
    reason,
    metadata,
    auth0UserId,
    auth0Permissions,
  }: {
    groupId: Id<"groups">
    moderatorId: Id<"users">
    action: string
    targetId: string
    targetType: "message" | "user" | "thread"
    reason?: string
    metadata?: any
    auth0UserId?: string
    auth0Permissions?: string[]
  }
) {
  await ctx.db.insert("moderatorActions", {
    groupId,
    moderatorId,
    action,
    targetId,
    targetType,
    reason,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    createdAt: Date.now(),
    auth0UserId,
    auth0Permissions,
  })
}

// QUERIES

// Get all moderators in a group
export const getModerators = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_role", (q) =>
        q.eq("groupId", args.groupId).eq("role", "moderator")
      )
      .collect()

    const moderators = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId)
        return {
          _id: member._id,
          userId: member.userId,
          userName: user?.name || user?.email || "Unknown",
          userImage: user?.image,
          joinedAt: member.joinedAt,
          auth0RoleId: member.auth0RoleId,
          auth0Permissions: member.auth0Permissions || [],
          lastAuth0Sync: member.lastAuth0Sync,
        }
      })
    )

    return moderators
  },
})

// Check if user is moderator or admin
export const checkUserPermission = query({
  args: {
    groupId: v.id("groups"),
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return false

    return await checkModeratorPermission(ctx, args.groupId, userId, args.permission)
  },
})

// Get moderator action logs (audit trail)
export const getModeratorLogs = query({
  args: {
    groupId: v.id("groups"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    // Check if user can view audit logs
    const canView = await checkModeratorPermission(
      ctx,
      args.groupId,
      userId,
      MODERATOR_PERMISSIONS.VIEW_AUDIT_LOG
    )

    if (!canView) {
      throw new Error("Insufficient permissions to view audit logs")
    }

    const logs = await ctx.db
      .query("moderatorActions")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .take(args.limit || 50)

    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const moderator = await ctx.db.get(log.moderatorId)
        return {
          ...log,
          moderatorName: moderator?.name || moderator?.email || "Unknown",
          moderatorImage: moderator?.image,
        }
      })
    )

    return enrichedLogs
  },
})

// MUTATIONS

// Assign moderator role (Admin only)
export const assignModerator = mutation({
  args: {
    groupId: v.id("groups"),
    targetUserId: v.id("users"),
    auth0RoleId: v.optional(v.string()),
    auth0Permissions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    // Check if current user is admin
    const hasPermission = await checkModeratorPermission(
      ctx,
      args.groupId,
      userId,
      MODERATOR_PERMISSIONS.ASSIGN_MODERATOR
    )

    if (!hasPermission) {
      throw new Error("Only admins can assign moderators")
    }

    // Find the membership
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.targetUserId)
      )
      .first()

    if (!membership) {
      throw new Error("User is not a member of this group")
    }

    if (membership.role === "admin") {
      throw new Error("Cannot change role of group admin")
    }

    // Update to moderator role
    await ctx.db.patch(membership._id, {
      role: "moderator",
      auth0RoleId: args.auth0RoleId,
      auth0Permissions: args.auth0Permissions || [
        MODERATOR_PERMISSIONS.PIN_MESSAGE,
        MODERATOR_PERMISSIONS.DELETE_MESSAGE,
        MODERATOR_PERMISSIONS.EDIT_MESSAGE,
        MODERATOR_PERMISSIONS.LOCK_THREAD,
        MODERATOR_PERMISSIONS.VIEW_AUDIT_LOG,
      ],
      lastAuth0Sync: Date.now(),
    })

    // Log the action
    await logModeratorAction(ctx, {
      groupId: args.groupId,
      moderatorId: userId,
      action: "assign_moderator",
      targetId: args.targetUserId,
      targetType: "user",
      metadata: {
        auth0RoleId: args.auth0RoleId,
        auth0Permissions: args.auth0Permissions,
      },
    })

    return { success: true }
  },
})

// Remove moderator role (Admin only)
export const removeModerator = mutation({
  args: {
    groupId: v.id("groups"),
    targetUserId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    // Check if current user is admin
    const hasPermission = await checkModeratorPermission(
      ctx,
      args.groupId,
      userId,
      MODERATOR_PERMISSIONS.REMOVE_MODERATOR
    )

    if (!hasPermission) {
      throw new Error("Only admins can remove moderators")
    }

    // Find the membership
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.targetUserId)
      )
      .first()

    if (!membership || membership.role !== "moderator") {
      throw new Error("User is not a moderator")
    }

    // Downgrade to member role
    await ctx.db.patch(membership._id, {
      role: "member",
      auth0RoleId: undefined,
      auth0Permissions: undefined,
      lastAuth0Sync: undefined,
    })

    // Log the action
    await logModeratorAction(ctx, {
      groupId: args.groupId,
      moderatorId: userId,
      action: "remove_moderator",
      targetId: args.targetUserId,
      targetType: "user",
      reason: args.reason,
    })

    return { success: true }
  },
})

// Pin/Unpin message (Moderator or Admin)
export const togglePinMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error("Message not found")

    // Check permission
    const hasPermission = await checkModeratorPermission(
      ctx,
      message.groupId,
      userId,
      MODERATOR_PERMISSIONS.PIN_MESSAGE
    )

    if (!hasPermission) {
      throw new Error("Insufficient permissions to pin messages")
    }

    const newPinState = !message.isPinned

    await ctx.db.patch(args.messageId, {
      isPinned: newPinState,
      updatedAt: Date.now(),
    })

    // Log the action
    await logModeratorAction(ctx, {
      groupId: message.groupId,
      moderatorId: userId,
      action: newPinState ? "pin_message" : "unpin_message",
      targetId: args.messageId,
      targetType: "message",
    })

    return { success: true, isPinned: newPinState }
  },
})

// Delete message (Moderator or Admin)
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error("Message not found")

    // Check permission
    const hasPermission = await checkModeratorPermission(
      ctx,
      message.groupId,
      userId,
      MODERATOR_PERMISSIONS.DELETE_MESSAGE
    )

    if (!hasPermission) {
      throw new Error("Insufficient permissions to delete messages")
    }

    // Soft delete
    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      deletedBy: userId,
      deletedReason: args.reason,
      updatedAt: Date.now(),
    })

    // Log the action
    await logModeratorAction(ctx, {
      groupId: message.groupId,
      moderatorId: userId,
      action: "delete_message",
      targetId: args.messageId,
      targetType: "message",
      reason: args.reason,
      metadata: {
        originalAuthor: message.userId,
        originalBody: message.body.substring(0, 100),
      },
    })

    return { success: true }
  },
})

// Edit message (Moderator or Admin)
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    newBody: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error("Message not found")

    // Check permission
    const hasPermission = await checkModeratorPermission(
      ctx,
      message.groupId,
      userId,
      MODERATOR_PERMISSIONS.EDIT_MESSAGE
    )

    if (!hasPermission) {
      throw new Error("Insufficient permissions to edit messages")
    }

    // Save original if not already saved
    const originalBody = message.originalBody || message.body

    await ctx.db.patch(args.messageId, {
      body: args.newBody,
      originalBody,
      editedBy: userId,
      updatedAt: Date.now(),
    })

    // Log the action
    await logModeratorAction(ctx, {
      groupId: message.groupId,
      moderatorId: userId,
      action: "edit_message",
      targetId: args.messageId,
      targetType: "message",
      reason: args.reason,
      metadata: {
        originalBody: originalBody.substring(0, 100),
        newBody: args.newBody.substring(0, 100),
      },
    })

    return { success: true }
  },
})

// Lock/Unlock thread (Moderator or Admin)
export const toggleLockThread = mutation({
  args: {
    messageId: v.id("messages"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error("Message not found")

    if (message.replyToMessageId) {
      throw new Error("Can only lock top-level threads")
    }

    // Check permission
    const hasPermission = await checkModeratorPermission(
      ctx,
      message.groupId,
      userId,
      MODERATOR_PERMISSIONS.LOCK_THREAD
    )

    if (!hasPermission) {
      throw new Error("Insufficient permissions to lock threads")
    }

    const newLockState = !message.isLocked

    await ctx.db.patch(args.messageId, {
      isLocked: newLockState,
      lockedBy: newLockState ? userId : undefined,
      updatedAt: Date.now(),
    })

    // Log the action
    await logModeratorAction(ctx, {
      groupId: message.groupId,
      moderatorId: userId,
      action: newLockState ? "lock_thread" : "unlock_thread",
      targetId: args.messageId,
      targetType: "thread",
      reason: args.reason,
    })

    return { success: true, isLocked: newLockState }
  },
})

// Sync Auth0 roles and permissions
export const syncAuth0Permissions = mutation({
  args: {
    groupId: v.id("groups"),
    auth0UserId: v.string(),
    auth0RoleId: v.optional(v.string()),
    auth0Permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    // Find membership by Auth0 user ID
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", userId)
      )
      .first()

    if (!membership) {
      throw new Error("User is not a member of this group")
    }

    if (membership.role !== "moderator" && membership.role !== "admin") {
      throw new Error("Only moderators and admins can sync Auth0 permissions")
    }

    // Update Auth0 data
    await ctx.db.patch(membership._id, {
      auth0RoleId: args.auth0RoleId,
      auth0Permissions: args.auth0Permissions,
      lastAuth0Sync: Date.now(),
    })

    return { success: true }
  },
})
