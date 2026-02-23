"use client"

import { useInView } from "@/hooks/use-in-view"
import { Trophy, ExternalLink } from "lucide-react"
import { useDraws, type DrawRecord } from "@/hooks/use-draws"
import { stellarExpertTxUrl, isStellarTxHash } from "@/lib/stellar-explorer"

function truncateAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Fallback static winners shown until API returns data
const FALLBACK_WINNERS = [
  { address: "GDQP2K...X7ML", pool: "Weekly", prize: "8,420 XLM", date: "2 hours ago" },
  { address: "GBZX7H...Q9RE", pool: "Biweekly", prize: "1,180 XLM", date: "8 hours ago" },
  { address: "GCKW5P...M2VD", pool: "Monthly", prize: "38,900 XLM", date: "3 days ago" },
  { address: "GANX8T...J5NK", pool: "Biweekly", prize: "1,340 XLM", date: "3 days ago" },
  { address: "GDML9R...W8BH", pool: "Weekly", prize: "9,100 XLM", date: "5 days ago" },
]

function drawToRow(d: DrawRecord) {
  return {
    key: d.id,
    address: d.winner ? truncateAddr(d.winner) : "—",
    pool: d.poolType.charAt(0).toUpperCase() + d.poolType.slice(1),
    prize: `${d.prizeAmount.toLocaleString()} XLM`,
    date: timeAgo(d.drawnAt),
    txHash: d.txHashes[0] ?? null,
  }
}

export function RecentWinners() {
  const { ref, isInView } = useInView()
  const { draws, loading } = useDraws(5)

  const rows =
    draws.length > 0
      ? draws.slice(0, 5).map(drawToRow)
      : FALLBACK_WINNERS.map((w, i) => ({ ...w, key: String(i), txHash: null }))

  return (
    <section id="recent-winners" className="relative bg-background py-24 lg:py-32" ref={ref}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <p
            className={`mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent transition-all duration-700 ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
          >
            Live Results
          </p>
          <h2
            className={`font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl transition-all duration-700 delay-100 ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
          >
            <span className="text-balance">Recent Winners</span>
          </h2>
        </div>

        <div
          className={`overflow-hidden rounded-2xl border border-border bg-card/30 backdrop-blur-sm transition-all duration-700 delay-200 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
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
          {loading && draws.length === 0 && (
            <div className="divide-y divide-border/50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-4 gap-4 border-b border-border/50 px-6 py-4 animate-pulse">
                  <div className="h-4 w-28 rounded bg-secondary/40" />
                  <div className="h-4 w-16 rounded bg-secondary/40" />
                  <div className="h-4 w-20 rounded bg-secondary/40" />
                  <div className="h-4 w-16 ml-auto rounded bg-secondary/40" />
                </div>
              ))}
            </div>
          )}

          {/* Rows */}
          {!loading || draws.length > 0 ? rows.map((winner, index) => (
            <div
              key={winner.key}
              className={`group grid grid-cols-4 gap-4 border-b border-border/50 px-6 py-4 transition-all duration-500 last:border-0 hover:bg-secondary/30 ${isInView ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                }`}
              style={{ transitionDelay: isInView ? `${400 + index * 80}ms` : "0ms" }}
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
          )) : null}
        </div>

        <div className="mt-6 text-center">
          <a href="/winners" className="text-sm text-accent transition-colors hover:text-accent/80">
            View all winners and draw history →
          </a>
        </div>
      </div>
    </section>
  )
}
