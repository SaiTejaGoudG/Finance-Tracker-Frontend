"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import type { OverviewFilters } from "./use-overview-data"

interface Message {
  role: "user" | "assistant"
  content: string
  streaming?: boolean
}

const SUGGESTIONS = [
  "Which month had the highest expenses?",
  "How is my spending compared to income?",
  "Which category am I overspending on?",
  "What's my average monthly savings?",
]

interface AIChatbotProps {
  filters: OverviewFilters
}

export default function AIChatbot({ filters }: AIChatbotProps) {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState("")
  const [thinking, setThinking] = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || thinking) return

    const userMsg: Message = { role: "user", content: text.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setThinking(true)

    // Placeholder for streaming response
    const assistantMsg: Message = { role: "assistant", content: "", streaming: true }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      const payload = {
        messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        startDate:  filters.startDate,
        endDate:    filters.endDate,
        owner_type: filters.ownerType || undefined,
      }

      const res = await apiClient(apiUrl("ai/chat"), {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })

      if (!res.body) throw new Error("No response body")

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (data === "[DONE]") break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              accumulated += parsed.text
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: "assistant", content: accumulated, streaming: true }
                return updated
              })
            }
          } catch {}
        }
      }

      // Finalise
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: "assistant", content: accumulated, streaming: false }
        return updated
      })
    } catch (e: any) {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          streaming: false,
        }
        return updated
      })
    } finally {
      setThinking(false)
    }
  }, [messages, filters, thinking])

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200",
          open
            ? "bg-foreground text-background"
            : "bg-violet-600 text-white hover:bg-violet-700",
        )}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[560px] flex flex-col rounded-2xl border bg-background shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/50">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Finance Assistant</p>
              <p className="text-xs text-muted-foreground">Ask anything about your finances</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground text-center">Try asking:</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left text-xs rounded-xl border px-3 py-2.5 hover:bg-accent transition-colors text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex gap-2 items-start", msg.role === "user" && "flex-row-reverse")}
              >
                <div className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5",
                  msg.role === "user"
                    ? "bg-violet-600 text-white"
                    : "bg-muted text-muted-foreground",
                )}>
                  {msg.role === "user"
                    ? <User className="h-3.5 w-3.5" />
                    : <Bot className="h-3.5 w-3.5" />
                  }
                </div>
                <div className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-sm max-w-[270px] leading-relaxed",
                  msg.role === "user"
                    ? "bg-violet-600 text-white rounded-tr-sm"
                    : "bg-muted rounded-tl-sm",
                )}>
                  {msg.content}
                  {msg.streaming && <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse rounded-sm" />}
                </div>
              </div>
            ))}

            {thinking && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-2 items-center">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder="Ask about your finances…"
              disabled={thinking}
              className="flex-1 text-sm rounded-xl border bg-muted/40 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || thinking}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
