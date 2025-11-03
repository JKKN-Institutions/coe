"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeaderWhite } from "@/components/layout/app-header-white"
import { AppFooter } from "@/components/layout/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, UserCheck, BarChart3, GraduationCap, TrendingUp, Calendar, Clock } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/hooks/use-toast"

interface DashboardStats {
  totalStudents: number
  activeCourses: number
  totalPrograms: number
  facultyMembers: number
  attendanceRatio: string
  attendanceDetails: {
    total: number
    present: number
    absent: number
  }
  upcomingExams: Array<{
    id: string
    exam_date: string
    session: string
    exam_mode: string
    institution_name: string
    session_name: string
    course_code: string
    course_name: string
    program_name: string
  }>
  isSuperAdmin: boolean
  institutionId: string | null
  userRole: string
  userRoleName: string
  userRoleDescription: string
  userRoles: Array<{
    name: string
    description: string
  }>
  userEmail: string
}

export default function Page() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [now, setNow] = useState<Date | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Client-only clock
    const update = () => setNow(new Date())
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        const response = await fetch(`/api/dashboard/stats?user_id=${user.id}`)

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats')
        }

        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        toast({
          title: "Error",
          description: "Failed to load dashboard statistics",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, toast])

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
                  {loading ? (
                    <div className="text-2xl font-bold text-muted-foreground">--</div>
                  ) : (
                    <div className="text-2xl font-bold">{stats?.totalStudents?.toLocaleString() || 0}</div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Registered students
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
                  {loading ? (
                    <div className="text-2xl font-bold text-muted-foreground">--</div>
                  ) : (
                    <div className="text-2xl font-bold">{stats?.activeCourses || 0}</div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    Available courses
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-info" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Programs</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  {loading ? (
                    <div className="text-2xl font-bold text-muted-foreground">--</div>
                  ) : (
                    <div className="text-2xl font-bold">{stats?.totalPrograms || 0}</div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    Total programs
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Faculty Members</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  {loading ? (
                    <div className="text-2xl font-bold text-muted-foreground">--</div>
                  ) : (
                    <div className="text-2xl font-bold">{stats?.facultyMembers || 0}</div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Active faculty
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-warning" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Ratio Card */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.5s" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Exam Attendance Ratio</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  {loading ? (
                    <div className="text-2xl font-bold text-muted-foreground">--</div>
                  ) : (
                    <div className="text-2xl font-bold text-success">{stats?.attendanceRatio || '0.0%'}</div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Present: {stats?.attendanceDetails.present || 0} / Total: {stats?.attendanceDetails.total || 0}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift animate-slide-up md:col-span-2" style={{ animationDelay: "0.6s" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">User & System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">User Email:</span>
                    <span className="text-xs font-medium">{stats?.userEmail || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Primary Role:</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gradient-to-r from-primary/10 to-primary/20 text-primary font-semibold border border-primary/20">
                      {stats?.userRoleName || 'User'}
                    </span>
                  </div>
                  {stats?.userRoleDescription && (
                    <div className="flex items-start justify-between">
                      <span className="text-xs text-muted-foreground">Description:</span>
                      <span className="text-xs text-right max-w-[200px]">{stats.userRoleDescription}</span>
                    </div>
                  )}
                  {stats?.userRoles && stats.userRoles.length > 1 && (
                    <div className="flex items-start justify-between">
                      <span className="text-xs text-muted-foreground">Other Roles:</span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                        {stats.userRoles.slice(1).map((role, index) => (
                          <span key={index} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs bg-muted text-muted-foreground">
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Data Access:</span>
                    <span className="text-xs font-medium">{stats?.isSuperAdmin ? 'All Institutions' : `Institution: ${stats?.institutionId || 'N/A'}`}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">System Status:</span>
                    <span className="text-xs font-medium text-success">● Online</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Exams Section */}
          <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.7s" }}>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-heading">Upcoming Exams</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Next 5 scheduled examinations</p>
              </div>
              <Button variant="outline" size="sm" className="hover-lift">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading upcoming exams...</div>
              ) : stats?.upcomingExams && stats.upcomingExams.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcomingExams.map((exam, index) => (
                    <div
                      key={exam.id}
                      className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center min-w-[60px] p-2 rounded-lg bg-primary/10">
                        <Calendar className="h-4 w-4 text-primary mb-1" />
                        <div className="text-xs font-bold text-primary">
                          {new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{exam.course_code} - {exam.course_name}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {exam.session}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">{exam.program_name}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {exam.session_name}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                            {exam.exam_mode}
                          </span>
                          {!stats.isSuperAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                              {exam.institution_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming exams scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
