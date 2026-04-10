import { auth0 } from '@/lib/auth0';
import { getSpotifyAccessToken, getCurrentUserProfile } from '@/lib/spotify';
import { NextResponse } from 'next/server';
import { AccessTokenForConnectionError } from '@auth0/nextjs-auth0/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if user has an Auth0 session
    const session = await auth0.getSession();

    if (!session) {
      // No Auth0 session = Spotify not connected
      return NextResponse.json(
        { connected: false, error: 'No Auth0 session' },
        { status: 200 }
      );
    }

    try {
      const accessToken = await getSpotifyAccessToken();

      const profile = await getCurrentUserProfile(accessToken);

      return NextResponse.json({
        connected: true,
        profile: {
          id: profile.id,
          display_name: profile.display_name,
          email: profile.email,
          images: profile.images,
          product: profile.product,
        },
        hasToken: true,
      });
    } catch (error: any) {
      if (error instanceof AccessTokenForConnectionError) {
        console.error('Spotify AccessTokenForConnectionError:', {
          code: error.code,
          message: error.message,
          cause: error.cause,
        });

        // Special handling for missing refresh token
        if (error.code === 'missing_refresh_token') {
          return NextResponse.json(
            {
              connected: false,
              hasToken: false,
              error: 'Refresh token missing. Please reconnect your Spotify account by clicking "Connect Spotify" below.',
              errorCode: error.code,
              reconnectRequired: true,
            },
            { status: 200 }
          );
        }

        // Special handling for token exchange not allowed
        if (error.code === 'failed_to_exchange_refresh_token' && 
            error.cause?.code === 'unauthorized_client') {
          return NextResponse.json(
            {
              connected: false,
              hasToken: false,
              error: 'Token Exchange not enabled. Please enable Token Exchange grant type in Auth0 Dashboard. See AUTH0_TOKEN_EXCHANGE_SETUP.md',
              errorCode: error.code,
              causeCode: error.cause?.code,
              reconnectRequired: true,
              configurationRequired: true,
            },
            { status: 200 }
          );
        }

        return NextResponse.json(
          {
            connected: false,
            hasToken: false,
            error: error.message,
            errorCode: error.code,
            reconnectRequired: error.code === 'failed_to_exchange_refresh_token',
          },
          { status: 200 }
        );
      }

      console.error('Error fetching Spotify token:', error);

      if (error.message?.includes('No connection token found')) {
        return NextResponse.json(
          { connected: false, error: 'Spotify not connected' },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { connected: false, error: 'Failed to verify Spotify connection' },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Error in Spotify token endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
