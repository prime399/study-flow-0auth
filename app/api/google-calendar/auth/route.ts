import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google-calendar-direct';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const returnTo = searchParams.get('returnTo') || '/dashboard/settings/google-calendar';

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Store state and returnTo in cookies
    const cookieStore = await cookies();
    cookieStore.set('google_calendar_auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    cookieStore.set('google_calendar_return_to', returnTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    // Build redirect URI
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const redirectUri = `${protocol}://${host}/api/google-calendar/callback`;

    // Get Google authorization URL
    const authUrl = getGoogleAuthUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Google Calendar OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar authentication' },
      { status: 500 }
    );
  }
}
