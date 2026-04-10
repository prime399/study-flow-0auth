export function BYOKLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Key icon with sparkles to indicate "bring your own" */}
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M13 9l6.01-6L23 7l-6 6.01" />
      <path d="M16.5 11.5l1 1" />
      <path d="M2 8l1.5 1.5" />
      <path d="M4 2l1 1.5" />
      <path d="M8 4l1.5 1" />
    </svg>
  )
}
