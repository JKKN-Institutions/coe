"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, Edit, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"

interface AttendanceRecord {
	id: string
	stu_register_no: string
	student_name: string
	program_code: string
	program_name: string
	course_code: string
	course_name: string
	exam_date: string
	session: string
	attendance_status: string
	is_present: boolean
	remarks: string
	original_status: string // Track original status for change detection
}

export default function AttendanceCorrectionPage() {
	const { toast } = useToast()

	// Search state
	const [registerNo, setRegisterNo] = useState<string>("")
	const [searching, setSearching] = useState(false)

	// Course filter
	const [selectedCourse, setSelectedCourse] = useState<string>("all")
	const [availableCourses, setAvailableCourses] = useState<{ code: string; name: string }[]>([])

	// Attendance records
	const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
	const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]) // Keep original records
	const [showRecords, setShowRecords] = useState(false)

	// UI state
	const [saving, setSaving] = useState(false)
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)

	// Student info
	const [studentInfo, setStudentInfo] = useState<{
		register_no: string
		name: string
	} | null>(null)

	// Search for student attendance records
	const handleSearch = async () => {
		if (!registerNo.trim()) {
			toast({
				title: "⚠️ Input Required",
				description: "Please enter a student register number.",
				variant: "destructive",
				className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
			})
			return
		}

		try {
			setSearching(true)
			const res = await fetch(`/api/attendance-correction?register_no=${encodeURIComponent(registerNo.trim())}`)

			if (!res.ok) {
				const errorData = await res.json()
				throw new Error(errorData.error || 'Failed to fetch attendance records')
			}

			const data = await res.json()

			if (data.records.length === 0) {
				toast({
					title: "ℹ️ No Records Found",
					description: `No attendance records found for register number: ${registerNo}`,
					className: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200",
				})
				setShowRecords(false)
				setAttendanceRecords([])
				setStudentInfo(null)
				return
			}

			// Map records and add original_status for tracking changes
			const mappedRecords: AttendanceRecord[] = data.records.map((record: any) => ({
				id: record.id,
				stu_register_no: record.stu_register_no,
				student_name: record.student_name,
				program_code: record.program_code,
				program_name: record.program_name,
				course_code: record.course_code,
				course_name: record.course_name,
				exam_date: record.exam_date,
				session: record.session,
				attendance_status: record.attendance_status,
				is_present: record.attendance_status === 'Present',
				remarks: record.remarks || '',
				original_status: record.attendance_status // Store original for comparison
			}))

			// Extract unique courses for filter
			const uniqueCourses = Array.from(
				new Map(
					mappedRecords.map(r => [r.course_code, { code: r.course_code, name: r.course_name }])
				).values()
			)

			setAllRecords(mappedRecords)
			setAttendanceRecords(mappedRecords)
			setAvailableCourses(uniqueCourses)
			setSelectedCourse("all")
			setStudentInfo({
				register_no: data.student.register_no,
				name: data.student.name
			})
			setShowRecords(true)

			toast({
				title: "✅ Records Loaded",
				description: `Found ${mappedRecords.length} attendance record${mappedRecords.length > 1 ? 's' : ''} for ${data.student.name}`,
				className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
			})
		} catch (error) {
			console.error('Error searching attendance:', error)
			const errorMessage = error instanceof Error ? error.message : 'Failed to search attendance records'
			toast({
				title: "❌ Search Failed",
				description: errorMessage,
				variant: "destructive",
				className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
			})
		} finally {
			setSearching(false)
		}
	}

	// Handle attendance status change
	const handleAttendanceChange = (index: number, newStatus: string) => {
		const record = attendanceRecords[index]

		// Update in allRecords
		const updatedAll = allRecords.map(r =>
			r.id === record.id
				? { ...r, attendance_status: newStatus, is_present: newStatus === 'Present' }
				: r
		)
		setAllRecords(updatedAll)

		// Update in filtered records
		const updatedFiltered = [...attendanceRecords]
		updatedFiltered[index].attendance_status = newStatus
		updatedFiltered[index].is_present = newStatus === 'Present'
		setAttendanceRecords(updatedFiltered)
	}

	// Handle remarks change
	const handleRemarksChange = (index: number, remarks: string) => {
		const record = attendanceRecords[index]

		// Update in allRecords
		const updatedAll = allRecords.map(r =>
			r.id === record.id ? { ...r, remarks } : r
		)
		setAllRecords(updatedAll)

		// Update in filtered records
		const updatedFiltered = [...attendanceRecords]
		updatedFiltered[index].remarks = remarks
		setAttendanceRecords(updatedFiltered)
	}

	// Handle course filter change
	const handleCourseFilter = (courseCode: string) => {
		setSelectedCourse(courseCode)
		if (courseCode === "all") {
			setAttendanceRecords(allRecords)
		} else {
			const filtered = allRecords.filter(record => record.course_code === courseCode)
			setAttendanceRecords(filtered)
		}
	}

	// Check if any changes were made (check all records, not just filtered)
	const hasChanges = () => {
		return allRecords.some(record =>
			record.attendance_status !== record.original_status ||
			record.remarks !== (record.remarks || '')
		)
	}

	// Show confirmation dialog
	const handleSubmit = () => {
		if (!hasChanges()) {
			toast({
				title: "ℹ️ No Changes",
				description: "No attendance changes detected. Please modify at least one record before submitting.",
				className: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200",
			})
			return
		}

		setShowConfirmDialog(true)
	}

	// Confirm and save changes
	const confirmUpdate = async () => {
		setShowConfirmDialog(false)

		try {
			setSaving(true)

			// Only send records that have changed (from all records, not just filtered)
			const changedRecords = allRecords.filter(record =>
				record.attendance_status !== record.original_status ||
				record.remarks !== (record.remarks || '')
			).map(record => ({
				id: record.id,
				attendance_status: record.attendance_status,
				status: record.attendance_status === 'Absent',
				remarks: record.remarks
			}))

			const res = await fetch('/api/attendance-correction', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					records: changedRecords
				})
			})

			if (!res.ok) {
				const errorData = await res.json()
				throw new Error(errorData.error || 'Failed to update attendance')
			}

			const result = await res.json()

			toast({
				title: "✅ Attendance Updated",
				description: `Successfully updated ${changedRecords.length} attendance record${changedRecords.length > 1 ? 's' : ''}`,
				className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
				duration: 5000,
			})

			// Update original_status to reflect saved state for all records
			const updatedAll = allRecords.map(record => ({
				...record,
				original_status: record.attendance_status
			}))
			setAllRecords(updatedAll)

			// Update filtered records as well
			if (selectedCourse === "all") {
				setAttendanceRecords(updatedAll)
			} else {
				const filtered = updatedAll.filter(record => record.course_code === selectedCourse)
				setAttendanceRecords(filtered)
			}

		} catch (error) {
			console.error('Error updating attendance:', error)
			const errorMessage = error instanceof Error ? error.message : 'Failed to update attendance'
			toast({
				title: "❌ Update Failed",
				description: errorMessage,
				variant: "destructive",
				className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
			})
		} finally {
			setSaving(false)
		}
	}

	// Cancel and reset
	const handleCancel = () => {
		setRegisterNo("")
		setAttendanceRecords([])
		setAllRecords([])
		setAvailableCourses([])
		setSelectedCourse("all")
		setShowRecords(false)
		setStudentInfo(null)
	}

	// Count changes (from all records, not just filtered)
	const changesCount = allRecords.filter(record =>
		record.attendance_status !== record.original_status
	).length

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex flex-col min-h-screen">
				<AppHeader />

				<div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
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
									<BreadcrumbPage>Attendance Correction</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					<div className="space-y-6">
						{/* Page Header */}
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-x font-bold tracking-tight">Attendance Correction</h1>
								<p className="text-[11px] text-muted-foreground mt-1">Search and correct student attendance records</p>
							</div>
							<Edit className="h-6 w-6 text-primary" />
						</div>

						{/* Search Section */}
						<Card>
							<CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b p-3">
								<div className="flex items-center gap-3">
									<div className="h-7 w-7 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
										<Search className="h-3 w-3 text-white" />
									</div>
									<div>
										<h2 className="text-sm font-bold">Search Student</h2>
										<p className="text-[11px] text-muted-foreground">Enter student register number to view attendance records</p>
									</div>
								</div>
							</CardHeader>
							<CardContent className="pt-4 p-3">
								<div className="flex gap-3">
									<div className="flex-1 space-y-2">
										<Label htmlFor="register_no" className="text-xs font-semibold">
											Student Register Number <span className="text-red-500">*</span>
										</Label>
										<Input
											id="register_no"
											value={registerNo}
											onChange={(e) => setRegisterNo(e.target.value.toUpperCase())}
											placeholder="Enter register number (e.g., 23CS101)"
											className="h-8 text-xs uppercase"
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													handleSearch()
												}
											}}
										/>
									</div>
									<div className="flex items-end">
										<Button
											onClick={handleSearch}
											disabled={searching}
											size="sm"
											className="h-8 px-3 text-xs"
										>
											{searching ? (
												<>
													<Loader2 className="h-3 w-3 mr-1 animate-spin" />
													Searching...
												</>
											) : (
												<>
													<Search className="h-3 w-3 mr-1" />
													Search
												</>
											)}
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Student Info & Attendance Records */}
						{showRecords && studentInfo && (
							<>
								{/* Student Information Card */}
								<Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
									<CardContent className="pt-4 p-3">
										<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
											<div>
												<p className="text-[11px] font-medium text-muted-foreground">Register Number</p>
												<p className="text-xs font-semibold">{studentInfo.register_no}</p>
											</div>
											<div>
												<p className="text-[11px] font-medium text-muted-foreground">Student Name</p>
												<p className="text-xs font-semibold">{studentInfo.name}</p>
											</div>
											<div>
												<p className="text-[11px] font-medium text-muted-foreground">Total Records</p>
												<p className="text-xs font-semibold">
													{selectedCourse === "all" ? allRecords.length : `${attendanceRecords.length} of ${allRecords.length}`}
												</p>
											</div>
										</div>

										{changesCount > 0 && (
											<div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
												<div className="flex items-center gap-2">
													<AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
													<span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
														{changesCount} change{changesCount > 1 ? 's' : ''} pending submission
													</span>
												</div>
											</div>
										)}
									</CardContent>
								</Card>

								{/* Course Filter */}
								{availableCourses.length > 1 && (
									<Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
										<CardContent className="pt-4 p-3">
											<div className="flex items-center gap-3">
												<Label htmlFor="course_filter" className="text-xs font-semibold whitespace-nowrap">
													Filter by Course:
												</Label>
												<Select value={selectedCourse} onValueChange={handleCourseFilter}>
													<SelectTrigger id="course_filter" className="h-8 text-xs max-w-md">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="all">All Courses ({allRecords.length} records)</SelectItem>
														{availableCourses.map((course) => {
															const count = allRecords.filter(r => r.course_code === course.code).length
															return (
																<SelectItem key={course.code} value={course.code}>
																	{course.code} - {course.name} ({count} record{count > 1 ? 's' : ''})
																</SelectItem>
															)
														})}
													</SelectContent>
												</Select>
											</div>
										</CardContent>
									</Card>
								)}

								{/* Attendance Records Table */}
								<Card>
									<CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-b p-3">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="h-7 w-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
													<Edit className="h-3 w-3 text-white" />
												</div>
												<div>
													<h2 className="text-sm font-bold">Attendance Records</h2>
													<p className="text-[11px] text-muted-foreground">Modify attendance status and add remarks</p>
												</div>
											</div>
										</div>
									</CardHeader>
									<CardContent className="pt-4 p-3">
										<div className="border rounded-lg overflow-hidden">
											<div className="max-h-[500px] overflow-y-auto">
												<Table>
													<TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-900/50 z-10">
														<TableRow>
															<TableHead className="w-12 text-[11px]">S.No</TableHead>
															<TableHead className="text-[11px]">Register No</TableHead>
															<TableHead className="text-[11px]">Program</TableHead>
															<TableHead className="text-[11px]">Course</TableHead>
															<TableHead className="text-[11px]">Exam Date</TableHead>
															<TableHead className="text-[11px]">Session</TableHead>
															<TableHead className="text-[11px] w-32">Attendance</TableHead>
															<TableHead className="text-[11px]">Remarks</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{attendanceRecords.map((record, index) => {
															const hasChanged = record.attendance_status !== record.original_status
															return (
																<TableRow key={record.id} className={hasChanged ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
																	<TableCell className="text-[14px] font-medium">{index + 1}</TableCell>
																	<TableCell className="text-[14px] font-mono">{record.stu_register_no}</TableCell>
																	<TableCell className="text-[14px]">
																		<div className="flex flex-col">
																			<span className="font-medium">{record.program_code}</span>
																			<span className="text-[11px] text-muted-foreground">{record.program_name}</span>
																		</div>
																	</TableCell>
																	<TableCell className="text-[14px]">
																		<div className="flex flex-col">
																			<span className="font-medium">{record.course_code}</span>
																			<span className="text-[11px] text-muted-foreground">{record.course_name}</span>
																		</div>
																	</TableCell>
																	<TableCell className="text-[14px]">
																		{new Date(record.exam_date).toLocaleDateString('en-IN', {
																			day: '2-digit',
																			month: 'short',
																			year: 'numeric'
																		})}
																	</TableCell>
																	<TableCell className="text-[14px]">
																		<Badge variant="outline" className="text-[11px]">
																			{record.session}
																		</Badge>
																	</TableCell>
																	<TableCell>
																		<div className="flex items-center gap-2">
																			<Select
																				value={record.attendance_status}
																				onValueChange={(value) => handleAttendanceChange(index, value)}
																			>
																				<SelectTrigger className="h-7 text-xs w-24">
																					<SelectValue />
																				</SelectTrigger>
																				<SelectContent>
																					<SelectItem value="Present">Present</SelectItem>
																					<SelectItem value="Absent">Absent</SelectItem>
																				</SelectContent>
																			</Select>
																			{hasChanged && (
																				<Badge variant="outline" className="text-[10px] bg-yellow-100 text-yellow-800 border-yellow-300">
																					Changed
																				</Badge>
																			)}
																		</div>
																	</TableCell>
																	<TableCell>
																		<Input
																			value={record.remarks}
																			onChange={(e) => handleRemarksChange(index, e.target.value)}
																			placeholder="Optional remarks"
																			className="h-7 text-xs"
																		/>
																	</TableCell>
																</TableRow>
															)
														})}
													</TableBody>
												</Table>
											</div>
										</div>

										{/* Action Buttons */}
										<div className="flex justify-end gap-2 mt-4 pt-4 border-t">
											<Button
												onClick={handleCancel}
												variant="outline"
												size="sm"
												className="h-8 px-3 text-xs"
											>
												Cancel
											</Button>
											<Button
												onClick={handleSubmit}
												disabled={saving || !hasChanges()}
												size="sm"
												className="h-8 px-3 text-xs"
											>
												{saving ? (
													<>
														<Loader2 className="h-3 w-3 mr-1 animate-spin" />
														Updating...
													</>
												) : (
													<>
														<CheckCircle className="h-3 w-3 mr-1" />
														Submit Changes
													</>
												)}
											</Button>
										</div>
									</CardContent>
								</Card>
							</>
						)}
					</div>
				</div>

				<AppFooter />
			</SidebarInset>

			{/* Confirmation Dialog */}
			<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<AlertDialogContent className="max-w-md">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<Edit className="h-5 w-5 text-blue-600" />
							Confirm Attendance Update
						</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to update the selected student's attendance status?
							This will change {changesCount} record{changesCount > 1 ? 's' : ''}.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<div className="space-y-3 py-4">
						{/* Changed Records Summary */}
						<div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
							<div className="flex items-center gap-2">
								<AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
								<span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Changes to Apply</span>
							</div>
							<span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{changesCount}</span>
						</div>

						{/* Warning */}
						<div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
							<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
							<p className="text-xs text-red-800 dark:text-red-200">
								This action will permanently modify the attendance records. Please ensure all changes are correct before proceeding.
							</p>
						</div>
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel>No, Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmUpdate}
							className="bg-blue-600 hover:bg-blue-700"
						>
							Yes, Update
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</SidebarProvider>
	)
}
