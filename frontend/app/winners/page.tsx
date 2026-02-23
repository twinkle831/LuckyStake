"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Trophy, ExternalLink, ArrowLeft, Medal, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useInView } from "@/hooks/use-in-view"
import { useDraws, useLeaderboard, type DrawRecord } from "@/hooks/use-draws"
import { stellarExpertTxUrl, isStellarTxHash } from "@/lib/stellar-explorer"

function truncateAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Static fallback while loading
const FALLBACK_WINNERS = [
  { id: "s1", address: "GDQP2K...X7ML", pool: "Weekly", prize: "8,420 XLM", date: "2 hours ago", txHash: null },
  { id: "s2", address: "GBZX7H...Q9RE", pool: "Biweekly", prize: "1,180 XLM", date: "8 hours ago", txHash: null },
  { id: "s3", address: "GCKW5P...M2VD", pool: "Monthly", prize: "38,900 XLM", date: "3 days ago", txHash: null },
  { id: "s4", address: "GANX8T...J5NK", pool: "Biweekly", prize: "1,340 XLM", date: "3 days ago", txHash: null },
  { id: "s5", address: "GDML9R...W8BH", pool: "Weekly", prize: "9,100 XLM", date: "5 days ago", txHash: null },
  { id: "s6", address: "GFPQ3X...K2LM", pool: "Monthly", prize: "42,300 XLM", date: "1 week ago", txHash: null },
  { id: "s7", address: "GHXYZ9...N8OP", pool: "Weekly", prize: "7,850 XLM", date: "1 week ago", txHash: null },
  { id: "s8", address: "GJKLMN...P5QR", pool: "Biweekly", prize: "1,225 XLM", date: "2 weeks ago", txHash: null },
  { id: "s9", address: "GSTUVW...X9YZ", pool: "Monthly", prize: "35,600 XLM", date: "2 weeks ago", txHash: null },
  { id: "s10", address: "GABCDE...F2GH", pool: "Weekly", prize: "8,950 XLM", date: "3 weeks ago", txHash: null },
]

function drawToRow(d: DrawRecord) {
  return {
    id: d.id,
    address: d.winner ? truncateAddr(d.winner) : "—",
    pool: d.poolType.charAt(0).toUpperCase() + d.poolType.slice(1),
    prize: `${d.prizeAmount.toLocaleString()} XLM`,
    date: formatDate(d.drawnAt),
    txHash: d.txHashes[0] ?? null,
  }
}

type Tab = "draws" | "leaderboard"

