"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Trophy, ExternalLink, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useInView } from "@/hooks/use-in-view"

const allWinners = [
  {
    address: "GDQP2K...X7ML",
    pool: "Weekly",
    prize: "$8,420",
    date: "2 hours ago",
  },
  {
    address: "GBZX7H...Q9RE",
    pool: "Biweekly",
    prize: "$1,180",
    date: "8 hours ago",
  },
  {
    address: "GCKW5P...M2VD",
    pool: "Monthly",
    prize: "$38,900",
    date: "3 days ago",
  },
  {
    address: "GANX8T...J5NK",
    pool: "Biweekly",
    prize: "$1,340",
    date: "3 days ago",
  },
  {
    address: "GDML9R...W8BH",
    pool: "Weekly",
    prize: "$9,100",
    date: "5 days ago",
  },
  {
    address: "GFPQ3X...K2LM",
    pool: "Monthly",
    prize: "$42,300",
    date: "1 week ago",
  },
  {
    address: "GHXYZ9...N8OP",
    pool: "Weekly",
    prize: "$7,850",
    date: "1 week ago",
  },
  {
    address: "GJKLMN...P5QR",
    pool: "Biweekly",
    prize: "$1,225",
    date: "2 weeks ago",
  },
  {
    address: "GSTUVW...X9YZ",
    pool: "Monthly",
    prize: "$35,600",
    date: "2 weeks ago",
  },
  {
    address: "GABCDE...F2GH",
    pool: "Weekly",
    prize: "$8,950",
    date: "3 weeks ago",
  },
]

export default function WinnersPage() {
  const { ref, isInView } = useInView()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      {/* Background accent */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 30% at 50% 0%, rgba(52, 211, 153, 0.04) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative">
        {/* Header */}
        <section className="border-b border-border/30 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <Link
              href="/#recent-winners"
              className="inline-flex items-center gap-2 text-sm text-accent transition-colors hover:text-accent/80 mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                <Trophy className="h-7 w-7 text-accent" />
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Draw Winners
              </h1>
            </div>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Browse all winners across our prize pools. Every draw is verified on-chain for complete transparency and fairness.
            </p>
          </div>
        </section>

        {/* Winners table */}
        <section className="py-20" ref={ref}>
          <div className="mx-auto max-w-7xl px-6">
            <div
              className={`overflow-hidden rounded-2xl border border-border bg-card/30 backdrop-blur-sm transition-all duration-700 ${
                isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              {/* Table header */}
              <div className="grid grid-cols-4 gap-4 border-b border-border px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>Winner</span>
                <span>Pool</span>
                <span>Prize</span>
                <span className="text-right">When</span>
              </div>

              {/* Rows */}
              {allWinners.map((winner, index) => (
                <div
                  key={`${winner.address}-${index}`}
                  className={`group grid grid-cols-4 gap-4 border-b border-border/50 px-6 py-4 transition-all duration-500 last:border-0 hover:bg-secondary/30 ${
                    isInView ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                  }`}
                  style={{ transitionDelay: isInView ? `${100 + index * 40}ms` : "0ms" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10">
                      <Trophy className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <span className="font-mono text-sm text-foreground">{winner.address}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {winner.pool}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-display font-bold text-accent">{winner.prize}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm text-muted-foreground">{winner.date}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-t border-border/30 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-xl bg-card/50 border border-border/30 p-6 backdrop-blur-sm">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total Drawn</p>
                <p className="mt-3 font-display text-3xl font-bold text-foreground">$402,464</p>
              </div>
              <div className="rounded-xl bg-card/50 border border-border/30 p-6 backdrop-blur-sm">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Winners</p>
                <p className="mt-3 font-display text-3xl font-bold text-accent">{allWinners.length}+</p>
              </div>
              <div className="rounded-xl bg-card/50 border border-border/30 p-6 backdrop-blur-sm">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Largest Prize</p>
                <p className="mt-3 font-display text-3xl font-bold text-foreground">$42,300</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  )
}
