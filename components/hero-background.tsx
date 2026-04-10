"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spotlight } from "@/components/ui/spotlight";

// Dynamically import UnicornScene to avoid SSR issues
const UnicornScene = dynamic(() => import("unicornstudio-react"), {
  ssr: false,
});

const STORAGE_KEY = "unicornStudioFailed";

export function HeroBackground() {
  const [useSpotlight, setUseSpotlight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    const hasFailedBefore = localStorage.getItem(STORAGE_KEY) === "true";
    if (hasFailedBefore) {
      setUseSpotlight(true);
    }
    setMounted(true);
  }, []);

  const handleUnicornError = (error: Error) => {
    console.error("UnicornStudio failed to load:", error);
    // Set error state immediately
    setUseSpotlight(true);
    // Persist to localStorage for future visits
    localStorage.setItem(STORAGE_KEY, "true");
  };

  // Don't render anything until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <div
      className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {useSpotlight ? (
        // Spotlight fallback
        <div className="relative w-[1600px] h-[800px]">
          <Spotlight
            className="top-10 left-0 md:left-60 md:-top-20"
            fill="white"
          />
        </div>
      ) : (
        // Unicorn Studio (default)
        <UnicornScene
          projectId="FRNkkpNIXvQHGx3ZkpMt"
          width={1600}
          height={800}
          onError={handleUnicornError}
        />
      )}
    </div>
  );
}
