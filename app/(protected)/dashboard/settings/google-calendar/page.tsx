"use client"

import PageTitle from "@/components/page-title"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  Eye,
  Edit3,
  PlusCircle,
  Trash2,
  Shield,
  Lock,
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import Image from "next/image"

interface GoogleCalendarConnection {
  connected: boolean
  hasToken: boolean
  syncEnabled: boolean
  lastSyncTime?: number
  calendarId?: string
  error?: string
}

interface CalendarPermissions {
  canReadEvents: boolean
  canCreateEvents: boolean
  canModifyEvents: boolean
  canDeleteEvents: boolean
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function GoogleCalendarSettingsPage() {
  const [googleCalendarConnection, setGoogleCalendarConnection] = useState<GoogleCalendarConnection | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)

  // Convex queries and mutations for permissions
  const permissions = useQuery(api.googleCalendar.getPermissions)
  const updatePermissionsMutation = useMutation(api.googleCalendar.updatePermissions)

  // Get sync statistics
  const syncStats = useQuery(api.googleCalendar.getSyncStats)

  // Local state for permission toggles
  const [localPermissions, setLocalPermissions] = useState<CalendarPermissions>({
    canReadEvents: true,
    canCreateEvents: true,
    canModifyEvents: false,
    canDeleteEvents: false,
  })

  // Sync permissions from Convex to local state
  useEffect(() => {
    if (permissions) {
      setLocalPermissions({
        canReadEvents: permissions.canReadEvents ?? true,
        canCreateEvents: permissions.canCreateEvents ?? true,
        canModifyEvents: permissions.canModifyEvents ?? false,
        canDeleteEvents: permissions.canDeleteEvents ?? false,
      })
    }
  }, [permissions])

