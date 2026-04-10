import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth0.getSession();

    if (!session) {
      // Return structured response instead of 401 for better error handling
      return NextResponse.json(
        { 
          error: 'Not authenticated',
          authenticated: false 
        }, 
        { status: 200 }
      );
    }

    const { user } = session;

    // Try to get fresh access token (automatically refreshed if expired)
    let tokenInfo = null;
    try {
      const result = await auth0.getAccessToken();
      tokenInfo = {
        token: result.token,
        expiresAt: result.expiresAt,
      };
    } catch (error: any) {
      console.warn('Could not retrieve access token:', error.message || error);
      // This is expected if user hasn't granted API access
    }

    return NextResponse.json({
      user: {
        sub: user.sub,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
      tokens: {
        accessToken: tokenInfo?.token || null,
        expiresAt: tokenInfo?.expiresAt || null,
        idToken: session.idToken || null,
        refreshToken: session.refreshToken || null,
      },
      scopes: (user.scope || session.accessTokenScope)?.split(' ') || [],
      issuedAt: user.updated_at,
    });
  } catch (error: any) {
    console.error('Error fetching token info:', error.message || error);
    return NextResponse.json(
      { error: 'Failed to fetch token information' },
      { status: 500 }
    );
  }
}
