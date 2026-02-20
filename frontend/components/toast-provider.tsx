"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "info"

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextType {
  toast: (type: ToastType, title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, type, title, message }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-xl animate-slide-up min-w-[320px] max-w-md"
          >
            <div className="shrink-0 mt-0.5">
              {t.type === "success" && (
                <CheckCircle2 className="h-5 w-5 text-accent" />
              )}
              {t.type === "error" && (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              {t.type === "info" && (
                <Info className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t.title}</p>
              {t.message && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context)
    throw new Error("useToast must be used inside ToastProvider")
  return context
}
