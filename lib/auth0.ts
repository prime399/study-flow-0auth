// Re-export auth0 config and helpers
export { auth0, getAccessToken, getRefreshToken, getUser, updateUserSession } from './auth0-config';

// Re-export JWT verification utilities
export { verifyAuth0Token, verifyAuth0Request, extractBearerToken } from './auth0-jwt-verifier';

export interface Auth0Session {
  user: {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
    [key: string]: any;
  };
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
}

/**
 * Get Auth0 session from the current context
 * This is a convenience wrapper around auth0.getSession()
 */
export async function getAuth0Session(): Promise<Auth0Session | null> {
  try {
    const { auth0 } = await import('./auth0-config');
    const session = await auth0.getSession();
    return session as Auth0Session | null;
  } catch (error) {
    console.error('Error getting Auth0 session:', error);
    return null;
  }
}
