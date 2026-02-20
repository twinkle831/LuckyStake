"use client"

import { useWallet } from "@/context/wallet-context"
import { X, Loader2, Wallet, CheckCircle2 } from "lucide-react"
import { useEffect } from "react"

interface Props {
  open: boolean
  onClose: () => void
}

export function ConnectWalletModal({ open, onClose }: Props) {
  const { connect, isConnecting, isConnected } = useWallet()

  // Auto-close on success
  useEffect(() => {
    if (open && isConnected && !isConnecting) {
      const t = setTimeout(onClose, 800)
      return () => clearTimeout(t)
    }
  }, [open, isConnected, isConnecting, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={!isConnecting ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl animate-slide-up">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            {isConnected ? (
              <CheckCircle2 className="h-8 w-8 text-accent" />
            ) : (
              <Wallet className="h-8 w-8 text-accent" />
            )}
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground">
            {isConnected ? "Wallet Connected" : "Connect Wallet"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isConnected
              ? "You are now connected to LuckyStake."
              : "Connect your Stellar wallet to start participating in prize pools."}
          </p>
        </div>

        {!isConnected && (
          <div className="mt-8 flex flex-col gap-3">
            {/* Freighter */}
            <button
              onClick={connect}
              disabled={isConnecting}
              className="flex items-center gap-4 rounded-xl border border-border bg-secondary/30 px-5 py-4 text-left transition-all hover:bg-secondary/60 hover:border-accent/30 disabled:opacity-60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-semibold text-foreground">Freighter Wallet</p>
                <p className="text-xs text-muted-foreground">Recommended for Stellar</p>
              </div>
              {isConnecting ? (
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              ) : (
                <span className="text-xs text-muted-foreground">Detect</span>
              )}
            </button>

            {/* xBull */}
            <button
              onClick={connect}
              disabled={isConnecting}
              className="flex items-center gap-4 rounded-xl border border-border bg-secondary/30 px-5 py-4 text-left transition-all hover:bg-secondary/60 hover:border-accent/30 disabled:opacity-60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Wallet className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-semibold text-foreground">xBull Wallet</p>
                <p className="text-xs text-muted-foreground">Browser Extension</p>
              </div>
              {isConnecting ? (
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              ) : (
                <span className="text-xs text-muted-foreground">Detect</span>
              )}
            </button>
          </div>
        )}

        {isConnected && (
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm text-accent">
              <CheckCircle2 className="h-4 w-4" />
              Connected Successfully
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By connecting, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
