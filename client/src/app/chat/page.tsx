"use client"

import { useState, useCallback, useEffect } from "react"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatArea } from "@/components/chat/chat-area"
import { generateId } from "@/lib/chat-utils"
import type { Conversation, Message } from "@/types/chat"
import { useToast } from "@/components/ui/use-toast"
import { AmbientOrbs } from "@/components/ui/ambient-orbs"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { chatApi } from "@/lib/chat-api"

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const { toast } = useToast()

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const messages = activeConversation?.messages || []

  // Load conversations from backend on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const backendConversations = await chatApi.getConversations()
        const mappedConversations: Conversation[] = backendConversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          messages: [],
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          conversationId: conv.id, // Backend ID
        }))
        setConversations(mappedConversations)
      } catch (error) {
        console.error("Failed to load conversations:", error)
        toast({
          title: "Error",
          description: "Failed to load conversations",
          variant: "destructive",
        })
      } finally {
        setIsLoadingConversations(false)
      }
    }

    loadConversations()
  }, [toast])

  // Load conversation history when selecting a conversation
  const loadConversationHistory = async (conversationId: string) => {
    try {
      const history = await chatApi.getConversationHistory(conversationId, "MODELER_AGENT")
      
      const messages: Message[] = history.messages.map((msg, index) => ({
        id: `${conversationId}-msg-${index}`,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(),
        type: msg.role === "user" ? "text" : "model",
        ...(msg.role === "assistant" && {
          actions: [{ label: "Accept model and generate code", variant: "primary" as const }],
        }),
      }))

      setConversations(prev =>
        prev.map(c =>
          c.conversationId === conversationId
            ? { ...c, messages }
            : c
        )
      )
    } catch (error) {
      console.error("Failed to load conversation history:", error)
      toast({
        title: "Error",
        description: "Failed to load conversation history",
        variant: "destructive",
      })
    }
  }

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null)
  }, [])

  const handleSelectConversation = useCallback(async (id: string) => {
    setActiveConversationId(id)
    const conversation = conversations.find(c => c.id === id)
    
    // Load history if not already loaded
    if (conversation && conversation.messages.length === 0 && conversation.conversationId) {
      await loadConversationHistory(conversation.conversationId)
    }
  }, [conversations])

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      const conversation = conversations.find(c => c.id === id)
      
      if (conversation?.conversationId) {
        try {
          await chatApi.deleteConversation(conversation.conversationId)
        } catch (error) {
          console.error("Failed to delete conversation from backend:", error)
        }
      }

      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeConversationId === id) {
        setActiveConversationId(null)
      }
      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed.",
      })
    },
    [activeConversationId, toast, conversations],
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
      let backendConversationId: string | undefined = activeConversation?.conversationId

      // If no active conversation, create a new one (will be created on backend)
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
        // Add user message to existing conversation
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

        // Submit job to backend with conversationId if available
        const submitResponse = await chatApi.submitJob({
          jobId,
          agentType: "MODELER_AGENT",
          prompt: content,
          conversationId: backendConversationId,
        })

        if (submitResponse.status !== "ok") {
          throw new Error(submitResponse.message || "Failed to submit job")
        }

        // Save backend conversationId if this is a new conversation
        if (submitResponse.conversationId && !backendConversationId) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === currentConvId ? { ...c, conversationId: submitResponse.conversationId } : c
            )
          )
          backendConversationId = submitResponse.conversationId
        }

        // Poll for job status
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
    [activeConversationId, activeConversation, toast],
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

  if (isLoadingConversations) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading conversations...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

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
