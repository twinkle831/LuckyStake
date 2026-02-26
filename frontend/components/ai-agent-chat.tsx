"use client"

import { useState, useEffect, useRef } from "react"
import { useWallet } from "@/context/wallet-context"
import { X, Send, Bot, User, Loader2 } from "lucide-react"

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp?: string
}

/** Strip trailing JSON from assistant reply for display (prefs or strategy block). */
function displayContent(content: string): string {
  const lastBrace = content.lastIndexOf("}")
  if (lastBrace === -1) return content
  const before = content.lastIndexOf("\n\n{")
  if (before !== -1 && before < lastBrace) {
    try {
      JSON.parse(content.slice(before + 2, lastBrace + 1))
      return content.slice(0, before).trim()
    } catch {
      /* keep as-is */
    }
  }
  return content
}

interface AiAgentChatProps {
  open: boolean
  onClose: () => void
}

export function AiAgentChat({ open, onClose }: AiAgentChatProps) {
  const { address, isConnected } = useWallet()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load conversation history when panel opens and user is connected
  useEffect(() => {
    if (!open || !isConnected || !address) {
      if (!isConnected) setMessages([])
      return
    }
    setLoadingHistory(true)
    setError(null)
    fetch(`${AGENT_API}/history?public_key=${encodeURIComponent(address)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.messages?.length) {
          setMessages(
            data.messages.map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
            }))
          )
        } else {
          setMessages([
            {
              role: "assistant",
              content:
                "Hi! I’m your LuckyStake strategy agent. I’ll help you set a **set-and-forget** plan.\n\n" +
                "1. **How long** do you want to keep your funds? (e.g. 1 month, 2 weeks, 1 week)\n" +
                "2. **Gas tolerance**: Low (1 pool), Medium (2 pools), or High (3 pools)?\n" +
                "3. **Preference**: Sure-shot (more pools, more chances) or **Highest prize** (single pool, biggest prize)?\n" +
                "4. **Amount** in XLM to deposit?\n\nReply with your answers and I’ll recommend an allocation.",
            },
          ])
        }
      })
      .catch(() => setError("Could not load conversation history."))
      .finally(() => setLoadingHistory(false))
  }, [open, isConnected, address])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    if (!isConnected || !address) {
      setError("Connect your wallet to chat and save your conversation.")
      return
    }

    setError(null)
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setLoading(true)

    try {
      const res = await fetch(`${AGENT_API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_key: address, message: text }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Request failed: ${res.status}`)
      }
      const data = await res.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "" }])
    } catch (e) {
      setError((e as Error).message)
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-lg flex flex-col bg-background border-l border-border shadow-2xl animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-label="AI Agent chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 border-b border-border px-4 py-3 bg-card/50">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
              <Bot className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground">AI Agent</h2>
              <p className="text-xs text-muted-foreground">
                Set-and-forget strategy · Conversation saved when wallet connected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg ${
                      msg.role === "user" ? "bg-accent/20" : "bg-muted"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-4 w-4 text-accent" />
                    ) : (
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                      msg.role === "user"
                        ? "bg-accent/15 text-accent-foreground"
                        : "bg-muted/80 text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm text-foreground">
                      {(msg.role === "assistant" ? displayContent(msg.content) : msg.content).split("\n").map((line, j) => (
                        <p key={j} className="my-1">
                          {line.split(/(\*\*[^*]+\*\*)/g).map((part, k) =>
                            part.startsWith("**") && part.endsWith("**") ? (
                              <strong key={k} className="font-semibold">
                                {part.slice(2, -2)}
                              </strong>
                            ) : (
                              <span key={k}>{part}</span>
                            )
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="rounded-xl bg-muted/80 px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {error && (
          <div className="shrink-0 px-4 pb-2">
            <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
              {error}
            </p>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t border-border p-4 bg-card/30">
          {!isConnected && (
            <p className="text-xs text-muted-foreground mb-2">
              Connect your wallet to save this conversation and get personalized strategy.
            </p>
          )}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Type your message..."
              rows={2}
              className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              aria-label="Send"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
