"use client"

import { useEffect, useState, useCallback } from "react"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatArea } from "@/components/chat/chat-area"
import { generateId } from "@/lib/chat-utils"
import type { Conversation, Message } from "@/types/chat"
import { useToast } from "@/components/ui/use-toast"
import { AmbientOrbs } from "@/components/ui/ambient-orbs"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { chatApi } from "@/lib/chat-api"
import { conversationApi } from "@/lib/conversation-api"

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { toast } = useToast()

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const messages = activeConversation?.messages || []

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const previews = await conversationApi.fetchPreviews()

        const fullConversations: Conversation[] = previews.map((preview) => ({
          ...preview,
          messages: [],
          createdAt: preview.updatedAt,
        }))

        setConversations(fullConversations)
      } catch (error) {
        console.error("Failed to load conversations:", error)
        toast({
          title: "Error",
          description: "Could not load conversation history.",
          variant: "destructive",
        })
      }
    }

    loadConversations()
  }, [toast])

  const handleNewConversation = useCallback(async () => {
    try {
      const newIdString = await conversationApi.create()

      const newConv: Conversation = {
        id: newIdString,
        title: "New Conversation",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      setConversations((prev) => [newConv, ...prev])
      setActiveConversationId(newIdString)
      toast({
        title: "New chat created",
        description: "You can now start messaging.",
      })
    } catch (error) {
      console.error("Error creating conversation:", error)
      toast({
        title: "Error",
        description: "Failed to create new conversation.",
        variant: "destructive",
      })
    }
  }, [toast])

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id)

      const existingConv = conversations.find((c) => c.id === id)
      if (existingConv && existingConv.messages.length > 0) {
        return
      }

      try {
        const messages = await conversationApi.getHistory(id)

        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, messages } : c)))
      } catch (error) {
        console.error("Error loading conversation history:", error)
        toast({
          title: "Error loading chat",
          description: "Could not restore previous messages.",
          variant: "destructive",
        })
      }
    },
    [conversations, toast]
  )

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await conversationApi.delete(id)

        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (activeConversationId === id) {
          setActiveConversationId(null)
        }
        toast({
          title: "Conversation deleted",
          description: "The conversation has been removed.",
        })
      } catch (error) {
        console.error("Error deleting conversation:", error)
        toast({
          title: "Error",
          description: "Failed to delete conversation.",
          variant: "destructive",
        })
      }
    },
    [activeConversationId, toast]
  )

  const handleRenameConversation = useCallback(
    async (id: string, newTitle: string) => {
      try {
        await conversationApi.rename(id, newTitle)

        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
        )
        toast({
          title: "Conversation renamed",
          description: `Renamed to "${newTitle}"`,
        })
      } catch (error) {
        console.error("Error renaming conversation:", error)
        toast({
          title: "Error",
          description: "Failed to rename conversation.",
          variant: "destructive",
        })
      }
    },
    [toast]
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
        try {
          currentConvId = await conversationApi.create()

          const newConv: Conversation = {
            id: currentConvId,
            title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
            messages: [userMessage],
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          setConversations((prev) => [newConv, ...prev])
          setActiveConversationId(currentConvId)
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to create conversation.",
            variant: "destructive",
          })
          return
        }
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId
              ? { ...c, messages: [...c.messages, userMessage], updatedAt: new Date() }
              : c
          )
        )
      }

      setIsLoading(true)
      try {
        const jobId = `job-${generateId()}`

        const currentConv = conversations.find((c) => c.id === currentConvId)
        const conversationHistory = currentConv
          ? currentConv.messages
            .filter((msg) => msg.role === "user")
            .map((msg) => msg.content)
            .join("\n\n=== NEXT USER MESSAGE ===\n\n")
          : ""

        const fullPrompt = conversationHistory
          ? `${conversationHistory}\n\n=== NEXT USER MESSAGE ===\n\n${content}`
          : content

        const submitResponse = await chatApi.submitJob({
          jobId,
          agentType: "MODELER_AGENT",
          prompt: fullPrompt,
          userMessage: content,
          conversationId: parseInt(currentConvId),
        })

        if (submitResponse.status !== "ok") {
          throw new Error(submitResponse.message || "Failed to submit job")
        }

        const result = await chatApi.pollJobStatus(jobId, (status) => {
          console.log(`Job ${jobId} status:`, status.status)
        })

        const aiMessage: Message = {
          id: generateId(),
          role: "agent",
          content: result.answer || "Job completed but no answer received.",
          timestamp: new Date(),
          type: "model",
          actions: [{ label: "Accept model and generate code", variant: "primary" }],
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId
              ? { ...c, messages: [...c.messages, aiMessage], updatedAt: new Date() }
              : c
          )
        )
      } catch (error) {
        console.error("Error processing message:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to process message",
          variant: "destructive",
        })

        const errorMessage: Message = {
          id: generateId(),
          role: "agent",
          content: "Sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
          type: "text",
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId
              ? { ...c, messages: [...c.messages, errorMessage], updatedAt: new Date() }
              : c
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [activeConversationId, toast, conversations]
  )

  const handleAction = useCallback(
    (action: string) => {
      toast({
        title: `Action: ${action}`,
        description: "This feature will be implemented in the next phase.",
      })
    },
    [toast]
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
