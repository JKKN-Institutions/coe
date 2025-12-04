"use client"

import { useMemo, useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AppFooter } from "@/components/layout/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/common/use-toast"
import { useAuth } from "@/lib/auth/auth-context-parent"
import Link from "next/link"
import {
	Trash2,
	Search,
	ChevronLeft,
	ChevronRight,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	FileSpreadsheet,
	RefreshCw,
	Upload,
	Download,
	CheckCircle,
	XCircle,
	AlertTriangle,
	FileUp,
	ClipboardList
} from "lucide-react"

// Types
interface InternalMark {
	id: string
	institutions_id: string
	examination_session_id: string
	program_id: string
	course_id: string
	student_id: string
	student_name: string
	register_no: string
	course_code: string
	course_name: string
	program_name: string
	session_name: string
	assignment_marks: number | null
	quiz_marks: number | null
	mid_term_marks: number | null
	presentation_marks: number | null
	attendance_marks: number | null
	lab_marks: number | null
	project_marks: number | null
	seminar_marks: number | null
	viva_marks: number | null
	other_marks: number | null
	test_1_mark: number | null
	test_2_mark: number | null
	test_3_mark: number | null
	total_internal_marks: number | null
	max_internal_marks: number | null
	internal_percentage: number | null
	marks_status: string
	remarks: string | null
	is_active: boolean
	created_at: string
}

interface ImportPreviewRow {
	row: number
	register_no: string
	course_code: string
	session_code: string
	program_code: string
	assignment_marks: number | null
	quiz_marks: number | null
	mid_term_marks: number | null
	presentation_marks: number | null
	attendance_marks: number | null
	lab_marks: number | null
	project_marks: number | null
	seminar_marks: number | null
	viva_marks: number | null
	other_marks: number | null
	test_1_mark: number | null
	test_2_mark: number | null
	test_3_mark: number | null
	max_internal_marks: number
	remarks: string
	errors: string[]
	isValid: boolean
}

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

interface Program {
	id: string
	program_code: string
	program_name: string
}

interface Course {
	id: string
	course_code: string
	course_name: string
	internal_max_mark: number
}

