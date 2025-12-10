export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  type?: "text" | "code" | "model" | "action"
  codeLanguage?: string
  actions?: { label: string; variant: "primary" | "secondary" }[]
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export type ConversationGroup = "today" | "yesterday" | "last7days" | "last30days" | "older"
