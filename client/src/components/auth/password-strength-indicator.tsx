"use client"

import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains number", met: /\d/.test(password) },
    { label: "Contains special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ]

  const strength = requirements.filter((r) => r.met).length
  const strengthPercentage = (strength / requirements.length) * 100

  const getStrengthColor = () => {
    if (strength <= 2) return "bg-destructive"
    if (strength <= 3) return "bg-yellow-500"
    return "bg-success"
  }

  const getStrengthLabel = () => {
    if (strength <= 2) return "Weak"
    if (strength <= 3) return "Medium"
    if (strength <= 4) return "Strong"
    return "Very Strong"
  }

  if (!password) return null

  return (
    <div className="space-y-3 mt-3">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span
            className={cn(
              "font-medium",
              strength <= 2 && "text-destructive",
              strength === 3 && "text-yellow-500",
              strength >= 4 && "text-success",
            )}
          >
            {getStrengthLabel()}
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", getStrengthColor())}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Requirements list */}
      <ul className="space-y-1.5">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={req.met ? "text-muted-foreground" : "text-muted-foreground/60"}>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function isPasswordStrong(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  )
}
