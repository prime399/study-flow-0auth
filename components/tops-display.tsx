"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { Coins } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function TopsDisplay() {
  const stats = useQuery(api.study.getStats)

  if (!stats) {
    return (
      <div className="flex w-full items-center gap-2 px-2 py-1">
        <Coins className="h-4 w-4 text-yellow-500" />
        <Skeleton className="h-5 w-16" />
      </div>
    )
  }

  const coinBalance = stats.coinsBalance ?? 0

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div className="flex w-full cursor-help items-center gap-2 px-2 py-1 rounded-md hover:bg-accent/50 transition-colors">
          <Coins className="h-4 w-4 text-yellow-500" />
          <span className="font-bold text-yellow-600 dark:text-yellow-400">
            {coinBalance.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">coins</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-[250px]" side="right">
        <div className="space-y-2">
          <p className="font-semibold">Mentor Coins</p>
          <p className="text-sm text-muted-foreground">
            Earn 1 coin for every second of focused study time. Use coins to ask questions to the AI Helper (100 coins per query).
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
