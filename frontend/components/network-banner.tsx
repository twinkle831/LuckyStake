"use client"

import { useState } from "react"
import { AlertTriangle, X, Wifi } from "lucide-react"
import { useWallet } from "@/context/wallet-context"

export function NetworkBanner() {
  const { isConnected, network } = useWallet()
  const [dismissed, setDismissed] = useState(false)

  // Show banner when connected to testnet
  const isTestnet = network === "Stellar Testnet"

  if (!isConnected || dismissed || isTestnet) return null

  return (
    <div
      className={`relative z-[60] flex items-center justify-center gap-3 px-6 py-2 text-xs font-medium ${
        isTestnet
          ? "bg-yellow-500/10 text-yellow-500 border-b border-yellow-500/20"
          : "bg-accent/10 text-accent border-b border-accent/20"
      }`}
    >
      <div className="flex items-center gap-2">
        {isTestnet ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : (
          <Wifi className="h-3.5 w-3.5" />
        )}
        <span>
          {isTestnet
            ? "You are connected to Stellar Testnet. Transactions use test funds only."
            : `Connected to ${network}`}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
