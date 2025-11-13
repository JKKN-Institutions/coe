"use client"

import { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/common/mode-toggle"
import { Badge } from "@/components/ui/badge"
import { BellRing } from "lucide-react"
import { NavUser } from "@/components/layout/nav-user"


interface AppHeaderProps {
  title?: string
  className?: string
}

export function AppHeader({
  title = "JKKN Controller of Examination Portal",
  className = ""
}: AppHeaderProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    // Set initial time on client side only
    setCurrentTime(new Date())

    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatCurrentDateTime = (date: Date | null) => !date ? "Loading..." : `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()} | ${date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} | ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`

  return (
    <header className={`flex h-16 shrink-0 items-center px-6 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 shadow-2xl relative overflow-hidden ${className}`}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)]"></div>

      <div className="flex items-center gap-4 relative z-10">
        <SidebarTrigger className="-ml-1 text-white/90 hover:text-white hover:bg-white/20 transition-all duration-300 rounded-md" />
        <Separator orientation="vertical" className="mr-2 h-6 bg-white/30" />
        <div className="flex items-center gap-3">

          <div>
            <div className="text-base md:text-lg font-bold text-white drop-shadow-lg font-[family-name:var(--font-space-grotesk)]">
              {title}
            </div>
            <div className="text-xs text-emerald-100 opacity-90 font-semibold font-inter">
              Controller of Examination
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-15 ml-auto">
        <div className="hidden md:block text-white text-sm font-bold font-mono bg-white/10 px-3 py-1.5 rounded-md backdrop-blur-sm shadow-sm">
          {formatCurrentDateTime(currentTime)}
        </div>
        <Separator orientation="vertical" className="hidden md:block h-6 bg-white/30" />
        <Badge variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30 transition-all duration-300 shadow-sm p-2 cursor-pointer backdrop-blur-sm">
          <BellRing className="h-4 w-4" />
        </Badge>
        <ModeToggle />
        <Separator orientation="vertical" className="h-6 bg-white/30 ml-3" />
        <NavUser variant="compact" />
      </div>
    </header>
  )
}