export default function WinnersPage() {
  const { ref, isInView } = useInView()
  const [tab, setTab] = useState<Tab>("draws")

  const { draws, loading: drawsLoading } = useDraws(100)
  const { leaderboard, stats, loading: lbLoading } = useLeaderboard(50)

  const rows = draws.length > 0 ? draws.map(drawToRow) : FALLBACK_WINNERS

  const totalDrawn = stats?.totalDrawn ?? 402464
  const totalWinners = stats ? stats.uniqueWinners : FALLBACK_WINNERS.length
  const largestPrize = stats?.largestPrize ?? 42300

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

        {/* Stats */}
        <section className="border-b border-border/30 py-12">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl bg-card/50 border border-border/30 p-6 backdrop-blur-sm">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total Drawn</p>
                <p className="mt-3 font-display text-3xl font-bold text-foreground">
                  {totalDrawn.toLocaleString()} XLM
                </p>
              </div>
              <div className="rounded-xl bg-card/50 border border-border/30 p-6 backdrop-blur-sm">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Unique Winners</p>
                <p className="mt-3 font-display text-3xl font-bold text-accent">{totalWinners}+</p>
              </div>
              <div className="rounded-xl bg-card/50 border border-border/30 p-6 backdrop-blur-sm">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Largest Prize</p>
                <p className="mt-3 font-display text-3xl font-bold text-foreground">
                  {largestPrize.toLocaleString()} XLM
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tab switcher */}
        <section className="py-8 border-b border-border/30">
          <div className="mx-auto max-w-7xl px-6">
            <div className="inline-flex rounded-xl bg-secondary/50 p-1 gap-1">
              <button
                onClick={() => setTab("draws")}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${tab === "draws"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Trophy className="h-4 w-4" />
                Draw History
              </button>
              <button
                onClick={() => setTab("leaderboard")}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${tab === "leaderboard"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <BarChart3 className="h-4 w-4" />
                Leaderboard
              </button>
            </div>
          </div>
        </section>

        {/* Draw History Tab */}
        {tab === "draws" && (
          <section className="py-12" ref={ref}>
            <div className="mx-auto max-w-7xl px-6">
              <div
                className={`overflow-hidden rounded-2xl border border-border bg-card/30 backdrop-blur-sm transition-all duration-700 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
              >
                {/* Table header */}
                <div className="grid grid-cols-4 gap-4 border-b border-border px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <span>Winner</span>
                  <span>Pool</span>
                  <span>Prize</span>
                  <span className="text-right">When</span>
                </div>

                {/* Loading skeleton */}
                {drawsLoading && draws.length === 0 && (
                  <div className="divide-y divide-border/50">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="grid grid-cols-4 gap-4 px-6 py-4 animate-pulse">
                        <div className="h-4 w-28 rounded bg-secondary/40" />
                        <div className="h-4 w-16 rounded bg-secondary/40" />
                        <div className="h-4 w-20 rounded bg-secondary/40" />
                        <div className="h-4 w-16 ml-auto rounded bg-secondary/40" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Rows */}
                <div className="divide-y divide-border/50">
                  {rows.map((winner, index) => (
                    <div
                      key={winner.id}
                      className={`group grid grid-cols-4 gap-4 border-b border-border/50 px-6 py-4 transition-all duration-500 last:border-0 hover:bg-secondary/30 ${isInView ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
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
                        {winner.txHash && isStellarTxHash(winner.txHash) ? (
                          <a
                            href={stellarExpertTxUrl(winner.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="View on Stellar Expert"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-accent" />
                          </a>
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Leaderboard Tab */}
        {tab === "leaderboard" && (
          <section className="py-12">
            <div className="mx-auto max-w-7xl px-6">
              <div className="overflow-hidden rounded-2xl border border-border bg-card/30 backdrop-blur-sm">
                {/* Table header */}
                <div className="grid grid-cols-5 gap-4 border-b border-border px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <span>Rank</span>
                  <span className="col-span-2">Address</span>
                  <span>Total Won</span>
                  <span className="text-right">Wins</span>
                </div>

                {/* Loading */}
                {lbLoading && leaderboard.length === 0 && (
                  <div className="divide-y divide-border/50">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="grid grid-cols-5 gap-4 px-6 py-4 animate-pulse">
                        <div className="h-4 w-8 rounded bg-secondary/40" />
                        <div className="h-4 w-32 rounded bg-secondary/40 col-span-2" />
                        <div className="h-4 w-20 rounded bg-secondary/40" />
                        <div className="h-4 w-8 ml-auto rounded bg-secondary/40" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {!lbLoading && leaderboard.length === 0 && (
                  <div className="px-6 py-16 text-center">
                    <Trophy className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No draws completed yet. Check back after the first draw!</p>
                  </div>
                )}

                {/* Rows */}
                <div className="divide-y divide-border/50">
                  {leaderboard.map((entry) => {
                    const medalColor =
                      entry.rank === 1
                        ? "text-yellow-400"
                        : entry.rank === 2
                          ? "text-gray-300"
                          : entry.rank === 3
                            ? "text-amber-600"
                            : "text-muted-foreground"

                    return (
                      <div
                        key={entry.publicKey}
                        className="group grid grid-cols-5 gap-4 border-b border-border/50 px-6 py-4 last:border-0 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center">
                          {entry.rank <= 3 ? (
                            <Medal className={`h-5 w-5 ${medalColor}`} />
                          ) : (
                            <span className="text-sm font-mono text-muted-foreground">#{entry.rank}</span>
                          )}
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span className="font-mono text-sm text-foreground">
                            {truncateAddr(entry.publicKey)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-display font-bold text-accent">
                            {entry.totalWon.toLocaleString()} XLM
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                            {entry.winCount}×
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  )
}
