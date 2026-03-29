"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"

export interface DrawNotification {
  poolType: string
  winner: string | null
  prizeAmount: number
  participants: number
}

interface DrawNotificationContextType {
  notification: DrawNotification | null
  setNotification: (notification: DrawNotification | null) => void
  clearNotification: () => void
}

const DrawNotificationContext = createContext<DrawNotificationContextType | undefined>(undefined)

export function DrawNotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<DrawNotification | null>(null)

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    const wsProtocol = API.startsWith("https") ? "wss" : "ws"
    
    // Extract hostname and port from API URL
    const apiUrl = new URL(API)
    const wsUrl = `${wsProtocol}://${apiUrl.host}/ws`

    let ws: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout

    function connect() {
      try {
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log("[DrawNotificationContext] WebSocket connected")
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "draw_complete") {
              const drawData = data.data || {}
              setNotification({
                poolType: drawData.poolType || "unknown",
                winner: drawData.winner || null,
                prizeAmount: drawData.prizeAmount || 0,
                participants: drawData.draw?.participants || 0,
              })
            }
          } catch (err) {
            console.error("[DrawNotificationContext] Failed to parse message:", err)
          }
        }

        ws.onerror = (error) => {
          const event = error as Event
          console.error("[DrawNotificationContext] WebSocket error - Connection failed. URL:", wsUrl, "Error:", event?.type || "Unknown error")
        }

        ws.onclose = () => {
          console.log("[DrawNotificationContext] WebSocket disconnected, reconnecting in 5s...")
          reconnectTimeout = setTimeout(connect, 5000)
        }
      } catch (err) {
        console.error("[DrawNotificationContext] Failed to connect:", err)
        reconnectTimeout = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (ws) ws.close()
    }
  }, [])

  return (
    <DrawNotificationContext.Provider value={{ notification, setNotification, clearNotification: () => setNotification(null) }}>
      {children}
    </DrawNotificationContext.Provider>
  )
}

export function useDrawNotification() {
  const ctx = useContext(DrawNotificationContext)
  if (!ctx) throw new Error("useDrawNotification must be used inside <DrawNotificationProvider>")
  return ctx
}
