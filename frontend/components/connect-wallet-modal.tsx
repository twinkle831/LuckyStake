"use client"

/**
 * components/connect-wallet-modal.tsx
 *
 * Place at: components/connect-wallet-modal.tsx
 *
 * After wallet approves → calls setConnection() from wallet-context
 * which automatically: fetches real balance + authenticates with backend.
 */

import { useWallet } from "@/context/wallet-context"
import {
  X, Loader2, Wallet, CheckCircle2,
  ExternalLink, AlertCircle, ShieldCheck,
} from "lucide-react"
import { useEffect, useState, useCallback, type ReactNode } from "react"
import {
  connectWallet,
  isChromeBrowser,
  WALLET_INSTALL_URLS,
  type WalletType,
  type WalletConnection,
  type WalletError,
} from "@/lib/wallet-connectors"

type ConnState = "idle" | "awaiting_approval" | "loading" | "success" | "error"

interface Props {
  open: boolean
  onClose: () => void
}

const WALLET_META: Record<WalletType, { name: string; subtitle: string; icon: ReactNode }> = {
  freighter: {
    name: "Freighter",
    subtitle: "Recommended for Stellar",
    icon: (
      <svg viewBox="0 0 40 40" className="h-6 w-6" fill="none">
        <rect width="40" height="40" rx="10" fill="#6366F1" />
        <path d="M8 20L20 8L32 20M12 16V30H28V16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="16" y="22" width="8" height="8" rx="1" fill="white" />
      </svg>
    ),
  },
  xbull: {
    name: "xBull",
    subtitle: "Browser Extension",
    icon: (
      <svg viewBox="0 0 40 40" className="h-6 w-6" fill="none">
        <rect width="40" height="40" rx="10" fill="#0EA5E9" />
        <path d="M10 10L20 20M30 10L20 20M20 20V32" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <circle cx="20" cy="20" r="3" fill="white" />
      </svg>
    ),
  },
}

const STATE_HINT: Partial<Record<ConnState, string>> = {
  awaiting_approval: "Check your browser — approve the connection in the wallet popup.",
  loading: "Fetching your balance and authenticating…",
}

export function ConnectWalletModal({ open, onClose }: Props) {
  const { setConnection, address } = useWallet()

  const [active, setActive] = useState<WalletType | null>(null)
  const [state, setState]   = useState<ConnState>("idle")
  const [error, setError]   = useState<WalletError | null>(null)

  useEffect(() => {
    if (open) { setState("idle"); setError(null); setActive(null) }
  }, [open])

  useEffect(() => {
    if (state === "success") {
      const t = setTimeout(onClose, 1200)
      return () => clearTimeout(t)
    }
  }, [state, onClose])

  const handleConnect = useCallback(async (walletType: WalletType) => {
    setActive(walletType)
    setError(null)
    setState("awaiting_approval")

    try {
      // Step 1: open wallet extension popup
      const conn: WalletConnection = await connectWallet(walletType)

      // Step 2: setConnection fetches balance + backend JWT automatically
      setState("loading")
      await setConnection(conn)

      setState("success")
    } catch (err: any) {
      setError(err?.code ? err as WalletError : { code: "UNKNOWN", message: err?.message ?? "Connection failed." })
      setState("error")
    }
  }, [setConnection])

  if (!open) return null

  const isBusy    = state === "awaiting_approval" || state === "loading"
  const isSuccess = state === "success"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={!isBusy ? onClose : undefined} aria-hidden="true" />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl animate-slide-up">
        <button onClick={onClose} disabled={isBusy} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            {isSuccess ? <CheckCircle2 className="h-8 w-8 text-accent" /> : <Wallet className="h-8 w-8 text-accent" />}
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            {isSuccess ? "Wallet Connected" : "Connect Wallet"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSuccess
              ? `${address?.slice(0, 8)}…${address?.slice(-6)}`
              : "Connect your Stellar wallet to start participating in prize pools."}
          </p>
        </div>

        {/* Success */}
        {isSuccess && (
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm text-accent">
              <CheckCircle2 className="h-4 w-4" /> Connected Successfully
            </span>
          </div>
        )}

        {/* Wallet buttons */}
        {!isSuccess && (
          <div className="flex flex-col gap-3 mt-2">
            {(["freighter", "xbull"] as WalletType[]).map((wt) => (
              <WalletBtn
                key={wt}
                meta={WALLET_META[wt]}
                isActive={active === wt && isBusy}
                isDisabled={isBusy && active !== wt}
                onClick={() => handleConnect(wt)}
              />
            ))}
          </div>
        )}

        {/* State hint */}
        {isBusy && STATE_HINT[state] && (
          <div className="mt-4 rounded-xl bg-accent/5 border border-accent/20 p-3 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{STATE_HINT[state]}</p>
          </div>
        )}

        {/* Error */}
        {state === "error" && error && <ErrorBanner error={error} walletType={active} />}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By connecting, you agree to our{" "}
          <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>{" "}
          and <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}

function WalletBtn({ meta, isActive, isDisabled, onClick }: {
  meta: { name: string; subtitle: string; icon: ReactNode }
  isActive: boolean
  isDisabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled || isActive}
      className="flex items-center gap-4 rounded-xl border border-border bg-secondary/30 px-5 py-4 text-left transition-all hover:bg-secondary/60 hover:border-accent/30 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">{meta.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-semibold text-foreground">{meta.name}</p>
        <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
      </div>
      {isActive
        ? <div className="flex items-center gap-2 shrink-0"><Loader2 className="h-4 w-4 animate-spin text-accent" /><span className="text-xs text-accent">Opening…</span></div>
        : <span className="text-xs text-muted-foreground group-hover:text-accent transition-colors shrink-0">Connect</span>}
    </button>
  )
}

function ErrorBanner({ error, walletType }: { error: WalletError; walletType: WalletType | null }) {
  const url = error.installUrl ?? (walletType
    ? isChromeBrowser() ? WALLET_INSTALL_URLS[walletType].chrome : WALLET_INSTALL_URLS[walletType].website
    : null)

  return (
    <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-destructive font-medium">{error.message}</p>
          {error.code === "NOT_INSTALLED" && url && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
              Install from Chrome Web Store <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {error.code === "REJECTED" && (
            <p className="mt-1 text-xs text-muted-foreground">You can try again when ready.</p>
          )}
        </div>
      </div>
    </div>
  )
}