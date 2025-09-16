"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, UserCheck, BarChart3 } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"

export default function Page() {
  const { user } = useAuth()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    // Client-only clock
    const update = () => setNow(new Date())
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  const timeString = now
    ? now.toLocaleTimeString(undefined, { hour12: true })
    : "--:-- --"
  const dateString = now
    ? now.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
      })
    : ""

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="text-base md:text-lg font-semibold">JKKN Controller of Examination Portal</div>
          </div>
          <div className="ml-auto px-4">
            <ModeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card className="rounded-xl border bg-[#166534] text-white shadow-md">
            <CardContent className="flex items-start justify-between p-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold">Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}!` : ", User!"}</h2>
                <p className="mt-2 text-white/90">Here&apos;s what&apos;s happening at J K K N COE today</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold tracking-wider">{timeString}</div>
                <div className="text-sm opacity-90">{dateString}</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Students</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold">1,247</div>
                  <div className="text-xs text-emerald-600 mt-1">+12% from last month</div>
                </div>
                <Users className="text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Active Courses</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold">24</div>
                  <div className="text-xs text-emerald-600 mt-1">+3 from last month</div>
                </div>
                <BookOpen className="text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Faculty Members</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold">89</div>
                  <div className="text-xs text-emerald-600 mt-1">+5 from last month</div>
                </div>
                <UserCheck className="text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold">94.2%</div>
                  <div className="text-xs text-emerald-600 mt-1">+2.1% from last month</div>
                </div>
                <BarChart3 className="text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent Activities</CardTitle>
              <button className="px-3 py-1.5 text-sm rounded-md border hover:bg-accent">View All</button>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 py-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                <div>
                  <div className="text-sm">New student enrollment - CSE Batch 2024</div>
                  <div className="text-xs text-muted-foreground mt-1">10:30 AM</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
