"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/auth-api"

export function ForgotPasswordForm() {
  const { toast } = useToast()

  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    if (!validateEmail(email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await authApi.requestPasswordReset(email)
      setEmailSent(true)
      toast({
        title: "Email Sent",
        description: "Check your inbox for password reset instructions",
      })
    } catch (error) {
      toast({
        title: "Request Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-6">
        {/* Success message */}
        <div className="flex items-start gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
          <Mail className="h-5 w-5 text-success mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="text-foreground font-medium">Check your inbox</p>
            <p className="text-muted-foreground mt-1">
              We&apos;ve sent a password reset link to{" "}
              <span className="text-foreground font-medium">{email}</span>
            </p>
            <p className="text-muted-foreground mt-2">
              Click the link in the email to reset your password.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="inline h-3 w-3 mr-1" />
            Back to login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm text-foreground">
          Email Address
        </Label>
        <div className="relative input-glow rounded-lg">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 bg-input border-border focus:border-primary transition-colors"
            disabled={isLoading}
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
            Sending...
          </>
        ) : (
          "Send Reset Link"
        )}
      </Button>

      {/* Back to login */}
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">
          <ArrowLeft className="inline h-3 w-3 mr-1" />
          Back to login
        </Link>
      </p>
    </form>
  )
}
