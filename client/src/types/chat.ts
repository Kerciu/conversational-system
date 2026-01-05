export type AgentType = "MODELER_AGENT" | "CODER_AGENT" | "VISUALIZER_AGENT"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  type?: "text" | "code" | "model" | "action"
  codeLanguage?: string
  actions?: { label: string; variant: "primary" | "secondary" }[]
  agentType?: AgentType
  canAccept?: boolean
}

export interface SubChat {
  agentType: AgentType
  messages: Message[]
  acceptedMessage?: Message
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  conversationId?: string

  subChats: SubChat[]
  activeSubChatIndex: number

  acceptedModelMessageId?: string
  acceptedCodeMessageId?: string
  codeExecutionResult?: string
}

export type ConversationGroup = "today" | "yesterday" | "last7days" | "last30days" | "older"
