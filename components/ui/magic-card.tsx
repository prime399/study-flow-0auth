"use client"

import React, { useCallback, useEffect, useState } from "react"
import { motion, useMotionTemplate, useMotionValue } from "motion/react"

import { cn } from "@/lib/utils"

interface MagicCardProps {
  children?: React.ReactNode
  className?: string
  gradientSize?: number
  gradientColor?: string
  gradientOpacity?: number
  gradientFrom?: string
  gradientTo?: string
}

export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = "#262626",
  gradientOpacity = 0.8,
  gradientFrom = "#9E7AFF",
  gradientTo = "#FE8BBB",
}: MagicCardProps) {
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)
  const [isHovered, setIsHovered] = useState(false)
  
  const reset = useCallback(() => {
    mouseX.set(-gradientSize)
    mouseY.set(-gradientSize)
    setIsHovered(false)
  }, [gradientSize, mouseX, mouseY])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
      setIsHovered(true)
    },
    [mouseX, mouseY]
  )

  useEffect(() => {
    reset()
  }, [reset])

  useEffect(() => {
    const handleGlobalPointerOut = (e: PointerEvent) => {
      if (!e.relatedTarget) {
        reset()
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        reset()
      }
    }

    window.addEventListener("pointerout", handleGlobalPointerOut)
    window.addEventListener("blur", reset)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("pointerout", handleGlobalPointerOut)
      window.removeEventListener("blur", reset)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [reset])

  return (
    <div
      className={cn("relative rounded-[inherit]", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerEnter={() => setIsHovered(true)}
    >
      {/* Border gradient effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientFrom} 0%, ${gradientTo} 25%, transparent 50%)`,
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ opacity: { duration: 0.3 } }}
      />
      
      {/* Content background */}
      <div className="absolute inset-px rounded-[inherit] bg-background" />
      
      {/* Inner glow effect */}
      <motion.div
        className="pointer-events-none absolute inset-px rounded-[inherit]"
        style={{
          background: useMotionTemplate`radial-gradient(${gradientSize * 0.6}px circle at ${mouseX}px ${mouseY}px, ${gradientColor} 0%, transparent 60%)`,
          opacity: isHovered ? gradientOpacity : 0,
        }}
        transition={{ opacity: { duration: 0.3 } }}
      />
      
      <div className="relative z-10">{children}</div>
    </div>
  )
}
