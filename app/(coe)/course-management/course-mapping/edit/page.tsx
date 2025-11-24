"use client"

import { useMemo, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AppFooter } from "@/components/layout/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/common/use-toast"
import Link from "next/link"
import { ArrowLeft, Save, RefreshCw, Calendar, Plus, X, FileText, Upload, Download } from "lucide-react"
import * as XLSX from 'xlsx'
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
	regulation_code: string
	regulation_id?: string
	batch_code?: string
	semester_code: string
	course_group?: string
	course_category?: string
	course_order?: number
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

export default function CourseMappingEditPage() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)
	const { toast } = useToast()

	// Get URL parameters (NO BATCH)
	const institutionParam = searchParams.get('institution')
	const programParam = searchParams.get('program')
	const regulationParam = searchParams.get('regulation')

	// Parent form state (institution, program, regulation are locked)
	const [selectedInstitution, setSelectedInstitution] = useState(institutionParam || "")
	const [selectedProgram, setSelectedProgram] = useState(programParam || "")
	const [selectedRegulation, setSelectedRegulation] = useState(regulationParam || "")
	const [selectedOfferingDepartment, setSelectedOfferingDepartment] = useState("")
	const [batchCode, setBatchCode] = useState("") // Get from existing mappings

	// Display names for locked fields
	const [institutionName, setInstitutionName] = useState("")
	const [programName, setProgramName] = useState("")
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

	// Bulk upload state
	const [uploadSummary, setUploadSummary] = useState<{ total: number; success: number; failed: number }>({ total: 0, success: 0, failed: 0 })
	const [uploadErrors, setUploadErrors] = useState<Array<{ row: number; course_code: string; semester: string; errors: string[] }>>([])

	// Fetch initial data on mount
	useEffect(() => {
		if (!institutionParam || !programParam || !regulationParam) {
			toast({
				title: '⚠️ Missing Parameters',
				description: 'Required parameters (institution, program, regulation) are missing. Redirecting to index page...',
				variant: 'destructive'
			})
			setTimeout(() => router.push('/course-mapping-index'), 2000)
			return
		}

		// Fetch all required data in parallel for faster loading
		setLoading(true)
		Promise.all([
			fetchInstitutionName(institutionParam),
			fetchProgramData(programParam),
			fetchRegulationName(regulationParam),
			fetchSemesters(programParam),
			fetchCourses(institutionParam, programParam, regulationParam)
		]).finally(() => {
			setLoading(false)
		})
	}, [institutionParam, programParam, regulationParam])

	// Load existing mappings when semesterTables are loaded (NO BATCH)
	useEffect(() => {
		if (semesterTables.length > 0 && selectedInstitution && selectedProgram && selectedRegulation && existingMappings.length === 0) {
			loadExistingMappings()
		}
	}, [semesterTables.length, selectedInstitution, selectedProgram, selectedRegulation])

	const fetchInstitutionName = async (code: string) => {
		try {
			const res = await fetch(`/api/master/institutions?institution_code=${code}`)
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
			const res = await fetch(`/api/master/programs?program_code=${code}`)
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
			const res = await fetch(`/api/master/regulations?regulation_code=${code}`)
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

	const fetchSemesters = async (programCode: string) => {
		try {
			const res = await fetch(`/api/master/semesters?program_code=${programCode}`)
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
			let url = `/api/master/courses?institution_code=${institutionCode}`
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
			const res = await fetch(`/api/course-management/course-mapping?institution_code=${selectedInstitution}&program_code=${selectedProgram}&regulation_code=${selectedRegulation}`)

			if (res.ok) {
				const data = await res.json()
				setExistingMappings(data)
				console.log("=== DEBUG: Course Mapping Data ===")
				console.log("Total mappings loaded:", data.length)
				if (data.length > 0) {
					const uniqueSemCodes = [...new Set(data.map((m: CourseMapping) => m.semester_code))]
					console.log("DB semester_codes:", uniqueSemCodes)
					// Extract batch_code from first mapping (all mappings should have same batch_code)
					const firstBatchCode = data[0].batch_code
					if (firstBatchCode) {
						setBatchCode(firstBatchCode)
						console.log("Batch code:", firstBatchCode)
					}
				}
				console.log("Semester table codes:", semesterTables.map(t => t.semester.semester_code))
				console.log("Semester table names:", semesterTables.map(t => t.semester.semester_name))

				// Check if mapped courses need to be fetched (only fetch missing ones in a single batch call)
				const mappedCourseIds = [...new Set(data.map((m: CourseMapping) => m.course_id).filter(Boolean))]
				if (mappedCourseIds.length > 0) {
					// Get current courses to check which ones are missing
					const currentCourseIds = new Set(courses.map(c => c.id))
					const missingCourseIds = mappedCourseIds.filter(id => !currentCourseIds.has(id))

					if (missingCourseIds.length > 0) {
						try {
							// Fetch all missing courses in a single batch call using comma-separated IDs
							const idsParam = missingCourseIds.join(',')
							const res = await fetch(`/api/master/courses?ids=${idsParam}`)
							if (res.ok) {
								const mappedCourses = await res.json()
								// Merge with existing courses array
								setCourses(prevCourses => [...prevCourses, ...mappedCourses])
							}
						} catch (err) {
							console.error('Error fetching mapped course details:', err)
						}
					}
				}

				// Organize mappings by semester
				const updatedTables = semesterTables.map(table => {
					const semesterName = table.semester.semester_name
					const semesterCode = table.semester.semester_code

					// Match by exact semester_code OR by semester_name (handle different formats)
					// API generates: "JKKNCAS-UCS-SemesterI" but DB stores: "UCS-1", "UCS-2", etc.
					const semesterMappings = data.filter((m: CourseMapping) => {
						const dbCode = m.semester_code || ''

						// Exact match
						if (dbCode === semesterCode) return true

						// Match by semester_name
						if (dbCode === semesterName) return true

						// Match without spaces
						const dbCodeNoSpaces = dbCode.replace(/\s+/g, '')
						const semesterNameNoSpaces = semesterName.replace(/\s+/g, '')
						if (dbCodeNoSpaces === semesterNameNoSpaces) return true

						// Extract semester number from semester_name (e.g., "Semester I" -> 1, "Semester II" -> 2)
						const romanToNum: { [key: string]: string } = {
							'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6'
						}
						// Match Roman numerals at end (longer patterns first)
						const semesterMatch = semesterName.match(/(VI|IV|III|II|I|V|\d+)$/i)
						if (semesterMatch) {
							const romanNum = semesterMatch[1].toUpperCase()
							const arabicNum = romanToNum[romanNum] || romanNum

							// Check if DB code matches pattern like "UCS-1", "UCS-2", etc.
							// DB format: "{program_code}-{number}"
							if (dbCode === `${selectedProgram}-${arabicNum}`) {
								return true
							}

							// Also check if DB code ends with the number
							if (dbCode.endsWith(`-${arabicNum}`) || dbCode.endsWith(arabicNum)) {
								return true
							}
						}

						return false
					})

					// Sort mappings by course_order
					const sortedMappings = semesterMappings.sort((a: CourseMapping, b: CourseMapping) => {
						return (a.course_order || 0) - (b.course_order || 0)
					})

						return {
						...table,
						mappings: sortedMappings.length > 0 ? sortedMappings : [{
							course_id: "",
							institution_code: selectedInstitution,
							program_code: selectedProgram,
							regulation_code: selectedRegulation,
							semester_code: table.semester.semester_code,
							course_group: "General",
							course_order: 1,
							annual_semester: false,
							registration_based: false,
							is_active: true
						}],
						isOpen: sortedMappings.length > 0
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
		// Get batch_code from existing mappings (any mapping in any semester should have it)
		let existingBatchCode = batchCode
		if (!existingBatchCode) {
			for (const table of semesterTables) {
				const mappingWithBatch = table.mappings.find(m => m.batch_code)
				if (mappingWithBatch?.batch_code) {
					existingBatchCode = mappingWithBatch.batch_code
					break
				}
			}
		}

		const newRow: CourseMapping = {
			course_id: "",
			institution_code: selectedInstitution,
			program_code: selectedProgram,
			regulation_code: selectedRegulation,
			batch_code: existingBatchCode,
			semester_code: semesterTables[semesterIndex].semester.semester_code,
			course_group: "General",
			course_category: "",
			course_order: semesterTables[semesterIndex].mappings.length + 1,
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
				const deleteRes = await fetch(`/api/course-management/course-mapping?id=${mappingToRemove.id}`, {
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

			// Get batch_code from existing mappings as fallback
			let existingBatchCode = batchCode
			if (!existingBatchCode) {
				for (const table of semesterTables) {
					const mappingWithBatch = table.mappings.find(m => m.batch_code)
					if (mappingWithBatch?.batch_code) {
						existingBatchCode = mappingWithBatch.batch_code
						break
					}
				}
			}

			// Collect all mappings (clean them to remove any nested relations)
			const allMappings = []
			for (const table of semesterTables) {
				for (const mapping of table.mappings) {
					if (mapping.course_id) {
						// Create a clean mapping object without nested relations
						allMappings.push({
							id: mapping.id,
							course_id: mapping.course_id,
							institution_code: selectedInstitution,
							program_code: selectedProgram,
							regulation_code: selectedRegulation,
							batch_code: mapping.batch_code || existingBatchCode,
							semester_code: mapping.semester_code,
							course_group: mapping.course_group,
							course_category: mapping.course_category,
							course_order: mapping.course_order,
							annual_semester: mapping.annual_semester,
							registration_based: mapping.registration_based,
							is_active: mapping.is_active
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

			// Send all mappings to API (handles UPSERT - insert or update)
			console.log('Saving mappings (UPSERT):', allMappings)
			const res = await fetch('/api/course-management/course-mapping', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bulk: true,
					mappings: allMappings
				})
			})

			const result = await res.json()
			console.log('Save result:', result)

			let totalSuccess = 0
			let totalErrors = 0
			let errorMessages: string[] = []

			if (res.ok) {
				totalSuccess = result.success?.length || 0
				totalErrors = result.errors?.length || 0
				if (result.errors && result.errors.length > 0) {
					errorMessages = result.errors.map((e: any) => e.error || 'Unknown error')
				}
			} else {
				totalErrors = allMappings.length
				errorMessages = [result.error || 'Failed to save mappings']
			}

			if (totalErrors > 0 && totalSuccess > 0) {
				const errorDetail = errorMessages.length > 0 ? ` (${errorMessages[0]})` : ''
				toast({
					title: '⚠️ Partial Success',
					description: `${totalSuccess} saved successfully, ${totalErrors} failed${errorDetail}.`,
					variant: 'destructive',
					className: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
					duration: 6000
				})
			} else if (totalErrors > 0) {
				const errorDetail = errorMessages.length > 0 ? `: ${errorMessages[0]}` : ''
				toast({
					title: '❌ Save Failed',
					description: `Failed to save ${totalErrors} mapping(s)${errorDetail}.`,
					variant: 'destructive',
					className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
					duration: 6000
				})
			} else {
				toast({
					title: '✅ Success',
					description: `${totalSuccess} course mapping(s) saved successfully.`,
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
					duration: 5000
				})
			}

			// Small delay to ensure database commits are complete
			await new Promise(resolve => setTimeout(resolve, 300))

			// Reload data to get fresh state from server
			await loadExistingMappings()
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

			const url = `/api/course-management/course-mapping/report?institution_code=${selectedInstitution}&program_code=${selectedProgram}&regulation_code=${selectedRegulation}`

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

	const downloadBulkUpdateTemplate = async () => {
		// Create template with current mappings data including all reference data
		const templateData: any[] = []

		for (const table of semesterTables) {
			for (const mapping of table.mappings) {
				if (mapping.course_id) {
					const course = courses.find(c => c.id === mapping.course_id)
					templateData.push({
						'Institution Code': selectedInstitution,
						'Program Code': selectedProgram,
						'Regulation Code': selectedRegulation,
						'Batch Code': mapping.batch_code || batchCode || '',
						'Semester Code': table.semester.semester_code,
						'Semester Name': table.semester.semester_name,
						'Course Code': course?.course_code || '',
						'Course Name': course?.course_title || '',
						'Display Code': course?.display_code || '',
						'Course Type': course?.course_type || '',
						'Course Part': course?.course_part_master || '',
						'Credits': course?.credits || 0,
						'Course Category': mapping.course_category || '',
						'Course Group': mapping.course_group || 'General',
						'Course Order': mapping.course_order || 1,
						'Annual Semester (TRUE/FALSE)': mapping.annual_semester ? 'TRUE' : 'FALSE',
						'Registration Based (TRUE/FALSE)': mapping.registration_based ? 'TRUE' : 'FALSE',
						'Active (TRUE/FALSE)': mapping.is_active !== false ? 'TRUE' : 'FALSE'
					})
				}
			}
		}

		if (templateData.length === 0) {
			// Create empty template with headers for adding new mappings
			templateData.push({
				'Institution Code': selectedInstitution,
				'Program Code': selectedProgram,
				'Regulation Code': selectedRegulation,
				'Batch Code': batchCode || '',
				'Semester Code': '',
				'Semester Name': '',
				'Course Code': '',
				'Course Name': '',
				'Display Code': '',
				'Course Type': '',
				'Course Part': '',
				'Credits': 0,
				'Course Category': '',
				'Course Group': 'General',
				'Course Order': 1,
				'Annual Semester (TRUE/FALSE)': 'FALSE',
				'Registration Based (TRUE/FALSE)': 'FALSE',
				'Active (TRUE/FALSE)': 'TRUE'
			})
		}

		// Create Reference Data sheet
		const referenceData: any[][] = []

		// Fetch reference data from APIs
		try {
			// Fetch institutions
			const institutionsRes = await fetch('/api/master/institutions')
			const institutions = institutionsRes.ok ? await institutionsRes.json() : []

			// Fetch regulations
			const regulationsRes = await fetch('/api/master/regulations')
			const regulations = regulationsRes.ok ? await regulationsRes.json() : []

			// Fetch programs
			const programsRes = await fetch('/api/master/programs')
			const programs = programsRes.ok ? await programsRes.json() : []

			// Build reference data sheet
			referenceData.push(['']) // Empty row
			referenceData.push(['INSTITUTION CODES'])
			referenceData.push(['Category', 'Code/Value', 'Name/Description'])
			referenceData.push(['Institution Code', 'Institution Name', ''])
			institutions.forEach((inst: any) => {
				referenceData.push(['', inst.institution_code || '', inst.name || inst.institution_name || ''])
			})

			referenceData.push([''])
			referenceData.push(['REGULATION CODES'])
			referenceData.push(['Category', 'Code/Value', 'Name/Description'])
			referenceData.push(['Regulation Code', 'Regulation Name', ''])
			regulations.forEach((reg: any) => {
				referenceData.push(['', reg.regulation_code || '', reg.regulation_name || ''])
			})

			referenceData.push([''])
			referenceData.push(['PROGRAM CODES'])
			referenceData.push(['Category', 'Code/Value', 'Name/Description'])
			referenceData.push(['Program Code', 'Program Name', ''])
			programs.forEach((prog: any) => {
				referenceData.push(['', prog.program_code || '', prog.program_name || ''])
			})

			referenceData.push([''])
			referenceData.push(['SEMESTER CODES'])
			referenceData.push(['Category', 'Code/Value', 'Name/Description'])
			referenceData.push(['Semester Code', 'Semester Name', ''])
			semesters.forEach((sem: Semester) => {
				referenceData.push(['', sem.semester_code || '', sem.semester_name || ''])
			})

			referenceData.push([''])
			referenceData.push(['AVAILABLE COURSES'])
			referenceData.push(['Category', 'Code/Value', 'Name/Description'])
			referenceData.push(['Course Code', 'Course Name', 'Course Type'])
			courses.forEach((course: any) => {
				referenceData.push(['', course.course_code || '', course.course_title || '', course.course_type || ''])
			})

		} catch (err) {
			console.error('Error fetching reference data:', err)
		}

		const ws = XLSX.utils.json_to_sheet(templateData)
		const wsRef = XLSX.utils.aoa_to_sheet(referenceData)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Course Mappings')
		XLSX.utils.book_append_sheet(wb, wsRef, 'Reference Data')
		XLSX.writeFile(wb, `course_mapping_${selectedProgram}_${selectedRegulation}_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: '✅ Template Downloaded',
			description: `${templateData.length} course mapping(s) exported to Excel with reference data.`,
			className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
		})
	}

	const handleBulkUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		try {
			setLoading(true)
			let jsonData: any[] = []

			// Parse file
			if (file.name.endsWith('.json')) {
				const text = await file.text()
				const parsed = JSON.parse(text)
				jsonData = Array.isArray(parsed) ? parsed : [parsed]
			} else {
				const data = await file.arrayBuffer()
				const workbook = XLSX.read(data)
				const worksheet = workbook.Sheets[workbook.SheetNames[0]]
				jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]
			}

			let successCount = 0
			let errorCount = 0
			let addedCount = 0
			let updatedCount = 0
			const errorDetails: Array<{ row: number; course_code: string; semester: string; errors: string[] }> = []

			// Get batch_code from existing mappings or from file
			let existingBatchCode = batchCode
			if (!existingBatchCode) {
				for (const table of semesterTables) {
					const mappingWithBatch = table.mappings.find(m => m.batch_code)
					if (mappingWithBatch?.batch_code) {
						existingBatchCode = mappingWithBatch.batch_code
						break
					}
				}
			}

			for (let i = 0; i < jsonData.length; i++) {
				const row = jsonData[i]
				const rowNumber = i + 2 // +2 for header row

				try {
					const courseCode = row['Course Code'] || row.course_code
					const semesterCode = row['Semester Code'] || row.semester_code
					const rowBatchCode = row['Batch Code'] || row.batch_code || existingBatchCode

					if (!courseCode?.trim()) {
						errorCount++
						errorDetails.push({
							row: rowNumber,
							course_code: 'N/A',
							semester: semesterCode || 'N/A',
							errors: ['Course code is required']
						})
						continue
					}

					if (!semesterCode?.trim()) {
						errorCount++
						errorDetails.push({
							row: rowNumber,
							course_code: courseCode,
							semester: 'N/A',
							errors: ['Semester code is required']
						})
						continue
					}

					// Find the course by course_code
					const course = courses.find(c => c.course_code === courseCode.trim())
					if (!course) {
						errorCount++
						errorDetails.push({
							row: rowNumber,
							course_code: courseCode,
							semester: semesterCode,
							errors: [`Course "${courseCode}" not found in available courses`]
						})
						continue
					}

					// Find existing mapping by course_id and semester_code (for update)
					// First check in existingMappings from database
					let existingMapping: CourseMapping | undefined = existingMappings.find(m =>
						m.course_id === course.id && m.semester_code === semesterCode
					)

					// Also check in semesterTables if not found
					if (!existingMapping) {
						for (const table of semesterTables) {
							existingMapping = table.mappings.find(m =>
								m.course_id === course.id &&
								(m.semester_code === semesterCode || table.semester.semester_code === semesterCode)
							)
							if (existingMapping) break
						}
					}

					// Build mapping payload
					const mappingPayload: any = {
						course_id: course.id,
						institution_code: row['Institution Code'] || row.institution_code || selectedInstitution,
						program_code: row['Program Code'] || row.program_code || selectedProgram,
						regulation_code: row['Regulation Code'] || row.regulation_code || selectedRegulation,
						batch_code: rowBatchCode,
						semester_code: semesterCode,
						course_category: row['Course Category'] || row.course_category || course.course_category || '',
						course_group: row['Course Group'] || row.course_group || 'General',
						course_order: Number(row['Course Order'] || row.course_order) || 1,
						annual_semester: typeof row.annual_semester === 'boolean'
							? row.annual_semester
							: String(row['Annual Semester (TRUE/FALSE)'] || row.annual_semester || 'FALSE').toUpperCase() === 'TRUE',
						registration_based: typeof row.registration_based === 'boolean'
							? row.registration_based
							: String(row['Registration Based (TRUE/FALSE)'] || row.registration_based || 'FALSE').toUpperCase() === 'TRUE',
						is_active: typeof row.is_active === 'boolean'
							? row.is_active
							: String(row['Active (TRUE/FALSE)'] || row.is_active || 'TRUE').toUpperCase() !== 'FALSE'
					}

					// Track if this is an update or add
					const isUpdate = !!existingMapping?.id

					// If existing mapping found, include id for update
					if (existingMapping?.id) {
						mappingPayload.id = existingMapping.id
					}

					// Send to API
					const res = await fetch('/api/course-management/course-mapping', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							bulk: true,
							mappings: [mappingPayload]
						})
					})

					if (res.ok) {
						const result = await res.json()
						if (result.success && result.success.length > 0) {
							successCount++
							if (isUpdate) {
								updatedCount++
							} else {
								addedCount++
							}
						} else if (result.errors && result.errors.length > 0) {
							errorCount++
							errorDetails.push({
								row: rowNumber,
								course_code: courseCode,
								semester: semesterCode,
								errors: result.errors.map((e: any) => e.error || 'Unknown error')
							})
						} else {
							successCount++
							if (isUpdate) {
								updatedCount++
							} else {
								addedCount++
							}
						}
					} else {
						errorCount++
						const errorData = await res.json().catch(() => ({}))
						errorDetails.push({
							row: rowNumber,
							course_code: courseCode,
							semester: semesterCode,
							errors: [errorData.error || 'Failed to save mapping']
						})
					}
				} catch (err) {
					errorCount++
					errorDetails.push({
						row: rowNumber,
						course_code: row['Course Code'] || row.course_code || 'N/A',
						semester: row['Semester Code'] || row.semester_code || 'N/A',
						errors: [err instanceof Error ? err.message : 'Unknown error']
					})
				}
			}

			// Update summary
			setUploadSummary({
				total: jsonData.length,
				success: successCount,
				failed: errorCount
			})

			// Build description with add/update counts
			const successDescription = successCount > 0
				? `${addedCount > 0 ? `${addedCount} added` : ''}${addedCount > 0 && updatedCount > 0 ? ', ' : ''}${updatedCount > 0 ? `${updatedCount} updated` : ''}`
				: ''

			// Show results
			if (errorCount === 0) {
				toast({
					title: '✅ Bulk Import Complete',
					description: `Successfully processed ${successCount} mapping(s): ${successDescription}.`,
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
					duration: 5000
				})
			} else if (successCount > 0) {
				setUploadErrors(errorDetails)
				toast({
					title: '⚠️ Partial Import Success',
					description: `${successDescription}, ${errorCount} failed. Check console for details.`,
					className: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
					duration: 6000
				})
				console.error('Bulk import errors:', errorDetails)
			} else {
				setUploadErrors(errorDetails)
				toast({
					title: '❌ Bulk Import Failed',
					description: `All ${errorCount} mapping(s) failed. Check console for details.`,
					variant: 'destructive',
					className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
					duration: 6000
				})
				console.error('Bulk import errors:', errorDetails)
			}

			// Reload data
			await loadExistingMappings()

			// Reset file input
			e.target.value = ''
		} catch (error) {
			console.error('Bulk import error:', error)
			toast({
				title: '❌ Bulk Import Failed',
				description: error instanceof Error ? error.message : 'Failed to process file.',
				variant: 'destructive',
				className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
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
						<CardHeader className="p-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<Button
										size="sm"
										asChild
										className="bg-green-600 hover:bg-green-700 text-white h-8 text-sm px-2"
									>
										<Link href="/course-mapping-index">
											<ArrowLeft className="h-3 w-3 mr-1" />
											Back to Index
										</Link>
									</Button>
									<div className="h-8 w-px bg-border" />
									<div>
										<h2 className="text-lg font-semibold">Edit Course Mapping</h2>
										<p className="text-xs text-muted-foreground">Manage course mappings for selected program and regulation</p>
									</div>
								</div>
								<div className="flex gap-2">
									<Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={handleGeneratePDF} disabled={loading}>
										<FileText className="h-3 w-3 mr-1" />
										Generate PDF
									</Button>
									<Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={downloadBulkUpdateTemplate} disabled={loading}>
										<Download className="h-3 w-3 mr-1" />
										Export
									</Button>
									<Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={() => document.getElementById('bulk-update-file')?.click()} disabled={loading}>
										<Upload className="h-3 w-3 mr-1" />
										Import
									</Button>
									<input
										id="bulk-update-file"
										type="file"
										accept=".xlsx,.xls,.json"
										onChange={handleBulkUpdate}
										className="hidden"
									/>
									<Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={loadExistingMappings} disabled={loading}>
										<RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
									<Button size="sm" className="h-8 text-sm px-2" onClick={saveAllMappings} disabled={saving || loading}>
										<Save className="h-3 w-3 mr-1" />
										{saving ? 'Saving...' : 'Save All'}
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-3 pt-0">
							{/* Locked Selection Display (NO BATCH) */}
							<div className="bg-muted/50 border rounded-lg p-3">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
									<div>
										<Label className="text-xs text-muted-foreground">Institution</Label>
										<p className="font-medium mt-1 text-sm">{institutionName || selectedInstitution}</p>
										<p className="text-xs text-muted-foreground">{selectedInstitution}</p>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">Program</Label>
										<p className="font-medium mt-1 text-sm">{programName || selectedProgram}</p>
										<p className="text-xs text-muted-foreground">{selectedProgram}</p>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">Regulation</Label>
										<p className="font-medium mt-1 text-sm">{regulationName || selectedRegulation}</p>
										<p className="text-xs text-muted-foreground">{selectedRegulation}</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Semester Tables */}
					{semesterTables.length > 0 && (
						<div className="space-y-3 relative">
							{courses.length > 0 && (
								<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
									<div className="flex items-center justify-between">
										<span className="text-sm text-blue-600 dark:text-blue-400">
											{courses.length} course{courses.length !== 1 ? 's' : ''} available for selection
										</span>
									</div>
								</div>
							)}

							{semesterTables.map((table, semIndex) => (
								<Card key={table.semester.id}>
									<CardHeader className="p-3">
										<Collapsible open={table.isOpen} onOpenChange={() => toggleSemesterTable(semIndex)}>
											<CollapsibleTrigger asChild>
												<div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors">
													<div className="flex items-center gap-2">
														<Button variant="ghost" size="sm" className="h-6 w-6 p-0">
															{table.isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
														</Button>
														<Calendar className="h-4 w-4 text-primary" />
														<h3 className="text-sm font-semibold">{table.semester.semester_name}</h3>
														<Badge variant="outline" className="ml-2 text-xs h-5">
															{table.mappings.filter(m => m.course_id).length} courses mapped
														</Badge>
													</div>
													<Button
														size="sm"
														className="h-7 text-sm px-2"
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
												<div className="mt-4 border rounded-lg bg-background shadow-sm">
													<div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "440px" }}>
														<Table>
															<TableHeader className="sticky top-0 z-[5] bg-slate-50 dark:bg-slate-900/50">
																<TableRow>
																	<TableHead className="w-[50px] text-base font-semibold h-9">#</TableHead>
																	<TableHead className="w-[180px] text-base font-semibold h-9">Course Code</TableHead>
																	<TableHead className="w-[220px] text-base font-semibold h-9">Course Name</TableHead>
																	<TableHead className="w-[100px] text-base font-semibold h-9">Type</TableHead>
																	<TableHead className="w-[100px] text-base font-semibold h-9">Part</TableHead>
																	<TableHead className="w-[150px] text-base font-semibold h-9">Category</TableHead>
																	<TableHead className="w-[80px] text-base font-semibold h-9">Order</TableHead>
																	<TableHead className="text-center w-[100px] text-base font-semibold h-9">Annual</TableHead>
																	<TableHead className="text-center w-[120px] text-base font-semibold h-9">
																		<div className="flex flex-col items-center gap-1">
																			<span className="text-sm">Registration</span>
																			<Checkbox
																				checked={selectAllRegistration[`semester_${semIndex}`] || false}
																				onCheckedChange={() => toggleAllRegistration(semIndex)}
																				className="h-3 w-3"
																			/>
																		</div>
																	</TableHead>
																	<TableHead className="text-center w-[100px] text-base font-semibold h-9">
																		<div className="flex flex-col items-center gap-1">
																			<span className="text-sm">Active</span>
																			<Checkbox
																				checked={selectAllStatus[`semester_${semIndex}`] !== false}
																				onCheckedChange={() => toggleAllStatus(semIndex)}
																				className="h-3 w-3"
																			/>
																		</div>
																	</TableHead>
																	<TableHead className="w-[80px] text-base font-semibold h-9">Action</TableHead>
																</TableRow>
															</TableHeader>
															<TableBody>
																{table.mappings.length === 0 ? (
																	<TableRow>
																		<TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-4">
																			No courses mapped. Click "Add Course" to start.
																		</TableCell>
																	</TableRow>
																) : (
																	table.mappings.map((mapping, rowIndex) => (
																		<TableRow key={rowIndex}>
																			<TableCell className="py-2 text-sm">{rowIndex + 1}</TableCell>
																			<TableCell className="py-2">
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
																							className="h-7 w-full justify-between text-sm"
																						>
																							{mapping.course_id
																								? courses.find(c => c.id === mapping.course_id)?.course_code || "Select"
																								: "Select course"}
																							<ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />
																						</Button>
																					</PopoverTrigger>
																					<PopoverContent className="w-[400px] p-0">
																						<Command>
																							<CommandInput placeholder="Search course..." className="text-sm" />
																							<CommandList>
																								<CommandEmpty className="text-sm">No course found.</CommandEmpty>
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
																											className="text-sm"
																										>
																											<div className="flex flex-col">
																												<span className="font-medium text-sm">{course.course_code}</span>
																												<span className="text-xs text-muted-foreground">
																													{course.course_title || '-'}
																												</span>
																											</div>
																											<Check
																												className={cn(
																													"ml-auto h-3 w-3",
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
																			<TableCell className="text-sm py-2">
																				{courses.find(c => c.id === mapping.course_id)?.course_title || '-'}
																			</TableCell>
																			<TableCell className="text-sm py-2">
																				{courses.find(c => c.id === mapping.course_id)?.course_type || '-'}
																			</TableCell>
																			<TableCell className="text-sm py-2">
																				{courses.find(c => c.id === mapping.course_id)?.course_part_master || '-'}
																			</TableCell>
																			<TableCell className="text-sm py-2">{mapping.course_category || '-'}</TableCell>
																			<TableCell className="py-2">
																				<Input
																					type="number"
																					value={mapping.course_order || 1}
																					onChange={(e) => updateCourseRow(semIndex, rowIndex, 'course_order', parseFloat(e.target.value) || 1)}
																					className="h-7 w-20 text-sm text-center"
																					min={0.1}
																					step={0.1}
																				/>
																			</TableCell>
																			<TableCell className="text-center py-2">
																				<Checkbox
																					checked={mapping.annual_semester || false}
																					onCheckedChange={(v) => updateCourseRow(semIndex, rowIndex, 'annual_semester', v)}
																					className="h-4 w-4"
																				/>
																			</TableCell>
																			<TableCell className="text-center py-2">
																				<Checkbox
																					checked={mapping.registration_based || false}
																					onCheckedChange={(v) => updateCourseRow(semIndex, rowIndex, 'registration_based', v)}
																					className="h-4 w-4"
																				/>
																			</TableCell>
																			<TableCell className="text-center py-2">
																				<Checkbox
																					checked={mapping.is_active !== false}
																					onCheckedChange={(v) => updateCourseRow(semIndex, rowIndex, 'is_active', v)}
																					className="h-4 w-4"
																				/>
																			</TableCell>
																			<TableCell className="py-2">
																				<Button
																					variant="ghost"
																					size="sm"
																					onClick={() => removeCourseRow(semIndex, rowIndex)}
																					className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
																				>
																					<X className="h-3 w-3" />
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
