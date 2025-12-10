"use client"

import { Bot } from "lucide-react"

export function LoadingMessage() {
  return (
    <div className="flex gap-4 py-6">
      <div className="relative">
        <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 blur-md animate-pulse-glow" />
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
      </div>

      <div className="flex max-w-[80%] items-center gap-1.5 rounded-2xl bg-secondary/60 backdrop-blur-sm px-4 py-3 border border-border/30">
        <span className="h-2 w-2 rounded-full bg-gradient-to-br from-primary to-accent animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-gradient-to-br from-accent to-cyan-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-gradient-to-br from-cyan-400 to-primary animate-bounce" />
      </div>
    </div>
  )
}
