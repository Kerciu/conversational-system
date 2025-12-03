"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading?: boolean
  placeholder?: string
  maxLength?: number
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = "Describe your decision problem...",
  maxLength = 1000,
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [message])

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim())
      setMessage("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const charCount = message.length
  const isOverLimit = charCount > maxLength

  return (
    <TooltipProvider>
      <div className="relative">
        <div
          className={cn(
            "absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-accent/15 to-cyan-500/10 blur-xl transition-opacity duration-300",
            isFocused ? "opacity-100" : "opacity-50",
          )}
        />

        <div
          className={cn(
            "absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/5 blur-2xl transition-opacity duration-500",
            isFocused ? "opacity-100" : "opacity-0",
          )}
        />

        <div
          className={cn(
            "relative rounded-2xl border bg-card/80 backdrop-blur-sm transition-all duration-300",
            isFocused ? "border-primary/40 shadow-lg" : "border-border/50",
          )}
        >
          <div className="flex items-end gap-2 p-3">
            {/* Attach button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach files (coming soon)</TooltipContent>
            </Tooltip>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
              style={{ maxHeight: "200px" }}
              disabled={isLoading}
            />

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isLoading || isOverLimit}
              size="icon"
              className={cn(
                "h-9 w-9 shrink-0 rounded-xl transition-all duration-300 border-0",
                message.trim() && !isOverLimit
                  ? "bg-gradient-to-r from-primary to-accent hover:opacity-90 glow-primary btn-glow"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {/* Character counter */}
          <div className="flex items-center justify-between border-t border-border/30 px-4 py-1.5">
            <span className="text-xs text-muted-foreground/70">Press Enter to send, Shift + Enter for new line</span>
            <span
              className={cn("text-xs transition-colors", isOverLimit ? "text-destructive" : "text-muted-foreground/70")}
            >
              {charCount}/{maxLength}
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
