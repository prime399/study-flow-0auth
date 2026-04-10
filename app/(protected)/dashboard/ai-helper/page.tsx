"use client"

import PageTitle from "@/components/page-title"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

import { api } from "@/convex/_generated/api"
import { useQuery } from "convex/react"
import { TrashIcon } from "lucide-react"

import { useChat } from "./_hooks/use-chat"
import { PredefinedMessages } from "./_components/predefined-messages"
import { MessageList } from "./_components/message-list"
import { ChatInput } from "./_components/chat-input"
import { ModelSelector } from "./_components/model-selector"
import { McpToolSelector } from "./_components/mcp-tool-selector"

export default function AIHelperPage() {
  const getStudyStats = useQuery(api.study.getFullStats)
  const listMyGroups = useQuery(api.groups.listMyGroups)
  const user = useQuery(api.users.viewer)

  const {
    messages,
    input,
    setInput,
    isLoading,
    error,
    messagesEndRef,
    selectedModel,
    resolvedModel,
    selectedMcpTool,
    setSelectedModel,
    setSelectedMcpTool,
    handleSubmit,
    append,
    stop,
    reload,
    clearChat,
    clearError,
    coinBalance,
    coinsRequired,
  } = useChat({
    studyStats: getStudyStats,
    groupInfo: listMyGroups,
    userName: user?.name,
  })

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header section - fully responsive layout */}
      <div className="flex flex-col gap-2 px-3 py-2 sm:px-4 sm:py-3 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <PageTitle title="MentorMind" />
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="gap-1 h-8 px-2 sm:px-3"
          >
            <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Clear</span>
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <ModelSelector
            selectedModel={selectedModel}
            resolvedModel={resolvedModel}
            onModelChange={setSelectedModel}
            disabled={isLoading}
          />
          <McpToolSelector
            selectedTool={selectedMcpTool}
            onToolChange={setSelectedMcpTool}
            disabled={isLoading}
          />
        </div>
      </div>
      
      {/* Chat container - full height minus header with safe area for mobile keyboards */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full p-3 sm:p-4 md:p-6">
            {messages.length === 0 ? (
              <PredefinedMessages 
                onMessageSelect={(message) => append({ role: "user", content: message })}
                isLoading={isLoading}
              />
            ) : (
              <>
                <MessageList
                  messages={messages}
                  user={user}
                  error={error}
                  isLoading={isLoading}
                  onRetry={reload}
                  onClearError={clearError}
                />
                <div ref={messagesEndRef} />
              </>
            )}
          </ScrollArea>
        </div>
        <div className="shrink-0 border-t bg-background shadow-lg">
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            onStop={stop}
            onReload={reload}
            isLoading={isLoading}
            error={error}
            hasMessages={messages.length > 0}
            activeModel={resolvedModel}
            coinBalance={coinBalance}
            coinsRequired={coinsRequired}
            selectedMcpTool={selectedMcpTool}
          />
        </div>
      </div>
    </div>
  )
}
