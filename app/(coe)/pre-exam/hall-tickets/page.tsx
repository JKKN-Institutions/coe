"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AppFooter } from "@/components/layout/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/common/use-toast"
import { Loader2, FileText, Check, ChevronsUpDown, Ticket, GraduationCap, Users, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { generateHallTicketPDF } from "@/lib/utils/generate-hall-ticket-pdf"
import type { HallTicketData, HallTicketApiResponse, HallTicketPdfSettings } from "@/types/hall-ticket"
import { useInstitutionFilter } from "@/hooks/use-institution-filter"

interface Institution {
	id: string
	institution_code: string
	name: string
}

interface ExaminationSession {
	id: string
	session_name: string
	session_code: string
}

interface Program {
	id: string
	program_code: string
	program_name: string
	duration_years?: number
}

// =====================================================
// MULTI-SELECT SEMESTER COMPONENT
// =====================================================

interface MultiSelectSemesterProps {
	semesters: number[]
	selectedSemesters: number[]
	onSelectionChange: (semesters: number[]) => void
	disabled?: boolean
}

function MultiSelectSemester({ semesters, selectedSemesters, onSelectionChange, disabled }: MultiSelectSemesterProps) {
	const [open, setOpen] = useState(false)

	const toggleSemester = (sem: number) => {
		if (selectedSemesters.includes(sem)) {
			onSelectionChange(selectedSemesters.filter(s => s !== sem))
		} else {
			onSelectionChange([...selectedSemesters, sem].sort((a, b) => a - b))
		}
	}

	const selectAll = () => {
		onSelectionChange([...semesters])
	}

	const clearAll = () => {
		onSelectionChange([])
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled || semesters.length === 0}
					className="w-full justify-between h-10 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30"
				>
					<span className="truncate text-amber-800 dark:text-amber-300">
						{selectedSemesters.length === 0
							? "All Semesters"
							: selectedSemesters.length === semesters.length
								? "All Semesters"
								: `Sem ${selectedSemesters.join(', ')}`}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-amber-600" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[250px] p-2" align="start">
				<div className="flex items-center justify-between mb-2 pb-2 border-b">
					<span className="text-sm font-medium">Select Semesters</span>
					<div className="flex gap-1">
						<Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs text-blue-600 hover:text-blue-700">
							All
						</Button>
						<Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs text-gray-500 hover:text-gray-700">
							Clear
						</Button>
					</div>
				</div>
				<div className="grid grid-cols-3 gap-2">
					{semesters.map(sem => (
						<div
							key={sem}
							onClick={() => toggleSemester(sem)}
							className={cn(
								"flex items-center justify-center gap-1 px-3 py-2 rounded-md cursor-pointer border text-sm",
								selectedSemesters.includes(sem)
									? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
									: "hover:bg-muted"
							)}
						>
							{selectedSemesters.includes(sem) && <Check className="h-3 w-3" />}
							Sem {sem}
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	)
}

export default function HallTicketsPage() {
	const { toast } = useToast()

	// Institution filter hook
	const {
		filter,
		isReady,
		appendToUrl,
		getInstitutionCodeForCreate,
		mustSelectInstitution,
		shouldFilter,
		institutionId
	} = useInstitutionFilter()

	// Dropdown data
	const [institutions, setInstitutions] = useState<Institution[]>([])
	const [sessions, setSessions] = useState<ExaminationSession[]>([])
	const [programs, setPrograms] = useState<Program[]>([])
	const [semesters, setSemesters] = useState<number[]>([])

	// Selected values
	const [selectedInstitutionCode, setSelectedInstitutionCode] = useState<string>("")
	const [selectedSessionId, setSelectedSessionId] = useState<string>("")
	const [selectedProgramId, setSelectedProgramId] = useState<string>("")
	const [selectedSemesters, setSelectedSemesters] = useState<number[]>([])

	// Loading states
	const [loadingInstitutions, setLoadingInstitutions] = useState(false)
	const [loadingSessions, setLoadingSessions] = useState(false)
	const [loadingPrograms, setLoadingPrograms] = useState(false)
	const [generating, setGenerating] = useState(false)

	// Preview data
	const [previewData, setPreviewData] = useState<HallTicketData | null>(null)
	const [studentCount, setStudentCount] = useState<number>(0)

	// Popover open states
	const [institutionOpen, setInstitutionOpen] = useState(false)
	const [sessionOpen, setSessionOpen] = useState(false)
	const [programOpen, setProgramOpen] = useState(false)

	// Load institutions on mount and auto-fill from context
	useEffect(() => {
		if (isReady) {
			fetchInstitutions()
		}
	}, [isReady])

	// Auto-fill institution from context when available
	useEffect(() => {
		if (isReady && !mustSelectInstitution && institutions.length > 0) {
			const autoCode = getInstitutionCodeForCreate()
			if (autoCode && !selectedInstitutionCode) {
				setSelectedInstitutionCode(autoCode)
			}
		}
	}, [isReady, mustSelectInstitution, institutions, getInstitutionCodeForCreate, selectedInstitutionCode])

	const fetchInstitutions = async () => {
		try {
			setLoadingInstitutions(true)
			const url = appendToUrl('/api/master/institutions')
			const res = await fetch(url)
			if (res.ok) {
				const data = await res.json()
				setInstitutions(data)

				// Auto-select if only one institution
				if (data.length === 1) {
					setSelectedInstitutionCode(data[0].institution_code)
				}
			}
		} catch (error) {
			console.error('Error fetching institutions:', error)
		} finally {
			setLoadingInstitutions(false)
		}
	}

	// Institution → Sessions
	useEffect(() => {
		if (selectedInstitutionCode) {
			setSelectedSessionId("")
			setSelectedProgramId("")
			setSelectedSemesters([])
			setSessions([])
			setPrograms([])
			setSemesters([])
			setPreviewData(null)
			setStudentCount(0)
			fetchSessions()
		} else {
			setSessions([])
		}
	}, [selectedInstitutionCode])

	const fetchSessions = async () => {
		try {
			setLoadingSessions(true)
			const url = appendToUrl('/api/exam-management/examination-sessions')
			const res = await fetch(url)
			if (res.ok) {
				const data = await res.json()
				// Filter by institution if needed
				const filtered = selectedInstitutionCode
					? data.filter((s: any) => !s.institution_code || s.institution_code === selectedInstitutionCode)
					: data
				setSessions(filtered)
			}
		} catch (error) {
			console.error('Error fetching sessions:', error)
		} finally {
			setLoadingSessions(false)
		}
	}

	// Session → Programs
	useEffect(() => {
		if (selectedSessionId) {
			setSelectedProgramId("")
			setSelectedSemesters([])
			setPrograms([])
			setSemesters([])
			setPreviewData(null)
			setStudentCount(0)
			fetchPrograms()
		} else {
			setPrograms([])
		}
	}, [selectedSessionId])

	const fetchPrograms = async () => {
		try {
			setLoadingPrograms(true)
			const res = await fetch(`/api/master/programs?institution_code=${selectedInstitutionCode}`)
			if (res.ok) {
				const data = await res.json()
				setPrograms(data)
			}
		} catch (error) {
			console.error('Error fetching programs:', error)
		} finally {
			setLoadingPrograms(false)
		}
	}

	// Program → Semesters (generate semester numbers based on program duration)
	useEffect(() => {
		if (selectedProgramId) {
			setSelectedSemesters([])
			setPreviewData(null)
			setStudentCount(0)
			generateSemesterNumbers()
		} else {
			setSemesters([])
		}
	}, [selectedProgramId])

	// Generate semester numbers based on selected program's duration
	const generateSemesterNumbers = () => {
		const selectedProgram = programs.find(p => p.id === selectedProgramId)
		// Default to 4 years (8 semesters) if duration not available
		const durationYears = selectedProgram?.duration_years || 4
		const totalSemesters = durationYears * 2
		const semesterNumbers = Array.from({ length: totalSemesters }, (_, i) => i + 1)
		setSemesters(semesterNumbers)
	}

	// Handle semester selection change
	const handleSemesterChange = (newSelection: number[]) => {
		setSelectedSemesters(newSelection)
		setPreviewData(null)
		setStudentCount(0)
	}

	// Fetch hall ticket data
	const fetchHallTicketData = async (): Promise<HallTicketData | null> => {
		try {
			const params = new URLSearchParams()
			params.append('institution_code', selectedInstitutionCode)
			params.append('examination_session_id', selectedSessionId)

			if (selectedProgramId) {
				params.append('program_id', selectedProgramId)
			}

			// Pass semester numbers instead of IDs
			if (selectedSemesters.length > 0) {
				params.append('semester_ids', selectedSemesters.join(','))
			}

			const res = await fetch(`/api/pre-exam/hall-tickets?${params.toString()}`)
			const result: HallTicketApiResponse = await res.json()

			if (!result.success) {
				throw new Error(result.error || 'Failed to fetch hall ticket data')
			}

			setStudentCount(result.student_count || 0)
			return result.data || null
		} catch (error) {
			console.error('Error fetching hall ticket data:', error)
			throw error
		}
	}

	// Generate and download PDF
	const handleGeneratePDF = async () => {
		if (!selectedInstitutionCode || !selectedSessionId || !selectedProgramId) {
			toast({
				title: "Missing Selection",
				description: "Please select institution, examination session, and program",
				variant: "destructive"
			})
			return
		}

		try {
			setGenerating(true)

			// Fetch data
			const data = await fetchHallTicketData()

			if (!data || data.students.length === 0) {
				toast({
					title: "No Data",
					description: "No students found matching the criteria",
					variant: "destructive"
				})
				return
			}

			setPreviewData(data)

			// Fetch logo images as base64
			let logoImage: string | undefined
			let rightLogoImage: string | undefined

			if (data.institution.logo_url) {
				try {
					const logoRes = await fetch(data.institution.logo_url)
					const logoBlob = await logoRes.blob()
					logoImage = await blobToBase64(logoBlob)
				} catch (e) {
					console.warn('Failed to load logo:', e)
				}
			}

			if (data.institution.secondary_logo_url) {
				try {
					const rightLogoRes = await fetch(data.institution.secondary_logo_url)
					const rightLogoBlob = await rightLogoRes.blob()
					rightLogoImage = await blobToBase64(rightLogoBlob)
				} catch (e) {
					console.warn('Failed to load secondary logo:', e)
				}
			}

			// Create PDF settings
			const settings: HallTicketPdfSettings = {
				institution_name: data.institution.institution_name,
				institution_code: data.institution.institution_code,
				accreditation_text: data.institution.accreditation_text,
				address: data.institution.address,
				logo_url: data.institution.logo_url,
				secondary_logo_url: data.institution.secondary_logo_url,
				primary_color: data.institution.primary_color,
				secondary_color: data.institution.secondary_color,
			}

			// Add logo images to data
			const dataWithLogos: HallTicketData = {
				...data,
				logoImage,
				rightLogoImage
			}

			// Generate PDF
			const fileName = generateHallTicketPDF({
				data: dataWithLogos,
				settings
			})

			toast({
				title: "PDF Generated",
				description: `Hall tickets for ${data.students.length} student(s) downloaded as ${fileName}`,
				className: "bg-green-50 border-green-200 text-green-800"
			})
		} catch (error) {
			console.error('Error generating PDF:', error)
			toast({
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to generate PDF",
				variant: "destructive"
			})
		} finally {
			setGenerating(false)
		}
	}

	// Helper to convert blob to base64
	const blobToBase64 = (blob: Blob): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => resolve(reader.result as string)
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
	}

	// Get selected values
	const selectedInstitution = institutions.find(i => i.institution_code === selectedInstitutionCode)
	const selectedSession = sessions.find(s => s.id === selectedSessionId)
	const selectedProgram = programs.find(p => p.id === selectedProgramId)

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
										<Link href="/pre-exam">Pre-Exam</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage>Hall Tickets</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
						{/* Header */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-4">
								<div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
									<Ticket className="h-6 w-6 text-white" />
								</div>
								<div>
									<h1 className="text-2xl font-bold tracking-tight">Hall Ticket Generation</h1>
									<p className="text-muted-foreground">Generate and download student hall tickets for examinations</p>
								</div>
							</div>
							<Button
								onClick={handleGeneratePDF}
								disabled={!selectedInstitutionCode || !selectedSessionId || !selectedProgramId || generating}
								className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
							>
								{generating ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Download className="mr-2 h-4 w-4" />
								)}
								Generate Hall Tickets
							</Button>
						</div>

						{/* Select Parameters Card */}
						<Card className="border-0 shadow-sm">
							<CardHeader className="pb-4">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
										<GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
									</div>
									<div>
										<CardTitle className="text-lg">Select Parameters</CardTitle>
										<CardDescription>Choose institution, session, program and semester</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{/* Horizontal Filter Row */}
								<div className={`grid grid-cols-1 gap-4 ${mustSelectInstitution ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
									{/* Institution - Show only when mustSelectInstitution is true */}
									{mustSelectInstitution && (
										<div className="space-y-2">
											<Label className="text-sm font-medium">
												Institution <span className="text-red-500">*</span>
											</Label>
											<Popover open={institutionOpen} onOpenChange={setInstitutionOpen}>
												<PopoverTrigger asChild>
													<Button
														variant="outline"
														role="combobox"
														aria-expanded={institutionOpen}
														className="w-full justify-between h-10 bg-white dark:bg-gray-950"
														disabled={loadingInstitutions}
													>
														{loadingInstitutions ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : selectedInstitution ? (
															<span className="truncate text-left">{selectedInstitution.institution_code} - {selectedInstitution.name.substring(0, 15)}...</span>
														) : (
															<span className="text-muted-foreground">Select institution...</span>
														)}
														<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
													</Button>
												</PopoverTrigger>
												<PopoverContent className="w-[300px] p-0" align="start">
													<Command
														filter={(value, search) => {
															if (!search) return 1
															const searchLower = search.toLowerCase()
															const valueLower = value.toLowerCase()
															return valueLower.includes(searchLower) ? 1 : 0
														}}
													>
														<CommandInput placeholder="Search institution..." />
														<CommandList>
															<CommandEmpty>No institution found.</CommandEmpty>
															<CommandGroup>
																{institutions.map((inst) => (
																	<CommandItem
																		key={inst.id}
																		value={`${inst.institution_code} ${inst.name}`}
																		onSelect={() => {
																			setSelectedInstitutionCode(inst.institution_code)
																			setInstitutionOpen(false)
																		}}
																	>
																		<Check
																			className={cn(
																				"mr-2 h-4 w-4",
																				selectedInstitutionCode === inst.institution_code ? "opacity-100" : "opacity-0"
																			)}
																		/>
																		<span className="truncate">{inst.institution_code} - {inst.name}</span>
																	</CommandItem>
																))}
															</CommandGroup>
														</CommandList>
													</Command>
												</PopoverContent>
											</Popover>
										</div>
									)}

									{/* Examination Session */}
									<div className="space-y-2">
										<Label className="text-sm font-medium">
											Examination Session <span className="text-red-500">*</span>
										</Label>
										<Popover open={sessionOpen} onOpenChange={setSessionOpen}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													role="combobox"
													aria-expanded={sessionOpen}
													className="w-full justify-between h-10 bg-white dark:bg-gray-950"
													disabled={!selectedInstitutionCode || loadingSessions}
												>
													{loadingSessions ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : selectedSession ? (
														<span className="truncate text-left">{selectedSession.session_code || selectedSession.session_name.substring(0, 20)}...</span>
													) : (
														<span className="text-muted-foreground">Select session...</span>
													)}
													<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-[300px] p-0" align="start">
												<Command
													filter={(value, search) => {
														if (!search) return 1
														const searchLower = search.toLowerCase()
														const valueLower = value.toLowerCase()
														return valueLower.includes(searchLower) ? 1 : 0
													}}
												>
													<CommandInput placeholder="Search session..." />
													<CommandList>
														<CommandEmpty>No session found.</CommandEmpty>
														<CommandGroup>
															{sessions.map((sess) => (
																<CommandItem
																	key={sess.id}
																	value={`${sess.session_code} ${sess.session_name}`}
																	onSelect={() => {
																		setSelectedSessionId(sess.id)
																		setSessionOpen(false)
																	}}
																>
																	<Check
																		className={cn(
																			"mr-2 h-4 w-4",
																			selectedSessionId === sess.id ? "opacity-100" : "opacity-0"
																		)}
																	/>
																	{sess.session_name}
																</CommandItem>
															))}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									</div>

									{/* Program with Badge */}
									<div className="space-y-2">
										<Label className="text-sm font-medium">
											Program(s) <span className="text-red-500">*</span>
										</Label>
										<Popover open={programOpen} onOpenChange={setProgramOpen}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													role="combobox"
													aria-expanded={programOpen}
													className="w-full justify-between h-10 bg-white dark:bg-gray-950"
													disabled={!selectedSessionId || loadingPrograms}
												>
													{loadingPrograms ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : selectedProgram ? (
														<Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100">
															{selectedProgram.program_code}
														</Badge>
													) : (
														<span className="text-muted-foreground">Select program...</span>
													)}
													<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-[350px] p-0" align="start">
												<Command
													filter={(value, search) => {
														if (!search) return 1
														const searchLower = search.toLowerCase()
														const valueLower = value.toLowerCase()
														return valueLower.includes(searchLower) ? 1 : 0
													}}
												>
													<CommandInput placeholder="Search program..." />
													<CommandList>
														<CommandEmpty>No program found.</CommandEmpty>
														<CommandGroup>
															{programs.map((prog) => (
																<CommandItem
																	key={prog.id}
																	value={`${prog.program_code} ${prog.program_name}`}
																	onSelect={() => {
																		setSelectedProgramId(prog.id)
																		setProgramOpen(false)
																	}}
																>
																	<Check
																		className={cn(
																			"mr-2 h-4 w-4",
																			selectedProgramId === prog.id ? "opacity-100" : "opacity-0"
																		)}
																	/>
																	<span className="truncate">{prog.program_code} - {prog.program_name}</span>
																</CommandItem>
															))}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									</div>

									{/* Semester Dropdown */}
									<div className="space-y-2">
										<Label className="text-sm font-medium">Semester(s)</Label>
										<MultiSelectSemester
											semesters={semesters}
											selectedSemesters={selectedSemesters}
											onSelectionChange={handleSemesterChange}
											disabled={!selectedProgramId}
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Preview Section */}
						{previewData && (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Users className="h-5 w-5 text-green-500" />
										Preview ({studentCount} Students)
									</CardTitle>
									<CardDescription>
										The following students will have hall tickets generated
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="max-h-96 overflow-y-auto rounded-lg border">
										<table className="w-full text-sm">
											<thead className="sticky top-0 bg-muted">
												<tr>
													<th className="px-4 py-3 text-left font-medium">S.No</th>
													<th className="px-4 py-3 text-left font-medium">Register No</th>
													<th className="px-4 py-3 text-left font-medium">Student Name</th>
													<th className="px-4 py-3 text-left font-medium">Program</th>
													<th className="px-4 py-3 text-center font-medium">Subjects</th>
												</tr>
											</thead>
											<tbody>
												{previewData.students.map((student, index) => (
													<tr key={index} className="border-t hover:bg-muted/50">
														<td className="px-4 py-3">{index + 1}</td>
														<td className="px-4 py-3 font-mono text-xs">{student.register_number}</td>
														<td className="px-4 py-3">{student.student_name}</td>
														<td className="px-4 py-3">{student.program}</td>
														<td className="px-4 py-3 text-center">
															<Badge variant="secondary">{student.subjects.length}</Badge>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Info Card */}
						<Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
							<CardContent className="pt-6">
								<div className="flex gap-4">
									<div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
										<FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
									</div>
									<div>
										<h4 className="font-semibold text-blue-800 dark:text-blue-200">Hall Ticket Format</h4>
										<ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
											<li>• One student per page with automatic page breaks</li>
											<li>• Includes student photo, program, and date of birth</li>
											<li>• Examination schedule with subject codes and timings</li>
											<li>• FN (Forenoon): 10:00 AM to 01:00 PM</li>
											<li>• AN (Afternoon): 02:00 PM to 05:00 PM</li>
											<li>• Signature sections for student and authorities</li>
										</ul>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				<AppFooter />
			</SidebarInset>
		</SidebarProvider>
	)
}
