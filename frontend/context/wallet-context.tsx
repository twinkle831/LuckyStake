"use client"

/**
 * context/wallet-context.tsx
 *
 * Drop-in replacement. Preserves EVERY existing field:
 *   address, isConnected, isConnecting, balance, network
 *   connect(), disconnect(), truncateAddress()
 *
 * What's new:
 *   walletType        — "freighter" | "xbull" | null
 *   setConnection()   — called by ConnectWalletModal after real wallet connects
 *
 * The old connect() no longer simulates — it just logs a warning.
 * Wire your "Connect Wallet" button to open the modal instead.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"

import {
  type WalletType,
  type WalletConnection,
  authenticateWithBackend,
} from "@/lib/wallet-connectors"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  balance: string          // human-readable USDC balance e.g. "1,234.56"
  network: string          // human-readable label e.g. "Stellar Testnet"
  walletType: WalletType | null
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  /** Called by ConnectWalletModal after wallet popup approves */
  setConnection: (conn: WalletConnection) => Promise<void>
  token: string | null
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextType | undefined>(undefined)

const DEFAULT: WalletState = {
  address: null,
  isConnected: false,
  isConnecting: false,
  balance: "0",
  network: "Stellar Testnet",
  walletType: null,
}

const SS_KEY = "luckystake_wallet"

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(DEFAULT)
  const [token, setToken] = useState<string | null>(null)

  // Restore session on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved?.address) {
        setWallet({
          ...DEFAULT,
          address: saved.address,
          isConnected: true,
          balance: saved.balance ?? "0",
          network: saved.network ?? "Stellar Testnet",
          walletType: saved.walletType ?? null,
        })
        setToken(saved.token ?? null)
      }
    } catch { /* ignore */ }
  }, [])

  /**
   * Called by ConnectWalletModal right after wallet extension popup approves.
   * 1. Fetches real USDC balance from Stellar Horizon via backend
   * 2. Authenticates with backend → gets JWT
   * 3. Updates context + persists session
   */
  const setConnection = useCallback(async (conn: WalletConnection) => {
    setWallet((prev) => ({ ...prev, isConnecting: true }))

    // Fetch real balance from backend (calls Stellar Horizon)
    let usdcBalance = "0"
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const res = await fetch(`${API}/api/wallet/${conn.address}`)
      if (res.ok) {
        const data = await res.json()
        usdcBalance = data.usdcBalance
          ? Number(data.usdcBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "0"
      }
    } catch { /* backend not running, fine */ }

    // Authenticate with backend → JWT
    const jwt = await authenticateWithBackend(conn.address)
    setToken(jwt)

    const networkLabel = conn.network.includes("Public Global")
      ? "Stellar Mainnet"
      : "Stellar Testnet"

    const newState: WalletState = {
      address: conn.address,
      isConnected: true,
      isConnecting: false,
      balance: usdcBalance,
      network: networkLabel,
      walletType: conn.walletType,
    }

    setWallet(newState)

    // Persist so page refresh restores the session
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({ ...newState, token: jwt }))
    } catch { /* ignore */ }
  }, [])

  /**
   * Legacy connect() — kept for backward compatibility.
   * If you call this directly, open the ConnectWalletModal instead.
   */
  const connect = useCallback(async () => {
    console.warn(
      "[WalletContext] connect() called directly — open <ConnectWalletModal> instead"
    )
  }, [])

  const disconnect = useCallback(() => {
    setWallet(DEFAULT)
    setToken(null)
    try { sessionStorage.removeItem(SS_KEY) } catch { /* ignore */ }
  }, [])

  return (
    <WalletContext.Provider value={{ ...wallet, token, connect, disconnect, setConnection }}>
      {children}
    </WalletContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>")
  return ctx
}

export function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}