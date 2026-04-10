import { create } from "zustand"
import { persist } from "zustand/middleware"

interface SpotifyPlaylist {
  id: string
  name: string
  uri: string
  images: Array<{ url: string }>
}

interface SpotifyState {
  autoplayEnabled: boolean
  selectedPlaylistId: string | null
  selectedPlaylist: SpotifyPlaylist | null
  isConnected: boolean
  isPlaying: boolean
  currentTrack: string | null
  
  setAutoplayEnabled: (enabled: boolean) => void
  setSelectedPlaylist: (playlist: SpotifyPlaylist | null) => void
  setIsConnected: (connected: boolean) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTrack: (track: string | null) => void
  reset: () => void
}

const initialState = {
  autoplayEnabled: false,
  selectedPlaylistId: null,
  selectedPlaylist: null,
  isConnected: false,
  isPlaying: false,
  currentTrack: null,
}

export const useSpotifyStore = create<SpotifyState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setAutoplayEnabled: (enabled) => set({ autoplayEnabled: enabled }),
      
      setSelectedPlaylist: (playlist) => 
        set({ 
          selectedPlaylist: playlist,
          selectedPlaylistId: playlist?.id || null 
        }),
      
      setIsConnected: (connected) => set({ isConnected: connected }),
      
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      
      setCurrentTrack: (track) => set({ currentTrack: track }),
      
      reset: () => set(initialState),
    }),
    {
      name: "spotify-storage",
      partialize: (state) => ({
        autoplayEnabled: state.autoplayEnabled,
        selectedPlaylistId: state.selectedPlaylistId,
        selectedPlaylist: state.selectedPlaylist,
      }),
    }
  )
)
