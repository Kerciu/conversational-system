import type { Conversation, ConversationGroup } from "@/types/chat"

export function groupConversations(conversations: Conversation[]): Record<ConversationGroup, Conversation[]> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const groups: Record<ConversationGroup, Conversation[]> = {
    today: [],
    yesterday: [],
    last7days: [],
    last30days: [],
    older: [],
  }

  conversations.forEach((conv) => {
    const convDate = new Date(conv.updatedAt)
    if (convDate >= today) {
      groups.today.push(conv)
    } else if (convDate >= yesterday) {
      groups.yesterday.push(conv)
    } else if (convDate >= sevenDaysAgo) {
      groups.last7days.push(conv)
    } else if (convDate >= thirtyDaysAgo) {
      groups.last30days.push(conv)
    } else {
      groups.older.push(conv)
    }
  })

  // Sort each group by updatedAt descending
  Object.keys(groups).forEach((key) => {
    groups[key as ConversationGroup].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  })

  return groups
}

export const groupLabels: Record<ConversationGroup, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7days: "Last 7 days",
  last30days: "Last 30 days",
  older: "Older",
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}
