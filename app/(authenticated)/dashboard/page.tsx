"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeaderWhite } from "@/components/app-header-white"
import { AppFooter } from "@/components/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeaderWhite />

        <div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 sm:p-6 pt-0 overflow-y-auto">
          <Card className="rounded-xl border-0 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white shadow-2xl hover:shadow-xl transition-all duration-300 animate-fade-in relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10 animate-pulse"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)]"></div>
            <CardContent className="flex flex-col sm:flex-row items-start justify-between gap-4 p-6 sm:p-8 relative z-10">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">
                  Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}!` : ", User!"}
                </h2>
                <p className="text-base sm:text-lg text-emerald-200 opacity-90">
                  Here&apos;s what&apos;s happening at J K K N COE today
                </p>
              </div>
              <div className="text-left sm:text-right space-y-1">
                <div className="text-xl sm:text-2xl font-bold tracking-wider text-white drop-shadow-md">{timeString}</div>
                <div className="text-sm text-emerald-200 opacity-90">{dateString}</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-2xl font-bold">1,247</div>
                  <div className="text-xs text-success flex items-center gap-1">
                    <span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-success"></span>
                    +12% from last month
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Courses</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-2xl font-bold">24</div>
                  <div className="text-xs text-success flex items-center gap-1">
                    <span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-success"></span>
                    +3 from last month
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-info" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Faculty Members</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-2xl font-bold">89</div>
                  <div className="text-xs text-success flex items-center gap-1">
                    <span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-success"></span>
                    +5 from last month
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-2xl font-bold">94.2%</div>
                  <div className="text-xs text-success flex items-center gap-1">
                    <span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-success"></span>
                    +2.1% from last month
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-success" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.5s" }}>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle className="text-heading">Recent Activities</CardTitle>
              <Button variant="outline" size="sm" className="hover-lift">
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="mt-1 h-2 w-2 rounded-full bg-success animate-pulse" />
                <div className="flex-1">
                  <div className="text-sm font-medium">New student enrollment - CSE Batch 2024</div>
                  <div className="text-xs text-muted-foreground mt-1">10:30 AM</div>
                </div>
                <div className="text-xs text-success font-medium">New</div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="mt-1 h-2 w-2 rounded-full bg-info" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Course registration deadline approaching</div>
                  <div className="text-xs text-muted-foreground mt-1">09:15 AM</div>
                </div>
                <div className="text-xs text-info font-medium">Info</div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="mt-1 h-2 w-2 rounded-full bg-warning" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Examination schedule updated</div>
                  <div className="text-xs text-muted-foreground mt-1">08:45 AM</div>
                </div>
                <div className="text-xs text-warning font-medium">Updated</div>
              </div>
            </CardContent>
          </Card>
        </div>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
