"use client"

import { useState, useMemo } from "react"
import { X, Loader2, ArrowRight, Ticket, TrendingUp, Shield, AlertCircle } from "lucide-react"
import { useWallet } from "@/context/wallet-context"
import { type Pool, calcTickets, calcWinProbability } from "@/lib/pool-data"
import { addDeposit } from "@/lib/deposit-store"

interface Props {
  pool: Pool | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DepositModal({ pool, open, onClose, onSuccess }: Props) {
  const { isConnected, balance } = useWallet()
  const [amount, setAmount] = useState("")
  const [privacyMode, setPrivacyMode] = useState(false)
  const [isDepositing, setIsDepositing] = useState(false)
  const [step, setStep] = useState<"input" | "confirm" | "success">("input")

  const numAmount = parseFloat(amount) || 0

  const tickets = useMemo(
    () => (pool ? calcTickets(numAmount, pool.id) : 0),
    [numAmount, pool]
  )

  const winProb = useMemo(
    () => (pool && numAmount > 0 ? calcWinProbability(tickets, pool, numAmount) : "0%"),
    [tickets, pool, numAmount]
  )

  const balanceNum = parseFloat(balance.replace(/,/g, "")) || 0
  const isValid = numAmount >= (pool?.minDeposit ?? 0) && numAmount <= balanceNum

  function handleClose() {
    setAmount("")
    setStep("input")
    setIsDepositing(false)
    setPrivacyMode(false)
    onClose()
  }

  async function handleDeposit() {
    if (!pool || !isValid) return
    setStep("confirm")
    setIsDepositing(true)

    // Simulate Soroban contract call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    addDeposit({
      poolId: pool.id,
      poolName: pool.name,
      amount: numAmount,
      tickets,
      winProbability: winProb,
    })

    setIsDepositing(false)
    setStep("success")
  }

  if (!open || !pool) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={step !== "confirm" ? handleClose : undefined}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-2xl animate-slide-up">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── Step: Input ────────────────────────────── */}
        {step === "input" && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <Ticket className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Deposit to {pool.name}
                </h2>
                <p className="text-xs text-muted-foreground">{pool.frequency}</p>
              </div>
            </div>

            {/* Amount input */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground">Deposit Amount</label>
                <span className="text-xs text-muted-foreground">
                  Balance: <span className="text-foreground">{balance} USDC</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min={pool.minDeposit}
                  className="flex-1 bg-transparent font-display text-3xl font-bold text-foreground outline-none placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground">
                  USDC
                </span>
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mt-3">
                {[100, 500, 1000, 5000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmount(String(val))}
                    className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    ${val.toLocaleString()}
                  </button>
                ))}
                <button
                  onClick={() => setAmount(String(balanceNum))}
                  className="rounded-lg border border-accent/30 px-3 py-1 text-xs text-accent transition-colors hover:bg-accent/10"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Calculation preview */}
            {numAmount > 0 && (
              <div className="mt-4 rounded-xl bg-secondary/30 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Ticket className="h-4 w-4" />
                    Tickets Received
                  </div>
                  <span className="font-display font-bold text-foreground">
                    {tickets.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Est. Win Probability
                  </div>
                  <span className="font-display font-bold text-accent">{winProb}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Current Prize
                  </div>
                  <span className="font-display font-bold text-foreground">
                    {pool.prizeFormatted}
                  </span>
                </div>
              </div>
            )}

            {/* Privacy mode toggle */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Privacy Mode</p>
                  <p className="text-xs text-muted-foreground">Hide deposit details from public view</p>
                </div>
              </div>
              <button
                onClick={() => setPrivacyMode(!privacyMode)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  privacyMode ? "bg-accent" : "bg-secondary"
                }`}
                role="switch"
                aria-checked={privacyMode}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform ${
                    privacyMode ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Validation messages */}
            {numAmount > 0 && numAmount < pool.minDeposit && (
              <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Minimum deposit is ${pool.minDeposit} USDC
              </div>
            )}
            {numAmount > balanceNum && (
              <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Insufficient balance
              </div>
            )}

            {/* Deposit button */}
            <button
              onClick={handleDeposit}
              disabled={!isValid || numAmount <= 0}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Deposit {numAmount > 0 ? `$${numAmount.toLocaleString()} USDC` : ""}
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* ── Step: Confirming ───────────────────────── */}
        {step === "confirm" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-accent mb-6" />
            <h3 className="font-display text-xl font-bold text-foreground">
              Signing Transaction
            </h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
              Please approve the Soroban deposit() call in your wallet. This
              includes contract call fees.
            </p>
            <div className="mt-6 rounded-xl bg-secondary/30 p-4 w-full">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-foreground">${numAmount.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Pool</span>
                <span className="text-foreground">{pool.name}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Est. Fee</span>
                <span className="text-foreground">~0.01 XLM</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Success ──────────────────────────── */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <svg
                className="h-8 w-8 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">
              Deposit Confirmed
            </h3>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Your ${numAmount.toLocaleString()} USDC has been deposited into the{" "}
              {pool.name}. You received {tickets.toLocaleString()} tickets.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 w-full">
              <div className="rounded-xl bg-secondary/50 p-4 text-center">
                <p className="text-xs text-muted-foreground">Tickets</p>
                <p className="font-display text-lg font-bold text-foreground">
                  {tickets.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-4 text-center">
                <p className="text-xs text-muted-foreground">Win Chance</p>
                <p className="font-display text-lg font-bold text-accent">{winProb}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 w-full">
              <button
                onClick={() => {
                  handleClose()
                  onSuccess()
                }}
                className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90"
              >
                View Dashboard
              </button>
              <button
                onClick={handleClose}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
