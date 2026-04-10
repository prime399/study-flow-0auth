import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Generate AI-powered schedule recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetDate, sessionType } = body;

    // Get Convex auth token
    const cookieStore = await cookies();
    const isLocalhost = request.headers.get('host')?.includes('localhost');
    const cookieName = isLocalhost ? '__convexAuthJWT' : '__Host-__convexAuthJWT';
    const convexAuthToken = cookieStore.get(cookieName)?.value;

    if (!convexAuthToken) {
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

    // Generate recommendations using Convex action
    const recommendations = await convexClient.action(
      api.scheduling.generateScheduleRecommendations,
      {
        targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
        sessionType,
      }
    );

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get pending recommendations
 */
export async function GET(request: NextRequest) {
  try {
    // Get Convex auth token
    const cookieStore = await cookies();
    const isLocalhost = request.headers.get('host')?.includes('localhost');
    const cookieName = isLocalhost ? '__convexAuthJWT' : '__Host-__convexAuthJWT';
    const convexAuthToken = cookieStore.get(cookieName)?.value;

    if (!convexAuthToken) {
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

    // Get pending recommendations
    const recommendations = await convexClient.query(
      api.scheduling.getPendingRecommendations
    );

    // Get recommendation stats
    const stats = await convexClient.query(
      api.scheduling.getRecommendationStats
    );

    return NextResponse.json({
      success: true,
      recommendations,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', details: error.message },
      { status: 500 }
    );
  }
}
