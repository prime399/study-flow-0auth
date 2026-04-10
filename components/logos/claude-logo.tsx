/**
 * Claude AI Logo
 * Official color: #C15F3C (warm rust-orange)
 * Design: Radiating burst/asterisk symbol with radial symmetry
 */

export function ClaudeLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Claude's signature radiating burst/asterisk symbol */}
      <g transform="translate(50, 50)">
        {/* Center circle */}
        <circle cx="0" cy="0" r="8" fill="#C15F3C"/>

        {/* Radiating lines - 8 directions with radial symmetry */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = Math.cos(rad) * 12;
          const y1 = Math.sin(rad) * 12;
          const x2 = Math.cos(rad) * 35;
          const y2 = Math.sin(rad) * 35;

          return (
            <g key={i}>
              {/* Main beam */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#C15F3C"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Outer dot */}
              <circle
                cx={x2}
                cy={y2}
                r="4"
                fill="#C15F3C"
              />
            </g>
          );
        })}
      </g>
    </svg>
  )
}

export function ClaudeWordmark({ className = "h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 60"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Claude wordmark */}
      <text
        x="10"
        y="42"
        fontSize="36"
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="#C15F3C"
      >
        Claude
      </text>
    </svg>
  )
}

export function ClaudeFullLogo({ className = "h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 250 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Symbol */}
      <g transform="translate(30, 30)">
        <circle cx="0" cy="0" r="4" fill="#C15F3C"/>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = Math.cos(rad) * 6;
          const y1 = Math.sin(rad) * 6;
          const x2 = Math.cos(rad) * 18;
          const y2 = Math.sin(rad) * 18;

          return (
            <g key={i}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#C15F3C"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx={x2} cy={y2} r="2" fill="#C15F3C"/>
            </g>
          );
        })}
      </g>

      {/* Wordmark */}
      <text
        x="65"
        y="42"
        fontSize="36"
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="#C15F3C"
      >
        Claude
      </text>
    </svg>
  )
}
