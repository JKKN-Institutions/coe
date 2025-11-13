"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/common/mode-toggle"
import { Badge } from "@/components/ui/badge"
import { BellRing } from "lucide-react"
import { NavUser } from "@/components/layout/nav-user"


interface AppHeaderWhiteProps {
  title?: string
  className?: string
}

export function AppHeaderWhite({
  title = "JKKN Controller of Examination Portal",
  className = ""
}: AppHeaderWhiteProps) {

  return (
    <header className={`flex h-16 shrink-0 items-center justify-between px-6 bg-[hsl(60,10%,98%)]/80 dark:bg-[hsl(222.2,84%,4.9%)]/90 backdrop-blur-xl border-b border-[hsl(220,13%,91%)]/60 dark:border-[hsl(217.2,32.6%,20%)] shadow-sm relative overflow-hidden ${className}`}>
      {/* Premium subtle background pattern matching sidebar */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/15 via-transparent to-teal-50/10 dark:from-emerald-950/10 dark:to-teal-950/10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.025),transparent_70%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.02),transparent_70%)]"></div>

      <div className="flex items-center gap-4 relative z-10">
        <SidebarTrigger className="-ml-1 text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all duration-300 rounded-md" />
        <Separator orientation="vertical" className="mr-2 h-6 bg-[hsl(220,13%,91%)] dark:bg-[hsl(217.2,32.6%,20%)]" />
        <div className="flex items-center gap-3">

          <div>
            <div className="text-base md:text-lg font-bold text-slate-700 dark:text-slate-100 font-[family-name:var(--font-space-grotesk)]">
              {title}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-inter">
              Controller of Examination
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-sm p-2 cursor-pointer">
            <BellRing className="h-4 w-4" />
          </Badge>
          <ModeToggle />
        </div>
        
        <NavUser />
      </div>
    </header>
  )
}
