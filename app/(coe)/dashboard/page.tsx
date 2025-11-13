"use client"

import { useEffect, useState } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeaderWhite } from "@/components/layout/app-header-white"
import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { AppFooter } from "@/components/layout/app-footer"
import { PageTransition, CardAnimation } from "@/components/common/page-transition"
import { ModernBreadcrumb } from "@/components/common/modern-breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, UserCheck, BarChart3, GraduationCap, TrendingUp, Calendar, Clock, Home, Database, Shield } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/hooks/common/use-toast"


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
      <SidebarInset>
      <AppHeaderWhite />


        <PageTransition>
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-4">
           

            {/* Welcome Card - Premium Gradient */}
           
            <Card className="rounded-xl border-0 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white shadow-2xl hover:shadow-xl transition-all duration-300 animate-fade-in relative overflow-hidden">
              <div className="card-premium overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10 animate-pulse"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)]"></div>
                <div className="relative z-10 p-8">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg font-grotesk">
                        Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}!` : ", User!"}
                      </h2>
                      <p className="text-base sm:text-lg text-emerald-100 opacity-90">
                        Here's what's happening at J K K N COE today
                      </p>
                    </div>
                    <div className="text-left sm:text-right space-y-1">
                      <div className="text-2xl font-bold tracking-wider text-white drop-shadow-md font-grotesk">{timeString}</div>
                      <div className="text-sm text-emerald-100 opacity-90">{dateString}</div>
                    </div>
                  </div>
                </div>
              </div>
              </Card>
      

            {/* Stats Cards - Premium Design */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {/* Total Students */}
              <CardAnimation delay={0.1}>
                <div className="card-premium-hover p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Total Students</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-grotesk">
                        {loading ? "--" : (stats?.totalStudents?.toLocaleString() || 0)}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">+12%</span> from last month
                  </p>
                </div>
              </CardAnimation>
              </Card>
              <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {/* Active Courses */}
              <CardAnimation delay={0.2}>
                <div className="card-premium-hover p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Active Courses</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-grotesk">
                        {loading ? "--" : (stats?.activeCourses?.toLocaleString() || 0)}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                    Across all programs
                  </p>
                </div>
              </CardAnimation>
              </Card>
              <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {/* Total Programs */}
              <CardAnimation delay={0.3}>
                <div className="card-premium-hover p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Total Programs</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-grotesk">
                        {loading ? "--" : (stats?.totalPrograms?.toLocaleString() || 0)}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                      <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                    Undergraduate & Graduate
                  </p>
                </div>
              </CardAnimation>
              </Card>
              <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {/* Faculty Members */}
              <CardAnimation delay={0.4}>
                <div className="card-premium-hover p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Faculty Members</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-grotesk">
                        {loading ? "--" : (stats?.facultyMembers?.toLocaleString() || 0)}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                    Active teaching staff
                  </p>
                </div>
              </CardAnimation>
              </Card>
            </div>

            {/* Attendance Ratio & User Status */}
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.5s" }}>
              <CardAnimation delay={0.5}>
                <div className="card-premium-hover p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Exam Attendance</p>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-grotesk">
                        {loading ? "--" : (stats?.attendanceRatio || '0.0%')}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                    Present: {stats?.attendanceDetails.present || 0} / Total: {stats?.attendanceDetails.total || 0}
                  </p>
                </div>
              </CardAnimation>
              </Card>
              <Card className="hover-lift animate-slide-up md:col-span-2" style={{ animationDelay: "0.6s" }}>
           
                <div className="card-premium p-6 md:col-span-2">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 font-grotesk">User & System Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-400">User Email:</span>
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{stats?.userEmail || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-400">Primary Role:</span>
                      <span className="pill-success">
                        {stats?.userRoleName || 'User'}
                      </span>
                    </div>
                    {stats?.userRoleDescription && (
                      <div className="flex items-start justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Description:</span>
                        <span className="text-xs text-right max-w-[200px] text-slate-900 dark:text-slate-100">{stats.userRoleDescription}</span>
                      </div>
                    )}
                    {stats?.userRoles && stats.userRoles.length > 1 && (
                      <div className="flex items-start justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Other Roles:</span>
                        <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                          {stats.userRoles.slice(1).map((role, index) => (
                            <span key={index} className="pill-neutral">
                              {role.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-400">Data Access:</span>
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{stats?.isSuperAdmin ? 'All Institutions' : `Institution: ${stats?.institutionId || 'N/A'}`}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-xs text-slate-600 dark:text-slate-400">System Status:</span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">● Online</span>
                    </div>
                  </div>
                </div>
                </Card>
            </div>

            {/* Upcoming Exams - Premium Table */}
            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.7s" }}>
              <div className="card-premium overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-grotesk">Upcoming Exams</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Next 5 scheduled examinations</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg border-slate-300 dark:border-slate-700"
                    >
                      View All
                    </Button>
                  </div>
                </div>

                <div className="p-6">
                  {loading ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">Loading upcoming exams...</div>
                  ) : stats?.upcomingExams && stats.upcomingExams.length > 0 ? (
                    <div className="space-y-3">
                      {stats.upcomingExams.map((exam) => (
                        <div
                          key={exam.id}
                          className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center min-w-[60px] p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mb-1" />
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{exam.course_code} - {exam.course_name}</div>
                              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <Clock className="h-3 w-3" />
                                {exam.session}
                              </div>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">{exam.program_name}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="pill-info">
                                {exam.session_name}
                              </span>
                              <span className="pill-neutral">
                                {exam.exam_mode}
                              </span>
                              {!stats.isSuperAdmin && (
                                <span className="pill-neutral">
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
                      <Calendar className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming exams scheduled</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </PageTransition>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
