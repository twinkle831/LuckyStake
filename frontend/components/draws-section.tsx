"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Trophy,
  Clock,
  Users,
  Ticket,
  ExternalLink,
  Shield,
  ChevronDown,
  Sparkles,
} from "lucide-react"
import { pools, formatCountdown } from "@/lib/pool-data"
import {
  pastDraws,
  truncateAddr,
  formatDrawDate,
  type DrawResult,
} from "@/lib/draw-data"

type FilterPool = "all" | "weekly" | "biweekly" | "monthly"

export function DrawsSection() {
  const [filter, setFilter] = useState<FilterPool>("all")
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})
  const [expandedDraw, setExpandedDraw] = useState<string | null>(null)

  useEffect(() => {
    function tick() {
      const next: Record<string, string> = {}
      pools.forEach((p) => {
        next[p.id] = formatCountdown(p.drawTime)
      })
      setCountdowns(next)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const filtered = useMemo(() => {
    if (filter === "all") return pastDraws
    return pastDraws.filter((d) => d.poolId === filter)
  }, [filter])

  const nextDraw = pools.reduce((closest, p) =>
    p.drawTime < closest.drawTime ? p : closest
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Upcoming draws */}
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
          <Clock className="h-4 w-4 text-accent" />
          Upcoming Draws
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {pools.map((pool) => (
            <div
              key={pool.id}
              className={`rounded-xl border border-border bg-card/50 p-5 backdrop-blur-sm transition-all ${
                pool.id === nextDraw.id ? "ring-1 ring-accent/20" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base font-bold text-foreground">
                  {pool.name}
                </h3>
                {pool.id === nextDraw.id && (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    Next
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Prize</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {pool.prizeFormatted}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Draw in</p>
                  <p className="font-mono text-lg font-bold text-accent">
                    {countdowns[pool.id] ?? "--"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {pool.participantsFormatted} players
                </div>
                <div className="flex items-center gap-1">
                  <Ticket className="h-3 w-3" />
                  {pool.tvl} TVL
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past draws */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-accent" />
            Past Draw Results
          </h2>

          {/* Filter */}
          <div className="flex items-center gap-1 rounded-lg bg-secondary/50 p-1">
            {(["all", "weekly", "biweekly", "monthly"] as FilterPool[]).map(
              (key) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    filter === key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden divide-y divide-border/50">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Trophy className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No draw results for this pool yet.
              </p>
            </div>
          ) : (
            filtered.map((draw) => (
              <DrawRow
                key={draw.id}
                draw={draw}
                expanded={expandedDraw === draw.id}
                onToggle={() =>
                  setExpandedDraw(expandedDraw === draw.id ? null : draw.id)
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function DrawRow({
  draw,
  expanded,
  onToggle,
}: {
  draw: DrawResult
  expanded: boolean
  onToggle: () => void
}) {
  const winProb = ((draw.winnerTickets / draw.totalTickets) * 100).toFixed(4)

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-secondary/20"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Trophy className="h-5 w-5 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                {draw.poolName}
              </p>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {formatDrawDate(draw.drawDate)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Winner: {truncateAddr(draw.winnerAddress)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-display text-lg font-bold text-foreground">
            {draw.prizeFormatted}
          </p>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/30 bg-secondary/10 px-6 py-4 animate-slide-up">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Prize</p>
              <p className="font-display text-sm font-bold text-foreground">
                {draw.prizeFormatted}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Participants</p>
              <p className="font-display text-sm font-bold text-foreground">
                {draw.totalParticipants.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tickets</p>
              <p className="font-display text-sm font-bold text-foreground">
                {draw.totalTickets.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Win Probability</p>
              <p className="font-display text-sm font-bold text-accent">
                {winProb}%
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-accent" />
              <span>Verifiable on-chain randomness</span>
              {draw.verifiable && (
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              )}
            </div>
            <a
              href="#"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View on Explorer
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
