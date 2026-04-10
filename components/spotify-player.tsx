"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Music, Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react"
import { Slider } from "./ui/slider"
import { useSpotifyStore } from "@/store/use-spotify-store"
import { toast } from "sonner"
import Image from "next/image"

interface SpotifyPlayerProps {
  autoStart?: boolean
}

declare global {
  interface Window {
    Spotify: any
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

export default function SpotifyPlayer({ autoStart = false }: SpotifyPlayerProps) {
  const [player, setPlayer] = useState<any>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<any>(null)
  const [isPaused, setIsPaused] = useState(true)
  const [volume, setVolume] = useState([50])
  const [isMuted, setIsMuted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const playerRef = useRef<any>(null)

  const { selectedPlaylist, setIsPlaying, autoplayEnabled } = useSpotifyStore()

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://sdk.scdn.co/spotify-player.js"
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      initializePlayer()
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initializePlayer = async () => {
    try {
      const token = await getAccessToken()
      
      if (!token) {
        toast.error("Failed to get Spotify access token")
        return
      }

      const spotifyPlayer = new window.Spotify.Player({
        name: "Study Flow Player",
        getOAuthToken: (cb: (token: string) => void) => {
          getAccessToken().then(t => cb(t || ""))
        },
        volume: 0.5,
      })

      spotifyPlayer.addListener("ready", ({ device_id }: any) => {
        console.log("Spotify Player Ready with Device ID", device_id)
        setDeviceId(device_id)
        setIsReady(true)
        toast.success("Spotify player connected")
      })

      spotifyPlayer.addListener("not_ready", ({ device_id }: any) => {
        console.log("Device ID has gone offline", device_id)
        setIsReady(false)
      })

      spotifyPlayer.addListener("player_state_changed", (state: any) => {
        if (!state) return

        setCurrentTrack(state.track_window.current_track)
        setIsPaused(state.paused)
        setIsPlaying(!state.paused)
      })

      spotifyPlayer.addListener("initialization_error", ({ message }: any) => {
        console.error("Initialization Error:", message)
        toast.error("Failed to initialize Spotify player")
      })

      spotifyPlayer.addListener("authentication_error", ({ message }: any) => {
        console.error("Authentication Error:", message)
        toast.error("Spotify authentication failed")
      })

      spotifyPlayer.addListener("account_error", ({ message }: any) => {
        console.error("Account Error:", message)
        toast.error("Spotify account error. Premium required for playback.")
      })

      spotifyPlayer.connect()
      setPlayer(spotifyPlayer)
      playerRef.current = spotifyPlayer
    } catch (error) {
      console.error("Error initializing Spotify player:", error)
      toast.error("Failed to initialize Spotify player")
    }
  }

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/spotify-direct/access-token")
      
      if (!response.ok) {
        throw new Error("Failed to get Spotify access token")
      }
      
      const data = await response.json()
      return data.accessToken || null
    } catch (error) {
      console.error("Error getting access token:", error)
      return null
    }
  }

  const playPlaylist = async () => {
    if (!deviceId || !selectedPlaylist) {
      toast.error("No device or playlist selected")
      return
    }

    try {
      const token = await getAccessToken()
      
      if (!token) {
        toast.error("No Spotify access token available")
        return
      }

      const response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            context_uri: selectedPlaylist.uri,
            offset: { position: 0 },
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to start playback")
      }

      toast.success(`Playing: ${selectedPlaylist.name}`)
    } catch (error) {
      console.error("Error playing playlist:", error)
      toast.error("Failed to start playback")
    }
  }

  const togglePlay = async () => {
    if (!player) return

    try {
      await player.togglePlay()
    } catch (error) {
      console.error("Error toggling play:", error)
    }
  }

  const skipToNext = async () => {
    if (!player) return

    try {
      await player.nextTrack()
      toast.success("Skipped to next track")
    } catch (error) {
      console.error("Error skipping track:", error)
    }
  }

  const handleVolumeChange = async (value: number[]) => {
    setVolume(value)
    if (player) {
      await player.setVolume(value[0] / 100)
    }
  }

  const toggleMute = async () => {
    if (!player) return
    
    const newMuted = !isMuted
    setIsMuted(newMuted)
    await player.setVolume(newMuted ? 0 : volume[0] / 100)
  }

  useEffect(() => {
    if (autoStart && isReady && selectedPlaylist && autoplayEnabled) {
      playPlaylist()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, isReady, selectedPlaylist, autoplayEnabled])

  if (!selectedPlaylist) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="h-5 w-5" />
            Spotify Player
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>No playlist selected</p>
          <p className="mt-2">Go to Settings to connect Spotify and select a lofi playlist</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Music className="h-5 w-5" />
          Now Playing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentTrack && (
          <div className="flex items-center gap-3">
            {currentTrack.album?.images?.[0] ? (
              <Image
                src={currentTrack.album.images[0].url}
                alt={currentTrack.name}
                width={64}
                height={64}
                className="rounded object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                <Music className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{currentTrack.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {currentTrack.artists?.[0]?.name}
              </p>
            </div>
          </div>
        )}

        {!currentTrack && selectedPlaylist && (
          <div className="flex items-center gap-3">
            {selectedPlaylist.images?.[0] ? (
              <Image
                src={selectedPlaylist.images[0].url}
                alt={selectedPlaylist.name}
                width={64}
                height={64}
                className="rounded object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                <Music className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedPlaylist.name}</p>
              <p className="text-sm text-muted-foreground">Ready to play</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          {!currentTrack ? (
            <Button onClick={playPlaylist} disabled={!isReady} size="lg">
              <Play className="h-4 w-4 mr-2" />
              Play Playlist
            </Button>
          ) : (
            <>
              <Button onClick={togglePlay} variant="outline" size="icon">
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button onClick={skipToNext} variant="outline" size="icon">
                <SkipForward className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={toggleMute}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={isMuted ? [0] : volume}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>

        {!isReady && (
          <p className="text-xs text-center text-muted-foreground">
            Connecting to Spotify...
          </p>
        )}
      </CardContent>
    </Card>
  )
}
