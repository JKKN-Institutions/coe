"use client"

import { useEffect, useState } from "react"
import { useInstitutionFilter } from "@/hooks/use-institution-filter"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeaderWhite } from "@/components/layout/app-header-white"
import { AppFooter } from "@/components/layout/app-footer"
import { PageTransition, CardAnimation } from "@/components/common/page-transition"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Users,
	BookOpen,
	GraduationCap,
	Building2,
	Layers,
	CalendarCheck,
	UserCheck,
	ClipboardCheck,
	TrendingUp,
	TrendingDown,
	Calendar,
	Clock,
	FileText,
	CheckCircle2,
	XCircle,
	AlertCircle,
	ArrowRight,
	Sparkles,
	Activity,
	BarChart3,
	Award
} from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context-parent"
import { useToast } from "@/hooks/common/use-toast"
import { cn } from "@/lib/utils"

interface DashboardStats {
	totalLearners: number
	activeCourses: number
	totalPrograms: number
	facultyMembers: number
	totalInstitutions: number
	totalDepartments: number
	totalSemesters: number
	activeExamSessions: number
	totalExaminers: number
	pendingEvaluations: number
	myJKKN: {
		learners: number
		staff: number
		institutions: number
		departments: number
		programs: number
	}
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
	recentResults: Array<{
		id: string
		register_no: string
		semester: number
		gpa: number
		cgpa: number
		pass_status: string
		published_at: string
		session_name: string
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

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1200): number {
	const [count, setCount] = useState(0)

	useEffect(() => {
		if (target === 0) {
			setCount(0)
			return
		}

		let startTime: number | null = null
		let animationFrame: number

		const animate = (currentTime: number) => {
			if (startTime === null) startTime = currentTime
			const elapsed = currentTime - startTime
			const progress = Math.min(elapsed / duration, 1)
			const easeOutCubic = 1 - Math.pow(1 - progress, 3)
			setCount(Math.round(easeOutCubic * target))

			if (progress < 1) {
				animationFrame = requestAnimationFrame(animate)
			}
		}

		animationFrame = requestAnimationFrame(animate)
		return () => cancelAnimationFrame(animationFrame)
	}, [target, duration])

	return count
}

// Stat Card Component
interface StatCardProps {
	title: string
	value: number
	subtitle?: string
	icon: React.ElementType
	colorTheme: 'emerald' | 'blue' | 'purple' | 'amber' | 'teal' | 'red' | 'indigo' | 'pink'
	trend?: { value: number; isPositive: boolean }
	delay?: number
	loading?: boolean
}

const colorThemes = {
	emerald: {
		bg: "bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-teal-50 dark:from-emerald-950/40 dark:via-emerald-900/30 dark:to-teal-950/40",
		iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
		iconColor: "text-emerald-600 dark:text-emerald-400",
		titleColor: "text-emerald-600 dark:text-emerald-400",
		valueColor: "text-emerald-700 dark:text-emerald-300",
		border: "border-emerald-200/50 dark:border-emerald-800/50"
	},
	blue: {
		bg: "bg-gradient-to-br from-blue-50 via-blue-100/50 to-indigo-50 dark:from-blue-950/40 dark:via-blue-900/30 dark:to-indigo-950/40",
		iconBg: "bg-blue-100 dark:bg-blue-900/50",
		iconColor: "text-blue-600 dark:text-blue-400",
		titleColor: "text-blue-600 dark:text-blue-400",
		valueColor: "text-blue-700 dark:text-blue-300",
		border: "border-blue-200/50 dark:border-blue-800/50"
	},
	purple: {
		bg: "bg-gradient-to-br from-purple-50 via-purple-100/50 to-violet-50 dark:from-purple-950/40 dark:via-purple-900/30 dark:to-violet-950/40",
		iconBg: "bg-purple-100 dark:bg-purple-900/50",
		iconColor: "text-purple-600 dark:text-purple-400",
		titleColor: "text-purple-600 dark:text-purple-400",
		valueColor: "text-purple-700 dark:text-purple-300",
		border: "border-purple-200/50 dark:border-purple-800/50"
	},
	amber: {
		bg: "bg-gradient-to-br from-amber-50 via-amber-100/50 to-yellow-50 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-yellow-950/40",
		iconBg: "bg-amber-100 dark:bg-amber-900/50",
		iconColor: "text-amber-600 dark:text-amber-400",
		titleColor: "text-amber-600 dark:text-amber-400",
		valueColor: "text-amber-700 dark:text-amber-300",
		border: "border-amber-200/50 dark:border-amber-800/50"
	},
	teal: {
		bg: "bg-gradient-to-br from-teal-50 via-teal-100/50 to-cyan-50 dark:from-teal-950/40 dark:via-teal-900/30 dark:to-cyan-950/40",
		iconBg: "bg-teal-100 dark:bg-teal-900/50",
		iconColor: "text-teal-600 dark:text-teal-400",
		titleColor: "text-teal-600 dark:text-teal-400",
		valueColor: "text-teal-700 dark:text-teal-300",
		border: "border-teal-200/50 dark:border-teal-800/50"
	},
	red: {
		bg: "bg-gradient-to-br from-red-50 via-red-100/50 to-rose-50 dark:from-red-950/40 dark:via-red-900/30 dark:to-rose-950/40",
		iconBg: "bg-red-100 dark:bg-red-900/50",
		iconColor: "text-red-600 dark:text-red-400",
		titleColor: "text-red-600 dark:text-red-400",
		valueColor: "text-red-700 dark:text-red-300",
		border: "border-red-200/50 dark:border-red-800/50"
	},
	indigo: {
		bg: "bg-gradient-to-br from-indigo-50 via-indigo-100/50 to-blue-50 dark:from-indigo-950/40 dark:via-indigo-900/30 dark:to-blue-950/40",
		iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
		iconColor: "text-indigo-600 dark:text-indigo-400",
		titleColor: "text-indigo-600 dark:text-indigo-400",
		valueColor: "text-indigo-700 dark:text-indigo-300",
		border: "border-indigo-200/50 dark:border-indigo-800/50"
	},
	pink: {
		bg: "bg-gradient-to-br from-pink-50 via-pink-100/50 to-rose-50 dark:from-pink-950/40 dark:via-pink-900/30 dark:to-rose-950/40",
		iconBg: "bg-pink-100 dark:bg-pink-900/50",
		iconColor: "text-pink-600 dark:text-pink-400",
		titleColor: "text-pink-600 dark:text-pink-400",
		valueColor: "text-pink-700 dark:text-pink-300",
		border: "border-pink-200/50 dark:border-pink-800/50"
	}
}

function StatCard({ title, value, subtitle, icon: Icon, colorTheme, trend, delay = 0, loading }: StatCardProps) {
	const theme = colorThemes[colorTheme]
	const animatedValue = useAnimatedCounter(loading ? 0 : value)

	if (loading) {
		return (
			<Card className="overflow-hidden">
				<CardContent className="p-5">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<Skeleton className="h-3 w-20 mb-2" />
							<Skeleton className="h-8 w-16 mb-2" />
							<Skeleton className="h-3 w-24" />
						</div>
						<Skeleton className="h-12 w-12 rounded-xl" />
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<CardAnimation delay={delay}>
			<Card className={cn(
				"overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group",
				theme.bg, theme.border
			)}>
				<CardContent className="p-5 relative">
					{/* Decorative circle */}
					<div className={cn(
						"absolute top-0 right-0 w-20 h-20 rounded-full -mr-8 -mt-8 opacity-30",
						"group-hover:scale-125 transition-transform duration-500",
						theme.iconBg
					)} />

					<div className="flex items-start justify-between relative">
						<div className="flex-1 min-w-0">
							<p className={cn("text-[11px] uppercase tracking-wider font-semibold mb-1", theme.titleColor)}>
								{title}
							</p>
							<p className={cn("text-3xl font-bold tabular-nums font-heading", theme.valueColor)}>
								{animatedValue.toLocaleString()}
							</p>
							{trend && (
								<div className="flex items-center gap-1 mt-2">
									{trend.isPositive ? (
										<TrendingUp className="h-3 w-3 text-emerald-500" />
									) : (
										<TrendingDown className="h-3 w-3 text-red-500" />
									)}
									<span className={cn(
										"text-[10px] font-medium",
										trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
									)}>
										{trend.value > 0 ? '+' : ''}{trend.value}%
									</span>
								</div>
							)}
							{subtitle && !trend && (
								<p className={cn("text-[10px] mt-2 opacity-80", theme.titleColor)}>
									{subtitle}
								</p>
							)}
						</div>
						<div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", theme.iconBg)}>
							<Icon className={cn("h-6 w-6", theme.iconColor)} />
						</div>
					</div>
				</CardContent>
			</Card>
		</CardAnimation>
	)
}

export default function Page() {
	const { user } = useAuth()
	const { toast } = useToast()

	// Institution filter hook for multi-tenant filtering
	const {
		filter,
		isReady,
		appendToUrl
	} = useInstitutionFilter()

	const [now, setNow] = useState<Date | null>(null)
	const [stats, setStats] = useState<DashboardStats | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const update = () => setNow(new Date())
		update()
		const id = setInterval(update, 1000)
		return () => clearInterval(id)
	}, [])

