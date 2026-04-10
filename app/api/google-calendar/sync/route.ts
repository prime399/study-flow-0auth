import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { cookies } from 'next/headers';
import { getGoogleAccessTokenDirect, createGoogleCalendarEvent } from '@/lib/google-calendar-direct';
import { enforceCalendarPermission, CalendarPermissionError } from '@/lib/google-calendar-permissions';

export const dynamic = 'force-dynamic';

/**
 * Format duration in a human-readable way
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get user's timezone from browser or default to UTC
 */
function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Google Calendar Sync Started ===');

    // Get Convex auth token from cookies
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

    // Check permission to create calendar events (required for sync)
    try {
      await enforceCalendarPermission(convexClient, 'create');
    } catch (error) {
      if (error instanceof CalendarPermissionError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }

    // Get Google Calendar tokens
    const tokens = await convexClient.query(api.googleCalendar.getTokens);
    if (!tokens) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }

    // Check if auto-sync is enabled
    const syncSettings = await convexClient.query(api.googleCalendar.getSyncSettings);
    console.log('Sync settings:', syncSettings);

    // Get access token (refresh if needed)
    const accessToken = await getGoogleAccessTokenDirect(convexClient);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 400 }
      );
    }

    const calendarId = tokens.calendarId || 'primary';
    const timezone = getUserTimezone();

    // Get unsynced study sessions
    const unsyncedSessions = await convexClient.query(api.googleCalendar.getUnsyncedSessions);

    console.log(`Found ${unsyncedSessions.length} unsynced sessions`);

    if (unsyncedSessions.length === 0) {
      await convexClient.mutation(api.googleCalendar.updateLastSyncTime);
      return NextResponse.json({
        success: true,
        syncedCount: 0,
        message: 'No new study sessions to sync'
      });
    }

    // Sync each session to Google Calendar
    let syncedCount = 0;
    const errors = [];

    for (const session of unsyncedSessions) {
      try {
        // Skip sessions without end time
        if (!session.endTime) {
          console.log(`Skipping incomplete session (no end time): ${session._id}`);
          continue;
        }

        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const durationFormatted = formatDuration(session.duration);

        // Create rich event description
        const description = [
          `✅ Study session completed`,
          ``,
          `📚 Type: ${session.type}`,
          `⏱️ Duration: ${durationFormatted} (${session.duration} seconds)`,
          `🎯 Status: ${session.completed ? 'Completed' : 'Incomplete'}`,
          ``,
          `Created by Study Flow`,
        ].join('\n');

        // Determine event color based on session type
        let colorId = '2'; // Default green
        const type = session.type.toLowerCase();
        if (type.includes('focus') || type.includes('deep')) {
          colorId = '10'; // Dark green
        } else if (type.includes('break') || type.includes('short')) {
          colorId = '5'; // Yellow
        } else if (type.includes('review')) {
          colorId = '7'; // Cyan
        }

        const event = {
          summary: `📚 Study: ${session.type}`,
          description,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: timezone,
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: timezone,
          },
          colorId,
          source: {
            title: 'Study Flow',
            url: process.env.NEXT_PUBLIC_APP_URL || 'https://study-flow.tech',
          },
        };

        console.log(`Creating event for session ${session._id}: ${session.type}`);
        const createdEvent = await createGoogleCalendarEvent(accessToken, calendarId, event);

        // Mark session as synced in Convex
        await convexClient.mutation(api.googleCalendar.markSessionSynced, {
          sessionId: session._id,
          googleCalendarEventId: createdEvent.id,
        });

        syncedCount++;
        console.log(`✓ Synced session ${session._id} to event ${createdEvent.id}`);
      } catch (error: any) {
        console.error(`Failed to sync session ${session._id}:`, error);
        errors.push({
          sessionId: session._id,
          error: error.message,
        });
        // Continue with next session on error
      }
    }

    // Update last sync time
    await convexClient.mutation(api.googleCalendar.updateLastSyncTime);

    console.log(`=== Google Calendar Sync Complete - Synced ${syncedCount}/${unsyncedSessions.length} sessions ===`);

    const response: any = {
      success: true,
      syncedCount,
      totalAttempted: unsyncedSessions.length,
      message: `Successfully synced ${syncedCount} study session(s) to Google Calendar`,
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.message += ` (${errors.length} failed)`;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error syncing to Google Calendar:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendar', details: error.message },
      { status: 500 }
    );
  }
}
