"use client"

import { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ModeToggle1 } from "@/components/mode-toggle1"
import { Badge } from "@/components/ui/badge"
import { BellRing, Clock, Calendar } from "lucide-react"

interface AppHeaderWhiteProps {
  title?: string
  showDateTime?: boolean
  className?: string
}

export function AppHeaderWhite({ 
  title = "JKKN Controller of Examination Portal",
  showDateTime = true,
  className = ""
}: AppHeaderWhiteProps) {
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
    <header className={`flex h-16 shrink-0 items-center justify-between px-6 bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden ${className}`}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 via-transparent to-emerald-50/30 dark:from-slate-900/50 dark:to-emerald-950/30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.03),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(6,182,212,0.03),transparent_50%)]"></div>

      <div className="flex items-center gap-4 relative z-10">
        <SidebarTrigger className="-ml-1 text-slate-700 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/50 transition-all duration-300 rounded-md" />
        <Separator orientation="vertical" className="mr-2 h-6 bg-slate-200 dark:bg-slate-700" />
        <div className="flex items-center gap-3">
           
          <div>
            <div className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100">
              {title}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Controller of Examination
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 relative z-10">
    

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-gradient-to-r from-emerald-500/90 to-teal-600/90 text-white border-0 hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-sm p-2">
            <BellRing className="h-4 w-4" />
          </Badge>
          <ModeToggle1 />
        </div>
      </div>
    </header>
  )
}
