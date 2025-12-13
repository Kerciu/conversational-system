const API_BASE = "http://localhost:8080/api/dashboard"
import type { Message } from "@/types/chat"

interface ConversationPreview {
    id: string
    title: string
    updatedAt: Date
}

interface CreateConversationResponse {
    conversationId: number
}

interface ConversationHistoryItem {
    id?: number
    role: string
    content: string
    timestamp: string
}

interface RenameConversationRequest {
    conversationId: string
    title: string
}

const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("token")
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

export const conversationApi = {
    create: async (): Promise<string> => {
        const response = await fetch(`${API_BASE}/new-conversation`, {
            method: "POST",
            headers: getAuthHeaders(),
        })

        if (!response.ok) throw new Error(`Failed to create conversation: ${response.status}`)

        const conversationId: number = await response.json()
        return conversationId.toString()
    },



    getHistory: async (conversationId: string): Promise<Message[]> => {
        const response = await fetch(`${API_BASE}/get-conversation-history/${conversationId}`, {
            method: "GET",
            headers: getAuthHeaders(),
        })

        if (!response.ok) throw new Error(`Failed to load history: ${response.status}`)

        const historyData: ConversationHistoryItem[] = await response.json()

        return historyData.map((msg) => {
            // Konwersja stringa na union type z walidacją
            const normalizedRole = msg.role.toLowerCase() //TODO: Change to sender vals
            const role: "user" | "assistant" =
                normalizedRole === "user" || normalizedRole === "assistant"
                    ? normalizedRole
                    : "assistant"

            return {
                id: msg.id?.toString() || `msg-${Date.now()}-${Math.random()}`,
                role,
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                type: "text" as const,
            }
        })
    },



    rename: async (conversationId: string, newTitle: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/rename-conversation`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                conversationId,
                title: newTitle
            } as RenameConversationRequest),
        })

        if (!response.ok) throw new Error(`Failed to rename conversation: ${response.status}`)
    },



    delete: async (conversationId: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/delete-conversation/${conversationId}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        })

        if (!response.ok) throw new Error(`Failed to delete conversation: ${response.status}`)
    },



    fetchPreviews: async (): Promise<ConversationPreview[]> => {
        const response = await fetch(`${API_BASE}/get-conversation-list`, {
            method: "GET",
            headers: getAuthHeaders(),
        })

        if (!response.ok) throw new Error(`Failed to fetch conversations: ${response.status}`)

        return response.json()
    },
}
