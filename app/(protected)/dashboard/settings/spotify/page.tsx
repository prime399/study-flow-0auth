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
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Music,
  Search,
  Library,
  Compass,
  Sparkles,
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
import { useSpotifyStore } from "@/store/use-spotify-store"
import { SpotifyLogo } from "@/components/logos/spotify-logo"

interface SpotifyConnection {
  connected: boolean
  profile?: {
    id: string
    display_name: string
    email: string
    images: Array<{ url: string }>
    product: string
  }
  hasToken: boolean
  error?: string
  errorCode?: string
  causeCode?: string
  reconnectRequired?: boolean
  configurationRequired?: boolean
}

interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  images: Array<{ url: string }>
  tracks: { total: number }
  uri: string
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

export default function SpotifySettingsPage() {
  const [spotifyConnection, setSpotifyConnection] = useState<SpotifyConnection | null>(null)
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [playlistSource, setPlaylistSource] = useState<'user-lofi' | 'search'>('user-lofi')
  const [showAllUserPlaylists, setShowAllUserPlaylists] = useState(false)
  const [searchQuery, setSearchQuery] = useState('lofi study chill')
  const [activeTab, setActiveTab] = useState<'library' | 'discover'>('library')
  const [loading, setLoading] = useState(true)

  const {
    autoplayEnabled,
    selectedPlaylist,
    setAutoplayEnabled,
    setSelectedPlaylist,
    setIsConnected,
  } = useSpotifyStore()

  const fetchSpotifyConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify-direct/status')
      const data: SpotifyConnection = await response.json()
      setSpotifyConnection(data)
      setIsConnected(data.connected)

      if (!data.connected && data.errorCode) {
        console.warn('Spotify connection error:', data.errorCode, data.error)
      }
    } catch (error) {
      console.error('Error fetching Spotify connection:', error)
    } finally {
      setLoading(false)
    }
  }, [setIsConnected])

  useEffect(() => {
    const initializeConnection = async () => {
      await fetchSpotifyConnection()
    }

    initializeConnection()

    const params = new URLSearchParams(window.location.search)
    const spotifyConnected = params.get('spotify_connected')
    const spotifyError = params.get('spotify_error')

    if (spotifyConnected === 'true') {
      toast.success('Spotify connected successfully!')
      initializeConnection()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (spotifyError) {
      let errorMessage = 'Failed to connect Spotify'
      switch (spotifyError) {
        case 'access_denied':
          errorMessage = 'You denied access to Spotify'
          break
        case 'invalid_state':
          errorMessage = 'Invalid authentication state. Please try again.'
          break
        case 'no_code':
          errorMessage = 'No authorization code received from Spotify'
          break
        case 'callback_failed':
          errorMessage = 'Failed to complete Spotify authentication'
          break
      }
      toast.error(errorMessage)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [fetchSpotifyConnection])

  useEffect(() => {
    if (spotifyConnection?.connected) {
      fetchSpotifyPlaylists(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyConnection?.connected])

  const fetchSpotifyPlaylists = async (forceSearch = false) => {
    setLoadingPlaylists(true)
    try {
      if (forceSearch) {
        const searchResponse = await fetch('/api/spotify-direct/playlists?type=search&query=lofi study chill')
        const searchData = await searchResponse.json()

        if (searchResponse.ok) {
          const validPlaylists = (searchData.playlists || []).filter((p: any) => p && p.id)
          setSpotifyPlaylists(validPlaylists)
          setPlaylistSource('search')
        }
        return
      }

      const userResponse = await fetch('/api/spotify-direct/playlists?type=user')
      const userData = await userResponse.json()

      let userPlaylists: SpotifyPlaylist[] = []
      let lofiPlaylists: SpotifyPlaylist[] = []

      if (userResponse.ok && userData.playlists) {
        userPlaylists = (userData.playlists || []).filter((p: any) => p && p.id)

        const lofiKeywords = ['lofi', 'lo-fi', 'lo fi', 'chill', 'study', 'focus', 'relax', 'beats', 'ambient']
        lofiPlaylists = userPlaylists.filter((playlist) => {
          const nameMatch = lofiKeywords.some(keyword =>
            playlist.name.toLowerCase().includes(keyword)
          )
          const descMatch = playlist.description && lofiKeywords.some(keyword =>
            playlist.description.toLowerCase().includes(keyword)
          )
          return nameMatch || descMatch
        })

        console.log(`Found ${lofiPlaylists.length} lofi playlists from user's library out of ${userPlaylists.length} total`)
      }

      if (lofiPlaylists.length > 0) {
        setSpotifyPlaylists(showAllUserPlaylists ? userPlaylists : lofiPlaylists)
        setPlaylistSource('user-lofi')

        if (!selectedPlaylist) {
          const firstPlaylist = lofiPlaylists[0]
          setSelectedPlaylist({
            id: firstPlaylist.id,
            name: firstPlaylist.name,
            uri: firstPlaylist.uri,
            images: firstPlaylist.images,
          })
          toast.success(`Auto-selected: ${firstPlaylist.name}`)
        }
      } else {
        console.log('No lofi playlists found in user library, falling back to search')
        const searchResponse = await fetch('/api/spotify-direct/playlists?type=search&query=lofi study chill')
        const searchData = await searchResponse.json()

        if (searchResponse.ok) {
          const validPlaylists = (searchData.playlists || []).filter((p: any) => p && p.id)
          setSpotifyPlaylists(validPlaylists)
          setPlaylistSource('search')
        }
      }
    } catch (error) {
      console.error('Error fetching Spotify playlists:', error)
    } finally {
      setLoadingPlaylists(false)
    }
  }

  const toggleShowAllPlaylists = async () => {
    const newValue = !showAllUserPlaylists
    setShowAllUserPlaylists(newValue)

    if (playlistSource === 'user-lofi') {
      await fetchSpotifyPlaylists()
    }
  }

  const handleSearchPlaylists = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query')
      return
    }

    setLoadingPlaylists(true)
    try {
      const response = await fetch(`/api/spotify-direct/playlists?type=search&query=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (response.ok) {
        const validPlaylists = (data.playlists || []).filter((p: any) => p && p.id)
        setSpotifyPlaylists(validPlaylists)
        setPlaylistSource('search')
        setActiveTab('discover')
      }
    } catch (error) {
      console.error('Error searching playlists:', error)
      toast.error('Failed to search playlists')
    } finally {
      setLoadingPlaylists(false)
    }
  }

  const handleCategorySearch = async (category: string) => {
    setSearchQuery(category)
    setLoadingPlaylists(true)
    try {
      const response = await fetch(`/api/spotify-direct/playlists?type=search&query=${encodeURIComponent(category)}`)
      const data = await response.json()

      if (response.ok) {
        const validPlaylists = (data.playlists || []).filter((p: any) => p && p.id)
        setSpotifyPlaylists(validPlaylists)
        setPlaylistSource('search')
        setActiveTab('discover')
        toast.success(`Found ${validPlaylists.length} playlists`)
      }
    } catch (error) {
      console.error('Error searching by category:', error)
      toast.error('Failed to search playlists')
    } finally {
      setLoadingPlaylists(false)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'library' | 'discover')
    if (value === 'library') {
      fetchSpotifyPlaylists(false)
    } else if (value === 'discover' && spotifyPlaylists.length === 0) {
      fetchSpotifyPlaylists(true)
    }
  }

  const handleConnectSpotify = () => {
    window.location.href = '/api/spotify-direct/auth?returnTo=/dashboard/settings/spotify'
  }

  const handleDisconnectSpotify = async () => {
    try {
      const response = await fetch('/api/spotify-direct/disconnect', {
        method: 'POST',
      })

      if (response.ok) {
        setAutoplayEnabled(false)
        setSelectedPlaylist(null)
        setIsConnected(false)
        setSpotifyConnection(null)
        setSpotifyPlaylists([])
        toast.success('Spotify disconnected successfully')
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting Spotify:', error)
      toast.error('Failed to disconnect Spotify')
    }
  }

  const handlePlaylistSelect = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist({
      id: playlist.id,
      name: playlist.name,
      uri: playlist.uri,
      images: playlist.images,
    })
    toast.success(`Selected: ${playlist.name}`)
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
          <PageTitle title="Spotify Integration" />
          <p className="text-sm text-muted-foreground">
            Manage your Spotify account and playlist selection
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
                  <div className="p-2 rounded-lg bg-[#1DB954]/10">
                    <SpotifyLogo className="h-6 w-6 text-[#1DB954]" />
                  </div>
                  Connection Status
                </CardTitle>
                <CardDescription>
                  Spotify account and authentication details
                </CardDescription>
              </div>
              <Badge variant={spotifyConnection?.connected ? "default" : "secondary"}>
                {spotifyConnection?.connected ? (
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
            {!spotifyConnection?.connected ? (
              <Alert variant={spotifyConnection?.reconnectRequired ? "destructive" : "default"}>
                <Info className="h-4 w-4" />
                <AlertTitle>
                  {spotifyConnection?.configurationRequired
                    ? 'Auth0 Configuration Required'
                    : spotifyConnection?.reconnectRequired
                      ? 'Reconnection Required'
                      : 'Connect Spotify'}
                </AlertTitle>
                <AlertDescription>
                  {spotifyConnection?.configurationRequired ? (
                    <>
                      <strong>Token Exchange is not enabled in your Auth0 application.</strong><br />
                      Please go to Auth0 Dashboard → Applications → [Your App] → Advanced Settings → Grant Types
                      and enable &quot;Token Exchange&quot;. See <code>AUTH0_TOKEN_EXCHANGE_SETUP.md</code> for detailed instructions.
                    </>
                  ) : spotifyConnection?.reconnectRequired ? (
                    <>
                      Your Spotify connection needs to be refreshed. Please click &quot;Connect Spotify&quot; below to reconnect.
                      This will ensure proper offline access for background music playback.
                    </>
                  ) : (
                    <>
                      Connect your Spotify account to automatically play lofi playlists during your study sessions.
                      We&apos;ll search your library for lofi/study/chill playlists and auto-select one for you.
                      Requires Spotify Premium for playback.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {spotifyConnection.profile && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="flex items-start gap-3">
                      {spotifyConnection.profile.images?.[0] && (
                        <Image
                          src={spotifyConnection.profile.images[0].url}
                          alt={spotifyConnection.profile.display_name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{spotifyConnection.profile.display_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {spotifyConnection.profile.email}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {spotifyConnection.profile.product}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="spotify-autoplay" className="font-medium">
                      Autoplay Music
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically play lofi playlist when starting study timer
                    </p>
                  </div>
                  <Switch
                    id="spotify-autoplay"
                    checked={autoplayEnabled}
                    onCheckedChange={setAutoplayEnabled}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4">
              {!spotifyConnection?.connected ? (
                <Button
                  onClick={handleConnectSpotify}
                  className="gap-2 bg-[#1DB954] hover:bg-[#1DB954]/90"
                >
                  <SpotifyLogo className="h-4 w-4" />
                  Connect Spotify
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => fetchSpotifyConnection()}
                    variant="outline"
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Status
                  </Button>
                  <Button
                    onClick={handleDisconnectSpotify}
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
                  href="https://www.spotify.com/premium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Get Premium
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Playlist Selection */}
        {spotifyConnection?.connected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5 text-[#1DB954]" />
                Music Selection
              </CardTitle>
              <CardDescription>
                Choose which playlist to play during study sessions
              </CardDescription>
              {selectedPlaylist && (
                <Badge variant="outline" className="gap-1 w-fit mt-2">
                  <Music className="h-3 w-3" />
                  {selectedPlaylist.name}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="library" className="gap-2">
                    <Library className="h-4 w-4" />
                    Your Library
                  </TabsTrigger>
                  <TabsTrigger value="discover" className="gap-2">
                    <Compass className="h-4 w-4" />
                    Discover
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="library" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {playlistSource === 'user-lofi' && !showAllUserPlaylists
                        ? 'Playlists filtered by lofi/study/chill keywords'
                        : 'All your playlists'}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleShowAllPlaylists}
                      className="text-xs gap-1"
                    >
                      {showAllUserPlaylists ? (
                        <>
                          <Sparkles className="h-3 w-3" />
                          Show Lofi Only
                        </>
                      ) : (
                        'Show All'
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-2">
                    {loadingPlaylists ? (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading your playlists...
                      </div>
                    ) : spotifyPlaylists.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Library className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="font-medium">No playlists found</p>
                        <p className="text-sm mt-1">Try switching to Discover mode</p>
                      </div>
                    ) : (
                      spotifyPlaylists.filter(playlist => playlist && playlist.id).map((playlist) => (
                        <button
                          key={playlist.id}
                          onClick={() => handlePlaylistSelect(playlist)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                            selectedPlaylist?.id === playlist.id
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-border hover:bg-muted/50 hover:border-primary/50'
                          }`}
                        >
                          {playlist.images?.[0] ? (
                            <Image
                              src={playlist.images[0].url}
                              alt={playlist.name}
                              width={48}
                              height={48}
                              className="rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <Music className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{playlist.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {playlist.tracks.total} tracks
                            </p>
                          </div>
                          {selectedPlaylist?.id === playlist.id && (
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="discover" className="space-y-4 mt-4">
                  {/* Search Input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchPlaylists()}
                        placeholder="Search for playlists..."
                        className="pl-9"
                      />
                    </div>
                    <Button
                      onClick={handleSearchPlaylists}
                      disabled={loadingPlaylists}
                      className="gap-2"
                    >
                      {loadingPlaylists ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Search
                    </Button>
                  </div>

                  {/* Category Quick Search */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Popular Categories</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Lofi Hip Hop', query: 'lofi hip hop beats', icon: '🎧' },
                        { label: 'Study Music', query: 'study focus concentration', icon: '📚' },
                        { label: 'Chill Vibes', query: 'chill lofi vibes', icon: '🌊' },
                        { label: 'Jazz Lofi', query: 'lofi jazz chill', icon: '🎷' },
                        { label: 'Ambient', query: 'ambient lofi study', icon: '🌌' },
                        { label: 'Piano Lofi', query: 'lofi piano peaceful', icon: '🎹' },
                      ].map((category) => (
                        <Button
                          key={category.query}
                          variant="outline"
                          size="sm"
                          onClick={() => handleCategorySearch(category.query)}
                          disabled={loadingPlaylists}
                          className="gap-1 text-xs"
                        >
                          <span>{category.icon}</span>
                          {category.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Discover Results */}
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-2">
                    {loadingPlaylists ? (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Searching playlists...
                      </div>
                    ) : spotifyPlaylists.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Compass className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="font-medium">Ready to discover</p>
                        <p className="text-sm mt-1">Search or pick a category to find playlists</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">
                            Found {spotifyPlaylists.filter(p => p && p.id).length} playlists
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveTab('library')
                              fetchSpotifyPlaylists(false)
                            }}
                            className="text-xs"
                          >
                            Back to Library
                          </Button>
                        </div>
                        {spotifyPlaylists.filter(playlist => playlist && playlist.id).map((playlist) => (
                          <button
                            key={playlist.id}
                            onClick={() => handlePlaylistSelect(playlist)}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                              selectedPlaylist?.id === playlist.id
                                ? 'border-primary bg-primary/10 shadow-sm'
                                : 'border-border hover:bg-muted/50 hover:border-primary/50'
                            }`}
                          >
                            {playlist.images?.[0] ? (
                              <Image
                                src={playlist.images[0].url}
                                alt={playlist.name}
                                width={48}
                                height={48}
                                className="rounded object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                <Music className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{playlist.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {playlist.description || `${playlist.tracks.total} tracks`}
                              </p>
                            </div>
                            {selectedPlaylist?.id === playlist.id && (
                              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <Info className="h-5 w-5" />
              About Spotify Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-green-900 dark:text-green-100">
            <p>
              Connect your Spotify account to enhance your study sessions with music:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Automatic lofi playlist selection from your library</li>
              <li>Auto-play music when you start studying</li>
              <li>Browse and discover new playlists by category</li>
              <li>Seamless integration with study sessions</li>
              <li>Requires Spotify Premium for full playback features</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
