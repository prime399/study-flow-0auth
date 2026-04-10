import { cookies } from 'next/headers';
import { ConvexHttpClient } from 'convex/browser';

/**
 * Gets the correct Convex Auth JWT cookie name based on environment
 * - Production: __Host-__convexAuthJWT (secure prefix)
 * - Localhost: __convexAuthJWT (no prefix)
 */
export function getConvexAuthCookieName(request: Request): string {
  const isLocalhost = request.headers.get('host')?.includes('localhost');
  return isLocalhost ? '__convexAuthJWT' : '__Host-__convexAuthJWT';
}

/**
 * Creates an authenticated Convex HTTP client for use in API routes
 * @param request The incoming request object
 * @returns Authenticated ConvexHttpClient or null if not authenticated
 */
export async function getAuthenticatedConvexClient(
  request: Request
): Promise<ConvexHttpClient | null> {
  const cookieStore = await cookies();
  const cookieName = getConvexAuthCookieName(request);
  const convexAuthToken = cookieStore.get(cookieName)?.value;

  if (!convexAuthToken) {
    return null;
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
  }

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(convexAuthToken);
  return client;
}
