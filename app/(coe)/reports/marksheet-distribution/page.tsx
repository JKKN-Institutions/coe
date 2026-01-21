"use client"

import { useState, useEffect, useCallback } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AppFooter } from "@/components/layout/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/common/use-toast"
import { Loader2, FileText, Check, ChevronsUpDown, X, GraduationCap, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { generateMarksheetDistributionPDF } from "@/lib/utils/generate-marksheet-distribution-pdf"
import { useInstitutionFilter } from "@/hooks/use-institution-filter"
import { useMyJKKNInstitutionFilter } from "@/hooks/use-myjkkn-institution-filter"

interface Institution {
	id: string
	institution_code: string
	institution_name: string
	name?: string
	counselling_code?: string
	myjkkn_institution_ids?: string[] | null
}

interface Program {
	id: string
	program_code: string
	program_name: string
	program_order?: number
}

interface Semester {
	id: string
	semester_code: string
	semester_name: string
	semester_order?: number
	program_id?: string
}

export default function MarksheetDistributionPage() {
	const { toast } = useToast()

	// Institution filter hook
	const {
		isReady,
		appendToUrl,
		mustSelectInstitution,
		shouldFilter,
		institutionId: contextInstitutionId
	} = useInstitutionFilter()

	// MyJKKN data fetching hook
	const { fetchPrograms: fetchMyJKKNPrograms } = useMyJKKNInstitutionFilter()

	// Dropdown data
	const [institutions, setInstitutions] = useState<Institution[]>([])
	const [programs, setPrograms] = useState<Program[]>([])
	const [semesters, setSemesters] = useState<Semester[]>([])

	// Selected values
	const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("")
	const [selectedProgramCode, setSelectedProgramCode] = useState<string>("")
	const [selectedSemesterCode, setSelectedSemesterCode] = useState<string>("")

	// Loading states
	const [loadingInstitutions, setLoadingInstitutions] = useState(false)
	const [loadingPrograms, setLoadingPrograms] = useState(false)
	const [loadingSemesters, setLoadingSemesters] = useState(false)
	const [generatingPDF, setGeneratingPDF] = useState(false)

	// Popover open states
	const [institutionOpen, setInstitutionOpen] = useState(false)
	const [programOpen, setProgramOpen] = useState(false)
	const [semesterOpen, setSemesterOpen] = useState(false)

	// Load institutions when context is ready
	useEffect(() => {
		if (isReady) {
			fetchInstitutions()
		}
	}, [isReady])

	const fetchInstitutions = useCallback(async () => {
		try {
			setLoadingInstitutions(true)
			// Use /api/master/institutions to get myjkkn_institution_ids (same as hall-tickets)
			const url = appendToUrl('/api/master/institutions')
			const res = await fetch(url)
			if (res.ok) {
				const data = await res.json()
				// Map to include both 'name' and 'institution_name' for compatibility
				const mappedData = data.map((inst: any) => ({
					...inst,
					institution_name: inst.name || inst.institution_name
				}))
				setInstitutions(mappedData)

				// Auto-select logic
				if (mappedData.length === 1) {
					setSelectedInstitutionId(mappedData[0].id)
				} else if (shouldFilter && contextInstitutionId) {
					setSelectedInstitutionId(contextInstitutionId)
				} else if (!mustSelectInstitution && contextInstitutionId) {
					setSelectedInstitutionId(contextInstitutionId)
				}
			}
		} catch (error) {
			console.error('Error fetching institutions:', error)
		} finally {
			setLoadingInstitutions(false)
		}
	}, [appendToUrl, shouldFilter, mustSelectInstitution, contextInstitutionId])

	// Institution -> Programs (fetch from local DB)
	useEffect(() => {
		if (selectedInstitutionId) {
			setSelectedProgramCode("")
			setSelectedSemesterCode("")
			setPrograms([])
			setSemesters([])
			fetchPrograms(selectedInstitutionId)
		} else {
			setPrograms([])
			setSemesters([])
		}
	}, [selectedInstitutionId])

	const fetchPrograms = async (institutionId: string) => {
		try {
			setLoadingPrograms(true)
			setPrograms([])

			// Get institution with its myjkkn_institution_ids (same pattern as hall-tickets)
			const institution = institutions.find(inst => inst.id === institutionId)
			const myjkknIds = institution?.myjkkn_institution_ids || []

			console.log('[MarksheetDistribution] Fetching programs for institution:', institutionId, 'myjkknIds:', myjkknIds)

			if (myjkknIds.length === 0) {
				console.warn('[MarksheetDistribution] No MyJKKN institution IDs found for institution:', institutionId)
				setPrograms([])
				return
			}

			// Fetch programs from MyJKKN API using the hook (same as hall-tickets)
			const progs = await fetchMyJKKNPrograms(myjkknIds)
			console.log('[MarksheetDistribution] Programs from MyJKKN:', progs.length, progs)

			// Map to our Program interface
			const mappedPrograms: Program[] = progs.map((p: any) => ({
				id: p.id,
				program_code: p.program_code || p.program_id,
				program_name: p.program_name || p.name,
				program_order: p.program_order ?? 999
			}))

			// Sort by program_order then by program_code
			const sortedPrograms = mappedPrograms.sort((a, b) => {
				const orderA = a.program_order ?? 999
				const orderB = b.program_order ?? 999
				if (orderA !== orderB) return orderA - orderB
				return (a.program_code || '').localeCompare(b.program_code || '')
			})

			console.log('[MarksheetDistribution] Programs fetched:', sortedPrograms.length)
			setPrograms(sortedPrograms)

		} catch (error) {
			console.error('[MarksheetDistribution] Error fetching programs:', error)
			setPrograms([])
		} finally {
			setLoadingPrograms(false)
		}
	}

	// Program -> Semesters (fetch from local DB)
	useEffect(() => {
		if (selectedProgramCode && selectedInstitutionId) {
			setSelectedSemesterCode("")
			setSemesters([])
			fetchSemesters(selectedInstitutionId, selectedProgramCode)
		} else {
			setSemesters([])
		}
	}, [selectedProgramCode, selectedInstitutionId])

	const fetchSemesters = async (institutionId: string, programCode: string) => {
		try {
			setLoadingSemesters(true)

			console.log('[MarksheetDistribution] Fetching semesters for:', institutionId, programCode)

			// Fetch semesters from local database API
			const res = await fetch(`/api/reports/marksheet-distribution/semesters?institution_id=${institutionId}&program_code=${programCode}`)
			if (!res.ok) {
				throw new Error('Failed to fetch semesters')
			}

			const data = await res.json()
			const sortedSemesters = (data.semesters || []).sort((a: Semester, b: Semester) => {
				return (a.semester_order ?? 999) - (b.semester_order ?? 999)
			})

			console.log('[MarksheetDistribution] Semesters fetched:', sortedSemesters.length)
			setSemesters(sortedSemesters)

		} catch (error) {
			console.error('Error fetching semesters:', error)
			toast({
				title: "Error",
				description: "Failed to fetch semesters",
				variant: "destructive"
			})
		} finally {
			setLoadingSemesters(false)
		}
	}

	// Generate PDF Report
	const handleGeneratePDF = async () => {
		if (!selectedInstitutionId || !selectedProgramCode || !selectedSemesterCode) {
			toast({
				title: "Missing Information",
				description: "Please select Institution, Program, and Semester.",
				variant: "destructive",
			})
			return
		}

		try {
			setGeneratingPDF(true)

			const institution = institutions.find(i => i.id === selectedInstitutionId)
			const program = programs.find(p => p.program_code === selectedProgramCode)
			const semester = semesters.find(s => s.semester_code === selectedSemesterCode)

			if (!institution || !program || !semester) {
				throw new Error('Unable to find selected filter details')
			}

			// Build query parameters
			const params = new URLSearchParams({
				institution_id: selectedInstitutionId,
				program_code: selectedProgramCode,
				semester_code: selectedSemesterCode
			})

			// Fetch learner data
			const response = await fetch(`/api/reports/marksheet-distribution?${params.toString()}`)

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || 'Failed to fetch learner data')
			}

			const reportData = await response.json()

			if (!reportData.learners || reportData.learners.length === 0) {
				toast({
					title: "No Data",
					description: "No learners found for the selected criteria.",
					className: "bg-blue-50 border-blue-200 text-blue-800",
				})
				return
			}

			// Load logos
			let logoBase64: string | undefined
			let rightLogoBase64: string | undefined

			try {
				const logoResponse = await fetch('/jkkn_logo.png')
				if (logoResponse.ok) {
					const blob = await logoResponse.blob()
					logoBase64 = await new Promise<string>((resolve) => {
						const reader = new FileReader()
						reader.onloadend = () => resolve(reader.result as string)
						reader.readAsDataURL(blob)
					})
				}

				const rightLogoResponse = await fetch('/jkkncas_logo.png')
				if (rightLogoResponse.ok) {
					const blob = await rightLogoResponse.blob()
					rightLogoBase64 = await new Promise<string>((resolve) => {
						const reader = new FileReader()
						reader.onloadend = () => resolve(reader.result as string)
						reader.readAsDataURL(blob)
					})
				}
			} catch (e) {
				console.warn('Logo not loaded:', e)
			}

			// Generate PDF
			const fileName = generateMarksheetDistributionPDF({
				institutionName: institution.institution_name,
				institutionCode: institution.institution_code,
				programName: program.program_name,
				programCode: program.program_code,
				semesterName: semester.semester_name,
				semesterCode: semester.semester_code,
				learners: reportData.learners,
				logoImage: logoBase64,
				rightLogoImage: rightLogoBase64
			})

			toast({
				title: "PDF Generated",
				description: `${fileName} has been downloaded successfully (${reportData.learners.length} learners).`,
				className: "bg-green-50 border-green-200 text-green-800",
				duration: 5000,
			})

		} catch (error) {
			console.error('Error generating PDF:', error)
			const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF'
			toast({
				title: "Generation Failed",
				description: errorMessage,
				variant: "destructive",
			})
		} finally {
			setGeneratingPDF(false)
		}
	}

	// Get display values
	const selectedInstitution = institutions.find(i => i.id === selectedInstitutionId)
	const selectedProgram = programs.find(p => p.program_code === selectedProgramCode)
	const selectedSemester = semesters.find(s => s.semester_code === selectedSemesterCode)

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex flex-col min-h-screen">
				<AppHeader />

				<div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
					{/* Breadcrumb */}
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
									<Link href="#">Reports</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>Marksheet Distribution List</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>

					{/* Page Header */}
					<div className="flex flex-col">
						<h1 className="text-2xl font-bold">Marksheet Distribution List</h1>
						<p className="text-sm text-muted-foreground">
							Generate PDF list of learners for marksheet distribution
						</p>
					</div>

					{/* Filter Section */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-semibold">Select Filters</CardTitle>
							<CardDescription className="text-xs">
								Choose institution, program, and semester to generate the distribution list
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className={cn("grid gap-4", mustSelectInstitution ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2")}>
								{/* Institution */}
								{mustSelectInstitution && (
									<div className="space-y-2">
										<Label htmlFor="institution" className="text-xs font-medium">
											Institution <span className="text-red-500">*</span>
										</Label>
										<Popover open={institutionOpen} onOpenChange={setInstitutionOpen}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													role="combobox"
													aria-expanded={institutionOpen}
													className="h-9 w-full justify-between text-xs"
													disabled={loadingInstitutions}
												>
													<span className="truncate">
														{selectedInstitutionId
															? institutions.find(i => i.id === selectedInstitutionId)?.institution_code + " - " + institutions.find(i => i.id === selectedInstitutionId)?.institution_name
															: "Select institution"}
													</span>
													<div className="flex items-center gap-1 flex-shrink-0">
														{selectedInstitutionId && (
															<X
																className="h-3 w-3 opacity-50 hover:opacity-100"
																onClick={(e) => {
																	e.stopPropagation()
																	setSelectedInstitutionId("")
																	setInstitutionOpen(false)
																}}
															/>
														)}
														<ChevronsUpDown className="h-3 w-3 opacity-50" />
													</div>
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-[400px] p-0" align="start">
												<Command>
													<CommandInput placeholder="Search institution..." className="h-8 text-xs" />
													<CommandList>
														<CommandEmpty className="text-xs py-2">No institution found.</CommandEmpty>
														<CommandGroup>
															{institutions.map((inst) => (
																<CommandItem
																	key={inst.id}
																	value={`${inst.institution_code} ${inst.institution_name}`}
																	onSelect={() => {
																		setSelectedInstitutionId(inst.id)
																		setInstitutionOpen(false)
																	}}
																	className="text-xs"
																>
																	<Check
																		className={cn(
																			"mr-2 h-3 w-3",
																			selectedInstitutionId === inst.id ? "opacity-100" : "opacity-0"
																		)}
																	/>
																	{inst.institution_code} - {inst.institution_name}
																</CommandItem>
															))}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									</div>
								)}

								{/* Program */}
								<div className="space-y-2">
									<Label htmlFor="program" className="text-xs font-medium">
										Program <span className="text-red-500">*</span>
									</Label>
									<Popover open={programOpen} onOpenChange={setProgramOpen}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												aria-expanded={programOpen}
												className="h-9 w-full justify-between text-xs"
												disabled={!selectedInstitutionId || loadingPrograms}
											>
												<span className="truncate flex items-center gap-1">
													<GraduationCap className="h-3 w-3 flex-shrink-0" />
													{selectedProgramCode
														? programs.find(p => p.program_code === selectedProgramCode)?.program_code + " - " + programs.find(p => p.program_code === selectedProgramCode)?.program_name
														: "Select program"}
												</span>
												<div className="flex items-center gap-1 flex-shrink-0">
													{selectedProgramCode && (
														<X
															className="h-3 w-3 opacity-50 hover:opacity-100"
															onClick={(e) => {
																e.stopPropagation()
																setSelectedProgramCode("")
																setProgramOpen(false)
															}}
														/>
													)}
													<ChevronsUpDown className="h-3 w-3 opacity-50" />
												</div>
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[400px] p-0" align="start">
											<Command>
												<CommandInput placeholder="Search program..." className="h-8 text-xs" />
												<CommandList>
													<CommandEmpty className="text-xs py-2">No program found.</CommandEmpty>
													<CommandGroup>
														{programs.map((prog) => (
															<CommandItem
																key={prog.id}
																value={`${prog.program_code} ${prog.program_name}`}
																onSelect={() => {
																	setSelectedProgramCode(prog.program_code)
																	setProgramOpen(false)
																}}
																className="text-xs"
															>
																<Check
																	className={cn(
																		"mr-2 h-3 w-3",
																		selectedProgramCode === prog.program_code ? "opacity-100" : "opacity-0"
																	)}
																/>
																{prog.program_code} - {prog.program_name}
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
								</div>

								{/* Semester */}
								<div className="space-y-2">
									<Label htmlFor="semester" className="text-xs font-medium">
										Semester <span className="text-red-500">*</span>
									</Label>
									<Popover open={semesterOpen} onOpenChange={setSemesterOpen}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												aria-expanded={semesterOpen}
												className="h-9 w-full justify-between text-xs"
												disabled={!selectedProgramCode || loadingSemesters}
											>
												<span className="truncate flex items-center gap-1">
													<Calendar className="h-3 w-3 flex-shrink-0" />
													{selectedSemesterCode
														? semesters.find(s => s.semester_code === selectedSemesterCode)?.semester_name
														: "Select semester"}
												</span>
												<div className="flex items-center gap-1 flex-shrink-0">
													{selectedSemesterCode && (
														<X
															className="h-3 w-3 opacity-50 hover:opacity-100"
															onClick={(e) => {
																e.stopPropagation()
																setSelectedSemesterCode("")
																setSemesterOpen(false)
															}}
														/>
													)}
													<ChevronsUpDown className="h-3 w-3 opacity-50" />
												</div>
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[300px] p-0" align="start">
											<Command>
												<CommandInput placeholder="Search semester..." className="h-8 text-xs" />
												<CommandList>
													<CommandEmpty className="text-xs py-2">No semester found.</CommandEmpty>
													<CommandGroup>
														{semesters.map((sem) => (
															<CommandItem
																key={sem.semester_code}
																value={`${sem.semester_code} ${sem.semester_name}`}
																onSelect={() => {
																	setSelectedSemesterCode(sem.semester_code)
																	setSemesterOpen(false)
																}}
																className="text-xs"
															>
																<Check
																	className={cn(
																		"mr-2 h-3 w-3",
																		selectedSemesterCode === sem.semester_code ? "opacity-100" : "opacity-0"
																	)}
																/>
																{sem.semester_name}
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Active Filters Summary */}
					{selectedInstitutionId && selectedProgramCode && selectedSemesterCode && (
						<div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
							<h3 className="text-sm font-semibold mb-2">Active Filters:</h3>
							<div className="flex flex-wrap gap-2">
								{mustSelectInstitution && (
									<span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
										Institution: {selectedInstitution?.institution_code}
									</span>
								)}
								<span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
									Program: {selectedProgram?.program_code} - {selectedProgram?.program_name}
								</span>
								<span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
									Semester: {selectedSemester?.semester_name}
								</span>
							</div>
						</div>
					)}

					{/* Report Generation Card */}
					<Card className="max-w-2xl">
						<CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 pb-3">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
									<FileText className="h-5 w-5 text-white" />
								</div>
								<div>
									<CardTitle className="text-base font-semibold">Generate Marksheet Distribution List</CardTitle>
									<CardDescription className="text-xs">
										Create PDF with learner details for marksheet distribution
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-4">
							<div className="space-y-4">
								<div className="text-xs text-muted-foreground">
									<p className="mb-2">The generated PDF will include:</p>
									<ul className="list-disc list-inside space-y-1 ml-2">
										<li>S.No, Registration Number, Learner Name, DOB</li>
										<li>Columns for Original Mark Sheet, Provisional Certificate, Degree Certificate</li>
										<li>Columns for Transfer Certificate and Signature</li>
										<li>A4 size format with proper page numbers</li>
									</ul>
								</div>
								<Button
									onClick={handleGeneratePDF}
									disabled={generatingPDF || !selectedInstitutionId || !selectedProgramCode || !selectedSemesterCode}
									className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
								>
									{generatingPDF ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Generating PDF...
										</>
									) : (
										<>
											<FileText className="mr-2 h-4 w-4" />
											Generate PDF Report
										</>
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				<AppFooter />
			</SidebarInset>
		</SidebarProvider>
	)
}
