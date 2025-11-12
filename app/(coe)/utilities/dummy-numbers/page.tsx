'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { AppFooter } from '@/components/layout/app-footer'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from "@/hooks/common/use-toast"
import { Shuffle, Hash, Trash2, Download, Eye, EyeOff, FileText } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Link from 'next/link'

interface Institution {
	id: string
	institution_code: string
	name: string
}

interface ExaminationSession {
	id: string
	session_code: string
	session_name: string
}

interface DummyNumber {
	id: string
	dummy_number: string
	actual_register_number: string
	roll_number_for_evaluation: number
	exam_registration?: {
		stu_register_no: string
		is_regular: boolean
		student?: {
			first_name: string
			last_name: string
		}
		course_offering?: {
			course?: {
				course_name: string
			course_code: string
				course_category: string
			board_code?: string
			board?: {
				board_code: string
				board_order: number
			}
			}
			program?: {
				program_code: string
				program_name: string
			}
		}
	}
}

export default function DummyNumbersPage() {
	const { toast } = useToast()
	const { user } = useAuth()

	// Form state
	const [institutions, setInstitutions] = useState<Institution[]>([])
	const [sessions, setSessions] = useState<ExaminationSession[]>([])
	const [selectedInstitution, setSelectedInstitution] = useState('')
	const [selectedSession, setSelectedSession] = useState('')
	const [sourceMode, setSourceMode] = useState<'attendance' | 'registration'>('attendance')
	const [generationMode, setGenerationMode] = useState<'sequence' | 'shuffle'>('sequence')
	const [dummyNumberFormat, setDummyNumberFormat] = useState('DN{N:4}')
	const [startFrom, setStartFrom] = useState('1')

	// Filter state
	const [boards, setBoards] = useState<string[]>([])
	const [courses, setCourses] = useState<{ course_code: string; course_name: string }[]>([])
	const [programs, setPrograms] = useState<{ program_code: string; program_name: string }[]>([])
	const [selectedBoard, setSelectedBoard] = useState('')
	const [selectedCourse, setSelectedCourse] = useState('')
	const [selectedProgram, setSelectedProgram] = useState('')

	// Data state
	const [dummyNumbers, setDummyNumbers] = useState<DummyNumber[]>([])
	const [loading, setLoading] = useState(false)
	const [generating, setGenerating] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [hideActualNumbers, setHideActualNumbers] = useState(true)

	// Fetch institutions
	useEffect(() => {
		fetchInstitutions()
	}, [])

	// Fetch sessions when institution changes
	useEffect(() => {
		if (selectedInstitution) {
			fetchSessions()
		} else {
			setSessions([])
			setSelectedSession('')
		}
	}, [selectedInstitution])

	// Fetch dummy numbers when institution, session, or filters change
	useEffect(() => {
		if (selectedInstitution && selectedSession) {
			fetchDummyNumbers()
		} else {
			setDummyNumbers([])
		}
	}, [selectedInstitution, selectedSession, selectedBoard, selectedCourse, selectedProgram])

	// Fetch filter options when session changes
	useEffect(() => {
		if (selectedInstitution && selectedSession) {
			fetchFilterOptions()
		} else {
			setBoards([])
			setCourses([])
			setPrograms([])
			setSelectedBoard('')
			setSelectedCourse('')
			setSelectedProgram('')
		}
	}, [selectedInstitution, selectedSession])

	const fetchInstitutions = async () => {
		try {
			const res = await fetch('/api/master/institutions')
			if (res.ok) {
				const data = await res.json()
				setInstitutions(data)
			}
		} catch (error) {
			console.error('Error fetching institutions:', error)
		}
	}

	const fetchSessions = async () => {
		try {
			const res = await fetch(`/api/exam-management/examination-sessions?institutions_id=${selectedInstitution}`)
			if (res.ok) {
				const data = await res.json()
				setSessions(data)
			}
		} catch (error) {
			console.error('Error fetching sessions:', error)
		}
	}

	const fetchFilterOptions = async () => {
		try {
			// Fetch boards filtered by institution_id
			const boardsRes = await fetch(`/api/master/boards?institutions_id=${selectedInstitution}`)
			if (boardsRes.ok) {
				const boardsData = await boardsRes.json()
				setBoards(boardsData.map((b: any) => b.board_code).filter(Boolean))
			}

			// Fetch courses (only Theory courses)
			const coursesRes = await fetch(`/api/master/courses?institution_code=${institutions.find(i => i.id === selectedInstitution)?.institution_code || ''}`)
			if (coursesRes.ok) {
				const coursesData = await coursesRes.json()
				// Filter to only show Theory courses for dummy number generation
				const theoryCourses = coursesData.filter((c: any) =>
					c.course_category?.toLowerCase() === 'theory'
				)
				setCourses(theoryCourses.map((c: any) => ({
					course_code: c.course_code,
					course_name: c.course_title || c.course_name
				})))
			}

			// Fetch programs
			const programsRes = await fetch(`/api/master/programs?institution_code=${institutions.find(i => i.id === selectedInstitution)?.institution_code || ''}`)
			if (programsRes.ok) {
				const programsData = await programsRes.json()
				setPrograms(programsData.map((p: any) => ({ program_code: p.program_code, program_name: p.program_name })))
			}
		} catch (error) {
			console.error('Error fetching filter options:', error)
		}
	}

	const fetchDummyNumbers = async () => {
		try {
			setLoading(true)
			let url = `/api/utilities/dummy-numbers?institutions_id=${selectedInstitution}&examination_session_id=${selectedSession}`

			if (selectedBoard) url += `&board_code=${selectedBoard}`
			if (selectedCourse) url += `&course_code=${selectedCourse}`
			if (selectedProgram) url += `&program_code=${selectedProgram}`

			const res = await fetch(url)
			if (res.ok) {
				const result = await res.json()
				setDummyNumbers(result.data || [])
			}
		} catch (error) {
			console.error('Error fetching dummy numbers:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleGenerate = async () => {
		if (!selectedInstitution || !selectedSession) {
			toast({
				title: '⚠️ Missing Information',
				description: 'Please select both institution and examination session',
				variant: 'destructive',
			})
			return
		}

		if (!dummyNumberFormat.trim()) {
			toast({
				title: '⚠️ Missing Format',
				description: 'Please enter a dummy number format',
				variant: 'destructive',
			})
			return
		}

		const startNumber = parseInt(startFrom)
		if (isNaN(startNumber) || startNumber < 1) {
			toast({
				title: '⚠️ Invalid Start Number',
				description: 'Please enter a valid starting number (minimum 1)',
				variant: 'destructive',
			})
			return
		}

		try {
			setGenerating(true)

			const payload: any = {
				institutions_id: selectedInstitution,
				examination_session_id: selectedSession,
				source_mode: sourceMode,
				generation_mode: generationMode,
				dummy_number_format: dummyNumberFormat,
				start_from: startNumber,
				generated_by: user?.id || null,
			}

			// Add filters if selected
			if (selectedBoard) payload.board_code = selectedBoard
			if (selectedCourse) payload.course_code = selectedCourse
			if (selectedProgram) payload.program_code = selectedProgram

			const res = await fetch('/api/utilities/dummy-numbers/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			const result = await res.json()

			if (!res.ok) {
				throw new Error(result.error || 'Failed to generate dummy numbers')
			}

			toast({
				title: '✅ Generation Complete',
				description: `Successfully generated ${result.count} dummy numbers`,
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
			})

			// Refresh the data
			fetchDummyNumbers()
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to generate dummy numbers'
			toast({
				title: '❌ Generation Failed',
				description: errorMessage,
				variant: 'destructive',
				className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
			})
		} finally {
			setGenerating(false)
		}
	}

	const handleDeleteAll = async () => {
		if (!selectedInstitution || !selectedSession) {
			return
		}

		try {
			setLoading(true)

			const res = await fetch(
				`/api/utilities/dummy-numbers?institutions_id=${selectedInstitution}&examination_session_id=${selectedSession}`,
				{ method: 'DELETE' }
			)

			const result = await res.json()

			if (!res.ok) {
				throw new Error(result.error || 'Failed to delete dummy numbers')
			}

			toast({
				title: '✅ Deleted Successfully',
				description: result.message,
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
			})

			setDummyNumbers([])
			setShowDeleteDialog(false)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to delete dummy numbers'
			toast({
				title: '❌ Deletion Failed',
				description: errorMessage,
				variant: 'destructive',
			})
		} finally {
			setLoading(false)
		}
	}

	const exportToCSV = () => {
		if (dummyNumbers.length === 0) {
			toast({
				title: '⚠️ No Data',
				description: 'No dummy numbers to export',
				variant: 'destructive',
			})
			return
		}

		const headers = [
			'Roll No.',
			'Dummy Number',
			'Actual Register Number',
			'Student Name',
			'Board',
			'Program',
			'Course',
			'Type',
		]

		const rows = dummyNumbers.map((dn) => [
			dn.roll_number_for_evaluation,
			dn.dummy_number,
			dn.actual_register_number,
			`${dn.exam_registration?.student?.first_name || ''} ${dn.exam_registration?.student?.last_name || ''}`.trim(),
			dn.exam_registration?.course_offering?.course?.board?.board_code || '',
			dn.exam_registration?.course_offering?.program?.program_code || '',
			dn.exam_registration?.course_offering?.course?.course_code || '',
			dn.exam_registration?.is_regular ? 'Regular' : 'Arrear',
		])

		const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

		const blob = new Blob([csv], { type: 'text/csv' })
		const url = window.URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `dummy-numbers-${selectedSession}-${new Date().toISOString().split('T')[0]}.csv`
		a.click()
		window.URL.revokeObjectURL(url)

		toast({
			title: '✅ Export Complete',
			description: `Exported ${dummyNumbers.length} dummy numbers to CSV`,
			className: 'bg-green-50 border-green-200 text-green-800',
		})
	}

	const exportToPDF = () => {
		if (dummyNumbers.length === 0) {
			toast({
				title: '⚠️ No Data',
				description: 'No dummy numbers to export',
				variant: 'destructive',
			})
			return
		}

		// Get institution and session names
		const institution = institutions.find((i) => i.id === selectedInstitution)
		const session = sessions.find((s) => s.id === selectedSession)

		const doc = new jsPDF('landscape')

		// Add title
		doc.setFontSize(16)
		doc.text('Dummy Number Generation Report', 14, 15)

		// Add institution and session info
		doc.setFontSize(10)
		doc.text(`Institution: ${institution?.name || 'N/A'}`, 14, 22)
		doc.text(`Session: ${session?.session_name || 'N/A'}`, 14, 28)
		doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34)
		doc.text(`Total Students: ${dummyNumbers.length}`, 14, 40)

		// Prepare table data
		const headers = [
			['Roll No.', 'Dummy Number', 'Actual Register No.', 'Student Name', 'Board', 'Program', 'Course', 'Type']
		]

		const rows = dummyNumbers.map((dn) => [
			dn.roll_number_for_evaluation,
			dn.dummy_number,
			hideActualNumbers ? '••••••••' : dn.actual_register_number,
			`${dn.exam_registration?.student?.first_name || ''} ${dn.exam_registration?.student?.last_name || ''}`.trim(),
			dn.exam_registration?.course_offering?.course?.board?.board_code || '-',
			dn.exam_registration?.course_offering?.program?.program_code || '-',
			dn.exam_registration?.course_offering?.course?.course_code || '-',
			dn.exam_registration?.is_regular ? 'Regular' : 'Arrear',
		])

		// Generate table
		autoTable(doc, {
			head: headers,
			body: rows,
			startY: 45,
			theme: 'grid',
			styles: {
				fontSize: 8,
				cellPadding: 2,
			},
			headStyles: {
				fillColor: [22, 163, 74], // Green color matching the theme
				textColor: 255,
				fontStyle: 'bold',
			},
			alternateRowStyles: {
				fillColor: [249, 250, 251],
			},
			columnStyles: {
				0: { cellWidth: 20 },  // Roll No.
				1: { cellWidth: 30 },  // Dummy Number
				2: { cellWidth: 35 },  // Actual Register No.
				3: { cellWidth: 50 },  // Student Name
				4: { cellWidth: 30 },  // Board
				5: { cellWidth: 30 },  // Program
				6: { cellWidth: 30 },  // Course
				7: { cellWidth: 25 },  // Type
			},
		})

		// Save PDF
		doc.save(`dummy-numbers-${session?.session_code || 'report'}-${new Date().toISOString().split('T')[0]}.pdf`)

		toast({
			title: '✅ PDF Export Complete',
			description: `Exported ${dummyNumbers.length} dummy numbers to PDF`,
			className: 'bg-green-50 border-green-200 text-green-800',
		})
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<AppHeader>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="/dashboard">Home</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="/exam-conduct">Exam Conduct</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>Dummy Numbers</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</AppHeader>

				<div className="p-6 space-y-6">
					{/* Header */}
					<div>
						<h1 className="text-3xl font-bold text-heading">Dummy Number Generation</h1>
						<p className="text-muted-foreground mt-2">
							Generate anonymous dummy numbers for students appearing in examinations
						</p>
					</div>

			{/* Configuration Card */}
			<Card>
				<CardHeader>
					<CardTitle>Configuration</CardTitle>
					<CardDescription>
						Select institution, session, and configure dummy number generation settings
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Institution & Session Selection */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="institution">
								Institution <span className="text-red-500">*</span>
							</Label>
							<Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
								<SelectTrigger>
									<SelectValue placeholder="Select institution" />
								</SelectTrigger>
								<SelectContent>
									{institutions.map((inst) => (
										<SelectItem key={inst.id} value={inst.id}>
											{inst.institution_code} - {inst.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="session">
								Examination Session <span className="text-red-500">*</span>
							</Label>
							<Select
								value={selectedSession}
								onValueChange={setSelectedSession}
								disabled={!selectedInstitution}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select session" />
								</SelectTrigger>
								<SelectContent>
									{sessions.map((session) => (
										<SelectItem key={session.id} value={session.id}>
											{session.session_code} - {session.session_name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Filter Options */}
					{selectedInstitution && selectedSession && (
						<div className="space-y-2">
							<Label className="text-sm font-semibold">Filter Options (Optional)</Label>
							<p className="text-xs text-muted-foreground">
								Apply filters to generate dummy numbers for specific boards, courses, or programs only
							</p>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="space-y-2">
									<Label htmlFor="board">Board of Study</Label>
									<div className="flex gap-2">
										<Select value={selectedBoard} onValueChange={setSelectedBoard}>
											<SelectTrigger className="flex-1">
												<SelectValue placeholder="All boards" />
											</SelectTrigger>
											<SelectContent>
												{boards.map((board) => (
													<SelectItem key={board} value={board}>
														{board}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{selectedBoard && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => setSelectedBoard('')}
												className="px-2"
											>
												Clear
											</Button>
										)}
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="course">Course</Label>
									<div className="flex gap-2">
										<Select value={selectedCourse} onValueChange={setSelectedCourse}>
											<SelectTrigger className="flex-1">
												<SelectValue placeholder="All courses" />
											</SelectTrigger>
											<SelectContent>
												{courses.map((course) => (
													<SelectItem key={course.course_code} value={course.course_code}>
														{course.course_code} - {course.course_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{selectedCourse && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => setSelectedCourse('')}
												className="px-2"
											>
												Clear
											</Button>
										)}
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="program">Program</Label>
									<div className="flex gap-2">
										<Select value={selectedProgram} onValueChange={setSelectedProgram}>
											<SelectTrigger className="flex-1">
												<SelectValue placeholder="All programs" />
											</SelectTrigger>
											<SelectContent>
												{programs.map((program) => (
													<SelectItem key={program.program_code} value={program.program_code}>
														{program.program_code} - {program.program_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{selectedProgram && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => setSelectedProgram('')}
												className="px-2"
											>
												Clear
											</Button>
										)}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Source Mode */}
					<div className="space-y-2">
						<Label>Source Mode</Label>
						<RadioGroup value={sourceMode} onValueChange={(v) => setSourceMode(v as any)}>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="attendance" id="attendance" />
								<Label htmlFor="attendance" className="font-normal cursor-pointer">
									Attendance Based (Present Students Only)
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="registration" id="registration" />
								<Label htmlFor="registration" className="font-normal cursor-pointer">
									Registration Based (All Approved Students)
								</Label>
							</div>
						</RadioGroup>
					</div>

					{/* Generation Mode */}
					<div className="space-y-2">
						<Label>Generation Mode</Label>
						<RadioGroup value={generationMode} onValueChange={(v) => setGenerationMode(v as any)}>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="sequence" id="sequence" />
								<Label htmlFor="sequence" className="font-normal cursor-pointer flex items-center gap-2">
									<Hash className="h-4 w-4" />
									Sequential (Ordered by board → program → course → type)
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="shuffle" id="shuffle" />
								<Label htmlFor="shuffle" className="font-normal cursor-pointer flex items-center gap-2">
									<Shuffle className="h-4 w-4" />
									Shuffle (Randomized order)
								</Label>
							</div>
						</RadioGroup>
					</div>

					{/* Format & Starting Number */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="format">
								Dummy Number Format <span className="text-red-500">*</span>
							</Label>
							<Input
								id="format"
								value={dummyNumberFormat}
								onChange={(e) => setDummyNumberFormat(e.target.value)}
								placeholder="DN{N:4}"
							/>
							<p className="text-xs text-muted-foreground">
								Use {'{N:4}'} for 4-digit padding. Example: DN{'{N:4}'} → DN0001, DN0002, ...
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="startFrom">
								Start From <span className="text-red-500">*</span>
							</Label>
							<Input
								id="startFrom"
								type="number"
								min="1"
								value={startFrom}
								onChange={(e) => setStartFrom(e.target.value)}
								placeholder="1"
							/>
							<p className="text-xs text-muted-foreground">Starting number for dummy number sequence</p>
						</div>
					</div>

					{/* Generate Button */}
					<div className="flex gap-2">
						<Button
							onClick={handleGenerate}
							disabled={generating || !selectedInstitution || !selectedSession}
							className="w-full md:w-auto"
						>
							{generating ? 'Generating...' : 'Generate Dummy Numbers'}
						</Button>

						{dummyNumbers.length > 0 && (
							<>
								<Button variant="outline" onClick={exportToCSV}>
									<Download className="h-4 w-4 mr-2" />
									Export CSV
								</Button>
								<Button variant="outline" onClick={exportToPDF}>
									<FileText className="h-4 w-4 mr-2" />
									Export PDF
								</Button>
								<Button
									variant="outline"
									onClick={() => setHideActualNumbers(!hideActualNumbers)}
								>
									{hideActualNumbers ? (
										<>
											<Eye className="h-4 w-4 mr-2" />
											Show Register Numbers
										</>
									) : (
										<>
											<EyeOff className="h-4 w-4 mr-2" />
											Hide Register Numbers
										</>
									)}
								</Button>
								<Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
									<Trash2 className="h-4 w-4 mr-2" />
									Delete All
								</Button>
							</>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Data Table */}
			{selectedInstitution && selectedSession && (
				<Card>
					<CardHeader>
						<CardTitle>Generated Dummy Numbers ({dummyNumbers.length})</CardTitle>
						<CardDescription>
							{dummyNumbers.length > 0
								? 'List of generated dummy numbers for the selected session'
								: 'No dummy numbers generated yet'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="text-center py-8 text-muted-foreground">Loading...</div>
						) : dummyNumbers.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								No dummy numbers found. Click "Generate Dummy Numbers" to create them.
							</div>
						) : (
							<div className="border rounded-lg overflow-hidden">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-20">Roll No.</TableHead>
											<TableHead>Dummy Number</TableHead>
											<TableHead>Actual Register No.</TableHead>
											<TableHead>Student Name</TableHead>
											<TableHead>Board</TableHead>
											<TableHead>Program</TableHead>
											<TableHead>Course</TableHead>
											<TableHead>Type</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{dummyNumbers.map((dn) => (
											<TableRow key={dn.id}>
												<TableCell className="font-medium">
													{dn.roll_number_for_evaluation}
												</TableCell>
												<TableCell className="font-mono font-semibold">
													{dn.dummy_number}
												</TableCell>
												<TableCell className="font-mono">
													{hideActualNumbers ? '••••••••' : dn.actual_register_number}
												</TableCell>
												<TableCell>
													{dn.exam_registration?.student?.first_name || ''}{' '}
													{dn.exam_registration?.student?.last_name || ''}
												</TableCell>
												<TableCell>{dn.exam_registration?.course_offering?.course?.board?.board_code || '-'}</TableCell>
												<TableCell>
													{dn.exam_registration?.course_offering?.program?.program_code || '-'}
												</TableCell>
												<TableCell>
													{dn.exam_registration?.course_offering?.course?.course_code || '-'}
												</TableCell>
												<TableCell>
													<Badge variant={dn.exam_registration?.is_regular ? 'default' : 'secondary'}>
														{dn.exam_registration?.is_regular ? 'Regular' : 'Arrear'}
													</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			)}

					{/* Delete Confirmation Dialog */}
					<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This will delete all {dummyNumbers.length} dummy numbers for the selected institution and
									session. This action cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700">
									Delete All
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>

				<AppFooter />
			</SidebarInset>
		</SidebarProvider>
	)
}
