import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens, encryptToken, getGoogleCalendarProfile } from '@/lib/google-calendar-direct';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Google Calendar Callback Started ===');
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('Callback params:', { code: code?.substring(0, 10) + '...', state, error });

    // Handle user denial
    if (error === 'access_denied') {
      console.log('User denied Google Calendar access');
      const returnTo = '/dashboard/settings/google-calendar';
      return NextResponse.redirect(
        new URL(`${returnTo}?google_calendar_error=access_denied`, request.url)
      );
    }

    if (!code) {
      console.error('No code received from Google');
      return NextResponse.redirect(
        new URL('/dashboard/settings/google-calendar?google_calendar_error=no_code', request.url)
      );
    }

    // Verify state for CSRF protection
    const cookieStore = await cookies();
    const storedState = cookieStore.get('google_calendar_auth_state')?.value;
    const returnTo = cookieStore.get('google_calendar_return_to')?.value || '/dashboard/settings/google-calendar';

    console.log('State verification:', { storedState, receivedState: state, match: storedState === state });

    if (!storedState || storedState !== state) {
      console.error('State mismatch - possible CSRF attack');
      return NextResponse.redirect(
        new URL('/dashboard/settings/google-calendar?google_calendar_error=invalid_state', request.url)
      );
    }

    // Clear state cookies
    cookieStore.delete('google_calendar_auth_state');
    cookieStore.delete('google_calendar_return_to');
    console.log('State cookies cleared');

    // Build redirect URI
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const redirectUri = `${protocol}://${host}/api/google-calendar/callback`;

    console.log('Exchanging code for tokens with redirect URI:', redirectUri);

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    console.log('Tokens received from Google');

    // Get calendar profile to get the calendar ID
    const profile = await getGoogleCalendarProfile(tokens.accessToken);
    const calendarId = profile.id;

    // Encrypt tokens before storing
    const encryptedTokens = {
      accessToken: encryptToken(tokens.accessToken),
      refreshToken: encryptToken(tokens.refreshToken),
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      tokenType: tokens.tokenType,
      calendarId: calendarId,
    };

    console.log('Tokens encrypted, storing in Convex...');

    // Get Convex auth token from cookies
    // Cookie name depends on environment: localhost uses no prefix, production uses __Host- prefix
    const isLocalhost = request.headers.get('host')?.includes('localhost');
    const cookieName = isLocalhost ? '__convexAuthJWT' : '__Host-__convexAuthJWT';
    const convexAuthToken = cookieStore.get(cookieName)?.value;

    console.log('Looking for auth cookie:', cookieName, 'Found:', !!convexAuthToken);

    if (!convexAuthToken) {
      console.error('No Convex auth token found in cookies');
      console.error('Available cookies:', cookieStore.getAll().map(c => c.name));
      throw new Error('Not authenticated - please log in first');
    }

    console.log('Convex auth token found, creating authenticated client');

    // Create authenticated Convex client
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
    }

    const convexClient = new ConvexHttpClient(convexUrl);
    convexClient.setAuth(convexAuthToken);

    console.log('Calling Convex mutation with authenticated client');

    // Store in Convex using authenticated client
    try {
      await convexClient.mutation(api.googleCalendar.storeTokens, encryptedTokens);
      console.log('Tokens stored successfully in Convex');
    } catch (convexError: any) {
      console.error('Convex error:', convexError);
      throw new Error(`Failed to store tokens in Convex: ${convexError.message}`);
    }

    console.log('=== Google Calendar Callback Complete - Redirecting ===');

    // Redirect back to settings with success message
    return NextResponse.redirect(
      new URL(`${returnTo}?google_calendar_connected=true`, request.url)
    );
  } catch (error: any) {
    console.error('Error handling Google Calendar callback:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.redirect(
      new URL(`/dashboard/settings/google-calendar?google_calendar_error=callback_failed&details=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
