import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get Convex auth token from cookies
    const cookieStore = await cookies();
    const isLocalhost = request.headers.get('host')?.includes('localhost');
    const cookieName = isLocalhost ? '__convexAuthJWT' : '__Host-__convexAuthJWT';
    const convexAuthToken = cookieStore.get(cookieName)?.value;

    if (!convexAuthToken) {
      return NextResponse.json({
        connected: false,
        hasToken: false,
        error: 'Not authenticated',
      });
    }

    // Create authenticated Convex client
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
    }

    const convexClient = new ConvexHttpClient(convexUrl);
    convexClient.setAuth(convexAuthToken);

    // Get tokens from Convex
    const tokens = await convexClient.query(api.googleCalendar.getTokens);
    const syncSettings = await convexClient.query(api.googleCalendar.getSyncSettings);

    if (!tokens) {
      return NextResponse.json({
        connected: false,
        hasToken: false,
      });
    }

    return NextResponse.json({
      connected: true,
      hasToken: true,
      syncEnabled: syncSettings?.autoSyncEnabled || false,
      lastSyncTime: syncSettings?.lastSyncTime,
      calendarId: tokens.calendarId,
    });
  } catch (error: any) {
    console.error('Error checking Google Calendar status:', error);
    return NextResponse.json(
      {
        connected: false,
        hasToken: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
