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
    <header className={`flex h-16 shrink-0 items-center justify-between px-6 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white shadow-2xl relative overflow-hidden ${className}`}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10 animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)]"></div>

      <div className="flex items-center gap-4 relative z-10">
        <SidebarTrigger className="-ml-1 text-white hover:text-emerald-200 hover:bg-white/20 transition-all duration-300 rounded-md p-1" />
        <Separator orientation="vertical" className="mr-2 h-6 bg-white/40" />
        <div className="flex items-center gap-3">
        
          <div>
            <div className="text-base md:text-lg font-bold text-white drop-shadow-lg">
              {title}
            </div>
            <div className="text-xs text-emerald-200 font-semibold opacity-90">
              Controller of Examination
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 relative z-10">
        {showDateTime && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/30 shadow-lg">
            <Clock className="h-4 w-4 text-emerald-200" />
            <div className="text-sm font-semibold text-white drop-shadow-md">
              {formatCurrentDateTime(currentTime)}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-md border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-white border-white/40 hover:from-emerald-400/40 hover:to-teal-400/40 transition-all duration-300 shadow-lg backdrop-blur-sm p-2">
            <BellRing className="h-4 w-4" />
          </div>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
