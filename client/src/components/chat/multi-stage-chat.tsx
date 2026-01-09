"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { EmptyState } from "./empty-state"
import { LoadingMessage } from "./loading-message"
import { type Message, type SubChat, type AgentType } from "@/types/chat"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"

interface MultiStageChatProps {
  subChats: SubChat[]
  activeSubChatIndex: number
  conversationId?: string
  onSendMessage: (message: string, agentType: AgentType, files?: File[]) => void
  onAcceptMessage: (agentType: AgentType, message: Message) => void
  onNavigateToSubChat: (index: number) => void
  isLoading?: boolean
  onMessageAction?: (message: Message, action: string) => void
}

const AGENT_LABELS: Record<AgentType, string> = {
  MODELER_AGENT: "Mathematic Modeler",
  CODER_AGENT: "Python Coder",
  VISUALIZER_AGENT: "Visualizer",
}

export function MultiStageChat({
  subChats,
  activeSubChatIndex,
  conversationId,
  onSendMessage,
  onAcceptMessage,
  onNavigateToSubChat,
  isLoading = false,
  onMessageAction,
}: MultiStageChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeSubChat = subChats[activeSubChatIndex]
  const activeAgentType = activeSubChat?.agentType || "MODELER_AGENT"
  const displayedMessages = (activeSubChat?.messages || []).filter((m) => !isLoading || !m.retry)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeSubChat?.messages, isLoading])

  const handleSend = (message: string, files?: File[]) => {
    if ((message.trim() || (files && files.length > 0)) && !isLoading) {
      onSendMessage(message, activeAgentType, files)
    }
  }

  const handleAccept = (message: Message) => {
    onAcceptMessage(activeAgentType, message)
  }

  const canNavigatePrev = activeSubChatIndex > 0
  const canNavigateNext = activeSubChatIndex < subChats.length - 1

  return (
    <div className="flex flex-col h-full">
      {/* Header with agent name and navigation */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigateToSubChat(activeSubChatIndex - 1)}
            disabled={!canNavigatePrev}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[240px]">
            <h2 className="text-lg font-semibold">{AGENT_LABELS[activeAgentType]}</h2>
            <p className="text-sm text-muted-foreground">
              Stage {activeSubChatIndex + 1} of {subChats.length}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigateToSubChat(activeSubChatIndex + 1)}
            disabled={!canNavigateNext}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {activeSubChat?.messages.length === 0 && !isLoading ? (
          <EmptyState onSelectPrompt={function (prompt: string): void {
            throw new Error("Function not implemented.")
          }} />
        ) : (
          <div className="max-w-4xl mx-auto space-y-4 p-6">
            {displayedMessages.map((message, index) => {
              const isLatestAssistant =
                message.role === "assistant" &&
                index === displayedMessages.length - 1 &&
                !activeSubChat.acceptedMessage

              return (
                <div key={message.id}>
                  <ChatMessage
                    message={message}
                    onAction={(action) => onMessageAction?.(message, action)}
                  />
                  {isLatestAssistant && message.canAccept && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => handleAccept(message)}
                        className="gap-2"
                        variant="default"
                      >
                        <Check className="h-4 w-4" />
                        {activeAgentType === "MODELER_AGENT" && "Accept Model and Generate Code"}
                        {activeAgentType === "CODER_AGENT" && "Accept Code and Visualize"}
                        {activeAgentType === "VISUALIZER_AGENT" && "Finish"}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
            {isLoading && <LoadingMessage />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {!activeSubChat?.acceptedMessage && (
        <div className="border-t border-border p-4">
          <div className="max-w-4xl mx-auto">
            <ChatInput
              onSend={handleSend}
              isLoading={isLoading}
              placeholder={`Write a message to ${AGENT_LABELS[activeAgentType]}...`}
            />
          </div>
        </div>
      )}
    </div>
  )
}