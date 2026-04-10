export function OpenRouterLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* OpenRouter - routing/network icon concept */}
      <circle cx="12" cy="12" r="10" opacity="0.15"/>
      <circle cx="12" cy="5" r="2"/>
      <circle cx="5" cy="19" r="2"/>
      <circle cx="19" cy="19" r="2"/>
      <path d="M12 7 L12 11" strokeWidth="2" stroke="currentColor" fill="none"/>
      <path d="M12 13 L7 17" strokeWidth="2" stroke="currentColor" fill="none"/>
      <path d="M12 13 L17 17" strokeWidth="2" stroke="currentColor" fill="none"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  )
}

export function OpenRouterWordmark({ className = "h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 30"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text x="5" y="22" fontSize="18" fontWeight="600" fontFamily="system-ui, sans-serif">
        OpenRouter
      </text>
    </svg>
  )
}
