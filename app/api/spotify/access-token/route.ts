import { auth0 } from '@/lib/auth0';
import { getSpotifyAccessToken } from '@/lib/spotify';
import { NextResponse } from 'next/server';
import { AccessTokenForConnectionError } from '@auth0/nextjs-auth0/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth0.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const accessToken = await getSpotifyAccessToken();

    return NextResponse.json({ accessToken });
  } catch (error: any) {
    console.error('Error getting Spotify access token:', error);

    if (error instanceof AccessTokenForConnectionError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get access token' },
      { status: 500 }
    );
  }
}
