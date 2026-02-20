"use client"

import { useInView } from "@/hooks/use-in-view"
import { Shield, Eye, Lock, FileCheck, Fingerprint, Globe } from "lucide-react"

const features = [
  {
    icon: Lock,
    title: "Non-Custodial",
    description: "Funds are held by Soroban smart contracts - never by a centralized party.",
  },
  {
    icon: FileCheck,
    title: "Verifiable Randomness",
    description: "VRF-based draw system ensures every ticket has provably equal probability.",
  },
  {
    icon: Eye,
    title: "Zero-Knowledge Privacy",
    description: "Optional ZKP mode lets you prove eligibility without revealing your balance.",
  },
  {
    icon: Shield,
    title: "Audited Contracts",
    description: "All smart contracts undergo rigorous third-party security audits.",
  },
  {
    icon: Fingerprint,
    title: "Multi-Wallet Support",
    description: "Connect via Freighter, xBull, or Albedo. Your keys, your funds.",
  },
  {
    icon: Globe,
    title: "Fully On-Chain",
    description: "Draw results, randomness seeds, and prize distributions are recorded on Stellar.",
  },
]

export function SecuritySection() {
  const { ref, isInView } = useInView()

  return (
    <section className="relative bg-background py-24 lg:py-32" ref={ref}>
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <p
            className={`mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent transition-all duration-700 ${
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            Security & Privacy
          </p>
          <h2
            className={`font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl transition-all duration-700 delay-100 ${
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <span className="text-balance">Built on Trust, Verified by Code</span>
          </h2>
        </div>

        {/* Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group rounded-xl border border-border bg-card/30 p-6 backdrop-blur-sm transition-all duration-700 hover:border-accent/20 hover:bg-card/60 ${
                isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: isInView ? `${200 + index * 100}ms` : "0ms" }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
