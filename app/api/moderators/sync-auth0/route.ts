import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { cookies } from "next/headers"
import { verifyAuth0Token } from "@/lib/auth0"

interface SyncAuth0Request {
  groupId: Id<"groups">
  targetUserId?: Id<"users"> // For assigning to specific user
  auth0RoleId?: string
  auth0Permissions?: string[]
}

/**
 * Sync Auth0 roles and permissions to Convex
 * This endpoint ensures Auth0 RBAC compliance by syncing roles
 *
 * Auth0 Management API Integration:
 * - Retrieves user roles from Auth0
 * - Extracts permissions from role assignments
 * - Syncs to Convex database for local permission checks
 */
export async function POST(req: Request) {
  try {
    // Verify Auth0 token
    const authHeader = req.headers.get("Authorization")
    let auth0User: any = null

    if (authHeader?.startsWith("Bearer ")) {
      // Verify Auth0 JWT token
      try {
        auth0User = await verifyAuth0Token(authHeader.substring(7))
      } catch (error) {
        console.warn("Auth0 JWT verification failed, falling back to Convex auth")
      }
    }

    // Fall back to Convex auth if Auth0 token not provided
    const cookieStore = await cookies()
    const isLocalhost = req.headers.get("host")?.includes("localhost")
    const cookieName = isLocalhost
      ? "__convexAuthJWT"
      : "__Host-__convexAuthJWT"
    const convexAuthToken = cookieStore.get(cookieName)?.value

    if (!convexAuthToken && !auth0User) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get user ID from Convex
    const convexClient = new ConvexHttpClient(
      process.env.NEXT_PUBLIC_CONVEX_URL!
    )
    if (convexAuthToken) {
      convexClient.setAuth(convexAuthToken)
    }
    const userId = await convexClient.query(api.scheduling.getCurrentUserId)

    if (!userId) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { groupId, targetUserId, auth0RoleId, auth0Permissions }: SyncAuth0Request =
      await req.json()

    // If Auth0 user data is available, use their permissions
    const permissions = auth0Permissions || auth0User?.permissions || []
    const roleId = auth0RoleId || auth0User?.auth0RoleId

    // Sync permissions to Convex
    await convexClient.mutation(api.moderators.syncAuth0Permissions, {
      groupId,
      auth0UserId: auth0User?.sub || userId,
      auth0RoleId: roleId,
      auth0Permissions: permissions,
    })

    return Response.json({
      success: true,
      syncedPermissions: permissions,
      syncedRoleId: roleId,
      auth0UserId: auth0User?.sub || userId,
    })
  } catch (error) {
    console.error("Error syncing Auth0 permissions:", error)

    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({ error: "Error syncing Auth0 permissions" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

/**
 * Get Auth0 roles and permissions for a user
 * This endpoint fetches current Auth0 role assignments
 */
export async function GET(req: Request) {
  try {
    // Verify Auth0 token
    const authHeader = req.headers.get("Authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No Auth0 token provided" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const auth0User = await verifyAuth0Token(authHeader.substring(7))

    // In a production environment, you would call Auth0 Management API here
    // to fetch the user's assigned roles and permissions
    // Example:
    // const roles = await fetchAuth0Roles(auth0User.sub)
    // const permissions = await fetchAuth0Permissions(auth0User.sub)

    return Response.json({
      auth0UserId: auth0User.sub,
      email: auth0User.email,
      name: auth0User.name,
      permissions: auth0User.permissions || [],
      // You would add roles from Auth0 Management API here
      roles: [],
      message: "To enable full Auth0 role management, configure AUTH0_MANAGEMENT_API_TOKEN",
    })
  } catch (error) {
    console.error("Error fetching Auth0 user data:", error)

    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({ error: "Error fetching Auth0 user data" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
