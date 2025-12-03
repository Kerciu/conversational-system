"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login")
      } else {
        router.push("/chat")
      }
    }
  }, [isAuthenticated, isLoading, router])

  return (
    <div className="min-h-screen bg-gradient-radial flex items-center justify-center">
      <div className="animate-pulse flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary animate-spin" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    </div>
  )
}
