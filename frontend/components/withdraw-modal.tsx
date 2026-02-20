"use client"

import { useState, useMemo } from "react"
import {
  X,
  Loader2,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Banknote,
  Sparkles,
} from "lucide-react"
import { type Pool } from "@/lib/pool-data"
import {
  getPoolBalance,
  getAccruedInterest,
  addWithdrawal,
  addClaim,
} from "@/lib/deposit-store"

interface Props {
  pool: Pool | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type Mode = "withdraw" | "claim"
type Step = "input" | "confirm" | "success"

export function WithdrawModal({ pool, open, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("withdraw")
  const [amount, setAmount] = useState("")
  const [step, setStep] = useState<Step>("input")
  const [isProcessing, setIsProcessing] = useState(false)

  const poolBalance = useMemo(
    () => (pool ? getPoolBalance(pool.id) : 0),
    [pool, open]
  )
  const accrued = useMemo(
    () => (pool ? getAccruedInterest(pool.id) : 0),
    [pool, open]
  )

  const numAmount = parseFloat(amount) || 0
  const maxWithdraw = poolBalance
  const isValid =
    mode === "withdraw"
      ? numAmount > 0 && numAmount <= maxWithdraw
      : accrued > 0

  function handleClose() {
    setAmount("")
    setStep("input")
    setMode("withdraw")
    setIsProcessing(false)
    onClose()
  }

  async function handleConfirm() {
    if (!pool) return
    setStep("confirm")
    setIsProcessing(true)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    if (mode === "withdraw") {
      addWithdrawal(pool.id, pool.name, numAmount)
    } else {
      addClaim(pool.id, pool.name, accrued)
    }

    setIsProcessing(false)
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

        {/* Step: Input */}
        {step === "input" && (
          <>
            {/* Mode toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-secondary/50 p-1 mb-6">
              <button
                onClick={() => setMode("withdraw")}
                className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
                  mode === "withdraw"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Withdraw
                </div>
              </button>
              <button
                onClick={() => setMode("claim")}
                className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
                  mode === "claim"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Claim Interest
                </div>
              </button>
            </div>

            {mode === "withdraw" ? (
              <>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">
                  Withdraw from {pool.name}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Withdraw your principal. Tickets will be removed proportionally.
                </p>

                {/* Amount input */}
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-muted-foreground">
                      Withdraw Amount
                    </label>
                    <span className="text-xs text-muted-foreground">
                      Available:{" "}
                      <span className="text-foreground">
                        ${poolBalance.toLocaleString()} USDC
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 bg-transparent font-display text-3xl font-bold text-foreground outline-none placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground">
                      USDC
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() =>
                          setAmount(
                            String(
                              Math.floor(poolBalance * (pct / 100) * 100) / 100
                            )
                          )
                        }
                        className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Warning */}
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-yellow-500 mb-1">
                      Ticket Reduction
                    </p>
                    Withdrawing will reduce your tickets and lower your odds for
                    the next draw. Your remaining balance will continue earning
                    tickets.
                  </div>
                </div>

                {numAmount > maxWithdraw && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Exceeds your pool balance
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">
                  Claim Interest
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Claim accrued yield without affecting your principal or tickets.
                </p>

                <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Accrued Interest
                  </p>
                  <p className="font-display text-4xl font-bold text-accent">
                    ${accrued.toFixed(2)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    From {pool.name} yield generation
                  </p>
                </div>

                {accrued === 0 && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" />
                    No interest accrued yet. Deposit and wait for yield to
                    accumulate.
                  </div>
                )}
              </>
            )}

            <button
              onClick={handleConfirm}
              disabled={!isValid}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mode === "withdraw"
                ? `Withdraw ${numAmount > 0 ? `$${numAmount.toLocaleString()}` : ""}`
                : `Claim $${accrued.toFixed(2)}`}
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-accent mb-6" />
            <h3 className="font-display text-xl font-bold text-foreground">
              {mode === "withdraw" ? "Processing Withdrawal" : "Claiming Interest"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
              Please approve the Soroban{" "}
              {mode === "withdraw" ? "withdraw()" : "claimYield()"} call in your
              wallet.
            </p>
            <div className="mt-6 rounded-xl bg-secondary/30 p-4 w-full">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-foreground">
                  ${mode === "withdraw" ? numAmount.toLocaleString() : accrued.toFixed(2)} USDC
                </span>
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

        {/* Step: Success */}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">
              {mode === "withdraw" ? "Withdrawal Complete" : "Interest Claimed"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              {mode === "withdraw"
                ? `$${numAmount.toLocaleString()} USDC has been returned to your wallet from the ${pool.name}.`
                : `$${accrued.toFixed(2)} USDC interest has been sent to your wallet.`}
            </p>

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
