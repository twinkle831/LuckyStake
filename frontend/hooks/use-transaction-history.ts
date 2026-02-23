/**
 * use-transaction-history.ts
 *
 * Fetches the user's full transaction history from the backend
 * (GET /api/deposits/history) and hydrates the in-memory deposit-store.
 *
 * This ensures the dashboard's transaction list survives logout / page
 * refresh, because the backend persists deposits and payout info to disk.
 */
import { useEffect, useRef } from "react"
import { addDeposit, addPayout, getDeposits } from "@/lib/deposit-store"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
const SS_KEY = "luckystake_wallet"

function getToken(): string | null {
    if (typeof window === "undefined") return null
    try {
        const raw = sessionStorage.getItem(SS_KEY)
        return raw ? (JSON.parse(raw)?.token ?? null) : null
    } catch {
        return null
    }
}

function poolLabel(poolType: string) {
    return poolType.charAt(0).toUpperCase() + poolType.slice(1) + " Pool"
}

export function useTransactionHistory(address: string | null | undefined) {
    const hydrated = useRef(false)

    useEffect(() => {
        if (!address || hydrated.current) return

        const token = getToken()
        if (!token) return

        async function hydrate() {
            try {
                const res = await fetch(`${API}/api/deposits/history`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!res.ok) return

                const { history } = await res.json()
                if (!Array.isArray(history) || history.length === 0) return

                // Dedup by txHash — don't insert rows already in the store
                const existing = new Set(getDeposits().map((d) => d.txHash))

                for (const entry of history) {
                    const amount = typeof entry.amount === "number" ? entry.amount : Number(entry.amount ?? 0)
                    const name = poolLabel(entry.poolType ?? "")

                    if (entry.payoutType === "refund" || entry.payoutType === "win") {
                        const txHash = entry.payoutTxHash ?? undefined
                        if (txHash && existing.has(txHash)) continue
                        addPayout(entry.poolType, name, amount, entry.payoutType as "win" | "refund", txHash)
                    } else {
                        const txHash = entry.txHash ?? ""
                        if (txHash && existing.has(txHash)) continue
                        addDeposit({
                            poolId: entry.poolType,
                            poolName: name,
                            amount,
                            tickets: typeof entry.tickets === "number" ? entry.tickets : Number(entry.tickets ?? 0),
                            winProbability: "—",
                            txHash,
                        })
                    }
                }

                hydrated.current = true
            } catch {
                // Silent — store stays empty, app still works
            }
        }

        hydrate()
        // Re-run if address changes (different wallet logged in)
    }, [address])
}
