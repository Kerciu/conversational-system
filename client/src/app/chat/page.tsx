"use client"

import { useState, useCallback } from "react"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatArea } from "@/components/chat/chat-area"
import { mockConversations } from "@/lib/mock-conversations"
import { generateId } from "@/lib/chat-utils"
import type { Conversation, Message } from "@/types/chat"
import { useToast } from "@/components/ui/use-toast"
import { AmbientOrbs } from "@/components/ui/ambient-orbs"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { chatApi } from "@/lib/chat-api"

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

      let currentConvId = activeConversationId

      if (!currentConvId) {
        const newConv: Conversation = {
          id: generateId(),
          title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
          messages: [userMessage],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setConversations((prev) => [newConv, ...prev])
        setActiveConversationId(newConv.id)
        currentConvId = newConv.id
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId ? { ...c, messages: [...c.messages, userMessage], updatedAt: new Date() } : c,
          ),
        )
      }

      setIsLoading(true)

      try {
        // Generate unique job ID
        const jobId = `job-${generateId()}`

        // Build full conversation history for context
        const currentConv = conversations.find((c) => c.id === currentConvId)
        const conversationHistory = currentConv
          ? currentConv.messages
              .filter((msg) => msg.role === "user")
              .map((msg) => msg.content)
              .join("\n\n=== NEXT USER MESSAGE ===\n\n")
          : ""

        // Always send full history + new message
        const fullPrompt = conversationHistory
          ? `${conversationHistory}\n\n=== NEXT USER MESSAGE ===\n\n${content}`
          : content

        // Submit job to backend with full conversation context
        const submitResponse = await chatApi.submitJob({
          jobId,
          agentType: "MODELER_AGENT",
          prompt: fullPrompt,
        })

        if (submitResponse.status !== "ok") {
          throw new Error(submitResponse.message || "Failed to submit job")
        }

        // Poll for job status every 1 second
        const result = await chatApi.pollJobStatus(jobId, (status) => {
          console.log(`Job ${jobId} status:`, status.status)
        })

        // Create AI message with the result
        const aiMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: result.answer || "Job completed but no answer received.",
          timestamp: new Date(),
          type: "model",
          actions: [
            { label: "Accept model and generate code", variant: "primary" },
          ],
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId ? { ...c, messages: [...c.messages, aiMessage], updatedAt: new Date() } : c,
          ),
        )
      } catch (error) {
        console.error("Error processing message:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to process message",
          variant: "destructive",
        })

        // Add error message to chat
        const errorMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: "Sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
          type: "text",
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId ? { ...c, messages: [...c.messages, errorMessage], updatedAt: new Date() } : c,
          ),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [activeConversationId, toast],
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
    <ProtectedRoute>
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
    </ProtectedRoute>
  )
}
