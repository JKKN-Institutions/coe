"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
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

        <div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 sm:p-6 pt-0">
          <Card className="rounded-xl border bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in">
            <CardContent className="flex flex-col sm:flex-row items-start justify-between gap-4 p-6 sm:p-8">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-foreground">
                  Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}!` : ", User!"}
                </h2>
                <p className="text-base sm:text-lg text-primary-foreground/90">
                  Here&apos;s what&apos;s happening at J K K N COE today
                </p>
              </div>
              <div className="text-left sm:text-right space-y-1">
                <div className="text-xl sm:text-2xl font-bold tracking-wider">{timeString}</div>
                <div className="text-sm opacity-90">{dateString}</div>
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
      </SidebarInset>
    </SidebarProvider>
  )
}
