"use client"

import { useState, useMemo, useCallback } from "react"
import { X, Loader2, ArrowRight, Ticket, TrendingUp, Shield, AlertCircle, RefreshCw } from "lucide-react"
import { useWallet } from "@/context/wallet-context"
import { type Pool, calcTickets, calcWinProbability } from "@/lib/pool-data"
import { addDeposit } from "@/lib/deposit-store"
import { executeDeposit } from "@/lib/soroban-contracts"
import { authenticateWithBackend } from "@/lib/wallet-connectors"

interface Props {
  pool: Pool | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DepositModal({ pool, open, onClose, onSuccess }: Props) {
  const { isConnected, balance, address, walletType, token, setConnection } = useWallet()
  const [amount, setAmount] = useState("")
  const [privacyMode, setPrivacyMode] = useState(false)
  const [isDepositing, setIsDepositing] = useState(false)
  const [isReauthing, setIsReauthing] = useState(false)
  const [step, setStep] = useState<"input" | "confirm" | "success">("input")
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string>("")

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
    setError(null)
    onClose()
  }

  /**
   * Re-authenticate with the backend without requiring the user to
   * re-open the wallet extension. We already have their address from
   * the existing wallet connection — just run the challenge/verify flow again.
   */
  const handleReauth = useCallback(async () => {
    if (!address) return
    setIsReauthing(true)
    setError(null)
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

      // Step 1: challenge
      const challengeRes = await fetch(`${API}/api/auth/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: address }),
      })
      if (!challengeRes.ok) throw new Error(`Challenge failed: ${challengeRes.status}`)
      const { nonce } = await challengeRes.json()

      // Step 2: verify → get new JWT
      const verifyRes = await fetch(`${API}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: address, nonce }),
      })
      if (!verifyRes.ok) throw new Error(`Verify failed: ${verifyRes.status}`)
      const { token: newToken } = await verifyRes.json()

      // Persist new token in wallet context via sessionStorage patch
      // (wallet-context restores from sessionStorage on mount)
      try {
        const raw = sessionStorage.getItem("luckystake_wallet")
        if (raw) {
          const saved = JSON.parse(raw)
          saved.token = newToken
          sessionStorage.setItem("luckystake_wallet", JSON.stringify(saved))
        }
      } catch { /* ignore */ }

      // Force a page reload to re-hydrate context with the new token
      // This is the safest way without needing a setToken() export
      window.location.reload()
    } catch (err: any) {
      setError(`Re-authentication failed: ${err?.message}. Please disconnect and reconnect your wallet.`)
    } finally {
      setIsReauthing(false)
    }
  }, [address])

  async function handleDeposit() {
    if (!pool || !isValid || !address || !walletType) {
      setError("Please connect your wallet first")
      return
    }

    // Token is null — backend was unreachable when wallet connected.
    // Show a helpful inline re-auth button instead of blocking completely.
    if (!token) {
      setError("SESSION_EXPIRED")
      return
    }

    setError(null)
    setStep("confirm")
    setIsDepositing(true)

    try {
      // 1. Execute on-chain deposit: build → sign → submit → confirm
      const result = await executeDeposit(pool.id, numAmount, address, walletType)

      if (!result.success) {
        throw new Error(result.error || "Deposit failed")
      }

      setTxHash(result.txHash)

      // 2. Record deposit in backend
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const response = await fetch(`${API}/api/deposits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          poolType: pool.id,
          amount: numAmount,
          txHash: result.txHash,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          setError("SESSION_EXPIRED")
          setIsDepositing(false)
          setStep("input")
          return
        }
        throw new Error(errorData.error || `Backend error: ${response.status}`)
      }

      // 3. Update local store
      addDeposit({
        poolId: pool.id,
        poolName: pool.name,
        amount: numAmount,
        tickets,
        winProbability: winProb,
      })

      setIsDepositing(false)
      setStep("success")
    } catch (err: any) {
      console.error("Deposit error:", err)
      setError(err?.message || "Failed to complete deposit")
      setIsDepositing(false)
      setStep("input")
    }
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
                  Balance: <span className="text-foreground">{balance} XLM</span>
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
                  XLM
                </span>
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mt-3">
                {[10, 50, 100, 500].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmount(String(val))}
                    className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {val} XLM
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
                Minimum deposit is {pool.minDeposit} XLM
              </div>
            )}
            {numAmount > balanceNum && (
              <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Insufficient balance
              </div>
            )}

            {/* Session expired — inline re-auth banner */}
            {error === "SESSION_EXPIRED" && (
              <div className="mt-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-destructive font-medium">Session expired</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your login session expired. Click below to reconnect — no wallet popup needed.
                    </p>
                    <button
                      onClick={handleReauth}
                      disabled={isReauthing}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-60"
                    >
                      {isReauthing
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Reconnecting…</>
                        : <><RefreshCw className="h-3 w-3" /> Refresh Session</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Generic errors */}
            {error && error !== "SESSION_EXPIRED" && (
              <div className="mt-3 flex items-center gap-2 text-xs text-destructive rounded-lg bg-destructive/10 p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Deposit button */}
            <button
              onClick={handleDeposit}
              disabled={!isValid || numAmount <= 0 || isReauthing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Deposit {numAmount > 0 ? `${numAmount.toLocaleString()} XLM` : ""}
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* ── Step: Confirming ───────────────────────── */}
        {step === "confirm" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-accent mb-6" />
            <h3 className="font-display text-xl font-bold text-foreground">
              {txHash ? "Confirming Transaction" : "Signing Transaction"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
              {txHash
                ? "Waiting for transaction confirmation on Stellar network..."
                : "Please approve the Soroban deposit() call in your wallet."}
            </p>
            <div className="mt-6 rounded-xl bg-secondary/30 p-4 w-full">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-foreground">{numAmount.toLocaleString()} XLM</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Pool</span>
                <span className="text-foreground">{pool.name}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Est. Fee</span>
                <span className="text-foreground">~0.0001 XLM</span>
              </div>
              {txHash && (
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-border">
                  <span className="text-muted-foreground">Transaction</span>
                  <span className="text-foreground font-mono text-xs break-all text-right max-w-[200px]">
                    {txHash.slice(0, 8)}...{txHash.slice(-8)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step: Success ──────────────────────────── */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">Deposit Confirmed</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Your {numAmount.toLocaleString()} XLM has been deposited into the{" "}
              {pool.name}. You received {tickets.toLocaleString()} tickets.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 w-full">
              <div className="rounded-xl bg-secondary/50 p-4 text-center">
                <p className="text-xs text-muted-foreground">Tickets</p>
                <p className="font-display text-lg font-bold text-foreground">{tickets.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-4 text-center">
                <p className="text-xs text-muted-foreground">Win Chance</p>
                <p className="font-display text-lg font-bold text-accent">{winProb}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 w-full">
              <button
                onClick={() => { handleClose(); onSuccess() }}
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