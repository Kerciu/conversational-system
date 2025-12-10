"use client"

import { cn } from "@/lib/utils"

interface OrbProps {
  className?: string
  color?: "primary" | "accent" | "cyan"
  size?: "sm" | "md" | "lg" | "xl"
  animate?: boolean
  blur?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "h-32 w-32",
  md: "h-64 w-64",
  lg: "h-96 w-96",
  xl: "h-[500px] w-[500px]",
}

const blurClasses = {
  sm: "blur-2xl",
  md: "blur-3xl",
  lg: "blur-[100px]",
  xl: "blur-[120px]",
}

const colorClasses = {
  primary: "bg-gradient-to-br from-violet-500/30 to-purple-600/20",
  accent: "bg-gradient-to-br from-blue-500/25 to-cyan-400/15",
  cyan: "bg-gradient-to-br from-cyan-400/20 to-teal-500/15",
}

export function Orb({ className, color = "primary", size = "md", animate = true, blur = "lg" }: OrbProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-full",
        sizeClasses[size],
        blurClasses[blur],
        colorClasses[color],
        animate && "animate-float",
        className,
      )}
      aria-hidden="true"
    />
  )
}

interface AmbientOrbsProps {
  variant?: "hero" | "subtle" | "minimal"
  className?: string
}

export function AmbientOrbs({ variant = "hero", className }: AmbientOrbsProps) {
  if (variant === "hero") {
    return (
      <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
        {/* Main large orb - top right */}
        <Orb color="primary" size="xl" className="-right-48 -top-48 animate-float-slow" />
        {/* Secondary orb - left side */}
        <Orb color="accent" size="lg" className="-left-32 top-1/3 animate-float-delayed" />
        {/* Cyan accent orb - bottom right */}
        <Orb color="cyan" size="md" className="bottom-24 right-1/4 animate-float" />
        {/* Small accent orb - top left */}
        <Orb color="accent" size="sm" blur="md" className="left-1/4 top-24 animate-float-slow" />
        {/* Small primary orb - bottom left */}
        <Orb color="primary" size="sm" blur="md" className="bottom-32 left-16 animate-float-delayed" />
      </div>
    )
  }

  if (variant === "subtle") {
    return (
      <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
        {/* Subtle top-right orb */}
        <Orb color="primary" size="lg" blur="xl" className="-right-32 -top-32 opacity-50 animate-float-slow" />
        {/* Subtle bottom-left orb */}
        <Orb color="accent" size="md" blur="xl" className="-bottom-16 -left-16 opacity-40 animate-float-delayed" />
      </div>
    )
  }

  // Minimal variant
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <Orb color="primary" size="md" blur="xl" className="-right-16 -top-16 opacity-30" />
    </div>
  )
}
