import { AIRequestBody } from "@/lib/types"
import OpenAI from "openai"
import { cookies } from "next/headers"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

import { buildSystemPrompt } from "./_lib/system-prompt"
import { sanitizeMessages } from "./_lib/message-sanitizer"
import {
  validateOpenAIConfig,
  createOpenAIClient,
  DEFAULT_COMPLETION_OPTIONS,
  fetchChatCompletion,
  type ChatCompletionOptions,
} from "./_lib/openai-client"
import { processAIResponse } from "./_lib/response-processor"
import { resolveModelRouting } from "./_lib/model-router"
import { injectUserTokensToMCP } from "@/lib/mcp-token-injector"
import { getAIConfig, isBYOKConfig, recordBYOKUsage } from "./_lib/byok-helper"
import { createProvider } from "./_lib/providers/factory"
import { isTokenVaultError, formatTokenVaultError } from "@/lib/auth0-token-vault"

interface McpTool {
  id: string
  name: string
  namespace: string
  description: string
  inputSchema?: any
}

async function fetchAvailableMcpTools(requestUrl?: string): Promise<McpTool[]> {
  try {
    // Skip MCP tools in production if no URL is available
    // MCP tools are typically for local development with MCP servers
    if (!requestUrl && !process.env.NEXT_PUBLIC_APP_URL) {
      console.log('Skipping MCP tools fetch - no base URL available (production environment)')
      return []
    }
    
    const baseUrl = requestUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    // Fetch all Heroku-registered MCP tools (including Google Calendar MCP addon)
    const response = await fetch(`${baseUrl}/api/ai-helper/mcp-servers`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      console.warn('Failed to fetch MCP tools, continuing without them')
      return []
    }
    
    const data = await response.json()
    return data.tools || []
  } catch (error) {
    console.warn('Error fetching MCP tools:', error)
    return []
  }
}

