import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Google Calendar Disconnect Started ===');

    // Get Convex auth token from cookies
    const cookieStore = await cookies();
    const isLocalhost = request.headers.get('host')?.includes('localhost');
    const cookieName = isLocalhost ? '__convexAuthJWT' : '__Host-__convexAuthJWT';
    const convexAuthToken = cookieStore.get(cookieName)?.value;

    if (!convexAuthToken) {
      console.error('No Convex auth token found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Create authenticated Convex client
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
    }

    const convexClient = new ConvexHttpClient(convexUrl);
    convexClient.setAuth(convexAuthToken);

    // Delete tokens from database
    await convexClient.mutation(api.googleCalendar.deleteTokens);

    console.log('Google Calendar tokens deleted');
    console.log('=== Google Calendar Disconnect Complete ===');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting Google Calendar:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar', details: error.message },
      { status: 500 }
    );
  }
}