export default function BulkInternalMarksPage() {
	const { toast } = useToast()
	const { user } = useAuth()
	const [items, setItems] = useState<InternalMark[]>([])
	const [loading, setLoading] = useState(false)
	const [searchTerm, setSearchTerm] = useState("")
	const [sortColumn, setSortColumn] = useState<string | null>(null)
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 15

	// Filters
	const [institutions, setInstitutions] = useState<Institution[]>([])
	const [sessions, setSessions] = useState<Session[]>([])
	const [programs, setPrograms] = useState<Program[]>([])
	const [courses, setCourses] = useState<Course[]>([])
	const [selectedInstitution, setSelectedInstitution] = useState("")
	const [selectedSession, setSelectedSession] = useState("")
	const [selectedProgram, setSelectedProgram] = useState("")
	const [selectedCourse, setSelectedCourse] = useState("")
	const [statusFilter, setStatusFilter] = useState("all")

	// Selection
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
	const [selectAll, setSelectAll] = useState(false)

	// Dialogs
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
	const [errorDialogOpen, setErrorDialogOpen] = useState(false)

	// Import/Upload
	const [importPreviewData, setImportPreviewData] = useState<ImportPreviewRow[]>([])
	const [uploadErrors, setUploadErrors] = useState<any[]>([])
	const [uploadSummary, setUploadSummary] = useState({
		total: 0,
		success: 0,
		failed: 0,
		skipped: 0
	})

	// Fetch institutions on mount
	useEffect(() => {
		fetchInstitutions()
	}, [])

	// Fetch sessions when institution changes
	useEffect(() => {
		if (selectedInstitution) {
			fetchSessions(selectedInstitution)
			fetchPrograms(selectedInstitution)
			fetchCourses(selectedInstitution)
		} else {
			setSessions([])
			setPrograms([])
			setCourses([])
		}
		setSelectedSession("")
		setSelectedProgram("")
		setSelectedCourse("")
	}, [selectedInstitution])

	// Fetch marks when filters change
	useEffect(() => {
		if (selectedInstitution) {
			fetchMarks()
		}
	}, [selectedInstitution, selectedSession, selectedProgram, selectedCourse])

	const fetchInstitutions = async () => {
		try {
			const res = await fetch('/api/pre-exam/internal-marks?action=institutions')
			if (res.ok) {
				const data = await res.json()
				setInstitutions(data)
			}
		} catch (error) {
			console.error('Failed to fetch institutions:', error)
		}
	}

	const fetchSessions = async (institutionId: string) => {
		try {
			const res = await fetch(`/api/pre-exam/internal-marks?action=sessions&institutionId=${institutionId}`)
			if (res.ok) {
				const data = await res.json()
				setSessions(data)
			}
		} catch (error) {
			console.error('Failed to fetch sessions:', error)
		}
	}

	const fetchPrograms = async (institutionId: string) => {
		try {
			const res = await fetch(`/api/pre-exam/internal-marks?action=programs&institutionId=${institutionId}`)
			if (res.ok) {
				const data = await res.json()
				setPrograms(data)
			}
		} catch (error) {
			console.error('Failed to fetch programs:', error)
		}
	}

	const fetchCourses = async (institutionId: string) => {
		try {
			const res = await fetch(`/api/pre-exam/internal-marks?action=courses&institutionId=${institutionId}`)
			if (res.ok) {
				const data = await res.json()
				setCourses(data)
			}
		} catch (error) {
			console.error('Failed to fetch courses:', error)
		}
	}

	const fetchMarks = async () => {
		try {
			setLoading(true)
			let url = `/api/pre-exam/internal-marks?action=marks&institutionId=${selectedInstitution}`
			if (selectedSession) url += `&sessionId=${selectedSession}`
			if (selectedProgram) url += `&programId=${selectedProgram}`
			if (selectedCourse) url += `&courseId=${selectedCourse}`

			const res = await fetch(url)
			if (res.ok) {
				const data = await res.json()
				setItems(data)
			}
		} catch (error) {
			console.error('Failed to fetch marks:', error)
			setItems([])
		} finally {
			setLoading(false)
		}
	}

	// Sorting
	const handleSort = (column: string) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc")
		} else {
			setSortColumn(column)
			setSortDirection("asc")
		}
	}

	const getSortIcon = (column: string) => {
		if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
		return sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
	}

	// Get internal type and marks for display
	const getInternalTypeAndMarks = (mark: InternalMark): { type: string; marks: number | null } => {
		if (mark.assignment_marks !== null) return { type: 'Assignment', marks: mark.assignment_marks }
		if (mark.quiz_marks !== null) return { type: 'Quiz', marks: mark.quiz_marks }
		if (mark.mid_term_marks !== null) return { type: 'Mid Term', marks: mark.mid_term_marks }
		if (mark.presentation_marks !== null) return { type: 'Presentation', marks: mark.presentation_marks }
		if (mark.attendance_marks !== null) return { type: 'Attendance', marks: mark.attendance_marks }
		if (mark.lab_marks !== null) return { type: 'Lab', marks: mark.lab_marks }
		if (mark.project_marks !== null) return { type: 'Project', marks: mark.project_marks }
		if (mark.seminar_marks !== null) return { type: 'Seminar', marks: mark.seminar_marks }
		if (mark.viva_marks !== null) return { type: 'Viva', marks: mark.viva_marks }
		if (mark.test_1_mark !== null) return { type: 'Test 1', marks: mark.test_1_mark }
		if (mark.test_2_mark !== null) return { type: 'Test 2', marks: mark.test_2_mark }
		if (mark.test_3_mark !== null) return { type: 'Test 3', marks: mark.test_3_mark }
		if (mark.other_marks !== null) return { type: 'Other', marks: mark.other_marks }
		return { type: 'N/A', marks: null }
	}

	// Filter and sort
	const filtered = useMemo(() => {
		const q = searchTerm.toLowerCase()
		let data = items.filter((i) =>
			[i.register_no, i.student_name, i.course_code, i.course_name]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		)

		if (statusFilter !== "all") {
			data = data.filter((i) => i.marks_status?.toLowerCase() === statusFilter.toLowerCase())
		}

		if (!sortColumn) return data

		return [...data].sort((a, b) => {
			const av = (a as any)[sortColumn]
			const bv = (b as any)[sortColumn]
			if (av === bv) return 0
			if (sortDirection === "asc") return av > bv ? 1 : -1
			return av < bv ? 1 : -1
		})
	}, [items, searchTerm, sortColumn, sortDirection, statusFilter])

	// Pagination
	const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const pageItems = filtered.slice(startIndex, endIndex)

	useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection, statusFilter])

	// Selection handlers
	const handleSelectAll = (checked: boolean) => {
		setSelectAll(checked)
		if (checked) {
			setSelectedIds(new Set(pageItems.map(item => item.id)))
		} else {
			setSelectedIds(new Set())
		}
	}

	const handleSelectItem = (id: string, checked: boolean) => {
		const newSelected = new Set(selectedIds)
		if (checked) {
			newSelected.add(id)
		} else {
			newSelected.delete(id)
		}
		setSelectedIds(newSelected)
		setSelectAll(newSelected.size === pageItems.length)
	}

	// Download Template
	const handleDownloadTemplate = () => {
		const wb = XLSX.utils.book_new()

		// Template sheet with ALL required columns
		// Based on internal_marks table requirements
		const templateData = [
			{
				'Register No *': 'STU001',
				'Course Code *': 'CS101',
				'Session Code': 'APR2024',
				'Program Code': 'BCA',
				'Assignment Marks': 8,
				'Quiz Marks': 9,
				'Mid Term Marks': 35,
				'Presentation Marks': '',
				'Attendance Marks': 5,
				'Lab Marks': '',
				'Project Marks': '',
				'Seminar Marks': '',
				'Viva Marks': '',
				'Test 1 Mark': '',
				'Test 2 Mark': '',
				'Test 3 Mark': '',
				'Other Marks': '',
				'Max Internal Marks *': 100,
				'Remarks': 'Good performance'
			},
			{
				'Register No *': 'STU002',
				'Course Code *': 'CS101',
				'Session Code': 'APR2024',
				'Program Code': 'BCA',
				'Assignment Marks': 7,
				'Quiz Marks': 8,
				'Mid Term Marks': 30,
				'Presentation Marks': '',
				'Attendance Marks': 4,
				'Lab Marks': '',
				'Project Marks': '',
				'Seminar Marks': '',
				'Viva Marks': '',
				'Test 1 Mark': '',
				'Test 2 Mark': '',
				'Test 3 Mark': '',
				'Other Marks': '',
				'Max Internal Marks *': 100,
				'Remarks': ''
			}
		]

		const ws = XLSX.utils.json_to_sheet(templateData)

		// Set column widths
		ws['!cols'] = [
			{ wch: 18 }, // Register No
			{ wch: 15 }, // Course Code
			{ wch: 15 }, // Session Code
			{ wch: 15 }, // Program Code
			{ wch: 18 }, // Assignment Marks
			{ wch: 12 }, // Quiz Marks
			{ wch: 16 }, // Mid Term Marks
			{ wch: 18 }, // Presentation Marks
			{ wch: 18 }, // Attendance Marks
			{ wch: 12 }, // Lab Marks
			{ wch: 14 }, // Project Marks
			{ wch: 14 }, // Seminar Marks
			{ wch: 12 }, // Viva Marks
			{ wch: 12 }, // Test 1 Mark
			{ wch: 12 }, // Test 2 Mark
			{ wch: 12 }, // Test 3 Mark
			{ wch: 12 }, // Other Marks
			{ wch: 20 }, // Max Internal Marks
			{ wch: 30 }  // Remarks
		]

		// Style the header row to make mandatory fields red
		const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
		const mandatoryFields = ['Register No *', 'Course Code *', 'Max Internal Marks *']

		for (let col = range.s.c; col <= range.e.c; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
			if (!ws[cellAddress]) continue

			const cell = ws[cellAddress]
			const isMandatory = mandatoryFields.includes(cell.v as string)

			if (isMandatory) {
				// Make mandatory field headers red
				cell.s = {
					font: { color: { rgb: 'FF0000' }, bold: true },
					fill: { fgColor: { rgb: 'FFE6E6' } }
				}
			} else {
				// Regular field headers
				cell.s = {
					font: { bold: true },
					fill: { fgColor: { rgb: 'F0F0F0' } }
				}
			}
		}

		XLSX.utils.book_append_sheet(wb, ws, 'Internal Marks Template')

		// Reference sheet for internal types/columns explanation
		const columnsReference = [
			{ 'Column Name': 'Register No *', 'Required': 'Yes', 'Description': 'Student registration number', 'Example': 'STU001' },
			{ 'Column Name': 'Course Code *', 'Required': 'Yes', 'Description': 'Course code from courses table', 'Example': 'CS101' },
			{ 'Column Name': 'Session Code', 'Required': 'No', 'Description': 'Examination session code', 'Example': 'APR2024' },
			{ 'Column Name': 'Program Code', 'Required': 'No', 'Description': 'Program code from programs table', 'Example': 'BCA' },
			{ 'Column Name': 'Assignment Marks', 'Required': 'No', 'Description': 'Assignment marks (0-100)', 'Example': '8' },
			{ 'Column Name': 'Quiz Marks', 'Required': 'No', 'Description': 'Quiz marks (0-100)', 'Example': '9' },
			{ 'Column Name': 'Mid Term Marks', 'Required': 'No', 'Description': 'Mid term exam marks (0-100)', 'Example': '35' },
			{ 'Column Name': 'Presentation Marks', 'Required': 'No', 'Description': 'Presentation marks (0-100)', 'Example': '10' },
			{ 'Column Name': 'Attendance Marks', 'Required': 'No', 'Description': 'Attendance marks (0-100)', 'Example': '5' },
			{ 'Column Name': 'Lab Marks', 'Required': 'No', 'Description': 'Lab/practical marks (0-100)', 'Example': '15' },
			{ 'Column Name': 'Project Marks', 'Required': 'No', 'Description': 'Project marks (0-100)', 'Example': '20' },
			{ 'Column Name': 'Seminar Marks', 'Required': 'No', 'Description': 'Seminar marks (0-100)', 'Example': '10' },
			{ 'Column Name': 'Viva Marks', 'Required': 'No', 'Description': 'Viva marks (0-100)', 'Example': '15' },
			{ 'Column Name': 'Other Marks', 'Required': 'No', 'Description': 'Other assessment marks (0-100)', 'Example': '5' },
			{ 'Column Name': 'Max Internal Marks *', 'Required': 'Yes', 'Description': 'Maximum internal marks for the course', 'Example': '100' },
			{ 'Column Name': 'Remarks', 'Required': 'No', 'Description': 'Any additional remarks', 'Example': 'Good performance' }
		]

		const wsColumns = XLSX.utils.json_to_sheet(columnsReference)
		wsColumns['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 40 }, { wch: 20 }]

		// Style header row
		const colRange = XLSX.utils.decode_range(wsColumns['!ref'] || 'A1')
		for (let col = colRange.s.c; col <= colRange.e.c; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
			if (wsColumns[cellAddress]) {
				wsColumns[cellAddress].s = {
					font: { bold: true, color: { rgb: '1F2937' } },
					fill: { fgColor: { rgb: 'DBEAFE' } }
				}
			}
		}

		XLSX.utils.book_append_sheet(wb, wsColumns, 'Column Reference')

		// Sessions reference if available
		if (sessions.length > 0) {
			const sessionsRef = sessions.map(s => ({
				'Session Code': s.session_code,
				'Session Name': s.session_name
			}))
			const wsSessions = XLSX.utils.json_to_sheet(sessionsRef)
			wsSessions['!cols'] = [{ wch: 15 }, { wch: 40 }]

			// Style header row
			const sessRange = XLSX.utils.decode_range(wsSessions['!ref'] || 'A1')
			for (let col = sessRange.s.c; col <= sessRange.e.c; col++) {
				const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
				if (wsSessions[cellAddress]) {
					wsSessions[cellAddress].s = {
						font: { bold: true, color: { rgb: '1F2937' } },
						fill: { fgColor: { rgb: 'DBEAFE' } }
					}
				}
			}

			XLSX.utils.book_append_sheet(wb, wsSessions, 'Sessions Reference')
		}

		// Programs reference if available
		if (programs.length > 0) {
			const programsRef = programs.map(p => ({
				'Program Code': p.program_code,
				'Program Name': p.program_name
			}))
			const wsPrograms = XLSX.utils.json_to_sheet(programsRef)
			wsPrograms['!cols'] = [{ wch: 15 }, { wch: 40 }]

			// Style header row
			const progRange = XLSX.utils.decode_range(wsPrograms['!ref'] || 'A1')
			for (let col = progRange.s.c; col <= progRange.e.c; col++) {
				const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
				if (wsPrograms[cellAddress]) {
					wsPrograms[cellAddress].s = {
						font: { bold: true, color: { rgb: '1F2937' } },
						fill: { fgColor: { rgb: 'DBEAFE' } }
					}
				}
			}

			XLSX.utils.book_append_sheet(wb, wsPrograms, 'Programs Reference')
		}

		// Courses reference if available
		if (courses.length > 0) {
			const coursesRef = courses.map(c => ({
				'Course Code': c.course_code,
				'Course Name': c.course_name,
				'Max Internal Marks': c.internal_max_mark || 100
			}))
			const wsCourses = XLSX.utils.json_to_sheet(coursesRef)
			wsCourses['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 20 }]

			// Style header row
			const courseRange = XLSX.utils.decode_range(wsCourses['!ref'] || 'A1')
			for (let col = courseRange.s.c; col <= courseRange.e.c; col++) {
				const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
				if (wsCourses[cellAddress]) {
					wsCourses[cellAddress].s = {
						font: { bold: true, color: { rgb: '1F2937' } },
						fill: { fgColor: { rgb: 'DBEAFE' } }
					}
				}
			}

			XLSX.utils.book_append_sheet(wb, wsCourses, 'Courses Reference')
		}

		// Institutions reference if available
		if (institutions.length > 0) {
			const institutionsRef = institutions.map(i => ({
				'Institution Code': i.institution_code,
				'Institution Name': i.name
			}))
			const wsInst = XLSX.utils.json_to_sheet(institutionsRef)
			wsInst['!cols'] = [{ wch: 20 }, { wch: 40 }]

			// Style header row
			const instRange = XLSX.utils.decode_range(wsInst['!ref'] || 'A1')
			for (let col = instRange.s.c; col <= instRange.e.c; col++) {
				const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
				if (wsInst[cellAddress]) {
					wsInst[cellAddress].s = {
						font: { bold: true, color: { rgb: '1F2937' } },
						fill: { fgColor: { rgb: 'DBEAFE' } }
					}
				}
			}

			XLSX.utils.book_append_sheet(wb, wsInst, 'Institutions Reference')
		}

		XLSX.writeFile(wb, `internal_marks_template_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: "✅ Template Downloaded",
			description: "Internal marks template with reference sheets has been downloaded successfully.",
			className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
		})
	}

	// Export Current Data
	const handleExportData = () => {
		if (!items || items.length === 0) {
			toast({
				title: "⚠️ No Data to Export",
				description: "Please load some data before exporting.",
				variant: "destructive",
				className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
			})
			return
		}

		const exportData = items.map(item => ({
			'Register No': item.register_no || 'N/A',
			'Student Name': item.student_name || '',
			'Course Code': item.course_code || '',
			'Course Name': item.course_name || '',
			'Program': item.program_name || '',
			'Session': item.session_name || '',
			'Assignment Marks': item.assignment_marks ?? '',
			'Quiz Marks': item.quiz_marks ?? '',
			'Mid Term Marks': item.mid_term_marks ?? '',
			'Presentation Marks': item.presentation_marks ?? '',
			'Attendance Marks': item.attendance_marks ?? '',
			'Lab Marks': item.lab_marks ?? '',
			'Project Marks': item.project_marks ?? '',
			'Seminar Marks': item.seminar_marks ?? '',
			'Viva Marks': item.viva_marks ?? '',
			'Test 1 Mark': item.test_1_mark ?? '',
			'Test 2 Mark': item.test_2_mark ?? '',
			'Test 3 Mark': item.test_3_mark ?? '',
			'Other Marks': item.other_marks ?? '',
			'Total Internal Marks': item.total_internal_marks ?? 0,
			'Max Internal Marks': item.max_internal_marks ?? 100,
			'Internal Percentage': item.internal_percentage ?? 0,
			'Status': item.marks_status || 'Draft',
			'Remarks': item.remarks || ''
		}))

		const wb = XLSX.utils.book_new()
		const ws = XLSX.utils.json_to_sheet(exportData)

		// Set column widths
		ws['!cols'] = [
			{ wch: 18 }, // Register No
			{ wch: 25 }, // Student Name
			{ wch: 15 }, // Course Code
			{ wch: 35 }, // Course Name
			{ wch: 25 }, // Program
			{ wch: 20 }, // Session
			{ wch: 15 }, // Assignment Marks
			{ wch: 12 }, // Quiz Marks
			{ wch: 15 }, // Mid Term Marks
			{ wch: 18 }, // Presentation Marks
			{ wch: 17 }, // Attendance Marks
			{ wch: 12 }, // Lab Marks
			{ wch: 14 }, // Project Marks
			{ wch: 15 }, // Seminar Marks
			{ wch: 12 }, // Viva Marks
			{ wch: 13 }, // Test 1 Mark
			{ wch: 13 }, // Test 2 Mark
			{ wch: 13 }, // Test 3 Mark
			{ wch: 13 }, // Other Marks
			{ wch: 18 }, // Total Internal Marks
			{ wch: 18 }, // Max Internal Marks
			{ wch: 18 }, // Internal Percentage
			{ wch: 12 }, // Status
			{ wch: 30 }  // Remarks
		]

		// Style header row
		const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
		for (let col = range.s.c; col <= range.e.c; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
			if (!ws[cellAddress]) continue
			ws[cellAddress].s = {
				font: { bold: true, color: { rgb: "FFFFFF" } },
				fill: { fgColor: { rgb: "4472C4" } },
				alignment: { horizontal: "center", vertical: "center" }
			}
		}

		XLSX.utils.book_append_sheet(wb, ws, 'Internal Marks Data')

		const fileName = `internal_marks_export_${selectedInstitution ? institutions.find(i => i.id === selectedInstitution)?.institution_code || 'all' : 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`
		XLSX.writeFile(wb, fileName)

		toast({
			title: "✅ Data Exported",
			description: `Successfully exported ${items.length} record${items.length > 1 ? 's' : ''} to Excel.`,
			className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
		})
	}

	// Import File
	const handleImportFile = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.xlsx,.xls,.csv'
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) return

			try {
				let rows: any[] = []

				if (file.name.endsWith('.csv')) {
					const text = await file.text()
					const lines = text.split('\n').filter(line => line.trim())
					if (lines.length < 2) {
						toast({
							title: "❌ Invalid CSV File",
							description: "CSV file must have at least a header row and one data row",
							variant: "destructive",
						})
						return
					}

					const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
					rows = lines.slice(1).map(line => {
						const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
						const row: Record<string, string> = {}
						headers.forEach((header, index) => {
							row[header] = values[index] || ''
						})
						return row
					})
				} else {
					const data = new Uint8Array(await file.arrayBuffer())
					const wb = XLSX.read(data, { type: 'array' })
					const ws = wb.Sheets[wb.SheetNames[0]]
					rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
				}

				// Parse and validate
				const previewData: ImportPreviewRow[] = rows.map((row, index) => {
					const errors: string[] = []

					// Parse all fields from the row
					const registerNo = String(row['Register No *'] || row['Register No'] || row['register_no'] || '').trim()
					const courseCode = String(row['Course Code *'] || row['Course Code'] || row['course_code'] || '').trim()
					const sessionCode = String(row['Session Code'] || row['session_code'] || '').trim()
					const programCode = String(row['Program Code'] || row['program_code'] || '').trim()

					// Parse marks for each type (now integers)
					const parseMarks = (value: any): number | null => {
						if (value === '' || value === null || value === undefined) return null
						const num = parseInt(String(value), 10)
						return isNaN(num) ? null : num
					}

					const assignmentMarks = parseMarks(row['Assignment Marks'] || row['assignment_marks'])
					const quizMarks = parseMarks(row['Quiz Marks'] || row['quiz_marks'])
					const midTermMarks = parseMarks(row['Mid Term Marks'] || row['mid_term_marks'])
					const presentationMarks = parseMarks(row['Presentation Marks'] || row['presentation_marks'])
					const attendanceMarks = parseMarks(row['Attendance Marks'] || row['attendance_marks'])
					const labMarks = parseMarks(row['Lab Marks'] || row['lab_marks'])
					const projectMarks = parseMarks(row['Project Marks'] || row['project_marks'])
					const seminarMarks = parseMarks(row['Seminar Marks'] || row['seminar_marks'])
					const vivaMarks = parseMarks(row['Viva Marks'] || row['viva_marks'])
					const otherMarks = parseMarks(row['Other Marks'] || row['other_marks'])
					const test1Mark = parseMarks(row['Test 1 Mark'] || row['test_1_mark'])
					const test2Mark = parseMarks(row['Test 2 Mark'] || row['test_2_mark'])
					const test3Mark = parseMarks(row['Test 3 Mark'] || row['test_3_mark'])

					const maxInternalMarksStr = String(row['Max Internal Marks *'] || row['Max Internal Marks'] || row['max_internal_marks'] || '100').trim()
					const maxInternalMarks = parseFloat(maxInternalMarksStr)
					const remarks = String(row['Remarks'] || row['remarks'] || '').trim()

					// Validate required fields
					if (!registerNo) errors.push('Register No is required')
					if (!courseCode) errors.push('Course Code is required')
					if (isNaN(maxInternalMarks) || maxInternalMarks <= 0) errors.push('Max Internal Marks must be a positive number')

					// Validate marks ranges (each must be 0-100 if provided)
					const validateMarksRange = (name: string, value: number | null) => {
						if (value !== null) {
							if (value < 0) errors.push(`${name} cannot be negative`)
							if (value > 100) errors.push(`${name} cannot exceed 100`)
						}
					}

					validateMarksRange('Assignment Marks', assignmentMarks)
					validateMarksRange('Quiz Marks', quizMarks)
					validateMarksRange('Mid Term Marks', midTermMarks)
					validateMarksRange('Presentation Marks', presentationMarks)
					validateMarksRange('Attendance Marks', attendanceMarks)
					validateMarksRange('Lab Marks', labMarks)
					validateMarksRange('Project Marks', projectMarks)
					validateMarksRange('Seminar Marks', seminarMarks)
					validateMarksRange('Viva Marks', vivaMarks)
					validateMarksRange('Test 1 Mark', test1Mark)
					validateMarksRange('Test 2 Mark', test2Mark)
					validateMarksRange('Test 3 Mark', test3Mark)
					validateMarksRange('Other Marks', otherMarks)

					// Check if at least one marks type is provided
					const hasAnyMarks = assignmentMarks !== null || quizMarks !== null || midTermMarks !== null ||
						presentationMarks !== null || attendanceMarks !== null || labMarks !== null ||
						projectMarks !== null || seminarMarks !== null || vivaMarks !== null || otherMarks !== null ||
						test1Mark !== null || test2Mark !== null || test3Mark !== null

					if (!hasAnyMarks) {
						errors.push('At least one marks type must be provided')
					}

					return {
						row: index + 2,
						register_no: registerNo,
						course_code: courseCode,
						session_code: sessionCode,
						program_code: programCode,
						assignment_marks: assignmentMarks,
						quiz_marks: quizMarks,
						mid_term_marks: midTermMarks,
						presentation_marks: presentationMarks,
						attendance_marks: attendanceMarks,
						lab_marks: labMarks,
						project_marks: projectMarks,
						seminar_marks: seminarMarks,
						viva_marks: vivaMarks,
						other_marks: otherMarks,
						test_1_mark: test1Mark,
						test_2_mark: test2Mark,
						test_3_mark: test3Mark,
						max_internal_marks: isNaN(maxInternalMarks) ? 100 : maxInternalMarks,
						remarks,
						errors,
						isValid: errors.length === 0
					}
				})

				setImportPreviewData(previewData)
				setPreviewDialogOpen(true)

			} catch (error) {
				console.error('Import error:', error)
				toast({
					title: "❌ Import Error",
					description: "Failed to parse the file. Please check the format.",
					variant: "destructive",
				})
			}
		}
		input.click()
	}

	// Upload Marks
	const handleUploadMarks = async () => {
		if (!selectedInstitution) {
			toast({
				title: "⚠️ Select Institution",
				description: "Please select an institution before uploading marks.",
				variant: "destructive",
			})
			return
		}

		const validRows = importPreviewData.filter(row => row.isValid)
		if (validRows.length === 0) {
			toast({
				title: "❌ No Valid Data",
				description: "No valid rows to upload. Please fix the errors and try again.",
				variant: "destructive",
			})
			return
		}

		setPreviewDialogOpen(false)
		setLoading(true)

		try {
			const marksData = validRows.map(row => ({
				register_no: row.register_no,
				course_code: row.course_code,
				session_code: row.session_code,
				program_code: row.program_code,
				assignment_marks: row.assignment_marks,
				quiz_marks: row.quiz_marks,
				mid_term_marks: row.mid_term_marks,
				presentation_marks: row.presentation_marks,
				attendance_marks: row.attendance_marks,
				lab_marks: row.lab_marks,
				project_marks: row.project_marks,
				seminar_marks: row.seminar_marks,
				viva_marks: row.viva_marks,
				other_marks: row.other_marks,
				test_1_mark: row.test_1_mark,
				test_2_mark: row.test_2_mark,
				test_3_mark: row.test_3_mark,
				max_internal_marks: row.max_internal_marks,
				remarks: row.remarks
			}))

			const response = await fetch('/api/pre-exam/internal-marks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'bulk-upload',
					institutions_id: selectedInstitution,
					examination_session_id: selectedSession || null,
					program_id: selectedProgram || null,
					course_id: selectedCourse || null,
					marks_data: marksData,
					file_name: 'bulk_upload.xlsx',
					file_type: 'XLSX',
					user_id: user?.id,
					user_email: user?.email
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Upload failed')
			}

			// Update summary
			setUploadSummary({
				total: result.total,
				success: result.successful,
				failed: result.failed,
				skipped: result.skipped
			})

			// Collect all errors
			const allErrors = [
				...(result.errors || []),
				...(result.validation_errors || [])
			]

			if (allErrors.length > 0) {
				setUploadErrors(allErrors)
				setErrorDialogOpen(true)
			}

			// Show toast
			if (result.successful > 0 && result.failed === 0) {
				toast({
					title: "✅ Upload Complete",
					description: `Successfully uploaded all ${result.successful} record(s). Batch #${result.batch_number}`,
					className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
					duration: 5000,
				})
			} else if (result.successful > 0 && result.failed > 0) {
				toast({
					title: "⚠️ Partial Upload",
					description: `${result.successful} successful, ${result.failed} failed. Batch #${result.batch_number}`,
					className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
					duration: 6000,
				})
			} else {
				toast({
					title: "❌ Upload Failed",
					description: `All ${result.failed} record(s) failed. Check errors for details.`,
					variant: "destructive",
					duration: 6000,
				})
			}

			// Refresh data
			fetchMarks()
			setImportPreviewData([])

		} catch (error) {
			console.error('Upload error:', error)
			toast({
				title: "❌ Upload Error",
				description: error instanceof Error ? error.message : 'Failed to upload marks',
				variant: "destructive",
			})
		} finally {
			setLoading(false)
		}
	}

	// Bulk Delete
	const handleBulkDelete = async () => {
		if (selectedIds.size === 0) return

		setLoading(true)
		try {
			const response = await fetch('/api/pre-exam/internal-marks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'bulk-delete',
					ids: Array.from(selectedIds)
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Delete failed')
			}

			toast({
				title: "✅ Deleted Successfully",
				description: `${result.deleted} record(s) have been deleted.`,
				className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
			})

			setSelectedIds(new Set())
			setSelectAll(false)
			fetchMarks()

		} catch (error) {
			console.error('Delete error:', error)
			toast({
				title: "❌ Delete Failed",
				description: error instanceof Error ? error.message : 'Failed to delete records',
				variant: "destructive",
			})
		} finally {
			setLoading(false)
			setDeleteDialogOpen(false)
		}
	}

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
										<Link href="#">Pre Exam</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage>Bulk Internal Marks Upload</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					{/* Scorecard Section */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Total Records</p>
										<p className="text-xl font-bold font-grotesk mt-1">{items.length}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
										<ClipboardList className="h-3 w-3 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Draft</p>
										<p className="text-xl font-bold text-yellow-600 font-grotesk mt-1">
											{items.filter(i => i.marks_status === 'Draft').length}
										</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
										<FileUp className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Submitted</p>
										<p className="text-xl font-bold text-green-600 font-grotesk mt-1">
											{items.filter(i => i.marks_status === 'Submitted').length}
										</p>
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
										<p className="text-xs font-medium text-muted-foreground">Selected</p>
										<p className="text-xl font-bold text-purple-600 font-grotesk mt-1">{selectedIds.size}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
										<CheckCircle className="h-3 w-3 text-purple-600 dark:text-purple-400" />
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Main Card */}
					<Card className="flex-1 flex flex-col min-h-0">
						<CardHeader className="flex-shrink-0 p-3">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
										<Upload className="h-3 w-3 text-primary" />
									</div>
									<div>
										<h2 className="text-sm font-semibold">Bulk Internal Marks Upload</h2>
										<p className="text-[11px] text-muted-foreground">Import and manage internal marks in bulk</p>
									</div>
								</div>
							</div>

							{/* Filters Row 1 */}
							<div className="flex flex-wrap gap-2 mb-2">
								<Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
									<SelectTrigger className="w-[180px] h-8">
										<SelectValue placeholder="Select Institution" />
									</SelectTrigger>
									<SelectContent>
										{institutions.map(inst => (
											<SelectItem key={inst.id} value={inst.id}>
												{inst.name || inst.institution_code}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								<Select value={selectedSession || "all"} onValueChange={(v) => setSelectedSession(v === "all" ? "" : v)} disabled={!selectedInstitution}>
									<SelectTrigger className="w-[180px] h-8">
										<SelectValue placeholder="Select Session" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Sessions</SelectItem>
										{sessions.map(session => (
											<SelectItem key={session.id} value={session.id}>
												{session.session_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								<Select value={selectedProgram || "all"} onValueChange={(v) => setSelectedProgram(v === "all" ? "" : v)} disabled={!selectedInstitution}>
									<SelectTrigger className="w-[180px] h-8">
										<SelectValue placeholder="Select Program" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Programs</SelectItem>
										{programs.map(prog => (
											<SelectItem key={prog.id} value={prog.id}>
												{prog.program_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								<Select value={selectedCourse || "all"} onValueChange={(v) => setSelectedCourse(v === "all" ? "" : v)} disabled={!selectedInstitution}>
									<SelectTrigger className="w-[180px] h-8">
										<SelectValue placeholder="Select Course" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Courses</SelectItem>
										{courses.map(course => (
											<SelectItem key={course.id} value={course.id}>
												{course.course_code} - {course.course_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Filters Row 2 & Actions */}
							<div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
								<div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
									<Select value={statusFilter} onValueChange={setStatusFilter}>
										<SelectTrigger className="w-[140px] h-8">
											<SelectValue placeholder="All Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Status</SelectItem>
											<SelectItem value="draft">Draft</SelectItem>
											<SelectItem value="submitted">Submitted</SelectItem>
											<SelectItem value="approved">Approved</SelectItem>
											<SelectItem value="verified">Verified</SelectItem>
										</SelectContent>
									</Select>

									<div className="relative w-full sm:w-[220px]">
										<Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
										<Input
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											placeholder="Search..."
											className="pl-8 h-8 text-xs"
										/>
									</div>
								</div>

								<div className="flex gap-1 flex-wrap">
									<Button
										variant="outline"
										size="sm"
										className="text-xs px-2 h-8"
										onClick={fetchMarks}
										disabled={loading || !selectedInstitution}
									>
										<RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="text-xs px-2 h-8"
										onClick={handleDownloadTemplate}
									>
										<Download className="h-3 w-3 mr-1" />
										Template
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="text-xs px-2 h-8 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
										onClick={handleExportData}
										disabled={!items || items.length === 0}
									>
										<FileSpreadsheet className="h-3 w-3 mr-1" />
										Export
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="text-xs px-2 h-8"
										onClick={handleImportFile}
										disabled={!selectedInstitution}
									>
										<Upload className="h-3 w-3 mr-1" />
										Import
									</Button>
									<Button
										variant="destructive"
										size="sm"
										className="text-xs px-2 h-8"
										onClick={() => setDeleteDialogOpen(true)}
										disabled={selectedIds.size === 0}
									>
										<Trash2 className="h-3 w-3 mr-1" />
										Delete ({selectedIds.size})
									</Button>
								</div>
							</div>
						</CardHeader>

						<CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">
							{!selectedInstitution ? (
								<div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
									<ClipboardList className="h-12 w-12 mb-4 opacity-50" />
									<p className="text-sm">Please select an institution to view marks</p>
								</div>
							) : (
								<>
									<div className="rounded-md border overflow-hidden" style={{ height: "400px" }}>
										<div className="h-full overflow-auto">
											<Table>
												<TableHeader className="sticky top-0 bg-muted/50 z-10">
													<TableRow>
														<TableHead className="w-[40px] py-2">
															<Checkbox
																checked={selectAll}
																onCheckedChange={handleSelectAll}
															/>
														</TableHead>
														<TableHead className="py-2 cursor-pointer" onClick={() => handleSort('register_no')}>
															<div className="flex items-center gap-1 text-xs font-medium">
																Register No {getSortIcon('register_no')}
															</div>
														</TableHead>
														<TableHead className="py-2 cursor-pointer" onClick={() => handleSort('student_name')}>
															<div className="flex items-center gap-1 text-xs font-medium">
																Student Name {getSortIcon('student_name')}
															</div>
														</TableHead>
														<TableHead className="py-2 cursor-pointer" onClick={() => handleSort('course_code')}>
															<div className="flex items-center gap-1 text-xs font-medium">
																Course Code {getSortIcon('course_code')}
															</div>
														</TableHead>
														<TableHead className="py-2">
															<div className="text-xs font-medium">Course Name</div>
														</TableHead>
														<TableHead className="py-2">
															<div className="text-xs font-medium">Internal Type</div>
														</TableHead>
														<TableHead className="py-2 text-center">
															<div className="text-xs font-medium">Marks</div>
														</TableHead>
														<TableHead className="py-2">
															<div className="text-xs font-medium">Status</div>
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{loading ? (
														<TableRow>
															<TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
																<RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
																Loading...
															</TableCell>
														</TableRow>
													) : pageItems.length === 0 ? (
														<TableRow>
															<TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
																No records found
															</TableCell>
														</TableRow>
													) : (
														pageItems.map((item) => {
															const { type, marks } = getInternalTypeAndMarks(item)
															return (
																<TableRow key={item.id} className="hover:bg-muted/30">
																	<TableCell className="py-2">
																		<Checkbox
																			checked={selectedIds.has(item.id)}
																			onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
																		/>
																	</TableCell>
																	<TableCell className="py-2 text-xs font-medium">{item.register_no}</TableCell>
																	<TableCell className="py-2 text-xs">{item.student_name}</TableCell>
																	<TableCell className="py-2 text-xs font-mono">{item.course_code}</TableCell>
																	<TableCell className="py-2 text-xs">{item.course_name}</TableCell>
																	<TableCell className="py-2">
																		<Badge variant="outline" className="text-xs">
																			{type}
																		</Badge>
																	</TableCell>
																	<TableCell className="py-2 text-center text-xs font-medium">
																		{marks !== null ? marks : '-'}
																	</TableCell>
																	<TableCell className="py-2">
																		<Badge
																			variant={item.marks_status === 'Submitted' ? 'default' : 'secondary'}
																			className="text-xs"
																		>
																			{item.marks_status}
																		</Badge>
																	</TableCell>
																</TableRow>
															)
														})
													)}
												</TableBody>
											</Table>
										</div>
									</div>

									{/* Pagination */}
									<div className="flex items-center justify-between mt-3 flex-shrink-0">
										<p className="text-xs text-muted-foreground">
											Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length}
										</p>
										<div className="flex items-center gap-1">
											<Button
												variant="outline"
												size="sm"
												className="h-7 w-7 p-0"
												onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
												disabled={currentPage === 1}
											>
												<ChevronLeft className="h-3 w-3" />
											</Button>
											<span className="text-xs px-2">
												{currentPage} / {totalPages}
											</span>
											<Button
												variant="outline"
												size="sm"
												className="h-7 w-7 p-0"
												onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
												disabled={currentPage === totalPages}
											>
												<ChevronRight className="h-3 w-3" />
											</Button>
										</div>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</div>

				<AppFooter />
			</SidebarInset>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2 text-red-600">
							<Trash2 className="h-5 w-5" />
							Confirm Bulk Delete
						</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete {selectedIds.size} selected record(s)?
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleBulkDelete}
							className="bg-red-600 hover:bg-red-700"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Import Preview Dialog */}
			<Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
				<DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FileSpreadsheet className="h-5 w-5" />
							Import Preview
						</DialogTitle>
						<DialogDescription>
							Review the imported data before uploading. Rows with errors will be highlighted.
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-y-auto border rounded-lg">
						<Table>
							<TableHeader className="sticky top-0 bg-muted">
								<TableRow>
									<TableHead className="w-[60px] text-xs">Row</TableHead>
									<TableHead className="text-xs">Register No</TableHead>
									<TableHead className="text-xs">Course Code</TableHead>
									<TableHead className="text-xs">Marks Summary</TableHead>
									<TableHead className="text-xs text-center">Max</TableHead>
									<TableHead className="text-xs">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{importPreviewData.map((row) => {
									// Build marks summary
									const marksSummary: string[] = []
									if (row.assignment_marks !== null) marksSummary.push(`A:${row.assignment_marks}`)
									if (row.quiz_marks !== null) marksSummary.push(`Q:${row.quiz_marks}`)
									if (row.mid_term_marks !== null) marksSummary.push(`MT:${row.mid_term_marks}`)
									if (row.presentation_marks !== null) marksSummary.push(`P:${row.presentation_marks}`)
									if (row.attendance_marks !== null) marksSummary.push(`Att:${row.attendance_marks}`)
									if (row.lab_marks !== null) marksSummary.push(`L:${row.lab_marks}`)
									if (row.project_marks !== null) marksSummary.push(`Prj:${row.project_marks}`)
									if (row.seminar_marks !== null) marksSummary.push(`S:${row.seminar_marks}`)
									if (row.viva_marks !== null) marksSummary.push(`V:${row.viva_marks}`)
									if (row.test_1_mark !== null) marksSummary.push(`T1:${row.test_1_mark}`)
									if (row.test_2_mark !== null) marksSummary.push(`T2:${row.test_2_mark}`)
									if (row.test_3_mark !== null) marksSummary.push(`T3:${row.test_3_mark}`)
									if (row.other_marks !== null) marksSummary.push(`O:${row.other_marks}`)

									return (
										<TableRow
											key={row.row}
											className={row.isValid ? '' : 'bg-red-50 dark:bg-red-900/10'}
										>
											<TableCell className="text-xs font-mono">{row.row}</TableCell>
											<TableCell className="text-xs">{row.register_no || '-'}</TableCell>
											<TableCell className="text-xs font-mono">{row.course_code || '-'}</TableCell>
											<TableCell className="text-xs">
												{marksSummary.length > 0 ? marksSummary.join(', ') : '-'}
											</TableCell>
											<TableCell className="text-xs text-center">{row.max_internal_marks}</TableCell>
											<TableCell>
												{row.isValid ? (
													<CheckCircle className="h-4 w-4 text-green-600" />
												) : (
													<div className="flex items-start gap-1">
														<XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
														<span className="text-xs text-red-600">{row.errors.join(', ')}</span>
													</div>
												)}
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>

					<div className="grid grid-cols-3 gap-3 mt-4">
						<div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
							<div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Total Rows</div>
							<div className="text-xl font-bold text-blue-700 dark:text-blue-300">{importPreviewData.length}</div>
						</div>
						<div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3">
							<div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Valid</div>
							<div className="text-xl font-bold text-green-700 dark:text-green-300">
								{importPreviewData.filter(r => r.isValid).length}
							</div>
						</div>
						<div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
							<div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Invalid</div>
							<div className="text-xl font-bold text-red-700 dark:text-red-300">
								{importPreviewData.filter(r => !r.isValid).length}
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleUploadMarks}
							disabled={importPreviewData.filter(r => r.isValid).length === 0 || loading}
						>
							{loading ? (
								<>
									<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
									Uploading...
								</>
							) : (
								<>
									<Upload className="h-4 w-4 mr-2" />
									Upload {importPreviewData.filter(r => r.isValid).length} Records
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Error Dialog */}
			<AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
				<AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
					<AlertDialogHeader>
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
								<XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
							</div>
							<div>
								<AlertDialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
									Upload Errors
								</AlertDialogTitle>
								<AlertDialogDescription className="text-sm text-muted-foreground mt-1">
									Some records failed during upload
								</AlertDialogDescription>
							</div>
						</div>
					</AlertDialogHeader>

					<div className="space-y-4">
						{/* Upload Summary Cards */}
						{uploadSummary.total > 0 && (
							<div className="grid grid-cols-4 gap-3">
								<div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
									<div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Total</div>
									<div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{uploadSummary.total}</div>
								</div>
								<div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3">
									<div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Success</div>
									<div className="text-2xl font-bold text-green-700 dark:text-green-300">{uploadSummary.success}</div>
								</div>
								<div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
									<div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Failed</div>
									<div className="text-2xl font-bold text-red-700 dark:text-red-300">{uploadSummary.failed}</div>
								</div>
								<div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
									<div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-1">Skipped</div>
									<div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{uploadSummary.skipped}</div>
								</div>
							</div>
						)}

						{/* Error List */}
						<div className="flex-1 overflow-y-auto max-h-[300px] border rounded-lg p-4 bg-muted/30">
							<div className="space-y-2">
								{uploadErrors.map((error, index) => (
									<div key={index} className="p-3 bg-background border border-red-200 rounded-md">
										<div className="flex items-start gap-2">
											<Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
												Row {error.row}
											</Badge>
											<span className="text-xs text-muted-foreground">
												{error.register_no} | {error.course_code}
											</span>
										</div>
										<div className="mt-2 space-y-1">
											{(error.errors || [error.error]).map((err: string, i: number) => (
												<div key={i} className="flex items-start gap-2 text-sm">
													<XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
													<span className="text-red-700 dark:text-red-300">{err}</span>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Help Tips */}
						<div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
							<div className="flex items-start gap-2">
								<AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
								<div>
									<h4 className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-1">Common Fixes:</h4>
									<ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
										<li>• Ensure register numbers match existing students</li>
										<li>• Verify course codes exist in the system</li>
										<li>• At least one marks type must be provided per row</li>
										<li>• All marks values should be between 0 and 100</li>
										<li>• Max Internal Marks is required for each row</li>
										<li>• Download the template for proper column format</li>
									</ul>
								</div>
							</div>
						</div>
					</div>

					<AlertDialogFooter>
						<AlertDialogAction onClick={() => setErrorDialogOpen(false)}>
							Close
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</SidebarProvider>
	)
}
