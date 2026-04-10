import { NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0-config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const returnTo = searchParams.get('returnTo') || '/dashboard/settings';

    // Use startInteractiveLogin with proper authorization parameters for Spotify connection
    // In App Router, startInteractiveLogin only takes options (no request parameter)
    return auth0.startInteractiveLogin({
      returnTo,
      authorizationParameters: {
        // Specify Spotify as the connection
        connection: 'spotify',
        // Force consent screen to ensure refresh token is granted
        prompt: 'consent',
        // Request offline_access scope for refresh token (CRITICAL)
        scope: 'openid profile email offline_access',
        // Pass through to Spotify: request offline access
        access_type: 'offline',
        // Force approval prompt from Spotify
        approval_prompt: 'force',
      },
    });
  } catch (error) {
    console.error('Error initiating Spotify connection:', error);
    throw error;
  }
}
