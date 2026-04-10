"use client"
/**
 * Chat input component with send/stop/reload functionality
 * Handles user input and control actions for the chat interface
 */

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw, Send, StopCircle, Coins, Sparkles } from "lucide-react"
import { useCallback, useMemo, useRef, useEffect, useState } from "react"

import { AUTO_MODEL_ID, MODEL_LABELS, DEFAULT_MCP_TOOL, type McpToolId } from "../_constants"

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onStop: () => void
  onReload: () => void
  isLoading: boolean
  error: string | null
  hasMessages: boolean
  activeModel: string
  coinBalance: number
  coinsRequired: number
  selectedMcpTool: McpToolId
}

const MCP_HINT_KEY = "mcpHintDismissed"
const KEYBOARD_HINT_KEY = "keyboardHintDismissed"

export function ChatInput({
  input,
  setInput,
  onSubmit,
  onStop,
  onReload,
  isLoading,
  error,
  hasMessages,
  activeModel,
  coinBalance,
  coinsRequired,
  selectedMcpTool,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showMcpHint, setShowMcpHint] = useState(false)
  const [showKeyboardHint, setShowKeyboardHint] = useState(true)

  const insufficientCoins = coinBalance < coinsRequired
  const isMcpToolSelected = selectedMcpTool !== DEFAULT_MCP_TOOL
  const charCount = input.length

  // Load hint preferences from localStorage
  useEffect(() => {
    const keyboardHintDismissed = localStorage.getItem(KEYBOARD_HINT_KEY) === "true"
    setShowKeyboardHint(!keyboardHintDismissed)
  }, [])

  // Show MCP hint when user hasn't seen it yet
  useEffect(() => {
    const mcpHintDismissed = localStorage.getItem(MCP_HINT_KEY) === "true"
    
    if (!mcpHintDismissed) {
      setShowMcpHint(true)
    }
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [setInput])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading && !insufficientCoins) {
        // Dismiss keyboard hint on first use
        if (showKeyboardHint) {
          localStorage.setItem(KEYBOARD_HINT_KEY, "true")
          setShowKeyboardHint(false)
        }
        onSubmit(e as any)
      }
    }
  }, [input, isLoading, insufficientCoins, onSubmit, showKeyboardHint])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  const modelLabel = useMemo(() => {
    const fallback = MODEL_LABELS[AUTO_MODEL_ID]
    return MODEL_LABELS[activeModel] ?? activeModel ?? fallback
  }, [activeModel])

  return (
    <div className="safe-area-inset-bottom">
      <div className="p-3 sm:p-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          {showMcpHint && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-primary">MCP Tools Available:</span> I can use external tools to fetch and process URLs when needed. {isMcpToolSelected && "You've selected a preferred tool in the toolbar."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.setItem(MCP_HINT_KEY, "true")
                  setShowMcpHint(false)
                }}
                className="h-6 px-2 text-xs shrink-0"
              >
                Got it
              </Button>
            </div>
          )}
          <div className="flex items-start gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... (I can use tools to fetch URLs when needed)"
                disabled={isLoading || (error != null && !insufficientCoins)}
                className="min-h-[48px] max-h-[200px] resize-none text-sm sm:text-base pr-12 touch-manipulation"
                rows={1}
                autoFocus
              />
              {charCount > 0 && (
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/60">
                  {charCount}
                </div>
              )}
            </div>
            <div className="flex gap-1 sm:gap-2 shrink-0 pt-1">
              {isLoading ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={onStop}
                  className="h-10 w-10 sm:h-11 sm:w-11 touch-manipulation"
                  title="Stop generation"
                >
                  <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              ) : (
                hasMessages && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault()
                      onReload()
                    }}
                    className="h-10 w-10 sm:h-11 sm:w-11 touch-manipulation"
                    title="Retry last message"
                  >
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                )
              )}
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim() || insufficientCoins}
                className="h-10 w-10 sm:h-11 sm:w-11 touch-manipulation"
                title="Send message (Enter)"
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>

          {showKeyboardHint && (
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Enter</kbd> to send • 
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded ml-1">Shift + Enter</kbd> for new line
              </div>
              {charCount > 1000 && (
                <p className="text-xs text-orange-500">
                  Long messages may use more tokens
                </p>
              )}
            </div>
          )}

          {insufficientCoins && (
            <p className="text-xs text-destructive">
              You need {coinsRequired} coins to ask MentorMind. Start a study session to earn more coins (1 second = 1 coin).
            </p>
          )}

          {error && !insufficientCoins && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </form>
      </div>

      {/* Powered by footer - responsive */}
      <div className="border-t bg-muted/30 px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>AI Assistant Active</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs overflow-hidden">
            <div className="flex items-center gap-1">
              <span className="hidden sm:inline">Powered by</span>
              <span className="font-semibold text-primary truncate">{modelLabel}</span>
            </div>
            <span className="hidden sm:inline">|</span>
            <div className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              <span className="font-semibold">{coinBalance}</span>
              <span className="text-muted-foreground/70">({coinsRequired} per question)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
