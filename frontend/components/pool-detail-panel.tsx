"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
import {
  X,
  Clock,
  Users,
  TrendingUp,
  Ticket,
  Shield,
  ExternalLink,
  ArrowRight,
  BarChart3,
} from "lucide-react"
import { type Pool, formatCountdown } from "@/lib/pool-data"
import {
  getDepositsByPool,
  subscribe,
  getDeposits,
  type DepositEntry,
} from "@/lib/deposit-store"

interface Props {
  pool: Pool | null
  open: boolean
  onClose: () => void
  onDeposit: (pool: Pool) => void
  onWithdraw: (pool: Pool) => void
}

function useDeposits() {
  return useSyncExternalStore(subscribe, getDeposits, getDeposits)
}

export function PoolDetailPanel({
  pool,
  open,
  onClose,
  onDeposit,
  onWithdraw,
}: Props) {
  const [countdown, setCountdown] = useState("")
  const allDeposits = useDeposits()

  useEffect(() => {
    if (!pool) return
    function tick() {
      setCountdown(formatCountdown(pool!.drawTime))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [pool])

  if (!open || !pool) return null

  const myDeposits = getDepositsByPool(pool.id)
  const myTotal = myDeposits.reduce((s, d) => s + d.amount, 0)
  const myTickets = myDeposits.reduce((s, d) => s + d.tickets, 0)

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-end">
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg overflow-y-auto border-l border-border bg-card shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur-sm">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              {pool.name}
            </h2>
            <p className="text-sm text-muted-foreground">{pool.frequency}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Prize + countdown */}
          <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Current Prize Pool
            </p>
            <p className="font-display text-5xl font-bold text-foreground">
              {pool.prizeFormatted}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm text-accent">
              <Clock className="h-4 w-4" />
              Next draw in {countdown}
            </div>
          </div>

          {/* Pool stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Total Value Locked"
              value={pool.tvl}
            />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Participants"
              value={pool.participantsFormatted}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="APY"
              value={pool.apy}
              accent
            />
            <StatCard
              icon={<Ticket className="h-4 w-4" />}
              label="Ticket Ratio"
              value={pool.ticketRatio}
            />
          </div>

          {/* My position */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Shield className="h-4 w-4 text-accent" />
              Your Position
            </h3>
            {myDeposits.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  You have not deposited into this pool yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Deposited</p>
                  <p className="font-display text-lg font-bold text-foreground">
                    ${myTotal.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Tickets</p>
                  <p className="font-display text-lg font-bold text-accent">
                    {myTickets.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Entries</p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {myDeposits.length}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recent deposits in this pool */}
          {myDeposits.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Your Deposits in This Pool
              </h3>
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/50">
                {myDeposits.slice(0, 5).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        ${d.amount.toLocaleString()} USDC
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.tickets.toLocaleString()} tickets
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pool info */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Pool Details
            </h3>
            <div className="rounded-xl border border-border divide-y divide-border/50">
              <InfoRow label="Minimum Deposit" value={`$${pool.minDeposit} USDC`} />
              <InfoRow label="Draw Frequency" value={pool.frequency} />
              <InfoRow label="Yield Source" value="Stellar DeFi (Blend + Soroswap)" />
              <InfoRow label="Smart Contract" value="Soroban Verified" />
              <InfoRow label="Withdrawal" value="Instant (no lock-up)" />
            </div>
          </div>

          {/* Contract link */}
          <a
            href="#"
            className="flex items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            View Contract on Stellar Expert
          </a>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => onDeposit(pool)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-4 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90"
            >
              Deposit
              <ArrowRight className="h-4 w-4" />
            </button>
            {myDeposits.length > 0 && (
              <button
                onClick={() => onWithdraw(pool)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-4 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
              >
                Withdraw
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
        {icon}
        {label}
      </div>
      <p
        className={`font-display text-lg font-bold ${accent ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
