const API_BASE = "http://localhost:8080/api/test"
const CONVERSATIONS_API = "http://localhost:8080/api/conversations"

interface JobSubmitRequest {
  jobId: string
  agentType: string
  prompt: string
  conversationId?: string
  acceptedModel?: string
  acceptedCode?: string
}

interface JobSubmitResponse {
  status: string
  jobId?: string
  conversationId?: string
  message?: string
}

interface JobStatusResponse {
  status: "pending" | "completed" | "error" | "not_found"
  answer?: string
  message?: string
}

interface ConversationRecord {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface ConversationHistory {
  conversationId: string
  agentType: string
  messages: Array<{ role: string; content: string }>
}

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const chatApi = {
  submitJob: async (request: JobSubmitRequest): Promise<JobSubmitResponse> => {
    const response = await fetch(`${API_BASE}/submit-job`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to submit job: ${response.statusText}`)
    }
    
    return response.json()
  },

  getJobStatus: async (jobId: string): Promise<JobStatusResponse> => {
    const response = await fetch(`${API_BASE}/get-job?jobId=${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })
    
    if (!response.ok && response.status !== 202) {
      throw new Error(`Failed to get job status: ${response.statusText}`)
    }
    
    return response.json()
  },

  pollJobStatus: async (
    jobId: string, 
    onUpdate: (status: JobStatusResponse) => void,
    intervalMs: number = 1000
  ): Promise<JobStatusResponse> => {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const status = await chatApi.getJobStatus(jobId)
          onUpdate(status)
          
          if (status.status === "completed") {
            clearInterval(pollInterval)
            resolve(status)
          } else if (status.status === "error") {
            clearInterval(pollInterval)
            reject(new Error(status.message || "Job failed"))
          }
        } catch (error) {
          clearInterval(pollInterval)
          reject(error)
        }
      }, intervalMs)
    })
  },

  // Conversation management
  getConversations: async (): Promise<ConversationRecord[]> => {
    const response = await fetch(CONVERSATIONS_API, {
      method: "GET",
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.statusText}`)
    }
    
    return response.json()
  },

  getConversationHistory: async (conversationId: string, agentType: string): Promise<ConversationHistory> => {
    const response = await fetch(`${CONVERSATIONS_API}/${conversationId}/history/${agentType}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch conversation history: ${response.statusText}`)
    }
    
    return response.json()
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    const response = await fetch(`${CONVERSATIONS_API}/${conversationId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to delete conversation: ${response.statusText}`)
    }
  },
}
