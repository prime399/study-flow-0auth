import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import {
  decryptToken,
  encryptToken,
  getUserPlaylistsDirect,
  searchSpotifyPlaylistsDirect,
} from '@/lib/spotify-direct';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'search';
    const query = searchParams.get('query') || 'lofi study chill';

    // Get Convex auth token from cookies
    const cookieStore = await cookies();
    const isLocalhost = request.headers.get('host')?.includes('localhost');
    const cookieName = isLocalhost ? '__convexAuthJWT' : '__Host-__convexAuthJWT';
    const convexAuthToken = cookieStore.get(cookieName)?.value;

    if (!convexAuthToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Create authenticated Convex client
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
    }

    const convexClient = new ConvexHttpClient(convexUrl);
    convexClient.setAuth(convexAuthToken);

    // Get tokens from Convex
    const tokens = await convexClient.query(api.spotify.getTokens);

    if (!tokens) {
      return NextResponse.json(
        { error: 'Not connected to Spotify' },
        { status: 401 }
      );
    }

    // Decrypt tokens
    let accessToken = decryptToken(tokens.accessToken);
    const refreshToken = decryptToken(tokens.refreshToken);

    // Check if token is expired (with 5 minute buffer)
    const isExpired = tokens.expiresAt < Date.now() + 5 * 60 * 1000;

    if (isExpired) {
      // Refresh the token
      const refreshed = await convexClient.action(api.spotify.refreshAccessToken, {
        refreshToken,
      });

      // Encrypt and update tokens in Convex
      await convexClient.mutation(api.spotify.updateAccessToken, {
        accessToken: encryptToken(refreshed.accessToken),
        refreshToken: encryptToken(refreshed.refreshToken),
        expiresAt: refreshed.expiresAt,
        scope: refreshed.scope,
        tokenType: refreshed.tokenType,
      });

      accessToken = refreshed.accessToken;
    }

    // Fetch playlists based on type
    let playlists = [];

    if (type === 'user') {
      playlists = await getUserPlaylistsDirect(accessToken);
    } else {
      playlists = await searchSpotifyPlaylistsDirect(accessToken, query);
    }

    return NextResponse.json({
      playlists,
      count: playlists.length,
    });
  } catch (error: any) {
    console.error('Error fetching Spotify playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists', details: error.message },
      { status: 500 }
    );
  }
}
