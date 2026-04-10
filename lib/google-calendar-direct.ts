import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export interface GoogleCalendarTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
}

/**
 * Encrypt a token (simple implementation - you can enhance with a proper encryption library)
 */
export function encryptToken(token: string): string {
  // For now, we'll use base64 encoding
  // In production, use proper encryption like AES-256
  return Buffer.from(token).toString("base64");
}

/**
 * Decrypt a token
 */
export function decryptToken(encryptedToken: string): string {
  // For now, we'll use base64 decoding
  // In production, use proper decryption
  return Buffer.from(encryptedToken, "base64").toString("utf-8");
}

/**
 * Generate authorization URL for Google OAuth
 */
export function getGoogleAuthUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID not configured");
  }

  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
  });

  if (state) {
    params.append("state", state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleCalendarTokenData> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
    tokenType: data.token_type,
  };
}

/**
 * Get Google Calendar access token from Convex, refreshing if needed
 */
export async function getGoogleAccessTokenDirect(
  convexClient: ConvexHttpClient
): Promise<string | null> {
  try {
    const tokens = await convexClient.query(api.googleCalendar.getTokens);

    if (!tokens) {
      return null;
    }

    // Decrypt tokens
    const accessToken = decryptToken(tokens.accessToken);
    const refreshToken = decryptToken(tokens.refreshToken);

    // Check if token is expired (with 5 minute buffer)
    const isExpired = tokens.expiresAt < Date.now() + 5 * 60 * 1000;

    if (isExpired) {
      // Refresh the token
      const refreshed = await convexClient.action(
        api.googleCalendar.refreshAccessToken,
        {
          refreshToken,
        }
      );

      // Encrypt and store the new tokens
      await convexClient.mutation(api.googleCalendar.updateAccessToken, {
        accessToken: encryptToken(refreshed.accessToken),
        refreshToken: encryptToken(refreshed.refreshToken),
        expiresAt: refreshed.expiresAt,
        scope: refreshed.scope,
        tokenType: refreshed.tokenType,
      });

      return refreshed.accessToken;
    }

    return accessToken;
  } catch (error) {
    console.error("Error getting Google access token:", error);
    return null;
  }
}

/**
 * Get user's Google Calendar profile
 */
export async function getGoogleCalendarProfile(
  accessToken: string
): Promise<any> {
  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList/primary",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google Calendar API error (${response.status}): ${response.statusText} - ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting Google Calendar profile:", error);
    throw error;
  }
}

/**
 * Create an event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    colorId?: string;
  }
): Promise<any> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create event: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    throw error;
  }
}

/**
 * Update an event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: any
): Promise<any> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update event: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating Google Calendar event:", error);
    throw error;
  }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      throw new Error(`Failed to delete event: ${error}`);
    }
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error);
    throw error;
  }
}

/**
 * List events from Google Calendar
 */
export async function listGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  options?: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: string;
  }
): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      ...(options?.timeMin && { timeMin: options.timeMin }),
      ...(options?.timeMax && { timeMax: options.timeMax }),
      ...(options?.maxResults && { maxResults: String(options.maxResults) }),
      ...(options?.singleEvents !== undefined && {
        singleEvents: String(options.singleEvents),
      }),
      ...(options?.orderBy && { orderBy: options.orderBy }),
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error listing Google Calendar events:", error);
    throw error;
  }
}
