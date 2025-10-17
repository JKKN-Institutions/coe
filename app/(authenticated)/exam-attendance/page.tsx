"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ClipboardCheck, Calendar, BookOpen, Clock, Users, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface Institution {
	id: string
	institution_code: string
	institution_name: string
}

interface ExaminationSession {
	id: string
	session_name: string
	session_code: string
	session_type: string
	start_date: string
	end_date: string
}

interface CourseOffering {
	course_offering_id: string
	course_code: string
	course_title: string
	course_id: string
}

interface ExamDate {
	id: string
	exam_date: string
	exam_time: string
	session: string
	duration_minutes: number
}

interface StudentRegistration {
	id: string
	stu_register_no: string
	student_name: string
	student_id: string
}

interface AttendanceRecord {
	exam_registration_id: string
	stu_register_no: string
	student_name: string
	is_present: boolean
	attendance_status: string
	remarks: string
}

export default function ExamAttendancePage() {
	const { toast } = useToast()

	// Dropdown data
	const [institutions, setInstitutions] = useState<Institution[]>([])
	const [sessions, setSessions] = useState<ExaminationSession[]>([])
	const [courses, setCourses] = useState<CourseOffering[]>([])
	const [examDates, setExamDates] = useState<ExamDate[]>([])
	const [sessionTypes, setSessionTypes] = useState<ExamDate[]>([])

	// Selected values
	const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")
	const [selectedSessionId, setSelectedSessionId] = useState<string>("")
	const [selectedCourseOfferingId, setSelectedCourseOfferingId] = useState<string>("")
	const [selectedExamDate, setSelectedExamDate] = useState<string>("")
	const [selectedSessionType, setSelectedSessionType] = useState<string>("")

	// Student list and attendance
	const [students, setStudents] = useState<StudentRegistration[]>([])
	const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])

	// UI state
	const [loading, setLoading] = useState(false)
	const [loadingStudents, setLoadingStudents] = useState(false)
	const [saving, setSaving] = useState(false)
	const [isViewMode, setIsViewMode] = useState(false)
	const [showStudentList, setShowStudentList] = useState(false)

	// Load institutions on mount
	useEffect(() => {
		fetchInstitutions()
	}, [])

	const fetchInstitutions = async () => {
		try {
			const res = await fetch('/api/exam-attendance/dropdowns?type=institutions')
			if (res.ok) {
				const data = await res.json()
				setInstitutions(data)
			}
		} catch (error) {
			console.error('Error fetching institutions:', error)
		}
	}

	// Cascade 1: Institution → Sessions
	useEffect(() => {
		if (selectedInstitutionId) {
			fetchSessions(selectedInstitutionId)
			// Reset dependent fields
			setSelectedSessionId("")
			setSelectedCourseOfferingId("")
			setSelectedExamDate("")
			setSelectedSessionType("")
			setSessions([])
			setCourses([])
			setExamDates([])
			setSessionTypes([])
			setStudents([])
			setAttendanceRecords([])
			setShowStudentList(false)
		}
	}, [selectedInstitutionId])

	const fetchSessions = async (institutionId: string) => {
		try {
			setLoading(true)
			const res = await fetch(`/api/exam-attendance/dropdowns?type=sessions&institution_id=${institutionId}`)
			if (res.ok) {
				const data = await res.json()
				setSessions(data)
			}
		} catch (error) {
			console.error('Error fetching sessions:', error)
		} finally {
			setLoading(false)
		}
	}

	// Cascade 2: Session → Courses
	useEffect(() => {
		if (selectedInstitutionId && selectedSessionId) {
			fetchCourses(selectedInstitutionId, selectedSessionId)
			// Reset dependent fields
			setSelectedCourseOfferingId("")
			setSelectedExamDate("")
			setSelectedSessionType("")
			setCourses([])
			setExamDates([])
			setSessionTypes([])
			setStudents([])
			setAttendanceRecords([])
			setShowStudentList(false)
		}
	}, [selectedSessionId])

	const fetchCourses = async (institutionId: string, sessionId: string) => {
		try {
			setLoading(true)
			const res = await fetch(`/api/exam-attendance/dropdowns?type=courses&institution_id=${institutionId}&session_id=${sessionId}`)
			if (res.ok) {
				const data = await res.json()
				setCourses(data)
			}
		} catch (error) {
			console.error('Error fetching courses:', error)
		} finally {
			setLoading(false)
		}
	}

	// Cascade 3: Course → Exam Dates (current date only)
	useEffect(() => {
		if (selectedInstitutionId && selectedSessionId && selectedCourseOfferingId) {
			fetchExamDates(selectedInstitutionId, selectedSessionId, selectedCourseOfferingId)
			// Reset dependent fields
			setSelectedExamDate("")
			setSelectedSessionType("")
			setExamDates([])
			setSessionTypes([])
			setStudents([])
			setAttendanceRecords([])
			setShowStudentList(false)
		}
	}, [selectedCourseOfferingId])

	const fetchExamDates = async (institutionId: string, sessionId: string, courseOfferingId: string) => {
		try {
			setLoading(true)
			const res = await fetch(`/api/exam-attendance/dropdowns?type=exam_dates&institution_id=${institutionId}&session_id=${sessionId}&course_offering_id=${courseOfferingId}`)
			if (res.ok) {
				const data = await res.json()
				setExamDates(data)
				if (data.length === 0) {
					toast({
						title: "ℹ️ No Exams Today",
						description: "No exam is scheduled for today for this course.",
						className: "bg-blue-50 border-blue-200 text-blue-800",
					})
				}
			}
		} catch (error) {
			console.error('Error fetching exam dates:', error)
		} finally {
			setLoading(false)
		}
	}

	// Cascade 4: Exam Date → Session Types (FN/AN)
	useEffect(() => {
		if (selectedInstitutionId && selectedSessionId && selectedCourseOfferingId && selectedExamDate) {
			fetchSessionTypes(selectedInstitutionId, selectedSessionId, selectedCourseOfferingId, selectedExamDate)
			// Reset dependent fields
			setSelectedSessionType("")
			setSessionTypes([])
			setStudents([])
			setAttendanceRecords([])
			setShowStudentList(false)
		}
	}, [selectedExamDate])

	const fetchSessionTypes = async (institutionId: string, sessionId: string, courseOfferingId: string, examDate: string) => {
		try {
			setLoading(true)
			const res = await fetch(`/api/exam-attendance/dropdowns?type=session_types&institution_id=${institutionId}&session_id=${sessionId}&course_offering_id=${courseOfferingId}&exam_date=${examDate}`)
			if (res.ok) {
				const data = await res.json()
				setSessionTypes(data)
			}
		} catch (error) {
			console.error('Error fetching session types:', error)
		} finally {
			setLoading(false)
		}
	}

	// Load student list after all parent selections are complete
	const handleLoadStudents = async () => {
		if (!selectedInstitutionId || !selectedSessionId || !selectedCourseOfferingId || !selectedExamDate || !selectedSessionType) {
			toast({
				title: "⚠️ Incomplete Selection",
				description: "Please select all required fields before loading students.",
				variant: "destructive",
			})
			return
		}

		try {
			setLoadingStudents(true)

			// First, check if attendance already exists
			const checkRes = await fetch(
				`/api/exam-attendance?mode=check&institution_id=${selectedInstitutionId}&examination_session_id=${selectedSessionId}&course_offering_id=${selectedCourseOfferingId}&exam_date=${selectedExamDate}`
			)

			if (checkRes.ok) {
				const checkData = await checkRes.json()

				if (checkData.exists && checkData.data.length > 0) {
					// Attendance already exists - load in view mode
					setIsViewMode(true)

					// Map existing attendance to display format
					const existingRecords: AttendanceRecord[] = checkData.data.map((att: any) => ({
						exam_registration_id: att.exam_registrations.id,
						stu_register_no: att.exam_registrations.stu_register_no,
						student_name: att.exam_registrations.student_name,
						is_present: att.attendance_status === 'Present',
						attendance_status: att.attendance_status,
						remarks: att.remarks || ''
					}))

					setAttendanceRecords(existingRecords)
					setShowStudentList(true)

					toast({
						title: "ℹ️ Attendance Already Recorded",
						description: "Attendance has already been recorded for this exam. Viewing in read-only mode.",
						className: "bg-blue-50 border-blue-200 text-blue-800",
					})

					return
				}
			}

			// Load fresh student list for new attendance
			setIsViewMode(false)
			const res = await fetch(
				`/api/exam-attendance?mode=list&institution_id=${selectedInstitutionId}&examination_session_id=${selectedSessionId}&course_offering_id=${selectedCourseOfferingId}`
			)

			if (!res.ok) {
				throw new Error('Failed to load student list')
			}

			const studentData = await res.json()

			if (studentData.length === 0) {
				toast({
					title: "ℹ️ No Students Found",
					description: "No registered students found for this exam.",
					className: "bg-yellow-50 border-yellow-200 text-yellow-800",
				})
				setShowStudentList(false)
				return
			}

			setStudents(studentData)

			// Initialize attendance records
			const initialRecords: AttendanceRecord[] = studentData.map((student: StudentRegistration) => ({
				exam_registration_id: student.id,
				stu_register_no: student.stu_register_no,
				student_name: student.student_name,
				is_present: false,
				attendance_status: 'Absent',
				remarks: ''
			}))

			setAttendanceRecords(initialRecords)
			setShowStudentList(true)

			toast({
				title: "✅ Students Loaded",
				description: `${studentData.length} student${studentData.length > 1 ? 's' : ''} loaded. Mark attendance below.`,
				className: "bg-green-50 border-green-200 text-green-800",
			})
		} catch (error) {
			console.error('Error loading students:', error)
			toast({
				title: "❌ Error",
				description: "Failed to load student list. Please try again.",
				variant: "destructive",
			})
		} finally {
			setLoadingStudents(false)
		}
	}

	// Toggle individual student attendance
	const handleToggleAttendance = (index: number) => {
		if (isViewMode) return

		const updated = [...attendanceRecords]
		updated[index].is_present = !updated[index].is_present
		updated[index].attendance_status = updated[index].is_present ? 'Present' : 'Absent'
		setAttendanceRecords(updated)
	}

	// Select all as present
	const handleSelectAllPresent = () => {
		if (isViewMode) return

		const updated = attendanceRecords.map(record => ({
			...record,
			is_present: true,
			attendance_status: 'Present'
		}))
		setAttendanceRecords(updated)

		toast({
			title: "✅ All Marked Present",
			description: "All students have been marked as present.",
			className: "bg-green-50 border-green-200 text-green-800",
		})
	}

	// Update remarks
	const handleRemarksChange = (index: number, remarks: string) => {
		if (isViewMode) return

		const updated = [...attendanceRecords]
		updated[index].remarks = remarks
		setAttendanceRecords(updated)
	}

	// Save attendance
	const handleSaveAttendance = async () => {
		if (isViewMode) {
			toast({
				title: "⚠️ Read-Only Mode",
				description: "Attendance has already been recorded and cannot be modified.",
				variant: "destructive",
			})
			return
		}

		try {
			setSaving(true)

			const payload = {
				institutions_id: selectedInstitutionId,
				examination_session_id: selectedSessionId,
				course_offering_id: selectedCourseOfferingId,
				exam_date: selectedExamDate,
				attendance_records: attendanceRecords,
				verified_by: null // Replace with logged-in user ID if available
			}

			const res = await fetch('/api/exam-attendance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			})

			if (!res.ok) {
				const errorData = await res.json()
				throw new Error(errorData.error || 'Failed to save attendance')
			}

			const result = await res.json()

			toast({
				title: "✅ Attendance Recorded",
				description: result.message || "Attendance successfully saved.",
				className: "bg-green-50 border-green-200 text-green-800",
				duration: 5000,
			})

			setIsViewMode(true)
		} catch (error) {
			console.error('Error saving attendance:', error)
			const errorMessage = error instanceof Error ? error.message : 'Failed to save attendance'
			toast({
				title: "❌ Save Failed",
				description: errorMessage,
				variant: "destructive",
			})
		} finally {
			setSaving(false)
		}
	}

	// Get display values for header
	const selectedInstitution = institutions.find(i => i.id === selectedInstitutionId)
	const selectedSession = sessions.find(s => s.id === selectedSessionId)
	const selectedCourse = courses.find(c => c.course_offering_id === selectedCourseOfferingId)
	const selectedExamDateObj = examDates.find(d => d.id === selectedSessionType)

	// Count present/absent
	const presentCount = attendanceRecords.filter(r => r.is_present).length
	const absentCount = attendanceRecords.filter(r => !r.is_present).length

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<AppHeader>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="/">Home</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>Exam Attendance</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</AppHeader>

				<div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
					{/* Page Header */}
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-xl font-bold tracking-tight">Exam Attendance Entry</h1>
							<p className="text-[11px] text-muted-foreground mt-1">Mark attendance for today's examinations</p>
						</div>
						<ClipboardCheck className="h-7 w-7 text-primary" />
					</div>

					{/* Parent Form - Cascading Dropdowns */}
					<Card>
						<CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b p-3">
							<div className="flex items-center gap-3">
								<div className="h-7 w-7 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
									<Calendar className="h-3 w-3 text-white" />
								</div>
								<div>
									<h2 className="text-sm font-bold">Exam Selection</h2>
									<p className="text-[11px] text-muted-foreground">Select exam details to load student list</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-4 p-3">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{/* Institution */}
								<div className="space-y-2">
									<Label htmlFor="institution" className="text-xs font-semibold">
										Institution <span className="text-red-500">*</span>
									</Label>
									<Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId} disabled={loading}>
										<SelectTrigger id="institution" className="h-8 text-xs">
											<SelectValue placeholder="Select institution" />
										</SelectTrigger>
										<SelectContent>
											{institutions.map((inst) => (
												<SelectItem key={inst.id} value={inst.id}>
													{inst.institution_code} - {inst.institution_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Examination Session */}
								<div className="space-y-2">
									<Label htmlFor="session" className="text-xs font-semibold">
										Examination Session <span className="text-red-500">*</span>
									</Label>
									<Select
										value={selectedSessionId}
										onValueChange={setSelectedSessionId}
										disabled={!selectedInstitutionId || loading || sessions.length === 0}
									>
										<SelectTrigger id="session" className="h-8 text-xs">
											<SelectValue placeholder="Select session" />
										</SelectTrigger>
										<SelectContent>
											{sessions.map((session) => (
												<SelectItem key={session.id} value={session.id}>
													{session.session_name} ({session.session_type})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Course */}
								<div className="space-y-2">
									<Label htmlFor="course" className="text-xs font-semibold">
										Course Code <span className="text-red-500">*</span>
									</Label>
									<Select
										value={selectedCourseOfferingId}
										onValueChange={setSelectedCourseOfferingId}
										disabled={!selectedSessionId || loading || courses.length === 0}
									>
										<SelectTrigger id="course" className="h-8 text-xs">
											<SelectValue placeholder="Select course" />
										</SelectTrigger>
										<SelectContent>
											{courses.map((course) => (
												<SelectItem key={course.course_offering_id} value={course.course_offering_id}>
													{course.course_code} - {course.course_title}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Exam Date */}
								<div className="space-y-2">
									<Label htmlFor="exam_date" className="text-xs font-semibold">
										Exam Date (Today) <span className="text-red-500">*</span>
									</Label>
									<Select
										value={selectedExamDate}
										onValueChange={setSelectedExamDate}
										disabled={!selectedCourseOfferingId || loading || examDates.length === 0}
									>
										<SelectTrigger id="exam_date" className="h-8 text-xs">
											<SelectValue placeholder="Select exam date" />
										</SelectTrigger>
										<SelectContent>
											{examDates.map((date) => (
												<SelectItem key={date.id} value={date.exam_date}>
													{new Date(date.exam_date).toLocaleDateString('en-IN', {
														day: '2-digit',
														month: 'short',
														year: 'numeric'
													})} - {date.exam_time}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Session Type */}
								<div className="space-y-2">
									<Label htmlFor="session_type" className="text-xs font-semibold">
										Session (FN/AN) <span className="text-red-500">*</span>
									</Label>
									<Select
										value={selectedSessionType}
										onValueChange={setSelectedSessionType}
										disabled={!selectedExamDate || loading || sessionTypes.length === 0}
									>
										<SelectTrigger id="session_type" className="h-8 text-xs">
											<SelectValue placeholder="Select session" />
										</SelectTrigger>
										<SelectContent>
											{sessionTypes.map((st) => (
												<SelectItem key={st.id} value={st.id}>
													{st.session} - {st.exam_time}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Load Button */}
								<div className="flex items-end">
									<Button
										onClick={handleLoadStudents}
										disabled={
											!selectedInstitutionId ||
											!selectedSessionId ||
											!selectedCourseOfferingId ||
											!selectedExamDate ||
											!selectedSessionType ||
											loadingStudents
										}
										className="w-full h-8 text-xs"
										size="sm"
									>
										{loadingStudents ? (
											<>
												<Loader2 className="h-3 w-3 mr-1 animate-spin" />
												Loading...
											</>
										) : (
											<>
												<Users className="h-3 w-3 mr-1" />
												Load Students
											</>
										)}
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Summary Header (visible when students are loaded) */}
					{showStudentList && (
						<Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
							<CardContent className="pt-4 p-3">
								<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
									<div>
										<p className="text-[11px] font-medium text-muted-foreground">Institution</p>
										<p className="text-xs font-semibold">{selectedInstitution?.institution_code}</p>
									</div>
									<div>
										<p className="text-[11px] font-medium text-muted-foreground">Session</p>
										<p className="text-xs font-semibold">{selectedSession?.session_name}</p>
									</div>
									<div>
										<p className="text-[11px] font-medium text-muted-foreground">Course</p>
										<p className="text-xs font-semibold">{selectedCourse?.course_code}</p>
									</div>
									<div>
										<p className="text-[11px] font-medium text-muted-foreground">Exam Date</p>
										<p className="text-xs font-semibold">
											{selectedExamDate ? new Date(selectedExamDate).toLocaleDateString('en-IN') : '-'}
										</p>
									</div>
									<div>
										<p className="text-[11px] font-medium text-muted-foreground">Session</p>
										<p className="text-xs font-semibold">{selectedExamDateObj?.session || '-'}</p>
									</div>
									<div>
										<p className="text-[11px] font-medium text-muted-foreground">Total Students</p>
										<p className="text-xs font-semibold">{attendanceRecords.length}</p>
									</div>
								</div>

								{isViewMode && (
									<div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
										<div className="flex items-center gap-2">
											<AlertTriangle className="h-3 w-3 text-blue-600 dark:text-blue-400" />
											<span className="text-xs font-medium text-blue-800 dark:text-blue-200">
												Read-Only Mode: Attendance has already been recorded for this exam
											</span>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Attendance Statistics */}
					{showStudentList && (
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<Card>
								<CardContent className="p-3">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-[11px] font-medium text-muted-foreground">Total Students</p>
											<p className="text-xl font-bold">{attendanceRecords.length}</p>
										</div>
										<div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
											<Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="p-3">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-[11px] font-medium text-muted-foreground">Present</p>
											<p className="text-xl font-bold text-green-600">{presentCount}</p>
										</div>
										<div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
											<CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="p-3">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-[11px] font-medium text-muted-foreground">Absent</p>
											<p className="text-xl font-bold text-red-600">{absentCount}</p>
										</div>
										<div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
											<XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Attendance Marking Grid */}
					{showStudentList && (
						<Card>
							<CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b p-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="h-7 w-7 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
											<ClipboardCheck className="h-3 w-3 text-white" />
										</div>
										<div>
											<h2 className="text-sm font-bold">Mark Attendance</h2>
											<p className="text-[11px] text-muted-foreground">
												{isViewMode ? 'Viewing recorded attendance' : 'Check the box to mark student as present'}
											</p>
										</div>
									</div>
									{!isViewMode && (
										<Button onClick={handleSelectAllPresent} variant="outline" size="sm" className="h-7 px-2 text-xs">
											<CheckCircle className="h-3 w-3 mr-1" />
											Mark All Present
										</Button>
									)}
								</div>
							</CardHeader>
							<CardContent className="pt-4 p-3">
								<div className="border rounded-lg overflow-hidden">
									<div className="max-h-[440px] overflow-y-auto">
										<Table>
											<TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-900/50 z-10">
												<TableRow>
													<TableHead className="w-12 text-[11px]">S.No</TableHead>
													<TableHead className="text-[11px]">Register Number</TableHead>
													<TableHead className="text-[11px]">Student Name</TableHead>
													<TableHead className="w-24 text-[11px] text-center">Present/Absent</TableHead>
													<TableHead className="w-24 text-[11px] text-center">Attendance</TableHead>
													<TableHead className="text-[11px]">Remarks</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{attendanceRecords.map((record, index) => (
													<TableRow key={record.exam_registration_id}>
														<TableCell className="text-[11px] font-medium">{index + 1}</TableCell>
														<TableCell className="text-[11px] font-mono">{record.stu_register_no}</TableCell>
														<TableCell className="text-[11px]">{record.student_name}</TableCell>
														<TableCell className="text-center">
															<div className="flex justify-center">
																<Checkbox
																	checked={record.is_present}
																	onCheckedChange={() => handleToggleAttendance(index)}
																	disabled={isViewMode}
																/>
															</div>
														</TableCell>
														<TableCell className="text-center">
															<Badge
																variant={record.is_present ? "default" : "destructive"}
																className={`text-[11px] ${
																	record.is_present
																		? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200"
																		: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
																}`}
															>
																{record.attendance_status}
															</Badge>
														</TableCell>
														<TableCell>
															<Input
																value={record.remarks}
																onChange={(e) => handleRemarksChange(index, e.target.value)}
																placeholder="Optional remarks"
																disabled={isViewMode}
																className="h-7 text-xs"
															/>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</div>

								{!isViewMode && (
									<div className="flex justify-end gap-2 mt-4 pt-4 border-t">
										<Button onClick={handleSaveAttendance} disabled={saving} size="sm" className="h-8 px-3 text-xs">
											{saving ? (
												<>
													<Loader2 className="h-3 w-3 mr-1 animate-spin" />
													Saving...
												</>
											) : (
												<>
													<CheckCircle className="h-3 w-3 mr-1" />
													Save Attendance
												</>
											)}
										</Button>
									</div>
								)}
							</CardContent>
						</Card>
					)}
				</div>

				<AppFooter />
			</SidebarInset>
		</SidebarProvider>
	)
}
