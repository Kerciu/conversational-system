const API_BASE = "http://localhost:8080/api/auth"

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface LoginData {
  username: string
  password: string
}

export interface ResetPasswordData {
  resetCode: string
  newPassword: string
}

async function handleResponse(response: Response): Promise<string> {
  const text = await response.text()
  if (!response.ok) {
    throw new Error(text || "Something went wrong")
  }
  return text
}

export const authApi = {
  register: async (data: RegisterData): Promise<string> => {
    const response = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return handleResponse(response)
  },

  login: async (data: LoginData): Promise<string> => {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return handleResponse(response)
  },

  verifyAccount: async (verificationCode: string): Promise<string> => {
    const response = await fetch(`${API_BASE}/verify-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationCode }),
    })
    return handleResponse(response)
  },

  resendVerification: async (email: string): Promise<string> => {
    const response = await fetch(`${API_BASE}/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email),
    })
    return handleResponse(response)
  },

  requestPasswordReset: async (email: string): Promise<string> => {
    const response = await fetch(`${API_BASE}/reset-password-request?email=${encodeURIComponent(email)}`, {
      method: "POST",
    })
    return handleResponse(response)
  },

  resendPasswordReset: async (email: string): Promise<string> => {
    const response = await fetch(`${API_BASE}/resend-password-reset?email=${encodeURIComponent(email)}`, {
      method: "POST",
    })
    return handleResponse(response)
  },

  resetPassword: async (data: ResetPasswordData): Promise<string> => {
    const response = await fetch(`${API_BASE}/reset-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return handleResponse(response)
  },

  getGoogleAuthUrl: (): string => {
    return `${API_BASE.replace("/api/auth", "")}/oauth2/authorization/google`
  },

  getGithubAuthUrl: (): string => {
    return `${API_BASE.replace("/api/auth", "")}/oauth2/authorization/github`
  },
}
