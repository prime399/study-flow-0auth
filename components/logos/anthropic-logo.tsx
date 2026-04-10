/**
 * Anthropic and Claude AI Logos
 * Re-exports the Claude logo as the primary Anthropic brand icon
 */

export { ClaudeLogo, ClaudeWordmark, ClaudeFullLogo } from './claude-logo'

// Legacy Anthropic "A" logo (kept for backwards compatibility)
export function AnthropicALogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Anthropic "A" symbol - simplified geometric representation */}
      <path d="M12 2L3 22h4l2-4.5h6l2 4.5h4L12 2zm0 5.5l2.5 5.5h-5l2.5-5.5z"/>
    </svg>
  )
}

// Default export is Claude logo
export { ClaudeLogo as default } from './claude-logo'
