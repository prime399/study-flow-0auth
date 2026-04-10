/**
 * MCP Token Injector Service
 *
 * Handles token injection to the external Google Calendar MCP server.
 * Supports two modes:
 * 1. Auth0 Token Vault (new, recommended)
 * 2. Convex-based token storage (legacy, fallback)
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getGoogleCalendarToken, isTokenVaultError, formatTokenVaultError } from "./auth0-token-vault";
import { AUTH0_FEATURE_FLAGS } from "./auth0-ai";

interface TokenInjectionResult {
  success: boolean;
  message: string;
  expiresIn?: number;
  warning?: string;
}

interface MCPServerConfig {
  url: string;
  apiKey: string;
}

/**
 * Get MCP server configuration from environment
 */
function getMCPServerConfig(): MCPServerConfig {
  const url = process.env.GOOGLE_CALENDAR_MCP_URL;
  const apiKey = process.env.GOOGLE_CALENDAR_MCP_API_KEY;

  if (!url || !apiKey) {
    throw new Error(
      'MCP server configuration missing. Set GOOGLE_CALENDAR_MCP_URL and GOOGLE_CALENDAR_MCP_API_KEY environment variables.'
    );
  }

  return { url, apiKey };
}

/**
 * Decrypt base64-encoded token
 */
