/**
 * System prompt builder for AI assistant
 * Constructs personalized context based on user data
 */

import { AIRequestBody } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

export function buildSystemPrompt({
  userName,
  studyStats,
  groupInfo,
}: {
  userName: string | undefined
  studyStats: AIRequestBody["studyStats"]
  groupInfo: AIRequestBody["groupInfo"]
}): string {
  const profile = [
    "User Profile:",
    `- Name: ${userName ?? "Unknown"}`,
    `- Total Study Time: ${formatDuration(studyStats?.totalStudyTime ?? 0)}`,
    `- Preferred Session Length: ${formatDuration(studyStats?.studyDuration ?? 1500)}`,
  ]

  const metrics = [
    "Study Performance:",
    `- Total Sessions: ${studyStats?.stats?.totalSessions ?? 0}`,
    `- Completed Sessions: ${studyStats?.stats?.completedSessions ?? 0}`,
    `- Success Rate: ${studyStats?.stats?.completionRate ?? "0%"}`,
  ]

  const recentSessions = (studyStats?.recentSessions ?? [])
    .slice(0, 5)
    .map((session) => {
      const date = new Date(session.startTime).toLocaleDateString()
      const duration = formatDuration(session.duration)
      const completed = session.completed ? "yes" : "no"
      return `- ${date}\n  Duration: ${duration}\n  Completed: ${completed}`
    })

  const recent = [
    "Recent Study History:",
    recentSessions.length > 0
      ? recentSessions.join("\n")
      : "No recent study activity recorded.",
  ]

  const extra = [
    "Additional Information:",
    `- Groups: ${JSON.stringify(groupInfo ?? [])}`,
    `- Current Time: ${new Date().toLocaleString()}`,
  ]

  const guidance = [
    "Key Instructions:",
    "1. Provide concise, personalized feedback addressing the user by their first name.",
    "2. Focus on completion rate trends, session duration patterns, and overall study consistency.",
    "3. Format your responses using proper markdown for readability:",
    "   - Use **bold** for emphasis and key terms",
    "   - Use `inline code` for commands, variables, or short code snippets",
    "   - Use code blocks with language identifiers for code examples:",
    "     ```python",
    "     def example():",
    "         return 'code here'",
    "     ```",
    "   - Use numbered lists for step-by-step instructions",
    "   - Use bullet points for general lists",
    "   - Use > blockquotes for important notes or tips",
    "   - Use ### headings to organize longer responses",
    "4. For programming questions:",
    "   - Provide clear, well-commented code examples",
    "   - Include error handling and best practices",
    "   - Explain key concepts before showing code",
    "   - Use appropriate language syntax highlighting",
    "5. Only use tables (via JSON blocks) when comparing multiple items with specific attributes.",
    "   - For tables, append: ```json {\"tables\":[{\"headers\":[\"Column\"],\"rows\":[[\"Value\"]],\"caption\":\"Description\"}]}```",
    "   - Prefer lists and code blocks over tables for most content",
    "6. Keep responses clear, scannable, and well-structured.",
  ]

  return [
    "You are a supportive study advisor providing personalized guidance.",
    "",
    ...profile,
    "",
    ...metrics,
    "",
    ...recent,
    "",
    ...extra,
    "",
    ...guidance,
  ]
    .join("\n")
    .trim()
}