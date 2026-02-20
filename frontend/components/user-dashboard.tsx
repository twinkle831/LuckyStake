"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
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
  getAccruedInterest,
  type DepositEntry,
} from "@/lib/deposit-store"
import { pools, formatCountdown, type Pool } from "@/lib/pool-data"

function useDeposits() {
  return useSyncExternalStore(subscribe, getDeposits, getDeposits)
}

type TxFilter = "all" | "deposit" | "withdraw" | "claim"

interface Props {
  onWithdraw?: (pool: Pool) => void
}

export function UserDashboard({ onWithdraw }: Props) {
  const { address, balance, network, disconnect } = useWallet()
  const deposits = useDeposits()
  const [copied, setCopied] = useState(false)
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})
  const [txFilter, setTxFilter] = useState<TxFilter>("all")

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
          <button
            onClick={disconnect}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Balance"
          value={`${balance} USDC`}
        />
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Net Deposited"
          value={`$${netDeposited.toLocaleString()}`}
        />
        <StatCard
          icon={<TrendingDown className="h-3.5 w-3.5" />}
          label="Total Withdrawn"
          value={`$${totalWithdrawn.toLocaleString()}`}
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
              const interest = getAccruedInterest(pool.id)
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

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg bg-secondary/30 p-3">
                      <p className="text-xs text-muted-foreground">Deposited</p>
                      <p className="font-display text-base font-bold text-foreground">
                        ${poolBal.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        Accrued Interest
                      </p>
                      <p className="font-display text-base font-bold text-accent">
                        ${interest.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {onWithdraw && (
                    <button
                      onClick={() => onWithdraw(pool)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary"
                    >
                      Withdraw / Claim
                    </button>
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
              {(["all", "deposit", "withdraw", "claim"] as TxFilter[]).map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => setTxFilter(key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      txFilter === key
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

  const typeConfig = {
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
  }

  const cfg = typeConfig[entry.type]

  return (
    <div className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-secondary/20">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/50">
          {cfg.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {cfg.sign}${entry.amount.toLocaleString()} USDC
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
              {entry.tickets.toLocaleString()} tickets
            </p>
          )}
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
            <CheckCircle2 className="h-3 w-3" />
            {entry.status}
          </span>
          <a
            href="#"
            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
            aria-label="View on explorer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
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
