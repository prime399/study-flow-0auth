import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server"
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { auth0 } from "@/lib/auth0"

const isSignInPage = createRouteMatcher(["/signin"])
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"])
const isAuth0Route = createRouteMatcher(["/api/auth/(.*)"])
const isSpotifyOAuthRoute = createRouteMatcher([
  "/api/spotify-direct/auth",
  "/api/spotify-direct/callback"
])
const isGoogleCalendarOAuthRoute = createRouteMatcher([
  "/api/google-calendar/auth",
  "/api/google-calendar/callback"
])

// Create Convex middleware handler (without Auth0 logic)
const convexMiddleware = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  // Handle Convex auth routes
  if (isSignInPage(request) && convexAuth.isAuthenticated()) {
    return nextjsMiddlewareRedirect(request, "/dashboard")
  }
  if (isProtectedRoute(request) && !convexAuth.isAuthenticated()) {
    return nextjsMiddlewareRedirect(request, "/signin")
  }

  // For all other routes, return a standard response
  return NextResponse.next()
})

// Main middleware function - handle Auth0 and Spotify OAuth BEFORE Convex
export default function middleware(request: NextRequest) {
  // Handle Auth0 routes FIRST, completely isolated from Convex
  if (isAuth0Route(request)) {
    return auth0.middleware(request)
  }

  // Handle Spotify OAuth routes - allow them to bypass Convex auth
  // These routes need to work during the OAuth flow before user is fully authenticated
  if (isSpotifyOAuthRoute(request)) {
    return NextResponse.next()
  }

  if (isGoogleCalendarOAuthRoute(request)) {
    // Skip Convex auth handling so Google keeps its OAuth code intact
    return NextResponse.next()
  }

  // For all other routes, use Convex middleware
  return (convexMiddleware as any)(request)
}

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
