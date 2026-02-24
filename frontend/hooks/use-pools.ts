"use client"

import { useState, useEffect, useCallback } from "react"
import { type Pool, pools as basePools } from "@/lib/pool-data"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
const MIN_PRIZE_XLM = 100

function formatTvl(xlm: number): string {
  if (xlm >= 1_000_000) return `${(xlm / 1_000_000).toFixed(1)}M XLM`
  if (xlm >= 1_000) return `${(xlm / 1_000).toFixed(1)}K XLM`
  return `${xlm.toFixed(2)} XLM`
}

function apiPoolToPool(api: {
  type: string
  prizeFundXlm: number
  totalDepositsXlm: number
  participants: number
  nextDraw: string
  estimatedAPY: number
}): Pool | null {
  const base = basePools.find((p) => p.id === api.type)
  if (!base) return null
  const drawTime = new Date(api.nextDraw)
  const prizeXlm = Math.max(api.prizeFundXlm ?? 0, MIN_PRIZE_XLM)
  return {
    ...base,
    prize: prizeXlm,
    prizeFormatted: `${prizeXlm.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM`,
    tvl: formatTvl(api.totalDepositsXlm),
    participants: api.participants,
    participantsFormatted: api.participants.toLocaleString(),
    apy: `${api.estimatedAPY}%`,
    drawTime,
  }
}

export function usePools() {
  const [pools, setPools] = useState<Pool[]>(basePools)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPools = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`${API}/api/pools`)
      if (!res.ok) throw new Error(`Pools: ${res.status}`)
      const data = await res.json()
      const list = (data.pools || [])
        .map((api: any) => apiPoolToPool({
          type: api.type,
          prizeFundXlm: api.prizeFundXlm ?? 0,
          totalDepositsXlm: api.totalDepositsXlm ?? 0,
          participants: api.participants ?? 0,
          nextDraw: api.nextDraw || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          estimatedAPY: api.estimatedAPY ?? 5,
        }))
        .filter(Boolean) as Pool[]
      if (list.length > 0) setPools(list)
    } catch (e) {
      setError((e as Error).message)
      setPools(basePools)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPools()
    const interval = setInterval(fetchPools, 30_000)
    return () => clearInterval(interval)
  }, [fetchPools])

  return { pools, loading, error, refresh: fetchPools }
}
