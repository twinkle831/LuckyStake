"use client"

import { useEffect, useState } from "react"
import { Zap } from "lucide-react"
import Link from "next/link"

export default function InProgressPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated gradient circles */}
        <div
          className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(52, 211, 153, 0.8) 0%, transparent 70%)",
            left: "10%",
            top: "20%",
            animation: mounted ? "float 6s ease-in-out infinite" : "none",
          }}
        />
        <div
          className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(52, 211, 153, 0.5) 0%, transparent 70%)",
            right: "10%",
            bottom: "20%",
            animation: mounted ? "float 8s ease-in-out infinite reverse" : "none",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-md">
        {/* Animated icon */}
        <div
          className={`mb-8 flex justify-center transition-all duration-1000 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 rounded-2xl bg-accent/10 backdrop-blur-sm" />
            <div
              className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-accent to-accent/20 bg-clip-border"
              style={{
                animation: mounted ? "spin 3s linear infinite" : "none",
              }}
            />
            <div className="absolute inset-1 rounded-xl bg-background flex items-center justify-center">
              <Zap className="h-10 w-10 text-accent" />
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1
          className={`font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4 transition-all duration-1000 delay-200 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <span className="text-balance">
            Still In
            <br />
            <span className="text-accent">Progress</span>
          </span>
        </h1>

        {/* Description */}
        <p
          className={`text-lg leading-relaxed text-muted-foreground mb-8 transition-all duration-1000 delay-300 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          We're building something amazing! The full lottery experience is coming very soon. Stay tuned.
        </p>

        {/* Loading dots */}
        <div
          className={`mb-12 flex justify-center gap-2 transition-all duration-1000 delay-400 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-accent/60"
              style={{
                animationName: mounted ? "pulse" : "none",
                animationDuration: "1.5s",
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/"
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent/10 border border-accent/30 text-accent font-medium transition-all duration-1000 delay-500 hover:bg-accent/20 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          ← Back to home
        </Link>
      </div>

      {/* Animated styles */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(20px);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </main>
  )
}
