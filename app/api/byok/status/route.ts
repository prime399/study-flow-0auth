/**
 * BYOK status endpoint
 * Returns whether user has active API keys configured
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function GET(req: NextRequest) {
  try {
    // Get Convex auth token
    const cookieStore = await cookies();
    const isLocalhost = req.headers.get("host")?.includes("localhost");
    const cookieName = isLocalhost
      ? "__convexAuthJWT"
      : "__Host-__convexAuthJWT";
    const convexAuthToken = cookieStore.get(cookieName)?.value;

    if (!convexAuthToken) {
      return NextResponse.json({
        connected: false,
        message: "Not authenticated",
      });
    }

    // Check if user has any active API keys
    const convexClient = new ConvexHttpClient(
      process.env.NEXT_PUBLIC_CONVEX_URL!
    );
    convexClient.setAuth(convexAuthToken);

    const userApiKeys = await convexClient.query(api.userApiKeys.getUserApiKeys);

    if (!userApiKeys || userApiKeys.length === 0) {
      return NextResponse.json({
        connected: false,
        count: 0,
      });
    }

    const activeKeys = userApiKeys.filter((key) => key.isActive);

    return NextResponse.json({
      connected: activeKeys.length > 0,
      count: userApiKeys.length,
      activeCount: activeKeys.length,
      providers: activeKeys.map((key) => key.provider),
    });
  } catch (error) {
    console.error("Error checking BYOK status:", error);
    return NextResponse.json(
      {
        connected: false,
        error: "Failed to check BYOK status",
      },
      { status: 500 }
    );
  }
}
