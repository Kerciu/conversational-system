"use client"

import type React from "react"

import { Sparkles } from "lucide-react"
import Link from "next/link"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-radial flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="relative">
            <div className="absolute inset-0 blur-lg bg-primary/30 rounded-full" />
            <Sparkles className="h-8 w-8 text-primary relative" />
          </div>
          <span className="text-xl font-semibold text-foreground">Decisio.ai</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Card with subtle glow */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-xl opacity-50" />
            <div className="relative bg-card border border-border rounded-xl p-8">
              {/* Title section */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-foreground mb-2">{title}</h1>
                {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
              </div>

              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Decisio.ai. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
