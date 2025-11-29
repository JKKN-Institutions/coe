"use client"

import { useState, useEffect, useMemo } from "react"
import * as XLSX from "xlsx"
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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/common/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Link from "next/link"
import {
	Calculator,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Download,
	FileSpreadsheet,
	GraduationCap,
	Loader2,
	Save,
	Search,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Users,
	BookOpen,
	Award,
	TrendingUp,
	AlertTriangle,
	RefreshCw
} from "lucide-react"
import type { StudentResultRow, InstitutionOption, ProgramData, ExamSessionData, CourseOfferingData } from "@/types/final-marks"

// Step indicator component
const StepIndicator = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => {
	return (
		<div className="flex items-center justify-center mb-6">
			{steps.map((step, index) => (
				<div key={index} className="flex items-center">
					<div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-semibold transition-all ${
						index < currentStep
							? 'bg-green-500 border-green-500 text-white'
							: index === currentStep
								? 'bg-primary border-primary text-white'
								: 'bg-muted border-muted-foreground/30 text-muted-foreground'
					}`}>
						{index < currentStep ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
					</div>
					<span className={`ml-2 text-sm font-medium ${
						index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
					}`}>
						{step}
					</span>
					{index < steps.length - 1 && (
						<div className={`w-12 h-0.5 mx-3 ${
							index < currentStep ? 'bg-green-500' : 'bg-muted-foreground/30'
						}`} />
					)}
				</div>
			))}
		</div>
	)
}

export default function GenerateFinalMarksPage() {
	const { toast } = useToast()
	const steps = ['Select Program', 'Select Courses', 'Generate Results', 'Save & Export']

	// Step state
	const [currentStep, setCurrentStep] = useState(0)

	// Dropdown data
	const [institutions, setInstitutions] = useState<InstitutionOption[]>([])
	const [programs, setPrograms] = useState<ProgramData[]>([])
	const [sessions, setSessions] = useState<ExamSessionData[]>([])
	const [courseOfferings, setCourseOfferings] = useState<CourseOfferingData[]>([])

	// Selection state
	const [selectedInstitution, setSelectedInstitution] = useState("")
	const [selectedProgram, setSelectedProgram] = useState("")
	const [selectedSession, setSelectedSession] = useState("")
	const [selectedCourses, setSelectedCourses] = useState<string[]>([])
	const [gradeSystemCode, setGradeSystemCode] = useState<'UG' | 'PG'>('UG')
	const [regulationId, setRegulationId] = useState("")

	// Results state
	const [results, setResults] = useState<StudentResultRow[]>([])
	const [summary, setSummary] = useState({
		passed: 0,
		failed: 0,
		absent: 0,
		reappear: 0,
		withheld: 0,
		distinction: 0,
		first_class: 0
	})

	// UI state
	const [loading, setLoading] = useState(false)
	const [generating, setGenerating] = useState(false)
	const [saving, setSaving] = useState(false)
	const [isSaved, setIsSaved] = useState(false)
	const [searchTerm, setSearchTerm] = useState("")
	const [sortColumn, setSortColumn] = useState<string | null>(null)
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
	const [currentPage, setCurrentPage] = useState(1)
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
	const itemsPerPage = 15

	// Fetch institutions on mount
	useEffect(() => {
		fetchInstitutions()
	}, [])

	// Fetch sessions and programs when institution changes
	useEffect(() => {
		if (selectedInstitution) {
			fetchSessions(selectedInstitution)
			fetchPrograms(selectedInstitution)
		} else {
			setSessions([])
			setPrograms([])
		}
		setSelectedSession("")
		setSelectedProgram("")
		setSelectedCourses([])
		setResults([])
	}, [selectedInstitution])

	// Fetch course offerings when program and session change
	useEffect(() => {
		if (selectedProgram && selectedSession) {
			fetchCourseOfferings(selectedProgram, selectedSession)
		} else {
			setCourseOfferings([])
		}
		setSelectedCourses([])
		setResults([])
	}, [selectedProgram, selectedSession])

	// Update grade system code and regulation when program changes
	useEffect(() => {
		if (selectedProgram) {
			const program = programs.find(p => p.id === selectedProgram)
			if (program) {
				setGradeSystemCode(program.grade_system_code || 'UG')
				setRegulationId(program.regulation_id || '')
			}
		}
	}, [selectedProgram, programs])

	const fetchInstitutions = async () => {
		try {
			const res = await fetch('/api/grading/final-marks?action=institutions')
			if (res.ok) {
				const data = await res.json()
				setInstitutions(data.map((i: any) => ({
					id: i.id,
					institution_code: i.institution_code,
					name: i.name
				})))
			}
		} catch (e) {
			console.error('Failed to fetch institutions:', e)
		}
	}

	const fetchSessions = async (institutionId: string) => {
		try {
			const res = await fetch(`/api/grading/final-marks?action=sessions&institutionId=${institutionId}`)
			if (res.ok) {
				const data = await res.json()
				setSessions(data.map((s: any) => ({
					id: s.id,
					session_code: s.session_code,
					session_name: s.session_name,
					institutions_id: institutionId
				})))
			}
		} catch (e) {
			console.error('Failed to fetch sessions:', e)
		}
	}

	const fetchPrograms = async (institutionId: string) => {
		try {
			const res = await fetch(`/api/grading/final-marks?action=programs&institutionId=${institutionId}`)
			if (res.ok) {
				const data = await res.json()
				setPrograms(data)
			}
		} catch (e) {
			console.error('Failed to fetch programs:', e)
		}
	}

	const fetchCourseOfferings = async (programId: string, sessionId: string) => {
		try {
			setLoading(true)
			const res = await fetch(`/api/grading/final-marks?action=course-offerings&programId=${programId}&sessionId=${sessionId}`)
			if (res.ok) {
				const data = await res.json()
				setCourseOfferings(data)
			}
		} catch (e) {
			console.error('Failed to fetch course offerings:', e)
		} finally {
			setLoading(false)
		}
	}

	const handleCourseToggle = (courseId: string) => {
		setSelectedCourses(prev =>
			prev.includes(courseId)
				? prev.filter(id => id !== courseId)
				: [...prev, courseId]
		)
	}

	const handleSelectAllCourses = () => {
		if (selectedCourses.length === courseOfferings.length) {
			setSelectedCourses([])
		} else {
			setSelectedCourses(courseOfferings.map(co => co.course_id))
		}
	}

	const handleGenerate = async () => {
		if (!selectedInstitution || !selectedProgram || !selectedSession || selectedCourses.length === 0) {
			toast({
				title: '⚠️ Missing Selection',
				description: 'Please select all required fields and at least one course.',
				variant: 'destructive'
			})
			return
		}

		try {
			setGenerating(true)
			setResults([])

			const payload = {
				institutions_id: selectedInstitution,
				program_id: selectedProgram,
				examination_session_id: selectedSession,
				course_ids: selectedCourses,
				regulation_id: regulationId,
				grade_system_code: gradeSystemCode,
				save_to_db: false
			}

			const res = await fetch('/api/grading/final-marks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			})

			if (!res.ok) {
				const errorData = await res.json()
				throw new Error(errorData.error || 'Failed to generate final marks')
			}

			const data = await res.json()
			setResults(data.results || [])
			setSummary(data.summary || {
				passed: 0, failed: 0, absent: 0, reappear: 0, withheld: 0, distinction: 0, first_class: 0
			})
			setIsSaved(false)

			toast({
				title: '✅ Generation Complete',
				description: `Generated results for ${data.total_students} students across ${data.total_courses} course(s).`,
				className: 'bg-green-50 border-green-200 text-green-800'
			})

			// Move to next step
			setCurrentStep(2)
		} catch (e) {
			console.error('Generation error:', e)
			toast({
				title: '❌ Generation Failed',
				description: e instanceof Error ? e.message : 'Failed to generate final marks',
				variant: 'destructive'
			})
		} finally {
			setGenerating(false)
		}
	}

	const handleSaveToDatabase = async () => {
		if (results.length === 0) {
			toast({
				title: '⚠️ No Results',
				description: 'Please generate results first.',
				variant: 'destructive'
			})
			return
		}

		try {
			setSaving(true)

			const payload = {
				institutions_id: selectedInstitution,
				program_id: selectedProgram,
				examination_session_id: selectedSession,
				course_ids: selectedCourses,
				regulation_id: regulationId,
				grade_system_code: gradeSystemCode,
				save_to_db: true
			}

			const res = await fetch('/api/grading/final-marks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			})

			if (!res.ok) {
				const errorData = await res.json()
				throw new Error(errorData.error || 'Failed to save final marks')
			}

			const data = await res.json()
			setIsSaved(true)

			toast({
				title: '✅ Saved Successfully',
				description: `Saved ${data.saved_count} final marks records to the database.`,
				className: 'bg-green-50 border-green-200 text-green-800'
			})

			// Move to final step
			setCurrentStep(3)
		} catch (e) {
			console.error('Save error:', e)
			toast({
				title: '❌ Save Failed',
				description: e instanceof Error ? e.message : 'Failed to save final marks',
				variant: 'destructive'
			})
		} finally {
			setSaving(false)
			setConfirmDialogOpen(false)
		}
	}

	const handleExportExcel = () => {
		if (results.length === 0) {
			toast({
				title: '⚠️ No Data',
				description: 'No results to export.',
				variant: 'destructive'
			})
			return
		}

		const program = programs.find(p => p.id === selectedProgram)
		const session = sessions.find(s => s.id === selectedSession)

		const excelData = results.map(r => ({
			'Register No': r.register_no,
			'Student Name': r.student_name,
			'Course Code': r.course_code,
			'Course Name': r.course_name,
			'Internal Marks': r.internal_marks,
			'Internal Max': r.internal_max,
			'External Marks': r.external_marks,
			'External Max': r.external_max,
			'Total Marks': r.total_marks,
			'Total Max': r.total_max,
			'Percentage': r.percentage,
			'Grade': r.grade,
			'Grade Point': r.grade_point,
			'Credits': r.credits,
			'Credit Points': r.credit_points,
			'Result': r.pass_status
		}))

		const ws = XLSX.utils.json_to_sheet(excelData)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Final Marks')

		const fileName = `final_marks_${program?.program_code || 'program'}_${session?.session_code || 'session'}_${new Date().toISOString().split('T')[0]}.xlsx`
		XLSX.writeFile(wb, fileName)

		toast({
			title: '✅ Export Successful',
			description: `Exported ${results.length} records to Excel.`,
			className: 'bg-green-50 border-green-200 text-green-800'
		})
	}

	// Sorting and filtering
	const handleSort = (column: string) => {
		if (sortColumn === column) {
			setSortDirection(prev => prev === "asc" ? "desc" : "asc")
		} else {
			setSortColumn(column)
			setSortDirection("asc")
		}
	}

	const getSortIcon = (column: string) => {
		if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
		return sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
	}

	const filteredResults = useMemo(() => {
		let filtered = results.filter(r => {
			const searchLower = searchTerm.toLowerCase()
			return (
				r.register_no.toLowerCase().includes(searchLower) ||
				r.student_name.toLowerCase().includes(searchLower) ||
				r.course_code.toLowerCase().includes(searchLower)
			)
		})

		if (sortColumn) {
			filtered = [...filtered].sort((a, b) => {
				const aVal = (a as any)[sortColumn]
				const bVal = (b as any)[sortColumn]
				if (aVal === bVal) return 0
				const comparison = aVal > bVal ? 1 : -1
				return sortDirection === "asc" ? comparison : -comparison
			})
		}

		return filtered
	}, [results, searchTerm, sortColumn, sortDirection])

	const totalPages = Math.ceil(filteredResults.length / itemsPerPage) || 1
	const startIndex = (currentPage - 1) * itemsPerPage
	const pageResults = filteredResults.slice(startIndex, startIndex + itemsPerPage)

	useEffect(() => {
		setCurrentPage(1)
	}, [searchTerm, sortColumn, sortDirection])

	const canProceedStep1 = selectedInstitution && selectedProgram && selectedSession
	const canProceedStep2 = selectedCourses.length > 0

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
									<BreadcrumbPage>Generate Final Marks</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					{/* Page Header */}
					<div className="flex items-center gap-3 mb-2">
						<div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
							<Calculator className="h-5 w-5 text-white" />
						</div>
						<div>
							<h1 className="text-2xl font-bold">Generate Final Marks</h1>
							<p className="text-sm text-muted-foreground">Calculate and save student final grades</p>
						</div>
					</div>

					{/* Step Indicator */}
					<Card className="p-4">
						<StepIndicator currentStep={currentStep} steps={steps} />
					</Card>

					{/* Step 1: Select Program */}
					{currentStep === 0 && (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="h-8 w-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
										<GraduationCap className="h-4 w-4 text-white" />
									</div>
									<div>
										<CardTitle>Step 1: Select Program & Session</CardTitle>
										<CardDescription>Choose the institution, program, and examination session</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div className="space-y-2">
										<Label>Institution *</Label>
										<Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
											<SelectTrigger>
												<SelectValue placeholder="Select institution" />
											</SelectTrigger>
											<SelectContent>
												{institutions.map(inst => (
													<SelectItem key={inst.id} value={inst.id}>
														{inst.institution_code} - {inst.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>Examination Session *</Label>
										<Select value={selectedSession} onValueChange={setSelectedSession} disabled={!selectedInstitution}>
											<SelectTrigger>
												<SelectValue placeholder="Select session" />
											</SelectTrigger>
											<SelectContent>
												{sessions.map(s => (
													<SelectItem key={s.id} value={s.id}>
														{s.session_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>Program *</Label>
										<Select value={selectedProgram} onValueChange={setSelectedProgram} disabled={!selectedInstitution}>
											<SelectTrigger>
												<SelectValue placeholder="Select program" />
											</SelectTrigger>
											<SelectContent>
												{programs.map(p => (
													<SelectItem key={p.id} value={p.id}>
														{p.program_code} - {p.program_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>

								{selectedProgram && (
									<div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
										<Badge variant="outline">{gradeSystemCode} Grade System</Badge>
										{regulationId && <span className="text-sm text-muted-foreground">Regulation: {programs.find(p => p.id === selectedProgram)?.regulation_code}</span>}
									</div>
								)}

								<div className="flex justify-end pt-4">
									<Button onClick={() => setCurrentStep(1)} disabled={!canProceedStep1}>
										Next: Select Courses
										<ChevronRight className="h-4 w-4 ml-1" />
									</Button>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Step 2: Select Courses */}
					{currentStep === 1 && (
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
											<BookOpen className="h-4 w-4 text-white" />
										</div>
										<div>
											<CardTitle>Step 2: Select Courses</CardTitle>
											<CardDescription>Choose courses for final marks calculation</CardDescription>
										</div>
									</div>
									<Button variant="outline" size="sm" onClick={handleSelectAllCourses}>
										{selectedCourses.length === courseOfferings.length ? 'Deselect All' : 'Select All'}
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{loading ? (
									<div className="flex items-center justify-center py-8">
										<Loader2 className="h-6 w-6 animate-spin mr-2" />
										<span>Loading courses...</span>
									</div>
								) : courseOfferings.length === 0 ? (
									<div className="text-center py-8 text-muted-foreground">
										<BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
										<p>No course offerings found for the selected program and session.</p>
									</div>
								) : (
									<div className="space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
											{courseOfferings.map(co => (
												<div
													key={co.id}
													className={`p-3 border rounded-lg cursor-pointer transition-all ${
														selectedCourses.includes(co.course_id)
															? 'border-primary bg-primary/5'
															: 'border-border hover:border-primary/50'
													}`}
													onClick={() => handleCourseToggle(co.course_id)}
												>
													<div className="flex items-start gap-3">
														<Checkbox
															checked={selectedCourses.includes(co.course_id)}
															onCheckedChange={() => handleCourseToggle(co.course_id)}
														/>
														<div className="flex-1">
															<div className="font-medium text-sm">{co.course_code}</div>
															<div className="text-xs text-muted-foreground">{co.course_name}</div>
															<div className="flex items-center gap-2 mt-1">
																<Badge variant="secondary" className="text-xs">Sem {co.semester}</Badge>
																<Badge variant="outline" className="text-xs">{co.credits} Credits</Badge>
															</div>
														</div>
													</div>
												</div>
											))}
										</div>

										<div className="flex items-center justify-between pt-4 border-t">
											<div className="text-sm text-muted-foreground">
												{selectedCourses.length} of {courseOfferings.length} course(s) selected
											</div>
											<div className="flex gap-2">
												<Button variant="outline" onClick={() => setCurrentStep(0)}>
													<ChevronLeft className="h-4 w-4 mr-1" />
													Back
												</Button>
												<Button onClick={handleGenerate} disabled={!canProceedStep2 || generating}>
													{generating ? (
														<>
															<Loader2 className="h-4 w-4 mr-2 animate-spin" />
															Generating...
														</>
													) : (
														<>
															Generate Results
															<Calculator className="h-4 w-4 ml-1" />
														</>
													)}
												</Button>
											</div>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Step 3: Review Results */}
					{currentStep === 2 && (
						<>
							{/* Summary Cards */}
							<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Total</p>
												<p className="text-xl font-bold">{results.length}</p>
											</div>
											<Users className="h-5 w-5 text-blue-500" />
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Passed</p>
												<p className="text-xl font-bold text-green-600">{summary.passed}</p>
											</div>
											<CheckCircle2 className="h-5 w-5 text-green-500" />
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Failed</p>
												<p className="text-xl font-bold text-red-600">{summary.failed}</p>
											</div>
											<AlertTriangle className="h-5 w-5 text-red-500" />
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Absent</p>
												<p className="text-xl font-bold text-orange-600">{summary.absent}</p>
											</div>
											<Users className="h-5 w-5 text-orange-500" />
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Distinction</p>
												<p className="text-xl font-bold text-purple-600">{summary.distinction}</p>
											</div>
											<Award className="h-5 w-5 text-purple-500" />
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">First Class</p>
												<p className="text-xl font-bold text-indigo-600">{summary.first_class}</p>
											</div>
											<TrendingUp className="h-5 w-5 text-indigo-500" />
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="p-3">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Pass %</p>
												<p className="text-xl font-bold">{results.length > 0 ? Math.round((summary.passed / results.length) * 100) : 0}%</p>
											</div>
											<TrendingUp className="h-5 w-5 text-blue-500" />
										</div>
									</CardContent>
								</Card>
							</div>

							{/* Results Table */}
							<Card>
								<CardHeader className="p-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="h-8 w-8 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
												<FileSpreadsheet className="h-4 w-4 text-white" />
											</div>
											<div>
												<CardTitle className="text-lg">Step 3: Review Results</CardTitle>
												<CardDescription>Review and verify calculated results</CardDescription>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<div className="relative">
												<Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
												<Input
													value={searchTerm}
													onChange={(e) => setSearchTerm(e.target.value)}
													placeholder="Search..."
													className="pl-7 h-8 w-48 text-xs"
												/>
											</div>
											<Button variant="outline" size="sm" onClick={handleExportExcel} className="text-xs">
												<Download className="h-3 w-3 mr-1" />
												Excel
											</Button>
										</div>
									</div>
								</CardHeader>
								<CardContent className="p-3 pt-0">
									<div className="rounded-md border overflow-hidden" style={{ height: "400px" }}>
										<div className="h-full overflow-auto">
											<Table>
												<TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
													<TableRow>
														<TableHead className="w-[100px] text-[11px]">
															<Button variant="ghost" size="sm" onClick={() => handleSort("register_no")} className="h-auto p-0 font-medium hover:bg-transparent">
																Register No {getSortIcon("register_no")}
															</Button>
														</TableHead>
														<TableHead className="text-[11px]">
															<Button variant="ghost" size="sm" onClick={() => handleSort("student_name")} className="h-auto p-0 font-medium hover:bg-transparent">
																Name {getSortIcon("student_name")}
															</Button>
														</TableHead>
														<TableHead className="w-[80px] text-[11px]">Course</TableHead>
														<TableHead className="w-[60px] text-[11px] text-center">Int</TableHead>
														<TableHead className="w-[60px] text-[11px] text-center">Ext</TableHead>
														<TableHead className="w-[60px] text-[11px] text-center">Total</TableHead>
														<TableHead className="w-[50px] text-[11px] text-center">%</TableHead>
														<TableHead className="w-[50px] text-[11px] text-center">Grade</TableHead>
														<TableHead className="w-[40px] text-[11px] text-center">GP</TableHead>
														<TableHead className="w-[40px] text-[11px] text-center">Cr</TableHead>
														<TableHead className="w-[50px] text-[11px] text-center">CP</TableHead>
														<TableHead className="w-[70px] text-[11px] text-center">Result</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{pageResults.length === 0 ? (
														<TableRow>
															<TableCell colSpan={12} className="h-24 text-center text-[11px]">
																{searchTerm ? 'No matching results' : 'No results generated'}
															</TableCell>
														</TableRow>
													) : (
														pageResults.map((row, idx) => (
															<TableRow key={`${row.student_id}-${row.course_id}-${idx}`}>
																<TableCell className="text-[11px] font-medium">{row.register_no}</TableCell>
																<TableCell className="text-[11px]">{row.student_name}</TableCell>
																<TableCell className="text-[11px]">{row.course_code}</TableCell>
																<TableCell className="text-[11px] text-center">{row.internal_marks}/{row.internal_max}</TableCell>
																<TableCell className="text-[11px] text-center">{row.external_marks}/{row.external_max}</TableCell>
																<TableCell className="text-[11px] text-center font-medium">{row.total_marks}/{row.total_max}</TableCell>
																<TableCell className="text-[11px] text-center">{row.percentage.toFixed(1)}</TableCell>
																<TableCell className="text-[11px] text-center font-bold">{row.grade}</TableCell>
																<TableCell className="text-[11px] text-center">{row.grade_point}</TableCell>
																<TableCell className="text-[11px] text-center">{row.credits}</TableCell>
																<TableCell className="text-[11px] text-center">{row.credit_points.toFixed(1)}</TableCell>
																<TableCell className="text-center">
																	<Badge
																		variant={row.is_pass ? "default" : "destructive"}
																		className={`text-[10px] ${
																			row.pass_status === 'Pass' ? 'bg-green-600' :
																			row.pass_status === 'Absent' ? 'bg-orange-500' :
																			'bg-red-600'
																		}`}
																	>
																		{row.pass_status}
																	</Badge>
																</TableCell>
															</TableRow>
														))
													)}
												</TableBody>
											</Table>
										</div>
									</div>

									{/* Pagination */}
									<div className="flex items-center justify-between space-x-2 py-2 mt-2">
										<div className="text-xs text-muted-foreground">
											Showing {filteredResults.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredResults.length)} of {filteredResults.length}
										</div>
										<div className="flex items-center gap-2">
											<Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 px-2 text-xs">
												<ChevronLeft className="h-3 w-3 mr-1" /> Previous
											</Button>
											<div className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</div>
											<Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-7 px-2 text-xs">
												Next <ChevronRight className="h-3 w-3 ml-1" />
											</Button>
										</div>
									</div>

									{/* Actions */}
									<div className="flex items-center justify-between pt-4 border-t">
										<Button variant="outline" onClick={() => setCurrentStep(1)}>
											<ChevronLeft className="h-4 w-4 mr-1" />
											Back to Courses
										</Button>
										<div className="flex gap-2">
											<Button variant="outline" onClick={() => {
												setResults([])
												handleGenerate()
											}}>
												<RefreshCw className="h-4 w-4 mr-1" />
												Regenerate
											</Button>
											<Button onClick={() => setConfirmDialogOpen(true)} disabled={results.length === 0 || isSaved}>
												<Save className="h-4 w-4 mr-1" />
												{isSaved ? 'Saved' : 'Save to Database'}
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						</>
					)}

					{/* Step 4: Save & Export */}
					{currentStep === 3 && (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="h-8 w-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
										<CheckCircle2 className="h-4 w-4 text-white" />
									</div>
									<div>
										<CardTitle>Step 4: Complete</CardTitle>
										<CardDescription>Final marks have been saved successfully</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
									<CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
									<h3 className="text-xl font-bold text-green-700 dark:text-green-300 mb-2">
										Final Marks Saved Successfully!
									</h3>
									<p className="text-sm text-green-600 dark:text-green-400">
										{results.length} records have been saved to the database.
									</p>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Card className="p-4">
										<h4 className="font-semibold mb-3 flex items-center gap-2">
											<Download className="h-4 w-4" />
											Export Options
										</h4>
										<div className="space-y-2">
											<Button variant="outline" className="w-full justify-start" onClick={handleExportExcel}>
												<FileSpreadsheet className="h-4 w-4 mr-2" />
												Export to Excel
											</Button>
										</div>
									</Card>
									<Card className="p-4">
										<h4 className="font-semibold mb-3 flex items-center gap-2">
											<TrendingUp className="h-4 w-4" />
											Quick Actions
										</h4>
										<div className="space-y-2">
											<Button variant="outline" className="w-full justify-start" onClick={() => {
												setCurrentStep(0)
												setSelectedCourses([])
												setResults([])
												setIsSaved(false)
											}}>
												<RefreshCw className="h-4 w-4 mr-2" />
												Generate for Another Program
											</Button>
											<Button variant="outline" className="w-full justify-start" asChild>
												<Link href="/grading/grades">
													<Award className="h-4 w-4 mr-2" />
													View All Final Marks
												</Link>
											</Button>
										</div>
									</Card>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
				<AppFooter />
			</SidebarInset>

			{/* Confirmation Dialog */}
			<AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Save Final Marks to Database?</AlertDialogTitle>
						<AlertDialogDescription>
							This will save {results.length} final marks records to the database.
							Existing records for the same student-course-session combination will be updated.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleSaveToDatabase} disabled={saving}>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Save to Database
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</SidebarProvider>
	)
}
