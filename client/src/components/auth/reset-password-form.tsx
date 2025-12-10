"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Lock, ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/auth-api"
import { PasswordStrengthIndicator, isPasswordStrong } from "./password-strength-indicator"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast({
        title: "Invalid Link",
        description: "This password reset link is invalid. Please request a new one.",
        variant: "destructive",
      })
      return
    }

    if (!isPasswordStrong(formData.newPassword)) {
      toast({
        title: "Weak Password",
        description: "Please create a stronger password",
        variant: "destructive",
      })
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await authApi.resetPassword({
        resetCode: token,
        newPassword: formData.newPassword,
      })
      setIsSuccess(true)
      toast({
        title: "Password Reset",
        description: "Your password has been reset successfully",
      })
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 blur-lg bg-success/30 rounded-full" />
            <CheckCircle2 className="h-16 w-16 text-success relative" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium text-foreground">Password Reset Successful</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Your password has been updated. You can now sign in with your new password.
          </p>
        </div>
        <Button
          onClick={() => router.push("/auth/login")}
          className="w-full glow-primary bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Sign in
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!token && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <div className="text-sm">
            <p className="text-foreground font-medium">Invalid Reset Link</p>
            <p className="text-muted-foreground mt-1">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password field */}
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-sm text-foreground">
            New Password
          </Label>
          <div className="relative input-glow rounded-lg">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={formData.newPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
              className="pl-10 pr-10 bg-input border-border focus:border-primary transition-colors"
              disabled={isLoading || !token}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrengthIndicator password={formData.newPassword} />
        </div>

        {/* Confirm Password field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm text-foreground">
            Confirm New Password
          </Label>
          <div className="relative input-glow rounded-lg">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="pl-10 pr-10 bg-input border-border focus:border-primary transition-colors"
              disabled={isLoading || !token}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full glow-primary bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
          disabled={isLoading || !token}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting password...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>

      {/* Back to login */}
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">
          <ArrowLeft className="inline h-3 w-3 mr-1" />
          Back to login
        </Link>
      </p>
    </div>
  )
}
