import { jwtVerify, createRemoteJWKSet } from 'jose';

const AUTH0_DOMAIN = process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '').replace(/\/$/, '');
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

// Create JWKS (JSON Web Key Set) for JWT verification
const JWKS = AUTH0_DOMAIN
  ? createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`))
  : null;

export interface VerifiedAuth0Payload {
  identity: string;
  email?: string;
  name?: string;
  picture?: string;
  permissions: string[];
  scope?: string;
  sub: string;
  [key: string]: any;
}

/**
 * Verify Auth0 JWT token for AI agent authentication
 * This is useful for securing API routes that accept Bearer tokens
 */
export async function verifyAuth0Token(token: string): Promise<VerifiedAuth0Payload> {
  if (!JWKS) {
    throw new Error('Auth0 domain not configured');
  }

  if (!AUTH0_AUDIENCE) {
    throw new Error('Auth0 audience not configured');
  }

  try {
    // Verify JWT using Auth0's JWKS endpoint
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_AUDIENCE,
    });

    console.log('✅ Auth0 JWT payload verified successfully');

    // Extract and structure the verified data
    return {
      identity: payload.sub!,
      email: payload.email as string,
      name: payload.name as string,
      picture: payload.picture as string,
      permissions: typeof payload.scope === 'string' ? payload.scope.split(' ') : [],
      scope: payload.scope as string,
      sub: payload.sub!,
      ...payload,
    };
  } catch (error) {
    console.error('❌ Auth0 JWT verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  // Remove "Bearer " prefix if present
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Middleware helper to verify Auth0 JWT from request headers
 */
export async function verifyAuth0Request(request: Request): Promise<VerifiedAuth0Payload> {
  const authHeader = request.headers.get('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    throw new Error('No authentication token provided');
  }

  return verifyAuth0Token(token);
}
