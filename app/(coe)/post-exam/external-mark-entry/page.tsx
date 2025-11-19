'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { AppFooter } from '@/components/layout/app-footer'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/common/use-toast'
import { FileText, Save, Check, ChevronsUpDown, AlertTriangle } from 'lucide-react'
import { numberToWords } from '@/services/post-exam/external-mark-entry-service'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Institution {
	id: string
	name: string
	institution_code: string
}

interface Session {
	id: string
	session_name: string
	session_code: string
}

interface Course {
	id: string
	course_code: string
	course_name: string
}

interface Packet {
	id: string
	packet_no: string
	total_sheets: number
	institutions_id: string
	examination_session_id: string
	course_id: string
}

interface Student {
	student_dummy_id: string
	dummy_number: string
	exam_registration_id: string
	program_id: string | null
	total_marks_obtained: number | null
	total_marks_in_words: string
	remarks: string
}

interface CourseDetails {
	subject_code: string
	subject_name: string
	maximum_marks: number
	minimum_pass_marks: number
	packet_no: string
	total_sheets: number
}

export default function ExternalMarkEntryPage() {
	const { toast } = useToast()

	// Dropdown data
	const [institutions, setInstitutions] = useState<Institution[]>([])
	const [sessions, setSessions] = useState<Session[]>([])
	const [courses, setCourses] = useState<Course[]>([])
	const [packets, setPackets] = useState<Packet[]>([])

	// Selected values (using IDs instead of codes)
	const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('')
	const [selectedSessionId, setSelectedSessionId] = useState<string>('')
	const [selectedCourseId, setSelectedCourseId] = useState<string>('')
	const [selectedPacketId, setSelectedPacketId] = useState<string>('')
	const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null)

	// Combobox open states
	const [institutionOpen, setInstitutionOpen] = useState(false)
	const [sessionOpen, setSessionOpen] = useState(false)
	const [courseOpen, setCourseOpen] = useState(false)
	const [packetOpen, setPacketOpen] = useState(false)

	// Mark entry states
	const [students, setStudents] = useState<Student[]>([])
	const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null)

	// Loading states
	const [loadingInstitutions, setLoadingInstitutions] = useState(false)
	const [loadingSessions, setLoadingSessions] = useState(false)
	const [loadingCourses, setLoadingCourses] = useState(false)
	const [loadingPackets, setLoadingPackets] = useState(false)
	const [loadingStudents, setLoadingStudents] = useState(false)
	const [saving, setSaving] = useState(false)

	// View mode state (after saving marks)
	const [isViewMode, setIsViewMode] = useState(false)

	// Load institutions on mount
	useEffect(() => {
		loadInstitutions()
	}, [])

	// Load sessions when institution changes
	useEffect(() => {
		if (selectedInstitutionId) {
			loadSessions(selectedInstitutionId)
			resetDependentFields(['session', 'course', 'packet'])
		}
	}, [selectedInstitutionId])

	// Load courses when session changes
	useEffect(() => {
		if (selectedSessionId) {
			loadCourses(selectedInstitutionId, selectedSessionId)
			resetDependentFields(['course', 'packet'])
		}
	}, [selectedSessionId])

	// Load packets when course changes
	useEffect(() => {
		if (selectedCourseId) {
			loadPackets(selectedInstitutionId, selectedSessionId, selectedCourseId)
			resetDependentFields(['packet'])
		}
	}, [selectedCourseId])

	const resetDependentFields = (fields: string[]) => {
		if (fields.includes('session')) {
			setSelectedSessionId('')
			setSessions([])
		}
		if (fields.includes('course')) {
			setSelectedCourseId('')
			setCourses([])
		}
		if (fields.includes('packet')) {
			setSelectedPacketId('')
			setSelectedPacket(null)
			setPackets([])
		}
		setStudents([])
		setCourseDetails(null)
		setIsViewMode(false)
	}

	const loadInstitutions = async () => {
		try {
			setLoadingInstitutions(true)
			const response = await fetch('/api/post-exam/external-marks?action=institutions')
			if (!response.ok) throw new Error('Failed to load institutions')
			const data = await response.json()
			setInstitutions(data)
		} catch (error) {
			toast({
				title: "❌ Error",
				description: "Failed to load institutions",
				variant: "destructive",
			})
		} finally {
			setLoadingInstitutions(false)
		}
	}

	const loadSessions = async (institutionId: string) => {
		try {
			setLoadingSessions(true)
			const response = await fetch(
				`/api/post-exam/external-marks?action=sessions&institutionId=${institutionId}`
			)
			if (!response.ok) throw new Error('Failed to load sessions')
			const data = await response.json()
			setSessions(data)
		} catch (error) {
			toast({
				title: "❌ Error",
				description: "Failed to load examination sessions",
				variant: "destructive",
			})
		} finally {
			setLoadingSessions(false)
		}
	}

	const loadCourses = async (institutionId: string, sessionId: string) => {
		try {
			setLoadingCourses(true)
			const response = await fetch(
				`/api/post-exam/external-marks?action=courses&` +
				`institutionId=${institutionId}&` +
				`sessionId=${sessionId}`
			)
			if (!response.ok) throw new Error('Failed to load courses')
			const data = await response.json()
			setCourses(data)
		} catch (error) {
			toast({
				title: "❌ Error",
				description: "Failed to load courses",
				variant: "destructive",
			})
		} finally {
			setLoadingCourses(false)
		}
	}

	const loadPackets = async (institutionId: string, sessionId: string, courseId: string) => {
		try {
			setLoadingPackets(true)
			const response = await fetch(
				`/api/post-exam/external-marks?action=packets&` +
				`institutionId=${institutionId}&` +
				`sessionId=${sessionId}&` +
				`courseId=${courseId}`
			)
			if (!response.ok) throw new Error('Failed to load packets')
			const data = await response.json()
			setPackets(data)
		} catch (error) {
			toast({
				title: "❌ Error",
				description: "Failed to load packet numbers",
				variant: "destructive",
			})
		} finally {
			setLoadingPackets(false)
		}
	}

	const loadStudents = async () => {
		if (!selectedPacketId) {
			toast({
				title: "⚠️ Selection Required",
				description: "Please select all fields including packet number",
				variant: "destructive",
			})
			return
		}

		const packet = packets.find(p => p.id === selectedPacketId)
		if (!packet) return

		try {
			setLoadingStudents(true)
			setSelectedPacket(packet)
			setIsViewMode(false) // Reset view mode when loading new students

			const response = await fetch(
				`/api/post-exam/external-marks?action=students&packetId=${packet.id}`
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to load students')
			}

			const data = await response.json()
			setStudents(data.students)
			setCourseDetails(data.course_details)

			toast({
				title: "✅ Students Loaded",
				description: `Loaded ${data.students.length} students for packet ${data.course_details.packet_no}`,
				className: "bg-green-50 border-green-200 text-green-800",
			})
		} catch (error) {
			toast({
				title: "❌ Error",
				description: error instanceof Error ? error.message : 'Failed to load students',
				variant: "destructive",
			})
		} finally {
			setLoadingStudents(false)
		}
	}

	const handleMarksChange = (index: number, value: string) => {
		if (isViewMode) return // Prevent changes in view mode

		if (!value || !courseDetails) {
			const updated = [...students]
			updated[index].total_marks_obtained = null
			updated[index].total_marks_in_words = ''
			updated[index].remarks = ''
			setStudents(updated)
			return
		}

		const numValue = parseInt(value)
		if (isNaN(numValue)) return

		if (numValue > courseDetails.maximum_marks) {
			toast({
				title: "⚠️ Invalid Marks",
				description: `Marks cannot exceed ${courseDetails.maximum_marks}`,
				variant: "destructive",
			})
			return
		}

		const updated = [...students]
		updated[index].total_marks_obtained = numValue
		updated[index].total_marks_in_words = numberToWords(numValue)
		updated[index].remarks = numValue >= courseDetails.minimum_pass_marks ? 'PASS' : 'FAIL'
		setStudents(updated)
	}

	const handleSaveMarks = async () => {
		if (isViewMode) {
			toast({
				title: "⚠️ Read-Only Mode",
				description: "Marks have already been saved and cannot be modified.",
				variant: "destructive",
			})
			return
		}

		const missingMarks = students.filter(s => s.total_marks_obtained === null)
		if (missingMarks.length > 0) {
			toast({
				title: "⚠️ Validation Error",
				description: `Please enter marks for all ${students.length} students`,
				variant: "destructive",
			})
			return
		}

		if (!selectedPacket || !courseDetails) return

		try {
			setSaving(true)

			// Save marks for each student
			const savePromises = students.map(student =>
				fetch('/api/post-exam/external-marks', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						institutions_id: selectedPacket.institutions_id,
						examination_session_id: selectedPacket.examination_session_id,
						exam_registration_id: student.exam_registration_id,
						student_dummy_number_id: student.student_dummy_id,
						program_id: student.program_id,
						course_id: selectedPacket.course_id,
						dummy_number: student.dummy_number,
						total_marks_obtained: student.total_marks_obtained,
						total_marks_in_words: student.total_marks_in_words,
						marks_out_of: courseDetails.maximum_marks,
						evaluation_date: new Date().toISOString().split('T')[0],
						evaluator_remarks: student.remarks,
					})
				})
			)

			await Promise.all(savePromises)

			toast({
				title: "✅ Marks Saved",
				description: `Successfully saved marks for ${students.length} students`,
				className: "bg-green-50 border-green-200 text-green-800",
				duration: 5000,
			})

			// Switch to view mode
			setIsViewMode(true)

			// Auto-download PDF after successful save
			await generatePDF()
		} catch (error) {
			toast({
				title: "❌ Save Failed",
				description: error instanceof Error ? error.message : 'Failed to save marks',
				variant: "destructive",
			})
		} finally {
			setSaving(false)
		}
	}

	const getTotalMarks = () => students.reduce((sum, s) => sum + (s.total_marks_obtained || 0), 0)

	const generatePDF = async () => {
		if (!courseDetails || students.length === 0) return

		try {
			// Dynamic import for client-side only
			const { generateExternalMarksPDF } = await import('@/lib/utils/generate-external-marks-pdf')

			// Prepare PDF data
			const pdfData = {
				subject_code: courseDetails.subject_code,
				subject_name: courseDetails.subject_name,
				packet_no: courseDetails.packet_no,
				total_sheets: courseDetails.total_sheets,
				maximum_marks: courseDetails.maximum_marks,
				minimum_pass_marks: courseDetails.minimum_pass_marks,
				exam_date: new Date().toLocaleDateString('en-GB'),
				students: students.map(s => ({
					dummy_number: s.dummy_number,
					total_marks_obtained: s.total_marks_obtained,
					total_marks_in_words: s.total_marks_in_words,
					remarks: s.remarks
				}))
			}

			// Generate PDF
			const fileName = generateExternalMarksPDF(pdfData)

			toast({
				title: "✅ PDF Downloaded",
				description: `Marks sheet saved as ${fileName}`,
				className: "bg-green-50 border-green-200 text-green-800",
			})
		} catch (error) {
			toast({
				title: "❌ PDF Generation Failed",
				description: error instanceof Error ? error.message : 'Failed to generate PDF',
				variant: "destructive",
			})
		}
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
									<Link href="/dashboard">Dashboard</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="#">Post-Exam</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>External Mark Entry</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</AppHeader>

				<div className="flex-1 p-6 space-y-6 overflow-auto">
					<Card>
						<CardHeader>
							<CardTitle className="text-2xl font-bold flex items-center gap-2 font-grotesk">
								<FileText className="h-6 w-6" />
								External Mark Entry
							</CardTitle>
							<CardDescription>
								Select institution, session, course, and packet to enter external marks
							</CardDescription>
						</CardHeader>
					</Card>

					{/* Cascading Dropdowns */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg font-grotesk">Select Packet Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								{/* Institution Combobox */}
								<div className="space-y-2">
									<Label htmlFor="institution">Institution <span className="text-red-500">*</span></Label>
									<Popover open={institutionOpen} onOpenChange={setInstitutionOpen}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												aria-expanded={institutionOpen}
												className="w-full justify-between h-auto min-h-[40px] whitespace-normal text-left"
												disabled={loadingInstitutions}
											>
												<span className="flex-1 pr-2">
													{selectedInstitutionId
														? institutions.find((inst) => inst.id === selectedInstitutionId)?.name
														: loadingInstitutions ? "Loading..." : "Select institution..."}
												</span>
												<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[500px] p-0">
											<Command>
												<CommandInput placeholder="Search institution..." />
												<CommandEmpty>No institution found.</CommandEmpty>
												<CommandGroup className="max-h-64 overflow-auto">
													{institutions.map((inst) => (
														<CommandItem
															key={inst.id}
															value={`${inst.institution_code} ${inst.name}`}
															onSelect={() => {
																setSelectedInstitutionId(inst.id)
																setInstitutionOpen(false)
															}}
															className="whitespace-normal py-3"
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4 shrink-0",
																	selectedInstitutionId === inst.id ? "opacity-100" : "opacity-0"
																)}
															/>
															<span className="flex-1">{inst.institution_code} - {inst.name}</span>
														</CommandItem>
													))}
												</CommandGroup>
											</Command>
										</PopoverContent>
									</Popover>
								</div>

								{/* Session Combobox */}
								<div className="space-y-2">
									<Label htmlFor="session">Examination Session <span className="text-red-500">*</span></Label>
									<Popover open={sessionOpen} onOpenChange={setSessionOpen}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												aria-expanded={sessionOpen}
												className="w-full justify-between h-auto min-h-[40px] whitespace-normal text-left"
												disabled={!selectedInstitutionId || loadingSessions}
											>
												<span className="flex-1 pr-2">
													{selectedSessionId
														? sessions.find((s) => s.id === selectedSessionId)?.session_name
														: loadingSessions ? "Loading..." : "Select session..."}
												</span>
												<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[350px] p-0">
											<Command>
												<CommandInput placeholder="Search session..." />
												<CommandEmpty>No session found.</CommandEmpty>
												<CommandGroup className="max-h-64 overflow-auto">
													{sessions.map((session) => (
														<CommandItem
															key={session.id}
															value={`${session.session_code} ${session.session_name}`}
															onSelect={() => {
																setSelectedSessionId(session.id)
																setSessionOpen(false)
															}}
															className="whitespace-normal py-3"
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4 shrink-0",
																	selectedSessionId === session.id ? "opacity-100" : "opacity-0"
																)}
															/>
															<span className="flex-1">{session.session_code} - {session.session_name}</span>
														</CommandItem>
													))}
												</CommandGroup>
											</Command>
										</PopoverContent>
									</Popover>
								</div>

								{/* Course Combobox */}
								<div className="space-y-2">
									<Label htmlFor="course">Course <span className="text-red-500">*</span></Label>
									<Popover open={courseOpen} onOpenChange={setCourseOpen}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												aria-expanded={courseOpen}
												className="w-full justify-between h-auto min-h-[40px] whitespace-normal text-left"
												disabled={!selectedSessionId || loadingCourses}
											>
												<span className="flex-1 pr-2">
													{selectedCourseId
														? courses.find((c) => c.id === selectedCourseId)?.course_name
														: loadingCourses ? "Loading..." : "Select course..."}
												</span>
												<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[500px] p-0">
											<Command>
												<CommandInput placeholder="Search course..." />
												<CommandEmpty>No course found.</CommandEmpty>
												<CommandGroup className="max-h-64 overflow-auto">
													{courses.map((course) => (
														<CommandItem
															key={course.id}
															value={`${course.course_code} ${course.course_name}`}
															onSelect={() => {
																setSelectedCourseId(course.id)
																setCourseOpen(false)
															}}
															className="whitespace-normal py-3"
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4 shrink-0",
																	selectedCourseId === course.id ? "opacity-100" : "opacity-0"
																)}
															/>
															<span className="flex-1">{course.course_code} - {course.course_name}</span>
														</CommandItem>
													))}
												</CommandGroup>
											</Command>
										</PopoverContent>
									</Popover>
								</div>

								{/* Packet Number Combobox */}
								<div className="space-y-2">
									<Label htmlFor="packet">Packet Number <span className="text-red-500">*</span></Label>
									<Popover open={packetOpen} onOpenChange={setPacketOpen}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												aria-expanded={packetOpen}
												className="w-full justify-between h-auto min-h-[40px] whitespace-normal text-left"
												disabled={!selectedCourseId || loadingPackets}
											>
												<span className="flex-1 pr-2">
													{selectedPacketId
														? packets.find((p) => p.id === selectedPacketId)?.packet_no
														: loadingPackets ? "Loading..." : "Select packet..."}
												</span>
												<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[250px] p-0">
											<Command>
												<CommandInput placeholder="Search packet..." />
												<CommandEmpty>No packet found.</CommandEmpty>
												<CommandGroup className="max-h-64 overflow-auto">
													{packets.map((packet) => (
														<CommandItem
															key={packet.id}
															value={packet.packet_no}
															onSelect={() => {
																setSelectedPacketId(packet.id)
																setPacketOpen(false)
															}}
															className="whitespace-normal py-3"
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4 shrink-0",
																	selectedPacketId === packet.id ? "opacity-100" : "opacity-0"
																)}
															/>
															<span className="flex-1">{packet.packet_no}</span>
														</CommandItem>
													))}
												</CommandGroup>
											</Command>
										</PopoverContent>
									</Popover>
								</div>
							</div>

							<div className="flex justify-end">
								<Button
									onClick={loadStudents}
									disabled={!selectedPacketId || loadingStudents}
								>
									{loadingStudents ? 'Loading Students...' : 'Load Students'}
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Mark Entry Section */}
					{students.length > 0 && courseDetails && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center justify-between font-grotesk">
									<span>Mark Entry - Packet {courseDetails.packet_no}</span>
									<div className="flex gap-2">
										<Badge variant="outline">External Max Mark: {courseDetails.maximum_marks}</Badge>
										<Badge variant="outline">External Pass Mark: {courseDetails.minimum_pass_marks}</Badge>
										<Badge variant="outline">Total Marks: {getTotalMarks()}</Badge>
									</div>
								</CardTitle>
								<CardDescription>
									{courseDetails.subject_code} - {courseDetails.subject_name}
								</CardDescription>

								{/* View Mode Indicator */}
								{isViewMode && (
									<div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
										<div className="flex items-center gap-2">
											<AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
											<span className="text-sm font-medium text-blue-800 dark:text-blue-200">
												Marks have been saved and are in read-only mode
											</span>
										</div>
									</div>
								)}
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="border rounded-lg max-h-[500px] overflow-y-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-12">#</TableHead>
												<TableHead>Dummy No</TableHead>
												<TableHead>Marks</TableHead>
												<TableHead>Marks in Words</TableHead>
												<TableHead>Result</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{students.map((student, index) => (
												<TableRow key={student.student_dummy_id}>
													<TableCell className="font-medium font-grotesk">{index + 1}</TableCell>
													<TableCell className="font-mono font-semibold font-grotesk">{student.dummy_number}</TableCell>
													<TableCell>
														<Input
															type="number"
															value={student.total_marks_obtained ?? ''}
															onChange={(e) => handleMarksChange(index, e.target.value)}
															placeholder="00"
															className={cn(
																"h-8 w-20 text-center font-mono font-grotesk",
																isViewMode && "bg-muted cursor-not-allowed"
															)}
															min={0}
															max={courseDetails.maximum_marks}
															disabled={isViewMode}
														/>
													</TableCell>
													<TableCell className="font-mono text-sm font-grotesk">{student.total_marks_in_words || '-'}</TableCell>
													<TableCell>
														<Badge
															className={cn(
																"font-medium",
																student.remarks === 'PASS'
																	? "bg-green-100 text-green-800 hover:bg-green-200"
																	: student.remarks === 'FAIL'
																		? "bg-red-100 text-red-800 hover:bg-red-200"
																		: "bg-gray-100 text-gray-600"
															)}
														>
															{student.remarks || '-'}
														</Badge>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>

								{!isViewMode && (
									<div className="flex justify-end gap-2">
										<Button
											onClick={() => {
												setStudents([])
												setSelectedPacketId('')
												setSelectedPacket(null)
												setCourseDetails(null)
												setIsViewMode(false)
											}}
											variant="outline"
										>
											Cancel
										</Button>
										<Button
											onClick={handleSaveMarks}
											disabled={saving}
										>
											<Save className="h-4 w-4 mr-2" />
											{saving ? 'Saving...' : 'Save Marks'}
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
