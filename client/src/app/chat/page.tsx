"use client"

import { useState, useCallback, useEffect } from "react"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { MultiStageChat } from "@/components/chat/multi-stage-chat"
import { generateId } from "@/lib/chat-utils"
import type { Conversation, Message, SubChat, AgentType } from "@/types/chat"
import { useToast } from "@/components/ui/use-toast"
import { AmbientOrbs } from "@/components/ui/ambient-orbs"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { chatApi } from "@/lib/chat-api"

function ChatPageContent() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const { toast } = useToast()

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  // Initialize new conversation with MODELER subchat
  const createNewConversation = (initialMessage?: Message): Conversation => {
    return {
      id: generateId(),
      title: initialMessage?.content.slice(0, 50) + (initialMessage && initialMessage.content.length > 50 ? "..." : "") || "New conversation",
      messages: [], // Deprecated
      createdAt: new Date(),
      updatedAt: new Date(),
      subChats: [
        {
          agentType: "MODELER_AGENT",
          messages: initialMessage ? [initialMessage] : [],
        },
      ],
      activeSubChatIndex: 0,
    }
  }

  // Load conversations from backend on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const backendConversations = await chatApi.getConversations()
        const mappedConversations: Conversation[] = backendConversations.map(conv => ({
          ...createNewConversation(),
          id: conv.id,
          title: conv.title,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          conversationId: conv.id,
        }))
        setConversations(mappedConversations)
        
        // If no active conversation is selected, show new conversation screen
        if (!activeConversationId) {
          setIsCreatingNew(true)
        }
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
  const loadConversationHistory = async (conversationId: string, agentType: AgentType) => {
    try {
      const history = await chatApi.getConversationHistory(conversationId, agentType)
      
      const messages: Message[] = history.messages.map((msg, index) => ({
        id: `${conversationId}-msg-${index}`,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(),
        type: msg.role === "user" 
          ? "text" 
          : agentType === "MODELER_AGENT" ? "model" : "code",
        agentType: agentType,
        canAccept: msg.role === "assistant",
      }))

      return messages
    } catch (error) {
      console.error("Failed to load conversation history:", error)
      toast({
        title: "Error",
        description: "Failed to load conversation history",
        variant: "destructive",
      })
      return []
    }
  }

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null)
    setIsCreatingNew(true)
  }, [])

  const handleSelectConversation = useCallback(async (id: string) => {
    setIsCreatingNew(false)
    setActiveConversationId(id)
    const conversation = conversations.find(c => c.id === id)
    
    // Load history if not already loaded
    if (conversation && conversation.subChats[0].messages.length === 0 && conversation.conversationId) {
      const agentTypes: AgentType[] = ["MODELER_AGENT", "CODER_AGENT", "VISUALIZER_AGENT"]
      const loadedSubChats: SubChat[] = []
      
      for (const agentType of agentTypes) {
        const messages = await loadConversationHistory(conversation.conversationId, agentType)
        if (messages.length > 0) {
          loadedSubChats.push({
            agentType,
            messages,
          })
        }
      }
      
      // If there are no subchats, add an empty MODELER
      if (loadedSubChats.length === 0) {
        loadedSubChats.push({
          agentType: "MODELER_AGENT",
          messages: [],
        })
      }
      
      // Mark last assistant message in each subchat (except last) as accepted
      for (let i = 0; i < loadedSubChats.length - 1; i++) {
        const lastAssistantMessage = loadedSubChats[i].messages.filter(m => m.role === "assistant").pop()
        if (lastAssistantMessage) {
          loadedSubChats[i].acceptedMessage = lastAssistantMessage
        }
      }
      
      // Determine active subchat (last with messages or first)
      const activeIndex = Math.max(0, loadedSubChats.length - 1)
      
      setConversations(prev =>
        prev.map(c =>
          c.id === id
            ? {
                ...c,
                subChats: loadedSubChats,
                activeSubChatIndex: activeIndex,
              }
            : c
        )
      )
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
    async (content: string, agentType: AgentType) => {
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
        type: "text",
        agentType,
      }

      let currentConvId = activeConversationId
      let backendConversationId: string | undefined = activeConversation?.conversationId

      // If no active conversation, create a new one
      if (!currentConvId) {
        const newConv = createNewConversation(userMessage)
        setConversations((prev) => [newConv, ...prev])
        setActiveConversationId(newConv.id)
        setIsCreatingNew(false)
        currentConvId = newConv.id
      } else {
        // Add user message to active subchat
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId
              ? {
                  ...c,
                  subChats: c.subChats.map((subChat, idx) =>
                    idx === c.activeSubChatIndex
                      ? { ...subChat, messages: [...subChat.messages, userMessage] }
                      : subChat
                  ),
                  updatedAt: new Date(),
                }
              : c
          )
        )
      }

      setIsLoading(true)

      try {
        const jobId = `job-${generateId()}`

        // Get current conversation for context
        const currentConv = conversations.find(c => c.id === currentConvId)

        // Submit job to backend
        const submitResponse = await chatApi.submitJob({
          jobId,
          agentType: agentType,
          prompt: content,
          conversationId: backendConversationId,
          acceptedModel: currentConv?.acceptedModel,
          acceptedCode: currentConv?.acceptedCode,
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
          type: agentType === "MODELER_AGENT" ? "model" : "code",
          agentType,
          canAccept: true,
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId
              ? {
                  ...c,
                  subChats: c.subChats.map((subChat, idx) =>
                    idx === c.activeSubChatIndex
                      ? { ...subChat, messages: [...subChat.messages, aiMessage] }
                      : subChat
                  ),
                  updatedAt: new Date(),
                }
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
          role: "assistant",
          content: "Sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
          type: "text",
          agentType,
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId
              ? {
                  ...c,
                  subChats: c.subChats.map((subChat, idx) =>
                    idx === c.activeSubChatIndex
                      ? { ...subChat, messages: [...subChat.messages, errorMessage] }
                      : subChat
                  ),
                  updatedAt: new Date(),
                }
              : c
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [activeConversationId, activeConversation, toast, conversations],
  )

  const handleAutoGenerate = useCallback(
    async (agentType: AgentType, conversationId: string, acceptedModel?: string, acceptedCode?: string) => {
      setIsLoading(true)

      try {
        const jobId = `job-${generateId()}`
        const conversation = conversations.find(c => c.id === conversationId)
        const backendConversationId = conversation?.conversationId

        if (!backendConversationId) {
          throw new Error("Backend conversation ID not found")
        }

        // Submit job to backend bez wiadomości użytkownika
        const submitResponse = await chatApi.submitJob({
          jobId,
          agentType: agentType,
          prompt: " ",
          conversationId: backendConversationId,
          acceptedModel: acceptedModel,
          acceptedCode: acceptedCode,
        })

        if (submitResponse.status !== "ok") {
          throw new Error(submitResponse.message || "Failed to submit job")
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
          type: agentType === "MODELER_AGENT" ? "model" : "code",
          agentType,
          canAccept: true,
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  subChats: c.subChats.map((subChat, idx) =>
                    idx === c.activeSubChatIndex
                      ? { ...subChat, messages: [aiMessage] }
                      : subChat
                  ),
                  updatedAt: new Date(),
                }
              : c
          )
        )
      } catch (error) {
        console.error("Error processing auto-generate:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to generate",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [conversations, toast],
  )

  const handleAcceptMessage = useCallback(
    (agentType: AgentType, message: Message) => {
      if (!activeConversationId) return

      const nextAgentType: AgentType | null =
        agentType === "MODELER_AGENT" ? "CODER_AGENT" : agentType === "CODER_AGENT" ? "VISUALIZER_AGENT" : null

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversationId) return c

          const currentSubChatIndex = c.activeSubChatIndex

          // Mark message as accepted in current subchat
          const updatedSubChats = c.subChats.map((subChat, idx) =>
            idx === currentSubChatIndex
              ? { ...subChat, acceptedMessage: message }
              : subChat
          )

          // Save accepted data
          let updates: Partial<Conversation> = {}
          if (agentType === "MODELER_AGENT") {
            updates.acceptedModel = message.content
          } else if (agentType === "CODER_AGENT") {
            updates.acceptedCode = message.content
          }

          // Add next subchat if needed
          if (nextAgentType && !updatedSubChats.find(sc => sc.agentType === nextAgentType)) {
            updatedSubChats.push({
              agentType: nextAgentType,
              messages: [],
            })
          }

          return {
            ...c,
            ...updates,
            subChats: updatedSubChats,
            activeSubChatIndex: nextAgentType ? currentSubChatIndex + 1 : currentSubChatIndex,
          }
        })
      )

      toast({
        title: `${agentType} accepted`,
        description: nextAgentType ? `Moving to ${nextAgentType}` : "Process complete",
      })

      // Automatically generate response for the next agent
      if (nextAgentType && activeConversationId) {
        const updatedConv = conversations.find(c => c.id === activeConversationId)
        if (updatedConv) {
          setTimeout(() => {
            handleAutoGenerate(
              nextAgentType,
              activeConversationId,
              nextAgentType === "CODER_AGENT" ? message.content : updatedConv.acceptedModel,
              nextAgentType === "VISUALIZER_AGENT" ? message.content : updatedConv.acceptedCode
            )
          }, 500)
        }
      }
    },
    [activeConversationId, toast, handleAutoGenerate, conversations],
  )

  const handleNavigateToSubChat = useCallback(
    (index: number) => {
      if (!activeConversationId) return

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, activeSubChatIndex: index }
            : c
        )
      )
    },
    [activeConversationId],
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AmbientOrbs />
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isCollapsed={isSidebarCollapsed}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isLoading={isLoadingConversations}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {(activeConversation || isCreatingNew) && (
          <MultiStageChat
            subChats={activeConversation?.subChats || [{ agentType: "MODELER_AGENT", messages: [] }]}
            activeSubChatIndex={activeConversation?.activeSubChatIndex || 0}
            conversationId={activeConversation?.conversationId}
            onSendMessage={handleSendMessage}
            onAcceptMessage={handleAcceptMessage}
            onNavigateToSubChat={handleNavigateToSubChat}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatPageContent />
    </ProtectedRoute>
  )
}
