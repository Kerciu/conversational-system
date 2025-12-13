export interface Message {
  id: string
  role: "user" | "assistant" //TODO: CHANGE TO SENDER VALS
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

export interface ConversationPreview {
  // Used for previewing conversations in the sidebar
  id: string;
  title: string;
  updatedAt: Date;
}

export interface ConversationDisplayResponse {
  id: number;
  title: string;
  updatedAt: string;
}

export type ConversationGroup = "today" | "yesterday" | "last7days" | "last30days" | "older"
