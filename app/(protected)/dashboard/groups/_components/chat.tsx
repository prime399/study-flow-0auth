"use client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { useState, useEffect, useRef, useMemo } from "react"
import { toast } from "sonner"
import { Send, User, Sparkles, Bot, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface ChatProps {
  groupId: Id<"groups">
}

export function Chat({ groupId }: ChatProps) {
  const currentUser = useQuery(api.users.viewer)
  const [message, setMessage] = useState("")
  const [isAIResponding, setIsAIResponding] = useState(false)
  const rawMessages = useQuery(api.messages.list, { groupId })
  const messages = useMemo(() => rawMessages || [], [rawMessages])
  const sendMessage = useMutation(api.messages.send)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isAIResponding])

  // Check if message mentions @Mind
  const mentionsMind = (text: string) => {
    return text.toLowerCase().includes("@mind")
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    const messageText = message.trim()
    const hasMindMention = mentionsMind(messageText)

    // Send user message first
    await sendMessage({
      groupId,
      body: messageText,
    })
    setMessage("")

    // If @Mind is mentioned, call AI mentor
    if (hasMindMention) {
      setIsAIResponding(true)
      try {
        const response = await fetch("/api/group-ai-mentor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            userMessage: messageText.replace(/@mind/gi, "").trim(),
            userName: currentUser?.name || currentUser?.email || "User",
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to get AI response")
        }

        // AI message is automatically added via the API
        toast.success("Mind has responded!")
      } catch (error) {
        console.error("AI mentor error:", error)
        toast.error("Mind couldn't respond right now. Please try again.")
      } finally {
        setIsAIResponding(false)
      }
    }
  }

  if (!currentUser || rawMessages === undefined) {
    return <ChatSkeleton />
  }
  return (
    <Card className="flex h-[calc(100svh-170px)] flex-col border-border/40 bg-gradient-to-b from-background to-muted/20">
      <ScrollArea
        className="flex-1 p-4"
        style={{ height: "calc(100% - 80px)" }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Start chatting with your group
            </h3>
            <p className="max-w-sm text-sm">
              Send messages to communicate with other members. Tag <Badge variant="secondary" className="mx-1 text-xs">@Mind</Badge> to get help from your AI mentor!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.toReversed().map((message) => {
              const isCurrentUser = message.userId === currentUser?._id
              const isAI = message.isAIMessage

              if (isAI) {
                // AI Message - Special styling
                return (
                  <div
                    key={message._id}
                    className="flex gap-3 text-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                          Mind (AI Mentor)
                        </span>
                        <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                          <Bot className="mr-1 h-2.5 w-2.5" />
                          AI
                        </Badge>
                      </div>
                      <div className="rounded-2xl rounded-tl-sm border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 px-4 py-3 shadow-sm dark:border-purple-800 dark:from-purple-950/50 dark:to-pink-950/50">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {message.body}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }

              // Regular user message
              return (
                <div
                  key={message._id}
                  className={cn(
                    "flex gap-3 text-sm animate-in fade-in-0 slide-in-from-bottom-1 duration-300",
                    isCurrentUser ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                    <AvatarImage src={message.authorImage || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs">
                      {message.author.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1 max-w-[70%]">
                    <span
                      className={cn(
                        "text-xs font-medium text-muted-foreground",
                        isCurrentUser ? "text-right" : "text-left",
                      )}
                    >
                      {message.author}
                    </span>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 shadow-sm transition-all hover:shadow-md",
                        isCurrentUser
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "rounded-tl-sm border border-border bg-card"
                      )}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.body}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* AI Typing Indicator */}
            {isAIResponding && (
              <div className="flex gap-3 text-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      Mind is thinking...
                    </span>
                  </div>
                  <div className="flex gap-1.5 rounded-2xl rounded-tl-sm border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 px-4 py-3 dark:border-purple-800 dark:from-purple-950/50 dark:to-pink-950/50">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple-500"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border/40 bg-background/80 p-4 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message... (use @Mind to ask the AI mentor)"
              className="pr-20 border-border/50 focus-visible:ring-primary/50 bg-background/50"
              autoFocus
              disabled={isAIResponding}
            />
            {mentionsMind(message) && (
              <Badge
                variant="secondary"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Mind
              </Badge>
            )}
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isAIResponding}
            className="h-10 w-10 shadow-sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Tip: Tag <Badge variant="outline" className="mx-1 text-[10px] px-1">@Mind</Badge> in your message to get instant help from the AI mentor
        </p>
      </div>
    </Card>
  )
}

function ChatSkeleton() {
  return (
    <Card className="flex h-[calc(100svh-170px)] flex-col">
      <div className="flex-1 p-4">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                i % 2 === 0 ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-[200px] rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>
    </Card>
  )
}
