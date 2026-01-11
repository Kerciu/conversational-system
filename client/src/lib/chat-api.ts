const API_BASE = "http://localhost:8080/api/test"
const CONVERSATIONS_API = "http://localhost:8080/api/conversations"

interface JobSubmitRequest {
  agentType: string
  prompt: string
  conversationId?: string
  acceptedModelMessageId?: string
  acceptedCodeMessageId?: string
  files?: File[]
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
  messageId?: string
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
  messages: Array<{ id: string; role: string; content: string }>
}

const getAuthHeaders = (isMultipart: boolean = false): HeadersInit => {
  const token = localStorage.getItem("token")
  const headers: HeadersInit = {}

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  if (!isMultipart) {
    headers["Content-Type"] = "application/json"
  }

  return headers
}

export const chatApi = {
  submitJob: async (request: JobSubmitRequest): Promise<JobSubmitResponse> => {
    const formData = new FormData()

    formData.append("agentType", request.agentType)
    formData.append("prompt", request.prompt)

    if (request.conversationId) formData.append("conversationId", request.conversationId)
    if (request.acceptedModelMessageId) formData.append("acceptedModelMessageId", request.acceptedModelMessageId)
    if (request.acceptedCodeMessageId) formData.append("acceptedCodeMessageId", request.acceptedCodeMessageId)

    if (request.files && request.files.length > 0) {
      request.files.forEach((file) => {
        formData.append("files", file)
      })
    }

    const response = await fetch(`${API_BASE}/submit-job`, {
      method: "POST",
      headers: getAuthHeaders(true),
      body: formData,
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

  pollJobStatusCancellable: (
    jobId: string,
    onUpdate: (status: JobStatusResponse) => void,
    intervalMs: number = 1000
  ): { promise: Promise<JobStatusResponse>; cancel: () => void } => {
    let interval: ReturnType<typeof setInterval> | null = null
    let settled = false

    const cancel = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    const promise = new Promise<JobStatusResponse>((resolve, reject) => {
      interval = setInterval(async () => {
        try {
          const status = await chatApi.getJobStatus(jobId)
          onUpdate(status)

          if (status.status === "completed") {
            if (interval) clearInterval(interval)
            interval = null
            if (!settled) {
              settled = true
              resolve(status)
            }
          } else if (status.status === "error") {
            if (interval) clearInterval(interval)
            interval = null
            if (!settled) {
              settled = true
              reject(new Error(status.message || "Job failed"))
            }
          }
        } catch (error) {
          if (interval) clearInterval(interval)
          interval = null
          if (!settled) {
            settled = true
            reject(error as Error)
          }
        }
      }, intervalMs)
    })

    return { promise, cancel }
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

  getConversationStatus: async (conversationId: string): Promise<{ conversationId: string; isLoading: boolean; hadError: boolean; jobId?: string }> => {
    const response = await fetch(`${CONVERSATIONS_API}/${conversationId}/status`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch conversation status: ${response.statusText}`)
    }

    return response.json()
  },
}
