import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { decryptToken, getCurrentUserProfileDirect } from '@/lib/spotify-direct';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get Convex auth token from cookies
    const cookieStore = await cookies();
    const isLocalhost = request.headers.get('host')?.includes('localhost');
    const cookieName = isLocalhost ? '__convexAuthJWT' : '__Host-__convexAuthJWT';
    const convexAuthToken = cookieStore.get(cookieName)?.value;

    if (!convexAuthToken) {
      return NextResponse.json({
        connected: false,
        hasToken: false,
        authenticated: false,
      });
    }

    // Create authenticated Convex client
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
    }

    const convexClient = new ConvexHttpClient(convexUrl);
    convexClient.setAuth(convexAuthToken);

    const tokens = await convexClient.query(api.spotify.getTokens);

    if (!tokens) {
      return NextResponse.json({
        connected: false,
        hasToken: false,
      });
    }

    // Decrypt access token
    const accessToken = decryptToken(tokens.accessToken);

    // Check if token is expired
    const isExpired = tokens.expiresAt < Date.now();

    if (isExpired) {
      // Token needs refresh - let the client handle it
      return NextResponse.json({
        connected: true,
        hasToken: true,
        tokenExpired: true,
      });
    }

    // Get user profile from Spotify
    try {
      const profile = await getCurrentUserProfileDirect(accessToken);

      return NextResponse.json({
        connected: true,
        hasToken: true,
        tokenExpired: false,
        profile: {
          id: profile.id,
          display_name: profile.display_name,
          email: profile.email,
          images: profile.images,
          product: profile.product,
        },
      });
    } catch (profileError) {
      // Failed to get profile - token might be invalid
      return NextResponse.json({
        connected: true,
        hasToken: true,
        tokenExpired: true,
      });
    }
  } catch (error) {
    console.error('Error checking Spotify status:', error);
    return NextResponse.json(
      { error: 'Failed to check Spotify status' },
      { status: 500 }
    );
  }
}
