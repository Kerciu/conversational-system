"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, User, Mail, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/auth-api"
import { PasswordStrengthIndicator, isPasswordStrong } from "./password-strength-indicator"

export function RegisterForm() {
  const router = useRouter()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    if (!validateEmail(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    if (!isPasswordStrong(formData.password)) {
      toast({
        title: "Weak Password",
        description: "Please create a stronger password",
        variant: "destructive",
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await authApi.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      })
      toast({
        title: "Registration Successful",
        description: "Please check your email for a verification code",
      })
      router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`)

    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Username field */}
      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm text-foreground">
          Username
        </Label>
        <div className="relative input-glow rounded-lg">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="username"
            type="text"
            placeholder="Choose a username"
            value={formData.username}
            onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
            className="pl-10 bg-input border-border focus:border-primary transition-colors"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm text-foreground">
          Email
        </Label>
        <div className="relative input-glow rounded-lg">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            className="pl-10 bg-input border-border focus:border-primary transition-colors"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm text-foreground">
          Password
        </Label>
        <div className="relative input-glow rounded-lg">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            className="pl-10 pr-10 bg-input border-border focus:border-primary transition-colors"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <PasswordStrengthIndicator password={formData.password} />
      </div>

      {/* Confirm Password field */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm text-foreground">
          Confirm Password
        </Label>
        <div className="relative input-glow rounded-lg">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            className="pl-10 pr-10 bg-input border-border focus:border-primary transition-colors"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
          <p className="text-xs text-destructive">Passwords do not match</p>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full glow-primary bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create account"
        )}
      </Button>

      {/* Login link */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </form>
  )
}
