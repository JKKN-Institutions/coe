"use client"

import { useState, useEffect, useMemo } from "react"
import XLSX from "@/lib/utils/excel-compat"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AppFooter } from "@/components/layout/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/common/use-toast"
import Link from "next/link"
import {
	AlertTriangle,
	BookOpen,
	CheckCircle2,
	ChevronRight,
	Clock,
	Download,
	FileWarning,
	GraduationCap,
	Loader2,
	RefreshCw,
	Search,
	Users,
	XCircle,
	BarChart3,
	TrendingUp,
	AlertCircle,
	Calendar,
	Filter
} from "lucide-react"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface BacklogItem {
	id: string
	student_id: string
	student_name: string
	register_number: string
	institutions_id: string
	institution_code: string
	institution_name: string
	program_id: string
	program_code: string
	program_name: string
	course_id: string
	course_code: string
	course_name: string
	course_credits: number
	original_semester: number
	original_session_code: string
	original_session_name: string
	original_internal_marks: number
	original_external_marks: number
	original_total_marks: number
	original_percentage: number
	original_letter_grade: string
	failure_reason: string
	is_absent: boolean
	is_cleared: boolean
	cleared_date: string | null
	cleared_session_code: string | null
	cleared_percentage: number | null
	cleared_letter_grade: string | null
	attempt_count: number
	max_attempts_allowed: number
	semesters_pending: number
	priority_level: 'Critical' | 'High' | 'Normal' | 'Low'
	is_registered_for_arrear: boolean
	arrear_session_code: string | null
}

interface LearnerArrearSummary {
	student_id: string
	student_name: string
	register_no: string
	program_code: string
	program_name: string
	total_backlogs: number
	pending_backlogs: number
	cleared_backlogs: number
	critical_count: number
	high_priority_count: number
	backlogs_by_semester: Record<number, number>
	total_credits_pending: number
}

interface BacklogStatistics {
	total_backlogs: number
	pending_backlogs: number
	cleared_backlogs: number
	critical_count: number
	high_priority_count: number
	learners_with_arrears: number
	failure_reasons: {
		Internal: number
		External: number
		Both: number
		Absent: number
	}
}

interface DropdownOption {
	id: string
	code: string
	name: string
}

// =====================================================
// PRIORITY COLORS
// =====================================================

const PRIORITY_COLORS: Record<string, string> = {
	Critical: 'bg-red-600 text-white',
	High: 'bg-orange-500 text-white',
	Normal: 'bg-blue-500 text-white',
	Low: 'bg-gray-400 text-white'
}

