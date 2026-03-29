import { useState, useCallback } from "react"
import { useWallet } from "@/context/wallet-context"

export interface NotificationPreferences {
  email: string | null
  emailNotificationsEnabled: boolean
  notificationPreferences: {
    weekly: boolean
    biweekly: boolean
    monthly: boolean
  }
}

export function useNotificationPreferences() {
  const { token } = useWallet()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    if (!token) return
    
    setLoading(true)
    setError(null)
    
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const res = await fetch(`${API}/api/users/me/notification-preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (!res.ok) throw new Error("Failed to fetch preferences")
      
      const data = await res.json()
      setPreferences(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [token])

  const updateEmail = useCallback(async (email: string) => {
    if (!token) return
    
    setLoading(true)
    setError(null)
    
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const res = await fetch(`${API}/api/users/me/email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })
      
      if (!res.ok) throw new Error("Failed to update email")
      
      setPreferences(prev => prev ? { ...prev, email } : null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!token) return
    
    setLoading(true)
    setError(null)
    
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const res = await fetch(`${API}/api/users/me/notification-preferences`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })
      
      if (!res.ok) throw new Error("Failed to update preferences")
      
      const data = await res.json()
      setPreferences({
        email: preferences?.email ?? null,
        emailNotificationsEnabled: data.emailNotificationsEnabled,
        notificationPreferences: data.notificationPreferences,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [token, preferences?.email])

  return {
    preferences,
    loading,
    error,
    fetchPreferences,
    updateEmail,
    updatePreferences,
  }
}
