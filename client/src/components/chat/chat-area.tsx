"use client"

import { useRef, useEffect } from "react"
import { Menu, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { EmptyState } from "./empty-state"
import { LoadingMessage } from "./loading-message"
import type { Message } from "@/types/chat"

interface ChatAreaProps {
  messages: Message[]
  isLoading: boolean
  onSend: (message: string) => void
  onAction: (action: string) => void
  onToggleSidebar: () => void
  isSidebarCollapsed: boolean
}

export function ChatArea({
  messages,
  isLoading,
  onSend,
  onAction,
  onToggleSidebar,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isEmpty = messages.length === 0

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading])

  return (
    <div className="flex h-full flex-1 flex-col">
      {/* Header (mobile) */}
      <div className="flex h-14 items-center gap-3 border-b border-border/50 px-4 lg:hidden bg-background/80 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold">Decisio.ai</span>
        </div>
      </div>

      {/* Chat content */}
      {isEmpty ? (
        <EmptyState onSelectPrompt={onSend} />
      ) : (
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onAction={onAction} />
            ))}
            {isLoading && <LoadingMessage />}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      )}

      <div className="relative border-t border-border/30 bg-background/60 backdrop-blur-xl">
        {/* Gradient line accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <div className="mx-auto max-w-3xl px-4 py-4">
          <ChatInput onSend={onSend} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
