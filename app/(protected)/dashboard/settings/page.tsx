"use client"

import PageTitle from "@/components/page-title"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Music,
  Calendar,
  Key,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Auth0Logo } from "@/components/logos/auth0-logo"
import { SpotifyLogo } from "@/components/logos/spotify-logo"
import { BYOKLogo } from "@/components/logos/byok-logo"

interface IntegrationStatus {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  href: string
  connected?: boolean
  status?: "connected" | "disconnected" | "pending" | "error"
}

const integrations: IntegrationStatus[] = [
  {
    id: "auth0",
    name: "Auth0",
    description: "Secure authentication and authorization",
    icon: <Auth0Logo className="h-8 w-8 text-primary" />,
    href: "/dashboard/settings/auth0",
    status: "connected",
  },
  {
    id: "spotify",
    name: "Spotify",
    description: "Play lofi music during study sessions",
    icon: <SpotifyLogo className="h-8 w-8 text-[#1DB954]" />,
    href: "/dashboard/settings/spotify",
    status: "disconnected",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync your study schedule with Google Calendar",
    icon: <Calendar className="h-8 w-8 text-red-500" />,
    href: "/dashboard/settings/google-calendar",
    status: "disconnected",
  },
  {
    id: "byok",
    name: "Bring Your Own Key",
    description: "Use your own API keys for AI models",
    icon: <BYOKLogo className="h-8 w-8 text-amber-500" />,
    href: "/dashboard/settings/byok",
    status: "disconnected",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Sync study data with your Notion workspace",
    icon: <BookOpen className="h-8 w-8 text-slate-700" />,
    href: "/dashboard/settings/notion",
    status: "pending",
  },
]

const getStatusBadge = (status?: string) => {
  switch (status) {
    case "connected":
      return (
        <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/10">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      )
    case "disconnected":
      return (
        <Badge variant="secondary">
          <AlertCircle className="h-3 w-3 mr-1" />
          Not Connected
        </Badge>
      )
    case "pending":
      return (
        <Badge variant="outline">
          Coming Soon
        </Badge>
      )
    case "error":
      return (
        <Badge className="bg-red-500/10 text-red-700 hover:bg-red-500/10">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      )
    default:
      return null
  }
}

export default function SettingsPage() {
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, string | undefined>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        // Fetch Spotify status
        const spotifyResponse = await fetch("/api/spotify-direct/status")
        const spotifyData = await spotifyResponse.json()

        // Fetch Google Calendar status
        const calendarResponse = await fetch("/api/google-calendar/status")
        const calendarData = await calendarResponse.json()

        // Fetch BYOK status
        const byokResponse = await fetch("/api/byok/status")
        const byokData = await byokResponse.json()

        setIntegrationStatuses(prev => ({
          ...prev,
          spotify: spotifyData.connected ? "connected" : "disconnected",
          "google-calendar": calendarData.connected ? "connected" : "disconnected",
          byok: byokData.connected ? "connected" : "disconnected",
        }))
      } catch (error) {
        console.error("Error fetching integration statuses:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatuses()
  }, [])

  return (
    <div>
      <PageTitle title="Settings" />

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Integrations</h2>
          <p className="text-sm text-muted-foreground">
            Manage your connected services and integrations
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <Link
              key={integration.id}
              href={integration.href}
              className="group"
            >
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      {integration.icon}
                    </div>
                    {getStatusBadge(integrationStatuses[integration.id] || integration.status)}
                  </div>
                  <CardTitle className="text-lg">{integration.name}</CardTitle>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 group-hover:translate-x-1 transition-transform"
                  >
                    Configure
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-lg bg-muted/50">
          <h3 className="font-semibold mb-2">Need Help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Check out our documentation for detailed setup guides for each integration.
          </p>
          <Button variant="outline" size="sm">
            View Documentation
          </Button>
        </div>
      </div>
    </div>
  )
}
