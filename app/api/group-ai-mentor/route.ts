import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import OpenAI from "openai"
import { cookies } from "next/headers"
import {
  validateOpenAIConfig,
  createOpenAIClient,
  DEFAULT_COMPLETION_OPTIONS,
  type ChatCompletionOptions,
} from "../ai-helper/_lib/openai-client"

interface GroupAIMentorRequest {
  groupId: Id<"groups">
  userMessage: string
  userName?: string
  replyToMessageId?: Id<"messages">
}

function buildGroupMentorSystemPrompt(
  conversationContext: Array<{ author: string; body: string; isAI: boolean }>,
  groupName?: string
): string {
  const contextSummary = conversationContext
    .slice(-10) // Last 10 messages for context
    .map((msg) => `${msg.author}: ${msg.body}`)
    .join("\n")

  return `You are Mind, a friendly and helpful AI mentor for study groups. You help students with:
- Answering questions based on previous group discussions
- Providing study tips and learning strategies
- Offering encouragement and motivation
- Helping with time management and organization
- Clarifying concepts discussed in the group

${groupName ? `This is the "${groupName}" study group.` : ""}

Recent conversation context:
${contextSummary || "No previous messages"}

Guidelines:
- Keep responses SHORT and concise (2-3 sentences max)
- Be encouraging and supportive
- Reference previous discussions when relevant
- If you don't have enough context, ask for clarification
- Use a friendly, conversational tone
- Focus on helping students learn effectively

Remember: You're a mentor, not a homework-solving machine. Guide students to discover answers themselves.`
}

export async function POST(req: Request) {
  try {
    // Extract Convex auth token from cookies
    const cookieStore = await cookies()
    const isLocalhost = req.headers.get("host")?.includes("localhost")
    const cookieName = isLocalhost
      ? "__convexAuthJWT"
      : "__Host-__convexAuthJWT"
    const convexAuthToken = cookieStore.get(cookieName)?.value

    if (!convexAuthToken) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get user ID from Convex
    const convexClient = new ConvexHttpClient(
      process.env.NEXT_PUBLIC_CONVEX_URL!
    )
    convexClient.setAuth(convexAuthToken)
    const userId = await convexClient.query(api.scheduling.getCurrentUserId)

    if (!userId) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { groupId, userMessage, userName, replyToMessageId }: GroupAIMentorRequest =
      await req.json()

    // Get group info
    const group = await convexClient.query(api.groups.get, { groupId })
    if (!group) {
      return new Response(JSON.stringify({ error: "Group not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get conversation context
    const conversationContext = await convexClient.query(
      api.messages.getConversationContext,
      {
        groupId,
        messageLimit: 20,
      }
    )

    // Build system prompt with conversation context
    const systemPrompt = buildGroupMentorSystemPrompt(
      conversationContext,
      group.name
    )

    // Use a lightweight model for quick responses (Nova Lite or GPT-OSS)
    const config = validateOpenAIConfig("nova-lite")
    const client = createOpenAIClient(config)

    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${userName ? `${userName} asks: ` : ""}${userMessage}`,
        },
      ]

    const completionOptions: ChatCompletionOptions = {
      model: config.herokuModelId,
      messages: chatMessages,
      ...DEFAULT_COMPLETION_OPTIONS,
      max_tokens: 200, // Keep responses short
      temperature: 0.7, // Slightly creative but focused
    }

    const completion = await client.chat.completions.create(completionOptions)
    const aiResponse =
      completion.choices[0]?.message?.content || "I'm not sure how to help with that. Could you provide more details?"

    // Send AI message to the group
    await convexClient.mutation(api.messages.sendAIMessage, {
      body: aiResponse,
      groupId,
      userId, // The user who triggered the AI
      replyToMessageId,
    })

    return Response.json({
      success: true,
      message: aiResponse,
    })
  } catch (error) {
    console.error("Error in group AI mentor:", error)

    if (error instanceof OpenAI.APIError) {
      return new Response(error.message, { status: error.status ?? 500 })
    }

    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ error: "Error processing request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