  const fetchGoogleCalendarConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/google-calendar/status')
      const data: GoogleCalendarConnection = await response.json()
      setGoogleCalendarConnection(data)
    } catch (error) {
      console.error('Error fetching Google Calendar connection:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initializeConnection = async () => {
      await fetchGoogleCalendarConnection()
    }

    initializeConnection()

    const params = new URLSearchParams(window.location.search)
    const googleCalendarConnected = params.get('google_calendar_connected')
    const googleCalendarError = params.get('google_calendar_error')

    if (googleCalendarConnected === 'true') {
      toast.success('Google Calendar connected successfully!')
      initializeConnection()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (googleCalendarError) {
      let errorMessage = 'Failed to connect Google Calendar'
      switch (googleCalendarError) {
        case 'access_denied':
          errorMessage = 'You denied access to Google Calendar'
          break
        case 'invalid_state':
          errorMessage = 'Invalid authentication state. Please try again.'
          break
        case 'no_code':
          errorMessage = 'No authorization code received from Google'
          break
        case 'callback_failed':
          errorMessage = 'Failed to complete Google Calendar authentication'
          break
      }
      toast.error(errorMessage)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [fetchGoogleCalendarConnection])

  const handleConnectGoogleCalendar = () => {
    window.location.href = '/api/google-calendar/auth?returnTo=/dashboard/settings/google-calendar'
  }

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
      })

      if (response.ok) {
        setGoogleCalendarConnection(null)
        toast.success('Google Calendar disconnected successfully')
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
      toast.error('Failed to disconnect Google Calendar')
    }
  }

  const handleSyncToggle = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/google-calendar/sync-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ autoSyncEnabled: enabled }),
      })

      if (response.ok) {
        setGoogleCalendarConnection(prev =>
          prev ? { ...prev, syncEnabled: enabled } : null
        )
        toast.success(`Auto sync ${enabled ? 'enabled' : 'disabled'}`)
      }
    } catch (error) {
      console.error('Error updating sync settings:', error)
      toast.error('Failed to update sync settings')
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/google-calendar/sync', {
        method: 'POST',
      })

      if (response.ok) {
        await fetchGoogleCalendarConnection()
        toast.success('Calendar synchronized successfully')
      } else {
        throw new Error('Sync failed')
      }
    } catch (error) {
      console.error('Error syncing:', error)
      toast.error('Failed to sync calendar')
    } finally {
      setSyncing(false)
    }
  }

  const handlePermissionToggle = async (
    permission: keyof CalendarPermissions,
    enabled: boolean
  ) => {
    // Update local state immediately for better UX
    const newPermissions = { ...localPermissions, [permission]: enabled }
    setLocalPermissions(newPermissions)

    try {
      await updatePermissionsMutation(newPermissions)
      toast.success('Permission updated successfully')
    } catch (error) {
      console.error('Error updating permission:', error)
      toast.error('Failed to update permission')
      // Revert on error
      setLocalPermissions(localPermissions)
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <PageTitle title="Google Calendar Integration" />
          <p className="text-sm text-muted-foreground">
            Sync your study schedule with Google Calendar
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                    <div className=" rounded-lg bg-white">
                    <Image
                      src="/google_calendar_icon.svg"
                      alt="Google Calendar"
                      width={64}
                      height={64}
                    />
                    </div>
                  Connection Status
                </CardTitle>
                <CardDescription>
                  Google Calendar account connection and sync settings
                </CardDescription>
              </div>
              <Badge variant={googleCalendarConnection?.connected ? "default" : "secondary"}>
                {googleCalendarConnection?.connected ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Not Connected
                  </span>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!googleCalendarConnection?.connected && (
              <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                <div>
                  <h3 className="font-medium mb-2">Features</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Automatically create calendar events for study sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Sync your daily study goals to calendar reminders</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>View calendar events in study dashboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Automatically block study time in your calendar</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4">
              {!googleCalendarConnection?.connected ? (
                <Button
                  onClick={handleConnectGoogleCalendar}
                  className="gap-2 bg-[#4285F4] hover:bg-[#3367D6]"
                >
                  <Image
                    src="https://www.google.com/calendar/images/calendar_16.png"
                    alt="Google Calendar"
                    width={16}
                    height={16}
                  />
                  Connect Google Calendar
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => fetchGoogleCalendarConnection()}
                    variant="outline"
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Status
                  </Button>
                  <Button
                    onClick={handleDisconnect}
                    variant="destructive"
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Disconnect
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                asChild
                className="gap-2"
              >
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Google Calendar
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fine-Grained Permissions (Auth0 Integration) */}
        {googleCalendarConnection?.connected && (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    Calendar Permissions
                    <Badge variant="outline" className="text-xs">
                      Fine-Grained Control
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Control which calendar operations MentorMind AI can perform on your behalf
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-900 dark:text-blue-100">
                  Secured by Auth0
                </AlertTitle>
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                  These permissions are enforced at the API level using Auth0 fine-grained authorization.
                  Changes take effect immediately.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {/* Read Permission */}
                <div className="flex items-start justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 mt-1">
                      <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="read-permission" className="font-semibold text-base cursor-pointer">
                        Read Calendar Events
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow MentorMind to view your calendar schedule and suggest optimal study times
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Recommended
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Switch
                    id="read-permission"
                    checked={localPermissions.canReadEvents}
                    onCheckedChange={(checked) => handlePermissionToggle('canReadEvents', checked)}
                  />
                </div>

                {/* Create Permission */}
                <div className="flex items-start justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 mt-1">
                      <PlusCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="create-permission" className="font-semibold text-base cursor-pointer">
                        Create Study Sessions
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow MentorMind to automatically create calendar events when you complete study sessions
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Recommended
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Switch
                    id="create-permission"
                    checked={localPermissions.canCreateEvents}
                    onCheckedChange={(checked) => handlePermissionToggle('canCreateEvents', checked)}
                  />
                </div>

                {/* Modify Permission */}
                <div className="flex items-start justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10 mt-1">
                      <Edit3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="modify-permission" className="font-semibold text-base cursor-pointer">
                        Modify Calendar Events
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow MentorMind to reschedule or update existing study session events
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="modify-permission"
                    checked={localPermissions.canModifyEvents}
                    onCheckedChange={(checked) => handlePermissionToggle('canModifyEvents', checked)}
                  />
                </div>

                {/* Delete Permission */}
                <div className="flex items-start justify-between p-4 rounded-lg border bg-card border-red-200 dark:border-red-900">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10 mt-1">
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="delete-permission" className="font-semibold text-base cursor-pointer">
                        Delete Calendar Events
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow MentorMind to remove study session events from your calendar
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="destructive" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          Restricted
                        </Badge>
                        <span className="text-xs text-muted-foreground">Use with caution</span>
                      </div>
                    </div>
                  </div>
                  <Switch
                    id="delete-permission"
                    checked={localPermissions.canDeleteEvents}
                    onCheckedChange={(checked) => handlePermissionToggle('canDeleteEvents', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync Settings */}
        {googleCalendarConnection?.connected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sync Settings
              </CardTitle>
              <CardDescription>
                Configure how your study data syncs with Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-sync" className="font-medium">
                    Auto Sync
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync study sessions to calendar
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={googleCalendarConnection?.syncEnabled || false}
                  onCheckedChange={handleSyncToggle}
                />
              </div>

              <Separator />

              {/* Sync Statistics */}
              {syncStats && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <h4 className="font-medium text-sm">Sync Statistics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {syncStats.syncedCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Sessions Synced</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {syncStats.unsyncedCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Pending Sync</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Sync Progress</span>
                      <span className="font-medium">{syncStats.syncPercentage}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${syncStats.syncPercentage}%` }}
                      />
                    </div>
                  </div>
                  {syncStats.unsyncedCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      💡 Click &quot;Sync Now&quot; to sync {syncStats.unsyncedCount} pending session{syncStats.unsyncedCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Last Sync: {googleCalendarConnection?.lastSyncTime ? new Date(googleCalendarConnection.lastSyncTime).toLocaleString() : 'Never'}
                  </p>
                  <Button
                    onClick={handleSync}
                    disabled={syncing}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {syncing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Sync Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Info className="h-5 w-5" />
              About Google Calendar Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-900 dark:text-blue-100">
            <p>
              The Google Calendar integration helps you stay organized by syncing your study activities:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All study sessions are automatically added to your calendar</li>
              <li>Your daily study goals appear as all-day calendar events</li>
              <li>Set calendar reminders for upcoming study sessions</li>
              <li>Block study time to avoid scheduling conflicts</li>
              <li>View your complete schedule in one place</li>
            </ul>
            <Separator className="bg-blue-200 dark:bg-blue-800" />
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                <strong>Security & Privacy:</strong> All permissions are enforced using Auth0 fine-grained authorization.
                Your tokens are encrypted and stored securely. You can revoke access at any time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
