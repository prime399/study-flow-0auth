import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Initialize Auth0 with enhanced configuration for AI agent integration
export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || '',
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  appBaseUrl: process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL || '',
  secret: process.env.AUTH0_SECRET || '',
  authorizationParameters: {
    // Request specific scopes for AI agent functionality
    // CRITICAL: offline_access is required for refresh tokens
    scope: process.env.AUTH0_SCOPE || 'openid profile email offline_access',
    // Set audience for API access (required for access tokens)
    audience: process.env.AUTH0_AUDIENCE,
    // Force consent screen to ensure refresh token is granted
    prompt: 'consent',
  },
  session: {
    // Enable rolling sessions for better security
    rolling: true,
    // Absolute duration of the session (7 days)
    absoluteDuration: 60 * 60 * 24 * 7,
    // Inactivity duration (1 day)
    inactivityDuration: 60 * 60 * 24,
  },
  routes: {
    callback: '/api/auth/callback',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },
});

// Helper to get access token with automatic refresh
export const getAccessToken = async () => {
  try {
    const tokenResult = await auth0.getAccessToken();

    if (!tokenResult || !tokenResult.token) {
      throw new Error('No access token found in Auth0 session');
    }

    return {
      token: tokenResult.token,
      expiresAt: tokenResult.expiresAt,
    };
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

// Helper to get refresh token for delegation
export const getRefreshToken = async () => {
  try {
    const session = await auth0.getSession();
    
    if (!session?.refreshToken) {
      throw new Error('No refresh token found in session');
    }

    return session.refreshToken;
  } catch (error) {
    console.error('Error getting refresh token:', error);
    throw error;
  }
};

// Helper to get user session
export const getUser = async () => {
  try {
    const session = await auth0.getSession();
    return session?.user || null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
};

// Helper to update user session with custom data
// For App Router (Server Actions, Route Handlers)
export const updateUserSession = async (
  customData: Record<string, any>
) => {
  try {
    const session = await auth0.getSession();
    
    if (!session) {
      throw new Error('No active session to update');
    }

    await auth0.updateSession({
      ...session,
      user: {
        ...session.user,
        ...customData,
      },
    });

    return true;
  } catch (error) {
    console.error('Error updating session:', error);
    return false;
  }
};
