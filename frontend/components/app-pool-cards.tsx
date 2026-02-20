"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Clock,
  Users,
  Ticket,
  TrendingUp,
  ArrowRight,
  ArrowUpDown,
  Search,
  ChevronDown,
  Info,
} from "lucide-react"
import { type Pool, formatCountdown } from "@/lib/pool-data"

type SortKey = "tvl" | "apy" | "drawTime" | "prize"

const sortLabels: Record<SortKey, string> = {
  tvl: "TVL",
  apy: "APY",
  drawTime: "Draw Time",
  prize: "Prize",
}

function parseTvl(tvl: string): number {
  const num = parseFloat(tvl.replace(/[$KM]/g, ""))
  if (tvl.includes("M")) return num * 1_000_000
  if (tvl.includes("K")) return num * 1_000
  return num
}

function parseApy(apy: string): number {
  return parseFloat(apy.replace("%", ""))
}

interface Props {
  pools: Pool[]
  onDeposit: (pool: Pool) => void
  onViewDetail: (pool: Pool) => void
}

export function AppPoolCards({ pools, onDeposit, onViewDetail }: Props) {
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})
  const [sortKey, setSortKey] = useState<SortKey>("tvl")
  const [sortAsc, setSortAsc] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOpen, setSortOpen] = useState(false)

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
  }, [pools])

  const filtered = useMemo(() => {
    let result = [...pools]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.frequency.toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "tvl":
          cmp = parseTvl(a.tvl) - parseTvl(b.tvl)
          break
        case "apy":
          cmp = parseApy(a.apy) - parseApy(b.apy)
          break
        case "drawTime":
          cmp = a.drawTime.getTime() - b.drawTime.getTime()
          break
        case "prize":
          cmp = a.prize - b.prize
          break
      }
      return sortAsc ? cmp : -cmp
    })
    return result
  }, [pools, sortKey, sortAsc, searchQuery])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
    setSortOpen(false)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pools..."
            className="w-full rounded-lg border border-border bg-secondary/30 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-accent/40 focus:bg-secondary/50"
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/50"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            Sort: {sortLabels[sortKey]}
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${sortOpen ? "rotate-180" : ""}`}
            />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-slide-up">
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary/50 ${
                    sortKey === key
                      ? "text-accent font-medium"
                      : "text-foreground"
                  }`}
                >
                  {sortLabels[key]}
                  {sortKey === key && (
                    <span className="text-xs text-muted-foreground">
                      {sortAsc ? "Low to High" : "High to Low"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pool count */}
      <p className="mb-4 text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "pool" : "pools"} found
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/30 py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No pools match your search.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {filtered.map((pool) => (
            <div
              key={pool.id}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 ${pool.borderColor} ${
                pool.featured ? "ring-1 ring-accent/20 lg:-mt-2 lg:mb-2" : ""
              }`}
            >
              {/* Hover gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-b ${pool.color} opacity-0 transition-opacity group-hover:opacity-100`}
                aria-hidden="true"
              />

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
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {pool.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pool.frequency}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-mono text-accent">
                    <Clock className="h-3 w-3" />
                    {countdowns[pool.id] ?? "--"}
                  </div>
                </div>

                {/* Prize */}
                <div className="mt-6 mb-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Current Prize
                  </p>
                  <p className="font-display text-4xl font-bold text-foreground">
                    {pool.prizeFormatted}
                  </p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-4 rounded-xl bg-secondary/50 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">TVL</p>
                    <p className="font-display text-sm font-bold text-foreground">
                      {pool.tvl}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Players</p>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <p className="font-display text-sm font-bold text-foreground">
                        {pool.participantsFormatted}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">APY</p>
                    <p className="font-display text-sm font-bold text-accent">
                      {pool.apy}
                    </p>
                  </div>
                </div>

                {/* Extra info */}
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Ticket className="h-3 w-3" />
                    {pool.ticketRatio}
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Min ${pool.minDeposit}
                  </div>
                </div>

                {/* CTAs */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => onDeposit(pool)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    Deposit Now
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onViewDetail(pool)}
                    className="flex items-center justify-center rounded-lg border border-border px-3 py-3 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label={`View ${pool.name} details`}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
