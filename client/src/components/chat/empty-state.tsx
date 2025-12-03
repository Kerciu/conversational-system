"use client"

import { Sparkles, ArrowRight } from "lucide-react"
import { examplePrompts } from "@/lib/mock-conversations"

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void
}

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <div className="relative mx-auto mb-8 inline-flex">
          {/* Outer glow ring */}
          <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-primary/20 via-accent/15 to-cyan-500/10 blur-2xl animate-pulse-glow" />
          {/* Inner glow */}
          <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg">
            <Sparkles className="h-8 w-8" />
          </div>
        </div>

        {/* Welcome text */}
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-foreground">
          What decision problem would you like to solve?
        </h1>
        <p className="mb-10 text-muted-foreground">
          Describe your optimization challenge in natural language, and I'll help you build a mathematical model and
          generate the code to solve it.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {examplePrompts.map((item, i) => (
            <button
              key={i}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 text-left transition-all duration-300 hover:border-primary/40 hover:shadow-lg gradient-border"
            >
              {/* Hover gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/3 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Glow on hover */}
              <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-primary/20 to-accent/10 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
