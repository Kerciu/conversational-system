"use client"

import { User, Bot, Copy, Check } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Message } from "@/types/chat"
import { BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'

interface ChatMessageProps {
  message: Message
  onAction?: (action: string) => void
}

// Funkcja do czyszczenia LaTeX z markdown code blocks
function cleanLatexContent(content: string): string {
  return content
    .replace(/```latex\n?/g, '')
    .replace(/```\n?$/g, '')
    .trim()
}

// Funkcja sprawdzająca czy content zawiera LaTeX
function hasLatexContent(content: string): boolean {
  return content.includes('```latex') || 
         content.includes('\\begin{') || 
         content.includes('\\end{') ||
         content.includes('\\text{') ||
         content.includes('\\item')
}

// Komponent do renderowania LaTeX
function LatexRenderer({ content }: { content: string }) {
  const cleaned = cleanLatexContent(content)
  
  // Podziel na bloki: każde \begin{...}\end{...} to osobny blok
  const blocks: string[] = []
  const regex = /\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g
  let lastIndex = 0
  let match
  
  while ((match = regex.exec(cleaned)) !== null) {
    // Dodaj blok matematyczny
    blocks.push(match[0])
    lastIndex = match.index + match[0].length
  }
  
  // Pozostały tekst po ostatnim bloku (jeśli zawiera &, \\, \text - to też LaTeX)
  if (lastIndex < cleaned.length) {
    const remaining = cleaned.slice(lastIndex).trim()
    if (remaining) {
      // Sprawdź czy to LaTeX alignment (zawiera & i \\)
      if (remaining.includes('&') && remaining.includes('\\\\')) {
        // Owiń w align*
        blocks.push(`\\begin{align*}\n${remaining}\n\\end{align*}`)
      } else if (remaining.includes('\\text') || remaining.includes('\\')) {
        // Inne komendy LaTeX - renderuj każdą linię osobno
        const lines = remaining.split('\\\\').filter(l => l.trim())
        lines.forEach(line => {
          if (line.trim()) {
            blocks.push(line.trim())
          }
        })
      }
    }
  }
  
  // Jeśli nie znaleziono bloków, spróbuj renderować całość
  if (blocks.length === 0) {
    blocks.push(cleaned)
  }
  
  return (
    <div className="my-4 space-y-4">
      {blocks.map((block, idx) => (
        <div key={idx} className="overflow-x-auto">
          <BlockMath 
            math={block}
            errorColor="#ef4444"
            renderError={(error) => {
              console.error('KaTeX error:', error)
              return (
                <pre className="overflow-x-auto rounded-lg bg-background/50 p-2 text-xs text-muted-foreground">
                  <code>{block}</code>
                </pre>
              )
            }}
          />
        </div>
      ))}
    </div>
  )
}

export function ChatMessage({ message, onAction }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === "user"

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Sprawdź czy to LaTeX
  const containsLatex = hasLatexContent(message.content)

  return (
    <div className={cn("group flex gap-4 py-6", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={cn("relative max-w-[80%] space-y-3", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser ? "bg-primary text-primary-foreground" : "bg-secondary/80 text-foreground",
          )}
        >
          {message.type === "code" ? (
            <div className="space-y-2">
              <pre className="overflow-x-auto rounded-lg bg-background/50 p-3 text-sm">
                <code>{message.content}</code>
              </pre>
            </div>
          ) : message.type === "model" && containsLatex ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <LatexRenderer content={message.content} />
            </div>
          ) : message.type === "model" ? (
            <div className="space-y-3">
              <div className="prose prose-invert prose-sm max-w-none">
                {message.content.split("\n").map((line, i) => {
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return (
                      <p key={i} className="font-semibold text-foreground">
                        {line.replace(/\*\*/g, "")}
                      </p>
                    )
                  }
                  if (line.startsWith("- ")) {
                    return (
                      <p key={i} className="ml-4 text-muted-foreground">
                        • {line.substring(2)}
                      </p>
                    )
                  }
                  return line ? (
                    <p key={i} className="text-muted-foreground">
                      {line}
                    </p>
                  ) : (
                    <br key={i} />
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          )}
        </div>

        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.actions.map((action, i) => (
              <Button
                key={i}
                size="sm"
                variant={action.variant === "primary" ? "default" : "secondary"}
                onClick={() => onAction?.(action.label)}
                className={cn(
                  action.variant === "primary" && "bg-gradient-to-r from-primary to-accent hover:opacity-90",
                )}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        <button
          onClick={handleCopy}
          className={cn(
            "absolute -right-10 top-2 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100",
            isUser && "-left-10 -right-auto",
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}