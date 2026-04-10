import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface SpotifyTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
}

/**
 * Encrypt a token (simple implementation - you can enhance with a proper encryption library)
 */
export function encryptToken(token: string): string {
  // For now, we'll use base64 encoding
  // In production, use proper encryption like AES-256
  return Buffer.from(token).toString("base64");
}

/**
 * Decrypt a token
 */
export function decryptToken(encryptedToken: string): string {
  // For now, we'll use base64 decoding
  // In production, use proper decryption
  return Buffer.from(encryptedToken, "base64").toString("utf-8");
}

/**
 * Generate authorization URL for Spotify OAuth
 */
export function getSpotifyAuthUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("SPOTIFY_CLIENT_ID not configured");
  }

  const scopes = [
    "user-read-email",
    "user-read-private",
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-read-playback-state",
    "user-modify-playback-state",
    "streaming",
    "user-read-currently-playing",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    show_dialog: "true", // Always show consent dialog
  });

  if (state) {
    params.append("state", state);
  }

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<SpotifyTokenData> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
    tokenType: data.token_type,
  };
}

/**
 * Get Spotify access token from Convex, refreshing if needed
 */
export async function getSpotifyAccessTokenDirect(
  convexClient: ConvexHttpClient
): Promise<string | null> {
  try {
    const tokens = await convexClient.query(api.spotify.getTokens);

    if (!tokens) {
      return null;
    }

    // Decrypt tokens
    const accessToken = decryptToken(tokens.accessToken);
    const refreshToken = decryptToken(tokens.refreshToken);

    // Check if token is expired (with 5 minute buffer)
    const isExpired = tokens.expiresAt < Date.now() + 5 * 60 * 1000;

    if (isExpired) {
      // Refresh the token
      const refreshed = await convexClient.action(
        api.spotify.refreshAccessToken,
        {
          refreshToken,
        }
      );

      // Encrypt and store the new tokens
      await convexClient.mutation(api.spotify.updateAccessToken, {
        accessToken: encryptToken(refreshed.accessToken),
        refreshToken: encryptToken(refreshed.refreshToken),
        expiresAt: refreshed.expiresAt,
        scope: refreshed.scope,
        tokenType: refreshed.tokenType,
      });

      return refreshed.accessToken;
    }

    return accessToken;
  } catch (error) {
    console.error("Error getting Spotify access token:", error);
    return null;
  }
}

/**
 * Search Spotify playlists
 */
export async function searchSpotifyPlaylistsDirect(
  accessToken: string,
  query: string = "lofi study",
  limit: number = 20
): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query
      )}&type=playlist&limit=${limit}`,
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
    console.error("Error searching Spotify playlists:", error);
    throw error;
  }
}

/**
 * Get user's Spotify playlists
 */
export async function getUserPlaylistsDirect(
  accessToken: string,
  limit: number = 50
): Promise<any[]> {
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
    console.error("Error getting user playlists:", error);
    throw error;
  }
}

/**
 * Get current user's Spotify profile
 */
export async function getCurrentUserProfileDirect(
  accessToken: string
): Promise<any> {
  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting Spotify user profile:", error);
    throw error;
  }
}
