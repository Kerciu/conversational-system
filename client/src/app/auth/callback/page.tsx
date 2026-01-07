"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

function AuthCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { login } = useAuth()
    const { toast } = useToast()

    useEffect(() => {
        const token = searchParams.get("token")
        if (token) {
            try {
                login(token)
                toast({
                    title: "Success",
                    description: "Successfully logged in",
                })
                router.push("/chat")
            } catch (error) {
                console.error(error)
                toast({
                    title: "Login Failed",
                    description: "Failed to process login token",
                    variant: "destructive",
                })
                router.push("/auth/login")
            }
        } else {
            const error = searchParams.get("error")
            if (error) {
                toast({
                    title: "Login Failed",
                    description: "Authentication failed",
                    variant: "destructive",
                })
            }
            router.push("/auth/login")
        }
    }, [searchParams, login, router, toast])

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Completing login...</p>
            </div>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <AuthCallbackContent />
        </Suspense>
    )
}