const PRIORITY_BORDER_COLORS: Record<string, string> = {
	Critical: 'border-l-red-600',
	High: 'border-l-orange-500',
	Normal: 'border-l-blue-500',
	Low: 'border-l-gray-400'
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function LearnerArrearsPage() {
	const { toast } = useToast()

	// Selection state
	const [selectedInstitution, setSelectedInstitution] = useState("")
	const [selectedProgram, setSelectedProgram] = useState("")
	const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'cleared'>('pending')
	const [selectedPriority, setSelectedPriority] = useState<string>("")

	// Dropdown data
	const [institutions, setInstitutions] = useState<DropdownOption[]>([])
	const [programs, setPrograms] = useState<DropdownOption[]>([])

	// Results state
	const [loading, setLoading] = useState(false)
	const [backlogs, setBacklogs] = useState<BacklogItem[]>([])
	const [learnerSummaries, setLearnerSummaries] = useState<LearnerArrearSummary[]>([])
	const [statistics, setStatistics] = useState<BacklogStatistics | null>(null)

	// UI state
	const [searchTerm, setSearchTerm] = useState("")
	const [expandedLearners, setExpandedLearners] = useState<Set<string>>(new Set())
	const [activeTab, setActiveTab] = useState<'overview' | 'learners' | 'courses'>('overview')

	// Fetch institutions on mount
	useEffect(() => {
		fetchInstitutions()
	}, [])

	// Fetch programs when institution changes
	useEffect(() => {
		if (selectedInstitution) {
			fetchPrograms(selectedInstitution)
		} else {
			setPrograms([])
		}
		setSelectedProgram("")
		setBacklogs([])
		setLearnerSummaries([])
		setStatistics(null)
	}, [selectedInstitution])

	const fetchInstitutions = async () => {
		try {
			const res = await fetch('/api/grading/final-marks?action=institutions')
			if (res.ok) {
				const data = await res.json()
				setInstitutions(data.map((i: any) => ({
					id: i.id,
					code: i.institution_code,
					name: i.name
				})))
			}
		} catch (e) {
			console.error('Failed to fetch institutions:', e)
		}
	}

	const fetchPrograms = async (institutionId: string) => {
		try {
			const res = await fetch(`/api/grading/final-marks?action=programs&institutionId=${institutionId}`)
			if (res.ok) {
				const data = await res.json()
				setPrograms(data.map((p: any) => ({
					id: p.id,
					code: p.program_code,
					name: p.program_name
				})))
			}
		} catch (e) {
			console.error('Failed to fetch programs:', e)
		}
	}

	const fetchBacklogs = async () => {
		if (!selectedInstitution) {
			toast({
				title: 'Missing Selection',
				description: 'Please select an institution',
				variant: 'destructive'
			})
			return
		}

		setLoading(true)
		setBacklogs([])
		setLearnerSummaries([])
		setStatistics(null)

		try {
			const params = new URLSearchParams({
				action: 'backlogs',
				institutionId: selectedInstitution,
				status: selectedStatus
			})

			if (selectedProgram) {
				params.append('programId', selectedProgram)
			}
			if (selectedPriority) {
				params.append('priority', selectedPriority)
			}

			const res = await fetch(`/api/grading/semester-results?${params.toString()}`)
			if (!res.ok) {
				const errorData = await res.json()
				throw new Error(errorData.error || 'Failed to fetch backlogs')
			}

			const data = await res.json()
			setBacklogs(data.backlogs || [])
			setLearnerSummaries(data.student_summaries || [])
			setStatistics(data.statistics || null)

			toast({
				title: 'Backlogs Loaded',
				description: `Found ${data.backlogs?.length || 0} backlog records.`,
				className: 'bg-green-50 border-green-200 text-green-800'
			})
		} catch (e) {
			console.error('Fetch error:', e)
			toast({
				title: 'Fetch Failed',
				description: e instanceof Error ? e.message : 'Failed to fetch backlogs',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}

	const toggleLearnerExpand = (learnerId: string) => {
		setExpandedLearners(prev => {
			const newSet = new Set(prev)
			if (newSet.has(learnerId)) {
				newSet.delete(learnerId)
			} else {
				newSet.add(learnerId)
			}
			return newSet
		})
	}

	// Filter results based on search
	const filteredSummaries = useMemo(() => {
		if (!searchTerm) return learnerSummaries
		const search = searchTerm.toLowerCase()
		return learnerSummaries.filter(s =>
			s.register_no?.toLowerCase().includes(search) ||
			s.student_name?.toLowerCase().includes(search)
		)
	}, [learnerSummaries, searchTerm])

	// Get backlogs for a specific learner
	const getLearnerBacklogs = (learnerId: string): BacklogItem[] => {
		return backlogs.filter(b => b.student_id === learnerId && !b.is_cleared)
	}

	// Group backlogs by course for analysis
	const courseBacklogAnalysis = useMemo(() => {
		const courseMap: Record<string, { course_code: string; course_name: string; credits: number; count: number; students: string[] }> = {}

		backlogs.filter(b => !b.is_cleared).forEach(b => {
			if (!courseMap[b.course_id]) {
				courseMap[b.course_id] = {
					course_code: b.course_code,
					course_name: b.course_name,
					credits: b.course_credits,
					count: 0,
					students: []
				}
			}
			courseMap[b.course_id].count++
			courseMap[b.course_id].students.push(b.register_number)
		})

		return Object.values(courseMap).sort((a, b) => b.count - a.count)
	}, [backlogs])

	// Export to Excel
	const handleExport = () => {
		if (backlogs.length === 0) {
			toast({
				title: 'No Data',
				description: 'No backlogs to export.',
				variant: 'destructive'
			})
			return
		}

		const exportData = backlogs.map(b => ({
			'Register No': b.register_number,
			'Learner Name': b.student_name,
			'Program': b.program_code,
			'Semester': b.original_semester,
			'Course Code': b.course_code,
			'Course Name': b.course_name,
			'Credits': b.course_credits,
			'Original Session': b.original_session_code,
			'Internal Marks': b.original_internal_marks,
			'External Marks': b.original_external_marks,
			'Total Marks': b.original_total_marks,
			'Percentage': b.original_percentage?.toFixed(2),
			'Grade': b.original_letter_grade,
			'Failure Reason': b.failure_reason || (b.is_absent ? 'Absent' : 'Failed'),
			'Attempt Count': b.attempt_count,
			'Semesters Pending': b.semesters_pending,
			'Priority': b.priority_level,
			'Status': b.is_cleared ? 'Cleared' : 'Pending',
			'Cleared Date': b.cleared_date || '',
			'Cleared Session': b.cleared_session_code || '',
			'Cleared Grade': b.cleared_letter_grade || ''
		}))

		const ws = XLSX.utils.json_to_sheet(exportData)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Learner Arrears')

		const fileName = `learner_arrears_${new Date().toISOString().split('T')[0]}.xlsx`
		XLSX.writeFile(wb, fileName)

		toast({
			title: 'Export Successful',
			description: `Exported ${backlogs.length} backlog records.`,
			className: 'bg-green-50 border-green-200 text-green-800'
		})
	}

	const canFetch = selectedInstitution

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex flex-col min-h-screen">
				<AppHeader />
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
					{/* Breadcrumb */}
					<div className="flex items-center gap-2">
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbLink asChild>
										<Link href="/dashboard">Dashboard</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbLink asChild>
										<Link href="/grading/grades">Grading</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage>Learner Arrears</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					{/* Page Header */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-lg bg-gradient-to-r from-red-500 to-orange-600 flex items-center justify-center">
								<FileWarning className="h-5 w-5 text-white" />
							</div>
							<div>
								<h1 className="text-2xl font-bold">Learner Arrears Tracker</h1>
								<p className="text-sm text-muted-foreground">Track and manage learner arrears with priority analysis</p>
							</div>
						</div>
					</div>

					{/* Selection Card */}
					<Card>
						<CardHeader className="pb-3">
							<div className="flex items-center gap-3">
								<div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
									<Filter className="h-4 w-4 text-white" />
								</div>
								<div>
									<CardTitle className="text-lg">Filter Backlogs</CardTitle>
									<CardDescription>Select institution and program to view backlogs</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div className="space-y-2">
									<Label>Institution *</Label>
									<Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
										<SelectTrigger>
											<SelectValue placeholder="Select institution" />
										</SelectTrigger>
										<SelectContent>
											{institutions.map(inst => (
												<SelectItem key={inst.id} value={inst.id}>
													{inst.code} - {inst.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Program</Label>
									<Select value={selectedProgram || "all"} onValueChange={(v) => setSelectedProgram(v === "all" ? "" : v)} disabled={!selectedInstitution}>
										<SelectTrigger>
											<SelectValue placeholder="All programs" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Programs</SelectItem>
											{programs.map(p => (
												<SelectItem key={p.id} value={p.id}>
													{p.code} - {p.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Status</Label>
									<Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="pending">Pending Only</SelectItem>
											<SelectItem value="cleared">Cleared Only</SelectItem>
											<SelectItem value="all">All</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Priority</Label>
									<Select value={selectedPriority || "all"} onValueChange={(v) => setSelectedPriority(v === "all" ? "" : v)}>
										<SelectTrigger>
											<SelectValue placeholder="All priorities" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Priorities</SelectItem>
											<SelectItem value="Critical">Critical</SelectItem>
											<SelectItem value="High">High</SelectItem>
											<SelectItem value="Normal">Normal</SelectItem>
											<SelectItem value="Low">Low</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="flex items-center justify-end pt-2 border-t">
								<Button onClick={fetchBacklogs} disabled={!canFetch || loading}>
									{loading ? (
										<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...</>
									) : (
										<><RefreshCw className="h-4 w-4 mr-2" /> Fetch Backlogs</>
									)}
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Results Section */}
					{statistics && (
						<>
							{/* Summary Cards */}
							<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Total Backlogs</p>
												<p className="text-xl font-bold">{statistics.total_backlogs}</p>
											</div>
											<BookOpen className="h-5 w-5 text-blue-500" />
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Pending</p>
												<p className="text-xl font-bold text-orange-600">{statistics.pending_backlogs}</p>
											</div>
											<Clock className="h-5 w-5 text-orange-500" />
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Cleared</p>
												<p className="text-xl font-bold text-green-600">{statistics.cleared_backlogs}</p>
											</div>
											<CheckCircle2 className="h-5 w-5 text-green-500" />
										</div>
									</CardContent>
								</Card>
								<Card className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-red-600 dark:text-red-400">Critical</p>
												<p className="text-xl font-bold text-red-600">{statistics.critical_count}</p>
											</div>
											<AlertTriangle className="h-5 w-5 text-red-500" />
										</div>
									</CardContent>
								</Card>
								<Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-orange-600 dark:text-orange-400">High Priority</p>
												<p className="text-xl font-bold text-orange-600">{statistics.high_priority_count}</p>
											</div>
											<AlertCircle className="h-5 w-5 text-orange-500" />
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Learners</p>
												<p className="text-xl font-bold">{statistics.learners_with_arrears}</p>
											</div>
											<Users className="h-5 w-5 text-purple-500" />
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Clearance Rate</p>
												<p className="text-xl font-bold text-green-600">
													{statistics.total_backlogs > 0
														? Math.round((statistics.cleared_backlogs / statistics.total_backlogs) * 100)
														: 0}%
												</p>
											</div>
											<TrendingUp className="h-5 w-5 text-green-500" />
										</div>
									</CardContent>
								</Card>
							</div>

							{/* Failure Reasons Breakdown */}
							<Card>
								<CardHeader className="py-3">
									<CardTitle className="text-sm">Failure Reasons Breakdown</CardTitle>
								</CardHeader>
								<CardContent className="pb-3">
									<div className="grid grid-cols-4 gap-4">
										<div className="text-center p-3 bg-muted/50 rounded-lg">
											<div className="text-2xl font-bold text-blue-600">{statistics.failure_reasons.External}</div>
											<div className="text-xs text-muted-foreground">External</div>
										</div>
										<div className="text-center p-3 bg-muted/50 rounded-lg">
											<div className="text-2xl font-bold text-purple-600">{statistics.failure_reasons.Internal}</div>
											<div className="text-xs text-muted-foreground">Internal</div>
										</div>
										<div className="text-center p-3 bg-muted/50 rounded-lg">
											<div className="text-2xl font-bold text-orange-600">{statistics.failure_reasons.Both}</div>
											<div className="text-xs text-muted-foreground">Both</div>
										</div>
										<div className="text-center p-3 bg-muted/50 rounded-lg">
											<div className="text-2xl font-bold text-red-600">{statistics.failure_reasons.Absent}</div>
											<div className="text-xs text-muted-foreground">Absent</div>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Tabs for different views */}
							<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
								<div className="flex items-center justify-between">
									<TabsList>
										<TabsTrigger value="overview" className="gap-2">
											<BarChart3 className="h-4 w-4" />
											Overview
										</TabsTrigger>
										<TabsTrigger value="learners" className="gap-2">
											<Users className="h-4 w-4" />
											By Learner
										</TabsTrigger>
										<TabsTrigger value="courses" className="gap-2">
											<BookOpen className="h-4 w-4" />
											By Course
										</TabsTrigger>
									</TabsList>
									<div className="flex items-center gap-2">
										<div className="relative">
											<Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												value={searchTerm}
												onChange={(e) => setSearchTerm(e.target.value)}
												placeholder="Search learners..."
												className="pl-8 h-9 w-48"
											/>
										</div>
										<Button variant="outline" size="sm" onClick={handleExport}>
											<Download className="h-4 w-4 mr-1" />
											Export
										</Button>
									</div>
								</div>

								{/* Overview Tab */}
								<TabsContent value="overview" className="mt-4">
									<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
										{/* Critical Backlogs Alert */}
										{statistics.critical_count > 0 && (
											<Card className="border-red-200 dark:border-red-800">
												<CardHeader className="py-3 bg-red-50 dark:bg-red-900/10">
													<div className="flex items-center gap-2">
														<AlertTriangle className="h-5 w-5 text-red-600" />
														<CardTitle className="text-base text-red-600">Critical Attention Required</CardTitle>
													</div>
												</CardHeader>
												<CardContent className="pt-3">
													<p className="text-sm text-muted-foreground mb-3">
														{statistics.critical_count} learners have arrears pending for 4+ semesters
													</p>
													<div className="space-y-2">
														{learnerSummaries
															.filter(s => s.critical_count > 0)
															.slice(0, 5)
															.map(s => (
																<div key={s.student_id} className="flex items-center justify-between text-sm p-2 bg-red-50/50 dark:bg-red-900/5 rounded">
																	<span className="font-medium">{s.register_no} - {s.student_name}</span>
																	<Badge variant="destructive" className="text-xs">{s.critical_count} Critical</Badge>
																</div>
															))}
													</div>
												</CardContent>
											</Card>
										)}

										{/* Top Failed Courses */}
										<Card>
											<CardHeader className="py-3">
												<CardTitle className="text-base">Most Failed Courses</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="space-y-3">
													{courseBacklogAnalysis.slice(0, 5).map((course, i) => (
														<div key={course.course_code} className="flex items-center gap-3">
															<div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
																{i + 1}
															</div>
															<div className="flex-1">
																<div className="text-sm font-medium">{course.course_code}</div>
																<div className="text-xs text-muted-foreground">{course.course_name}</div>
															</div>
															<Badge variant="outline">{course.count} learners</Badge>
														</div>
													))}
												</div>
											</CardContent>
										</Card>
									</div>
								</TabsContent>

								{/* Learners Tab */}
								<TabsContent value="learners" className="mt-4">
									<Card>
										<CardHeader className="py-3">
											<CardTitle className="text-lg">Learners with Arrears</CardTitle>
										</CardHeader>
										<CardContent className="p-0">
											<div className="divide-y">
												{filteredSummaries
													.filter(s => s.pending_backlogs > 0 || selectedStatus !== 'pending')
													.map(learner => {
														const learnerBacklogs = getLearnerBacklogs(learner.student_id)

														return (
															<Collapsible
																key={learner.student_id}
																open={expandedLearners.has(learner.student_id)}
																onOpenChange={() => toggleLearnerExpand(learner.student_id)}
															>
																<CollapsibleTrigger asChild>
																	<div className={`flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer border-l-4 ${
																		learner.critical_count > 0 ? PRIORITY_BORDER_COLORS['Critical'] :
																		learner.high_priority_count > 0 ? PRIORITY_BORDER_COLORS['High'] :
																		PRIORITY_BORDER_COLORS['Normal']
																	}`}>
																		<div className="flex items-center gap-4">
																			<ChevronRight className={`h-4 w-4 transition-transform ${expandedLearners.has(learner.student_id) ? 'rotate-90' : ''}`} />
																			<div>
																				<div className="font-medium">{learner.register_no}</div>
																				<div className="text-sm text-muted-foreground">{learner.student_name}</div>
																				<div className="text-xs text-muted-foreground">{learner.program_code}</div>
																			</div>
																		</div>
																		<div className="flex items-center gap-3">
																			<div className="text-right">
																				<div className="text-sm">
																					<span className="font-bold text-orange-600">{learner.pending_backlogs}</span>
																					<span className="text-muted-foreground"> pending</span>
																				</div>
																				<div className="text-xs text-muted-foreground">
																					{learner.total_credits_pending} credits
																				</div>
																			</div>
																			{learner.critical_count > 0 && (
																				<Badge className="bg-red-600 text-xs">
																					{learner.critical_count} Critical
																				</Badge>
																			)}
																			{learner.high_priority_count > 0 && learner.critical_count === 0 && (
																				<Badge className="bg-orange-500 text-xs">
																					{learner.high_priority_count} High
																				</Badge>
																			)}
																		</div>
																	</div>
																</CollapsibleTrigger>
																<CollapsibleContent>
																	<div className="px-4 pb-4 bg-muted/30">
																		<Table>
																			<TableHeader>
																				<TableRow className="text-xs">
																					<TableHead>Sem</TableHead>
																					<TableHead>Course</TableHead>
																					<TableHead className="text-center">Cr</TableHead>
																					<TableHead className="text-center">Marks</TableHead>
																					<TableHead className="text-center">%</TableHead>
																					<TableHead className="text-center">Reason</TableHead>
																					<TableHead className="text-center">Attempts</TableHead>
																					<TableHead className="text-center">Pending</TableHead>
																					<TableHead className="text-center">Priority</TableHead>
																				</TableRow>
																			</TableHeader>
																			<TableBody>
																				{learnerBacklogs.map(b => (
																					<TableRow key={b.id} className="text-xs">
																						<TableCell>{b.original_semester}</TableCell>
																						<TableCell>
																							<span className="font-medium">{b.course_code}</span>
																							<span className="text-muted-foreground ml-1">- {b.course_name}</span>
																						</TableCell>
																						<TableCell className="text-center">{b.course_credits}</TableCell>
																						<TableCell className="text-center">
																							{b.original_total_marks?.toFixed(0) || '-'}
																						</TableCell>
																						<TableCell className="text-center">
																							{b.original_percentage?.toFixed(1) || '-'}%
																						</TableCell>
																						<TableCell className="text-center">
																							<Badge variant="outline" className="text-[10px]">
																								{b.is_absent ? 'Absent' : b.failure_reason || 'Failed'}
																							</Badge>
																						</TableCell>
																						<TableCell className="text-center">
																							{b.attempt_count}/{b.max_attempts_allowed}
																						</TableCell>
																						<TableCell className="text-center">
																							{b.semesters_pending} sem
																						</TableCell>
																						<TableCell className="text-center">
																							<Badge className={`text-[10px] ${PRIORITY_COLORS[b.priority_level]}`}>
																								{b.priority_level}
																							</Badge>
																						</TableCell>
																					</TableRow>
																				))}
																			</TableBody>
																		</Table>
																	</div>
																</CollapsibleContent>
															</Collapsible>
														)
													})}
											</div>

											{filteredSummaries.filter(s => s.pending_backlogs > 0 || selectedStatus !== 'pending').length === 0 && (
												<div className="text-center py-8 text-muted-foreground">
													<Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
													<p>{searchTerm ? 'No matching learners found' : 'No arrears found'}</p>
												</div>
											)}
										</CardContent>
									</Card>
								</TabsContent>

								{/* Courses Tab */}
								<TabsContent value="courses" className="mt-4">
									<Card>
										<CardHeader className="py-3">
											<CardTitle className="text-lg">Course-wise Backlog Analysis</CardTitle>
											<CardDescription>Courses with highest failure rates</CardDescription>
										</CardHeader>
										<CardContent>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>#</TableHead>
														<TableHead>Course Code</TableHead>
														<TableHead>Course Name</TableHead>
														<TableHead className="text-center">Credits</TableHead>
														<TableHead className="text-center">Failed Learners</TableHead>
														<TableHead className="text-center">% of Total</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{courseBacklogAnalysis.map((course, i) => {
														const percentage = statistics.pending_backlogs > 0
															? Math.round((course.count / statistics.pending_backlogs) * 100)
															: 0

														return (
															<TableRow key={course.course_code}>
																<TableCell className="font-bold">{i + 1}</TableCell>
																<TableCell className="font-medium">{course.course_code}</TableCell>
																<TableCell>{course.course_name}</TableCell>
																<TableCell className="text-center">{course.credits}</TableCell>
																<TableCell className="text-center">
																	<Badge variant="destructive">{course.count}</Badge>
																</TableCell>
																<TableCell>
																	<div className="flex items-center gap-2">
																		<Progress value={percentage} className="h-2 w-20" />
																		<span className="text-xs text-muted-foreground">{percentage}%</span>
																	</div>
																</TableCell>
															</TableRow>
														)
													})}
												</TableBody>
											</Table>

											{courseBacklogAnalysis.length === 0 && (
												<div className="text-center py-8 text-muted-foreground">
													<BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
													<p>No course-wise backlog data available</p>
												</div>
											)}
										</CardContent>
									</Card>
								</TabsContent>
							</Tabs>
						</>
					)}

					{/* Empty State */}
					{!loading && !statistics && (
						<Card className="py-12">
							<CardContent className="text-center">
								<div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
									<FileWarning className="h-8 w-8 text-muted-foreground" />
								</div>
								<h3 className="text-lg font-semibold mb-2">No Backlogs Loaded</h3>
								<p className="text-muted-foreground mb-4">
									Select an institution and click "Fetch Backlogs" to view learner arrear data.
								</p>
							</CardContent>
						</Card>
					)}
				</div>
				<AppFooter />
			</SidebarInset>
		</SidebarProvider>
	)
}
