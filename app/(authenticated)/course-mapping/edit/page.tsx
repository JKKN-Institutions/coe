"use client"

import { useMemo, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ArrowLeft, Save, RefreshCw, Calendar, Plus, X, FileText } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { generateCourseMappingPDF } from "@/lib/utils/generate-course-mapping-pdf"

type CourseMapping = {
	id?: string
	course_id: string
	institution_code: string
	program_code: string
	batch_code: string
	regulation_code: string
	regulation_id?: string
	semester_code: string
	course_group?: string
	course_category?: string
	course_order?: number
	internal_max_mark?: number
	internal_pass_mark?: number
	internal_converted_mark?: number
	external_max_mark?: number
	external_pass_mark?: number
	external_converted_mark?: number
	total_pass_mark?: number
	total_max_mark?: number
	annual_semester?: boolean
	registration_based?: boolean
	is_active?: boolean
	created_at?: string
}

type Semester = {
	id: string
	semester_code: string
	semester_name: string
	semester_number: number
	program_id?: string
}

type SemesterTableData = {
	semester: Semester
	mappings: CourseMapping[]
	isOpen: boolean
}

const COURSE_GROUPS = [
	{ value: "General", label: "General" },
	{ value: "Elective - I", label: "Elective - I" },
	{ value: "Elective - II", label: "Elective - II" },
	{ value: "Elective - III", label: "Elective - III" },
	{ value: "Elective - IV", label: "Elective - IV" },
	{ value: "Elective - V", label: "Elective - V" },
	{ value: "Elective - VI", label: "Elective - VI" }
]

