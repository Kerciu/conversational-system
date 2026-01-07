"use client"

import { useState, useCallback, useEffect, useRef } from "react"
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { toast } = useToast()

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const activePollCancelRef = useRef<null | (() => void)>(null)

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
      }
    }

    loadConversations()
  }, [toast])

  // Removed generic conversation-status polling. We'll poll by jobId when needed.

  // Load conversation history when selecting a conversation
  const loadConversationHistory = async (conversationId: string, agentType: AgentType) => {
    try {
      const history = await chatApi.getConversationHistory(conversationId, agentType)

      const messages: Message[] = history.messages.map((msg) => {
        let messageContent = msg.content
        let messageType: Message["type"] = msg.role === "user" ? "text" : agentType === "MODELER_AGENT" ? "model" : "code"
        let generatedFiles: { [filename: string]: string } | undefined = undefined

        // Try to parse as visualization report
        if (msg.role === "assistant" && agentType === "VISUALIZER_AGENT") {
          try {
            const parsed = JSON.parse(msg.content)
            if (parsed.type === "visualization_report") {
              messageContent = parsed.content || ""
              generatedFiles = parsed.generated_files || {}
              messageType = "visualization"
            }
          } catch {
            // JSON parse failed - content is plain text, use as-is (expected for non-visualization messages)
          }
        }

        return {
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: messageContent,
          timestamp: new Date(),
          type: messageType,
          agentType: agentType,
          canAccept: msg.role === "assistant",
          generatedFiles,
        }
      })

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
    // Cancel any ongoing polling when leaving current conversation
    if (activePollCancelRef.current) {
      activePollCancelRef.current()
      activePollCancelRef.current = null
    }
    setActiveConversationId(null)
    setIsCreatingNew(true)
  }, [])

  const handleSelectConversation = useCallback(async (id: string) => {
    // Cancel any ongoing polling when switching conversations
    if (activePollCancelRef.current) {
      activePollCancelRef.current()
      activePollCancelRef.current = null
    }
    setIsCreatingNew(false)
    setActiveConversationId(id)
    const conversation = conversations.find(c => c.id === id)

    // Check loading status from backend if conversation has backend ID
    let pendingJobId: string | undefined = undefined
    let refreshAfterIdle = false
    let hadErrorFlag = false
    if (conversation?.conversationId) {
      try {
        const prevIsLoading = !!conversation.isLoading
        const status = await chatApi.getConversationStatus(conversation.conversationId)
        if (status.isLoading) {
          pendingJobId = status.jobId
          setConversations(prev =>
            prev.map(c =>
              c.id === id ? { ...c, isLoading: true } : c
            )
          )
        } else {
          // Ensure not loading if backend says idle
          setConversations(prev => prev.map(c => c.id === id ? { ...c, isLoading: false } : c))
          // If we were previously loading but now idle, refresh to capture new messages
          if (prevIsLoading) {
            refreshAfterIdle = true
          }
          if (status.hadError) {
            hadErrorFlag = true
          }
        }
      } catch (error) {
        console.error("Failed to fetch conversation status:", error)
      }
    }

    // Load history if not already loaded
    let appendActiveIndex = conversation?.activeSubChatIndex ?? 0
    const needsInitialLoad = !!(conversation && conversation.subChats[0].messages.length === 0 && conversation.conversationId)
    if (needsInitialLoad && conversation && conversation.conversationId) {
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
      appendActiveIndex = activeIndex

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

    // If job completed while away, refresh history to capture new messages
    if (refreshAfterIdle && conversation?.conversationId && !needsInitialLoad) {
      const agentTypes: AgentType[] = ["MODELER_AGENT", "CODER_AGENT", "VISUALIZER_AGENT"]
      const loadedSubChats: SubChat[] = []
      for (const agentType of agentTypes) {
        const messages = await loadConversationHistory(conversation.conversationId, agentType)
        if (messages.length > 0) {
          loadedSubChats.push({ agentType, messages })
        }
      }
      if (loadedSubChats.length === 0) {
        loadedSubChats.push({ agentType: "MODELER_AGENT", messages: [] })
      }
      for (let i = 0; i < loadedSubChats.length - 1; i++) {
        const lastAssistantMessage = loadedSubChats[i].messages.filter(m => m.role === "assistant").pop()
        if (lastAssistantMessage) {
          loadedSubChats[i].acceptedMessage = lastAssistantMessage
        }
      }
      const activeIndex = Math.max(0, loadedSubChats.length - 1)
      appendActiveIndex = activeIndex
      setConversations(prev => prev.map(c => c.id === id ? { ...c, subChats: loadedSubChats, activeSubChatIndex: activeIndex } : c))
    }

    // If last job ended with error, show an error bubble with Retry on the active stage
    if (hadErrorFlag && conversation?.conversationId) {
      const agentTypes: AgentType[] = ["MODELER_AGENT", "CODER_AGENT", "VISUALIZER_AGENT"]
      // Ensure history is present to know active index
      if (needsInitialLoad) {
        // History already loaded above; appendActiveIndex reflects active
      }
      setConversations(prev => prev.map(c => {
        if (c.id !== id) return c
        const activeIdx = c.activeSubChatIndex ?? appendActiveIndex
        const agentType: AgentType = c.subChats[activeIdx]?.agentType || "MODELER_AGENT"
        const errorMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: "The last run failed. You can retry.",
          timestamp: new Date(),
          type: "text",
          agentType,
          actions: [{ label: "Retry", variant: "primary" }],
          retry: {
            mode: "auto",
            agentType,
            prompt: " ",
            conversationId: c.conversationId,
            acceptedModelMessageId: c.acceptedModelMessageId,
            acceptedCodeMessageId: c.acceptedCodeMessageId,
          }
        }
        // Avoid duplicating consecutive error-with-retry if already last
        const currentMessages = c.subChats[activeIdx]?.messages || []
        const lastMsg = currentMessages[currentMessages.length - 1]
        if (lastMsg && lastMsg.retry) {
          return c
        }
        return {
          ...c,
          subChats: c.subChats.map((subChat, idx) =>
            idx === activeIdx ? { ...subChat, messages: [...subChat.messages, errorMessage] } : subChat
          ),
          updatedAt: new Date(),
        }
      }))
    }

    // If there is a pending job for this conversation, poll by jobId and append result
    if (pendingJobId) {
      try {
        const { promise, cancel } = chatApi.pollJobStatusCancellable(pendingJobId, () => { })
        activePollCancelRef.current = cancel
        const result = await promise

        // Build and append AI message using current conversation state for accuracy
        setConversations(prev => prev.map(c => {
          if (c.id !== id) return c
          const activeIdx = c.activeSubChatIndex ?? appendActiveIndex
          const agentType: AgentType = c.subChats[activeIdx]?.agentType || "MODELER_AGENT"

          let messageContent = result.answer || "Job completed but no answer received."
          let generatedFiles: { [filename: string]: string } | undefined = undefined
          try {
            const parsed: unknown = JSON.parse(result.answer || "{}")
            if (typeof parsed === "object" && parsed !== null) {
              const o = parsed as Record<string, unknown>
              if (typeof o.type === "string" && o.type === "visualization_report") {
                messageContent = typeof o.content === "string" ? o.content : ""
                const files = o.generated_files
                if (files && typeof files === "object") {
                  generatedFiles = files as Record<string, string>
                } else {
                  generatedFiles = {}
                }
              }
            }
          } catch { }

          const aiMessage: Message = {
            id: result.messageId || generateId(),
            role: "assistant",
            content: messageContent,
            timestamp: new Date(),
            type: agentType === "MODELER_AGENT" ? "model" : agentType === "VISUALIZER_AGENT" ? "visualization" : "code",
            agentType,
            canAccept: true,
            generatedFiles,
          }

          return {
            ...c,
            isLoading: false,
            subChats: c.subChats.map((subChat, idx) =>
              idx === activeIdx ? { ...subChat, messages: [...subChat.messages, aiMessage] } : subChat
            ),
            updatedAt: new Date(),
          }
        }))

        if (activePollCancelRef.current === cancel) {
          activePollCancelRef.current = null
        }
      } catch (error) {
        console.error("Failed to poll pending job:", error)
        // Append an assistant error message with Retry, targeting the active subchat
        setConversations(prev => prev.map(c => {
          if (c.id !== id) return c
          const activeIdx = c.activeSubChatIndex ?? appendActiveIndex
          const agentType: AgentType = c.subChats[activeIdx]?.agentType || "MODELER_AGENT"
          const errorMessage: Message = {
            id: generateId(),
            role: "assistant",
            content: "Generation failed while loading this stage. You can retry.",
            timestamp: new Date(),
            type: "text",
            agentType,
            actions: [{ label: "Retry", variant: "primary" }],
            retry: {
              mode: "auto",
              agentType,
              prompt: " ",
              conversationId: c.id,
              acceptedModelMessageId: c.acceptedModelMessageId,
              acceptedCodeMessageId: c.acceptedCodeMessageId,
            }
          }
          return {
            ...c,
            isLoading: false,
            subChats: c.subChats.map((subChat, idx) =>
              idx === activeIdx ? { ...subChat, messages: [...subChat.messages, errorMessage] } : subChat
            ),
            updatedAt: new Date(),
          }
        }))
        activePollCancelRef.current = null
      }
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

  const handleSendMessage = useCallback(
    async (content: string, agentType: AgentType, files?: File[]) => {
      
      // Build message content including file names if files are attached
      let displayContent = content;
      if (files && files.length > 0) {
         const fileNames = files.map(f => f.name).join(", ");
         if (!displayContent.trim()) {
            displayContent = `[Sent files: ${fileNames}]`;
         } else {
            displayContent += `\n\n[Attached: ${fileNames}]`;
         }
      }

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: displayContent,
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

      // Set loading for this conversation
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId ? { ...c, isLoading: true } : c
        )
      )

      try {
        // Get current conversation for context
        const currentConv = conversations.find(c => c.id === currentConvId)

        // Wywołanie API z plikami
        const submitResponse = await chatApi.submitJob({
          agentType: agentType,
          prompt: content, // Do backendu wysyłamy czysty prompt, bez doklejonych nazw plików
          conversationId: backendConversationId,
          acceptedModelMessageId: currentConv?.acceptedModelMessageId,
          acceptedCodeMessageId: currentConv?.acceptedCodeMessageId,
          files: files,
        })

        if (submitResponse.status !== "ok" || !submitResponse.jobId) {
          throw new Error(submitResponse.message || "Failed to submit job")
        }

        const jobId = submitResponse.jobId

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
        const { promise, cancel } = chatApi.pollJobStatusCancellable(jobId, (status) => {
          console.log(`Job ${jobId} status:`, status.status)
        })
        // Track cancel handle for this active poll
        activePollCancelRef.current = cancel
        const result = await promise

        // Parse answer - if it's a visualization report, extract content and files
        let messageContent = result.answer || "Job completed but no answer received."
        let generatedFiles: { [filename: string]: string } | undefined = undefined

        try {
          const parsed = JSON.parse(result.answer || "{}")
          if (parsed.type === "visualization_report") {
            messageContent = parsed.content || ""
            generatedFiles = parsed.generated_files || {}
          }
        } catch { }

        // Create AI message with the result
        const aiMessage: Message = {
          id: result.messageId || generateId(),
          role: "assistant",
          content: messageContent,
          timestamp: new Date(),
          type: agentType === "MODELER_AGENT" ? "model" : agentType === "VISUALIZER_AGENT" ? "visualization" : "code",
          agentType,
          canAccept: true,
          generatedFiles,
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
          content: "Something went wrong while generating a response. You can retry.",
          timestamp: new Date(),
          type: "text",
          agentType,
          actions: [{ label: "Retry", variant: "primary" }],
          retry: {
            mode: "send",
            agentType,
            prompt: content,
          }
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
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId ? { ...c, isLoading: false } : c
          )
        )
        // Clear cancel ref on settle
        activePollCancelRef.current = null
      }
    },
    [activeConversationId, activeConversation, toast, conversations],
  )

  const handleAutoGenerate = useCallback(
    async (agentType: AgentType, conversationId: string, acceptedModelMessageId?: string, acceptedCodeMessageId?: string) => {
      // isLoading is already set to true in handleAcceptMessage

      try {
        const conversation = conversations.find(c => c.id === conversationId)
        const backendConversationId = conversation?.conversationId

        if (!backendConversationId) {
          throw new Error("Backend conversation ID not found")
        }

        // Submit job to backend
        const submitResponse = await chatApi.submitJob({
          agentType: agentType,
          prompt: " ",
          conversationId: backendConversationId,
          acceptedModelMessageId: acceptedModelMessageId,
          acceptedCodeMessageId: acceptedCodeMessageId,
        })

        if (submitResponse.status !== "ok" || !submitResponse.jobId) {
          throw new Error(submitResponse.message || "Failed to submit job")
        }

        const jobId = submitResponse.jobId

        // Poll for job status
        const { promise, cancel } = chatApi.pollJobStatusCancellable(jobId, (status) => {
          console.log(`Job ${jobId} status:`, status.status)
        })
        activePollCancelRef.current = cancel
        const result = await promise

        // Parse answer - if it's a visualization report, extract content and files
        let messageContent = result.answer || "Job completed but no answer received."
        let generatedFiles: { [filename: string]: string } | undefined = undefined

        try {
          const parsed = JSON.parse(result.answer || "{}")
          if (parsed.type === "visualization_report") {
            messageContent = parsed.content || ""
            generatedFiles = parsed.generated_files || {}
          }
        } catch {
          // Not JSON or parsing failed, use answer as-is
        }

        // Create AI message with the result - use messageId from backend
        const aiMessage: Message = {
          id: result.messageId || generateId(),
          role: "assistant",
          content: messageContent,
          timestamp: new Date(),
          type: agentType === "MODELER_AGENT" ? "model" : agentType === "VISUALIZER_AGENT" ? "visualization" : "code",
          agentType,
          canAccept: true,
          generatedFiles,
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
        // Show an assistant error message in the active subchat with Retry
        const errorMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: "Generation failed at this stage. You can retry.",
          timestamp: new Date(),
          type: "text",
          agentType,
          actions: [{ label: "Retry", variant: "primary" }],
          retry: {
            mode: "auto",
            agentType,
            prompt: " ",
            conversationId,
            acceptedModelMessageId,
            acceptedCodeMessageId,
          }
        }
        setConversations(prev => prev.map(c => c.id === conversationId ? {
          ...c,
          subChats: c.subChats.map((subChat, idx) => idx === c.activeSubChatIndex ? { ...subChat, messages: [...subChat.messages, errorMessage] } : subChat),
          updatedAt: new Date(),
        } : c))
      } finally {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, isLoading: false } : c
          )
        )
        activePollCancelRef.current = null
      }
    },
    [conversations, toast],
  )

  // Cleanup on unmount to stop any polling
  useEffect(() => {
    return () => {
      if (activePollCancelRef.current) {
        activePollCancelRef.current()
        activePollCancelRef.current = null
      }
    }
  }, [])

  const handleAcceptMessage = useCallback(
    (agentType: AgentType, message: Message) => {
      if (!activeConversationId) return

      const nextAgentType: AgentType | null =
        agentType === "MODELER_AGENT" ? "CODER_AGENT" : agentType === "CODER_AGENT" ? "VISUALIZER_AGENT" : null

      // Set loading immediately if we're moving to next agent
      if (nextAgentType && activeConversationId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId ? { ...c, isLoading: true } : c
          )
        )
      }

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

          // Save accepted messageId
          const updates: Partial<Conversation> = {}
          if (agentType === "MODELER_AGENT") {
            updates.acceptedModelMessageId = message.id
          } else if (agentType === "CODER_AGENT") {
            updates.acceptedCodeMessageId = message.id
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
              nextAgentType === "CODER_AGENT" ? message.id : updatedConv.acceptedModelMessageId,
              nextAgentType === "VISUALIZER_AGENT" ? message.id : updatedConv.acceptedCodeMessageId
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
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
            isLoading={activeConversation?.isLoading || false}
            onMessageAction={(message, action) => {
              if (action !== "Retry") return

              const retry = message.retry
              const currentConvId = activeConversationId
              if (!retry || !currentConvId) return

              // Cancel any ongoing polling before retrying
              if (activePollCancelRef.current) {
                activePollCancelRef.current()
                activePollCancelRef.current = null
              }

              // Set loading for this conversation
              setConversations(prev => prev.map(c => c.id === currentConvId ? { ...c, isLoading: true } : c))

              const conversation = conversations.find(c => c.id === currentConvId)
              const backendConversationId = conversation?.conversationId

              const submit = async () => {
                const submitResponse = await chatApi.submitJob({
                  agentType: retry.agentType,
                  prompt: retry.prompt,
                  conversationId: backendConversationId,
                  acceptedModelMessageId: conversation?.acceptedModelMessageId,
                  acceptedCodeMessageId: conversation?.acceptedCodeMessageId,
                })
                if (submitResponse.status !== "ok" || !submitResponse.jobId) {
                  throw new Error(submitResponse.message || "Failed to submit job")
                }
                // Persist conversationId if returned and missing
                if (submitResponse.conversationId && !backendConversationId) {
                  setConversations(prev => prev.map(c => c.id === currentConvId ? { ...c, conversationId: submitResponse.conversationId } : c))
                }
                return submitResponse.jobId
              }

              (async () => {
                try {
                  const jobId = await submit()
                  const { promise, cancel } = chatApi.pollJobStatusCancellable(jobId, () => { })
                  activePollCancelRef.current = cancel
                  const result = await promise

                  let messageContent = result.answer || "Job completed but no answer received."
                  let generatedFiles: { [filename: string]: string } | undefined = undefined
                  try {
                    const parsed: unknown = JSON.parse(result.answer || "{}")
                    if (typeof parsed === "object" && parsed !== null) {
                      const o = parsed as Record<string, unknown>
                      if (typeof o.type === "string" && o.type === "visualization_report") {
                        messageContent = typeof o.content === "string" ? o.content : ""
                        const files = o.generated_files
                        if (files && typeof files === "object") {
                          generatedFiles = files as Record<string, string>
                        } else {
                          generatedFiles = {}
                        }
                      }
                    }
                  } catch { }

                  const aiMessage: Message = {
                    id: result.messageId || generateId(),
                    role: "assistant",
                    content: messageContent,
                    timestamp: new Date(),
                    type: retry.agentType === "MODELER_AGENT" ? "model" : retry.agentType === "VISUALIZER_AGENT" ? "visualization" : "code",
                    agentType: retry.agentType,
                    canAccept: true,
                    generatedFiles,
                  }

                  setConversations(prev => prev.map(c => c.id === currentConvId ? {
                    ...c,
                    isLoading: false,
                    subChats: c.subChats.map((subChat, idx) => {
                      if (idx !== (c.activeSubChatIndex ?? 0)) return subChat
                      // Remove error message with retry, then append result
                      const filteredMessages = subChat.messages.filter(m => !m.retry)
                      return { ...subChat, messages: [...filteredMessages, aiMessage] }
                    }),
                    updatedAt: new Date(),
                  } : c))

                } catch (err) {
                  console.error("Retry failed:", err)
                  // Leave an additional error toast; message stays with Retry button
                } finally {
                  setConversations(prev => prev.map(c => c.id === currentConvId ? { ...c, isLoading: false } : c))
                  activePollCancelRef.current = null
                }
              })()
            }}
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