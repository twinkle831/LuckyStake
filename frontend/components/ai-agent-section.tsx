"use client"

import { useInView } from "@/hooks/use-in-view"
import { Bot, MessageCircle, Zap, BarChart3 } from "lucide-react"
import { useState } from "react"

const features = [
  {
    icon: MessageCircle,
    title: "Chat with AI",
    description:
      "Ask questions about strategies, pool performance, and get personalized recommendations in real-time.",
  },
  {
    icon: Zap,
    title: "Smart Insights",
    description:
      "Get AI-powered analysis of pools, odds, and optimal times to enter or withdraw.",
  },
  {
    icon: BarChart3,
    title: "Live Data",
    description:
      "Real-time pool statistics, draw countdowns, and performance metrics at your fingertips.",
  },
]

export function AIAgentSection() {
  const { ref, isInView } = useInView()
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([
    { role: "assistant", text: "Hi! I'm your AI assistant. Ask me about pools, strategies, or draw odds." },
  ])
  const [input, setInput] = useState("")

  const handleSendMessage = () => {
    if (!input.trim()) return
    setMessages([...messages, { role: "user", text: input }])
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "The weekly pool has 2.4% APY and 1 draw per week. Would you like more details?" },
      ])
    }, 500)
    setInput("")
  }

  return (
    <section id="ai-agent" className="relative overflow-hidden bg-background py-24 lg:py-32" ref={ref}>
      {/* Subtle bg */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 80% 50%, rgba(52, 211, 153, 0.03) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left content */}
          <div>
            <div
              className={`mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm text-accent transition-all duration-700 ${
                isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <Bot className="h-4 w-4" />
              AI Assistant
            </div>

            <h2
              className={`font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl transition-all duration-700 delay-100 ${
                isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <span className="text-balance">
                Ask Your AI
                <br />
                Lottery
                <br />
                <span className="text-accent">Expert</span>
              </span>
            </h2>

            <p
              className={`mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground transition-all duration-700 delay-200 ${
                isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              Get instant answers about pool performance, strategies, odds, and everything
              else you need to make informed lottery decisions.
            </p>

            {/* Feature list */}
            <div className="mt-10 flex flex-col gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`flex gap-4 transition-all duration-700 ${
                    isInView ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
                  }`}
                  style={{ transitionDelay: isInView ? `${400 + index * 100}ms` : "0ms" }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Chatbot */}
          <div
            className={`transition-all duration-1000 delay-300 ${
              isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm lg:p-8 flex flex-col h-96">
              {/* Chat header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                    <Bot className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground">AI Assistant</h3>
                    <p className="text-xs text-accent">Online</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                        msg.role === "user"
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary/50 text-foreground"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask about pools..."
                  className="flex-1 rounded-lg bg-secondary/30 px-3 py-2 text-sm border border-border focus:outline-none focus:border-accent"
                />
                <button
                  onClick={handleSendMessage}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
