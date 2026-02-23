/**
 * use-draws.ts
 *
 * Fetches the public draw history from /api/draws.
 * Polls every 30 seconds for live updates.
 */
import { useState, useEffect } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export interface DrawRecord {
    id: string
    poolType: "weekly" | "biweekly" | "monthly"
    winner: string | null
    prizeAmount: number
    participants: number
    totalTickets: number
    drawnAt: string
    contractTxHash: string | null
    payoutStatus: "pending" | "complete" | "partial" | "failed"
    txHashes: string[]
}

export interface DrawStats {
    totalDrawn: number
    uniqueWinners: number
    totalDraws: number
    largestPrize: number
}

export interface LeaderboardEntry {
    rank: number
    publicKey: string
    totalWon: number
    winCount: number
    lastWon: string | null
    lastPoolType: string | null
}

export function useDraws(limit = 50, pollIntervalMs = 30_000) {
    const [draws, setDraws] = useState<DrawRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        async function fetchDraws() {
            try {
                const res = await fetch(`${API}/api/draws?limit=${limit}`)
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const data = await res.json()
                if (!cancelled) {
                    setDraws(data.draws ?? [])
                    setError(null)
                }
            } catch (e: unknown) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to fetch draws")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchDraws()
        const timer = setInterval(fetchDraws, pollIntervalMs)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [limit, pollIntervalMs])

    return { draws, loading, error }
}

export function useLeaderboard(limit = 50) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [stats, setStats] = useState<DrawStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        async function fetchLeaderboard() {
            try {
                const res = await fetch(`${API}/api/leaderboard?limit=${limit}`)
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const data = await res.json()
                if (!cancelled) {
                    setLeaderboard(data.leaderboard ?? [])
                    setStats(data.stats ?? null)
                    setError(null)
                }
            } catch (e: unknown) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to fetch leaderboard")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchLeaderboard()
        const timer = setInterval(fetchLeaderboard, 60_000)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [limit])

    return { leaderboard, stats, loading, error }
}
