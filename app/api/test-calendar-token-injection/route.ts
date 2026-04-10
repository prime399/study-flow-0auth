/**
 * Test endpoint for Google Calendar MCP token injection
 * Tests the full flow: Convex → Token Fetch → Decrypt → Inject to MCP → Verify
 */

import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'
import { injectUserTokensToMCP, checkMCPServerHealth, checkMCPTokenStatus } from '@/lib/mcp-token-injector'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    // Check if MCP server is healthy
    const isHealthy = await checkMCPServerHealth()

    if (!isHealthy) {
      return Response.json({
        success: false,
        error: 'MCP server is not healthy or not accessible',
        mcpUrl: process.env.GOOGLE_CALENDAR_MCP_URL,
      }, { status: 503 })
    }

    // Get auth token from request headers
    const authHeader = request.headers.get('Authorization')
    const convexAuthToken = authHeader?.replace('Bearer ', '')

    if (!convexAuthToken) {
      return Response.json({
        success: false,
        error: 'No authorization token provided. Please include "Authorization: Bearer <token>" header',
      }, { status: 401 })
    }

    // Create Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    convex.setAuth(convexAuthToken)

    // Try to fetch user info to get userId
    let userId: string
    try {
      // This will fail if not authenticated, which is fine for testing
      // In production, you'd use getAuthUserId from Convex server
      const viewer = await convex.query(api.googleCalendar.getTokens, {})

      if (!viewer) {
        return Response.json({
          success: false,
          error: 'User not authenticated or no Google Calendar tokens found in Convex',
          help: 'Please connect your Google Calendar first',
        }, { status: 401 })
      }

      // For testing, we'll use a test user ID
      // In production, extract from Convex auth
      userId = 'test_user_from_convex'
    } catch (error) {
      return Response.json({
        success: false,
        error: 'Failed to authenticate with Convex',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 401 })
    }

    // Inject tokens to MCP server
    const injectionResult = await injectUserTokensToMCP(userId, convexAuthToken)

    if (!injectionResult.success) {
      return Response.json({
        success: false,
        error: 'Token injection failed',
        details: injectionResult,
      }, { status: 500 })
    }

    // Verify tokens were injected successfully
    const tokenStatus = await checkMCPTokenStatus(userId)

    return Response.json({
      success: true,
      message: 'Token injection test completed successfully',
      injection: injectionResult,
      tokenStatus,
      mcpServerHealth: true,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Test endpoint error:', error)

    return Response.json({
      success: false,
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}

/**
 * POST endpoint with manual user ID for testing
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, testWithMockTokens } = body

    if (!userId) {
      return Response.json({
        success: false,
        error: 'userId is required in request body',
      }, { status: 400 })
    }

    // Check MCP server health
    const isHealthy = await checkMCPServerHealth()

    if (!isHealthy) {
      return Response.json({
        success: false,
        error: 'MCP server is not healthy',
        mcpUrl: process.env.GOOGLE_CALENDAR_MCP_URL,
      }, { status: 503 })
    }

    if (testWithMockTokens) {
      // Test with mock tokens (no Convex required)
      const mcpUrl = process.env.GOOGLE_CALENDAR_MCP_URL
      const mcpApiKey = process.env.GOOGLE_CALENDAR_MCP_API_KEY

      if (!mcpUrl || !mcpApiKey) {
        return Response.json({
          success: false,
          error: 'MCP server configuration missing',
        }, { status: 500 })
      }

      // Inject mock tokens directly
      const response = await fetch(`${mcpUrl}/api/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': mcpApiKey,
          'Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        },
        body: JSON.stringify({
          userId,
          accessToken: 'ya29.mock_token_for_testing',
          refreshToken: '1//mock_refresh_for_testing',
          expiresAt: Date.now() + 3600000, // 1 hour
          scope: 'https://www.googleapis.com/auth/calendar',
          tokenType: 'Bearer',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return Response.json({
          success: false,
          error: 'Mock token injection failed',
          details: errorText,
        }, { status: 500 })
      }

      const result = await response.json()

      // Check status
      const tokenStatus = await checkMCPTokenStatus(userId)

      return Response.json({
        success: true,
        message: 'Mock token injection successful',
        injection: result,
        tokenStatus,
        note: 'These are mock tokens - calendar API calls will fail',
      })
    }

    // Test with real Convex tokens
    const authHeader = request.headers.get('Authorization')
    const convexAuthToken = authHeader?.replace('Bearer ', '')

    if (!convexAuthToken) {
      return Response.json({
        success: false,
        error: 'Authorization header required for real token test',
      }, { status: 401 })
    }

    const injectionResult = await injectUserTokensToMCP(userId, convexAuthToken)

    if (!injectionResult.success) {
      return Response.json({
        success: false,
        error: 'Token injection failed',
        details: injectionResult,
      }, { status: 500 })
    }

    const tokenStatus = await checkMCPTokenStatus(userId)

    return Response.json({
      success: true,
      message: 'Real token injection successful',
      injection: injectionResult,
      tokenStatus,
    })

  } catch (error) {
    console.error('POST test endpoint error:', error)

    return Response.json({
      success: false,
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
