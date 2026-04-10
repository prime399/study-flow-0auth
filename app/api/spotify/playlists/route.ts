import { auth0 } from '@/lib/auth0';
import { getSpotifyAccessToken, searchSpotifyPlaylists, getUserPlaylists } from '@/lib/spotify';
import { NextRequest, NextResponse } from 'next/server';
import { AccessTokenForConnectionError } from '@auth0/nextjs-auth0/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth0.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'search';
    const query = searchParams.get('query') || 'lofi study chill';

    const accessToken = await getSpotifyAccessToken();

    let playlists = [];

    if (type === 'user') {
      playlists = await getUserPlaylists(accessToken);
    } else {
      playlists = await searchSpotifyPlaylists(accessToken, query);
    }

    return NextResponse.json({
      playlists,
      count: playlists.length,
    });
  } catch (error: any) {
    console.error('Error fetching Spotify playlists:', error);

    if (error instanceof AccessTokenForConnectionError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
}
