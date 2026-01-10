"use client"

import { useMemo, useState, useEffect } from "react"
import XLSX from "@/lib/utils/excel-compat"
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
import { useInstitutionFilter } from "@/hooks/use-institution-filter"
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
	ClipboardList,
	FileJson,
	Loader2
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Import export/import utilities
import {
	exportToJSON,
	exportToExcel,
	exportTemplate,
	parseImportFile,
	mapImportRow,
	type InternalMarkExport
} from "@/lib/utils/internal-marks/export-import"

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
	institution_name: string
	myjkkn_institution_ids: string[] | null  // Required for MyJKKN integration
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

	// Institution filter hook
	const {
		filter,
		isReady,
		appendToUrl,
		getInstitutionIdForCreate,
		mustSelectInstitution,
		shouldFilter,
		institutionId
	} = useInstitutionFilter()

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
	const [templateExportLoading, setTemplateExportLoading] = useState(false)
	const [importInProgress, setImportInProgress] = useState(false)
	// Institution selection for import when mustSelectInstitution is true
	const [importInstitutionId, setImportInstitutionId] = useState("")

	// Fetch institutions on mount when ready
	useEffect(() => {
		if (isReady) {
			fetchInstitutions()
		}
	}, [isReady])

	// Auto-fill institution from context when available
	useEffect(() => {
		if (isReady && !mustSelectInstitution && institutions.length > 0) {
			const autoId = getInstitutionIdForCreate()
			if (autoId && !selectedInstitution) {
				setSelectedInstitution(autoId)
			}
		}
	}, [isReady, mustSelectInstitution, institutions, getInstitutionIdForCreate, selectedInstitution])

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
			const url = appendToUrl('/api/pre-exam/internal-marks?action=institutions')
			const res = await fetch(url)
			if (res.ok) {
				const data = await res.json()
				// Map institutions with all required fields including myjkkn_institution_ids
				setInstitutions(data.map((i: any) => ({
					id: i.id,
					name: i.name || i.institution_name,
					institution_code: i.institution_code,
					institution_name: i.institution_name || i.name,
					myjkkn_institution_ids: i.myjkkn_institution_ids || []
				})))
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

	// Download Template - uses utility function with loading state
	const handleDownloadTemplate = async () => {
		setTemplateExportLoading(true)
		toast({
			title: "Generating template...",
			description: "Fetching reference data for template",
		})

		try {
			// Use the utility function with current reference data
			exportTemplate(institutions, sessions, programs, courses)

			toast({
				title: "✅ Template Downloaded",
				description: "Internal marks template with reference sheets has been downloaded successfully.",
				className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
			})
		} catch (error) {
			console.error('Template export error:', error)
			toast({
				title: "❌ Template Export Failed",
				description: "Failed to generate template. Please try again.",
				variant: "destructive",
			})
		} finally {
			setTemplateExportLoading(false)
		}
	}

	// JSON Export handler
	const handleExportJSON = () => {
		if (!items || items.length === 0) {
			toast({
				title: "⚠️ No Data to Export",
				description: "Please load some data before exporting.",
				variant: "destructive",
				className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
			})
			return
		}

		const exportData: InternalMarkExport[] = items.map(item => ({
			register_no: item.register_no || '',
			student_name: item.student_name || '',
			course_code: item.course_code || '',
			course_name: item.course_name || '',
			program_name: item.program_name || '',
			session_name: item.session_name || '',
			assignment_marks: item.assignment_marks,
			quiz_marks: item.quiz_marks,
			mid_term_marks: item.mid_term_marks,
			presentation_marks: item.presentation_marks,
			attendance_marks: item.attendance_marks,
			lab_marks: item.lab_marks,
			project_marks: item.project_marks,
			seminar_marks: item.seminar_marks,
			viva_marks: item.viva_marks,
			other_marks: item.other_marks,
			test_1_mark: item.test_1_mark,
			test_2_mark: item.test_2_mark,
			test_3_mark: item.test_3_mark,
			total_internal_marks: item.total_internal_marks,
			max_internal_marks: item.max_internal_marks,
			internal_percentage: item.internal_percentage,
			marks_status: item.marks_status || 'Draft',
			remarks: item.remarks
		}))

		exportToJSON(exportData)

		toast({
			title: "✅ JSON Exported",
			description: `Successfully exported ${items.length} record${items.length > 1 ? 's' : ''} to JSON.`,
			className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
		})
	}

	// Export Current Data - uses utility function
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

		const exportData: InternalMarkExport[] = items.map(item => ({
			register_no: item.register_no || '',
			student_name: item.student_name || '',
			course_code: item.course_code || '',
			course_name: item.course_name || '',
			program_name: item.program_name || '',
			session_name: item.session_name || '',
			assignment_marks: item.assignment_marks,
			quiz_marks: item.quiz_marks,
			mid_term_marks: item.mid_term_marks,
			presentation_marks: item.presentation_marks,
			attendance_marks: item.attendance_marks,
			lab_marks: item.lab_marks,
			project_marks: item.project_marks,
			seminar_marks: item.seminar_marks,
			viva_marks: item.viva_marks,
			other_marks: item.other_marks,
			test_1_mark: item.test_1_mark,
			test_2_mark: item.test_2_mark,
			test_3_mark: item.test_3_mark,
			total_internal_marks: item.total_internal_marks,
			max_internal_marks: item.max_internal_marks,
			internal_percentage: item.internal_percentage,
			marks_status: item.marks_status || 'Draft',
			remarks: item.remarks
		}))

		const institutionCode = selectedInstitution
			? institutions.find(i => i.id === selectedInstitution)?.institution_code
			: undefined

		exportToExcel(exportData, institutionCode)

		toast({
			title: "✅ Data Exported",
			description: `Successfully exported ${items.length} record${items.length > 1 ? 's' : ''} to Excel.`,
			className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
		})
	}

	// Import File - uses utility functions
	const handleImportFile = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.xlsx,.xls,.csv,.json'
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) return

			setImportInProgress(true)
			toast({
				title: "📂 Processing File...",
				description: `Reading ${file.name}`,
			})

			try {
				// Parse file using utility function
				const rows = await parseImportFile(file)

				if (rows.length === 0) {
					toast({
						title: "❌ Empty File",
						description: "The file contains no data rows.",
						variant: "destructive",
					})
					setImportInProgress(false)
					return
				}

				// Map and validate rows using utility function
				const previewData: ImportPreviewRow[] = rows.map((row, index) => {
					const mapped = mapImportRow(row, index)
					return {
						row: mapped.rowNumber,
						register_no: mapped.register_no,
						course_code: mapped.course_code,
						session_code: mapped.session_code,
						program_code: mapped.program_code,
						assignment_marks: mapped.assignment_marks,
						quiz_marks: mapped.quiz_marks,
						mid_term_marks: mapped.mid_term_marks,
						presentation_marks: mapped.presentation_marks,
						attendance_marks: mapped.attendance_marks,
						lab_marks: mapped.lab_marks,
						project_marks: mapped.project_marks,
						seminar_marks: mapped.seminar_marks,
						viva_marks: mapped.viva_marks,
						other_marks: mapped.other_marks,
						test_1_mark: mapped.test_1_mark,
						test_2_mark: mapped.test_2_mark,
						test_3_mark: mapped.test_3_mark,
						max_internal_marks: mapped.max_internal_marks,
						remarks: mapped.remarks,
						errors: mapped.errors,
						isValid: mapped.status === 'valid'
					}
				})

				setImportPreviewData(previewData)
				setPreviewDialogOpen(true)

				toast({
					title: "✅ File Parsed Successfully",
					description: `${previewData.length} rows found. ${previewData.filter(r => r.isValid).length} valid, ${previewData.filter(r => !r.isValid).length} with errors.`,
					className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
				})

			} catch (error) {
				console.error('Import error:', error)
				toast({
					title: "❌ Import Error",
					description: error instanceof Error ? error.message : "Failed to parse the file. Please check the format.",
					variant: "destructive",
				})
			} finally {
				setImportInProgress(false)
			}
		}
		input.click()
	}

	// Upload Marks
	const handleUploadMarks = async () => {
		// Determine institution ID based on mustSelectInstitution
		// When super_admin views "All Institutions", they must select in the import dialog
		// Otherwise, use the selectedInstitution from filters or auto-filled value
		let institutionId: string

		if (mustSelectInstitution) {
			// super_admin with "All Institutions" - must use the one selected in import dialog
			if (!importInstitutionId) {
				toast({
					title: "⚠️ Select Institution",
					description: "Please select an institution for the import.",
					variant: "destructive",
				})
				return
			}
			institutionId = importInstitutionId
		} else {
			// Normal user or super_admin with specific institution selected
			institutionId = selectedInstitution || getInstitutionIdForCreate() || ''
		}

		if (!institutionId) {
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
		setImportInstitutionId("")  // Reset import institution selection
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
					institutions_id: institutionId,
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
								{/* Institution - Show only when mustSelectInstitution is true */}
								{mustSelectInstitution && (
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
								)}

								<Select value={selectedSession || "all"} onValueChange={(v) => setSelectedSession(v === "all" ? "" : v)} disabled={mustSelectInstitution && !selectedInstitution}>
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

								<Select value={selectedProgram || "all"} onValueChange={(v) => setSelectedProgram(v === "all" ? "" : v)} disabled={mustSelectInstitution && !selectedInstitution}>
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

								<Select value={selectedCourse || "all"} onValueChange={(v) => setSelectedCourse(v === "all" ? "" : v)} disabled={mustSelectInstitution && !selectedInstitution}>
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

								<div className="flex gap-1 flex-wrap items-center">
									{/* Refresh */}
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="outline"
													size="icon"
													className="h-8 w-8"
													onClick={fetchMarks}
													disabled={loading || !selectedInstitution}
												>
													<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Refresh Data</TooltipContent>
										</Tooltip>
									</TooltipProvider>

									{/* Template Download */}
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="outline"
													size="icon"
													className="h-8 w-8"
													onClick={handleDownloadTemplate}
													disabled={templateExportLoading}
												>
													{templateExportLoading ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<FileSpreadsheet className="h-4 w-4" />
													)}
												</Button>
											</TooltipTrigger>
											<TooltipContent>Download Template</TooltipContent>
										</Tooltip>
									</TooltipProvider>

									{/* Import */}
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="outline"
													size="icon"
													className="h-8 w-8"
													onClick={handleImportFile}
													disabled={!selectedInstitution || importInProgress}
												>
													{importInProgress ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<Upload className="h-4 w-4" />
													)}
												</Button>
											</TooltipTrigger>
											<TooltipContent>Import File</TooltipContent>
										</Tooltip>
									</TooltipProvider>

									{/* Export Excel */}
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="outline"
													size="icon"
													className="h-8 w-8 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
													onClick={handleExportData}
													disabled={!items || items.length === 0}
												>
													<Download className="h-4 w-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Export Excel</TooltipContent>
										</Tooltip>
									</TooltipProvider>

									{/* Export JSON */}
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="outline"
													size="icon"
													className="h-8 w-8"
													onClick={handleExportJSON}
													disabled={!items || items.length === 0}
												>
													<FileJson className="h-4 w-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Download JSON</TooltipContent>
										</Tooltip>
									</TooltipProvider>

									{/* Delete Selected */}
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
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
											</TooltipTrigger>
											<TooltipContent>Delete Selected Records</TooltipContent>
										</Tooltip>
									</TooltipProvider>
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
														{/* Show Institution column only when "All Institutions" is selected */}
														{mustSelectInstitution && (
															<TableHead className="py-2">
																<div className="text-xs font-medium">Institution</div>
															</TableHead>
														)}
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
															<TableCell colSpan={mustSelectInstitution ? 9 : 8} className="text-center py-8 text-muted-foreground">
																<RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
																Loading...
															</TableCell>
														</TableRow>
													) : pageItems.length === 0 ? (
														<TableRow>
															<TableCell colSpan={mustSelectInstitution ? 9 : 8} className="text-center py-8 text-muted-foreground">
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
																	{/* Show Institution cell when "All Institutions" is selected */}
																	{mustSelectInstitution && (
																		<TableCell className="py-2 text-xs">
																			{institutions.find(i => i.id === item.institutions_id)?.institution_code || '-'}
																		</TableCell>
																	)}
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

			{/* Import Preview Dialog - follows skill pattern */}
			<Dialog open={previewDialogOpen} onOpenChange={(open) => {
				setPreviewDialogOpen(open)
				if (!open) setImportInstitutionId("")  // Reset on close
			}}>
				<DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FileSpreadsheet className="h-5 w-5" />
							Import Preview
						</DialogTitle>
						<DialogDescription>
							Review the data before importing.{' '}
							<span className="text-green-600 font-medium">{importPreviewData.filter(i => i.isValid).length} valid</span>,{' '}
							<span className="text-red-600 font-medium">{importPreviewData.filter(i => !i.isValid).length} with errors</span>
						</DialogDescription>
					</DialogHeader>

					{/* Institution selection for super_admin when "All Institutions" is selected */}
					{mustSelectInstitution && (
						<div className="space-y-2 mb-4">
							<label className="text-sm font-medium">
								Institution <span className="text-red-500">*</span>
							</label>
							<Select value={importInstitutionId} onValueChange={setImportInstitutionId}>
								<SelectTrigger className={!importInstitutionId ? 'border-amber-300' : ''}>
									<SelectValue placeholder="Select institution for import" />
								</SelectTrigger>
								<SelectContent>
									{institutions.map((inst) => (
										<SelectItem key={inst.id} value={inst.id}>
											{inst.institution_code} - {inst.institution_name || inst.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								All imported records will be assigned to this institution
							</p>
						</div>
					)}

					<div className="flex-1 overflow-y-auto border rounded-lg">
						<Table>
							<TableHeader className="sticky top-0 bg-muted">
								<TableRow>
									<TableHead className="w-[60px] text-xs">Row</TableHead>
									<TableHead className="text-xs">Status</TableHead>
									<TableHead className="text-xs">Register No</TableHead>
									<TableHead className="text-xs">Course Code</TableHead>
									<TableHead className="text-xs">Marks Summary</TableHead>
									<TableHead className="text-xs text-center">Max</TableHead>
									<TableHead className="text-xs">Errors</TableHead>
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
											<TableCell>
												{row.isValid ? (
													<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Valid</Badge>
												) : (
													<Badge variant="destructive">Error</Badge>
												)}
											</TableCell>
											<TableCell className="text-xs font-medium">{row.register_no || '-'}</TableCell>
											<TableCell className="text-xs font-mono">{row.course_code || '-'}</TableCell>
											<TableCell className="text-xs max-w-[200px] truncate">
												{marksSummary.length > 0 ? marksSummary.join(', ') : '-'}
											</TableCell>
											<TableCell className="text-xs text-center">{row.max_internal_marks}</TableCell>
											<TableCell className="text-red-600 text-xs max-w-[200px]">
												{row.errors.join(', ')}
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
							disabled={
								importPreviewData.filter(r => r.isValid).length === 0 ||
								loading ||
								(mustSelectInstitution && !importInstitutionId)  // Require institution when "All Institutions"
							}
						>
							{loading ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Importing...
								</>
							) : (
								<>
									<Upload className="h-4 w-4 mr-2" />
									Import {importPreviewData.filter(r => r.isValid).length} Records
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
