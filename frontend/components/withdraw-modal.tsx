"use client"

import { useState, useMemo, useEffect } from "react"
import { X, Loader2, ArrowRight, AlertCircle, ExternalLink } from "lucide-react"
import { type Pool } from "@/lib/pool-data"
import { addPayout } from "@/lib/deposit-store"
import { useWallet } from "@/context/wallet-context"
import { isStellarTxHash, stellarExpertTxUrl } from "@/lib/stellar-explorer"
import { executeWithdraw } from "@/lib/soroban-contracts"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
const SS_KEY = "luckystake_wallet"

function getToken(): string | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY)
    return raw ? (JSON.parse(raw)?.token ?? null) : null
  } catch { return null }
}

interface Props {
  pool: Pool | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type Step = "input" | "confirm" | "success"

/** Deposit from backend /my with claimable flag */
interface MyDeposit {
  id: string
  poolType: string
  amount: number
  claimable?: boolean
  withdrawnAt?: string | null
}

export function WithdrawModal({ pool, open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("input")
  const [isProcessing, setIsProcessing] = useState(false)
  const [withdrawTxHash, setWithdrawTxHash] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [claimableDeposit, setClaimableDeposit] = useState<MyDeposit | null>(null)
  const { address, walletType, refreshBalance } = useWallet()

  // Fetch /my when modal opens — user can only claim principal after the pool draw ends
  useEffect(() => {
    if (!open || !pool) {
      setClaimableDeposit(null)
      return
    }
    const token = getToken()
    if (!token) return
    fetch(`${API}/api/deposits/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.deposits) return
        const d = data.deposits.find(
          (x: MyDeposit) => x.poolType === pool.id && x.claimable
        )
        setClaimableDeposit(d ?? null)
      })
      .catch(() => setClaimableDeposit(null))
  }, [open, pool])

  const canClaim = !!claimableDeposit && claimableDeposit.amount > 0

  function handleClose() {
    setStep("input")
    setIsProcessing(false)
    setWithdrawTxHash(null)
    setApiError(null)
    onClose()
  }

  async function handleConfirm() {
    if (!pool || !claimableDeposit || !address || !walletType) return
    setStep("confirm")
    setIsProcessing(true)
    setApiError(null)

    try {
      const result = await executeWithdraw(
        pool.id,
        claimableDeposit.amount,
        address,
        walletType
      )
      if (!result.success || !result.txHash) {
        setApiError(result.error ?? "Claim failed")
        setStep("input")
        setIsProcessing(false)
        return
      }
      const token = getToken()
      if (token) {
        await fetch(`${API}/api/deposits/${claimableDeposit.id}/claim-complete`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ txHash: result.txHash }),
        })
      }
      setWithdrawTxHash(result.txHash)
      addPayout(pool.id, pool.name, claimableDeposit.amount, "refund", result.txHash)
      try { await refreshBalance() } catch { /* ignore */ }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Network error")
      setStep("input")
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
            {claimableDeposit ? (
              <>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">
                  Claim principal
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  The draw is over. Get your principal back from the smart contract — it will appear in your wallet with a real transaction.
                </p>

                <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Principal to claim
                  </p>
                  <p className="font-display text-4xl font-bold text-accent">
                    {claimableDeposit.amount.toLocaleString()} XLM
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    From {pool.name} — paid by the contract (from Blend)
                  </p>
                </div>

                {apiError && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {apiError}
                  </div>
                )}

                <button
                  onClick={handleConfirm}
                  disabled={!canClaim}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Claim {claimableDeposit.amount.toLocaleString()} XLM
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">
                  Claim after draw
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  You can claim your principal only after this pool&apos;s draw has ended. Once the draw runs, you&apos;ll see a &quot;Claim principal&quot; button here and on your dashboard.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-4 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Close
                </button>
              </>
            )}
          </>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && claimableDeposit && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-accent mb-6" />
            <h3 className="font-display text-xl font-bold text-foreground">
              Claiming principal...
            </h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
              Confirm in your wallet — principal will appear with a real tx hash.
            </p>
            <div className="mt-6 rounded-xl bg-secondary/30 p-4 w-full">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-foreground">
                  {claimableDeposit.amount.toLocaleString()} XLM
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Pool</span>
                <span className="text-foreground">{pool.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">
              Principal claimed
            </h3>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Principal is in your wallet. View the transaction on Stellar Expert below.
            </p>

            {/* Show real Stellar tx hash */}
            {withdrawTxHash && isStellarTxHash(withdrawTxHash) && (
              <a
                href={stellarExpertTxUrl(withdrawTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-accent transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on Stellar Expert
              </a>
            )}

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
