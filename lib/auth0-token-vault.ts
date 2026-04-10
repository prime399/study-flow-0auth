/**
 * Auth0 Token Vault Helper Functions
 *
 * This module provides utilities for retrieving OAuth tokens from Auth0's Token Vault.
 * It replaces the manual token management previously handled by Convex.
 *
 * Key Features:
 * - Automatic token retrieval from Token Vault
 * - Error handling for authorization failures
 * - Integration with AI tools (MCP)
 */

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel";
import { TokenVaultError } from "@auth0/ai/interrupts";

/**
 * Retrieves Google Calendar access token from Auth0 Token Vault
 *
 * This function is called within AI tool execution (e.g., MCP tools).
 * If the token is not available or expired, it throws a TokenVaultError
 * which triggers the consent flow in the UI.
 *
 * @throws {TokenVaultError} When authorization is needed (triggers consent popup)
 * @throws {Error} For other unexpected errors
 * @returns Promise<string> The Google Calendar access token
 *
 * @example
 * ```typescript
 * // Inside an MCP tool:
 * async function listCalendars() {
 *   const token = await getGoogleCalendarToken();
 *   const calendar = google.calendar("v3");
 *   auth.setCredentials({ access_token: token });
 *   // ... make API call
 * }
 * ```
 */
export async function getGoogleCalendarToken(): Promise<string> {
  try {
    const token = getAccessTokenFromTokenVault();

    if (!token) {
      throw new TokenVaultError(
        "Authorization required to access the Google Calendar API. " +
          "MentorMind needs permission to view your calendar events."
      );
    }

    return token;
  } catch (error) {
    // Re-throw TokenVaultError to trigger consent flow
    if (error instanceof TokenVaultError) {
      throw error;
    }

    // Log unexpected errors
    console.error("Token Vault error:", error);
    throw new Error(
      `Failed to retrieve token from Auth0 Token Vault: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Retrieves Spotify access token from Auth0 Token Vault
 *
 * @future This will be used once Spotify integration is migrated to Token Vault
 * @throws {TokenVaultError} When authorization is needed
 * @returns Promise<string> The Spotify access token
 */
export async function getSpotifyToken(): Promise<string> {
  try {
    const token = getAccessTokenFromTokenVault();

    if (!token) {
      throw new TokenVaultError(
        "Authorization required to access the Spotify API. " +
          "MentorMind needs permission to control your music playback."
      );
    }

    return token;
  } catch (error) {
    if (error instanceof TokenVaultError) {
      throw error;
    }

    console.error("Token Vault error (Spotify):", error);
    throw new Error(
      `Failed to retrieve Spotify token from Auth0 Token Vault: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Checks if a TokenVaultError indicates a specific type of auth failure
 *
 * @param error - The error to check
 * @returns boolean indicating if this is an auth-related error
 */
export function isAuthorizationError(error: unknown): boolean {
  return error instanceof TokenVaultError;
}

/**
 * Formats token vault errors for user-friendly display
 *
 * @param error - The error to format
 * @returns User-friendly error message
 */
export function formatTokenVaultError(error: unknown): string {
  if (error instanceof TokenVaultError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Don't expose internal error details to users
    if (error.message.includes("Token Vault")) {
      return "Unable to access your connected services. Please try reconnecting.";
    }
    return error.message;
  }

  return "An unexpected error occurred while accessing your connected services.";
}

/**
 * Type guard to check if error is TokenVaultError
 */
export function isTokenVaultError(error: unknown): error is TokenVaultError {
  return error instanceof TokenVaultError;
}
