const API_BASE = "http://localhost:8080/api/jobs"
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
  status: "pending" | "completed" | "error" | "not_found" | "queued" | "TASK_COMPLETED" | "TASK_FAILED"
  answer?: string
  message?: string
  messageId?: string
  error?: string
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

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const chatApi = {
  submitJob: async (request: JobSubmitRequest): Promise<JobSubmitResponse> => {
    const token = localStorage.getItem("token")

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

    const headers: HeadersInit = {}
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: headers,
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`Failed to submit job: ${response.status} ${errorText}`)
    }

    return response.json()
  },

  getJobStatus: async (jobId: string): Promise<JobStatusResponse | null> => {
    const response = await fetch(`${API_BASE}/get?jobId=${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    if (response.status === 404) {
      return null;
    }

    if (!response.ok && response.status !== 202) {
      throw new Error(`Failed to get job status: ${response.statusText}`)
    }

    return response.json()
  },

  pollJobStatusCancellable: (
    jobId: string,
    onUpdate: (status: JobStatusResponse) => void,
    intervalMs: number = 2000
  ): { promise: Promise<JobStatusResponse>; cancel: () => void } => {
    let isCancelled = false

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const MAX_ATTEMPTS = 30
    let attempts = 0

    const cancel = () => {
      isCancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const promise = new Promise<JobStatusResponse>((resolve, reject) => {
      const checkStatus = async () => {
        if (isCancelled) return

        attempts++

        try {
          const status = await chatApi.getJobStatus(jobId)

          if (isCancelled) return

          if (!status) {
            if (attempts >= MAX_ATTEMPTS) {
              reject(new Error("Job not found (timeout)."))
              return
            }
            timeoutId = setTimeout(checkStatus, intervalMs)
            return
          }

          onUpdate(status)

          const currentStatus = status.status;

          if (currentStatus === "TASK_COMPLETED" || currentStatus === "completed") {
            resolve(status)
            return
          }

          if (currentStatus === "TASK_FAILED" || currentStatus === "error") {
            const errorMsg = status.error || status.message || status.answer || "Job failed";
            reject(new Error(errorMsg))
            return
          }

          if (attempts >= MAX_ATTEMPTS) {
            reject(new Error("Timeout: Job took too long to complete (> 1 min)."))
            return
          }

          timeoutId = setTimeout(checkStatus, intervalMs)

        } catch (error) {
          console.warn(`Polling attempt ${attempts} failed:`, error)

          if (attempts >= MAX_ATTEMPTS) {
            reject(error as Error)
          } else if (!isCancelled) {
            timeoutId = setTimeout(checkStatus, intervalMs)
          }
        }
      }

      checkStatus()
    })

    return { promise, cancel }
  },

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