"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"

export interface WalletState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  balance: string
  network: string
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

/**
 * Simulates a Freighter wallet connection.
 * In production this would call the Freighter API / Stellar SDK.
 */
function generateStellarAddress(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let addr = "G"
  for (let i = 0; i < 55; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)]
  }
  return addr
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    balance: "0",
    network: "Stellar Testnet",
  })

  // Restore session on mount
  useEffect(() => {
    const saved = globalThis?.sessionStorage?.getItem("luckystake_wallet")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setWallet({
          address: parsed.address,
          isConnected: true,
          isConnecting: false,
          balance: parsed.balance ?? "10,000.00",
          network: "Stellar Testnet",
        })
      } catch {
        // ignore
      }
    }
  }, [])

  const connect = useCallback(async () => {
    setWallet((prev) => ({ ...prev, isConnecting: true }))

    // Simulate wallet popup delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const address = generateStellarAddress()
    const balance = (Math.random() * 15000 + 1000).toFixed(2)

    const newState: WalletState = {
      address,
      isConnected: true,
      isConnecting: false,
      balance: Number(balance).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      network: "Stellar Testnet",
    }

    setWallet(newState)
    globalThis?.sessionStorage?.setItem(
      "luckystake_wallet",
      JSON.stringify({ address, balance: newState.balance })
    )
  }, [])

  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      isConnected: false,
      isConnecting: false,
      balance: "0",
      network: "Stellar Testnet",
    })
    globalThis?.sessionStorage?.removeItem("luckystake_wallet")
  }, [])

  return (
    <WalletContext.Provider value={{ ...wallet, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) throw new Error("useWallet must be used inside WalletProvider")
  return context
}

export { truncateAddress }
