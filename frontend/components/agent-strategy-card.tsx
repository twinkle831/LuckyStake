"use client"

import { useState, useEffect } from "react"
import { formatCountdown } from "@/lib/pool-data"
import { useToast } from "@/components/toast-provider"
import {
  Pause,
  Play,
  Trash2,
  ChevronDown,
  TrendingUp,
  Clock,
  DollarSign,
  Zap,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface AgentStrategy {
  id: string
  totalAmount: number
  remainingBalance: number
  duration: number
  riskLevel: string
  goalType: string
  poolAllocation: Record<string, number>
  status: "active" | "paused" | "completed" | "withdrawn"
  totalDeposited: number
  executionCount: number
  nextExecutionTime: string
  executionHistory: Array<{
    timestamp: string
    poolType: string
    amount: number
    status: string
  }>
}

interface StrategyCardProps {
  strategy: AgentStrategy
  token: string
  onUpdate?: () => void
  onDelete?: () => void
}

export function AgentStrategyCard({
  strategy,
  token,
  onUpdate,
  onDelete,
}: StrategyCardProps) {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nextExecCountdown, setNextExecCountdown] = useState("")
  const [confirmDialog, setConfirmDialog] = useState<"pause" | "resume" | "withdraw" | null>(null)

  useEffect(() => {
    function updateCountdown() {
      setNextExecCountdown(formatCountdown(new Date(strategy.nextExecutionTime)))
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [strategy.nextExecutionTime])

  async function handlePause() {
    try {
      setLoading(true)
      const res = await fetch(`${API}/api/agent/strategy/${strategy.id}/pause`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to pause strategy")
      toast({ description: "Strategy paused successfully" })
      setConfirmDialog(null)
      onUpdate?.()
    } catch (err) {
      toast({
        description: (err as Error).message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleResume() {
    try {
      setLoading(true)
      const res = await fetch(`${API}/api/agent/strategy/${strategy.id}/resume`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to resume strategy")
      toast({ description: "Strategy resumed successfully" })
      setConfirmDialog(null)
      onUpdate?.()
    } catch (err) {
      toast({
        description: (err as Error).message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleWithdraw() {
    try {
      setLoading(true)
      const res = await fetch(`${API}/api/agent/strategy/${strategy.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to withdraw")
      toast({ description: "Funds withdrawn successfully" })
      setConfirmDialog(null)
      onDelete?.()
    } catch (err) {
      toast({
        description: (err as Error).message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const progress = (strategy.totalDeposited / strategy.totalAmount) * 100
  const statusColor = {
    active: "text-green-500",
    paused: "text-yellow-500",
    completed: "text-blue-500",
    withdrawn: "text-gray-500",
  }[strategy.status]

  const statusBg = {
    active: "bg-green-500/10",
    paused: "bg-yellow-500/10",
    completed: "bg-blue-500/10",
    withdrawn: "bg-gray-500/10",
  }[strategy.status]

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-bold text-foreground">
              {strategy.riskLevel.charAt(0).toUpperCase() + strategy.riskLevel.slice(1)} Risk
            </h3>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBg} ${statusColor}`}>
              {strategy.status.charAt(0).toUpperCase() + strategy.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {strategy.goalType === "sure-shot" ? "More frequent wins" : "Highest prize goal"}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={loading}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {strategy.status === "active" && (
              <DropdownMenuItem onClick={() => setConfirmDialog("pause")} disabled={loading}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </DropdownMenuItem>
            )}
            {strategy.status === "paused" && (
              <DropdownMenuItem onClick={() => setConfirmDialog("resume")} disabled={loading}>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setConfirmDialog("withdraw")} disabled={loading} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Withdraw
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="text-foreground font-medium">
            {strategy.totalDeposited.toFixed(2)} / {strategy.totalAmount.toFixed(2)} XLM
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-secondary/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-4 w-4 text-accent" />
            <span className="text-xs text-muted-foreground font-medium">Remaining</span>
          </div>
          <p className="font-display font-bold text-foreground">
            {strategy.remainingBalance.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">XLM</p>
        </div>

        <div className="rounded-lg bg-secondary/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground font-medium">Executions</span>
          </div>
          <p className="font-display font-bold text-foreground">
            {strategy.executionCount}
          </p>
          <p className="text-xs text-muted-foreground">completed</p>
        </div>

        <div className="rounded-lg bg-secondary/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground font-medium">Next</span>
          </div>
          <p className="font-display font-bold text-foreground text-sm">
            {nextExecCountdown}
          </p>
        </div>
      </div>

      {/* Pool allocation */}
      <div className="space-y-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-accent transition-colors"
        >
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pool Allocation
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {expanded && (
          <div className="space-y-2 pl-6 pt-2">
            {Object.entries(strategy.poolAllocation).map(([pool, percentage]) => (
              <div key={pool} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">{pool}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(percentage as number) * 100}%` }}
                    />
                  </div>
                  <span className="font-medium text-foreground w-10 text-right">
                    {((percentage as number) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent executions */}
      {strategy.executionHistory.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground">Recent Deposits</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {strategy.executionHistory.slice(-3).map((exec, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs rounded-lg bg-secondary/30 p-2"
              >
                <div className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <div>
                    <p className="font-medium text-foreground capitalize">
                      {exec.poolType} Pool
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(exec.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-foreground">
                  {exec.amount.toFixed(2)} XLM
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <AlertDialog open={confirmDialog === "pause"} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Strategy?</AlertDialogTitle>
            <AlertDialogDescription>
              Pausing will stop automatic deposits until you resume. Your remaining balance of {strategy.remainingBalance.toFixed(2)} XLM will be held.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePause} disabled={loading}>Pause</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDialog === "resume"} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Strategy?</AlertDialogTitle>
            <AlertDialogDescription>
              Resuming will restart automatic deposits every 6 hours from the remaining balance of {strategy.remainingBalance.toFixed(2)} XLM.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResume} disabled={loading}>Resume</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDialog === "withdraw"} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Funds?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent. You will withdraw {strategy.remainingBalance.toFixed(2)} XLM and the strategy will be deleted. No more automatic deposits will occur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleWithdraw} 
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Withdraw Funds
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
