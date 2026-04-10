import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
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

    // Delete tokens using authenticated client
    await convexClient.mutation(api.spotify.deleteTokens);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Spotify:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Spotify' },
      { status: 500 }
    );
  }
}
