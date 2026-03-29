"use client"

import { useEffect, useState } from "react"
import { Bell, Check, AlertCircle, Loader2 } from "lucide-react"
import { useNotificationPreferences } from "@/hooks/use-notification-preferences"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function NotificationPreferences() {
  const {
    preferences,
    loading,
    error,
    fetchPreferences,
    updateEmail,
    updatePreferences,
  } = useNotificationPreferences()

  const [email, setEmail] = useState("")
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true)
  const [poolPreferences, setPoolPreferences] = useState({
    weekly: true,
    biweekly: true,
    monthly: true,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isValidEmail, setIsValidEmail] = useState(true)

  // Load preferences on mount
  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  // Populate form when preferences load
  useEffect(() => {
    if (preferences) {
      setEmail(preferences.email || "")
      setEmailNotificationsEnabled(preferences.emailNotificationsEnabled)
      setPoolPreferences(preferences.notificationPreferences)
    }
  }, [preferences])

  const validateEmail = (value: string) => {
    if (!value) {
      setIsValidEmail(true)
      return
    }
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    setIsValidEmail(isValid)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    validateEmail(value)
  }

  const handleSave = async () => {
    if (email && !isValidEmail) {
      return
    }

    setSaving(true)
    setSuccess(false)

    try {
      // Update email if changed
      if (email && email !== preferences?.email) {
        await updateEmail(email)
      }

      // Update preferences
      await updatePreferences({
        emailNotificationsEnabled,
        notificationPreferences: poolPreferences,
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Failed to save preferences:", err)
    } finally {
      setSaving(false)
    }
  }

  const handlePoolPreferenceChange = (pool: "weekly" | "biweekly" | "monthly") => {
    setPoolPreferences(prev => ({
      ...prev,
      [pool]: !prev[pool],
    }))
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-accent" />
          <div>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Get notified when lottery draws are completed
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Preferences saved successfully
            </AlertDescription>
          </Alert>
        )}

        {/* Email address input */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={handleEmailChange}
            disabled={loading}
            className={!isValidEmail && email ? "border-red-500" : ""}
          />
          {!isValidEmail && email && (
            <p className="text-sm text-red-500">Please enter a valid email address</p>
          )}
          <p className="text-xs text-muted-foreground">
            We&apos;ll send notifications to this email when draws are completed
          </p>
        </div>

        {/* Master toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-card/30 p-4">
          <div className="space-y-1">
            <Label className="text-base font-semibold">Enable Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive emails for all lottery draws
            </p>
          </div>
          <Switch
            checked={emailNotificationsEnabled}
            onCheckedChange={setEmailNotificationsEnabled}
            disabled={loading || !email}
          />
        </div>

        {/* Pool-specific preferences */}
        {emailNotificationsEnabled && email && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Pool Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Choose which lottery pools you want to receive notifications for
            </p>

            <div className="space-y-2">
              {/* Weekly */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-card/30 p-3">
                <div>
                  <Label className="text-sm font-medium">Weekly Draw</Label>
                  <p className="text-xs text-muted-foreground">
                    Draw every Monday at 6:00 PM
                  </p>
                </div>
                <Switch
                  checked={poolPreferences.weekly}
                  onCheckedChange={() => handlePoolPreferenceChange("weekly")}
                  disabled={loading}
                />
              </div>

              {/* Biweekly */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-card/30 p-3">
                <div>
                  <Label className="text-sm font-medium">Biweekly Draw</Label>
                  <p className="text-xs text-muted-foreground">
                    Draw every 2 weeks on Monday at 6:00 PM
                  </p>
                </div>
                <Switch
                  checked={poolPreferences.biweekly}
                  onCheckedChange={() => handlePoolPreferenceChange("biweekly")}
                  disabled={loading}
                />
              </div>

              {/* Monthly */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-card/30 p-3">
                <div>
                  <Label className="text-sm font-medium">Monthly Draw</Label>
                  <p className="text-xs text-muted-foreground">
                    Draw on the 1st of each month at 6:00 PM
                  </p>
                </div>
                <Switch
                  checked={poolPreferences.monthly}
                  onCheckedChange={() => handlePoolPreferenceChange("monthly")}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={saving || loading || !isValidEmail || !email}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
