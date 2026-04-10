import { auth0 } from './auth0-config';

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  tracks: { total: number };
  uri: string;
  external_urls: { spotify: string };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  uri: string;
  duration_ms: number;
}

export async function getSpotifyAccessToken(): Promise<string> {
  try {
    const result = await auth0.getAccessTokenForConnection({
      connection: 'spotify',
    });
    
    if (!result?.token) {
      throw new Error('No Spotify access token returned from Auth0');
    }
    
    return result.token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw error;
  }
}

export async function searchSpotifyPlaylists(
  accessToken: string,
  query: string = 'lofi study',
  limit: number = 20
): Promise<SpotifyPlaylist[]> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.playlists?.items || [];
  } catch (error) {
    console.error('Error searching Spotify playlists:', error);
    throw error;
  }
}

export async function getUserPlaylists(
  accessToken: string,
  limit: number = 50
): Promise<SpotifyPlaylist[]> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/playlists?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error getting user playlists:', error);
    throw error;
  }
}

export async function getPlaylistTracks(
  accessToken: string,
  playlistId: string
): Promise<SpotifyTrack[]> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items?.map((item: any) => item.track) || [];
  } catch (error) {
    console.error('Error getting playlist tracks:', error);
    throw error;
  }
}

export async function getCurrentUserProfile(accessToken: string) {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting Spotify user profile:', error);
    throw error;
  }
}
