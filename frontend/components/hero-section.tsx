"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Shield } from "lucide-react"
import { HeroGeometry } from "./hero-geometry"
import Link from "next/link"

export function HeroSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated background */}
      <HeroGeometry />

      {/* Radial gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 65% 45%, rgba(52, 211, 153, 0.05) 0%, transparent 70%), radial-gradient(ellipse 80% 60% at 20% 80%, rgba(52, 211, 153, 0.03) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 pt-24 pb-20">
        <div className="max-w-2xl">
          {/* Badge */}
          <div
            className={`mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm transition-all duration-700 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-accent" />
            <span>Powered by Stellar Network</span>
          </div>

          {/* Subtitle */}
          <p
            className={`mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground transition-all duration-700 delay-100 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            Permissionless. Trustless. No-Loss.
          </p>

          {/* Heading */}
          <h1
            className={`font-display text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl transition-all duration-1000 delay-200 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <span className="text-balance">
              Decentralized
              <br />
              <span className="bg-gradient-to-r from-accent to-emerald-300 bg-clip-text text-transparent">
                Crypto Lottery
              </span>
            </span>
          </h1>

          {/* Description */}
          <p
            className={`mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground transition-all duration-700 delay-300 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            The lottery reinvented for DeFi. Deposit, earn real yield, and win
            prizes. Your principal is always safe. Own a piece of the game.
          </p>

          {/* CTAs */}
          <div
            className={`mt-10 flex flex-wrap items-center gap-4 transition-all duration-700 delay-500 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <Link
              href="/in-progress"
              className="group flex items-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground transition-all hover:shadow-lg hover:shadow-accent/20"
            >
              Launch App
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-6 py-3.5 text-sm font-medium text-foreground backdrop-blur-sm transition-all hover:bg-secondary/60"
            >
              How It Works
            </a>
          </div>

          {/* Quick stats */}
          <div
            className={`mt-16 flex flex-wrap gap-8 border-t border-border/50 pt-8 transition-all duration-700 delay-700 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <div>
              <p className="font-display text-2xl font-bold text-foreground">$4.2M</p>
              <p className="mt-1 text-xs text-muted-foreground">Total Value Locked</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">12,847</p>
              <p className="mt-1 text-xs text-muted-foreground">Active Players</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">$892K</p>
              <p className="mt-1 text-xs text-muted-foreground">Prizes Awarded</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" aria-hidden="true" />
    </section>
  )
}
