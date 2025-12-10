export interface UserProfile {
  username: string
  email: string
  avatarUrl: string | null
  emailVerified: boolean
  createdAt: string
}

// THIS IS FROM VERCEL. COULD BE IMPLEMENTED LATER ON.

// export interface UserPreferences {
//   theme: "dark" | "light" | "system"
//   accentColor: "violet" | "blue" | "cyan" | "teal"
//   language: "en" | "pl" | "de" | "es"
//   notifications: {
//     emailAnalyses: boolean
//     browserNotifications: boolean
//     sessionReminders: boolean
//   }
//   defaults: {
//     preferredModel: string
//     autoSaveConversations: boolean
//     codeExecutionTimeout: number
//   }
// }
