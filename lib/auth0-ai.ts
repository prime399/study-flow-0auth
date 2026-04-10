/**
 * Auth0 AI Token Vault Configuration
 *
 * This file initializes the Auth0 AI SDK for Token Vault integration.
 * It manages OAuth tokens for third-party APIs (Google Calendar, Spotify, etc.)
 * while keeping Convex Auth for user authentication.
 *
 * Architecture: Hybrid Auth
 * - Convex Auth: User login/signup
 * - Auth0 Token Vault: Third-party API token management
 *
 * Note: This is separate from auth0-config.ts which is for traditional Auth0 authentication
 */

import { Auth0AI } from "@auth0/ai-vercel";
import { SUBJECT_TOKEN_TYPES } from "@auth0/ai";

// Validate required environment variables
const requiredEnvVars = [
  "AUTH0_DOMAIN",
  "AUTH0_API_CLIENT_ID",
  "AUTH0_API_CLIENT_SECRET",
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(
      `[Auth0 Token Vault] Missing environment variable: ${envVar}. Token Vault features will be disabled.`
    );
  }
}

/**
 * Auth0 AI instance for Token Vault operations
 * This handles secure token storage, refresh, and injection for AI agents
 */
export const auth0AI = new Auth0AI({
  auth0: {
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_API_CLIENT_ID!,
    clientSecret: process.env.AUTH0_API_CLIENT_SECRET!,
  },
});

/**
 * Google Calendar scopes required for MentorMind
 * These scopes allow read-only access to calendar data
 */
const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.freebusy",
] as const;

/**
 * Creates a Token Vault wrapper for Google Calendar API access
 *
 * @param accessToken - User's Convex Auth access token for identity verification
 * @returns Token Vault wrapper function that automatically injects Google tokens
 *
 * @example
 * ```typescript
 * const wrapper = createGoogleCalendarTokenVault(userAccessToken);
 * const listCalendarsTool = wrapper(originalTool);
 * ```
 */
export const createGoogleCalendarTokenVault = (accessToken: string) => {
  if (!accessToken) {
    throw new Error("Access token is required to create Token Vault wrapper");
  }

  return auth0AI.withTokenVault({
    // Provide user's access token for identity context
    accessToken: async () => accessToken,

    // Type of token being exchanged (access token from Convex Auth)
    subjectTokenType: SUBJECT_TOKEN_TYPES.SUBJECT_TYPE_ACCESS_TOKEN,

    // Auth0 connection name for Google OAuth
    connection: process.env.AUTH0_GOOGLE_CONNECTION || "google-oauth2",

    // Required Google Calendar API scopes
    scopes: [...GOOGLE_CALENDAR_SCOPES],
  });
};

/**
 * Creates a Token Vault wrapper for Spotify API access
 * Similar to Google Calendar but with Spotify-specific scopes
 *
 * @param accessToken - User's Convex Auth access token
 * @returns Token Vault wrapper for Spotify tools
 *
 * @future This can be extended once Spotify integration is migrated
 */
export const createSpotifyTokenVault = (accessToken: string) => {
  if (!accessToken) {
    throw new Error("Access token is required to create Token Vault wrapper");
  }

  return auth0AI.withTokenVault({
    accessToken: async () => accessToken,
    subjectTokenType: SUBJECT_TOKEN_TYPES.SUBJECT_TYPE_ACCESS_TOKEN,
    connection: process.env.AUTH0_SPOTIFY_CONNECTION || "spotify",
    scopes: [
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-currently-playing",
      "playlist-read-private",
      "playlist-read-collaborative",
    ],
  });
};

/**
 * Feature flags for gradual rollout
 */
export const AUTH0_FEATURE_FLAGS = {
  // Enable Token Vault for Google Calendar
  USE_TOKEN_VAULT_GOOGLE: process.env.USE_TOKEN_VAULT_GOOGLE === "true",

  // Enable Token Vault for Spotify (future)
  USE_TOKEN_VAULT_SPOTIFY: process.env.USE_TOKEN_VAULT_SPOTIFY === "true",

  // Fallback to Convex token storage if Token Vault fails
  FALLBACK_TO_CONVEX: process.env.FALLBACK_TO_CONVEX !== "false", // Default true
} as const;

/**
 * Configuration object for Auth0 Token Vault integration
 */
export const AUTH0_AI_CONFIG = {
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_API_CLIENT_ID!,
  audience: process.env.AUTH0_AUDIENCE || `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
  scopes: {
    googleCalendar: GOOGLE_CALENDAR_SCOPES,
  },
} as const;
