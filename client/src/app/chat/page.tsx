"use client"

import { useState, useCallback } from "react"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatArea } from "@/components/chat/chat-area"
import { mockConversations } from "@/lib/mock-conversations"
import { generateId } from "@/lib/chat-utils"
import type { Conversation, Message } from "@/types/chat"
import { useToast } from "@/components/ui/use-toast"
import { AmbientOrbs } from "@/components/ui/ambient-orbs"

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { toast } = useToast()

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const messages = activeConversation?.messages || []

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null)
  }, [])

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id)
  }, [])

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeConversationId === id) {
        setActiveConversationId(null)
      }
      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed.",
      })
    },
    [activeConversationId, toast],
  )

  const handleRenameConversation = useCallback(
    (id: string, newTitle: string) => {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)))
      toast({
        title: "Conversation renamed",
        description: `Renamed to "${newTitle}"`,
      })
    },
    [toast],
  )

  const handleSendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
        type: "text",
      }

      if (!activeConversationId) {
        const newConv: Conversation = {
          id: generateId(),
          title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
          messages: [userMessage],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setConversations((prev) => [newConv, ...prev])
        setActiveConversationId(newConv.id)
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId ? { ...c, messages: [...c.messages, userMessage], updatedAt: new Date() } : c,
          ),
        )
      }

      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const aiMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: `I understand you're looking to solve a decision problem: "${content.slice(0, 100)}..."\n\nLet me analyze this and create a mathematical model for you. Based on your description, this appears to be an optimization problem that can be formulated as follows:\n\n**Objective Function:**\nMaximize or minimize the target metric based on your constraints.\n\n**Decision Variables:**\nThe key variables that we need to determine.\n\n**Constraints:**\n- Resource limitations\n- Capacity bounds\n- Logical requirements`,
        timestamp: new Date(),
        type: "model",
        actions: [
          { label: "Accept Model", variant: "primary" },
          { label: "Generate Code", variant: "secondary" },
        ],
      }

      const targetId = activeConversationId || conversations[0]?.id
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetId ? { ...c, messages: [...c.messages, aiMessage], updatedAt: new Date() } : c,
        ),
      )
      setIsLoading(false)
    },
    [activeConversationId, conversations],
  )

  const handleAction = useCallback(
    (action: string) => {
      toast({
        title: `Action: ${action}`,
        description: "This feature will be implemented in the next phase.",
      })
    },
    [toast],
  )

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <AmbientOrbs variant="subtle" className="z-0" />

      <div
        className={`relative z-20 ${isSidebarCollapsed ? "hidden lg:flex" : "fixed inset-y-0 left-0 z-50 lg:relative"}`}
      >
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      <div className="relative z-10 flex-1">
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          onSend={handleSendMessage}
          onAction={handleAction}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
      </div>
    </div>
  )
}
