"use client"

import { FormEvent, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import {
  Sparkles,
  Send,
  MessageSquare,
  Bot,
  Loader2,
  ThumbsUp,
  Heart,
  Lightbulb,
  Zap,
  Plus,
  ChevronDown,
  ChevronUp,
  Pin,
  Filter,
  Users,
  Search,
  ArrowDownUp,
  Undo2,
  CalendarDays,
  Target,
  BarChart3,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { cn } from "@/lib/utils"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

interface RedditStyleChatProps {
  groupId: Id<"groups">
}

const REACTION_ICONS = {
  upvote: ThumbsUp,
  helpful: Lightbulb,
  thanks: Heart,
  mind_blown: Zap,
}

const REACTION_COLORS = {
  upvote: "text-sky-500",
  helpful: "text-amber-500",
  thanks: "text-rose-500",
  mind_blown: "text-violet-500",
}

const REACTION_LABELS = {
  upvote: "Upvote",
  helpful: "Helpful",
  thanks: "Thanks",
  mind_blown: "Mind blown",
}

const TOPIC_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
]

const MENTOR_MIND_TOPIC = {
  label: "MentorMind Guidance",
  color: "#8b5cf6",
}

const MENTOR_MIND_SUGGESTIONS = [
  "Summarize what we decided today",
  "Give a focused study plan for this topic",
  "Highlight blockers I should prepare for",
  "Share quick tips to unblock our next task",
]

const toMillis = (value: Date | number | string | null | undefined) => {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === "number") return value
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

type ReactionKey = keyof typeof REACTION_ICONS

function ThreadCard({
  thread,
  onReply,
  onReact,
  onAIMentorRequest,
  isAIResponding,
}: {
  thread: any
  onReply: (threadId: Id<"messages">, message: string) => Promise<void>
  onReact: (messageId: Id<"messages">, reaction: string) => void
  onAIMentorRequest: (threadId: Id<"messages">, message: string) => Promise<void>
  isAIResponding: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [replyText, setReplyText] = useState("")
  const [showReplyBox, setShowReplyBox] = useState(false)
  const replies = thread.replies ?? []
  const replyCount = thread.replyCount ?? replies.length

  const handleReply = async () => {
    const messageContent = replyText.trim()
    if (!messageContent) return

    const hasMentorMention = messageContent.toLowerCase().includes("@mind")

    await onReply(thread._id, messageContent)

    if (hasMentorMention) {
      await onAIMentorRequest(thread._id, messageContent.replace(/@mind/gi, "").trim())
    }

    setReplyText("")
    setShowReplyBox(false)
  }

  const handleMentorShortcut = () => {
    setShowReplyBox(true)
    setReplyText((prev) => {
      if (prev.toLowerCase().includes("@mind")) return prev
      return prev ? `${prev}\n@Mind ` : "@Mind "
    })
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border border-border/60 bg-background/80 backdrop-blur transition-all hover:border-primary/40 hover:shadow-lg",
        thread.isPinned && "ring-1 ring-primary/40",
        thread.isAIMessage &&
          "border-purple-400/40 bg-gradient-to-br from-purple-500/5 via-background to-background"
      )}
    >
      <div className="grid gap-6 p-5 md:grid-cols-[auto,1fr]">
        <div className="flex flex-col items-center gap-3 pt-1">
          {Object.entries(REACTION_ICONS).map(([key, Icon]) => {
            const reactionKey = key as ReactionKey
            const count = thread.reactions?.[reactionKey] || 0
            const hasReacted = false

            return (
              <Tooltip key={reactionKey}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onReact(thread._id, reactionKey)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border border-transparent bg-muted/40 px-2 py-2 text-muted-foreground transition-colors hover:border-border hover:bg-background/80",
                      hasReacted && "border-primary/50 text-primary"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        count > 0 ? REACTION_COLORS[reactionKey] : "text-muted-foreground"
                      )}
                    />
                    {count > 0 && (
                      <span className="text-xs font-medium">{count}</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{REACTION_LABELS[reactionKey]}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-start gap-3">
            {thread.isAIMessage ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            ) : (
              <Avatar className="h-12 w-12 shrink-0 border border-border/70 shadow-sm">
                <AvatarImage src={thread.authorImage} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm">
                  {thread.author?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{thread.author}</span>
                {thread.isAIMessage && (
                  <Badge variant="secondary" className="h-5 gap-1 rounded-full px-2 text-[11px]">
                    <Bot className="h-3 w-3" />
                    MentorMind
                  </Badge>
                )}
                {thread.topic && (
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 rounded-full border-dashed px-2 text-[11px]"
                    style={{
                      borderColor: thread.topicColor,
                      color: thread.topicColor,
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: thread.topicColor }}
                    />
                    {thread.topic}
                  </Badge>
                )}
                {thread.isPinned && (
                  <Badge variant="secondary" className="h-5 gap-1 rounded-full px-2 text-[11px]">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(thread.createdAt, { addSuffix: true })}
                </span>
              </div>

              <div
                className={cn(
                  "rounded-xl border border-border/40 bg-background/80 p-4 text-sm leading-relaxed text-muted-foreground shadow-sm",
                  thread.isAIMessage &&
                    "border-purple-300/40 bg-gradient-to-br from-purple-500/5 via-background to-background text-foreground"
                )}
              >
                <p className="whitespace-pre-wrap">{thread.body}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <button
              onClick={() => setShowReplyBox(!showReplyBox)}
              className="flex items-center gap-1 rounded-full border border-transparent px-3 py-1 transition-colors hover:border-border hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              Reply
            </button>

            <button
              onClick={handleMentorShortcut}
              className="flex items-center gap-1 rounded-full border border-transparent px-3 py-1 transition-colors hover:border-purple-400 hover:text-foreground"
            >
              <Sparkles className="h-4 w-4 text-purple-500" />
              Ask MentorMind
            </button>

            {replyCount > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 rounded-full border border-transparent px-3 py-1 transition-colors hover:border-border hover:text-foreground"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>

          {showReplyBox && (
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply... tip: tag @Mind for AI mentorship."
                className="min-h-[90px] resize-none text-sm"
                disabled={isAIResponding}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowReplyBox(false)
                    setReplyText("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={!replyText.trim() || isAIResponding}
                >
                  {isAIResponding ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-3 w-3" />
                  )}
                  Reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isExpanded && replies.length > 0 && (
        <div className="border-t border-border/60 bg-muted/20">
          {replies.map((reply: any, index: number) => (
            <div
              key={reply._id}
              className={cn(
                "px-5 py-4 md:px-16",
                index !== replies.length - 1 && "border-b border-border/40"
              )}
            >
              <div className="flex gap-3">
                {reply.isAIMessage ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <Avatar className="h-9 w-9 shrink-0 border border-border/70 shadow-sm">
                    <AvatarImage src={reply.authorImage} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs">
                      {reply.author?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{reply.author}</span>
                    {reply.isAIMessage && (
                      <Badge variant="secondary" className="h-4 gap-1 rounded-full px-1.5 text-[10px]">
                        <Bot className="h-2.5 w-2.5" />
                        MentorMind
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "rounded-lg border border-border/40 bg-background/80 p-3 text-sm leading-relaxed text-muted-foreground",
                      reply.isAIMessage &&
                        "border-purple-300/40 bg-gradient-to-br from-purple-500/5 via-background to-background text-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{reply.body}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAIResponding && (
        <div className="border-t border-purple-300/30 bg-purple-500/5 px-5 py-4 md:pl-16">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
            <div>
              <span className="text-xs font-medium text-purple-600 dark:text-purple-300">
                MentorMind is crafting a response…
              </span>
              <div className="mt-2 flex gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function NewThreadDialog({
  onCreateThread,
}: {
  onCreateThread: (body: string, topic: string, topicColor: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const [topic, setTopic] = useState("")
  const [selectedColor, setSelectedColor] = useState(TOPIC_COLORS[3])

  const handleCreate = () => {
    if (!body.trim()) {
      toast.error("Please enter a message")
      return
    }
    if (!topic.trim()) {
      toast.error("Please select or enter a topic")
      return
    }

    onCreateThread(body, topic, selectedColor)
    setBody("")
    setTopic("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto" size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Start New Discussion
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Start a new discussion</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Topic / Subject</label>
            <Input
              placeholder="e.g., Math Chapter 5, Physics Assignment, Study Tips"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {TOPIC_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 border-transparent transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2",
                    selectedColor === color ? "scale-110 border-foreground" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Your message</label>
            <Textarea
              placeholder="Start the discussion… tag @Mind to loop in the AI mentor instantly."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[130px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Tag <Badge variant="outline" className="mx-1 text-[10px] px-1">@Mind</Badge> to get contextual help from MentorMind without leaving the thread.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Thread
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function RedditStyleChat({ groupId }: RedditStyleChatProps) {
  const currentUser = useQuery(api.users.viewer)
  const threads = useQuery(api.messages.listThreaded, { groupId })
  const topics = useQuery(api.messages.getGroupTopics, { groupId })
  const sendMessage = useMutation(api.messages.send)
  const addReaction = useMutation(api.messages.addReaction)

  const [isAIResponding, setIsAIResponding] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [mentorPrompt, setMentorPrompt] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [threadView, setThreadView] = useState<"all" | "mentor">("all")
  const [sortOrder, setSortOrder] = useState<"recent" | "active" | "mentor">("recent")

  const requestMentorMind = async (message: string, replyToMessageId?: Id<"messages">) => {
    setIsAIResponding(true)
    try {
      const response = await fetch("/api/group-ai-mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          userMessage: message,
          userName: currentUser?.name || currentUser?.email || "User",
          replyToMessageId,
        }),
      })

      if (!response.ok) throw new Error("Failed to get AI response")
      toast.success("Mind has responded!")
    } catch (error) {
      console.error("AI mentor error:", error)
      toast.error("Mind couldn't respond right now.")
      throw error
    } finally {
      setIsAIResponding(false)
    }
  }

  const handleCreateThread = async (body: string, topic: string, topicColor: string) => {
    const messageText = body.trim()
    const hasMindMention = messageText.toLowerCase().includes("@mind")

    const newThreadId = await sendMessage({
      groupId,
      body: messageText,
      topic,
      topicColor,
    })

    if (hasMindMention) {
      const cleaned = messageText.replace(/@mind/gi, "").trim()
      if (cleaned) {
        try {
          await requestMentorMind(cleaned, newThreadId)
        } catch {
          // Already handled in requestMentorMind
        }
      }
    }

    toast.success("Discussion thread created!")
  }

  const handleReply = async (threadId: Id<"messages">, message: string) => {
    await sendMessage({
      groupId,
      body: message,
      replyToMessageId: threadId,
    })
  }

  const handleAIMentorRequest = async (threadId: Id<"messages">, message: string) => {
    try {
      await requestMentorMind(message, threadId)
    } catch {
      // requestMentorMind already surfaced the error to the user
    }
  }

  const handleReact = async (messageId: Id<"messages">, reaction: string) => {
    await addReaction({
      messageId,
      reaction: reaction as "upvote" | "helpful" | "thanks" | "mind_blown",
    })
  }

  const handleMentorPromptSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const prompt = mentorPrompt.trim()
    if (!prompt) return

    try {
      const newMentorThreadId = await sendMessage({
        groupId,
        body: prompt,
        topic: MENTOR_MIND_TOPIC.label,
        topicColor: MENTOR_MIND_TOPIC.color,
      })
      await requestMentorMind(prompt, newMentorThreadId)
      toast.success("Mind is responding in the new MentorMind Guidance thread.")
      setMentorPrompt("")
    } catch (error) {
      if (error instanceof Error) {
        console.error("MentorMind quick prompt error:", error)
      }
    }
  }

  const threadEntries = useMemo(() => {
    if (!threads) return []
    return threads.map((thread: any) => {
      const replies = thread.replies ?? []
      const mentorTouchpoints =
        (thread.isAIMessage ? 1 : 0) + replies.filter((reply: any) => reply.isAIMessage).length
      const participantSet = new Set<string>()
      if (thread.author) participantSet.add(thread.author)
      replies.forEach((reply: any) => {
        if (reply.author) participantSet.add(reply.author)
      })
      const activityTimestamps = [
        toMillis(thread.createdAt),
        ...replies.map((reply: any) => toMillis(reply.createdAt)),
      ].filter(Boolean)
      const lastActivity = activityTimestamps.length
        ? Math.max(...activityTimestamps)
        : toMillis(thread.createdAt)

      return {
        thread,
        replies,
        mentorTouchpoints,
        participantCount: participantSet.size,
        lastActivity,
      }
    })
  }, [threads])

  const visibleThreadEntries = useMemo(() => {
    if (!threadEntries.length) return []

    const query = searchTerm.trim().toLowerCase()

    const matchesQuery = (thread: any, replies: any[]) => {
      if (!query) return true
      const fields = [
        thread.topic,
        thread.body,
        thread.author,
        ...replies.map((reply: any) => reply.body),
        ...replies.map((reply: any) => reply.author),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return fields.includes(query)
    }

    const filtered = threadEntries.filter(({ thread, replies, mentorTouchpoints }) => {
      if (selectedTopic && thread.topic !== selectedTopic) return false
      if (threadView === "mentor" && mentorTouchpoints === 0) return false
      return matchesQuery(thread, replies)
    })

    return filtered.sort((a, b) => {
      if (sortOrder === "mentor") {
        if (b.mentorTouchpoints !== a.mentorTouchpoints) {
          return b.mentorTouchpoints - a.mentorTouchpoints
        }
        return b.lastActivity - a.lastActivity
      }
      if (sortOrder === "active") {
        return b.lastActivity - a.lastActivity
      }
      return toMillis(b.thread.createdAt) - toMillis(a.thread.createdAt)
    })
  }, [threadEntries, selectedTopic, searchTerm, threadView, sortOrder])

  const aiContributionCount = threadEntries.reduce(
    (count, entry) => count + entry.mentorTouchpoints,
    0
  )
  const filteredCount = visibleThreadEntries.length
  const filteredReplies = visibleThreadEntries.reduce((count, entry) => count + entry.replies.length, 0)
  const pinnedThreadEntries = visibleThreadEntries.filter(({ thread }) => thread.isPinned)
  const regularThreadEntries = visibleThreadEntries.filter(({ thread }) => !thread.isPinned)
  const isFiltered =
    threadView !== "all" || selectedTopic !== null || searchTerm.trim() !== "" || sortOrder !== "recent"
  const topicCount = topics?.length ?? 0
  const mentorTouchpointRate = threadEntries.length
    ? (aiContributionCount / threadEntries.length).toFixed(1)
    : "0.0"
  const mostActiveTopic = useMemo(() => {
    const topicScore = new Map<string, { score: number; color?: string }>()
    threadEntries.forEach(({ thread, replies }) => {
      if (!thread.topic) return
      const existing = topicScore.get(thread.topic) ?? { score: 0, color: thread.topicColor }
      topicScore.set(thread.topic, {
        score: existing.score + 1 + replies.length * 0.25,
        color: existing.color ?? thread.topicColor,
      })
    })
    if (topicScore.size === 0) return null
    return [...topicScore.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .map(([topic, meta]) => ({ topic, color: meta.color }))
      .at(0)!
  }, [threadEntries])

  const handleResetFilters = () => {
    setSelectedTopic(null)
    setThreadView("all")
    setSearchTerm("")
    setSortOrder("recent")
  }

  if (!currentUser || threads === undefined) {
    return <ChatSkeleton />
  }

  const threadCount = threads.length
  const totalReplies = threadEntries.reduce((count, entry) => count + entry.replies.length, 0)
  const participantCount = threadEntries.reduce((set, entry) => {
    const { thread, replies } = entry
    if (thread.author) set.add(thread.author)
    replies.forEach((reply: any) => {
      if (reply.author) set.add(reply.author)
    })
    return set
  }, new Set<string>()).size
  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative flex min-h-[calc(100svh-170px)] flex-col gap-6 overflow-y-auto pb-10">
        <div className="pointer-events-none absolute inset-x-0 top-[-280px] h-[420px] rounded-full bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_65%)]" />

        <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-background via-background to-primary/5 p-6 shadow-sm shadow-primary/10 sm:p-8">
          <div className="pointer-events-none absolute -left-16 top-14 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 -bottom-14 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.6fr,1fr]">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground shadow-sm backdrop-blur">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  Group discussions & threads
                </div>
                <div className="space-y-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                    Lead your study group with confidence
                  </h1>
                  <p className="max-w-xl text-sm text-muted-foreground md:text-base">
                    Align your teammates, capture decisions, and invite MentorMind to accelerate momentum. Everything updates in real time so the
                    whole group stays in sync.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/15 via-background to-background p-4 shadow-sm transition-all hover:shadow-lg">
                  <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/20 blur-3xl" />
                  <div className="relative space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Threads
                    </div>
                    <p className="text-3xl font-semibold text-foreground">{threadCount}</p>
                    <p className="text-xs text-muted-foreground">Active discussions guiding the team.</p>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-emerald-400/10 via-background to-background p-4 shadow-sm transition-all hover:shadow-lg">
                  <div className="pointer-events-none absolute -right-6 -bottom-10 h-24 w-24 rounded-full bg-emerald-300/20 blur-3xl" />
                  <div className="relative space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <Users className="h-4 w-4 text-emerald-500" />
                      Contributors
                    </div>
                    <p className="text-3xl font-semibold text-foreground">{participantCount}</p>
                    <p className="text-xs text-muted-foreground">Teammates sharing updates and perspective.</p>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-purple-500/15 via-background to-background p-4 shadow-sm transition-all hover:shadow-lg">
                  <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-purple-400/25 blur-3xl" />
                  <div className="relative space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      MentorMind
                    </div>
                    <p className="text-3xl font-semibold text-foreground">{aiContributionCount}</p>
                    <p className="text-xs text-muted-foreground">AI-guided insights stitched into discussions.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <NewThreadDialog onCreateThread={handleCreateThread} />
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setSelectedTopic(null)
                    setMentorPrompt("Can you summarise our recent updates?")
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                  Nudge MentorMind
                </Button>
              </div>
            </div>

            <div className="relative flex flex-col gap-4 rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/15 via-background to-background p-6 shadow-inner">
              <div className="pointer-events-none absolute inset-0 rounded-3xl border border-purple-500/20 opacity-40" />
              <div className="relative flex items-start gap-3">
                <div className="rounded-full bg-purple-500/20 p-3 text-purple-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">MentorMind quick assist</h3>
                  <p className="text-sm text-muted-foreground">
                    Ask MentorMind for targeted help. Every request spins up a guidance thread the whole group can follow.
                  </p>
                </div>
              </div>

              <form className="relative space-y-3" onSubmit={handleMentorPromptSubmit}>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={mentorPrompt}
                    onChange={(event) => setMentorPrompt(event.target.value)}
                    placeholder="e.g., Highlight key takeaways from our design jam"
                    className="flex-1 rounded-2xl border-purple-400/40 bg-background/90"
                    disabled={isAIResponding}
                  />
                  <Button
                    type="submit"
                    className="w-full rounded-2xl sm:w-auto"
                    disabled={isAIResponding || !mentorPrompt.trim()}
                  >
                    {isAIResponding ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Ask MentorMind
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MENTOR_MIND_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setMentorPrompt(suggestion)}
                      className="rounded-full border border-purple-400/40 bg-background/70 px-3 py-1 text-xs text-purple-600 transition-colors hover:border-purple-500 hover:bg-purple-500/10"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </form>

              <div className="relative mt-2 rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4 text-xs text-purple-900 dark:text-purple-100">
                <p className="font-semibold uppercase tracking-wide">MentorMind can:</p>
                <ul className="mt-2 space-y-1 text-[11px] text-purple-900/80 dark:text-purple-100/80">
                  <li>• Outline the next moves for your sprint plan</li>
                  <li>• Surface blockers hidden in long threads</li>
                  <li>• Craft study prompts tailored to your exam schedule</li>
                </ul>
              </div>

              <div className="relative grid gap-3 rounded-2xl border border-purple-400/30 bg-background/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Focus spotlight
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {mostActiveTopic?.topic ?? "No topic spotlight yet"}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/5 px-3 py-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Active topics</p>
                      <p className="text-xs font-medium text-foreground">{topicCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/5 px-3 py-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        MentorMind avg
                      </p>
                      <p className="text-xs font-medium text-foreground">{mentorTouchpointRate} assists / thread</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border/50 bg-background/90 shadow-sm backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
          <div className="pointer-events-none absolute -right-24 bottom-10 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-1 flex-col">
            <div className="space-y-6 px-4 py-6 md:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground md:text-xl">Thread library</h3>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Scan the knowledge base of your group, filter by context, and keep a pulse on MentorMind activity from one place.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                    {isFiltered ? `${filteredCount}/${threadCount} threads` : `${threadCount} threads`}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-border/50 px-3 py-1 text-xs">
                    {isFiltered ? `${filteredReplies} replies` : `${totalReplies} replies`}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-xs">
                    {aiContributionCount} MentorMind touchpoints
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex w-full flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by topic, author, or keyword"
                      className="w-full rounded-full border-border/40 bg-background/80 pl-9 shadow-sm"
                    />
                  </div>
                  <div className="relative w-full sm:w-[220px]">
                    <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Select
                      value={sortOrder}
                      onValueChange={(value) => setSortOrder(value as "recent" | "active" | "mentor")}
                    >
                      <SelectTrigger className="w-full rounded-full border-border/40 bg-background/80 pl-9 shadow-sm">
                        <SelectValue placeholder="Sort threads" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Newest threads</SelectItem>
                        <SelectItem value="active">Recent activity</SelectItem>
                        <SelectItem value="mentor">MentorMind first</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                  <Tabs
                    value={threadView}
                    onValueChange={(value) => setThreadView(value as "all" | "mentor")}
                    className="w-full sm:w-auto"
                  >
                    <TabsList className="grid h-11 w-full grid-cols-2 rounded-full bg-muted/40 p-1.5 sm:min-w-[240px]">
                      <TabsTrigger
                        value="all"
                        className="rounded-full text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground"
                      >
                        All threads
                      </TabsTrigger>
                      <TabsTrigger
                        value="mentor"
                        className="rounded-full text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground"
                      >
                        MentorMind
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {isFiltered && (
                    <Badge variant="outline" className="rounded-full border-border/50 px-3 py-1 text-xs text-muted-foreground">
                      {filteredCount} matching
                    </Badge>
                  )}
                </div>
              </div>

              {topics && topics.length > 0 && (
                <div className="rounded-3xl border border-border/40 bg-muted/20 p-5">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/70 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                      <Filter className="h-3.5 w-3.5" />
                      Topics
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={selectedTopic === null ? "default" : "outline"}
                        size="sm"
                        className={cn("rounded-full px-3", selectedTopic === null && "border-primary/30")}
                        onClick={() => setSelectedTopic(null)}
                      >
                        All topics
                      </Button>
                      {topics.map((t) => (
                        <Button
                          key={t.topic}
                          variant={selectedTopic === t.topic ? "default" : "outline"}
                          size="sm"
                          className="rounded-full px-3"
                          onClick={() => setSelectedTopic(t.topic)}
                          style={{
                            borderColor: selectedTopic === t.topic ? t.color : undefined,
                            backgroundColor: selectedTopic === t.topic ? `${t.color}22` : undefined,
                            color: selectedTopic === t.topic ? "white" : t.color,
                          }}
                        >
                          <span
                            className="mr-2 h-2 w-2 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                          {t.topic}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator className="border-border/40" />

            <ScrollArea className="flex-1 px-2 py-6 md:px-8">
              {threadCount === 0 ? (
                <Card className="mx-auto max-w-xl space-y-5 border border-border/50 bg-background/85 p-10 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-primary/30 bg-primary/10">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">No discussions yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Launch the first thread to set the tone for your group. Invite MentorMind by tagging{" "}
                      <Badge variant="secondary" className="mx-1 rounded-full px-2 py-1 text-[11px]">@Mind</Badge>
                      for instant guidance.
                    </p>
                  </div>
                  <NewThreadDialog onCreateThread={handleCreateThread} />
                </Card>
              ) : filteredCount === 0 ? (
                <Card className="mx-auto max-w-xl space-y-5 border border-border/50 bg-background/85 p-10 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border/50 bg-muted/40">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Nothing matches yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your filters or search terms, or reset everything to explore the full thread library.
                    </p>
                  </div>
                  <Button variant="outline" className="mx-auto w-full sm:w-auto" onClick={handleResetFilters}>
                    <Undo2 className="mr-2 h-4 w-4" />
                    Reset filters
                  </Button>
                </Card>
              ) : (
                <div className="space-y-10 pb-10">
                  {pinnedThreadEntries.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Pin className="h-3.5 w-3.5 text-primary" />
                        Pinned highlights
                      </div>
                      <div className="space-y-5">
                        {pinnedThreadEntries.map(({ thread }) => (
                          <ThreadCard
                            key={thread._id}
                            thread={thread}
                            onReply={handleReply}
                            onReact={handleReact}
                            onAIMentorRequest={handleAIMentorRequest}
                            isAIResponding={isAIResponding}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {regularThreadEntries.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {pinnedThreadEntries.length > 0 ? "More conversations" : "All conversations"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Sorted by{" "}
                          {sortOrder === "recent"
                            ? "newest"
                            : sortOrder === "active"
                              ? "recent activity"
                              : "MentorMind guidance"}
                        </span>
                      </div>
                      <div className="space-y-5">
                        {regularThreadEntries.map(({ thread }) => (
                          <ThreadCard
                            key={thread._id}
                            thread={thread}
                            onReply={handleReply}
                            onReact={handleReact}
                            onAIMentorRequest={handleAIMentorRequest}
                            isAIResponding={isAIResponding}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </section>
      </div>
    </TooltipProvider>
  )
}

function ChatSkeleton() {
  return (
    <div className="flex min-h-[calc(100svh-170px)] flex-col gap-6 overflow-y-auto pb-10">
      <Skeleton className="h-64 w-full rounded-3xl" />
      <Card className="flex flex-1 flex-col border border-border/60 bg-background/85 p-6">
        <Skeleton className="mb-6 h-12 w-full rounded-full" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl border border-border/60 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-40 rounded-full" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-4 w-28 rounded-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}
