/**
 * Custom markdown components for rendering AI responses
 * Provides consistent styling and behavior for all markdown elements
 */

import { cn } from "@/lib/utils"
import type { Components } from "react-markdown"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

type CodeProps = ComponentPropsWithoutRef<'code'> & { inline?: boolean; children?: ReactNode }

export const markdownComponents: Components = {
  h1: ({ node, ...props }) => (
    <h1 className="text-xl sm:text-2xl font-bold mt-4 sm:mt-6 mb-3 sm:mb-4 border-b border-border pb-2" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-lg sm:text-xl font-bold mt-4 sm:mt-5 mb-2 sm:mb-3 border-b border-border pb-2" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-base sm:text-lg font-semibold mt-3 sm:mt-4 mb-2" {...props} />
  ),
  h4: ({ node, ...props }) => (
    <h4 className="text-sm sm:text-base font-semibold mt-2 sm:mt-3 mb-1.5 sm:mb-2" {...props} />
  ),
  h5: ({ node, ...props }) => (
    <h5 className="text-sm font-semibold mt-2 mb-1.5" {...props} />
  ),
  h6: ({ node, ...props }) => (
    <h6 className="text-xs sm:text-sm font-semibold mt-2 mb-1.5" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="ml-3 sm:ml-5 list-disc space-y-1 sm:space-y-1.5 text-xs sm:text-sm" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="ml-3 sm:ml-5 list-decimal space-y-1 sm:space-y-1.5 text-xs sm:text-sm" {...props} />
  ),
  li: ({ node, ...props }) => (
    <li className="leading-relaxed text-xs sm:text-sm" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a
      className="font-medium text-primary underline decoration-muted-foreground/50 decoration-2 underline-offset-4 hover:text-primary/80"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 my-3 italic text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded-r"
      {...props}
    />
  ),
  hr: ({ node, ...props }) => (
    <hr className="my-4 border-border" {...props} />
  ),
  pre: ({ node, className, ...props }) => (
    <pre 
      className={cn(
        "overflow-x-auto rounded-lg bg-zinc-900 dark:bg-zinc-950 p-4 my-4 text-sm border border-zinc-800 dark:border-zinc-700 shadow-lg",
        className
      )} 
      {...props} 
    />
  ),
  code: ({ inline, className, children, ...props }: CodeProps) => {
    if (inline) {
      return (
        <code
          className={cn(
            "rounded bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-foreground/90 font-normal",
            className,
          )}
          {...props}
        >
          {children}
        </code>
      )
    }

    return (
      <code
        className={cn("block font-mono text-sm leading-relaxed text-zinc-100", className)}
        {...props}
      >
        {children}
      </code>
    )
  },
  table: ({ node, className, ...props }) => (
    <div className="markdown-table-wrapper overflow-x-auto -mx-1 sm:mx-0">
      <table
        className={cn("w-full border-collapse text-xs sm:text-sm min-w-full", className)}
        {...props}
      />
    </div>
  ),
  thead: ({ node, className, ...props }) => (
    <thead className={cn("bg-muted text-foreground", className)} {...props} />
  ),
  tbody: ({ node, className, ...props }) => (
    <tbody className={cn("divide-y divide-border", className)} {...props} />
  ),
  th: ({ node, className, ...props }) => (
    <th
      className={cn(
        "border-b border-border px-2 sm:px-3 py-1 sm:py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
        className,
      )}
      {...props}
    />
  ),
  td: ({ node, className, ...props }) => (
    <td className={cn("px-2 sm:px-3 py-1 sm:py-2 align-top text-xs sm:text-sm break-words", className)} {...props} />
  ),
}