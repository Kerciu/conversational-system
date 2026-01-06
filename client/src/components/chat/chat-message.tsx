"use client"

import { User, Bot, Copy, Check } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Message } from "@/types/chat"
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import 'katex/dist/katex.min.css'
import { BlockMath, InlineMath } from 'react-katex'
import { preprocessLaTeX } from "@/lib/latex-utils"

interface ChatMessageProps {
  message: Message
  onAction?: (action: string) => void
}

export function ChatMessage({ message, onAction }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)

  // Memoize blob URLs and split content for visualization
  const { blobUrls, contentParts } = useMemo(() => {
    if (message.type !== "visualization" || !message.generatedFiles) {
      return { blobUrls: {}, contentParts: [{ type: 'text' as const, content: message.content }] }
    }

    const urls: { [filename: string]: string } = {}

    // Convert each base64 image to a blob URL
    Object.entries(message.generatedFiles).forEach(([filename, base64Data]) => {
      try {
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'image/png' })
        urls[filename] = URL.createObjectURL(blob)
      } catch (e) {
        console.error(`Failed to create blob for ${filename}:`, e)
      }
    })

    // Split content into text and image parts
    const parts: Array<{ type: 'text' | 'image', content: string, filename?: string }> = []
    let lastIndex = 0
    const regex = /\[FILE:\s*([^\]]+)\]/g
    let match

    while ((match = regex.exec(message.content)) !== null) {
      // Add text before this match
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: message.content.substring(lastIndex, match.index) })
      }

      // Add image
      const filename = match[1].trim()
      if (urls[filename]) {
        parts.push({ type: 'image', content: urls[filename], filename })
      } else {
        parts.push({ type: 'text', content: match[0] })
      }

      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < message.content.length) {
      parts.push({ type: 'text', content: message.content.substring(lastIndex) })
    }

    return { blobUrls: urls, contentParts: parts }
  }, [message.content, message.generatedFiles, message.type])

  // Cleanup blob URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      Object.values(blobUrls).forEach(url => URL.revokeObjectURL(url))
    }
  }, [blobUrls])
  const isUser = message.role === "user"

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
          ) : message.type === "visualization" ? (
            <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-background/50 [&_pre]:p-3 [&_pre]:rounded-lg [&_code]:text-sm">
              {contentParts.map((part, index) => {
                if (part.type === 'image') {
                  return (
                    // Blobs are dynamic and wont work good with Image component
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={index}
                      src={part.content}
                      alt={part.filename || 'Generated visualization'}
                      className="max-w-full h-auto rounded-lg shadow-lg my-4 mx-auto"
                    />
                  )
                }

                return (
                  <ReactMarkdown
                    key={index}
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({ children }) => <p className="leading-relaxed mb-4 last:mb-0">{children}</p>,
                      h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3 text-primary">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2 text-primary/90">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="pl-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                      // @ts-expect-error: react-katex does not have type definitions
                      math: ({ value }) => <div className="overflow-x-auto my-4 flex justify-center"><BlockMath math={value} /></div>,
                      // @ts-expect-error: react-katex does not have type definitions
                      inlineMath: ({ value }) => <InlineMath math={value} />,
                    }}
                  >
                    {part.content}
                  </ReactMarkdown>
                )
              })}
            </div>
          ) : message.type === "model" ? (
            <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-background/50 [&_pre]:p-3 [&_pre]:rounded-lg [&_code]:text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => <p className="leading-relaxed mb-4 last:mb-0">{children}</p>,
                  h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3 text-primary">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2 text-primary/90">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                  // Override math components to use react-katex for better error handling/display
                  // @ts-expect-error: react-katex does not have type definitions
                  math: ({ value }) => <div className="overflow-x-auto my-4 flex justify-center"><BlockMath math={value} /></div>,
                  // @ts-expect-error: react-katex does not have type definitions
                  inlineMath: ({ value }) => <InlineMath math={value} />,
                  code: ({ className, children, ...props }) => {
                    // Fallback for code blocks that might be misinterpreted or handled standardly
                    return <code className={className} {...props}>{children}</code>
                  }
                }}
              >
                {preprocessLaTeX(message.content)}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{message.content}</p>
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