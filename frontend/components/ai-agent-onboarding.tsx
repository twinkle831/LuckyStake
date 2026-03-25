"use client"

import { useState } from "react"
import { useWallet } from "@/context/wallet-context"
import { useToast } from "@/components/toast-provider"
import { X, Loader2, ChevronRight, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface OnboardingProps {
  open: boolean
  onClose: () => void
  onStrategyCreated?: (strategy: any) => void
}

export function AiAgentOnboarding({ open, onClose, onStrategyCreated }: OnboardingProps) {
  const { address, isConnected } = useWallet()
  const { toast } = useToast()
  
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState("")
  const [duration, setDuration] = useState("2")
  const [riskLevel, setRiskLevel] = useState("medium")
  const [goalType, setGoalType] = useState("sure-shot")
  const [loading, setLoading] = useState(false)
  const [allocation, setAllocation] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const token = typeof window !== "undefined" 
    ? JSON.parse(sessionStorage.getItem("luckystake_wallet") || "{}")?.token 
    : null

  async function getAIAllocation() {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetch(`${API}/api/agent/strategy/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          duration: parseInt(duration),
          riskLevel,
          goalType,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to get AI recommendation")
      }

      const data = await res.json()
      setAllocation(data.allocation || data)
      setStep(3)
    } catch (err) {
      setError((err as Error).message)
      toast({
        description: "Failed to get AI recommendation, using default allocation",
        variant: "destructive",
      })
      // Use fallback allocation
      if (riskLevel === "low") {
        setAllocation({ weekly: 0.6, biweekly: 0.3, monthly: 0.1 })
      } else if (riskLevel === "high") {
        setAllocation({ weekly: 0.2, biweekly: 0.3, monthly: 0.5 })
      } else {
        setAllocation({ weekly: 0.4, biweekly: 0.4, monthly: 0.2 })
      }
      setStep(3)
    } finally {
      setLoading(false)
    }
  }

  async function createStrategy() {
    try {
      setLoading(true)
      setError(null)

      if (!allocation) {
        setError("No allocation generated")
        return
      }

      const res = await fetch(`${API}/api/agent/strategy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          duration: parseInt(duration),
          riskLevel,
          goalType,
          poolAllocation: allocation,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create strategy")
      }

      const data = await res.json()
      toast({
        description: "Strategy created successfully! Deposits will execute automatically.",
      })
      
      onStrategyCreated?.(data.strategy)
      handleClose()
    } catch (err) {
      setError((err as Error).message)
      toast({
        description: (err as Error).message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep(1)
    setAmount("")
    setDuration("2")
    setRiskLevel("medium")
    setGoalType("sure-shot")
    setAllocation(null)
    setError(null)
    onClose()
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[50] bg-black/40 backdrop-blur-sm"
        aria-hidden
        onClick={handleClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-[51] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background border border-border shadow-2xl p-6 animate-in zoom-in-95 duration-300"
        role="dialog"
        aria-label="Create AI Agent Strategy"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="font-display font-bold text-foreground">Set-and-Forget Strategy</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-accent" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Amount */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold mb-2 block">Total Amount (XLM)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                How much do you want to deposit? The AI will distribute this across pools automatically.
              </p>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 100"
                min="0"
                step="0.1"
                className="text-base"
              />
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full"
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Duration */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Duration</Label>
              <RadioGroup value={duration} onValueChange={setDuration}>
                <div className="space-y-2">
                  {["1", "2", "3", "4"].map((weeks) => (
                    <div key={weeks} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer">
                      <RadioGroupItem value={weeks} id={`dur-${weeks}`} />
                      <Label htmlFor={`dur-${weeks}`} className="flex-1 cursor-pointer">
                        {weeks} week{weeks !== "1" ? "s" : ""}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Risk Level */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Risk Tolerance</Label>
              <RadioGroup value={riskLevel} onValueChange={setRiskLevel}>
                <div className="space-y-2">
                  {[
                    { value: "low", label: "Low (Conservative)", desc: "Focus on weekly draws" },
                    { value: "medium", label: "Medium (Balanced)", desc: "Mix of all pools" },
                    { value: "high", label: "High (Aggressive)", desc: "Focus on monthly draws" },
                  ].map(({ value, label, desc }) => (
                    <div key={value} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer">
                      <RadioGroupItem value={value} id={`risk-${value}`} />
                      <div className="flex-1">
                        <Label htmlFor={`risk-${value}`} className="cursor-pointer font-medium block">
                          {label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Goal Type */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Goal</Label>
              <RadioGroup value={goalType} onValueChange={setGoalType}>
                <div className="space-y-2">
                  {[
                    { value: "sure-shot", label: "Sure-Shot", desc: "More frequent smaller wins" },
                    { value: "highest-prize", label: "Highest Prize", desc: "Aim for big wins" },
                  ].map(({ value, label, desc }) => (
                    <div key={value} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer">
                      <RadioGroupItem value={value} id={`goal-${value}`} />
                      <div className="flex-1">
                        <Label htmlFor={`goal-${value}`} className="cursor-pointer font-medium block">
                          {label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={getAIAllocation}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Allocation Review */}
        {step === 3 && allocation && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                The AI recommends the following allocation based on your preferences:
              </p>
              <div className="space-y-2 bg-secondary/30 rounded-lg p-4">
                {Object.entries(allocation).map(([pool, percentage]) => (
                  <div key={pool} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {pool} Pool
                    </span>
                    <span className="text-sm font-semibold text-accent">
                      {(percentage * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Total: {amount} XLM across {Object.keys(allocation).length} pools
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={createStrategy}
                disabled={loading || !isConnected}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Strategy
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {!isConnected && (
              <p className="text-xs text-center text-muted-foreground">
                Connect wallet to create strategy
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