	useEffect(() => {
		const fetchStats = async () => {
			if (!user?.id && !user?.email) return
			if (!isReady) return

			try {
				setLoading(true)
				const params = new URLSearchParams()
				if (user?.id) params.set('user_id', user.id)
				if (user?.email) params.set('email', user.email)

				// Use institution filter for multi-tenant data access
				const url = appendToUrl(`/api/dashboard/stats?${params.toString()}`)
				const response = await fetch(url, {
					credentials: 'include'
				})

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
	}, [user, toast, isReady, filter])

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

	const attendancePercent = stats?.attendanceRatio
		? parseFloat(stats.attendanceRatio.replace('%', ''))
		: 0

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<AppHeaderWhite />

				<PageTransition>
					<div className="flex flex-1 flex-col gap-6 p-4 md:p-6">

						{/* Welcome Hero Card */}
						<Card className="rounded-2xl border-0 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white shadow-2xl overflow-hidden relative">
							<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
							<div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
							<div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
							<div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />

							<CardContent className="p-8 relative z-10">
								<div className="flex flex-col lg:flex-row items-start justify-between gap-6">
									<div className="space-y-3">
										<div className="flex items-center gap-2">
											<Sparkles className="h-5 w-5 text-yellow-300" />
											<span className="text-emerald-100 text-sm font-medium">
								  Dashboard Overview
								</span>
										</div>
										<h1 className="text-3xl sm:text-4xl font-bold text-white font-heading">
											Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}!` : "!"}
										</h1>
										<p className="text-lg text-emerald-100 max-w-md">
											Here's what's happening at JKKN COE today. Stay on top of examinations, results, and more.
										</p>

										{/* Quick Stats Badges */}
										<div className="flex flex-wrap gap-2 pt-2">
											{stats?.myJKKN && stats.myJKKN.learners > 0 && (
												<Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
													<Users className="h-3 w-3 mr-1" />
													{stats.myJKKN.learners.toLocaleString()} Learners
												</Badge>
											)}
											{stats?.activeExamSessions !== undefined && stats.activeExamSessions > 0 && (
												<Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
													<CalendarCheck className="h-3 w-3 mr-1" />
													{stats.activeExamSessions} Active Sessions
												</Badge>
											)}
											{stats?.pendingEvaluations !== undefined && stats.pendingEvaluations > 0 && (
												<Badge className="bg-yellow-500/80 hover:bg-yellow-500 text-white border-0">
													<ClipboardCheck className="h-3 w-3 mr-1" />
													{stats.pendingEvaluations} Pending Evaluations
												</Badge>
											)}
										</div>
									</div>

									<div className="text-left lg:text-right space-y-2 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
										<div className="text-3xl font-bold tracking-wider text-white font-heading">
											{timeString}
										</div>
										<div className="text-sm text-emerald-100">{dateString}</div>
										<div className="flex items-center gap-2 text-emerald-200 text-xs pt-1">
											<Activity className="h-3 w-3" />
											<span>System Online</span>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* MyJKKN Live Stats Section */}
						{stats?.myJKKN && (stats.myJKKN.learners > 0 || stats.myJKKN.staff > 0) && (
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<div className="h-8 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
									<h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 font-heading">
										MyJKKN Live Data
									</h2>
									<Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 dark:border-emerald-800">
										Live
									</Badge>
								</div>

								<div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
									<StatCard
										title="Total Learners"
										value={stats.myJKKN.learners}
										icon={Users}
										colorTheme="emerald"
										delay={0.1}
										loading={loading}
									/>
									<StatCard
										title="Total Staff"
										value={stats.myJKKN.staff}
										icon={UserCheck}
										colorTheme="blue"
										delay={0.15}
										loading={loading}
									/>
									{stats.isSuperAdmin && (
										<StatCard
											title="Institutions"
											value={stats.myJKKN.institutions}
											icon={Building2}
											colorTheme="purple"
											delay={0.2}
											loading={loading}
										/>
									)}
									<StatCard
										title="Departments"
										value={stats.myJKKN.departments}
										icon={Layers}
										colorTheme="amber"
										delay={0.25}
										loading={loading}
									/>
									<StatCard
										title="Programs"
										value={stats.myJKKN.programs}
										icon={GraduationCap}
										colorTheme="teal"
										delay={0.3}
										loading={loading}
									/>
								</div>
							</div>
						)}

						{/* COE Stats Section */}
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
								<h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 font-heading">
									COE Statistics
								</h2>
							</div>

							<div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
								<StatCard
									title="Exam Registrations"
									value={stats?.totalLearners || 0}
									subtitle="Distinct learners"
									icon={Users}
									colorTheme="emerald"
									delay={0.1}
									loading={loading}
								/>
								<StatCard
									title="Active Courses"
									value={stats?.activeCourses || 0}
									icon={BookOpen}
									colorTheme="blue"
									delay={0.15}
									loading={loading}
								/>
								<StatCard
									title="Programs"
									value={stats?.totalPrograms || 0}
									icon={GraduationCap}
									colorTheme="purple"
									delay={0.2}
									loading={loading}
								/>
								<StatCard
									title="Faculty COE"
									value={stats?.facultyMembers || 0}
									icon={UserCheck}
									colorTheme="indigo"
									delay={0.25}
									loading={loading}
								/>
								<StatCard
									title="Examiners"
									value={stats?.totalExaminers || 0}
									icon={ClipboardCheck}
									colorTheme="teal"
									delay={0.3}
									loading={loading}
								/>
								<StatCard
									title="Exam Sessions"
									value={stats?.activeExamSessions || 0}
									subtitle="Active sessions"
									icon={CalendarCheck}
									colorTheme="amber"
									delay={0.35}
									loading={loading}
								/>
							</div>
						</div>

						{/* Analytics Row */}
						<div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
							{/* Exam Attendance Card */}
							<CardAnimation delay={0.4}>
								<Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
									<CardContent className="p-6">
										<div className="flex items-center justify-between mb-4">
											<div>
												<p className="text-sm font-medium text-slate-500 dark:text-slate-400">
													Exam Attendance
												</p>
												<p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-heading">
													{loading ? '--' : stats?.attendanceRatio || '0.0%'}
												</p>
											</div>
											<div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
												<BarChart3 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
											</div>
										</div>

										<Progress value={attendancePercent} className="h-2 mb-3" />

										<div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
											<div className="flex items-center gap-1">
												<CheckCircle2 className="h-3 w-3 text-emerald-500" />
												<span>Present: {stats?.attendanceDetails?.present || 0}</span>
											</div>
											<div className="flex items-center gap-1">
												<XCircle className="h-3 w-3 text-red-500" />
												<span>Absent: {stats?.attendanceDetails?.absent || 0}</span>
											</div>
										</div>
									</CardContent>
								</Card>
							</CardAnimation>

							{/* User Status Card */}
							<CardAnimation delay={0.45}>
								<Card className="overflow-hidden hover:shadow-lg transition-all duration-300 md:col-span-2">
									<CardContent className="p-6">
										<div className="flex items-center gap-2 mb-4">
											<Award className="h-5 w-5 text-indigo-500" />
											<h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-heading">
								User & Access Status
							</h3>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-3">
												<div className="flex items-center justify-between">
													<span className="text-xs text-slate-500 dark:text-slate-400">Email</span>
													<span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
								  {stats?.userEmail || 'N/A'}
								</span>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-xs text-slate-500 dark:text-slate-400">Primary Role</span>
													<Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
														{stats?.userRoleName || 'User'}
													</Badge>
												</div>
											</div>

											<div className="space-y-3">
												<div className="flex items-center justify-between">
													<span className="text-xs text-slate-500 dark:text-slate-400">Data Access</span>
													<span className="text-xs font-medium text-slate-700 dark:text-slate-300">
								  {stats?.isSuperAdmin ? 'All Institutions' : `Institution Only`}
								</span>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-xs text-slate-500 dark:text-slate-400">System Status</span>
													<div className="flex items-center gap-1">
														<span className="relative flex h-2 w-2">
															<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
															<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
														</span>
														<span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Online</span>
													</div>
												</div>
											</div>
										</div>

										{stats?.userRoles && stats.userRoles.length > 1 && (
											<div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
												<span className="text-xs text-slate-500 dark:text-slate-400 mb-2 block">Other Roles</span>
												<div className="flex flex-wrap gap-1">
													{stats.userRoles.slice(1).map((role, index) => (
														<Badge key={index} variant="outline" className="text-xs">
															{role.name}
														</Badge>
													))}
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							</CardAnimation>
						</div>

						{/* Upcoming Exams & Recent Results */}
						<div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
							{/* Upcoming Exams */}
							<CardAnimation delay={0.5}>
								<Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
									<div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
												<div>
													<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">
								  Upcoming Exams
								</h3>
													<p className="text-xs text-slate-500 dark:text-slate-400">Next scheduled examinations</p>
												</div>
											</div>
											<Button variant="ghost" size="sm" className="text-xs gap-1">
												View All <ArrowRight className="h-3 w-3" />
											</Button>
										</div>
									</div>

									<CardContent className="p-4">
										{loading ? (
											<div className="space-y-3">
												{[1, 2, 3].map((i) => (
													<div key={i} className="flex gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
														<Skeleton className="h-12 w-12 rounded-lg" />
														<div className="flex-1 space-y-2">
															<Skeleton className="h-4 w-3/4" />
															<Skeleton className="h-3 w-1/2" />
														</div>
													</div>
												))}
											</div>
										) : stats?.upcomingExams && stats.upcomingExams.length > 0 ? (
											<div className="space-y-3">
												{stats.upcomingExams.map((exam) => (
													<div
														key={exam.id}
														className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors"
													>
														<div className="flex flex-col items-center justify-center min-w-[52px] p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
															<Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mb-1" />
															<div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
								      {new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
								    </div>
														</div>
														<div className="flex-1 min-w-0">
															<div className="flex items-center justify-between gap-2">
																<p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
															{exam.course_code} - {exam.course_name}
														</p>
																<div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
																	<Clock className="h-3 w-3" />
																	{exam.session}
																</div>
															</div>
															<p className="text-xs text-slate-500 dark:text-slate-400 truncate">{exam.program_name}</p>
															<div className="flex items-center gap-2 mt-2">
																<Badge variant="outline" className="text-[10px] py-0">
																	{exam.session_name}
																</Badge>
																<Badge variant="secondary" className="text-[10px] py-0">
																	{exam.exam_mode}
																</Badge>
															</div>
														</div>
													</div>
												))}
											</div>
										) : (
											<div className="text-center py-8">
												<Calendar className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
												<p className="text-sm text-slate-500 dark:text-slate-400">No upcoming exams scheduled</p>
											</div>
										)}
									</CardContent>
								</Card>
							</CardAnimation>

							{/* Recent Results */}
							<CardAnimation delay={0.55}>
								<Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
									<div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
												<div>
													<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">
								  Recent Results
								</h3>
													<p className="text-xs text-slate-500 dark:text-slate-400">Latest published results</p>
												</div>
											</div>
											<Button variant="ghost" size="sm" className="text-xs gap-1">
												View All <ArrowRight className="h-3 w-3" />
											</Button>
										</div>
									</div>

									<CardContent className="p-4">
										{loading ? (
											<div className="space-y-3">
												{[1, 2, 3].map((i) => (
													<div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800">
														<div className="space-y-2">
															<Skeleton className="h-4 w-24" />
															<Skeleton className="h-3 w-16" />
														</div>
														<Skeleton className="h-6 w-12" />
													</div>
												))}
											</div>
										) : stats?.recentResults && stats.recentResults.length > 0 ? (
											<div className="space-y-3">
												{stats.recentResults.map((result) => (
													<div
														key={result.id}
														className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
													>
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium text-slate-900 dark:text-slate-100">
								      {result.register_no}
								    </p>
															<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
																<span>Semester {result.semester}</span>
																<span>•</span>
																<span>GPA: {result.gpa?.toFixed(2) || 'N/A'}</span>
																<span>•</span>
																<span>CGPA: {result.cgpa?.toFixed(2) || 'N/A'}</span>
															</div>
														</div>
														<Badge
															className={cn(
																"text-[10px]",
																result.pass_status === 'Pass'
																	? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
																	: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
															)}
														>
															{result.pass_status === 'Pass' ? (
																<CheckCircle2 className="h-3 w-3 mr-1" />
															) : (
																<AlertCircle className="h-3 w-3 mr-1" />
															)}
															{result.pass_status}
														</Badge>
													</div>
												))}
											</div>
										) : (
											<div className="text-center py-8">
												<FileText className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
												<p className="text-sm text-slate-500 dark:text-slate-400">No recent results published</p>
											</div>
										)}
									</CardContent>
								</Card>
							</CardAnimation>
						</div>

					</div>
				</PageTransition>
				<AppFooter />
			</SidebarInset>
		</SidebarProvider>
	)
}