function decryptToken(encryptedToken: string): string {
  try {
    return Buffer.from(encryptedToken, 'base64').toString('utf-8');
  } catch (error) {
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Inject user tokens to MCP server
 *
 * This function now supports two modes:
 * 1. Auth0 Token Vault (if USE_TOKEN_VAULT_GOOGLE=true)
 * 2. Convex-based storage (legacy fallback)
 *
 * @param userId - The user ID from Convex
 * @param convexAuthToken - The Convex authentication token for the user
 * @returns Promise<TokenInjectionResult>
 */
export async function injectUserTokensToMCP(
  userId: string,
  convexAuthToken: string
): Promise<TokenInjectionResult> {
  // Try Auth0 Token Vault first if enabled
  if (AUTH0_FEATURE_FLAGS.USE_TOKEN_VAULT_GOOGLE) {
    try {
      return await injectTokensFromAuth0(userId);
    } catch (error) {
      console.error('Auth0 Token Vault failed:', error);

      // If fallback is enabled, try Convex approach
      if (AUTH0_FEATURE_FLAGS.FALLBACK_TO_CONVEX) {
        console.warn('Falling back to Convex token storage');
        return await injectTokensFromConvex(userId, convexAuthToken);
      }

      // No fallback, return error
      if (isTokenVaultError(error)) {
        return {
          success: false,
          message: formatTokenVaultError(error),
        };
      }

      return {
        success: false,
        message: 'Failed to get tokens from Auth0 Token Vault',
      };
    }
  }

  // Use Convex-based token storage (legacy mode)
  return await injectTokensFromConvex(userId, convexAuthToken);
}

/**
 * Inject tokens using Auth0 Token Vault (new approach)
 *
 * This is much simpler than Convex approach:
 * - Auth0 handles token storage, refresh, and encryption automatically
 * - No need to check expiry or manually refresh
 * - Just call getAccessTokenFromTokenVault() when needed
 */
async function injectTokensFromAuth0(userId: string): Promise<TokenInjectionResult> {
  try {
    // Get MCP server configuration
    const mcpConfig = getMCPServerConfig();

    // Get access token from Auth0 Token Vault
    // This automatically handles refresh if needed
    const accessToken = await getGoogleCalendarToken();

    // Send token to MCP server
    const response = await fetch(`${mcpConfig.url}/api/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-API-Key': mcpConfig.apiKey,
      },
      body: JSON.stringify({
        userId,
        accessToken,
        tokenType: 'Bearer',
        source: 'auth0-token-vault', // Indicate this came from Token Vault
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: result.message || 'Tokens injected successfully from Auth0 Token Vault',
      expiresIn: result.expiresIn,
    };

  } catch (error) {
    console.error('Error injecting tokens from Auth0:', error);
    throw error; // Re-throw for fallback handling
  }
}

/**
 * Inject tokens using Convex storage (legacy approach)
 *
 * This is the original implementation - kept for backward compatibility
 */
async function injectTokensFromConvex(
  userId: string,
  convexAuthToken: string
): Promise<TokenInjectionResult> {
  try {
    // Get MCP server configuration
    const mcpConfig = getMCPServerConfig();

    // Create Convex client with user's auth token
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(convexAuthToken);

    // Fetch user's Google Calendar tokens from Convex
    const tokens = await convex.query(api.googleCalendar.getTokens, {});

    if (!tokens) {
      return {
        success: false,
        message: 'No Google Calendar tokens found for user. Please connect Google Calendar first.',
      };
    }

    // Check if tokens are expired
    const now = Date.now();
    const timeUntilExpiry = tokens.expiresAt - now;

    // If expired, try to refresh
    if (timeUntilExpiry <= 0) {
      try {
        await convex.action(api.googleCalendar.refreshAccessToken, {
          refreshToken: decryptToken(tokens.refreshToken),
        });
        // Fetch refreshed tokens
        const refreshedTokens = await convex.query(api.googleCalendar.getTokens, {});

        if (!refreshedTokens) {
          return {
            success: false,
            message: 'Failed to refresh expired tokens. Please reconnect Google Calendar.',
          };
        }

        // Use refreshed tokens
        return await sendTokensToMCP(userId, refreshedTokens, mcpConfig);
      } catch (refreshError) {
        return {
          success: false,
          message: 'Tokens expired and refresh failed. Please reconnect Google Calendar.',
        };
      }
    }

    // If expiring soon (within 5 minutes), refresh proactively
    if (timeUntilExpiry < 5 * 60 * 1000) {
      try {
        await convex.action(api.googleCalendar.refreshAccessToken, {
          refreshToken: decryptToken(tokens.refreshToken),
        });
        const refreshedTokens = await convex.query(api.googleCalendar.getTokens, {});

        if (refreshedTokens) {
          return await sendTokensToMCP(userId, refreshedTokens, mcpConfig);
        }
      } catch (refreshError) {
        console.warn('Proactive token refresh failed, using existing tokens:', refreshError);
        // Continue with existing tokens if proactive refresh fails
      }
    }

    // Send tokens to MCP server
    return await sendTokensToMCP(userId, tokens, mcpConfig);

  } catch (error) {
    console.error('Error injecting tokens from Convex:', error);
    return {
      success: false,
      message: `Failed to inject tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Send tokens to MCP server
 */
async function sendTokensToMCP(
  userId: string,
  tokens: any,
  mcpConfig: MCPServerConfig
): Promise<TokenInjectionResult> {
  try {
    // Decrypt tokens
    const accessToken = decryptToken(tokens.accessToken);
    const refreshToken = decryptToken(tokens.refreshToken);

    // Inject tokens to MCP server
    const response = await fetch(`${mcpConfig.url}/api/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-API-Key': mcpConfig.apiKey,
      },
      body: JSON.stringify({
        userId,
        accessToken,
        refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        tokenType: tokens.tokenType || 'Bearer',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: result.message || 'Tokens injected successfully',
      expiresIn: result.expiresIn,
      warning: result.warning,
    };

  } catch (error) {
    throw new Error(`Failed to send tokens to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check token status in MCP server
 *
 * @param userId - The user ID
 * @returns Promise with token status
 */
export async function checkMCPTokenStatus(userId: string): Promise<{
  hasTokens: boolean;
  valid: boolean;
  expiresIn?: number;
}> {
  try {
    const mcpConfig = getMCPServerConfig();

    const response = await fetch(`${mcpConfig.url}/api/tokens/${userId}/status`, {
      headers: {
        'X-API-Key': mcpConfig.apiKey,
      },
    });

    if (!response.ok) {
      return { hasTokens: false, valid: false };
    }

    const status = await response.json();
    return {
      hasTokens: status.hasTokens,
      valid: status.valid,
      expiresIn: status.expiresIn,
    };

  } catch (error) {
    console.error('Error checking MCP token status:', error);
    return { hasTokens: false, valid: false };
  }
}

/**
 * Remove user tokens from MCP server (logout)
 *
 * @param userId - The user ID
 * @returns Promise<boolean> - true if successful
 */
export async function removeUserTokensFromMCP(userId: string): Promise<boolean> {
  try {
    const mcpConfig = getMCPServerConfig();

    const response = await fetch(`${mcpConfig.url}/api/tokens/${userId}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': mcpConfig.apiKey,
      },
    });

    return response.ok;

  } catch (error) {
    console.error('Error removing tokens from MCP:', error);
    return false;
  }
}

/**
 * Check if MCP server is available and healthy
 *
 * @returns Promise<boolean> - true if MCP server is healthy
 */
export async function checkMCPServerHealth(): Promise<boolean> {
  try {
    const mcpConfig = getMCPServerConfig();

    const response = await fetch(`${mcpConfig.url}/health`, {
      method: 'GET',
      // Health endpoint doesn't require API key
    });

    if (!response.ok) {
      return false;
    }

    const health = await response.json();
    return health.status === 'healthy';

  } catch (error) {
    console.error('Error checking MCP server health:', error);
    return false;
  }
}
