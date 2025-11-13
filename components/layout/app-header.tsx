"use client"

import { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/common/mode-toggle"
import { Badge } from "@/components/ui/badge"
import { BellRing, Clock, Calendar } from "lucide-react"

interface AppHeaderProps {
  title?: string
  showDateTime?: boolean
  className?: string
}

export function AppHeader({ 
  title = "JKKN Controller of Examination Portal",
  showDateTime = true,
  className = ""
}: AppHeaderProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatCurrentDateTime = (date: Date | null) => {
    if (!date) return "Loading..."
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
    
    return `${day}-${month}-${year} | ${weekday} | ${time}`
  }
 
  return (
    <header className={`flex h-16 shrink-0 items-center justify-between px-6 bg-gradient-to-r from-[#059669] via-emerald-600 to-teal-600 text-white shadow-lg relative overflow-hidden ${className}`}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#059669]/10 via-transparent to-teal-500/10 animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.04),transparent_50%)]"></div>

      <div className="flex items-center gap-4 relative z-10">
        <SidebarTrigger className="-ml-1 text-white hover:text-emerald-100 hover:bg-white/20 transition-all duration-300 rounded-lg p-2" />
        <Separator orientation="vertical" className="mr-2 h-6 bg-white/40" />
        <div className="flex items-center gap-3">

          <div>
            <div className="text-base md:text-lg font-bold text-white drop-shadow-lg font-[family-name:var(--font-space-grotesk)]">
              {title}
            </div>
            <div className="text-xs text-emerald-100 font-semibold opacity-95 font-inter tracking-wide">
              Controller of Examination
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 relative z-10">
        {showDateTime && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/15 rounded-lg backdrop-blur-md border border-white/20 shadow-md">
            <Clock className="h-4 w-4 text-emerald-100" />
            <div className="text-sm font-semibold text-white drop-shadow-md font-inter tracking-tight">
              {formatCurrentDateTime(currentTime)}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center justify-center rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 bg-white/15 text-white border-white/20 hover:bg-white/25 transition-all duration-300 shadow-md backdrop-blur-sm p-2">
            <BellRing className="h-4 w-4" />
          </button>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
