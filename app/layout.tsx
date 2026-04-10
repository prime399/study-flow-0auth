import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server"
import { Analytics } from "@vercel/analytics/react"
import type { Metadata } from "next"
import "./globals.css"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Inter, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["500", "600", "700"],
})

export const metadata: Metadata = {
  title: "StudyFlow",
  description:
    "Compete with friends, join study groups, and track your progress to become a top student.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "bg-background font-sans antialiased",
            inter.variable,
            plusJakarta.variable,
            spaceGrotesk.variable,
            GeistSans.variable,
            GeistMono.variable,
          )}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Analytics />
          </ThemeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  )
}
