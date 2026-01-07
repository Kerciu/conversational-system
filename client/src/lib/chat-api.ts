const API_BASE = "http://localhost:8080/api/test"

interface JobSubmitRequest {
  jobId: string
  agentType: string
  prompt: string
  userMessage?: string
  conversationId: number
}

interface JobSubmitResponse {
  status: string
  jobId?: string
  message?: string
}

interface JobStatusResponse {
  status: "pending" | "completed" | "error" | "not_found"
  answer?: string
  message?: string
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
    // todo: include conversation id
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
  }
}

