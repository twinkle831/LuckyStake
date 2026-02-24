export interface Pool {
  id: string
  name: string
  frequency: string
  prize: number
  prizeFormatted: string
  tvl: string
  participants: number
  participantsFormatted: string
  apy: string
  drawTime: Date
  minDeposit: number
  ticketRatio: string
  color: string
  borderColor: string
  featured: boolean
  /** Amount (XLM) currently supplied to Blend lending for yield. From API. */
  suppliedToBlend?: number
}

// Default draw times when API is unavailable: next period from now
function defaultDrawTime(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(18, 0, 0, 0)
  return d
}

// Minimum prize pool (XLM). Keep in sync with backend.
const MIN_PRIZE_XLM = 100;

export const pools: Pool[] = [
  {
    id: "weekly",
    name: "Weekly Pool",
    frequency: "Every 7 Days",
    prize: MIN_PRIZE_XLM,
    prizeFormatted: `${MIN_PRIZE_XLM} XLM`,
    tvl: "0 XLM",
    participants: 0,
    participantsFormatted: "0",
    apy: "5.2%",
    drawTime: defaultDrawTime(7),
    minDeposit: 1,
    ticketRatio: "1 ticket per 1 XLM per day",
    color: "from-accent/30 to-accent/5",
    borderColor: "hover:border-accent/50",
    featured: true,
  },
  {
    id: "biweekly",
    name: "Biweekly Pool",
    frequency: "Every 15 Days",
    prize: MIN_PRIZE_XLM,
    prizeFormatted: `${MIN_PRIZE_XLM} XLM`,
    tvl: "0 XLM",
    participants: 0,
    participantsFormatted: "0",
    apy: "5.4%",
    drawTime: defaultDrawTime(15),
    minDeposit: 1,
    ticketRatio: "1 ticket per 1 XLM per day",
    color: "from-emerald-500/20 to-emerald-500/5",
    borderColor: "hover:border-emerald-500/40",
    featured: false,
  },
  {
    id: "monthly",
    name: "Monthly Pool",
    frequency: "Every 30 Days",
    prize: MIN_PRIZE_XLM,
    prizeFormatted: `${MIN_PRIZE_XLM} XLM`,
    tvl: "0 XLM",
    participants: 0,
    participantsFormatted: "0",
    apy: "5.6%",
    drawTime: defaultDrawTime(30),
    minDeposit: 1,
    ticketRatio: "1 ticket per 1 XLM per day",
    color: "from-teal-500/20 to-teal-500/5",
    borderColor: "hover:border-teal-500/40",
    featured: false,
  },
]

export function calcTickets(amount: number, poolId: string): number {
  const multipliers: Record<string, number> = {
    weekly: 7,
    biweekly: 15,
    monthly: 30,
  }
  return amount * (multipliers[poolId] ?? 1)
}

export function calcWinProbability(
  tickets: number,
  pool: Pool,
  depositAmount: number
): string {
  const tvlNum = parseFloat(pool.tvl.replace(/[$,\sKMXLM]/gi, "")) || 0
  const mult = pool.tvl.includes("M") ? 1_000_000 : pool.tvl.includes("K") ? 1_000 : 1
  const totalTickets = Math.max(tvlNum * mult, 0) + depositAmount
  const prob = totalTickets > 0 ? (tickets / totalTickets) * 100 : 0
  return prob < 0.01 ? "<0.01%" : `${prob.toFixed(2)}%`
}

export function formatCountdown(target: Date): string {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return "Drawing..."
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}
