import type { UserProfile} from "@/types/settings"

const PROFILE_KEY = "decisio_profile"

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

const defaultProfile: UserProfile = {
  username: "demo_user",
  email: "demo@decisio.ai",
  avatarUrl: null,
  emailVerified: true,
  createdAt: new Date().toISOString(),
}

// THIS IS FROM VERCEL. COULD BE IMPLEMENTED LATER ON.

// const PREFERENCES_KEY = "decisio_preferences"
// export function getPreferences(): UserPreferences {
//   if (typeof window === "undefined") return defaultPreferences
//   const stored = localStorage.getItem(PREFERENCES_KEY)
//   if (stored) {
//     try {
//       return { ...defaultPreferences, ...JSON.parse(stored) }
//     } catch {
//       return defaultPreferences
//     }
//   }
//   return defaultPreferences
// }
// export function savePreferences(preferences: UserPreferences): void {
//   if (typeof window === "undefined") return
//   localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
// }
// Default values
// const defaultPreferences: UserPreferences = {
//   theme: "dark",
//   accentColor: "cyan",
//   language: "en",
//   notifications: {
//     emailAnalyses: true,
//     browserNotifications: false,
//     sessionReminders: true,
//   },
//   defaults: {
//     preferredModel: "gemini-pro",
//     autoSaveConversations: true,
//     codeExecutionTimeout: 60,
//   },
// }

