"use client"

import PageTitle from "@/components/page-title"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"

export default function NotionSettingsPage() {
  const [connected, setConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [databaseId, setDatabaseId] = useState("")
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  const handleConnectNotion = () => {
    toast.info('Notion integration coming soon!')
  }

  const handleDisconnect = async () => {
    try {
      setConnected(false)
      setSyncEnabled(false)
      setDatabaseId("")
      toast.success('Notion disconnected')
    } catch (error) {
      console.error('Error disconnecting:', error)
      toast.error('Failed to disconnect Notion')
    }
  }

  const handleSync = async () => {
    if (!databaseId.trim()) {
      toast.error('Please enter your Notion database ID')
      return
    }

    setSyncing(true)
    try {
      setTimeout(() => {
        setLastSyncTime(new Date())
        toast.success('Notion database synchronized successfully')
        setSyncing(false)
      }, 2000)
    } catch (error) {
      console.error('Error syncing:', error)
      toast.error('Failed to sync with Notion')
      setSyncing(false)
    }
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
          <PageTitle title="Notion Integration" />
          <p className="text-sm text-muted-foreground">
            Sync your study data to your Notion workspace
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
                  <div className="p-2 rounded-lg bg-slate-700/10">
                    <BookOpen className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                  </div>
                  Connection Status
                </CardTitle>
                <CardDescription>
                  Notion workspace connection and sync settings
                </CardDescription>
              </div>
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? (
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
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Coming Soon</AlertTitle>
              <AlertDescription>
                Notion integration is currently in development. This feature will allow you to sync your study sessions, goals, and progress directly to your Notion workspace.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
              <div>
                <h3 className="font-medium mb-2">What You Can Sync</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Study session records with duration and type</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Daily study goals and completion status</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Study statistics and progress tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Study group memberships and activities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Custom properties for advanced tracking</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4">
              <Button
                onClick={handleConnectNotion}
                disabled
                className="gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Connect Notion
              </Button>
              <Button
                variant="outline"
                asChild
                className="gap-2"
              >
                <a
                  href="https://www.notion.so"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Notion
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Database Configuration */}
        {connected && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Database Configuration
                </CardTitle>
                <CardDescription>
                  Configure which Notion database to sync with
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="database-id" className="font-medium">
                    Notion Database ID
                  </Label>
                  <Input
                    id="database-id"
                    placeholder="e.g., 1234567890abcdef1234567890abcdef"
                    value={databaseId}
                    onChange={(e) => setDatabaseId(e.target.value)}
                    disabled={syncing}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this in your Notion database URL: notion.so/<strong>DATABASE_ID</strong>?v=...
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-sync" className="font-medium">
                      Auto Sync
                    </Label>
                    <Switch
                      id="auto-sync"
                      checked={syncEnabled}
                      onCheckedChange={setSyncEnabled}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync study data to Notion
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Last Sync: {lastSyncTime ? lastSyncTime.toLocaleString() : 'Never'}
                  </p>
                  <Button
                    onClick={handleSync}
                    disabled={syncing || !databaseId}
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
              </CardContent>
            </Card>

            {/* Sync Data Mapping */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Property Mapping</CardTitle>
                <CardDescription>
                  How your study data maps to Notion properties
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-2 gap-0 border-b p-3 bg-muted/50 font-medium text-sm">
                    <div>StudyFlow Field</div>
                    <div>Notion Property</div>
                  </div>
                  {[
                    { source: 'Session Date', target: 'Date' },
                    { source: 'Session Duration', target: 'Duration (minutes)' },
                    { source: 'Session Type', target: 'Type' },
                    { source: 'Completed', target: 'Completed' },
                    { source: 'Study Goal', target: 'Daily Goal (minutes)' },
                    { source: 'Coins Earned', target: 'Coins' },
                  ].map((mapping, i) => (
                    <div key={i} className={`grid grid-cols-2 gap-0 p-3 text-sm border-b ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                      <div className="font-medium">{mapping.source}</div>
                      <div className="text-muted-foreground">→ {mapping.target}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Setup Guide */}
        <Card className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Info className="h-5 w-5" />
              Setup Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-900 dark:text-slate-100">
            <div>
              <h3 className="font-medium mb-2">How to Get Started:</h3>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Create a new Notion database or use an existing one</li>
                <li>Create a Notion integration at <a href="https://www.notion.com/my-integrations" target="_blank" rel="noopener noreferrer" className="underline">notion.com/my-integrations</a></li>
                <li>Share your database with the integration</li>
                <li>Copy your database ID from the database URL</li>
                <li>Paste the ID above and enable auto-sync</li>
              </ol>
            </div>

            <div className="rounded bg-blue-50 dark:bg-blue-900/30 p-3">
              <p className="text-xs">
                <strong>Note:</strong> Make sure the Notion integration has access to your database.
                You can manage this in the &quot;Connections&quot; tab of your Notion database settings.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Info className="h-5 w-5" />
              About Notion Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-900 dark:text-slate-100">
            <p>
              Sync your study data to Notion for powerful tracking and analysis:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Keep all study records in one centralized location</li>
              <li>Create custom views and filters in Notion</li>
              <li>Build dashboards to visualize your progress</li>
              <li>Set up automations with Notion&apos;s workflow features</li>
              <li>Share study data with study group members</li>
              <li>Integrate with other tools via Notion&apos;s API</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
