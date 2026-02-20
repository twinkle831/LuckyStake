"use client"

import { useInView } from "@/hooks/use-in-view"
import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

export function CTASection() {
  const { ref, isInView } = useInView()

  return (
    <section className="relative overflow-hidden bg-background py-24 lg:py-32" ref={ref}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-card/50 to-card/30 p-12 lg:p-20">
          {/* Background pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(52, 211, 153, 0.1) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(52, 211, 153, 0.08) 0%, transparent 40%)",
            }}
            aria-hidden="true"
          />

          <div className="relative text-center">
            <div
              className={`mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm text-accent transition-all duration-700 ${
                isInView ? "scale-100 opacity-100" : "scale-95 opacity-0"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Start Winning Today
            </div>

            <h2
              className={`font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-6xl transition-all duration-700 delay-100 ${
                isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <span className="text-balance">
                Your Savings Deserve
                <br />
                <span className="text-accent">Better Odds</span>
              </span>
            </h2>

            <p
              className={`mx-auto mt-6 max-w-lg text-lg text-muted-foreground transition-all duration-700 delay-200 ${
                isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              Join thousands of depositors earning yield and competing for
              prizes on the Stellar network. No loss, no risk, just upside.
            </p>

            <div
              className={`mt-10 flex flex-wrap items-center justify-center gap-4 transition-all duration-700 delay-300 ${
                isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <Link
                href="/app"
                className="group flex items-center gap-2 rounded-lg bg-accent px-8 py-4 text-base font-semibold text-accent-foreground transition-all hover:shadow-xl hover:shadow-accent/20"
              >
                Connect Wallet
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <button className="rounded-lg border border-border bg-secondary/30 px-8 py-4 text-base font-medium text-foreground backdrop-blur-sm transition-all hover:bg-secondary/60">
                Read Docs
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
