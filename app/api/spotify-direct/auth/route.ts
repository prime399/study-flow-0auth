import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/lib/spotify-direct';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const returnTo = searchParams.get('returnTo') || '/dashboard/settings';

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Store state and returnTo in cookies
    const cookieStore = await cookies();
    cookieStore.set('spotify_auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    cookieStore.set('spotify_return_to', returnTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    // Build redirect URI
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const redirectUri = `${protocol}://${host}/api/spotify-direct/callback`;

    // Get Spotify authorization URL
    const authUrl = getSpotifyAuthUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Spotify OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Spotify authentication' },
      { status: 500 }
    );
  }
}
