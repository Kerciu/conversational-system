"use client"

import { User, Bot, Copy, Check, Download, Loader2 } from "lucide-react"
import { useState, useMemo, useEffect, useRef } from "react"
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
import { useToast } from "@/components/ui/use-toast"

import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import htmlToPdfmake from "html-to-pdfmake"

if (pdfFonts && pdfFonts.pdfMake) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs
} else if (pdfFonts) {
  pdfMake.vfs = pdfFonts.vfs
}

interface ChatMessageProps {
  message: Message
  onAction?: (action: string) => void
}

export function ChatMessage({ message, onAction }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const { toast } = useToast()

  const contentRef = useRef<HTMLDivElement>(null)

  const isUser = message.role === "user"

  // Memoize blob URLs and split content for visualization
  const { blobUrls, contentParts } = useMemo(() => {
    if (message.type !== "visualization" || !message.generatedFiles) {
      return { blobUrls: {}, contentParts: [{ type: 'text' as const, content: message.content }] }
    }

    const urls: { [filename: string]: string } = {}

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
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    })
  }

  const resizeImagesInPdf = (node: any) => {
    if (Array.isArray(node)) {
      node.forEach(subNode => resizeImagesInPdf(subNode))
    } else if (typeof node === 'object' && node !== null) {
      if (node.image) {
        node.width = 470;
        delete node.height;
      }
      Object.keys(node).forEach(key => {
        if (typeof node[key] === 'object') {
          resizeImagesInPdf(node[key])
        }
      })
    }
  }

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return

    setIsGeneratingPdf(true)

    try {
      const clone = contentRef.current.cloneNode(true) as HTMLElement
      let htmlContent = clone.innerHTML

      if (message.generatedFiles) {
        Object.entries(blobUrls).forEach(([filename, blobUrl]) => {
          const base64 = message.generatedFiles![filename]
          if (base64) {
            htmlContent = htmlContent.split(blobUrl).join(`data:image/png;base64,${base64}`)
          }
        })
      }

      const ret = htmlToPdfmake(htmlContent, {
        defaultStyles: {
          p: { margin: [0, 5, 0, 10], fontSize: 11, color: '#000000' },
          h1: { fontSize: 16, bold: true, margin: [0, 10, 0, 5], color: '#2563eb' },
          h2: { fontSize: 14, bold: true, margin: [0, 10, 0, 5], color: '#000000' },
          ul: { margin: [0, 5, 0, 10], color: '#000000' },
          li: { margin: [0, 2, 0, 2], color: '#000000' },

          pre: {
            background: '#f3f4f6',
            color: '#1f2937',
            margin: [0, 10, 0, 10],
            preserveLeadingSpaces: true
          },
          code: {
            fontSize: 9,
            background: '#f3f4f6',
            color: '#1f2937'
          }
        },
      })

      resizeImagesInPdf(ret);

      const docDefinition = {
        content: [
          { text: `${message.agentType === "MODELER_AGENT" ? "Modeler" : message.agentType === "CODER_AGENT" ? "Coder" : "Visualizer"} Report`, style: "header" },
          { text: new Date().toLocaleString(), style: "subheader" },
          { text: "\n", style: "spacing" },
          ret
        ],
        styles: {
          header: { fontSize: 18, bold: true, color: '#000000' },
          subheader: { fontSize: 10, color: "gray", margin: [0, 0, 0, 10] },
          spacing: { margin: [0, 5, 0, 5] }
        },
        defaultStyle: {
          font: 'Roboto'
        },
        info: {
          title: `Report - ${message.agentType}`,
          author: 'Conversational System',
        }
      }

      const filename = `${message.agentType || "export"}-${message.id.slice(0, 8)}.pdf`
      pdfMake.createPdf(docDefinition).download(filename)

      toast({ title: "Success", description: "PDF Report downloaded successfully." })

    } catch (error) {
      console.error("PDF generation failed:", error)
      toast({ title: "Error", description: "Failed to generate PDF. Check console for details.", variant: "destructive" })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div className={cn("group flex gap-4 py-6 relative", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={cn("relative max-w-[80%] space-y-3", isUser ? "items-end" : "items-start")}>
        <div
          ref={contentRef}
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser ? "bg-primary text-primary-foreground" : "bg-secondary/80 text-foreground",
          )}
        >
          {message.type === "code" ? (
            <div className="space-y-2">
              <pre className="overflow-x-auto rounded-lg bg-background/50 p-3 text-sm font-mono">
                <code>{message.content}</code>
              </pre>
            </div>
          ) : message.type === "visualization" ? (
            <div className="prose prose-invert prose-sm max-w-none">
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
                      code: ({ className, children, ...props }) => {
                        return <code className={cn(className, "bg-muted px-1 py-0.5 rounded font-mono text-sm block whitespace-pre-wrap")} {...props}>{children}</code>
                      },
                      pre: ({ children }) => <pre className="p-2 my-2 bg-background/50 rounded-lg overflow-x-auto">{children}</pre>
                    }}
                  >
                    {part.content}
                  </ReactMarkdown>
                )
              })}
            </div>
          ) : message.type === "model" ? (
            <div className="prose prose-invert prose-sm max-w-none">
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
                    return <code className={cn(className, "bg-muted px-1 py-0.5 rounded font-mono text-sm")} {...props}>{children}</code>
                  },
                  pre: ({ children }) => <pre className="p-2 my-2 bg-background/50 rounded-lg overflow-x-auto">{children}</pre>
                }}
              >
                {preprocessLaTeX(message.content)}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{message.content}</p>
          )}
        </div>

        {/* Buttons (Copy & Download) */}
        {!isUser && (
          <div className={cn(
            "absolute -right-12 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100",
            isUser && "-left-12 -right-auto items-end"
          )}>
            <button
              onClick={handleCopy}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title="Copy content"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
              title="Download PDF Report"
            >
              {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Action Buttons (Retry etc) */}
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
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}