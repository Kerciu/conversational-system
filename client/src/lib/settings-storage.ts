import type { UserProfile, UserPreferences, ApiKey, ActiveSession, StorageUsage } from "@/types/settings"

const PREFERENCES_KEY = "decisio_preferences"
const PROFILE_KEY = "decisio_profile"
const API_KEYS_KEY = "decisio_api_keys"

// Default values
const defaultPreferences: UserPreferences = {
  theme: "dark",
  accentColor: "violet",
  language: "en",
  notifications: {
    emailAnalyses: true,
    browserNotifications: false,
    sessionReminders: true,
  },
  defaults: {
    preferredModel: "gemini-pro",
    autoSaveConversations: true,
    codeExecutionTimeout: 60,
  },
}

const defaultProfile: UserProfile = {
  id: "user_1",
  username: "demo_user",
  email: "demo@decisio.ai",
  displayName: "Demo User",
  bio: "",
  avatarUrl: null,
  emailVerified: true,
  createdAt: new Date().toISOString(),
}

// Mock API keys
const mockApiKeys: ApiKey[] = [
  {
    id: "key_1",
    name: "Production API Key",
    maskedKey: "sk-...abc123",
    lastUsed: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
]

// Mock sessions
const mockSessions: ActiveSession[] = [
  {
    id: "session_1",
    device: "MacBook Pro",
    browser: "Chrome 120",
    location: "Warsaw, Poland",
    lastActive: new Date().toISOString(),
    current: true,
  },
  {
    id: "session_2",
    device: "iPhone 15",
    browser: "Safari Mobile",
    location: "Warsaw, Poland",
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    current: false,
  },
]

// Storage functions
export function getPreferences(): UserPreferences {
  if (typeof window === "undefined") return defaultPreferences
  const stored = localStorage.getItem(PREFERENCES_KEY)
  if (stored) {
    try {
      return { ...defaultPreferences, ...JSON.parse(stored) }
    } catch {
      return defaultPreferences
    }
  }
  return defaultPreferences
}

export function savePreferences(preferences: UserPreferences): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
}

export function getProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile
  const stored = localStorage.getItem(PROFILE_KEY)
  if (stored) {
    try {
      return { ...defaultProfile, ...JSON.parse(stored) }
    } catch {
      return defaultProfile
    }
  }
  return defaultProfile
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function getApiKeys(): ApiKey[] {
  if (typeof window === "undefined") return mockApiKeys
  const stored = localStorage.getItem(API_KEYS_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return mockApiKeys
    }
  }
  return mockApiKeys
}

export function saveApiKeys(keys: ApiKey[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(API_KEYS_KEY, JSON.stringify(keys))
}

export function getSessions(): ActiveSession[] {
  return mockSessions
}

export function getStorageUsage(): StorageUsage {
  return {
    used: 245,
    total: 1000,
    conversationsCount: 47,
  }
}
