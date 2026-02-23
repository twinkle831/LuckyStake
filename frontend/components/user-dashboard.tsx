"use client"

import { useState, useEffect, useSyncExternalStore, useRef } from "react"
import {
  Wallet,
  Ticket,
  Clock,
  TrendingUp,
  TrendingDown,
  History,
  ExternalLink,
  Copy,
  CheckCircle2,
  LogOut,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Filter,
  Trophy,
  RotateCcw,
  AlertCircle,
} from "lucide-react"
import { useWallet, truncateAddress } from "@/context/wallet-context"
import {
  getDeposits,
  subscribe,
  getTotalDeposited,
  getTotalTickets,
  getNetDeposited,
  getTotalWithdrawn,
  getTotalClaimed,
  getPoolBalance,
  addPayout,
  type DepositEntry,
} from "@/lib/deposit-store"
import { pools, formatCountdown, type Pool } from "@/lib/pool-data"
import { stellarExpertTxUrl, isStellarTxHash } from "@/lib/stellar-explorer"
import { useMyResults } from "@/hooks/use-my-results"
import type { MyResultsData } from "@/hooks/use-my-results"
import { useTransactionHistory } from "@/hooks/use-transaction-history"

function useDeposits() {
  return useSyncExternalStore(subscribe, getDeposits, getDeposits)
}

type TxFilter = "all" | "deposit" | "withdraw" | "claim" | "payout"

interface Props {
  onWithdraw?: (pool: Pool) => void
  /** Pool id -> true if user can claim principal (draw ended) */
  claimableByPool?: Record<string, boolean>
}

