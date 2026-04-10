import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"

const STATUSES = ["backlog", "in_progress", "review", "done"] as const
const PRIORITIES = ["low", "medium", "high"] as const

type Status = (typeof STATUSES)[number]
type Priority = (typeof PRIORITIES)[number]

type Board = Record<Status, Doc<"todos">[]>

const STATUS_VALUES = STATUSES.map((value) => v.literal(value))
const PRIORITY_VALUES = PRIORITIES.map((value) => v.literal(value))

const emptyBoard = (): Board => ({
  backlog: [],
  in_progress: [],
  review: [],
  done: [],
})

const sortByOrder = <T extends { order: number }>(list: T[]) =>
  [...list].sort((a, b) => a.order - b.order)

const reorderColumn = async (
  ctx: any,
  status: Status,
  tasks: Doc<"todos">[],
  timestamp: number,
) => {
  let order = 0
  for (const task of tasks) {
    await ctx.db.patch(task._id, {
      status,
      order,
      updatedAt: timestamp,
    })
    order += 1
  }
}

export const getBoard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const tasks = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    const board = emptyBoard()

    for (const task of tasks) {
      board[task.status].push(task)
    }

    for (const status of STATUSES) {
      board[status] = sortByOrder(board[status])
    }

    return {
      columns: board,
      totals: {
        all: tasks.length,
        done: board.done.length,
      },
    }
  },
})

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.union(...STATUS_VALUES)),
    priority: v.optional(v.union(...PRIORITY_VALUES)),
    dueDate: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const status: Status = (args.status ?? "backlog") as Status
    const priority: Priority = (args.priority ?? "medium") as Priority

    const existing = await ctx.db
      .query("todos")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", status))
      .collect()

    const now = Date.now()

    await ctx.db.insert("todos", {
      userId,
      title: args.title,
      description: args.description ?? undefined,
      status,
      priority,
      dueDate: args.dueDate ?? undefined,
      order: existing.length,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateTask = mutation({
  args: {
    taskId: v.id("todos"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.union(...PRIORITY_VALUES)),
    dueDate: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const task = await ctx.db.get(args.taskId)
    if (!task || task.userId !== userId) throw new Error("Task not found")

    const updates: Partial<Doc<"todos">> = {
      updatedAt: Date.now(),
    }

    if (args.title !== undefined) updates.title = args.title
    if (args.priority !== undefined) updates.priority = args.priority as Priority
    if (args.description !== undefined)
      updates.description = args.description === null ? undefined : args.description
    if (args.dueDate !== undefined)
      updates.dueDate = args.dueDate === null ? undefined : args.dueDate

    await ctx.db.patch(task._id, updates)
  },
})

export const moveTask = mutation({
  args: {
    taskId: v.id("todos"),
    toStatus: v.union(...STATUS_VALUES),
    toIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const task = await ctx.db.get(args.taskId)
    if (!task || task.userId !== userId) throw new Error("Task not found")

    const now = Date.now()

    if (task.status === args.toStatus) {
      const columnTasks = sortByOrder(
        await ctx.db
          .query("todos")
          .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", args.toStatus as Status))
          .collect(),
      )

      const filtered = columnTasks.filter((item) => item._id !== task._id)
      const clampedIndex = Math.max(0, Math.min(args.toIndex, filtered.length))
      filtered.splice(clampedIndex, 0, task)

      await reorderColumn(ctx, args.toStatus as Status, filtered, now)
      return
    }

    const fromTasks = sortByOrder(
      await ctx.db
        .query("todos")
        .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", task.status))
        .collect(),
    )
    const toTasks = sortByOrder(
      await ctx.db
        .query("todos")
        .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", args.toStatus as Status))
        .collect(),
    )

    const remaining = fromTasks.filter((item) => item._id !== task._id)
    const target = toTasks.filter((item) => item._id !== task._id)
    const clampedIndex = Math.max(0, Math.min(args.toIndex, target.length))
    target.splice(clampedIndex, 0, task)

    await reorderColumn(ctx, task.status as Status, remaining, now)
    await reorderColumn(ctx, args.toStatus as Status, target, now)
  },
})

export const deleteTask = mutation({
  args: {
    taskId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const task = await ctx.db.get(args.taskId)
    if (!task || task.userId !== userId) throw new Error("Task not found")

    await ctx.db.delete(args.taskId)

    const remaining = sortByOrder(
      await ctx.db
        .query("todos")
        .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", task.status))
        .collect(),
    )

    await reorderColumn(ctx, task.status as Status, remaining, Date.now())
  },
})

