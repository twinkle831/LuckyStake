"use client"

import { useInView } from "@/hooks/use-in-view"
import { Clock, Users, Zap, ArrowRight } from "lucide-react"
import Link from "next/link"

const pools = [
  {
    name: "Weekly Pool",
    frequency: "Every 7 Days",
    prize: "$8,920",
    tvl: "$1.8M",
    participants: "5,847",
    apy: "5.2%",
    timeLeft: "4d 8h",
    color: "from-accent/30 to-accent/5",
    borderColor: "hover:border-accent/50",
    featured: true,
  },
  {
    name: "Biweekly Pool",
    frequency: "Every 15 Days",
    prize: "$18,500",
    tvl: "$2.1M",
    participants: "7,120",
    apy: "5.4%",
    timeLeft: "10d 20h",
    color: "from-emerald-500/20 to-emerald-500/5",
    borderColor: "hover:border-emerald-500/40",
    featured: false,
  },
  {
    name: "Monthly Pool",
    frequency: "Every 30 Days",
    prize: "$42,500",
    tvl: "$2.4M",
    participants: "8,912",
    apy: "5.6%",
    timeLeft: "18d 5h",
    color: "from-teal-500/20 to-teal-500/5",
    borderColor: "hover:border-teal-500/40",
    featured: false,
  },
]

export function PrizePools() {
  const { ref, isInView } = useInView()

  return (
    <section id="pools" className="relative bg-background py-24 lg:py-32" ref={ref}>
      {/* Subtle bg accent */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(52, 211, 153, 0.04) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mb-16 text-center">
          <p
            className={`mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent transition-all duration-700 ${
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            Prize Pools
          </p>
          <h2
            className={`font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl transition-all duration-700 delay-100 ${
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <span className="text-balance">Choose Your Pool</span>
          </h2>
          <p
            className={`mx-auto mt-4 max-w-lg text-lg text-muted-foreground transition-all duration-700 delay-200 ${
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            Three time-based pools to match your strategy. Bigger deposits and
            longer durations mean more tickets.
          </p>
        </div>

        {/* Pool cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {pools.map((pool, index) => (
            <div
              key={pool.name}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-700 ${pool.borderColor} ${
                pool.featured ? "lg:-mt-4 lg:mb-4 ring-1 ring-accent/20" : ""
              } ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
              style={{ transitionDelay: isInView ? `${300 + index * 150}ms` : "0ms" }}
            >
              {/* Gradient bg */}
              <div className={`absolute inset-0 bg-gradient-to-b ${pool.color} opacity-0 transition-opacity group-hover:opacity-100`} aria-hidden="true" />

              {pool.featured && (
                <div className="relative bg-accent/10 py-1.5 text-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="relative p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground">{pool.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{pool.frequency}</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {pool.timeLeft}
                  </div>
                </div>

                {/* Prize */}
                <div className="mt-6 mb-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Current Prize</p>
                  <p className="font-display text-4xl font-bold text-foreground">{pool.prize}</p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 rounded-xl bg-secondary/50 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">TVL</p>
                    <p className="font-display text-sm font-bold text-foreground">{pool.tvl}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Players</p>
                    <p className="font-display text-sm font-bold text-foreground">{pool.participants}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">APY</p>
                    <p className="font-display text-sm font-bold text-accent">{pool.apy}</p>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href="/app"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-accent/10 py-3 text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-accent-foreground"
                >
                  Deposit Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
