import { auth0 } from '@/lib/auth0';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Request additional consent/scopes from the user
 * This is useful for fine-grained authorization where users can grant
 * specific permissions to the AI agent
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { scopes } = body;

    if (!scopes || !Array.isArray(scopes)) {
      return NextResponse.json(
        { error: 'Invalid scopes provided. Expected an array of scope strings.' },
        { status: 400 }
      );
    }

    // Validate environment variables
    const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL;
    const clientId = process.env.AUTH0_CLIENT_ID;
    const baseUrl = process.env.AUTH0_BASE_URL;
    const audience = process.env.AUTH0_AUDIENCE;

    if (!auth0Domain || !clientId || !baseUrl) {
      console.error('Missing required Auth0 configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Build authorization URL with requested scopes
    const redirectUri = `${baseUrl}/api/auth/callback`;
    const authUrl = new URL(`${auth0Domain}/authorize`);
    
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    
    if (audience) {
      authUrl.searchParams.set('audience', audience);
    }
    
    // Force consent prompt to show permission screen
    authUrl.searchParams.set('prompt', 'consent');
    
    // Maintain state for security
    authUrl.searchParams.set('state', crypto.randomUUID());

    return NextResponse.json({
      authorizationUrl: authUrl.toString(),
      requestedScopes: scopes,
    });
  } catch (error) {
    console.error('Error creating consent URL:', error);
    return NextResponse.json(
      { error: 'Failed to create authorization URL' },
      { status: 500 }
    );
  }
}