export default function CourseMappingEditPage() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)
	const { toast } = useToast()

	// Get URL parameters
	const institutionParam = searchParams.get('institution')
	const programParam = searchParams.get('program')
	const regulationParam = searchParams.get('regulation')
	const batchParam = searchParams.get('batch')

	// Parent form state (locked - not editable)
	const [selectedInstitution, setSelectedInstitution] = useState(institutionParam || "")
	const [selectedProgram, setSelectedProgram] = useState(programParam || "")
	const [selectedBatch, setSelectedBatch] = useState(batchParam || "")
	const [selectedRegulation, setSelectedRegulation] = useState(regulationParam || "")
	const [selectedOfferingDepartment, setSelectedOfferingDepartment] = useState("")

	// Display names for locked fields
	const [institutionName, setInstitutionName] = useState("")
	const [programName, setProgramName] = useState("")
	const [batchName, setBatchName] = useState("")
	const [regulationName, setRegulationName] = useState("")

	// Dropdown data states
	const [courses, setCourses] = useState<any[]>([])
	const [semesters, setSemesters] = useState<Semester[]>([])

	// Semester tables data
	const [semesterTables, setSemesterTables] = useState<SemesterTableData[]>([])

	// Select all states
	const [selectAllRegistration, setSelectAllRegistration] = useState<{ [key: string]: boolean }>({})
	const [selectAllStatus, setSelectAllStatus] = useState<{ [key: string]: boolean }>({})

	// Existing mappings
	const [existingMappings, setExistingMappings] = useState<CourseMapping[]>([])

	// Popover open state
	const [openPopovers, setOpenPopovers] = useState<{ [key: string]: boolean }>({})

	// Fetch initial data on mount
	useEffect(() => {
		if (!institutionParam || !programParam || !regulationParam || !batchParam) {
			toast({
				title: '⚠️ Missing Parameters',
				description: 'Required parameters are missing. Redirecting to index page...',
				variant: 'destructive'
			})
			setTimeout(() => router.push('/course-mapping-index'), 2000)
			return
		}

		// Fetch all required data
		fetchInstitutionName(institutionParam)
		fetchProgramData(programParam)
		fetchRegulationName(regulationParam)
		fetchBatchName(batchParam)
		fetchSemesters(programParam)
		fetchCourses(institutionParam, programParam, regulationParam)
	}, [institutionParam, programParam, regulationParam, batchParam])

	// Load existing mappings when semesters are loaded
	useEffect(() => {
		if (semesters.length > 0 && selectedInstitution && selectedProgram && selectedBatch && selectedRegulation) {
			loadExistingMappings()
		}
	}, [semesters, selectedInstitution, selectedProgram, selectedBatch, selectedRegulation])

	const fetchInstitutionName = async (code: string) => {
		try {
			const res = await fetch(`/api/institutions?institution_code=${code}`)
			if (res.ok) {
				const data = await res.json()
				if (data.length > 0) {
					setInstitutionName(data[0].name)
				}
			}
		} catch (err) {
			console.error('Error fetching institution:', err)
		}
	}

	const fetchProgramData = async (code: string) => {
		try {
			const res = await fetch(`/api/program?program_code=${code}`)
			if (res.ok) {
				const data = await res.json()
				if (data.length > 0) {
					setProgramName(data[0].program_name)
					setSelectedOfferingDepartment(data[0].offering_department_code || "")
				}
			}
		} catch (err) {
			console.error('Error fetching program:', err)
		}
	}

	const fetchRegulationName = async (code: string) => {
		try {
			const res = await fetch(`/api/regulations?regulation_code=${code}`)
			if (res.ok) {
				const data = await res.json()
				if (data.length > 0) {
					setRegulationName(data[0].regulation_name)
				}
			}
		} catch (err) {
			console.error('Error fetching regulation:', err)
		}
	}

	const fetchBatchName = async (code: string) => {
		try {
			const res = await fetch(`/api/batch?batch_code=${code}`)
			if (res.ok) {
				const data = await res.json()
				if (data.length > 0) {
					setBatchName(data[0].batch_name)
				}
			}
		} catch (err) {
			console.error('Error fetching batch:', err)
		}
	}

	const fetchSemesters = async (programCode: string) => {
		try {
			const res = await fetch(`/api/semesters?program_code=${programCode}`)
			if (res.ok) {
				const data = await res.json()
				setSemesters(data)

				// Initialize semester tables
				const tables: SemesterTableData[] = data.map((sem: Semester) => ({
					semester: sem,
					mappings: [],
					isOpen: false
				}))
				setSemesterTables(tables)
			}
		} catch (err) {
			console.error('Error fetching semesters:', err)
		}
	}

	const fetchCourses = async (institutionCode: string, programCode: string, regulationCode: string) => {
		try {
			let url = `/api/courses?institution_code=${institutionCode}`
			if (regulationCode) {
				url += `&regulation_code=${regulationCode}`
			}
			const res = await fetch(url)
			if (res.ok) {
				const data = await res.json()
				setCourses(data)
			}
		} catch (err) {
			console.error('Error fetching courses:', err)
		}
	}

	const loadExistingMappings = async () => {
		try {
			setLoading(true)
			const res = await fetch(`/api/course-mapping?institution_code=${selectedInstitution}&program_code=${selectedProgram}&batch_code=${selectedBatch}&regulation_code=${selectedRegulation}`)

			if (res.ok) {
				const data = await res.json()
				setExistingMappings(data)

				// Organize mappings by semester
				const updatedTables = semesterTables.map(table => {
					const semesterMappings = data.filter((m: CourseMapping) => m.semester_code === table.semester.semester_code)
					return {
						...table,
						mappings: semesterMappings.length > 0 ? semesterMappings : [{
							course_id: "",
							institution_code: selectedInstitution,
							program_code: selectedProgram,
							batch_code: selectedBatch,
							regulation_code: selectedRegulation,
							semester_code: table.semester.semester_code,
							course_group: "General",
							course_order: 1,
							internal_max_mark: 40,
							internal_pass_mark: 14,
							internal_converted_mark: 25,
							external_max_mark: 60,
							external_pass_mark: 26,
							external_converted_mark: 75,
							total_max_mark: 100,
							total_pass_mark: 40,
							annual_semester: false,
							registration_based: false,
							is_active: true
						}],
						isOpen: semesterMappings.length > 0
					}
				})

				setSemesterTables(updatedTables)
			}
		} catch (err) {
			console.error('Error loading existing mappings:', err)
			toast({
				title: '❌ Error',
				description: 'Failed to load existing course mappings.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}

	const addCourseRow = (semesterIndex: number) => {
		const newRow: CourseMapping = {
			course_id: "",
			institution_code: selectedInstitution,
			program_code: selectedProgram,
			batch_code: selectedBatch,
			regulation_code: selectedRegulation,
			semester_code: semesterTables[semesterIndex].semester.semester_code,
			course_group: "General",
			course_category: "",
			course_order: semesterTables[semesterIndex].mappings.length + 1,
			internal_max_mark: 40,
			internal_pass_mark: 14,
			internal_converted_mark: 25,
			external_max_mark: 60,
			external_pass_mark: 26,
			external_converted_mark: 75,
			total_max_mark: 100,
			total_pass_mark: 40,
			annual_semester: false,
			registration_based: false,
			is_active: true
		}

		const updated = [...semesterTables]
		updated[semesterIndex].mappings.push(newRow)
		setSemesterTables(updated)
	}

	const removeCourseRow = async (semesterIndex: number, rowIndex: number) => {
		const updated = [...semesterTables]
		const mappingToRemove = updated[semesterIndex].mappings[rowIndex]

		if (mappingToRemove.id && mappingToRemove.course_id) {
			const courseName = courses.find(c => c.id === mappingToRemove.course_id)?.course_title || 'this course'
			const confirmDelete = window.confirm(`Are you sure you want to delete the mapping for "${courseName}"?`)

			if (!confirmDelete) return
		}

		if (mappingToRemove.id) {
			try {
				const deleteRes = await fetch(`/api/course-mapping?id=${mappingToRemove.id}`, {
					method: 'DELETE'
				})

				if (!deleteRes.ok) {
					const error = await deleteRes.json()
					toast({
						title: '❌ Delete Failed',
						description: error.error || 'Failed to delete course mapping.',
						variant: 'destructive'
					})
					return
				}

				toast({
					title: '✅ Deleted',
					description: 'Course mapping removed successfully.',
					className: 'bg-green-50 border-green-200 text-green-800'
				})
			} catch (err) {
				toast({
					title: '❌ Network Error',
					description: 'Failed to connect to server.',
					variant: 'destructive'
				})
				return
			}
		}

		updated[semesterIndex].mappings.splice(rowIndex, 1)
		setSemesterTables(updated)

		if (mappingToRemove.id) {
			setExistingMappings(prev => prev.filter(m => m.id !== mappingToRemove.id))
		}
	}

	const updateCourseRow = (semesterIndex: number, rowIndex: number, field: string, value: any) => {
		const updated = [...semesterTables]
		updated[semesterIndex].mappings[rowIndex] = {
			...updated[semesterIndex].mappings[rowIndex],
			[field]: value
		}

		if (field === 'course_id' && value) {
			const course = courses.find(c => c.id === value)
			if (course) {
				updated[semesterIndex].mappings[rowIndex].course_category = course.course_category || course.course_type || ''
			}
		}

		setSemesterTables(updated)
	}

	const toggleSemesterTable = (semesterIndex: number) => {
		const updated = [...semesterTables]
		updated[semesterIndex].isOpen = !updated[semesterIndex].isOpen
		setSemesterTables(updated)
	}

	const toggleAllRegistration = (semesterIndex: number) => {
		const key = `semester_${semesterIndex}`
		const newValue = !selectAllRegistration[key]

		setSelectAllRegistration({ ...selectAllRegistration, [key]: newValue })

		const updated = [...semesterTables]
		updated[semesterIndex].mappings = updated[semesterIndex].mappings.map(m => ({
			...m,
			registration_based: newValue
		}))
		setSemesterTables(updated)
	}

	const toggleAllStatus = (semesterIndex: number) => {
		const key = `semester_${semesterIndex}`
		const newValue = !selectAllStatus[key]

		setSelectAllStatus({ ...selectAllStatus, [key]: newValue })

		const updated = [...semesterTables]
		updated[semesterIndex].mappings = updated[semesterIndex].mappings.map(m => ({
			...m,
			is_active: newValue
		}))
		setSemesterTables(updated)
	}

	const saveAllMappings = async () => {
		try {
			setSaving(true)

			// Collect all mappings
			const allMappings = []
			for (const table of semesterTables) {
				for (const mapping of table.mappings) {
					if (mapping.course_id) {
						allMappings.push({
							...mapping,
							institution_code: selectedInstitution,
							program_code: selectedProgram,
							batch_code: selectedBatch,
							regulation_code: selectedRegulation
						})
					}
				}
			}

			if (allMappings.length === 0) {
				toast({
					title: '⚠️ No Courses Selected',
					description: 'Please select at least one course to map.',
					variant: 'destructive'
				})
				return
			}

			// Delete existing mappings first
			if (existingMappings.length > 0) {
				for (const existing of existingMappings) {
					if (existing.id) {
						await fetch(`/api/course-mapping?id=${existing.id}`, {
							method: 'DELETE'
						})
					}
				}
			}

			// Save new mappings
			const res = await fetch('/api/course-mapping', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bulk: true,
					mappings: allMappings
				})
			})

			if (res.ok) {
				const result = await res.json()

				if (result.errors && result.errors.length > 0) {
					toast({
						title: '⚠️ Partial Success',
						description: `Saved ${result.successful.length} mappings, ${result.errors.length} failed.`,
						variant: 'destructive'
					})
				} else {
					toast({
						title: '✅ Success',
						description: `All ${allMappings.length} course mappings saved successfully.`,
						className: 'bg-green-50 border-green-200 text-green-800'
					})
					await loadExistingMappings()
				}
			} else {
				const error = await res.json()
				toast({
					title: '❌ Save Failed',
					description: error.error || 'Failed to save mappings',
					variant: 'destructive'
				})
			}
		} catch (err: any) {
			toast({
				title: '❌ Error',
				description: err.message || 'An unexpected error occurred.',
				variant: 'destructive'
			})
		} finally {
			setSaving(false)
		}
	}

	const handleGeneratePDF = async () => {
		try {
			setLoading(true)

			const url = `/api/course-mapping/report?institution_code=${selectedInstitution}&program_code=${selectedProgram}&batch_code=${selectedBatch}&regulation_code=${selectedRegulation}`

			const response = await fetch(url)

			if (!response.ok) {
				throw new Error('Failed to fetch report data')
			}

			const reportData = await response.json()

			if (!reportData.mappings || reportData.mappings.length === 0) {
				toast({
					title: '⚠️ No Data',
					description: 'No course mappings found.',
					variant: 'destructive'
				})
				return
			}

			generateCourseMappingPDF(reportData)

			toast({
				title: '✅ PDF Generated',
				description: 'Course mapping report downloaded successfully.',
				className: 'bg-green-50 border-green-200 text-green-800'
			})
		} catch (error) {
			toast({
				title: '❌ Generation Failed',
				description: 'Failed to generate PDF report.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex flex-col min-h-screen">
				<AppHeader />
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0 relative z-0">
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
										<Link href="/course-mapping-index">Course Mapping Index</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage>Edit Mapping</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					{/* Header Card with Locked Fields */}
					<Card>
						<CardHeader className="p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<Button
										size="sm"
										asChild
										className="bg-green-600 hover:bg-green-700 text-white"
									>
										<Link href="/course-mapping-index">
											<ArrowLeft className="h-4 w-4 mr-2" />
											Back to Index
										</Link>
									</Button>
									<div className="h-8 w-px bg-border" />
									<div>
										<h2 className="text-lg font-semibold">Edit Course Mapping</h2>
										<p className="text-sm text-muted-foreground">Manage course mappings for selected program and batch</p>
									</div>
								</div>
								<div className="flex gap-2">
									<Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={loading}>
										<FileText className="h-4 w-4 mr-2" />
										Generate PDF
									</Button>
									<Button variant="outline" size="sm" onClick={loadExistingMappings} disabled={loading}>
										<RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
									<Button size="sm" onClick={saveAllMappings} disabled={saving || loading}>
										<Save className="h-4 w-4 mr-2" />
										{saving ? 'Saving...' : 'Save All'}
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-4 pt-0">
							{/* Locked Selection Display */}
							<div className="bg-muted/50 border rounded-lg p-4">
								<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
									<div>
										<Label className="text-xs text-muted-foreground">Institution</Label>
										<p className="font-medium mt-1">{institutionName || selectedInstitution}</p>
										<p className="text-xs text-muted-foreground">{selectedInstitution}</p>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">Program</Label>
										<p className="font-medium mt-1">{programName || selectedProgram}</p>
										<p className="text-xs text-muted-foreground">{selectedProgram}</p>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">Regulation</Label>
										<p className="font-medium mt-1">{regulationName || selectedRegulation}</p>
										<p className="text-xs text-muted-foreground">{selectedRegulation}</p>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">Batch</Label>
										<p className="font-medium mt-1">{batchName || selectedBatch}</p>
										<p className="text-xs text-muted-foreground">{selectedBatch}</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Semester Tables */}
					{semesterTables.length > 0 && (
						<div className="space-y-4 relative">
							{courses.length > 0 && (
								<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
									<div className="flex items-center justify-between">
										<span className="text-sm text-blue-600 dark:text-blue-400">
											{courses.length} course{courses.length !== 1 ? 's' : ''} available for selection
										</span>
									</div>
								</div>
							)}

							{semesterTables.map((table, semIndex) => (
								<Card key={table.semester.id}>
									<CardHeader className="p-4">
										<Collapsible open={table.isOpen} onOpenChange={() => toggleSemesterTable(semIndex)}>
											<CollapsibleTrigger asChild>
												<div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors">
													<div className="flex items-center gap-3">
														<Button variant="ghost" size="sm" className="h-6 w-6 p-0">
															{table.isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
														</Button>
														<Calendar className="h-5 w-5 text-primary" />
														<h3 className="text-lg font-semibold">{table.semester.semester_name}</h3>
														<Badge variant="outline" className="ml-2">
															{table.mappings.filter(m => m.course_id).length} courses mapped
														</Badge>
													</div>
													<Button
														size="sm"
														variant="outline"
														onClick={(e) => {
															e.stopPropagation()
															addCourseRow(semIndex)
														}}
													>
														<Plus className="h-3 w-3 mr-1" />
														Add Course
													</Button>
												</div>
											</CollapsibleTrigger>

											<CollapsibleContent>
												<div className="mt-6 border rounded-lg bg-background shadow-sm">
													<div className="overflow-x-auto overflow-y-auto max-h-[500px]">
														<Table>
															<TableHeader className="sticky top-0 z-[5] bg-muted/95 backdrop-blur-sm">
																<TableRow>
																	<TableHead className="w-[50px]">#</TableHead>
																	<TableHead className="w-[180px]">Course Code</TableHead>
																	<TableHead className="w-[220px]">Course Name</TableHead>
																	<TableHead className="w-[150px]">Category</TableHead>
																	<TableHead className="w-[120px]">Group</TableHead>
																	<TableHead className="w-[80px]">Order</TableHead>
																	<TableHead className="text-center" colSpan={3}>Internal Marks</TableHead>
																	<TableHead className="text-center" colSpan={3}>External Marks</TableHead>
																	<TableHead className="text-center" colSpan={2}>Total</TableHead>
																	<TableHead className="text-center w-[100px]">Annual</TableHead>
																	<TableHead className="text-center w-[120px]">
																		<div className="flex flex-col items-center gap-1">
																			<span>Registration</span>
																			<Checkbox
																				checked={selectAllRegistration[`semester_${semIndex}`] || false}
																				onCheckedChange={() => toggleAllRegistration(semIndex)}
																			/>
																		</div>
																	</TableHead>
																	<TableHead className="text-center w-[100px]">
																		<div className="flex flex-col items-center gap-1">
																			<span>Active</span>
																			<Checkbox
																				checked={selectAllStatus[`semester_${semIndex}`] !== false}
																				onCheckedChange={() => toggleAllStatus(semIndex)}
																			/>
																		</div>
																	</TableHead>
																	<TableHead className="w-[80px]">Action</TableHead>
																</TableRow>
																<TableRow>
																	<TableHead></TableHead>
																	<TableHead></TableHead>
																	<TableHead></TableHead>
																	<TableHead></TableHead>
																	<TableHead></TableHead>
																	<TableHead></TableHead>
																	<TableHead className="text-xs text-center">Pass</TableHead>
																	<TableHead className="text-xs text-center">Max</TableHead>
																	<TableHead className="text-xs text-center">Convert</TableHead>
																	<TableHead className="text-xs text-center">Pass</TableHead>
																	<TableHead className="text-xs text-center">Max</TableHead>
																	<TableHead className="text-xs text-center">Convert</TableHead>
																	<TableHead className="text-xs text-center">Pass</TableHead>
																	<TableHead className="text-xs text-center">Max</TableHead>
																	<TableHead></TableHead>
																	<TableHead></TableHead>
																	<TableHead></TableHead>
																	<TableHead></TableHead>
																</TableRow>
															</TableHeader>
															<TableBody>
																{table.mappings.length === 0 ? (
																	<TableRow>
																		<TableCell colSpan={18} className="text-center text-muted-foreground">
																			No courses mapped. Click "Add Course" to start.
																		</TableCell>
																	</TableRow>
																) : (
																	table.mappings.map((mapping, rowIndex) => (
																		<TableRow key={rowIndex}>
																			<TableCell>{rowIndex + 1}</TableCell>
																			<TableCell>
																				<Popover
																					open={openPopovers[`${semIndex}_${rowIndex}`] || false}
																					onOpenChange={(open) => {
																						setOpenPopovers(prev => ({
																							...prev,
																							[`${semIndex}_${rowIndex}`]: open
																						}))
																					}}
																				>
																					<PopoverTrigger asChild>
																						<Button
																							variant="outline"
																							role="combobox"
																							className="h-9 w-full justify-between text-sm"
																						>
																							{mapping.course_id
																								? courses.find(c => c.id === mapping.course_id)?.course_code || "Select"
																								: "Select course"}
																							<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
																						</Button>
																					</PopoverTrigger>
																					<PopoverContent className="w-[400px] p-0">
																						<Command>
																							<CommandInput placeholder="Search course..." />
																							<CommandList>
																								<CommandEmpty>No course found.</CommandEmpty>
																								<CommandGroup>
																									{courses.map((course) => (
																										<CommandItem
																											key={course.id}
																											value={`${course.course_code} ${course.course_title || ''}`}
																											onSelect={() => {
																												updateCourseRow(semIndex, rowIndex, 'course_id', course.id)
																												setOpenPopovers(prev => ({
																													...prev,
																													[`${semIndex}_${rowIndex}`]: false
																												}))
																											}}
																										>
																											<div className="flex flex-col">
																												<span className="font-medium">{course.course_code}</span>
																												<span className="text-xs text-muted-foreground">
																													{course.course_title || '-'}
																												</span>
																											</div>
																											<Check
																												className={cn(
																													"ml-auto h-4 w-4",
																													mapping.course_id === course.id ? "opacity-100" : "opacity-0"
																												)}
																											/>
																										</CommandItem>
																									))}
																								</CommandGroup>
																							</CommandList>
																						</Command>
																					</PopoverContent>
																				</Popover>
																			</TableCell>
																			<TableCell className="text-sm">
																				{courses.find(c => c.id === mapping.course_id)?.course_title || '-'}
																			</TableCell>
																			<TableCell className="text-sm">{mapping.course_category || '-'}</TableCell>
																			<TableCell>
																				<Select
																					value={mapping.course_group || "General"}
																					onValueChange={(v) => updateCourseRow(semIndex, rowIndex, 'course_group', v)}
																				>
																					<SelectTrigger className="h-9 text-sm">
																						<SelectValue />
																					</SelectTrigger>
																					<SelectContent>
																						{COURSE_GROUPS.map(group => (
																							<SelectItem key={group.value} value={group.value}>
																								{group.label}
																							</SelectItem>
																						))}
																					</SelectContent>
																				</Select>
																			</TableCell>
																			<TableCell>
																				<Input
																					type="number"
																					value={mapping.course_order || 1}
																					onChange={(e) => updateCourseRow(semIndex, rowIndex, 'course_order', parseInt(e.target.value))}
																					className="h-9 w-20 text-sm text-center"
																					min={1}
																				/>
																			</TableCell>
																			<TableCell>
																				<Input
																					type="number"
																					value={mapping.internal_pass_mark || 0}
																					onChange={(e) => updateCourseRow(semIndex, rowIndex, 'internal_pass_mark', parseInt(e.target.value))}
																					className="h-9 w-16 text-sm text-center"
																					min={0}
																				/>
																			</TableCell>
																			<TableCell>
																				<Input
																					type="number"
																					value={mapping.internal_max_mark || 0}
																					onChange={(e) => updateCourseRow(semIndex, rowIndex, 'internal_max_mark', parseInt(e.target.value))}
																					className="h-9 w-16 text-sm text-center"
																					min={0}
																				/>
																			</TableCell>
																			<TableCell>
																				<Input
																					type="number"
																					value={mapping.internal_converted_mark || 0}
																					onChange={(e) => updateCourseRow(semIndex, rowIndex, 'internal_converted_mark', parseInt(e.target.value))}
																					className="h-9 w-16 text-sm text-center"
																					min={0}
																				/>
																			</TableCell>
																			<TableCell>
																				<Input
																					type="number"
																					value={mapping.external_pass_mark || 0}
																					onChange={(e) => updateCourseRow(semIndex, rowIndex, 'external_pass_mark', parseInt(e.target.value))}
																					className="h-9 w-16 text-sm text-center"
																					min={0}
																				/>
																			</TableCell>
																			<TableCell>
																				<Input
																					type="number"
																					value={mapping.external_max_mark || 0}
																					onChange={(e) => updateCourseRow(semIndex, rowIndex, 'external_max_mark', parseInt(e.target.value))}
																					className="h-9 w-16 text-sm text-center"
																					min={0}
																				/>
																			</TableCell>
																			<TableCell>
																				<Input
																					type="number"
																					value={mapping.external_converted_mark || 0}
																					onChange={(e) => updateCourseRow(semIndex, rowIndex, 'external_converted_mark', parseInt(e.target.value))}
																					className="h-9 w-16 text-sm text-center"
																					min={0}
																				/>
																			</TableCell>
																			<TableCell>
																				<Input
																					type="number"
																					value={mapping.total_pass_mark || 0}
																					onChange={(e) => updateCourseRow(semIndex, rowIndex, 'total_pass_mark', parseInt(e.target.value))}
																					className="h-9 w-16 text-sm text-center"
																					min={0}
																				/>
																			</TableCell>
																			<TableCell>
																				<Input
																					type="number"
																					value={mapping.total_max_mark || 0}
																					onChange={(e) => updateCourseRow(semIndex, rowIndex, 'total_max_mark', parseInt(e.target.value))}
																					className="h-9 w-16 text-sm text-center"
																					min={0}
																				/>
																			</TableCell>
																			<TableCell className="text-center">
																				<Checkbox
																					checked={mapping.annual_semester || false}
																					onCheckedChange={(v) => updateCourseRow(semIndex, rowIndex, 'annual_semester', v)}
																				/>
																			</TableCell>
																			<TableCell className="text-center">
																				<Checkbox
																					checked={mapping.registration_based || false}
																					onCheckedChange={(v) => updateCourseRow(semIndex, rowIndex, 'registration_based', v)}
																				/>
																			</TableCell>
																			<TableCell className="text-center">
																				<Checkbox
																					checked={mapping.is_active !== false}
																					onCheckedChange={(v) => updateCourseRow(semIndex, rowIndex, 'is_active', v)}
																				/>
																			</TableCell>
																			<TableCell>
																				<Button
																					variant="ghost"
																					size="sm"
																					onClick={() => removeCourseRow(semIndex, rowIndex)}
																					className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
																				>
																					<X className="h-4 w-4" />
																				</Button>
																			</TableCell>
																		</TableRow>
																	))
																)}
															</TableBody>
														</Table>
													</div>
												</div>
											</CollapsibleContent>
										</Collapsible>
									</CardHeader>
								</Card>
							))}
						</div>
					)}
				</div>
				<AppFooter />
			</SidebarInset>
		</SidebarProvider>
	)
}
