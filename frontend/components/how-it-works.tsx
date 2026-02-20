"use client"

import { Wallet, Ticket, TrendingUp, Trophy } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

const steps = [
  {
    icon: Wallet,
    step: "01",
    title: "Deposit",
    description:
      "Connect your Stellar wallet and deposit USDC or supported assets into any prize pool. Your funds are secured by Soroban smart contracts.",
  },
  {
    icon: Ticket,
    step: "02",
    title: "Select Your Pool",
    description:
      "Choose between Weekly and Monthly pools based on your strategy. Each pool has different odds and prize amounts.",
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "Yield Accrues",
    description:
      "Your deposits generate yield through Stellar DeFi protocols like Blend and Soroswap. This yield becomes the prize pool.",
  },
  {
    icon: Trophy,
    step: "04",
    title: "Win Prizes",
    description:
      "When the draw happens, a verifiable random winner is selected on-chain. Even if you don't win, your principal is always safe.",
  },
]

export function HowItWorks() {
  const { ref, isInView } = useInView()

  return (
    <section id="how-it-works" className="relative bg-background py-24 lg:py-32" ref={ref}>
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mb-16 max-w-xl">
          <p
            className={`mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent transition-all duration-700 ${
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            How It Works
          </p>
          <h2
            className={`font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl transition-all duration-700 delay-100 ${
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <span className="text-balance">Save money. Win prizes. Never lose.</span>
          </h2>
          <p
            className={`mt-4 text-lg leading-relaxed text-muted-foreground transition-all duration-700 delay-200 ${
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            A simple four-step process that turns your savings into winning chances.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className={`group relative rounded-xl border border-border bg-card/50 p-6 backdrop-blur-sm transition-all duration-700 hover:border-accent/30 hover:bg-card ${
                isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: isInView ? `${300 + index * 100}ms` : "0ms" }}
            >
              {/* Step number */}
              <span className="font-display text-xs font-bold text-accent/50">{step.step}</span>

              {/* Icon */}
              <div className="mt-4 mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                <step.icon className="h-6 w-6" />
              </div>

              <h3 className="font-display text-lg font-bold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>

              {/* Connector line (not on last) */}
              {index < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-border lg:block" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
