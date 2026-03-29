"use client"

import { useEffect, useState } from "react"
import { X, Trophy, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DrawNotification {
  poolType: string
  winner: string | null
  prizeAmount: number
  participants: number
}

interface DrawNotificationBannerProps {
  notification: DrawNotification | null
  onDismiss?: () => void
}

export function DrawNotificationBanner({
  notification,
  onDismiss,
}: DrawNotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  if (!notification || !isVisible) return null

  const isWinner = notification.winner !== null
  const poolName = notification.poolType.charAt(0).toUpperCase() + notification.poolType.slice(1)

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <Alert className={isWinner ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}>
        <div className="flex items-start gap-3">
          {isWinner ? (
            <Trophy className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <AlertDescription className={isWinner ? "text-green-900" : "text-blue-900"}>
              {isWinner ? (
                <>
                  <div className="font-semibold">Congratulations!</div>
                  <div className="text-sm mt-1">
                    You won {notification.prizeAmount} XLM in the {poolName} draw!
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold">{poolName} Draw Completed</div>
                  <div className="text-sm mt-1">
                    {notification.participants} participants, prize: {notification.prizeAmount} XLM
                  </div>
                </>
              )}
            </AlertDescription>
          </div>
          <button
            onClick={() => {
              setIsVisible(false)
              onDismiss?.()
            }}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </Alert>
    </div>
  )
}