async function callHerokuAgentsEndpoint(
  config: { herokuBaseUrl: string; herokuApiKey: string; herokuModelId: string },
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  mcpTools: McpTool[],
  retryCount = 0
): Promise<any> {
  const agentsUrl = `${config.herokuBaseUrl.replace(/\/$/, "")}/v1/agents/heroku`
  const MAX_RETRIES = 2

  // Filter out tools with missing IDs and deduplicate
  const validTools = mcpTools.filter(tool => {
    if (!tool.id || typeof tool.id !== 'string') {
      console.warn(`[AI Helper] Skipping tool with missing or invalid id:`, tool)
      return false
    }
    return true
  })

  const uniqueTools = validTools.reduce((acc, tool) => {
    if (!acc.find(t => t.id === tool.id)) {
      acc.push(tool)
    }
    return acc
  }, [] as McpTool[])

  // Log filtering and deduplication stats
  if (mcpTools.length !== validTools.length) {
    console.log(`[AI Helper] Filtered ${mcpTools.length - validTools.length} invalid tools`)
  }
  if (validTools.length !== uniqueTools.length) {
    console.log(`[AI Helper] Deduplicated ${validTools.length} tools to ${uniqueTools.length} unique tools`)
  }

  const toolsArray = uniqueTools.map(tool => ({
    type: "mcp",
    name: tool.id,
  }))

  const requestBody: any = {
    model: config.herokuModelId,
    messages,
    tools: toolsArray,
  }

  console.log(`[AI Helper] Request body tools:`, JSON.stringify(toolsArray, null, 2))

  console.log(`[AI Helper] Calling Heroku Agents API with ${toolsArray.length} tools (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`)

  try {
    const response = await fetch(agentsUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.herokuApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()

      // Retry on 503 (Service Unavailable) errors
      if (response.status === 503 && retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000) // Exponential backoff: 1s, 2s, 5s
        console.warn(`[AI Helper] Got 503 error, retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return callHerokuAgentsEndpoint(config, messages, mcpTools, retryCount + 1)
      }

      throw new Error(`Heroku Agents API error (${response.status}): ${errorText}`)
    }

    // Parse SSE response
    const text = await response.text()
    const lines = text.split('\n')
    let lastCompletion: any = null
    let toolCalls: any[] = []

    for (const line of lines) {
      if (line.startsWith('data:')) {
        const data = line.slice(5).trim()
        if (data === '[DONE]') break

        try {
          const parsed = JSON.parse(data)

          // Log all SSE events for debugging
          if (parsed.object) {
            console.log(`[AI Helper] SSE event:`, JSON.stringify(parsed, null, 2))
          }

          // Log tool invocations for debugging
          if (parsed.object === 'tool.completion') {
            const toolName = parsed.choices?.[0]?.message?.name || parsed.tool?.name || parsed.name || 'unknown'
            const toolContent = parsed.choices?.[0]?.message?.content || ''
            console.log(`[AI Helper] Tool invoked: ${toolName}`)
            console.log(`[AI Helper] Tool result:`, toolContent.substring(0, 500))
            toolCalls.push(parsed)
          }

          // Collect chat completions (including tool calls and responses)
          if (parsed.object === 'chat.completion' || parsed.object === 'tool.completion') {
            lastCompletion = parsed
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }

    if (toolCalls.length > 0) {
      console.log(`[AI Helper] Total tools invoked: ${toolCalls.length}`)
    }

    if (!lastCompletion) {
      throw new Error("No valid completion received from Heroku Agents API")
    }

    return lastCompletion
  } catch (error) {
    // Retry on network errors
    if (retryCount < MAX_RETRIES && error instanceof Error &&
        (error.message.includes('fetch') || error.message.includes('ECONNRESET'))) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000)
      console.warn(`[AI Helper] Network error, retrying in ${delay}ms...`, error.message)
      await new Promise(resolve => setTimeout(resolve, delay))
      return callHerokuAgentsEndpoint(config, messages, mcpTools, retryCount + 1)
    }
    throw error
  }
}

export async function POST(req: Request) {
  try {
    // ===== OPTIONAL AUTHENTICATION FOR GOOGLE CALENDAR =====
    // Extract Convex auth token from cookies (optional - only needed for Google Calendar)
    const cookieStore = await cookies()
    const isLocalhost = req.headers.get('host')?.includes('localhost')
    const cookieName = isLocalhost ? '__convexAuthJWT' : '__Host-__convexAuthJWT'
    const convexAuthToken = cookieStore.get(cookieName)?.value

    // Get user ID if authenticated (for Google Calendar MCP token injection)
    let userId: string | null = null
    if (convexAuthToken) {
      try {
        const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
        convexClient.setAuth(convexAuthToken)
        userId = await convexClient.query(api.scheduling.getCurrentUserId)
      } catch (error) {
        console.warn('[AI Helper] Failed to get user ID from auth token:', error)
        // Continue without user ID - calendar tools won't work but AI helper will
      }
    }

    const { messages, userName, studyStats, groupInfo, modelId, mcpToolId }: AIRequestBody & { modelId?: string; mcpToolId?: string } =
      await req.json()

    const routingDecision = resolveModelRouting({
      messages,
      studyStats,
      modelId,
    })

    // ===== BYOK (Bring Your Own Key) CHECK =====
    // Check if user has their own API key configured
    // If yes, use BYOK (no coins charged)
    // If no or error, fall back to platform keys (coins charged)
    const aiConfig = await getAIConfig(
      convexAuthToken,
      process.env.NEXT_PUBLIC_CONVEX_URL!,
      routingDecision.resolvedModelId,
      () => {
        // Platform config fallback
        const platformConfig = validateOpenAIConfig(routingDecision.resolvedModelId);
        return {
          ...platformConfig,
          isBYOK: false as const,
        };
      }
    );

    // Log which config is being used
    if (isBYOKConfig(aiConfig)) {
      console.log(`[BYOK] Using user's ${aiConfig.provider} key (model: ${aiConfig.modelId})`)
      console.log('[BYOK] No coins will be charged for this query')
    } else {
      console.log(`[Platform] Using platform keys (model: ${aiConfig.herokuModelId})`)
      console.log('[Platform] 100 coins will be charged for this query')
    }

    // Validate and get OpenAI configuration for the resolved model
    const config = isBYOKConfig(aiConfig)
      ? { herokuBaseUrl: aiConfig.baseUrl || '', herokuApiKey: aiConfig.apiKey, herokuModelId: aiConfig.modelId }
      : aiConfig

    // Get base URL from request for MCP tools fetch
    const url = new URL(req.url)
    const baseUrl = `${url.protocol}//${url.host}`

    // Fetch all available MCP tools
    let availableMcpTools = await fetchAvailableMcpTools(baseUrl)

    // Filter tools if user selected a specific tool
    if (mcpToolId && mcpToolId !== 'none') {
      const selectedTool = availableMcpTools.find(tool => tool.id === mcpToolId)
      if (selectedTool) {
        availableMcpTools = [selectedTool]
        console.log(`[AI Helper] User selected specific tool: ${mcpToolId}`)
      }
    }

    // ===== GOOGLE CALENDAR MCP TOKEN INJECTION =====
    // If Google Calendar MCP tools are available and user is authenticated, inject tokens
    // Calendar tools can be under different namespaces: 'mcp', 'google-calendar', 'google-calendar-local'
    const calendarToolNames = ['list-calendars', 'list-events', 'create-event', 'update-event',
                                'delete-event', 'get-event', 'search-events', 'get-freebusy',
                                'list-colors', 'get-current-time']
    const hasGoogleCalendarTools = availableMcpTools.some(
      tool => tool.namespace === 'mcp' ||
              tool.namespace === 'google-calendar' ||
              tool.namespace === 'google-calendar-local' ||
              calendarToolNames.includes(tool.name)
    )

    if (hasGoogleCalendarTools && userId && convexAuthToken) {
      try {
        console.log(`[AI Helper] Injecting Google Calendar tokens for user: ${userId}`)
        const injectionResult = await injectUserTokensToMCP(userId, convexAuthToken)

        if (!injectionResult.success) {
          console.warn(`[AI Helper] Token injection failed: ${injectionResult.message}`)
          // Don't fail the request, but log the warning
          // The user will get an error when they try to use calendar tools
        } else {
          console.log(`[AI Helper] Tokens injected successfully. Expires in: ${injectionResult.expiresIn}ms`)
        }
      } catch (error) {
        console.error('[AI Helper] Error during token injection:', error)
        // Continue with the request even if token injection fails
        // The calendar tools will return appropriate errors if tokens are missing
      }
    } else if (hasGoogleCalendarTools && !userId) {
      console.log('[AI Helper] Google Calendar tools available but user not authenticated - calendar tools will not work')
    }

    // Build system prompt with user context
    const baseSystemPrompt = buildSystemPrompt({ userName, studyStats, groupInfo })

    // Check for calendar tools FIRST
    const calendarTools = availableMcpTools.filter(t =>
      t.namespace === 'mcp' || t.namespace === 'google-calendar' || t.namespace === 'google-calendar-local'
    )
    const otherTools = availableMcpTools.filter(t =>
      t.namespace !== 'mcp' && t.namespace !== 'google-calendar' && t.namespace !== 'google-calendar-local'
    )

    // Put userId requirement FIRST if calendar tools are available
    let systemPrompt = ''

    if (calendarTools.length > 0 && userId) {
      systemPrompt = `🚨🚨🚨 CRITICAL INSTRUCTION - READ THIS FIRST 🚨🚨🚨

WHEN CALLING ANY CALENDAR TOOL, THE VERY FIRST PARAMETER MUST ALWAYS BE:
userId: "${userId}"

DO NOT FORGET THIS! Every single calendar tool call needs userId as the first parameter.

Examples of CORRECT tool calls:
- get-current-time({ "userId": "${userId}" })
- create-event({ "userId": "${userId}", "calendarId": "primary", "summary": "...", "start": "...", "end": "..." })
- list-events({ "userId": "${userId}", "calendarId": "primary", "timeMin": "...", "timeMax": "..." })

If you call a calendar tool WITHOUT userId, it will fail with error -32602.

===========================================

${baseSystemPrompt}`
    } else {
      systemPrompt = baseSystemPrompt
    }

    // Add MCP tool instruction if tools are available
    if (availableMcpTools.length > 0) {
      const toolsList = availableMcpTools
        .map(tool => `- ${tool.name}: ${tool.description}`)
        .join('\n')

      let toolInstructions = `

## Available MCP Tools

You have access to the following tools to help users:
${toolsList}`

      toolInstructions += `

## Tool Usage Guidelines

**IMPORTANT: You MUST use these tools to perform actions. Simply describing what you would do is NOT sufficient.**`

      if (calendarTools.length > 0 && userId) {
        toolInstructions += `

### Google Calendar Tools - ALWAYS START WITH userId!

**Example Flow for "Create a study session tomorrow at 2 PM":**
1. Call get-current-time with: { "userId": "${userId}" }
2. Calculate tomorrow's date at 2 PM
3. Call create-event with: { "userId": "${userId}", "calendarId": "primary", "summary": "Study Session", "start": "2025-11-06T14:00:00", "end": "2025-11-06T15:00:00" }

**Quick Reference - ALWAYS include userId as first parameter:**
- get-current-time({ "userId": "${userId}" })
- list-events({ "userId": "${userId}", "calendarId": "primary", "timeMin": "...", "timeMax": "..." })
- create-event({ "userId": "${userId}", "calendarId": "primary", "summary": "...", "start": "...", "end": "..." })
- search-events({ "userId": "${userId}", "calendarId": "primary", "query": "..." })
- update-event({ "userId": "${userId}", "calendarId": "primary", "eventId": "...", ... })
- delete-event({ "userId": "${userId}", "calendarId": "primary", "eventId": "..." })

**Requirements:**
- Always use calendarId: "primary" for the user's main calendar
- Use ISO 8601 format WITHOUT timezone: "2025-11-06T14:00:00"
- After creating/updating an event, confirm with the user`
      }

      if (otherTools.length > 0) {
        toolInstructions += `

### Document Tools
- Use html_to_markdown to fetch and read web pages when users share URLs
- Use pdf_to_markdown to extract text from PDF documents`
      }

      toolInstructions += `

**Remember:** ALWAYS actually call the tools. Don't just explain what you would do - DO IT!`

      systemPrompt = systemPrompt + toolInstructions
    }

    // Log system prompt for debugging (show first 600 chars to verify userId warning is at top)
    if (userId && hasGoogleCalendarTools) {
      console.log(`[AI Helper] System prompt starts with:`)
      console.log(systemPrompt.substring(0, 600))
      console.log(`[AI Helper] System prompt begins with 🚨: ${systemPrompt.startsWith('🚨')}`)
      console.log(`[AI Helper] System prompt includes userId "${userId}": ${systemPrompt.includes(userId)}`)
    }

    // Prepare chat messages
    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...sanitizeMessages(messages),
    ]

    let completion: OpenAI.Chat.Completions.ChatCompletion

    // Use Heroku Agents endpoint with all registered MCP tools
    if (availableMcpTools.length > 0) {
      console.log(`[AI Helper] Using ${availableMcpTools.length} Heroku-registered MCP tools`)
      completion = await callHerokuAgentsEndpoint(
        config,
        chatMessages,
        availableMcpTools
      )
    } else {
      // Fall back to standard OpenAI client if no MCP tools available
      const client = createOpenAIClient(config)

      const completionOptions: ChatCompletionOptions = {
        model: config.herokuModelId,
        messages: chatMessages,
        ...DEFAULT_COMPLETION_OPTIONS,
      }

      completion = await fetchChatCompletion(client, completionOptions)
    }

    // Process response and extract tables
    const { choices, toolInvocations } = processAIResponse(completion)

    // Record BYOK usage if applicable
    if (isBYOKConfig(aiConfig) && convexAuthToken) {
      await recordBYOKUsage(
        convexAuthToken,
        process.env.NEXT_PUBLIC_CONVEX_URL!,
        aiConfig.provider
      )
    }

    const responsePayload = {
      ...completion,
      choices,
      toolInvocations,
      routing: routingDecision,
      selectedModel: routingDecision.resolvedModelId,
      isBYOK: isBYOKConfig(aiConfig),
      provider: isBYOKConfig(aiConfig) ? aiConfig.provider : 'platform',
    }

    return Response.json(responsePayload)
  } catch (error) {
    console.error("Error in AI helper API:", error)

    // Handle Auth0 Token Vault errors specifically
    if (isTokenVaultError(error)) {
      const errorMessage = formatTokenVaultError(error)
      return new Response(JSON.stringify({
        error: errorMessage,
        type: 'token_vault_error',
        requiresAuth: true,
        message: 'Please connect your Google Calendar to use calendar features.',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle OpenAI API errors
    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      const apiError = error as { status?: number; message: string }
      return new Response(apiError.message, { status: apiError.status ?? 500 })
    }

    // Handle standard Error objects
    if (error && typeof error === 'object' && 'message' in error) {
      const err = error as Error
      // Provide user-friendly error messages
      let userMessage = err.message

      if (err.message.includes('503')) {
        userMessage = "The AI service is temporarily unavailable. Please try again in a moment."
      } else if (err.message.includes('Heroku Agents API error')) {
        userMessage = "AI service error. Please try again or contact support if the issue persists."
      } else if (err.message.includes('No valid completion')) {
        userMessage = "Failed to get a response from the AI. Please try again."
      } else if (err.message.includes('Token Vault')) {
        userMessage = "Authentication required. Please reconnect your Google Calendar."
      }

      return new Response(JSON.stringify({ error: userMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: "Error processing request" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
