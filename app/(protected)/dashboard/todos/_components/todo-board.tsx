"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { Kanban, KanbanBoard, KanbanColumn, KanbanColumnContent, KanbanItem, KanbanItemHandle, KanbanOverlay, type KanbanMoveEvent } from "@/components/ui/kanban"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_CONFIG = [
  {
    id: "backlog",
    label: "Backlog",
    hint: "Ideas and tasks waiting for prioritisation",
    accent:
      "border-sky-200/70 bg-sky-50/90 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-100",
    headerClass:
      "from-sky-500/10 via-sky-500/5 to-transparent dark:from-sky-500/20 dark:via-sky-500/10 dark:to-transparent",
  },
  {
    id: "in_progress",
    label: "In Progress",
    hint: "Currently being worked on",
    accent:
      "border-indigo-200/70 bg-indigo-50/90 text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-100",
    headerClass:
      "from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-500/20 dark:via-indigo-500/10 dark:to-transparent",
  },
  {
    id: "done",
    label: "Done",
    hint: "Completed tasks",
    accent:
      "border-emerald-200/70 bg-emerald-50/90 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
    headerClass:
      "from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent",
  },
] as const

const PRIORITY_CONFIG = {
  low: {
    label: "Low",
    className:
      "border-sky-200/70 bg-sky-50/90 text-sky-800 dark:border-sky-400/60 dark:bg-sky-500/15 dark:text-sky-100",
  },
  medium: {
    label: "Medium",
    className:
      "border-amber-300/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-100",
  },
  high: {
    label: "High",
    className:
      "border-rose-500 bg-rose-500 text-rose-50 shadow-sm dark:border-rose-400/80 dark:bg-rose-500/90 dark:text-rose-50",
  },
} as const

type StatusId = (typeof STATUS_CONFIG)[number]["id"]
type PriorityId = keyof typeof PRIORITY_CONFIG

type TodoDoc = Doc<"todos">

type BoardState = Record<StatusId, TodoDoc[]>

const EMPTY_BOARD: BoardState = STATUS_CONFIG.reduce(
  (acc, column) => ({
    ...acc,
    [column.id]: [],
  }),
  {} as BoardState,
)

const copyBoard = (board: BoardState): BoardState => {
  const next: Partial<BoardState> = {}
  for (const column of STATUS_CONFIG) {
    next[column.id] = [...board[column.id]]
  }
  return next as BoardState
}

const formatDueDate = (input?: number | null) => {
  if (!input) return null
  try {
    return format(new Date(input), "MMM d")
  } catch (error) {
    return null
  }
}

const toDateInputValue = (input?: number | null) => {
  if (!input) return ""
  try {
    return new Date(input).toISOString().slice(0, 10)
  } catch (error) {
    return ""
  }
}

const toTimestamp = (value: string) => {
  if (!value) return null
  const date = new Date(value + "T00:00:00")
  if (Number.isNaN(date.getTime())) return null
  return date.getTime()
}

interface TaskFormState {
  title: string
  description: string
  status: StatusId
  priority: PriorityId
  dueDate: string
}

const defaultFormState: TaskFormState = {
  title: "",
  description: "",
  status: "backlog",
  priority: "medium",
  dueDate: "",
}

