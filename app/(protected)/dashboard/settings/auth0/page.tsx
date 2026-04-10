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
  Key,
  Lock,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"
import { Auth0Logo } from "@/components/logos/auth0-logo"

interface TokenInfo {
  user: {
    sub: string
    name: string
    email: string
    picture: string
  }
  tokens: {
    accessToken: string | null
    idToken: string | null
    refreshToken: string | null
  }
  scopes: string[]
}

interface ConsentScope {
  id: string
  name: string
  description: string
  required: boolean
  granted: boolean
}

const availableScopes: ConsentScope[] = [
  {
    id: 'openid',
    name: 'OpenID',
    description: 'Basic authentication',
    required: true,
    granted: true,
  },
  {
    id: 'profile',
    name: 'Profile Information',
    description: 'Access to your profile information',
    required: true,
    granted: true,
  },
  {
    id: 'email',
    name: 'Email Address',
    description: 'Access to your email address',
    required: true,
    granted: true,
  },
  {
    id: 'read:user',
    name: 'Read User Data',
    description: 'Read your user data and preferences',
    required: false,
    granted: false,
  },
  {
    id: 'update:user',
    name: 'Update User Data',
    description: 'Update your user profile and settings',
    required: false,
    granted: false,
  },
  {
    id: 'offline_access',
    name: 'Offline Access',
    description: 'Access data when you are offline',
    required: false,
    granted: false,
  },
]

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

export default function Auth0SettingsPage() {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [scopes, setScopes] = useState<ConsentScope[]>(availableScopes)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [isAuth0Connected, setIsAuth0Connected] = useState(false)

  const fetchTokenInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/token')
      const data = await response.json()

      if (response.ok && data.authenticated !== false) {
        setTokenInfo(data)
        setIsAuth0Connected(true)

        const updatedScopes = scopes.map(scope => ({
          ...scope,
          granted: data.scopes.includes(scope.id) || scope.required,
        }))
        setScopes(updatedScopes)
      } else {
        setIsAuth0Connected(false)
      }
    } catch (error) {
      console.error('Error fetching token info:', error)
      setIsAuth0Connected(false)
    } finally {
      setLoading(false)
    }
  }, [scopes])

  useEffect(() => {
    fetchTokenInfo()
  }, [fetchTokenInfo])

  const handleConnectAuth0 = () => {
    setConnecting(true)
    window.location.href = '/api/auth/login'
  }

  const handleDisconnectAuth0 = async () => {
    try {
      window.location.href = '/api/auth/logout'
    } catch (error) {
      console.error('Error disconnecting Auth0:', error)
      toast.error('Failed to disconnect Auth0')
    }
  }

  const handleScopeToggle = async (scopeId: string, granted: boolean) => {
    const scope = scopes.find(s => s.id === scopeId)

    if (!scope || scope.required) {
      return
    }

    const updatedScopes = scopes.map(s =>
      s.id === scopeId ? { ...s, granted } : s
    )
    setScopes(updatedScopes)

    if (granted && isAuth0Connected) {
      const grantedScopeIds = updatedScopes
        .filter(s => s.granted)
        .map(s => s.id)

      try {
        const response = await fetch('/api/auth/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scopes: grantedScopeIds }),
        })

        if (response.ok) {
          const data = await response.json()
          window.location.href = data.authorizationUrl
        } else {
          throw new Error('Failed to create consent URL')
        }
      } catch (error) {
        console.error('Error updating consent:', error)
        toast.error('Failed to update permissions')
        setScopes(scopes)
      }
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
          <PageTitle title="Auth0 Integration" />
          <p className="text-sm text-muted-foreground">
            Manage your Auth0 authentication and permissions
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Auth0Logo className="h-6 w-6 text-primary" />
                  </div>
                  Connection Status
                </CardTitle>
                <CardDescription>
                  Current authentication status and account information
                </CardDescription>
              </div>
              <Badge variant={isAuth0Connected ? "default" : "secondary"}>
                {isAuth0Connected ? (
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
            {!isAuth0Connected ? (
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Connect Auth0</AlertTitle>
                  <AlertDescription>
                    Connect your Auth0 account to enable advanced authentication features,
                    secure delegation, and fine-grained access control.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="space-y-4">
                {/* User Profile */}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-start gap-3">
                    {tokenInfo?.user.picture && (
                      <Image
                        src={tokenInfo.user.picture}
                        alt={tokenInfo.user.name || 'User'}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{tokenInfo?.user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tokenInfo?.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {tokenInfo?.user.sub}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Token Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Access Token</span>
                    </div>
                    <Badge variant="outline">
                      {tokenInfo?.tokens.accessToken ? 'Active' : 'Not Available'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Refresh Token</span>
                    </div>
                    <Badge variant="outline">
                      {tokenInfo?.tokens.refreshToken ? 'Active' : 'Not Available'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-4">
              {!isAuth0Connected ? (
                <Button
                  onClick={handleConnectAuth0}
                  disabled={connecting}
                  className="gap-2"
                >
                  <Auth0Logo className="h-4 w-4" />
                  Connect Auth0
                </Button>
              ) : (
                <>
                  <Button
                    onClick={fetchTokenInfo}
                    variant="outline"
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Status
                  </Button>
                  <Button
                    onClick={handleDisconnectAuth0}
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
                  href="https://auth0.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Learn More
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Permission Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Permission Management</CardTitle>
                <CardDescription>
                  Control what data and actions the application can access on your behalf
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {scopes.map((scope, index) => (
              <div key={scope.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={scope.id} className="font-medium">
                        {scope.name}
                      </Label>
                      {scope.required && (
                        <Badge variant="secondary" className="text-xs">
                          Required
                        </Badge>
                      )}
                      {scope.granted && !scope.required && (
                        <Badge variant="default" className="text-xs">
                          Granted
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {scope.description}
                    </p>
                  </div>
                  <Switch
                    id={scope.id}
                    checked={scope.granted}
                    disabled={scope.required || !isAuth0Connected}
                    onCheckedChange={(checked) =>
                      handleScopeToggle(scope.id, checked)
                    }
                  />
                </div>
              </div>
            ))}

            {!isAuth0Connected && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Connect Auth0 to manage your permissions
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Info className="h-5 w-5" />
              About Auth0
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-900 dark:text-blue-100">
            <p>
              Auth0 provides a secure way to manage user authentication and authorization.
              By connecting your Auth0 account, you enable:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Single sign-on across multiple applications</li>
              <li>Multi-factor authentication for enhanced security</li>
              <li>Fine-grained access control and permission management</li>
              <li>Secure delegation of permissions</li>
              <li>Comprehensive audit logs and monitoring</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
