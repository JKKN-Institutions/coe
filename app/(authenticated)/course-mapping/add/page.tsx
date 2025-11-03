"use client"

import { useMemo, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Save, RefreshCw, Link2, BookText, School, Calendar, Plus, X, ChevronDown, ChevronRight, CheckCircle2, Info, FileSpreadsheet, Download, Upload, XCircle, AlertTriangle } from "lucide-react"
import * as XLSX from "xlsx"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

type CourseMapping = {
	id?: string
	course_id: string
	institution_code: string
	program_code: string
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

export default function CourseMappingAddPage() {
	const searchParams = useSearchParams()
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)
	const { toast } = useToast()

	// Parent form state (NO BATCH)
	const [selectedInstitution, setSelectedInstitution] = useState("")
	const [selectedProgram, setSelectedProgram] = useState("")
	const [selectedRegulation, setSelectedRegulation] = useState("")
	const [selectedOfferingDepartment, setSelectedOfferingDepartment] = useState("")

	// Dropdown data states
	const [institutions, setInstitutions] = useState<any[]>([])
	const [programs, setPrograms] = useState<any[]>([])
	const [courses, setCourses] = useState<any[]>([])
	const [regulations, setRegulations] = useState<any[]>([])
	const [semesters, setSemesters] = useState<Semester[]>([])

	// Semester tables data
	const [semesterTables, setSemesterTables] = useState<SemesterTableData[]>([])

	// Select all states
	const [selectAllRegistration, setSelectAllRegistration] = useState<{ [key: string]: boolean }>({})
	const [selectAllStatus, setSelectAllStatus] = useState<{ [key: string]: boolean }>({})

	// Existing mappings (for edit mode)
	const [existingMappings, setExistingMappings] = useState<CourseMapping[]>([])

	// Popover open state for course selection (track by semesterIndex_rowIndex)
	const [openPopovers, setOpenPopovers] = useState<{ [key: string]: boolean }>({})

	// Upload summary and error tracking
	const [errorPopupOpen, setErrorPopupOpen] = useState(false)
	const [importErrors, setImportErrors] = useState<Array<{
		row: number
		semester_code: string
		course_code: string
		errors: string[]
	}>>([])
	const [uploadSummary, setUploadSummary] = useState<{
		total: number
		success: number
		failed: number
	}>({ total: 0, success: 0, failed: 0 })

	// Fetch institutions on mount and handle URL parameters
	useEffect(() => {
		fetchInstitutions()

		// Pre-populate from URL parameters (NO BATCH)
		const institution = searchParams.get('institution')
		const program = searchParams.get('program')
		const regulation = searchParams.get('regulation')

		if (institution) setSelectedInstitution(institution)
		if (program) setSelectedProgram(program)
		if (regulation) setSelectedRegulation(regulation)
	}, [])

	// Fetch programs when institution changes
	useEffect(() => {
		if (selectedInstitution) {
			fetchPrograms(selectedInstitution)
			fetchRegulations(selectedInstitution, "")
			setSelectedProgram("")
			setSelectedRegulation("")
			setSemesterTables([])
		}
	}, [selectedInstitution])

	// Fetch semesters when program changes (NO BATCH)
	useEffect(() => {
		if (selectedProgram) {
			// Find the selected program to get its offering_department_code
			const program = programs.find(p => p.program_code === selectedProgram)
			const offeringDept = program?.offering_department_code || ""
			setSelectedOfferingDepartment(offeringDept)

			fetchSemesters(selectedProgram)
			// Pass offering department code for course filtering
			fetchCourses(selectedInstitution, selectedProgram, selectedRegulation, offeringDept)
			fetchRegulations(selectedInstitution, selectedProgram)
			setSemesterTables([])
		}
	}, [selectedProgram, selectedInstitution, programs])

	// Load existing mappings when regulation and program are selected (NO BATCH)
	useEffect(() => {
		if (selectedRegulation && selectedProgram && semesters.length > 0) {
			loadExistingMappings()
		}
	}, [selectedRegulation, selectedProgram, semesters])

	// Refetch courses when regulation changes
	useEffect(() => {
		if (selectedRegulation && selectedInstitution && selectedProgram) {
			fetchCourses(selectedInstitution, selectedProgram, selectedRegulation, selectedOfferingDepartment)
		}
	}, [selectedRegulation, selectedOfferingDepartment])

	const fetchInstitutions = async () => {
		try {
			const res = await fetch('/api/institutions')
			if (res.ok) {
				const data = await res.json()
				setInstitutions(data)
			}
		} catch (err) {
			console.error('Error fetching institutions:', err)
		}
	}

	const fetchPrograms = async (institutionCode: string) => {
		try {
			const res = await fetch(`/api/program?institution_code=${institutionCode}`)
			if (res.ok) {
				const data = await res.json()
				setPrograms(data)
			}
		} catch (err) {
			console.error('Error fetching programs:', err)
		}
	}

	const fetchSemesters = async (programCode: string) => {
		try {
			// Fetch semesters filtered by program_code
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

	const fetchCourses = async (institutionCode: string, programCode: string, regulationCode?: string, offeringDepartmentCode?: string) => {
		try {
			// Filter courses by institution_code, offering_department_code, and regulation_code
			// Note: programCode is passed but not used since courses table doesn't have program_code column
			let url = `/api/courses?institution_code=${institutionCode}`
			// Use offering_department_code for filtering (derived from selected program)
			if (offeringDepartmentCode) {
				url += `&offering_department_code=${offeringDepartmentCode}`
			}
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

	const fetchRegulations = async (institutionCode: string, programCode: string) => {
		try {
			let url = '/api/regulations?'
			if (institutionCode) url += `institution_code=${institutionCode}&`
			if (programCode) url += `program_code=${programCode}`

			const res = await fetch(url)
			if (res.ok) {
				const data = await res.json()
				setRegulations(data)
			}
		} catch (err) {
			console.error('Error fetching regulations:', err)
		}
	}

	const loadExistingMappings = async () => {
		if (!selectedInstitution || !selectedProgram || !selectedRegulation) return

		try {
			setLoading(true)
			const res = await fetch(`/api/course-mapping?institution_code=${selectedInstitution}&program_code=${selectedProgram}&regulation_code=${selectedRegulation}`)

			if (res.ok) {
				const data = await res.json()
				setExistingMappings(data)

				// Fetch full course details for all mapped courses to ensure they appear in dropdown
				const mappedCourseIds = [...new Set(data.map((m: CourseMapping) => m.course_id).filter(Boolean))]
				if (mappedCourseIds.length > 0) {
					try {
						const coursePromises = mappedCourseIds.map(courseId =>
							fetch(`/api/courses?id=${courseId}`).then(r => r.json())
						)
						const courseResults = await Promise.all(coursePromises)
						const mappedCourses = courseResults.flat()

						// Merge with existing courses array, avoiding duplicates
						setCourses(prevCourses => {
							const existingIds = new Set(prevCourses.map(c => c.id))
							const newCourses = mappedCourses.filter((c: any) => !existingIds.has(c.id))
							return [...prevCourses, ...newCourses]
						})
					} catch (err) {
						console.error('Error fetching mapped course details:', err)
					}
				}

				// Organize mappings by semester (NO BATCH)
				const updatedTables = semesterTables.map(table => {
					const semesterMappings = data.filter((m: CourseMapping) => m.semester_code === table.semester.semester_code)
					return {
						...table,
						mappings: semesterMappings.length > 0 ? semesterMappings : [{
							course_id: "",
							institution_code: selectedInstitution,
							program_code: selectedProgram,
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

		// If this is a saved mapping, confirm before deleting
		if (mappingToRemove.id && mappingToRemove.course_id) {
			const courseName = courses.find(c => c.id === mappingToRemove.course_id)?.course_title || 'this course'
			const confirmDelete = window.confirm(`Are you sure you want to delete the mapping for "${courseName}"? This action cannot be undone.`)

			if (!confirmDelete) {
				return
			}
		}

		// If this mapping has an ID, it exists in the database and needs to be deleted
		if (mappingToRemove.id) {
			try {
				const deleteRes = await fetch(`/api/course-mapping?id=${mappingToRemove.id}`, {
					method: 'DELETE'
				})

				if (!deleteRes.ok) {
					const error = await deleteRes.json()
					toast({
						title: '❌ Delete Failed',
						description: error.error || 'Failed to delete course mapping from database.',
						variant: 'destructive'
					})
					return // Don't remove from UI if database delete failed
				}

				toast({
					title: '✅ Deleted',
					description: 'Course mapping removed successfully.',
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			} catch (err) {
				toast({
					title: '❌ Network Error',
					description: 'Failed to connect to server. Please check your connection.',
					variant: 'destructive'
				})
				return // Don't remove from UI if network error occurred
			}
		}

		// Remove from UI after successful database delete (or if it was never saved)
		updated[semesterIndex].mappings.splice(rowIndex, 1)
		setSemesterTables(updated)

		// Update existingMappings if this was a saved mapping
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

		// Auto-fill course details when course is selected
		if (field === 'course_id' && value) {
			const course = courses.find(c => c.id === value)
			if (course) {
				// Auto-fill course category
				updated[semesterIndex].mappings[rowIndex].course_category = course.course_category || course.course_type || ''

				// Auto-fill marks details from the course
				if (course.internal_max_mark !== undefined) {
					updated[semesterIndex].mappings[rowIndex].internal_max_mark = course.internal_max_mark
				}
				if (course.internal_pass_mark !== undefined) {
					updated[semesterIndex].mappings[rowIndex].internal_pass_mark = course.internal_pass_mark
				}
				if (course.internal_converted_mark !== undefined) {
					updated[semesterIndex].mappings[rowIndex].internal_converted_mark = course.internal_converted_mark
				}
				if (course.external_max_mark !== undefined) {
					updated[semesterIndex].mappings[rowIndex].external_max_mark = course.external_max_mark
				}
				if (course.external_pass_mark !== undefined) {
					updated[semesterIndex].mappings[rowIndex].external_pass_mark = course.external_pass_mark
				}
				if (course.external_converted_mark !== undefined) {
					updated[semesterIndex].mappings[rowIndex].external_converted_mark = course.external_converted_mark
				}
				if (course.total_pass_mark !== undefined) {
					updated[semesterIndex].mappings[rowIndex].total_pass_mark = course.total_pass_mark
				}
				if (course.total_max_mark !== undefined) {
					updated[semesterIndex].mappings[rowIndex].total_max_mark = course.total_max_mark
				}
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

	const validateBeforeSave = () => {
		if (!selectedInstitution) {
			toast({
				title: '⚠️ Validation Error',
				description: 'Please select an institution.',
				variant: 'destructive'
			})
			return false
		}

		if (!selectedProgram) {
			toast({
				title: '⚠️ Validation Error',
				description: 'Please select a program.',
				variant: 'destructive'
			})
			return false
		}

		if (!selectedRegulation) {
			toast({
				title: '⚠️ Validation Error',
				description: 'Please select a regulation.',
				variant: 'destructive'
			})
			return false
		}

		// Check if at least one course is mapped
		const hasCourseMappings = semesterTables.some(table =>
			table.mappings.some(m => m.course_id)
		)

		if (!hasCourseMappings) {
			toast({
				title: '⚠️ Validation Error',
				description: 'Please add at least one course mapping.',
				variant: 'destructive'
			})
			return false
		}

		return true
	}

	const saveAllMappings = async () => {
		if (!validateBeforeSave()) return

		try {
			setSaving(true)

			// Collect all mappings from all semesters (NO BATCH)
			const allMappings = []
			for (const table of semesterTables) {
				for (const mapping of table.mappings) {
					if (mapping.course_id) { // Only save rows with selected courses
						allMappings.push({
							...mapping,
							institution_code: selectedInstitution,
							program_code: selectedProgram,
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

			// First, try to delete existing mappings (if any)
			let deletionErrors = []
			if (existingMappings.length > 0) {
				for (const existing of existingMappings) {
					if (existing.id) {
						try {
							const deleteRes = await fetch(`/api/course-mapping?id=${existing.id}`, {
								method: 'DELETE'
							})
							if (!deleteRes.ok) {
								const deleteError = await deleteRes.json()
								deletionErrors.push(`Failed to remove existing mapping: ${deleteError.error || 'Unknown error'}`)
							}
						} catch (err) {
							deletionErrors.push(`Network error while removing existing mappings`)
						}
					}
				}
			}

			// If there were deletion errors, show warning but continue
			if (deletionErrors.length > 0) {
				toast({
					title: '⚠️ Warning',
					description: 'Some existing mappings could not be removed. Proceeding with save...',
					variant: 'destructive'
				})
			}

			// Save all mappings in bulk
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
					// Build detailed error message
					let errorMessage = `Successfully saved ${result.successful.length} mappings, but ${result.errors.length} failed:\n\n`

					// Group errors by type for better readability
					const errorGroups = result.errors.reduce((acc: any, err: any) => {
						const key = err.error || 'Unknown error'
						if (!acc[key]) acc[key] = []
						acc[key].push(`Semester: ${err.semester_code}, Course: ${err.course_id}`)
						return acc
					}, {})

					for (const [error, items] of Object.entries(errorGroups)) {
						errorMessage += `❌ ${error}:\n`
						;(items as string[]).forEach(item => {
							errorMessage += `   - ${item}\n`
						})
					}

					toast({
						title: '⚠️ Partial Success',
						description: errorMessage,
						variant: 'destructive',
						className: 'whitespace-pre-wrap'
					})

					// Don't reload - keep the current state so user can fix errors
					console.error('Mapping errors:', result.errors)
				} else {
					toast({
						title: '✅ Success',
						description: `All ${allMappings.length} course mappings saved successfully.`,
						className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
					})

					// Only reload on complete success
					await loadExistingMappings()
				}
			} else {
				const error = await res.json()

				// Parse and display detailed error information
				let errorMessage = error.error || 'Failed to save mappings'

				if (error.details) {
					errorMessage += '\n\nDetails:\n'
					if (Array.isArray(error.details)) {
						error.details.forEach((detail: any) => {
							errorMessage += `• ${detail}\n`
						})
					} else {
						errorMessage += `• ${error.details}`
					}
				}

				toast({
					title: '❌ Save Failed',
					description: errorMessage,
					variant: 'destructive',
					className: 'whitespace-pre-wrap'
				})

				// Don't throw - keep the form data intact
				console.error('Save error:', error)
			}
		} catch (err: any) {
			// Network or unexpected errors
			toast({
				title: '❌ Unexpected Error',
				description: `An unexpected error occurred: ${err.message || 'Please check your connection and try again.'}`,
				variant: 'destructive'
			})
			console.error('Unexpected error:', err)
		} finally {
			setSaving(false)
		}
	}

	const resetForm = () => {
		setSelectedInstitution("")
		setSelectedProgram("")
		setSemesterTables([])
		setExistingMappings([])
		setSelectAllRegistration({})
		setSelectAllStatus({})
	}

	const handleRefresh = async () => {
		if (selectedRegulation) {
			await loadExistingMappings()
			toast({
				title: '✅ Refreshed',
				description: 'Course mappings have been refreshed.',
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
			})
		}
	}

	// Export current mappings to Excel
	const handleExport = () => {
		// Flatten all semester mappings into a single array
		const allMappings = semesterTables.flatMap(table =>
			table.mappings.map(mapping => {
				const course = courses.find(c => c.id === mapping.course_id)
				return {
					'Institution Code': mapping.institution_code,
					'Program Code': mapping.program_code,
					'Regulation Code': mapping.regulation_code,
					'Semester Code': mapping.semester_code,
					'Semester Name': table.semester.semester_name,
					'Course Code': course?.course_code || '',
					'Course Title': course?.course_title || course?.course_name || '',
					'Course Category': mapping.course_category || '',
					'Course Group': mapping.course_group || 'General',
					'Course Order': mapping.course_order || 0,
					'Internal Pass Mark': mapping.internal_pass_mark || 0,
					'Internal Max Mark': mapping.internal_max_mark || 0,
					'Internal Converted Mark': mapping.internal_converted_mark || 0,
					'External Pass Mark': mapping.external_pass_mark || 0,
					'External Max Mark': mapping.external_max_mark || 0,
					'External Converted Mark': mapping.external_converted_mark || 0,
					'Total Pass Mark': mapping.total_pass_mark || 0,
					'Total Max Mark': mapping.total_max_mark || 0,
					'Annual Semester': mapping.annual_semester ? 'Yes' : 'No',
					'Registration Based': mapping.registration_based ? 'Yes' : 'No',
					'Status': mapping.is_active ? 'Active' : 'Inactive',
				}
			})
		)

		if (allMappings.length === 0) {
			toast({
				title: '⚠️ No Data',
				description: 'No course mappings available to export.',
				variant: 'destructive',
				className: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200'
			})
			return
		}

		const ws = XLSX.utils.json_to_sheet(allMappings)

		// Set column widths
		const colWidths = [
			{ wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 20 },
			{ wch: 15 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
			{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
			{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 10 }
		]
		ws['!cols'] = colWidths

		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Course Mappings')
		XLSX.writeFile(wb, `course_mappings_export_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: '✅ Export Complete',
			description: `Exported ${allMappings.length} course mapping${allMappings.length > 1 ? 's' : ''} to Excel.`,
			className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
		})
	}

	// Export template with instructions
	const handleTemplateExport = () => {
		const wb = XLSX.utils.book_new()

		// Sheet 1: Template with sample data
		const sample = [{
			'Institution Code *': selectedInstitution || 'JKKN',
			'Program Code *': selectedProgram || 'BCA',
			'Regulation Code *': selectedRegulation || 'R2021',
			'Semester Code *': 'SEM1',
			'Course Code *': 'BCA101',
			'Course Group': 'General',
			'Course Order': 1,
			'Internal Pass Mark': 14,
			'Internal Max Mark': 40,
			'Internal Converted Mark': 25,
			'External Pass Mark': 26,
			'External Max Mark': 60,
			'External Converted Mark': 75,
			'Total Pass Mark': 40,
			'Total Max Mark': 100,
			'Annual Semester': 'No',
			'Registration Based': 'No',
			'Status': 'Active'
		}]

		const ws = XLSX.utils.json_to_sheet(sample)

		// Set column widths
		const colWidths = [
			{ wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 },
			{ wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 22 },
			{ wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 18 },
			{ wch: 18 }, { wch: 20 }, { wch: 10 }
		]
		ws['!cols'] = colWidths

		// Style headers
		const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
		const mandatoryFields = ['Institution Code *', 'Program Code *', 'Regulation Code *', 'Semester Code *', 'Course Code *']

		for (let col = range.s.c; col <= range.e.c; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
			if (!ws[cellAddress]) continue

			const cell = ws[cellAddress]
			const isMandatory = mandatoryFields.includes(cell.v as string)

			if (isMandatory) {
				cell.s = {
					font: { color: { rgb: 'FF0000' }, bold: true },
					fill: { fgColor: { rgb: 'FFE6E6' } }
				}
			} else {
				cell.s = {
					font: { bold: true },
					fill: { fgColor: { rgb: 'F0F0F0' } }
				}
			}
		}

		XLSX.utils.book_append_sheet(wb, ws, 'Template')

		// Sheet 2: Available Courses Reference
		const courseReference = courses.map(course => ({
			'Course Code': course.course_code,
			'Course Title': course.course_title || course.course_name,
			'Course Category': course.course_category || course.course_type || '',
			'Credits': course.credits || 0,
			'Institution Code': course.institution_code,
			'Regulation Code': course.regulation_code
		}))

		if (courseReference.length > 0) {
			const wsRef = XLSX.utils.json_to_sheet(courseReference)
			wsRef['!cols'] = [
				{ wch: 18 }, { wch: 40 }, { wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 18 }
			]

			// Style reference sheet header
			const refRange = XLSX.utils.decode_range(wsRef['!ref'] || 'A1')
			for (let col = refRange.s.c; col <= refRange.e.c; col++) {
				const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
				if (wsRef[cellAddress]) {
					wsRef[cellAddress].s = {
						font: { bold: true, color: { rgb: '1F2937' } },
						fill: { fgColor: { rgb: 'DBEAFE' } }
					}
				}
			}

			XLSX.utils.book_append_sheet(wb, wsRef, 'Available Courses')
		}

		// Sheet 3: Semesters Reference
		const semesterReference = semesters.map(sem => ({
			'Semester Code': sem.semester_code,
			'Semester Name': sem.semester_name,
			'Semester Number': sem.semester_number
		}))

		if (semesterReference.length > 0) {
			const wsSem = XLSX.utils.json_to_sheet(semesterReference)
			wsSem['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 18 }]

			const semRange = XLSX.utils.decode_range(wsSem['!ref'] || 'A1')
			for (let col = semRange.s.c; col <= semRange.e.c; col++) {
				const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
				if (wsSem[cellAddress]) {
					wsSem[cellAddress].s = {
						font: { bold: true, color: { rgb: '1F2937' } },
						fill: { fgColor: { rgb: 'DBEAFE' } }
					}
				}
			}

			XLSX.utils.book_append_sheet(wb, wsSem, 'Semesters')
		}

		XLSX.writeFile(wb, `course_mapping_template_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: '✅ Template Downloaded',
			description: 'Course mapping template has been downloaded successfully.',
			className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
		})
	}

	// Import course mappings from Excel
	const handleImport = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.xlsx,.xls'
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) return

			try {
				setLoading(true)
				const data = new Uint8Array(await file.arrayBuffer())
				const wb = XLSX.read(data, { type: 'array' })
				const ws = wb.Sheets[wb.SheetNames[0]]
				const jsonData = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]

				if (jsonData.length === 0) {
					toast({
						title: '❌ Empty File',
						description: 'The uploaded file contains no data.',
						variant: 'destructive',
						className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
					})
					setLoading(false)
					return
				}

				const validationErrors: Array<{
					row: number
					semester_code: string
					course_code: string
					errors: string[]
				}> = []

				let successCount = 0
				let errorCount = 0

				for (let i = 0; i < jsonData.length; i++) {
					const row = jsonData[i]
					const rowNumber = i + 2 // +2 for header row
					const errors: string[] = []

					// Extract and validate required fields
					const institutionCode = String(row['Institution Code *'] || row['Institution Code'] || '')
					const programCode = String(row['Program Code *'] || row['Program Code'] || '')
					const regulationCode = String(row['Regulation Code *'] || row['Regulation Code'] || '')
					const semesterCode = String(row['Semester Code *'] || row['Semester Code'] || '')
					const courseCode = String(row['Course Code *'] || row['Course Code'] || '')

					if (!institutionCode.trim()) errors.push('Institution Code is required')
					if (!programCode.trim()) errors.push('Program Code is required')
					if (!regulationCode.trim()) errors.push('Regulation Code is required')
					if (!semesterCode.trim()) errors.push('Semester Code is required')
					if (!courseCode.trim()) errors.push('Course Code is required')

					// Find the course by course_code
					const course = courses.find(c => c.course_code === courseCode)
					if (!course && courseCode.trim()) {
						errors.push(`Course "${courseCode}" not found in available courses`)
					}

					if (errors.length > 0) {
						errorCount++
						validationErrors.push({
							row: rowNumber,
							semester_code: semesterCode || 'N/A',
							course_code: courseCode || 'N/A',
							errors
						})
						continue
					}

					// Build mapping payload
					const mapping = {
						institution_code: institutionCode,
						program_code: programCode,
						regulation_code: regulationCode,
						semester_code: semesterCode,
						course_id: course!.id,
						course_group: String(row['Course Group'] || 'General'),
						course_order: Number(row['Course Order'] || 0),
						internal_pass_mark: Number(row['Internal Pass Mark'] || 0),
						internal_max_mark: Number(row['Internal Max Mark'] || 0),
						internal_converted_mark: Number(row['Internal Converted Mark'] || 0),
						external_pass_mark: Number(row['External Pass Mark'] || 0),
						external_max_mark: Number(row['External Max Mark'] || 0),
						external_converted_mark: Number(row['External Converted Mark'] || 0),
						total_pass_mark: Number(row['Total Pass Mark'] || 0),
						total_max_mark: Number(row['Total Max Mark'] || 0),
						annual_semester: String(row['Annual Semester'] || 'No').toLowerCase() === 'yes',
						registration_based: String(row['Registration Based'] || 'No').toLowerCase() === 'yes',
						is_active: String(row['Status'] || 'Active').toLowerCase() === 'active'
					}

					// Save to database
					try {
						const response = await fetch('/api/course-mapping', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(mapping)
						})

						if (response.ok) {
							successCount++
						} else {
							const errorData = await response.json()
							errorCount++
							validationErrors.push({
								row: rowNumber,
								semester_code: semesterCode,
								course_code: courseCode,
								errors: [errorData.error || 'Failed to save mapping']
							})
						}
					} catch (error) {
						errorCount++
						validationErrors.push({
							row: rowNumber,
							semester_code: semesterCode,
							course_code: courseCode,
							errors: [error instanceof Error ? error.message : 'Network error']
						})
					}
				}

				setLoading(false)

				// Update upload summary
				setUploadSummary({
					total: jsonData.length,
					success: successCount,
					failed: errorCount
				})

				// Show error dialog if needed
				if (validationErrors.length > 0) {
					setImportErrors(validationErrors)
					setErrorPopupOpen(true)
				}

				// Reload mappings
				if (successCount > 0) {
					await loadExistingMappings()
				}

				// Show appropriate toast
				if (successCount > 0 && errorCount === 0) {
					toast({
						title: '✅ Upload Complete',
						description: `Successfully uploaded all ${successCount} row${successCount > 1 ? 's' : ''} (${successCount} mapping${successCount > 1 ? 's' : ''}) to the database.`,
						className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
						duration: 5000
					})
				} else if (successCount > 0 && errorCount > 0) {
					toast({
						title: '⚠️ Partial Upload Success',
						description: `Processed ${jsonData.length} row${jsonData.length > 1 ? 's' : ''}: ${successCount} successful, ${errorCount} failed. View error details below.`,
						className: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
						duration: 6000
					})
				} else if (errorCount > 0) {
					toast({
						title: '❌ Upload Failed',
						description: `Processed ${jsonData.length} row${jsonData.length > 1 ? 's' : ''}: 0 successful, ${errorCount} failed. View error details below.`,
						variant: 'destructive',
						className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
						duration: 6000
					})
				}
			} catch (err) {
				console.error('Import error:', err)
				setLoading(false)
				toast({
					title: '❌ Import Error',
					description: 'Import failed. Please check your file format and try again.',
					variant: 'destructive',
					className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
				})
			}
		}
		input.click()
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
									<BreadcrumbPage>Course Mapping</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					{/* Parent Form Card */}
					<Card>
						<CardHeader className="p-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
										<Link2 className="h-4 w-4 text-primary" />
									</div>
									<div>
										<h2 className="text-lg font-semibold">Course Mapping Configuration</h2>
										<p className="text-xs text-muted-foreground">Map courses to programs and semesters</p>
									</div>
								</div>
								<div className="flex gap-2">
									<Button variant="outline" size="sm" className="h-8 text-[11px] px-2" onClick={handleRefresh} disabled={loading || !selectedRegulation}>
										<RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
									<Button variant="outline" size="sm" className="h-8 text-[11px] px-2" onClick={handleTemplateExport}>
										<FileSpreadsheet className="h-3 w-3 mr-1" />
										Template
									</Button>
									<Button variant="outline" size="sm" className="h-8 text-[11px] px-2" onClick={handleExport} disabled={semesterTables.length === 0}>
										<Download className="h-3 w-3 mr-1" />
										Download
									</Button>
									<Button variant="outline" size="sm" className="h-8 text-[11px] px-2" onClick={handleImport} disabled={!selectedInstitution || !selectedProgram || !selectedRegulation}>
										<Upload className="h-3 w-3 mr-1" />
										Upload
									</Button>
									<Button variant="outline" size="sm" className="h-8 text-[11px] px-2" onClick={resetForm}>
										Reset
									</Button>
									<Button size="sm" className="h-8 text-[11px] px-2" onClick={saveAllMappings} disabled={saving || loading}>
										<Save className="h-3 w-3 mr-1" />
										Save All
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-3 pt-0">
							<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
								<div className="space-y-2">
									<Label className="text-xs">Institution <span className="text-red-500">*</span></Label>
									<Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
										<SelectTrigger className="h-7 text-[11px]">
											<SelectValue placeholder="Select institution" />
										</SelectTrigger>
										<SelectContent>
											{institutions.map(inst => (
												<SelectItem key={inst.id} value={inst.institution_code} className="text-[11px]">
													{inst.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label className="text-xs">Program <span className="text-red-500">*</span></Label>
									<Select value={selectedProgram} onValueChange={setSelectedProgram} disabled={!selectedInstitution}>
										<SelectTrigger className="h-7 text-[11px]">
											<SelectValue placeholder="Select program" />
										</SelectTrigger>
										<SelectContent>
											{programs.map(prog => (
												<SelectItem key={prog.id} value={prog.program_code} className="text-[11px]">
													{prog.program_name} ({prog.program_code})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label className="text-xs">Regulation <span className="text-red-500">*</span></Label>
									<Select value={selectedRegulation} onValueChange={setSelectedRegulation} disabled={!selectedProgram}>
										<SelectTrigger className="h-7 text-[11px]">
											<SelectValue placeholder="Select regulation" />
										</SelectTrigger>
										<SelectContent>
											{regulations.map(reg => (
												<SelectItem key={reg.id} value={reg.regulation_code} className="text-[11px]">
													{reg.regulation_name} ({reg.regulation_code})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{selectedInstitution && selectedProgram && selectedRegulation && (
								<div className="mt-3 p-2 bg-muted rounded-lg">
									<div className="grid grid-cols-3 gap-3 text-[11px]">
										<div>
											<span className="font-medium">Institution Code:</span> {selectedInstitution}
										</div>
										<div>
											<span className="font-medium">Program Code:</span> {selectedProgram}
										</div>
										<div>
											<span className="font-medium">Regulation Code:</span> {selectedRegulation}
										</div>
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Semester Tables */}
					{selectedRegulation && semesterTables.length > 0 && (
						<div className="space-y-3 relative">
							{/* Course Filter Indicator */}
							{(selectedInstitution || selectedProgram || selectedRegulation) && (
								<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
									<div className="flex items-center gap-2">

										<span className="text-[11px] text-blue-600 dark:text-blue-400 ml-auto">
											{courses.length} course{courses.length !== 1 ? 's' : ''} available
										</span>
									</div>
								</div>
							)}
							{semesterTables.map((table, semIndex) => (
								<Card key={table.semester.id} className="relative overflow-hidden">
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
														<Badge variant="outline" className="ml-2 text-[10px] h-5">
															{table.mappings.filter(m => m.course_id).length} courses mapped
														</Badge>
													</div>
													<div className="flex gap-2">
														<Button
															size="sm"
															variant="outline"
															className="h-7 text-[11px] px-2"
															onClick={(e) => {
																e.stopPropagation()
																addCourseRow(semIndex)
															}}
														>
															<Plus className="h-3 w-3 mr-1" />
															Add Course
														</Button>
													</div>
												</div>
											</CollapsibleTrigger>

											<CollapsibleContent>
												<div className="mt-4 border rounded-lg bg-background shadow-sm">
													<div className="overflow-x-auto overflow-y-auto relative isolate scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 pr-2" style={{ maxHeight: "440px" }}>
														<Table className="mr-2">
															<TableHeader className="sticky top-0 z-[5] bg-slate-50 dark:bg-slate-900/50 border-b shadow-sm">
																<TableRow>
																	<TableHead className="w-[50px] text-[11px] h-8">#</TableHead>
																	<TableHead className="w-[180px] text-[11px] h-8">Course Code</TableHead>
																	<TableHead className="w-[220px] text-[11px] h-8">Course Name</TableHead>
																	<TableHead className="w-[150px] text-[11px] h-8">Course Category</TableHead>
																	<TableHead className="w-[120px] text-[11px] h-8">Course Group</TableHead>
																	<TableHead className="w-[80px] text-[11px] h-8">Order</TableHead>
																	<TableHead className="w-[200px] text-center text-[11px] h-8" colSpan={3}>Internal Marks</TableHead>
																	<TableHead className="w-[200px] text-center text-[11px] h-8" colSpan={3}>External Marks</TableHead>
																	<TableHead className="w-[150px] text-center text-[11px] h-8" colSpan={2}>Total</TableHead>
																	<TableHead className="w-[100px] text-center text-[11px] h-8">Annual</TableHead>
																	<TableHead className="w-[120px] text-center text-[11px] h-8">
																	<div className="flex flex-col items-center gap-1">
																		<span className="text-[10px]">Registration</span>
																		<Checkbox
																			checked={selectAllRegistration[`semester_${semIndex}`] || false}
																			onCheckedChange={() => toggleAllRegistration(semIndex)}
																			aria-label="Select all registration based"
																			className="h-3 w-3"
																		/>
																	</div>
																</TableHead>
																<TableHead className="w-[100px] text-center text-[11px] h-8">
																	<div className="flex flex-col items-center gap-1">
																		<span className="text-[10px]">Active</span>
																		<Checkbox
																			checked={selectAllStatus[`semester_${semIndex}`] !== false}
																			onCheckedChange={() => toggleAllStatus(semIndex)}
																			aria-label="Select all active"
																			className="h-3 w-3"
																		/>
																	</div>
																</TableHead>
																<TableHead className="w-[80px] text-[11px] h-8">Action</TableHead>
															</TableRow>
															<TableRow className="border-b">
																<TableHead className="py-2"></TableHead>
																<TableHead className="py-2"></TableHead>
																<TableHead className="py-2"></TableHead>
																<TableHead className="py-2"></TableHead>
																<TableHead className="py-2"></TableHead>
																<TableHead className="py-2"></TableHead>
																<TableHead className="text-xs text-center py-2">Pass</TableHead>
																<TableHead className="text-xs text-center py-2">Max</TableHead>
																<TableHead className="text-xs text-center py-2">Convert</TableHead>
																<TableHead className="text-xs text-center py-2">Pass</TableHead>
																<TableHead className="text-xs text-center py-2">Max</TableHead>
																<TableHead className="text-xs text-center py-2">Convert</TableHead>
																<TableHead className="text-xs text-center py-2">Pass</TableHead>
																<TableHead className="text-xs text-center py-2">Max</TableHead>
																<TableHead className="py-2"></TableHead>
																<TableHead className="py-2"></TableHead>
																<TableHead className="py-2"></TableHead>
																<TableHead className="py-2"></TableHead>
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
																	<TableRow key={rowIndex} className="hover:bg-muted/50">
																		<TableCell className="text-sm font-medium py-3">{rowIndex + 1}</TableCell>
																		<TableCell className="py-3">
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
																						aria-expanded={openPopovers[`${semIndex}_${rowIndex}`] || false}
																						className="h-9 w-full justify-between text-sm font-normal"
																					>
																						{mapping.course_id
																							? (() => {
																								const course = courses.find(c => c.id === mapping.course_id)
																								return course?.course_code || "Select course"
																							})()
																							: courses.length === 0
																								? "No courses available"
																								: "Select course"}
																						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
																					</Button>
																				</PopoverTrigger>
																				<PopoverContent className="w-[400px] p-0" align="start">
																					<Command>
																						<CommandInput placeholder="Search by course code or name..." className="h-9" />
																						<CommandList>
																							<CommandEmpty>No course found.</CommandEmpty>
																							<CommandGroup>
																								{courses.map((course) => (
																									<CommandItem
																										key={course.id}
																										value={`${course.course_code} ${course.course_title || course.course_name || ''}`}
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
																												{course.course_title || course.course_name || '-'}
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
																		<TableCell className="text-sm py-3">
																			{(() => {
																				const course = courses.find(c => c.id === mapping.course_id)
																				return course?.course_title || course?.course_name || '-'
																			})()}
																		</TableCell>
																		<TableCell className="text-sm py-3">
																			{mapping.course_category || '-'}
																		</TableCell>
																		<TableCell className="py-3">
																			<Select
																				value={mapping.course_group || "General"}
																				onValueChange={(v) => updateCourseRow(semIndex, rowIndex, 'course_group', v)}
																			>
																				<SelectTrigger className="h-9 text-sm w-full">
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
																		<TableCell className="py-3">
																			<Input
																				type="number"
																				value={mapping.course_order || 1}
																				onChange={(e) => updateCourseRow(semIndex, rowIndex, 'course_order', parseFloat(e.target.value))}
																				className="h-9 w-20 text-sm text-center"
																				min={0.1}
																				max={999}
																				step={0.1}
																			/>
																		</TableCell>
																		<TableCell className="py-3">
																			<Input
																				type="number"
																				value={mapping.internal_pass_mark || 0}
																				onChange={(e) => updateCourseRow(semIndex, rowIndex, 'internal_pass_mark', parseInt(e.target.value))}
																				className="h-9 w-16 text-sm text-center"
																				min={0}
																			/>
																		</TableCell>
																		<TableCell className="py-3">
																			<Input
																				type="number"
																				value={mapping.internal_max_mark || 0}
																				onChange={(e) => updateCourseRow(semIndex, rowIndex, 'internal_max_mark', parseInt(e.target.value))}
																				className="h-9 w-16 text-sm text-center"
																				min={0}
																			/>
																		</TableCell>
																		<TableCell className="py-3">
																			<Input
																				type="number"
																				value={mapping.internal_converted_mark || 0}
																				onChange={(e) => updateCourseRow(semIndex, rowIndex, 'internal_converted_mark', parseInt(e.target.value))}
																				className="h-9 w-16 text-sm text-center"
																				min={0}
																			/>
																		</TableCell>
																		<TableCell className="py-3">
																			<Input
																				type="number"
																				value={mapping.external_pass_mark || 0}
																				onChange={(e) => updateCourseRow(semIndex, rowIndex, 'external_pass_mark', parseInt(e.target.value))}
																				className="h-9 w-16 text-sm text-center"
																				min={0}
																			/>
																		</TableCell>
																		<TableCell className="py-3">
																			<Input
																				type="number"
																				value={mapping.external_max_mark || 0}
																				onChange={(e) => updateCourseRow(semIndex, rowIndex, 'external_max_mark', parseInt(e.target.value))}
																				className="h-9 w-16 text-sm text-center"
																				min={0}
																			/>
																		</TableCell>
																		<TableCell className="py-3">
																			<Input
																				type="number"
																				value={mapping.external_converted_mark || 0}
																				onChange={(e) => updateCourseRow(semIndex, rowIndex, 'external_converted_mark', parseInt(e.target.value))}
																				className="h-9 w-16 text-sm text-center"
																				min={0}
																			/>
																		</TableCell>
																		<TableCell className="py-3">
																			<Input
																				type="number"
																				value={mapping.total_pass_mark || 0}
																				onChange={(e) => updateCourseRow(semIndex, rowIndex, 'total_pass_mark', parseInt(e.target.value))}
																				className="h-9 w-16 text-sm text-center"
																				min={0}
																			/>
																		</TableCell>
																		<TableCell className="py-3">
																			<Input
																				type="number"
																				value={mapping.total_max_mark || 0}
																				onChange={(e) => updateCourseRow(semIndex, rowIndex, 'total_max_mark', parseInt(e.target.value))}
																				className="h-9 w-16 text-sm text-center"
																				min={0}
																			/>
																		</TableCell>
																		<TableCell className="text-center py-3">
																			<Checkbox
																				checked={mapping.annual_semester || false}
																				onCheckedChange={(v) => updateCourseRow(semIndex, rowIndex, 'annual_semester', v)}
																				className="h-5 w-5"
																			/>
																		</TableCell>
																		<TableCell className="text-center py-3">
																			<Checkbox
																				checked={mapping.registration_based || false}
																				onCheckedChange={(v) => updateCourseRow(semIndex, rowIndex, 'registration_based', v)}
																				className="h-5 w-5"
																			/>
																		</TableCell>
																		<TableCell className="text-center py-3">
																			<Checkbox
																				checked={mapping.is_active !== false}
																				onCheckedChange={(v) => updateCourseRow(semIndex, rowIndex, 'is_active', v)}
																				className="h-5 w-5"
																			/>
																		</TableCell>
																		<TableCell className="py-3">
																			<Button
																				variant="ghost"
																				size="sm"
																				onClick={() => removeCourseRow(semIndex, rowIndex)}
																				className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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

			{/* Error Popup Dialog */}
			<AlertDialog open={errorPopupOpen} onOpenChange={setErrorPopupOpen}>
				<AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
					<AlertDialogHeader>
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
								<XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
							</div>
							<div>
								<AlertDialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
									Data Validation Errors
								</AlertDialogTitle>
								<AlertDialogDescription className="text-sm text-muted-foreground mt-1">
									Please fix the following errors before importing the data
								</AlertDialogDescription>
							</div>
						</div>
					</AlertDialogHeader>

					<div className="space-y-4">
						{/* Upload Summary */}
						{uploadSummary.total > 0 && (
							<div className="grid grid-cols-3 gap-3">
								<div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
									<div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Total Rows</div>
									<div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{uploadSummary.total}</div>
								</div>
								<div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3">
									<div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Successful</div>
									<div className="text-2xl font-bold text-green-700 dark:text-green-300">{uploadSummary.success}</div>
								</div>
								<div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
									<div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Failed</div>
									<div className="text-2xl font-bold text-red-700 dark:text-red-300">{uploadSummary.failed}</div>
								</div>
							</div>
						)}

						<div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
							<div className="flex items-center gap-2 mb-2">
								<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
								<span className="font-semibold text-red-800 dark:text-red-200">
									{importErrors.length} row{importErrors.length > 1 ? 's' : ''} failed validation
								</span>
							</div>
							<p className="text-sm text-red-700 dark:text-red-300">
								Please correct these errors in your Excel file and try uploading again. Row numbers correspond to your Excel file (including header row).
							</p>
						</div>

						<div className="space-y-3">
							{importErrors.map((error, index) => (
								<div key={index} className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/5">
									<div className="flex items-start justify-between mb-2">
										<div className="flex items-center gap-2">
											<Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-700">
												Row {error.row}
											</Badge>
											<span className="font-medium text-sm">
												{error.semester_code} - {error.course_code}
											</span>
										</div>
									</div>

									<div className="space-y-1">
										{error.errors.map((err, errIndex) => (
											<div key={errIndex} className="flex items-start gap-2 text-sm">
												<XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
												<span className="text-red-700 dark:text-red-300">{err}</span>
											</div>
										))}
									</div>
								</div>
							))}
						</div>

						<div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
							<div className="flex items-start gap-2">
								<div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mt-0.5">
									<span className="text-xs font-bold text-blue-600 dark:text-blue-400">i</span>
								</div>
								<div>
									<h4 className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-1">Common Fixes:</h4>
									<ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
										<li>• Ensure Institution Code, Program Code, Regulation Code, Semester Code, and Course Code are provided</li>
										<li>• Course Code must exist in the available courses for the selected institution and regulation</li>
										<li>• Semester Code must match one of the available semesters for the selected program</li>
										<li>• Mark values should be numeric and within valid ranges</li>
										<li>• Annual Semester and Registration Based: Yes/No</li>
										<li>• Status: Active/Inactive</li>
									</ul>
								</div>
							</div>
						</div>
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
							Close
						</AlertDialogCancel>
						<Button
							onClick={() => {
								setErrorPopupOpen(false)
								setImportErrors([])
							}}
							className="bg-blue-600 hover:bg-blue-700 text-white"
						>
							Try Again
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</SidebarProvider>
	)
}