export function TodoBoard() {
  const boardResponse = useQuery(api.todos.getBoard)
  const createTask = useMutation(api.todos.createTask)
  const updateTask = useMutation(api.todos.updateTask)
  const moveTask = useMutation(api.todos.moveTask)
  const deleteTask = useMutation(api.todos.deleteTask)

  const [board, setBoard] = useState<BoardState>(EMPTY_BOARD)
  const previousBoard = useRef<BoardState>(EMPTY_BOARD)

  useEffect(() => {
    if (!boardResponse?.columns) return
    const next = copyBoard(boardResponse.columns)
    setBoard(next)
    previousBoard.current = next
  }, [boardResponse?.columns])
  const totals = boardResponse?.totals ?? { all: 0, done: 0 }
  const inProgressCount = totals.all - totals.done

  const [dialogOpen, setDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [formState, setFormState] = useState<TaskFormState>(defaultFormState)
  const [activeTask, setActiveTask] = useState<TodoDoc | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBoardChange = useCallback((next: Record<string, TodoDoc[]>) => {
    const typedBoard = next as BoardState
    setBoard((prev) => {
      previousBoard.current = copyBoard(prev)
      return copyBoard(typedBoard)
    })
  }, [])

  const findTask = useCallback(
    (id: Id<"todos">) => {
      for (const column of STATUS_CONFIG) {
        const task = board[column.id].find((item) => item._id === id)
        if (task) return task
      }
      return null
    },
    [board],
  )

  const openCreateDialog = (status?: StatusId) => {
    setFormMode("create")
    setActiveTask(null)
    setFormState({
      ...defaultFormState,
      status: status ?? defaultFormState.status,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (task: TodoDoc) => {
    setFormMode("edit")
    setActiveTask(task)
    setFormState({
      title: task.title,
      description: task.description ?? "",
      status: task.status as StatusId,
      priority: task.priority as PriorityId,
      dueDate: toDateInputValue(task.dueDate),
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setTimeout(() => {
      setFormState(defaultFormState)
      setActiveTask(null)
    }, 150)
  }

  const handleSubmit = async () => {
    if (!formState.title.trim()) {
      toast.error("Please give the task a title.")
      return
    }

    setIsSubmitting(true)

    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      status: formState.status,
      priority: formState.priority,
      dueDate: toTimestamp(formState.dueDate),
    }

    try {
      if (formMode === "create") {
        await createTask(payload)
        toast.success("Task created")
      } else if (activeTask) {
        await updateTask({
          taskId: activeTask._id,
          title: payload.title,
          description: payload.description ?? null,
          priority: payload.priority,
          dueDate: payload.dueDate,
        })
        if (activeTask.status !== payload.status) {
          await moveTask({ taskId: activeTask._id, toStatus: payload.status, toIndex: 0 })
        }
        toast.success("Task updated")
      }
      closeDialog()
    } catch (error) {
      console.error(error)
      toast.error("We couldn't save that task. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMove = useCallback(
    async ({ activeContainer, overContainer, overIndex, event }: KanbanMoveEvent) => {
      if (!overContainer) return

      const toStatus = overContainer as StatusId
      const toIndex = overIndex >= 0 ? overIndex : board[toStatus].length
      const taskId = event.active.id as Id<"todos">

      try {
        await moveTask({ taskId, toStatus, toIndex })
      } catch (error) {
        console.error(error)
        setBoard(copyBoard(previousBoard.current))
        toast.error("Drag failed. We've restored the previous order.")
      }
    },
    [board, moveTask],
  )

  const handleDelete = async (taskId: Id<"todos">) => {
    try {
      await deleteTask({ taskId })
      toast.success("Task removed")
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete task")
    }
  }

  const isLoading = !boardResponse

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">To-Do Board</h2>
          <p className="mt-1 max-w-2xl text-xs sm:text-sm lg:text-base text-muted-foreground">
            Plan your study focus, drag tasks between columns, and keep your goals on track.
          </p>
        </div>
        <Button onClick={() => openCreateDialog()} className="self-start sm:self-auto w-full sm:w-auto rounded-full bg-primary/90 px-4 sm:px-5 py-2.5 shadow-sm transition hover:bg-primary/80 hover:shadow-md touch-manipulation">
          <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">New Task</span>
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 md:gap-6">
        <SummaryCard
          title="Total tasks"
          value={totals.all}
          icon={ClipboardList}
          tone="primary"
        />
        <SummaryCard
          title="In progress"
          value={Math.max(inProgressCount, 0)}
          icon={CircleDashed}
          tone="amber"
        />
        <SummaryCard title="Completed" value={totals.done} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="space-y-4 sm:space-y-6">
        <Kanban
          value={board}
          onValueChange={handleBoardChange}
          getItemValue={(item) => item._id}
          onMove={handleMove}
          className="space-y-4 sm:space-y-6"
        >
          <KanbanBoard className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 sm:gap-5 md:gap-6">
            {STATUS_CONFIG.map((column) => {
              const tasks = board[column.id]
              return (
                <KanbanColumn key={column.id} value={column.id} disabled className="flex flex-col">
                  <Card className={cn("group flex h-full flex-col overflow-hidden border border-border/60 bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg")}>
                    <CardHeader className={cn("space-y-2 sm:space-y-3 border-b border-border/60 pb-3 sm:pb-4 text-foreground", "bg-gradient-to-br", column.headerClass)}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg lg:text-xl font-semibold text-foreground truncate">
                            {column.label}
                          </CardTitle>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{column.hint}</p>
                        </div>
                        <Badge variant="outline" className="rounded-lg border border-primary/30 bg-primary/10 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-primary shadow-sm dark:border-primary/40 dark:bg-primary/15 dark:text-primary-foreground shrink-0">
                          {tasks.length}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        <span className={cn("inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-sm", column.accent)}>
                          {column.label}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 sm:h-10 w-full sm:w-auto px-3 sm:px-4 border-border/70 text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary touch-manipulation"
                          onClick={() => openCreateDialog(column.id)}
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="text-xs sm:text-sm">Add Task</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex h-full flex-col gap-2 sm:gap-3 bg-muted/30 pt-2 sm:pt-3">
                      <KanbanColumnContent value={column.id} className="min-h-[250px] sm:min-h-[350px] lg:min-h-[450px] flex flex-1 flex-col gap-2 sm:gap-3 rounded-xl border border-dashed border-transparent bg-background/50 backdrop-blur-sm p-2 transition-colors duration-300">
                        {isLoading && tasks.length === 0 ? (
                          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/80 backdrop-blur-sm p-4 sm:p-6 text-xs sm:text-sm font-medium text-muted-foreground">
                            Loading tasks...
                          </div>
                        ) : tasks.length === 0 ? (
                          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/80 backdrop-blur-sm p-4 sm:p-6 text-center text-xs sm:text-sm font-medium text-muted-foreground">
                            {column.id === "backlog"
                              ? "Drop ideas here to work on later."
                              : "Nothing here yet. Move a task over when ready."}
                          </div>
                        ) : (
                          tasks.map((task) => (
                            <KanbanItem key={task._id} value={task._id}>
                              <KanbanItemHandle className="block cursor-grab touch-manipulation transition-all duration-300 data-[dragging=true]:rotate-2 data-[dragging=true]:scale-[1.02] data-[dragging=true]:shadow-xl active:cursor-grabbing">
                                <TaskCard
                                  task={task}
                                  onEdit={openEditDialog}
                                  onDelete={handleDelete}
                                />
                              </KanbanItemHandle>
                            </KanbanItem>
                          ))
                        )}
                      </KanbanColumnContent>
                    </CardContent>
                  </Card>
                </KanbanColumn>
              )
            })}
          </KanbanBoard>

          <KanbanOverlay className="pointer-events-none">
            {({ value, variant }) => {
              if (variant === "column") return null
              const task = findTask(value as Id<"todos">)
              if (!task) return null
              return (
                <div className="animate-in fade-in-0 zoom-in-95 duration-200">
                  <div className="transform rotate-2 scale-105 transition-transform duration-200">
                    <TaskCard task={task} isOverlay />
                  </div>
                </div>
              )
            }}
          </KanbanOverlay>
        </Kanban>
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
        mode={formMode}
        state={formState}
        onStateChange={setFormState}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

interface SummaryCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  tone: "primary" | "amber" | "emerald" | "neutral"
}

function SummaryCard({ title, value, icon: Icon, tone }: SummaryCardProps) {
  const toneStyles: Record<SummaryCardProps["tone"], string> = {
    primary: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground",
    amber: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
    emerald: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100",
    neutral: "bg-muted text-muted-foreground dark:bg-muted/50 dark:text-muted-foreground",
  }

  return (
    <Card className="border border-border/60 transition-all duration-300 hover:border-primary/40 hover:shadow-md">
      <CardContent className="flex items-center gap-4 py-6">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg shadow-sm", toneStyles[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

interface TaskCardProps {
  task: TodoDoc
  onEdit?: (task: TodoDoc) => void
  onDelete?: (taskId: Id<"todos">) => void
  isOverlay?: boolean
}

function TaskCard({ task, onEdit, onDelete, isOverlay }: TaskCardProps) {
  const dueLabel = formatDueDate(task.dueDate)
  const priority = PRIORITY_CONFIG[task.priority as PriorityId] ?? PRIORITY_CONFIG.medium

  return (
    <div
      className={cn(
        "group rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm p-3 sm:p-4 shadow-md transition-all duration-300 touch-manipulation",
        !isOverlay && "hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-2xl active:scale-[0.98]",
        isOverlay && "border-primary/40 shadow-2xl rotate-3 scale-105 backdrop-blur bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
          <p className="line-clamp-2 text-sm sm:text-base lg:text-lg font-semibold leading-tight text-foreground">{task.title}</p>
          {task.description && (
            <p className="line-clamp-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">{task.description}</p>
          )}
        </div>
        {!isOverlay && (onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full opacity-100 sm:opacity-0 transition-all duration-200 sm:group-hover:opacity-100 hover:bg-muted/60 shrink-0 touch-manipulation"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40 border border-border/60 bg-popover text-popover-foreground shadow-xl"
            >
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(task)} className="hover:bg-muted/60 cursor-pointer py-2.5">
                  <Pencil className="mr-2 h-4 w-4 text-muted-foreground" /> Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer py-2.5"
                  onClick={() => onDelete(task._id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Separator className="my-3 sm:my-4 bg-border/60" />

      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <Badge variant="outline" className={cn("rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium", priority.className)}>
          {priority.label} priority
        </Badge>
        {dueLabel && (
          <span className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground">
            <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
            {dueLabel}
          </span>
        )}
      </div>
    </div>
  )
}

interface TaskDialogProps {
  open: boolean
  onOpenChange: (value: boolean) => void
  mode: "create" | "edit"
  state: TaskFormState
  onStateChange: (state: TaskFormState) => void
  onSubmit: () => void
  isSubmitting: boolean
}

function TaskDialog({ open, onOpenChange, mode, state, onStateChange, onSubmit, isSubmitting }: TaskDialogProps) {
  const handleChange = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => {
    onStateChange({ ...state, [key]: value })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-3 sm:mx-4 max-w-lg sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{mode === "create" ? "Create new task" : "Edit task"}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {mode === "create"
              ? "Add a new item to your ToDo board and assign where it should start."
              : "Update the task details or move it to a new column."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-2">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="task-title" className="text-sm sm:text-base">Title</Label>
            <Input
              id="task-title"
              placeholder="Quick summary"
              value={state.title}
              onChange={(event) => handleChange("title", event.target.value)}
              className="h-10 sm:h-11 text-sm sm:text-base"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="task-description" className="text-sm sm:text-base">Description</Label>
            <Textarea
              id="task-description"
              placeholder="Add context, resources, or acceptance criteria"
              value={state.description}
              onChange={(event) => handleChange("description", event.target.value)}
              rows={3}
              className="text-sm sm:text-base resize-none"
            />
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm sm:text-base">Status</Label>
              <Select value={state.status} onValueChange={(value: StatusId) => handleChange("status", value)}>
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_CONFIG.map((column) => (
                    <SelectItem key={column.id} value={column.id} className="capitalize py-2.5 text-sm sm:text-base">
                      {column.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm sm:text-base">Priority</Label>
              <Select
                value={state.priority}
                onValueChange={(value: PriorityId) => handleChange("priority", value)}
              >
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_CONFIG) as PriorityId[]).map((priority) => (
                    <SelectItem key={priority} value={priority} className="capitalize py-2.5 text-sm sm:text-base">
                      {PRIORITY_CONFIG[priority].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="task-due" className="text-sm sm:text-base">Due date</Label>
              <Input
                type="date"
                id="task-due"
                value={state.dueDate}
                onChange={(event) => handleChange("dueDate", event.target.value)}
                className="h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
          >
            Cancel
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>Save task</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


