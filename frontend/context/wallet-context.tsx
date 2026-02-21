"use client"

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

export interface WalletState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  balance: string
  network: string
  walletType: WalletType | null
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  setConnection: (conn: WalletConnection) => Promise<void>
  token: string | null
}

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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(DEFAULT)
  const [token, setToken] = useState<string | null>(null)

  // Restore session on mount — and automatically re-authenticate if token is missing
  useEffect(() => {
    async function restoreSession() {
      try {
        const raw = sessionStorage.getItem(SS_KEY)
        if (!raw) return
        const saved = JSON.parse(raw)
        if (!saved?.address) return

        // Restore wallet state immediately so UI shows connected
        setWallet({
          ...DEFAULT,
          address: saved.address,
          isConnected: true,
          balance: saved.balance ?? "0",
          network: saved.network ?? "Stellar Testnet",
          walletType: saved.walletType ?? null,
        })

        // If we have a token, use it — otherwise silently re-authenticate
        if (saved.token) {
          setToken(saved.token)
        } else {
          // Token was missing (backend was down when wallet first connected)
          // Re-run auth flow silently on page load
          const newToken = await authenticateWithBackend(saved.address)
          if (newToken) {
            setToken(newToken)
            // Persist the new token so subsequent refreshes don't need to re-auth
            saved.token = newToken
            sessionStorage.setItem(SS_KEY, JSON.stringify(saved))
          }
        }
      } catch {
        /* ignore — user just won't be authenticated */
      }
    }

    restoreSession()
  }, [])

  const setConnection = useCallback(async (conn: WalletConnection) => {
    setWallet((prev) => ({ ...prev, isConnecting: true }))

    let xlmBalance = "0"
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const res = await fetch(`${API}/api/wallet/${conn.address}`)
      if (res.ok) {
        const data = await res.json()
        xlmBalance = data.xlmBalance != null
          ? Number(data.xlmBalance).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 7,
            })
          : "0"
      }
    } catch { /* backend not running */ }

    const jwt = await authenticateWithBackend(conn.address)
    setToken(jwt)

    const networkLabel = conn.network.includes("Public Global")
      ? "Stellar Mainnet"
      : "Stellar Testnet"

    const newState: WalletState = {
      address: conn.address,
      isConnected: true,
      isConnecting: false,
      balance: xlmBalance,
      network: networkLabel,
      walletType: conn.walletType,
    }

    setWallet(newState)

    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({ ...newState, token: jwt }))
    } catch { /* ignore */ }
  }, [])

  const connect = useCallback(async () => {
    console.warn("[WalletContext] connect() called directly — open <ConnectWalletModal> instead")
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

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>")
  return ctx
}

export function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}