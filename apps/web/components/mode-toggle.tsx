"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export function ModeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    console.log("ModeToggle mounted. Current theme:", theme, "Resolved:", resolvedTheme);
  }, [theme, resolvedTheme])

  if (!mounted) {
    return <div className="w-[100px] h-9 bg-muted/20 rounded-full animate-pulse" />
  }

  return (
    <div className="flex items-center bg-muted/30 backdrop-blur-md border border-border/50 rounded-full p-1 gap-1 shadow-inner relative group">
      {/* Light */}
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "p-2 rounded-full transition-all duration-300 relative z-10",
          theme === "light"
            ? "bg-white text-orange-500 shadow-md scale-105"
            : "text-muted-foreground hover:text-foreground hover:bg-white/10"
        )}
        title="Light Mode"
      >
        <Sun size={16} strokeWidth={2.5} />
      </button>

      {/* Dark */}
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "p-2 rounded-full transition-all duration-300 relative z-10",
          theme === "dark"
            ? "bg-zinc-900 text-purple-400 shadow-md scale-105 neon-glow-purple"
            : "text-muted-foreground hover:text-foreground hover:bg-white/10"
        )}
        title="Dark Mode"
      >
        <Moon size={16} strokeWidth={2.5} />
      </button>

      {/* System */}
      <button
        type="button"
        onClick={() => setTheme("system")}
        className={cn(
          "p-2 rounded-full transition-all duration-300 relative z-10",
          theme === "system"
            ? "bg-primary/20 text-primary shadow-sm scale-105"
            : "text-muted-foreground hover:text-foreground hover:bg-white/10"
        )}
        title="System Preference"
      >
        <Monitor size={16} strokeWidth={2.5} />
      </button>
    </div>
  )
}
