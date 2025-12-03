export interface UserProfile {
  username: string
  email: string
  avatarUrl: string | null
  emailVerified: boolean
  createdAt: string
}

export interface UserPreferences {
  theme: "dark" | "light" | "system"
  accentColor: "violet" | "blue" | "cyan" | "teal"
  language: "en" | "pl" | "de" | "es"
  notifications: {
    emailAnalyses: boolean
    browserNotifications: boolean
    sessionReminders: boolean
  }
  defaults: {
    preferredModel: string
    autoSaveConversations: boolean
    codeExecutionTimeout: number
  }
}

export interface ApiKey {
  id: string
  name: string
  maskedKey: string
  lastUsed: string | null
  createdAt: string
}

export interface ActiveSession {
  id: string
  device: string
  browser: string
  location: string
  lastActive: string
  current: boolean
}

export interface StorageUsage {
  used: number
  total: number
  conversationsCount: number
}
