export default function Logo({
  variant = "default",
}: {
  variant?: "default" | "small" | "large"
}) {
  if (variant === "small") {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
        <span className="text-lg font-bold">
          <span className="text-foreground font-display">S</span>
          <span className="text-primary font-logo">F</span>
        </span>
      </div>
    )
  }

  if (variant === "large") {
    return (
      <h1 className="text-3xl tracking-tight">
        <span className="logo-brand">Study</span>
        <span className="logo-flow text-primary">Flow</span>
      </h1>
    )
  }

  return (
    <h1 className="text-2xl tracking-tight">
      <span className="logo-brand">Study</span>
      <span className="logo-flow text-primary">Flow</span>
    </h1>
  )
}
