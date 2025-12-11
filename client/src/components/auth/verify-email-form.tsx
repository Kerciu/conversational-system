"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, Mail, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/auth-api"

export function VerifyEmailForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get("email") || ""
    const { toast } = useToast()

    const [verificationCode, setVerificationCode] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isResending, setIsResending] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!verificationCode.trim()) {
            toast({
                title: "Validation Error",
                description: "Please enter the verification code",
                variant: "destructive",
            })
            return
        }

        setIsLoading(true)
        try {
            await authApi.verifyAccount(verificationCode)
            toast({
                title: "Email Verified",
                description: "Your account has been verified successfully",
            })
            router.push("/auth/login")
        } catch (error) {
            toast({
                title: "Verification Failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleResend = async () => {
        if (!email) {
            toast({
                title: "Email Required",
                description: "Please provide your email address to resend the code",
                variant: "destructive",
            })
            return
        }

        setIsResending(true)
        try {
            await authApi.resendVerification(email)
            toast({
                title: "Code Sent",
                description: "A new verification code has been sent to your email",
            })
        } catch (error) {
            toast({
                title: "Resend Failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
            })
        } finally {
            setIsResending(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Info message */}
            <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-lg border border-border">
                <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                    <p className="text-foreground font-medium">Check your inbox</p>
                    <p className="text-muted-foreground mt-1">
                        We&apos;ve sent a 6-digit verification code to{" "}
                        {email ? <span className="text-foreground font-medium">{email}</span> : "your email address"}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Verification code field */}
                <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm text-foreground">
                        Verification Code
                    </Label>
                    <div className="relative input-glow rounded-lg">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="code"
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className="pl-10 bg-input border-border focus:border-primary transition-colors tracking-widest text-center font-mono text-lg"
                            disabled={isLoading}
                            maxLength={6}
                        />
                    </div>
                </div>

                {/* Submit button */}
                <Button
                    type="submit"
                    className="w-full glow-primary bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        "Verify Email"
                    )}
                </Button>
            </form>

            {/* Resend link */}
            <div className="text-center">
                <p className="text-sm text-muted-foreground">
                    Didn&apos;t receive the code?{" "}
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending}
                        className="text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
                    >
                        {isResending ? "Sending..." : "Resend code"}
                    </button>
                </p>
            </div>

            {/* Back to login */}
            <p className="text-center text-sm text-muted-foreground">
                <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">
                    &larr; Back to login
                </Link>
            </p>
        </div>
    )
}