export function UserDashboard({ onWithdraw, claimableByPool = {} }: Props) {
  const { address, balance, network, disconnect, refreshBalance } = useWallet()
  const deposits = useDeposits()
  const [copied, setCopied] = useState(false)
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})
  const [txFilter, setTxFilter] = useState<TxFilter>("all")
  const { data: myResults, loading: resultsLoading } = useMyResults(30_000)

  // Hydrate in-memory deposit-store from backend on every login (persists across refresh)
  useTransactionHistory(address)

  // Track which draw IDs we've already processed so we don't re-add payouts
  const processedDrawIds = useRef<Set<string>>(new Set())

  // When new results arrive, inject them into the local deposit-store and refresh balance
  useEffect(() => {
    // Won draws
    for (const draw of myResults.won) {
      if (!processedDrawIds.current.has(`win-${draw.id}`)) {
        processedDrawIds.current.add(`win-${draw.id}`)
        const poolName =
          draw.poolType.charAt(0).toUpperCase() + draw.poolType.slice(1) + " Pool"
        addPayout(draw.poolType, poolName, draw.prizeAmount, "win", draw.contractTxHash ?? draw.txHashes?.[0])
        refreshBalance()
      }
    }

    // Refund payouts — deduplicate by deposit id
    for (const dep of myResults.payouts) {
      if (dep.payoutType === "refund" && !processedDrawIds.current.has(`refund-${dep.id}`)) {
        processedDrawIds.current.add(`refund-${dep.id}`)
        const poolName =
          dep.poolType.charAt(0).toUpperCase() + dep.poolType.slice(1) + " Pool"
        addPayout(dep.poolType, poolName, dep.amount, "refund", dep.payoutTxHash ?? undefined)
      }
    }
  }, [myResults, refreshBalance])

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

  function copyAddress() {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalDeposited = getTotalDeposited()
  const totalWithdrawn = getTotalWithdrawn()
  const totalClaimed = getTotalClaimed()
  const netDeposited = getNetDeposited()
  const totalTickets = getTotalTickets()

  const nextDraw = pools.reduce((closest, p) =>
    p.drawTime < closest.drawTime ? p : closest
  )

  // Pools user has deposited in
  const userPools = pools.filter((p) => getPoolBalance(p.id) > 0)

  const filteredTx =
    txFilter === "all"
      ? deposits
      : deposits.filter((d) => d.type === txFilter)

  return (
    <div className="flex flex-col gap-6">
      {/* Wallet card */}
      <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Wallet className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-semibold text-foreground">
                  {address ? truncateAddress(address) : ""}
                </p>
                <button
                  onClick={copyAddress}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{network}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshBalance()}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Refresh balance"
              title="Refresh balance"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={disconnect}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Balance"
          value={`${balance} XLM`}
        />
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Net Deposited"
          value={`${netDeposited.toLocaleString()} XLM`}
        />
        <StatCard
          icon={<TrendingDown className="h-3.5 w-3.5" />}
          label="Total Withdrawn"
          value={`${totalWithdrawn.toLocaleString()} XLM`}
        />
        <StatCard
          icon={<Ticket className="h-3.5 w-3.5" />}
          label="Total Tickets"
          value={totalTickets.toLocaleString()}
          accent
        />
        <StatCard
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Next Draw"
          value={countdowns[nextDraw.id] ?? "--"}
          sublabel={nextDraw.name}
        />
      </div>

      {/* My Results section */}
      <MyResultsSection results={myResults} loading={resultsLoading} />

      {/* Your Pools breakdown */}
      {userPools.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
            <Sparkles className="h-4 w-4 text-accent" />
            Your Active Pools
          </h3>
          <div className="grid gap-4 lg:grid-cols-3">
            {userPools.map((pool) => {
              const poolBal = getPoolBalance(pool.id)
              const canClaim = claimableByPool[pool.id]
              return (
                <div
                  key={pool.id}
                  className="rounded-xl border border-border bg-card/50 p-5 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-display text-base font-bold text-foreground">
                        {pool.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {pool.frequency}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-mono text-accent">
                      <Clock className="h-3 w-3" />
                      {countdowns[pool.id] ?? "--"}
                    </div>
                  </div>

                  <div className="rounded-lg bg-secondary/30 p-3 mb-4">
                    <p className="text-xs text-muted-foreground">Deposited</p>
                    <p className="font-display text-base font-bold text-foreground">
                      {poolBal.toLocaleString()} XLM
                    </p>
                  </div>

                  {onWithdraw && (
                    canClaim ? (
                      <button
                        onClick={() => onWithdraw(pool)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary"
                      >
                        Claim principal
                      </button>
                    ) : (
                      <p className="text-center text-xs text-muted-foreground py-2">
                        Draw not ended — you can claim principal after the draw.
                      </p>
                    )
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-accent" />
            <h3 className="font-display text-sm font-bold text-foreground">
              Transaction History
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex items-center gap-1 rounded-lg bg-secondary/50 p-0.5">
              {(["all", "deposit", "withdraw", "claim", "payout"] as TxFilter[]).map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => setTxFilter(key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${txFilter === key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Ticket className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {txFilter === "all"
                ? "No transactions yet. Choose a pool to make your first deposit."
                : `No ${txFilter} transactions found.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredTx.map((entry) => (
              <TransactionRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── My Results Section ───────────────────────────────────────────────────────

function MyResultsSection({
  results,
  loading,
}: {
  results: MyResultsData
  loading: boolean
}) {
  // Only show wins that had an actual prize (prizeAmount > 0)
  const realWins = results.won.filter((d) => d.prizeAmount > 0)
  const refunds = results.payouts.filter((p) => p.payoutType === "refund")
  const hasContent = realWins.length > 0 || refunds.length > 0

  if (loading && !hasContent) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm animate-pulse">
        <div className="h-4 w-32 rounded bg-secondary/60 mb-4" />
        <div className="h-16 rounded bg-secondary/30" />
      </div>
    )
  }

  if (!hasContent) return null

  return (
    <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <h3 className="font-display text-sm font-bold text-foreground">My Draw Results</h3>
        {results.winCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
            🏆 {results.winCount} {results.winCount === 1 ? "Win" : "Wins"}
          </span>
        )}
      </div>

      <div className="divide-y divide-border/50">
        {/* Won draws — only shown when prizeAmount > 0 */}
        {realWins.map((draw) => (
          <div
            key={draw.id}
            className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-secondary/20"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400/10">
                <Trophy className="h-4 w-4 text-yellow-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    +{draw.prizeAmount.toLocaleString()} XLM
                  </p>
                  <span className="inline-flex items-center rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs text-yellow-400">
                    🎉 You Won!
                  </span>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{draw.poolType} Pool</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{getTimeAgo(new Date(draw.drawnAt))}</p>
                <p className="text-xs text-muted-foreground capitalize">{draw.payoutStatus}</p>
              </div>
              {draw.txHashes[0] && isStellarTxHash(draw.txHashes[0]) && (
                <a
                  href={stellarExpertTxUrl(draw.txHashes[0])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent"
                  aria-label="View on Stellar Expert"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Refunds */}
        {refunds.map((dep) => (
          <div
            key={dep.id}
            className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-secondary/20"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/10">
                <RotateCcw className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    +{dep.amount.toLocaleString()} XLM
                  </p>
                  <span className="inline-flex items-center rounded-full bg-blue-400/10 px-2 py-0.5 text-xs text-blue-400">
                    Principal Returned
                  </span>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{dep.poolType} Pool</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{getTimeAgo(new Date(dep.payoutAt))}</p>
              </div>
              {dep.payoutTxHash && isStellarTxHash(dep.payoutTxHash) && (
                <a
                  href={stellarExpertTxUrl(dep.payoutTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent"
                  aria-label="View on Stellar Expert"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Summary row */}
        {(results.totalWon > 0 || results.totalRefunded > 0) && (
          <div className="flex items-center justify-between px-6 py-3 bg-secondary/10">
            <span className="text-xs text-muted-foreground">Lifetime payout summary</span>
            <div className="flex gap-4 text-xs">
              {results.totalWon > 0 && (
                <span className="text-yellow-400 font-medium">
                  Won: {results.totalWon.toLocaleString()} XLM
                </span>
              )}
              {results.totalRefunded > 0 && (
                <span className="text-blue-400 font-medium">
                  Refunded: {results.totalRefunded.toLocaleString()} XLM
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel?: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        {icon}
        {label}
      </div>
      <p
        className={`font-display text-xl font-bold ${accent ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
      )}
    </div>
  )
}

function TransactionRow({ entry }: { entry: DepositEntry }) {
  const timeAgo = getTimeAgo(entry.timestamp)

  const typeConfig: Record<string, { icon: React.ReactNode; badge: string; label: string; sign: string }> = {
    deposit: {
      icon: <ArrowDownRight className="h-4 w-4 text-accent" />,
      badge: "bg-accent/10 text-accent",
      label: "Deposit",
      sign: "+",
    },
    withdraw: {
      icon: <ArrowUpRight className="h-4 w-4 text-orange-400" />,
      badge: "bg-orange-400/10 text-orange-400",
      label: "Withdraw",
      sign: "-",
    },
    claim: {
      icon: <Sparkles className="h-4 w-4 text-yellow-400" />,
      badge: "bg-yellow-400/10 text-yellow-400",
      label: "Claim",
      sign: "+",
    },
    payout: {
      icon:
        entry.payoutSubtype === "win" ? (
          <Trophy className="h-4 w-4 text-yellow-400" />
        ) : (
          <RotateCcw className="h-4 w-4 text-blue-400" />
        ),
      badge:
        entry.payoutSubtype === "win"
          ? "bg-yellow-400/10 text-yellow-400"
          : "bg-blue-400/10 text-blue-400",
      label: entry.payoutSubtype === "win" ? "Prize 🎉" : "Refund",
      sign: "+",
    },
  }

  const cfg = typeConfig[entry.type] ?? typeConfig.deposit

  return (
    <div className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-secondary/20">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/50">
          {cfg.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {cfg.sign}{(entry.amount ?? 0).toLocaleString()} XLM
            </p>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${cfg.badge}`}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{entry.poolName}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          {entry.type === "deposit" && (
            <p className="text-sm font-semibold text-foreground">
              {(entry.tickets ?? 0).toLocaleString()} tickets
            </p>
          )}
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
            <CheckCircle2 className="h-3 w-3" />
            {entry.status}
          </span>
          {isStellarTxHash(entry.txHash) ? (
            <a
              href={stellarExpertTxUrl(entry.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent"
              aria-label="View on Stellar Expert"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
