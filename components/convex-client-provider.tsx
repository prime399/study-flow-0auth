"use client"

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs"
import { ConvexReactClient } from "convex/react"
import { ReactNode } from "react"

function normalizeUrlEnv(value: string): string {
  return value.replace(/\/+$/, "")
}

const convexUrlEnv = process.env.NEXT_PUBLIC_CONVEX_URL

if (!convexUrlEnv) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL is required for Convex client initialization. Set it locally and in Vercel project environment variables."
  )
}

const convexUrl = normalizeUrlEnv(convexUrlEnv)

const convex = new ConvexReactClient(convexUrl, {
  verbose: true,
})

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  )
}
