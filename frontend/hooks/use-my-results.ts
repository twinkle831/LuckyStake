/**
 * use-my-results.ts
 *
 * Fetches the authenticated user's draw outcomes:
 *   - Draws they won (prizeAmount credited)
 *   - Deposits that were refunded (principal returned)
 *
 * Calls GET /api/draws/my with the JWT from session storage.
 * Polls every 30 seconds.
 */
import { useState, useEffect, useCallback } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
const SS_KEY = "luckystake_wallet"

function getToken(): string | null {
    if (typeof window === "undefined") return null
    try {
        const raw = sessionStorage.getItem(SS_KEY)
        if (!raw) return null
        return JSON.parse(raw)?.token ?? null
    } catch {
        return null
    }
}

export interface WonDraw {
    id: string
    poolType: string
    prizeAmount: number
    drawnAt: string
    payoutStatus: string
    contractTxHash: string | null
    txHashes: string[]
}

export interface RefundDeposit {
    id: string
    poolType: string
    amount: number
    payoutAt: string
    payoutTxHash: string | null
    payoutType: "win" | "refund"
}

export interface MyResultsData {
    won: WonDraw[]
    payouts: RefundDeposit[]
    totalWon: number
    totalRefunded: number
    winCount: number
}

const EMPTY: MyResultsData = {
    won: [],
    payouts: [],
    totalWon: 0,
    totalRefunded: 0,
    winCount: 0,
}

export function useMyResults(pollIntervalMs = 30_000) {
    const [data, setData] = useState<MyResultsData>(EMPTY)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchResults = useCallback(async () => {
        const token = getToken()
        if (!token) return // not authenticated

        setLoading(true)
        try {
            const res = await fetch(`${API}/api/draws/my`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            setData({
                won: json.won ?? [],
                payouts: json.payouts ?? [],
                totalWon: json.totalWon ?? 0,
                totalRefunded: json.totalRefunded ?? 0,
                winCount: json.winCount ?? 0,
            })
            setError(null)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load results")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchResults()
        const timer = setInterval(fetchResults, pollIntervalMs)
        return () => clearInterval(timer)
    }, [fetchResults, pollIntervalMs])

    return { data, loading, error, refetch: fetchResults }
}
