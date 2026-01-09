"use client"

import { useState, useEffect, useMemo } from "react"
import XLSX from "@/lib/utils/excel-compat"
import type { ExamRegistration, ExamRegistrationImportError, UploadSummary } from "@/types/exam-registrations"
import { useExamRegistrations } from "@/hooks/exam-management/use-exam-registrations"
import { fetchLearners } from "@/services/exam-management/exam-registrations-service"
import { useMyJKKNPrograms } from "@/hooks/myjkkn/use-myjkkn-data"
import { validateExamRegistrationData, validateExamRegistrationImport } from "@/lib/utils/exam-registrations/validation"
import { exportToJSON, exportToExcel, exportTemplate, type TemplateReferenceData } from "@/lib/utils/exam-registrations/export-import"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AppFooter } from "@/components/layout/app-footer"
import { PageTransition } from "@/components/common/page-transition"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/common/use-toast"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ClipboardCheck, TrendingUp, FileSpreadsheet, RefreshCw, CheckCircle, XCircle, AlertTriangle, FileJson, Download, Upload, Loader2 } from "lucide-react"


export default function ExamRegistrationsPage() {
	const { toast } = useToast()

	// Program filter state - defined first so it can be passed to hook
	const [programFilter, setProgramFilter] = useState("all")

	// Use custom hook for exam registrations data management with program filter
	const {
		examRegistrations,
		loading,
		setLoading,
		fetchExamRegistrations,
		saveExamRegistration,
		removeExamRegistration,
		refreshExamRegistrations,
		// Dropdown data (unfiltered - for import validation)
		institutions,
		allStudents,
		allExaminationSessions,
		allCourseOfferings,
		// Dropdown data (filtered by institution - for forms)
		filteredStudents,
		filteredExaminationSessions,
		filteredCourseOfferings,
		// Learners loading state (from MyJKKN)
		learnersLoading,
		// Dropdown control
		selectedInstitutionId,
		setSelectedInstitutionId,
		// Institution filter values
		isReady,
		mustSelectInstitution,
		shouldFilter,
		institutionId,
		getInstitutionIdForCreate,
	} = useExamRegistrations(programFilter)

	// Get institution_code for MyJKKN API filter
	const selectedInstitutionCode = useMemo(() => {
		if (institutionId) {
			const inst = institutions.find(i => i.id === institutionId)
			return inst?.institution_code
		}
		return undefined
	}, [institutionId, institutions])

	// Fetch programs from MyJKKN API
	const { data: programs, loading: programsLoading } = useMyJKKNPrograms({
		institution_code: selectedInstitutionCode,
		is_active: true,
	})

	// Local UI state
	const [items, setItems] = useState<ExamRegistration[]>([])
	const [searchTerm, setSearchTerm] = useState("")
	const [sortColumn, setSortColumn] = useState<string | null>(null)
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState<number | "all">(10)

	const [sheetOpen, setSheetOpen] = useState(false)
	const [editing, setEditing] = useState<ExamRegistration | null>(null)
	const [statusFilter, setStatusFilter] = useState("all")
	const [errorPopupOpen, setErrorPopupOpen] = useState(false)
	const [importErrors, setImportErrors] = useState<ExamRegistrationImportError[]>([])
	const [uploadSummary, setUploadSummary] = useState<UploadSummary>({ total: 0, success: 0, failed: 0 })
	const [failedRowsData, setFailedRowsData] = useState<Record<string, unknown>[]>([])
	const [importInProgress, setImportInProgress] = useState(false)
	const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })

	const [formData, setFormData] = useState({
		institutions_id: "",
		student_id: "",
		examination_session_id: "",
		course_offering_id: "",
		stu_register_no: "",
		student_name: "",
		registration_date: new Date().toISOString().split('T')[0],
		registration_status: "Pending",
		is_regular: true,
		attempt_number: 1,
		fee_paid: false,
		fee_amount: "",
		payment_date: "",
		payment_transaction_id: "",
		remarks: "",
		approved_by: "",
		approved_date: "",
	})
	const [errors, setErrors] = useState<Record<string, string>>({})

	// Sync hook data with local items state
	useEffect(() => {
		setItems(examRegistrations)
	}, [examRegistrations])

	const resetForm = () => {
		const autoInstitutionId = getInstitutionIdForCreate() || ''
		setFormData({
			institutions_id: autoInstitutionId,
			student_id: "",
			examination_session_id: "",
			course_offering_id: "",
			stu_register_no: "",
			student_name: "",
			registration_date: new Date().toISOString().split('T')[0],
			registration_status: "Pending",
			is_regular: true,
			attempt_number: 1,
			fee_paid: false,
			fee_amount: "",
			payment_date: "",
			payment_transaction_id: "",
			remarks: "",
			approved_by: "",
			approved_date: "",
		})
		// Also set the selectedInstitutionId for dropdown filtering
		if (autoInstitutionId) {
			setSelectedInstitutionId(autoInstitutionId)
		}
		setErrors({})
		setEditing(null)
	}

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

	// Program filtering is now done server-side via the API
	const filtered = useMemo(() => {
		const q = searchTerm.toLowerCase()
		const data = items
			.filter((i) => {
				const studentName = i.student ? `${i.student.first_name} ${i.student.last_name}`.toLowerCase() : ''
				const rollNumber = i.student?.roll_number?.toLowerCase() || ''
				const sessionName = i.examination_session?.session_name?.toLowerCase() || ''
				const courseName = i.course_offering?.course_name?.toLowerCase() || ''
				return studentName.includes(q) || rollNumber.includes(q) || sessionName.includes(q) || courseName.includes(q)
			})
			.filter((i) => statusFilter === "all" || i.registration_status === statusFilter)

		if (!sortColumn) return data
		const sorted = [...data].sort((a, b) => {
			const av = (a as any)[sortColumn]
			const bv = (b as any)[sortColumn]
			if (av === bv) return 0
			if (sortDirection === "asc") return av > bv ? 1 : -1
			return av < bv ? 1 : -1
		})
		return sorted
	}, [items, searchTerm, sortColumn, sortDirection, statusFilter])

	const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(filtered.length / itemsPerPage) || 1
	const startIndex = itemsPerPage === "all" ? 0 : (currentPage - 1) * itemsPerPage
	const endIndex = itemsPerPage === "all" ? filtered.length : startIndex + itemsPerPage
	const pageItems = filtered.slice(startIndex, endIndex)

	useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection, statusFilter, itemsPerPage])

	const openAdd = () => {
		resetForm()
		setSheetOpen(true)
	}

	const openEdit = (row: ExamRegistration) => {
		setEditing(row)
		setFormData({
			institutions_id: row.institutions_id,
			student_id: row.student_id,
			examination_session_id: row.examination_session_id,
			course_offering_id: row.course_offering_id,
			stu_register_no: row.stu_register_no || "",
			student_name: row.student_name || "",
			registration_date: row.registration_date ? new Date(row.registration_date).toISOString().split('T')[0] : "",
			registration_status: row.registration_status,
			is_regular: row.is_regular,
			attempt_number: row.attempt_number,
			fee_paid: row.fee_paid,
			fee_amount: row.fee_amount?.toString() || "",
			payment_date: row.payment_date ? new Date(row.payment_date).toISOString().split('T')[0] : "",
			payment_transaction_id: row.payment_transaction_id || "",
			remarks: row.remarks || "",
			approved_by: row.approved_by || "",
			approved_date: row.approved_date ? new Date(row.approved_date).toISOString().split('T')[0] : "",
		})
		setSheetOpen(true)
	}

	// Use imported validation function
	const validate = () => {
		const validationErrors = validateExamRegistrationData(formData)
		setErrors(validationErrors)
		if (Object.keys(validationErrors).length > 0) {
			toast({
				title: '⚠️ Validation Error',
				description: 'Please fix all errors before submitting.',
				variant: 'destructive'
			})
			return false
		}
		return true
	}

	// Use hook's save function
	const save = async () => {
		if (!validate()) return

		try {
			const saved = await saveExamRegistration(formData, editing)
			// Update local items state
			setItems(prev => editing
				? prev.map(item => item.id === editing.id ? saved : item)
				: [saved, ...prev]
			)
			setSheetOpen(false)
			resetForm()
		} catch (error) {
			// Error already handled by hook with toast
		}
	}

	// Use hook's remove function
	const remove = async (id: string) => {
		try {
			await removeExamRegistration(id)
			// Update local items state
			setItems(prev => prev.filter(item => item.id !== id))
		} catch (error) {
			// Error already handled by hook with toast
		}
	}

	const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : '-'

	// Field validation function
	const validateExamRegistrationData = (data: any, rowIndex: number) => {
		const errors: string[] = []

		// Required field validations
		if (!data.institutions_id) errors.push('Institution is required')
		if (!data.student_id) errors.push('Student is required')
		if (!data.examination_session_id) errors.push('Examination Session is required')
		if (!data.course_offering_id) errors.push('Course Offering is required')
		if (!data.registration_status) errors.push('Registration Status is required')

		// Numeric validations
		if (data.attempt_number && (Number(data.attempt_number) < 1 || Number(data.attempt_number) > 10)) {
			errors.push('Attempt Number must be between 1 and 10')
		}

		if (data.fee_amount && Number(data.fee_amount) < 0) {
			errors.push('Fee Amount cannot be negative')
		}

		return errors
	}

	// Export/Import/Template handlers
	const handleDownload = () => {
		const exportData = filtered.map(item => ({
			institution_code: item.institution?.institution_code || '',
			student_register_number: item.stu_register_no || '',
			student_name: item.student_name || (item.student ? `${item.student.first_name} ${item.student.last_name}` : ''),
			examination_session_code: item.examination_session?.session_code || '',
			course_code: item.course_offering?.course_code || '',
			course_name: item.course_offering?.course_name || '',
			registration_date: item.registration_date,
			registration_status: item.registration_status,
			is_regular: item.is_regular,
			attempt_number: item.attempt_number,
			fee_paid: item.fee_paid,
			fee_amount: item.fee_amount || '',
			payment_date: item.payment_date || '',
			payment_transaction_id: item.payment_transaction_id || '',
			remarks: item.remarks || '',
			created_at: item.created_at
		}))

		const json = JSON.stringify(exportData, null, 2)
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `exam_registrations_${new Date().toISOString().split('T')[0]}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)

		toast({
			title: "✅ JSON Export Complete",
			description: `Successfully exported ${filtered.length} exam registration${filtered.length > 1 ? 's' : ''} to JSON.`,
			className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
		})
	}

	// Use imported export function
	const handleExport = () => {
		exportToExcel(filtered)
		toast({
			title: "✅ Export Complete",
			description: `Successfully exported ${filtered.length} exam registration${filtered.length > 1 ? 's' : ''} to Excel.`,
			className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
		})
	}

	// Use imported template export function with reference data for dropdowns
	const handleTemplateExport = async () => {
		try {
			// Prepare reference data for template dropdowns and reference codes sheet
			const referenceData: TemplateReferenceData = {
				institutions: institutions.map(i => ({
					id: i.id,
					institution_code: i.institution_code,
					name: i.name
				})),
				examinationSessions: allExaminationSessions.map(s => ({
					id: s.id,
					session_code: s.session_code,
					session_name: s.session_name,
					institutions_id: s.institutions_id
				})),
				courseOfferings: allCourseOfferings.map(c => ({
					id: c.id,
					course_code: c.course_code,
					course_name: c.course_name,
					institutions_id: c.institutions_id
				}))
			}

			await exportTemplate(referenceData)
			toast({
				title: '✅ Template Downloaded',
				description: 'Exam registration upload template with dropdown validation has been downloaded successfully.',
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
			})
		} catch (error) {
			console.error('Template export error:', error)
			toast({
				title: '❌ Export Failed',
				description: 'Failed to generate template. Please try again.',
				variant: 'destructive'
			})
		}
	}

	// Download failed rows as Excel file (same format as import template + Error Reason column)
	const handleDownloadFailedRows = () => {
		if (failedRowsData.length === 0) return

		// Create a map of errors by student_register_no + course_code for matching
		const errorMap = new Map<string, string>()
		importErrors.forEach(err => {
			const key = `${err.student_register_no}|${err.course_code}`
			errorMap.set(key, err.errors.join('; '))
		})

		// Define column order to match template format exactly
		const templateColumns = [
			'Institution Code',
			'Student Register No',
			'Student Name',
			'Session Code',
			'Course Code',
			'Registration Date',
			'Status',
			'Regular Student',
			'Attempt Number',
			'Fee Paid',
			'Fee Amount',
			'Payment Date',
			'Transaction ID',
			'Remarks',
			'Approved By',
			'Approved Date',
			'Error Reason'
		]

		// Add "Error Reason" column to each failed row with explicit column ordering
		const rowsWithErrors = failedRowsData.map((row, index) => {
			const studentRegNo = String(row['Student Register No'] || '').trim()
			const courseCode = String(row['Course Code'] || '').trim()
			const key = `${studentRegNo || 'N/A'}|${courseCode || 'N/A'}`

			// Try to find matching error, fallback to index-based match
			let errorReason = errorMap.get(key)
			if (!errorReason && importErrors[index]) {
				errorReason = importErrors[index].errors.join('; ')
			}

			// Create row with explicit column order to ensure all columns appear
			const orderedRow: Record<string, unknown> = {}
			templateColumns.forEach(col => {
				if (col === 'Error Reason') {
					orderedRow[col] = errorReason || 'Unknown error'
				} else {
					orderedRow[col] = row[col] ?? ''
				}
			})

			return orderedRow
		})

		// Create worksheet from failed rows with error reasons
		const ws = XLSX.utils.json_to_sheet(rowsWithErrors, { header: templateColumns })

		// Set column widths to match template format
		const colWidths = [
			{ wch: 18 }, // Institution Code
			{ wch: 20 }, // Student Register No
			{ wch: 25 }, // Student Name
			{ wch: 25 }, // Session Code
			{ wch: 15 }, // Course Code
			{ wch: 18 }, // Registration Date
			{ wch: 15 }, // Status
			{ wch: 18 }, // Regular Student
			{ wch: 18 }, // Attempt Number
			{ wch: 12 }, // Fee Paid
			{ wch: 15 }, // Fee Amount
			{ wch: 15 }, // Payment Date
			{ wch: 20 }, // Transaction ID
			{ wch: 30 }, // Remarks
			{ wch: 20 }, // Approved By
			{ wch: 15 }, // Approved Date
			{ wch: 50 }  // Error Reason (wider to show full error messages)
		]
		ws['!cols'] = colWidths

		// Create workbook
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Failed Rows')

		// Generate filename with timestamp
		const timestamp = new Date().toISOString().slice(0, 10)
		const filename = `exam-registrations-failed-${timestamp}.xlsx`

		// Download the file
		XLSX.writeFile(wb, filename)

		toast({
			title: "📥 Downloaded",
			description: `${failedRowsData.length} failed row${failedRowsData.length > 1 ? 's' : ''} with error reasons exported to ${filename}`,
			className: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200",
		})
	}

	// Helper function to normalize date values from Excel
	// Excel can return dates as serial numbers, Date objects, or strings with timezone info
	const normalizeDate = (value: unknown): string | null => {
		if (!value) return null

		// If it's already a clean date string (YYYY-MM-DD), return it
		if (typeof value === 'string') {
			const trimmed = value.trim()
			// Already in YYYY-MM-DD format
			if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
				return trimmed
			}
			// Try to parse various date formats
			try {
				// Remove timezone info if present (e.g., "GMT+0530")
				const cleanedDate = trimmed.replace(/\s*(GMT|UTC)[+-]\d{4}\s*/gi, ' ').trim()
				const parsed = new Date(cleanedDate)
				if (!isNaN(parsed.getTime())) {
					return parsed.toISOString().split('T')[0]
				}
			} catch {
				// Fall through to return null
			}
		}

		// If it's a number (Excel serial date)
		if (typeof value === 'number') {
			// Excel serial date: days since 1900-01-01 (with a bug for 1900 leap year)
			const excelEpoch = new Date(1899, 11, 30) // Dec 30, 1899
			const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
			return date.toISOString().split('T')[0]
		}

		// If it's a Date object
		if (value instanceof Date && !isNaN(value.getTime())) {
			return value.toISOString().split('T')[0]
		}

		return null
	}

	const handleImport = () => {
		console.log('[handleImport] Button clicked, opening file dialog...')
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.json,.csv,.xlsx,.xls'
		input.onchange = async (e) => {
			console.log('[handleImport] File selected')
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) {
				console.log('[handleImport] No file selected')
				return
			}

			console.log('[handleImport] Processing file:', file.name, 'Size:', file.size)
			setLoading(true)
			setImportInProgress(true)
			setImportProgress({ current: 0, total: 0 })
			toast({
				title: "📂 Processing File...",
				description: `Reading ${file.name}`,
			})

			// CRITICAL: Fetch fresh institutions data before validation
			// This ensures we have the latest data and avoids stale/empty cache issues
			let freshInstitutions: typeof institutions = []
			try {
				console.log('[handleImport] Fetching fresh institutions data...')
				const instRes = await fetch('/api/master/institutions?pageSize=10000')
				if (instRes.ok) {
					const instResult = await instRes.json()
					const instData = Array.isArray(instResult) ? instResult : instResult.data || []
					freshInstitutions = instData
						.filter((i: any) => i?.institution_code)
						.map((i: any) => ({
							id: i.id,
							institution_code: i.institution_code,
							name: i.name || i.institution_name
						}))
					console.log('[handleImport] Loaded', freshInstitutions.length, 'institutions:', freshInstitutions.map(i => i.institution_code))
				}
			} catch (instError) {
				console.error('[handleImport] Failed to fetch institutions:', instError)
			}

			// Fall back to cached institutions if fresh fetch failed
			const institutionsToUse = freshInstitutions.length > 0 ? freshInstitutions : institutions
			console.log('[handleImport] Using', institutionsToUse.length, 'institutions for validation')

			if (institutionsToUse.length === 0) {
				toast({
					title: "❌ Cannot Import",
					description: "No institutions loaded. Please refresh the page and try again.",
					variant: "destructive",
					className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
				})
				setLoading(false)
				return
			}

			try {
				let rows: any[] = []
				console.log('[handleImport] Detecting file type...')
				if (file.name.endsWith('.json')) {
					console.log('[handleImport] Parsing JSON...')
					const text = await file.text()
					rows = JSON.parse(text)
					console.log('[handleImport] JSON parsed, rows:', rows.length)
				} else if (file.name.endsWith('.csv')) {
					console.log('[handleImport] Parsing CSV...')
					const text = await file.text()
					const lines = text.split('\n').filter(line => line.trim())
					if (lines.length < 2) {
						toast({
							title: "❌ Invalid CSV File",
							description: "CSV file must have at least a header row and one data row",
							variant: "destructive",
							className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
						})
						setLoading(false)
						return
					}

					const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
					const dataRows = lines.slice(1).map(line => {
						const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
						const row: Record<string, string> = {}
						headers.forEach((header, index) => {
							row[header] = values[index] || ''
						})
						return row
					})

					rows = dataRows
					console.log('[handleImport] CSV parsed, rows:', rows.length)
				} else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
					console.log('[handleImport] Parsing Excel file...')
					const data = new Uint8Array(await file.arrayBuffer())
					console.log('[handleImport] File buffer loaded, size:', data.length)
					const wb = await XLSX.read(data, { type: 'array' })
					console.log('[handleImport] XLSX read complete, sheets:', wb.SheetNames)
					if (!wb.SheetNames || wb.SheetNames.length === 0) {
						toast({
							title: "Invalid Excel File",
							description: "The Excel file has no sheets. Please check the file.",
							variant: "destructive",
						})
						setLoading(false)
						return
					}
					const ws = wb.Sheets[wb.SheetNames[0]]
					if (!ws) {
						toast({
							title: "Invalid Excel File",
							description: "Could not read the first sheet. Please check the file.",
							variant: "destructive",
						})
						setLoading(false)
						return
					}
					rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
					console.log('[handleImport] Excel parsed, rows:', rows.length)
				}

				// Filter out empty rows (rows where all values are empty/null/undefined)
				rows = rows.filter(row => {
					const values = Object.values(row)
					return values.some(val => val !== null && val !== undefined && String(val).trim() !== '')
				})

				console.log('[handleImport] File parsing complete, total rows after filtering empty:', rows.length)

				// Normalize headers: strip asterisks and map template headers to expected names
				const headerMapping: Record<string, string> = {
					// Template headers (with asterisks stripped) -> Expected headers
					'Institution Code': 'Institution Code',
					'Student Register No': 'Student Register No',
					'Student Name': 'Student Name',
					'Session Code': 'Session Code',
					'Course Code': 'Course Code',
					'Registration Date': 'Registration Date',
					'Status': 'Status',
					'Regular Student': 'Regular Student',
					'Attempt Number': 'Attempt Number',
					'Fee Paid': 'Fee Paid',
					'Fee Amount': 'Fee Amount',
					'Payment Date': 'Payment Date',
					'Transaction ID': 'Transaction ID',
					'Remarks': 'Remarks',
					'Approved By': 'Approved By',
					'Approved Date': 'Approved Date'
				}

				rows = rows.map(row => {
					const normalizedRow: Record<string, unknown> = {}
					for (const [key, value] of Object.entries(row)) {
						// Strip asterisks and whitespace from header names
						const cleanKey = key.replace(/\s*\*\s*$/, '').trim()
						const mappedKey = headerMapping[cleanKey] || cleanKey
						normalizedRow[mappedKey] = value
					}
					return normalizedRow
				})

				console.log('[handleImport] Headers normalized, sample row keys:', rows.length > 0 ? Object.keys(rows[0]) : [])

				// Fetch MyJKKN learners for all unique institution codes in the import
				const uniqueInstitutionCodes = [...new Set(
					rows
						.map(r => String(r['Institution Code'] || '').trim())
						.filter(code => code !== '')
				)]
				console.log('[handleImport] Unique institution codes:', uniqueInstitutionCodes)

				// Fetch learners from MyJKKN API for each institution
				const myjkknLearnersMap = new Map<string, any[]>()
				for (const instCode of uniqueInstitutionCodes) {
					try {
						console.log(`[handleImport] Fetching learners for institution: ${instCode}`)
						const learners = await fetchLearners(instCode)
						console.log(`[handleImport] Loaded ${learners.length} learners for ${instCode}`)
						myjkknLearnersMap.set(instCode, learners)
					} catch (error) {
						console.error(`[handleImport] Failed to fetch learners for ${instCode}:`, error)
						myjkknLearnersMap.set(instCode, [])
					}
				}

				const now = new Date().toISOString()
				const preValidationErrors: Array<{
					row: number
					student_register_no: string
					course_code: string
					errors: string[]
				}> = []
				const failedRows: Record<string, unknown>[] = [] // Store original row data for failed rows

				// Map rows to exam registrations with pre-validation
				const mapped = []
				const mappedRowIndices: number[] = [] // Track which rows were successfully mapped
				// Debug: Log available institutions
				console.log('[Import] Available institutions:', institutionsToUse.map(i => ({ code: i.institution_code, name: i.name })))

				for (let i = 0; i < rows.length; i++) {
					const r = rows[i]
					const rowNumber = i + 2

					// Step 1: Validate Institution Code
					const institutionCode = String(r['Institution Code'] || '').trim()
					console.log(`[Import] Row ${rowNumber}: Looking for institution code "${institutionCode}"`)
					if (!institutionCode) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: String(r['Student Register No'] || 'N/A'),
							course_code: String(r['Course Code'] || 'N/A'),
							errors: ['Institution Code is required']
						})
						failedRows.push(r)
						continue
					}

					// Case-insensitive institution code lookup
					const institution = institutionsToUse.find(inst =>
						inst.institution_code.toUpperCase() === institutionCode.toUpperCase()
					)
					if (!institution) {
						// Show available institution codes to help user
						const availableCodes = institutionsToUse.map(i => i.institution_code).slice(0, 5).join(', ')
						const moreText = institutionsToUse.length > 5 ? ` and ${institutionsToUse.length - 5} more` : ''
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: String(r['Student Register No'] || 'N/A'),
							course_code: String(r['Course Code'] || 'N/A'),
							errors: [`Institution Code "${institutionCode}" not found. Available codes: ${availableCodes}${moreText}`]
						})
						failedRows.push(r)
						continue
					}

					// Step 2: Validate Student Register Number
					const studentRegisterNo = String(r['Student Register No'] || '').trim()
					if (!studentRegisterNo) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: 'N/A',
							course_code: String(r['Course Code'] || 'N/A'),
							errors: ['Student Register No is required']
						})
						failedRows.push(r)
						continue
					}

					// Step 3: Validate Examination Session Code
					const sessionCode = String(r['Session Code'] || '').trim()
					if (!sessionCode) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: studentRegisterNo,
							course_code: String(r['Course Code'] || 'N/A'),
							errors: ['Session Code is required']
						})
						failedRows.push(r)
						continue
					}

					const session = allExaminationSessions.find(s => s.session_code === sessionCode)
					if (!session) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: studentRegisterNo,
							course_code: String(r['Course Code'] || 'N/A'),
							errors: [`Session Code "${sessionCode}" not found. Please ensure the session exists in the system.`]
						})
						failedRows.push(r)
						continue
					}

					// Step 4: Validate Course Code
					const courseCode = String(r['Course Code'] || '').trim()
					if (!courseCode) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: studentRegisterNo,
							course_code: 'N/A',
							errors: ['Course Code is required']
						})
						failedRows.push(r)
						continue
					}

					const course = allCourseOfferings.find(c => c.course_code === courseCode)
					if (!course) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: studentRegisterNo,
							course_code: courseCode,
							errors: [`Course Code "${courseCode}" not found. Please ensure the course exists in the system.`]
						})
						failedRows.push(r)
						continue
					}

					// Step 5: Validate foreign key relationships - all must belong to same institution
					const fkErrors: string[] = []
					if (session.institutions_id !== institution.id) {
						fkErrors.push(`Examination Session "${sessionCode}" does not belong to Institution "${institutionCode}".`)
					}
					if (course.institutions_id !== institution.id) {
						fkErrors.push(`Course Code "${courseCode}" does not belong to Institution "${institutionCode}".`)
					}

					if (fkErrors.length > 0) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: studentRegisterNo,
							course_code: courseCode,
							errors: fkErrors
						})
						failedRows.push(r)
						continue
					}

					// Step 6: Look up student from MyJKKN learner profiles (REQUIRED)
					// Match by register_number to get the student_id (learner profile ID)
					// If not found, row is rejected - student must exist in learners_profiles
					const institutionLearners = myjkknLearnersMap.get(institutionCode) || []
					const matchingLearner = institutionLearners.find(l =>
						l.register_number === studentRegisterNo
					)

					if (!matchingLearner) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: studentRegisterNo,
							course_code: courseCode,
							errors: [`Student with register number "${studentRegisterNo}" not found in learners profiles`]
						})
						failedRows.push(r)
						continue
					}

					// Get student name from Excel or from MyJKKN learner profile
					let studentName = String(r['Student Name'] || '').trim()
					if (!studentName) {
						// Auto-fill from MyJKKN learner profile
						const firstName = matchingLearner.first_name || ''
						const lastName = matchingLearner.last_name || ''
						studentName = `${firstName} ${lastName}`.trim()
					}

					// Step 7: Validate data types and constraints
					const dataErrors: string[] = []

					// Validate attempt number
					const attemptNum = r['Attempt Number'] ? Number(r['Attempt Number']) : 1
					if (attemptNum < 1 || attemptNum > 10) {
						dataErrors.push('Attempt Number must be between 1 and 10')
					}

					// Validate fee amount
					if (r['Fee Amount'] && Number(r['Fee Amount']) < 0) {
						dataErrors.push('Fee Amount cannot be negative')
					}

					// Validate registration status
					const status = String(r['Status'] || 'Pending')
					if (!['Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed'].includes(status)) {
						dataErrors.push('Registration Status must be one of: Pending, Approved, Rejected, Cancelled, Completed')
					}

					// Validate boolean fields - accept Yes/No, TRUE/FALSE, 1/0
					const isRegularRaw = String(r['Regular Student'] || 'Yes').toUpperCase().trim()
					const isRegularValid = ['TRUE', 'FALSE', 'YES', 'NO', '1', '0'].includes(isRegularRaw)
					if (!isRegularValid) {
						dataErrors.push('Regular Student must be Yes/No or TRUE/FALSE')
					}
					const isRegular = ['TRUE', 'YES', '1'].includes(isRegularRaw)

					const feePaidRaw = String(r['Fee Paid'] || 'No').toUpperCase().trim()
					const feePaidValid = ['TRUE', 'FALSE', 'YES', 'NO', '1', '0'].includes(feePaidRaw)
					if (!feePaidValid) {
						dataErrors.push('Fee Paid must be Yes/No or TRUE/FALSE')
					}
					const feePaid = ['TRUE', 'YES', '1'].includes(feePaidRaw)

					if (dataErrors.length > 0) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: studentRegisterNo,
							course_code: courseCode,
							errors: dataErrors
						})
						failedRows.push(r)
						continue
					}

					// Step 8: Create registration data with all validated IDs
					// student_id comes from MyJKKN learner profile (learners_profiles.id)
					const registrationData = {
						institutions_id: institution.id,
						student_id: matchingLearner.id, // From MyJKKN learner profile (required)
						examination_session_id: session.id,
						course_offering_id: course.id,
						stu_register_no: studentRegisterNo,
						student_name: studentName || null,
						registration_date: normalizeDate(r['Registration Date']) || new Date().toISOString().split('T')[0],
						registration_status: status,
						is_regular: isRegular,
						attempt_number: attemptNum,
						fee_paid: feePaid,
						fee_amount: r['Fee Amount'] ? Number(r['Fee Amount']) : null,
						payment_date: normalizeDate(r['Payment Date']),
						payment_transaction_id: String(r['Transaction ID'] || '') || null,
						remarks: String(r['Remarks'] || '') || null,
						// Store code values (denormalized) for easier querying
						institution_code: institutionCode,
						session_code: sessionCode,
						course_code: courseCode,
						// Store original row data for potential re-export if API fails
						_originalRow: r,
						// Store original codes for error display
						_displayCodes: {
							studentRegisterNo: studentRegisterNo,
							courseCode: courseCode
						}
					}

					mapped.push(registrationData)
					mappedRowIndices.push(i)
				}

				// If ALL rows failed pre-validation, show errors and return
				if (mapped.length === 0) {
					if (preValidationErrors.length > 0) {
						setImportErrors(preValidationErrors)
						setUploadSummary({
							total: rows.length,
							success: 0,
							failed: preValidationErrors.length
						})
						setFailedRowsData(failedRows) // Store failed rows for download
						setErrorPopupOpen(true)
					} else {
						toast({
							title: "❌ No Valid Data",
							description: "No valid data found in the file. Please check required fields.",
							variant: "destructive",
							className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
						})
					}
					setLoading(false)
					return
				}

				// Log summary of pre-validation
				console.log(`[Import] Pre-validation complete: ${mapped.length} valid, ${preValidationErrors.length} failed out of ${rows.length} total`)

				// Update progress indicator with total
				setImportProgress({ current: 0, total: mapped.length })

				// Save each registration to the database
				let successCount = 0
				let errorCount = 0
				const uploadErrors: Array<{
					row: number
					student_register_no: string
					course_code: string
					errors: string[]
				}> = []

				const apiFailedRows: Record<string, unknown>[] = [] // Track rows that fail during API upload
				for (let i = 0; i < mapped.length; i++) {
					const registration = mapped[i]
					const rowNumber = mappedRowIndices[i] + 2 // Use original row index
					const displayCodes = (registration as any)._displayCodes
					const originalRow = (registration as any)._originalRow

					// Update progress
					setImportProgress({ current: i + 1, total: mapped.length })

					// Remove internal fields before sending to API
					const { _displayCodes, _originalRow, ...registrationPayload } = registration as any

					try {
						console.log(`[Import] Sending row ${rowNumber}:`, {
							institutions_id: registrationPayload.institutions_id,
							student_id: registrationPayload.student_id,
							stu_register_no: registrationPayload.stu_register_no,
							examination_session_id: registrationPayload.examination_session_id,
							course_offering_id: registrationPayload.course_offering_id,
						})

						const response = await fetch('/api/exam-management/exam-registrations', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(registrationPayload),
						})

						if (response.ok) {
							const savedRegistration = await response.json()
							setItems(prev => [savedRegistration, ...prev])
							successCount++
						} else {
							let errorMessage = 'Failed to create exam registration'
							try {
								const errorData = await response.json()
								errorMessage = errorData.error || errorData.message || errorMessage
								// Add more context for common errors
								if (response.status === 400) {
									errorMessage = `Validation error: ${errorMessage}`
								} else if (response.status === 409 || errorMessage.includes('already exists')) {
									errorMessage = `Duplicate entry: This registration already exists for this student, session, and course`
								} else if (response.status === 500) {
									errorMessage = `Server error: ${errorMessage}`
								}
							} catch {
								errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`
							}
							errorCount++
							uploadErrors.push({
								row: rowNumber,
								student_register_no: displayCodes?.studentRegisterNo || 'N/A',
								course_code: displayCodes?.courseCode || 'N/A',
								errors: [errorMessage]
							})
							if (originalRow) apiFailedRows.push(originalRow)
							console.error(`[Import] Row ${rowNumber} failed:`, errorMessage)
						}
					} catch (error) {
						errorCount++
						let errorMessage = 'Network error - please check your connection'
						if (error instanceof Error) {
							if (error.message.includes('fetch failed')) {
								errorMessage = 'Network request failed - server may be unavailable or request timed out'
							} else if (error.message.includes('timeout')) {
								errorMessage = 'Request timed out - please try again'
							} else {
								errorMessage = `Error: ${error.message}`
							}
						}
						uploadErrors.push({
							row: rowNumber,
							student_register_no: displayCodes?.studentRegisterNo || 'N/A',
							course_code: displayCodes?.courseCode || 'N/A',
							errors: [errorMessage]
						})
						if (originalRow) apiFailedRows.push(originalRow)
						console.error(`[Import] Row ${rowNumber} exception:`, error)
					}
				}

				setLoading(false)
				setImportInProgress(false)

				const totalRows = rows.length // Use original total rows

				// Update upload summary
				setUploadSummary({
					total: totalRows,
					success: successCount,
					failed: preValidationErrors.length + errorCount
				})

				// Combine pre-validation failed rows with API failed rows
				const allFailedRows = [...failedRows, ...apiFailedRows]
				setFailedRowsData(allFailedRows)

				// Show detailed results dialog - always show for transparency
				setImportErrors([...preValidationErrors, ...uploadErrors])
				setErrorPopupOpen(true)

				if (successCount > 0 && errorCount === 0) {
					toast({
						title: "✅ Upload Complete",
						description: `Successfully uploaded ${successCount} exam registration${successCount > 1 ? 's' : ''}.`,
						className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
						duration: 5000,
					})
				} else if (successCount > 0 && errorCount > 0) {
					toast({
						title: "⚠️ Partial Upload",
						description: `${successCount} successful, ${errorCount} failed. View details.`,
						className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
						duration: 6000,
					})
				} else if (errorCount > 0) {
					toast({
						title: "❌ Upload Failed",
						description: `All ${errorCount} row${errorCount > 1 ? 's' : ''} failed. View details.`,
						variant: "destructive",
						className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
						duration: 6000,
					})
				}
			} catch (err) {
				console.error('Import error:', err)
				setLoading(false)
				setImportInProgress(false)
				toast({
					title: "❌ Import Error",
					description: "Import failed. Please check your file format and try again.",
					variant: "destructive",
					className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
				})
			}
		}
		input.click()
	}

	return (
		<SidebarProvider>
			{/* Import Loading Overlay */}
			{importInProgress && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
					<div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
						<div className="flex flex-col items-center gap-4">
							<div className="relative">
								<Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
							</div>
							<div className="text-center">
								<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
									Importing Exam Registrations
								</h3>
								<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
									Please wait while the data is being processed...
								</p>
							</div>
							{importProgress.total > 0 && (
								<div className="w-full space-y-2">
									<div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
										<span>Progress</span>
										<span>{importProgress.current} / {importProgress.total}</span>
									</div>
									<div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
										<div
											className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
											style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
										/>
									</div>
									<p className="text-xs text-center text-slate-500 dark:text-slate-400">
										{Math.round((importProgress.current / importProgress.total) * 100)}% complete
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
			<AppSidebar />
			<SidebarInset className="flex flex-col min-h-screen">
				<AppHeader />
				<PageTransition>
					<div className="flex flex-1 flex-col gap-3 p-4 pt-0 overflow-y-auto">
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
											<Link href="/exam-management">Exam Management</Link>
										</BreadcrumbLink>
									</BreadcrumbItem>
									<BreadcrumbSeparator />
									<BreadcrumbItem>
										<BreadcrumbPage>Exam Registrations</BreadcrumbPage>
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
						</div>

						{/* Premium Stats Cards */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<Card className="border-slate-200 shadow-sm rounded-2xl">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-slate-600">Total Registrations</p>
											<p className="text-3xl font-bold text-slate-900 mt-1 font-grotesk">{items.length}</p>
										</div>
										<div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100">
											<ClipboardCheck className="h-6 w-6 text-blue-600" />
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border-slate-200 shadow-sm rounded-2xl">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-slate-600">Approved</p>
											<p className="text-3xl font-bold text-emerald-600 mt-1 font-grotesk">{items.filter(i => i.registration_status === 'Approved').length}</p>
										</div>
										<div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
											<CheckCircle className="h-6 w-6 text-emerald-600" />
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border-slate-200 shadow-sm rounded-2xl">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-slate-600">Pending</p>
											<p className="text-3xl font-bold text-amber-600 mt-1 font-grotesk">{items.filter(i => i.registration_status === 'Pending').length}</p>
										</div>
										<div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center ring-1 ring-amber-100">
											<AlertTriangle className="h-6 w-6 text-amber-600" />
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border-slate-200 shadow-sm rounded-2xl">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-slate-600">Fee Paid</p>
											<p className="text-3xl font-bold text-purple-600 mt-1 font-grotesk">{items.filter(i => i.fee_paid).length}</p>
										</div>
										<div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center ring-1 ring-purple-100">
											<TrendingUp className="h-6 w-6 text-purple-600" />
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						<Card className="flex-1 flex flex-col min-h-0 border-slate-200 shadow-sm rounded-2xl">
							<CardHeader className="flex-shrink-0 px-8 py-6 border-b border-slate-200">
								<div className="space-y-4">
									{/* Row 1: Title (Left) & Action Buttons (Right) - Same Line */}
									<div className="flex items-center justify-between">
										{/* Title Section - Left */}
										<div className="flex items-center gap-3">
											<div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
												<ClipboardCheck className="h-6 w-6 text-emerald-600" />
											</div>
											<div>
												<h2 className="text-xl font-bold text-slate-900 font-grotesk">All Exam Registrations</h2>
												<p className="text-sm text-slate-600">Manage learner exam course registrations</p>
											</div>
										</div>

										{/* Action Buttons - Right (Icon Only) */}
										<div className="flex items-center gap-2">
											<Button variant="outline" size="sm" onClick={fetchExamRegistrations} disabled={loading} className="h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors border border-slate-300 p-0" title="Refresh">
												<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
											</Button>
											<Button variant="outline" size="sm" onClick={handleTemplateExport} className="h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors border border-slate-300 p-0" title="Download Template">
												<FileSpreadsheet className="h-4 w-4" />
											</Button>
											<Button variant="outline" size="sm" onClick={handleDownload} className="h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors border border-slate-300 p-0" title="Export JSON">
												<FileJson className="h-4 w-4" />
											</Button>
											<Button variant="outline" size="sm" onClick={handleExport} className="h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors border border-slate-300 p-0" title="Export Excel">
												<Download className="h-4 w-4" />
											</Button>
											<Button variant="outline" size="sm" onClick={handleImport} className="h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors border border-slate-300 p-0" title="Import File">
												<Upload className="h-4 w-4" />
											</Button>
											<Button size="sm" onClick={openAdd} disabled={loading} className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" title="Add Registration">
												<PlusCircle className="h-4 w-4 mr-2" />
												Add Registration
											</Button>
										</div>
									</div>

									{/* Row 2: Filter and Search Row */}
									<div className="flex items-center gap-2">
										<Select value={statusFilter} onValueChange={setStatusFilter}>
											<SelectTrigger className="h-9 rounded-lg border-slate-300 focus:border-emerald-500 w-[140px]">
												<SelectValue placeholder="All Status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Status</SelectItem>
												<SelectItem value="Pending">Pending</SelectItem>
												<SelectItem value="Approved">Approved</SelectItem>
												<SelectItem value="Rejected">Rejected</SelectItem>
												<SelectItem value="Cancelled">Cancelled</SelectItem>
											</SelectContent>
										</Select>

										<Select value={programFilter} onValueChange={setProgramFilter} disabled={programsLoading}>
											<SelectTrigger className="h-9 rounded-lg border-slate-300 focus:border-emerald-500 w-[180px]">
												<SelectValue placeholder={programsLoading ? "Loading..." : "All Programs"} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Programs</SelectItem>
												{programs.map(prog => (
													<SelectItem key={prog.id} value={prog.program_code}>
														{prog.program_code} - {prog.program_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>

										<div className="relative flex-1 max-w-sm">
											<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
											<Input
												value={searchTerm}
												onChange={(e) => setSearchTerm(e.target.value)}
												placeholder="Search registrations..."
												className="pl-8 h-9 rounded-lg border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20"
											/>
										</div>
									</div>
								</div>
							</CardHeader>

							<CardContent className="flex-1 overflow-auto px-8 py-6 bg-slate-50/50">
								<div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
									<Table>
										<TableHeader className="bg-slate-50 border-b border-slate-200">
											<TableRow>
												{/* Show Institution column only when "All Institutions" is selected */}
												{mustSelectInstitution && (
													<TableHead className="text-sm font-semibold text-slate-700">Institution</TableHead>
												)}
												<TableHead className="text-sm font-semibold text-slate-700">
													<Button variant="ghost" size="sm" onClick={() => handleSort("student")} className="px-2 hover:bg-slate-100 rounded-lg transition-colors">
														Learner
														<span className="ml-1">{getSortIcon("student")}</span>
													</Button>
												</TableHead>
												<TableHead className="text-sm font-semibold text-slate-700">
													<Button variant="ghost" size="sm" onClick={() => handleSort("examination_session")} className="px-2 hover:bg-slate-100 rounded-lg transition-colors">
														Session
														<span className="ml-1">{getSortIcon("examination_session")}</span>
													</Button>
												</TableHead>
												<TableHead className="text-sm font-semibold text-slate-700">Course</TableHead>
												<TableHead className="text-sm font-semibold text-slate-700">
													<Button variant="ghost" size="sm" onClick={() => handleSort("registration_status")} className="px-2 hover:bg-slate-100 rounded-lg transition-colors">
														Status
														<span className="ml-1">{getSortIcon("registration_status")}</span>
													</Button>
												</TableHead>
												<TableHead className="text-sm font-semibold text-slate-700">Type</TableHead>
												<TableHead className="text-sm font-semibold text-slate-700">Attempt</TableHead>
												<TableHead className="text-sm font-semibold text-slate-700">Fee Paid</TableHead>
												<TableHead className="text-center text-sm font-semibold text-slate-700">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{loading || !isReady ? (
												<TableRow>
													<TableCell colSpan={mustSelectInstitution ? 9 : 8} className="h-24 text-center text-sm text-slate-500">Loading…</TableCell>
												</TableRow>
											) : pageItems.length ? (
												<>
													{pageItems.map((row) => (
														<TableRow key={row.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
															{/* Show Institution cell only when "All Institutions" is selected */}
															{mustSelectInstitution && (
																<TableCell className="text-sm text-slate-700">
																	{institutions.find(i => i.id === row.institutions_id)?.institution_code || '-'}
																</TableCell>
															)}
															<TableCell className="font-medium text-sm text-slate-900 font-grotesk">
																{row.student?.register_number || '-'}
																<br />
																<span className="text-slate-500 text-xs">
																	{row.student ? `${row.student.first_name} ` : ''}
																</span>
															</TableCell>
															<TableCell className="text-sm text-slate-700">
																{row.examination_session?.session_code || '-'}
															</TableCell>
															<TableCell className="text-sm text-slate-700">
																{row.course_offering?.course_code || '-'}
																<br />
																<span className="text-slate-500 text-xs">
																	{row.course_offering?.course_name || ''}
																</span>
															</TableCell>
															<TableCell>
																<Badge variant={row.registration_status === 'Approved' ? 'default' : 'secondary'} className={`text-xs ${
																	row.registration_status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
																	row.registration_status === 'Pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
																	row.registration_status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
																	'bg-slate-100 text-slate-700 border-slate-200'
																}`}>
																	{row.registration_status}
																</Badge>
															</TableCell>
															<TableCell className="text-sm text-slate-600">
																{row.is_regular ? 'Regular' : 'Arrear'}
															</TableCell>
															<TableCell className="text-sm text-slate-600">
																{row.attempt_number}
															</TableCell>
															<TableCell>
																<Badge variant={row.fee_paid ? 'default' : 'secondary'} className={`text-xs ${row.fee_paid ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
																	{row.fee_paid ? 'Yes' : 'No'}
																</Badge>
															</TableCell>
															<TableCell className="text-center">
																<div className="flex items-center justify-center gap-1">
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-8 w-8 p-0 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
																		onClick={() => openEdit(row)}
																		title="Edit"
																	>
																		<Edit className="h-4 w-4" />
																	</Button>
																	<AlertDialog>
																		<AlertDialogTrigger asChild>
																			<Button
																				variant="ghost"
																				size="sm"
																				className="h-8 w-8 p-0 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
																				title="Delete"
																			>
																				<Trash2 className="h-4 w-4" />
																			</Button>
																		</AlertDialogTrigger>
																		<AlertDialogContent>
																			<AlertDialogHeader>
																				<AlertDialogTitle>Delete Exam Registration</AlertDialogTitle>
																				<AlertDialogDescription>
																					Are you sure you want to delete this exam registration? This action cannot be undone.
																				</AlertDialogDescription>
																			</AlertDialogHeader>
																			<AlertDialogFooter>
																				<AlertDialogCancel>Cancel</AlertDialogCancel>
																				<AlertDialogAction onClick={() => remove(row.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
																			</AlertDialogFooter>
																		</AlertDialogContent>
																	</AlertDialog>
																</div>
															</TableCell>
														</TableRow>
													))}
												</>
											) : (
												<TableRow>
													<TableCell colSpan={mustSelectInstitution ? 9 : 8} className="h-24 text-center text-sm text-slate-500">No data</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</div>

								{/* Pagination */}
								<div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
									<div className="flex items-center gap-4">
										<div className="text-sm text-slate-600">
											Showing {filtered.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} registrations
										</div>
										<div className="flex items-center gap-2">
											<Label htmlFor="page-size" className="text-sm text-slate-600">
												Rows per page:
											</Label>
											<Select
												value={String(itemsPerPage)}
												onValueChange={(value) => setItemsPerPage(value === "all" ? "all" : Number(value))}
											>
												<SelectTrigger id="page-size" className="h-9 rounded-lg border-slate-300 w-[100px]">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="10">10</SelectItem>
													<SelectItem value="20">20</SelectItem>
													<SelectItem value="50">50</SelectItem>
													<SelectItem value="100">100</SelectItem>
													<SelectItem value="all">All</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
											disabled={currentPage === 1 || itemsPerPage === "all"}
											className="h-9 px-4 rounded-lg border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
										>
											<ChevronLeft className="h-4 w-4 mr-1" /> Previous
										</Button>
										<div className="text-sm text-slate-600 px-2">
											Page {currentPage} of {totalPages}
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
											disabled={currentPage >= totalPages || itemsPerPage === "all"}
											className="h-9 px-4 rounded-lg border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
										>
											Next <ChevronRight className="h-4 w-4 ml-1" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</PageTransition>
				<AppFooter />
			</SidebarInset>

			<Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) resetForm(); setSheetOpen(o) }}>
				<SheetContent className="sm:max-w-[800px] overflow-y-auto">
					<SheetHeader className="pb-6 border-b border-slate-200">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
									<ClipboardCheck className="h-6 w-6 text-emerald-600" />
								</div>
								<div>
									<SheetTitle className="text-xl font-bold text-slate-900 font-grotesk">
										{editing ? "Edit Exam Registration" : "Add Exam Registration"}
									</SheetTitle>
									<p className="text-sm text-slate-600 mt-1">
										{editing ? "Update exam registration information" : "Create a new exam registration record"}
									</p>
								</div>
							</div>
						</div>
					</SheetHeader>

					<div className="mt-6 space-y-8">
						{/* Basic Information Section */}
						<div className="space-y-4">
							<div className="flex items-center gap-3 pb-3 border-b border-slate-200">
								<div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
									<ClipboardCheck className="h-4 w-4 text-emerald-600" />
								</div>
								<h3 className="text-lg font-semibold text-slate-900 font-grotesk">Basic Information</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Institution dropdown - show only when needed */}
								{(mustSelectInstitution || !shouldFilter || !institutionId) && (
									<div className="space-y-2">
										<Label htmlFor="institutions_id" className="text-sm font-semibold">
											Institution <span className="text-red-500">*</span>
										</Label>
										<Select
											value={formData.institutions_id}
											onValueChange={(id) => {
												setFormData(prev => ({ ...prev, institutions_id: id, student_id: '', examination_session_id: '', course_offering_id: '' }))
												setSelectedInstitutionId(id)
											}}
										>
											<SelectTrigger className={`h-10 ${errors.institutions_id ? 'border-destructive' : ''}`}>
												<SelectValue placeholder="Select Institution" />
											</SelectTrigger>
											<SelectContent>
												{institutions.map(inst => (
													<SelectItem key={inst.id} value={inst.id}>
														{inst.institution_code}{inst.name ? ` - ${inst.name}` : ''}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{errors.institutions_id && <p className="text-xs text-destructive">{errors.institutions_id}</p>}
									</div>
								)}

								{/* Learner dropdown */}
								<div className="space-y-2">
									<Label htmlFor="student_id" className="text-sm font-semibold">
										Learner <span className="text-red-500">*</span>
									</Label>
									<Select
										value={formData.student_id}
										onValueChange={(id) => {
											setFormData(prev => ({ ...prev, student_id: id }))
										}}
										disabled={!formData.institutions_id || learnersLoading}
									>
										<SelectTrigger className={`h-10 ${errors.student_id ? 'border-destructive' : ''} ${!formData.institutions_id || learnersLoading ? 'bg-muted cursor-not-allowed' : ''}`}>
											<SelectValue placeholder={
												!formData.institutions_id
													? "Select Institution First"
													: learnersLoading
														? "Loading Learners..."
														: filteredStudents.length === 0
															? "No Learners Available"
															: "Select Learner"
											} />
										</SelectTrigger>
										<SelectContent>
											{filteredStudents.map(student => (
												<SelectItem key={student.id} value={student.id}>
													{student.register_number || student.roll_number}{student.first_name ? ` - ${student.first_name} ${student.last_name || ''}` : ''}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.student_id && <p className="text-xs text-destructive">{errors.student_id}</p>}
									{!formData.institutions_id && <p className="text-xs text-muted-foreground">Please select an institution first</p>}
									{learnersLoading && <p className="text-xs text-muted-foreground">Fetching learners from MyJKKN...</p>}
								</div>

								{/* Examination Session dropdown */}
								<div className="space-y-2">
									<Label htmlFor="examination_session_id" className="text-sm font-semibold">
										Examination Session <span className="text-red-500">*</span>
									</Label>
									<Select
										value={formData.examination_session_id}
										onValueChange={(id) => {
											setFormData(prev => ({ ...prev, examination_session_id: id }))
										}}
										disabled={!formData.institutions_id}
									>
										<SelectTrigger className={`h-10 ${errors.examination_session_id ? 'border-destructive' : ''} ${!formData.institutions_id ? 'bg-muted cursor-not-allowed' : ''}`}>
											<SelectValue placeholder={!formData.institutions_id ? "Select Institution First" : filteredExaminationSessions.length === 0 ? "No Sessions Available" : "Select Examination Session"} />
										</SelectTrigger>
										<SelectContent>
											{filteredExaminationSessions.map(session => (
												<SelectItem key={session.id} value={session.id}>
													{session.session_code}{session.session_name ? ` - ${session.session_name}` : ''}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.examination_session_id && <p className="text-xs text-destructive">{errors.examination_session_id}</p>}
									{!formData.institutions_id && <p className="text-xs text-muted-foreground">Please select an institution first</p>}
								</div>

								{/* Course Offering dropdown */}
								<div className="space-y-2">
									<Label htmlFor="course_offering_id" className="text-sm font-semibold">
										Course Offering <span className="text-red-500">*</span>
									</Label>
									<Select
										value={formData.course_offering_id}
										onValueChange={(id) => {
											setFormData(prev => ({ ...prev, course_offering_id: id }))
										}}
										disabled={!formData.institutions_id}
									>
										<SelectTrigger className={`h-10 ${errors.course_offering_id ? 'border-destructive' : ''} ${!formData.institutions_id ? 'bg-muted cursor-not-allowed' : ''}`}>
											<SelectValue placeholder={!formData.institutions_id ? "Select Institution First" : filteredCourseOfferings.length === 0 ? "No Courses Available" : "Select Course Offering"} />
										</SelectTrigger>
										<SelectContent>
											{filteredCourseOfferings.map(course => (
												<SelectItem key={course.id} value={course.id}>
													{course.course_code}{course.course_name ? ` - ${course.course_name}` : ''}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.course_offering_id && <p className="text-xs text-destructive">{errors.course_offering_id}</p>}
									{!formData.institutions_id && <p className="text-xs text-muted-foreground">Please select an institution first</p>}
								</div>

								{/* Learner Register Number */}
								<div className="space-y-2">
									<Label htmlFor="stu_register_no" className="text-sm font-semibold">
										Learner Register Number
									</Label>
									<Input
										id="stu_register_no"
										type="text"
										placeholder="e.g., REG2023001"
										value={formData.stu_register_no}
										onChange={(e) => setFormData({ ...formData, stu_register_no: e.target.value })}
										className="h-10"
									/>
									<p className="text-xs text-muted-foreground">Optional: Enter learner's register number</p>
								</div>

								{/* Learner Name */}
								<div className="space-y-2">
									<Label htmlFor="student_name" className="text-sm font-semibold">
										Learner Name (Override)
									</Label>
									<Input
										id="student_name"
										type="text"
										placeholder="e.g., John Doe"
										value={formData.student_name}
										onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
										className="h-10"
									/>
									<p className="text-xs text-muted-foreground">Optional: Override learner name if needed</p>
								</div>

								<div className="space-y-2">
									<Label htmlFor="registration_date" className="text-sm font-semibold">
										Registration Date
									</Label>
									<Input
										id="registration_date"
										type="date"
										value={formData.registration_date}
										onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
										className="h-10"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="registration_status" className="text-sm font-semibold">
										Registration Status <span className="text-red-500">*</span>
									</Label>
									<Select
										value={formData.registration_status}
										onValueChange={(value) => setFormData({ ...formData, registration_status: value })}
									>
										<SelectTrigger className={`h-10 ${errors.registration_status ? 'border-destructive' : ''}`}>
											<SelectValue placeholder="Select Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Pending">Pending</SelectItem>
											<SelectItem value="Approved">Approved</SelectItem>
											<SelectItem value="Rejected">Rejected</SelectItem>
											<SelectItem value="Cancelled">Cancelled</SelectItem>
										</SelectContent>
									</Select>
									{errors.registration_status && <p className="text-xs text-destructive">{errors.registration_status}</p>}
								</div>

								<div className="space-y-2">
									<Label htmlFor="attempt_number" className="text-sm font-semibold">
										Attempt Number
									</Label>
									<Input
										id="attempt_number"
										type="number"
										min="1"
										value={formData.attempt_number}
										onChange={(e) => setFormData({ ...formData, attempt_number: Number(e.target.value) })}
										className={`h-10 ${errors.attempt_number ? 'border-destructive' : ''}`}
									/>
									{errors.attempt_number && <p className="text-xs text-destructive">{errors.attempt_number}</p>}
								</div>

								<div className="space-y-2">
									<div className="flex items-center gap-3">
										<Label htmlFor="is_regular" className="text-sm font-semibold">Regular</Label>
										<Switch
											id="is_regular"
											checked={formData.is_regular}
											onCheckedChange={(v) => setFormData({ ...formData, is_regular: v })}
										/>
									</div>
								</div>
							</div>
						</div>

						{/* Fee Information Section */}
						<div className="space-y-4">
							<div className="flex items-center gap-3 pb-3 border-b border-slate-200">
								<div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center ring-1 ring-purple-100">
									<TrendingUp className="h-4 w-4 text-purple-600" />
								</div>
								<h3 className="text-lg font-semibold text-slate-900 font-grotesk">Fee Information</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<div className="flex items-center gap-3">
										<Label htmlFor="fee_paid" className="text-sm font-semibold">Fee Paid</Label>
										<Switch
											id="fee_paid"
											checked={formData.fee_paid}
											onCheckedChange={(v) => setFormData({ ...formData, fee_paid: v })}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="fee_amount" className="text-sm font-medium">Fee Amount</Label>
									<Input
										id="fee_amount"
										type="number"
										min="0"
										step="0.01"
										value={formData.fee_amount}
										onChange={(e) => setFormData({ ...formData, fee_amount: e.target.value })}
										className={`h-10 ${errors.fee_amount ? 'border-destructive' : ''}`}
										placeholder="e.g., 500.00"
									/>
									{errors.fee_amount && <p className="text-xs text-destructive">{errors.fee_amount}</p>}
								</div>

								<div className="space-y-2">
									<Label htmlFor="payment_date" className="text-sm font-medium">Payment Date</Label>
									<Input
										id="payment_date"
										type="date"
										value={formData.payment_date}
										onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
										className="h-10"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="payment_transaction_id" className="text-sm font-medium">Transaction ID</Label>
									<Input
										id="payment_transaction_id"
										value={formData.payment_transaction_id}
										onChange={(e) => setFormData({ ...formData, payment_transaction_id: e.target.value })}
										className="h-10"
										placeholder="e.g., TXN123456"
									/>
								</div>

								<div className="space-y-2 md:col-span-2">
									<Label htmlFor="remarks" className="text-sm font-medium">Remarks</Label>
									<Input
										id="remarks"
										value={formData.remarks}
										onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
										className="h-10"
										placeholder="Additional notes"
									/>
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
							<Button
								variant="outline"
								size="sm"
								className="h-10 px-6 rounded-lg border-slate-300 hover:bg-slate-50"
								onClick={() => { setSheetOpen(false); resetForm() }}
							>
								Cancel
							</Button>
							<Button
								size="sm"
								className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
								onClick={save}
								disabled={loading}
							>
								{editing ? "Update Registration" : "Create Registration"}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{/* Upload Results Dialog */}
			<AlertDialog open={errorPopupOpen} onOpenChange={setErrorPopupOpen}>
				<AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-3xl border-slate-200">
					<AlertDialogHeader>
						<div className="flex items-center gap-3">
							<div className={`h-10 w-10 rounded-full flex items-center justify-center ${
								uploadSummary.failed === 0 ? 'bg-green-100' :
								uploadSummary.success > 0 ? 'bg-amber-100' : 'bg-red-100'
							}`}>
								{uploadSummary.failed === 0 ? (
									<CheckCircle className="h-5 w-5 text-green-600" />
								) : uploadSummary.success > 0 ? (
									<AlertTriangle className="h-5 w-5 text-amber-600" />
								) : (
									<XCircle className="h-5 w-5 text-red-600" />
								)}
							</div>
							<div>
								<AlertDialogTitle className={`text-xl font-bold ${
									uploadSummary.failed === 0 ? 'text-green-600' :
									uploadSummary.success > 0 ? 'text-amber-600' : 'text-red-600'
								}`}>
									{uploadSummary.failed === 0 ? 'Upload Successful' :
									 uploadSummary.success > 0 ? 'Partial Upload Complete' : 'Upload Failed'}
								</AlertDialogTitle>
								<AlertDialogDescription className="text-sm text-muted-foreground mt-1">
									{uploadSummary.failed === 0
										? `All ${uploadSummary.success} exam registration${uploadSummary.success > 1 ? 's' : ''} have been successfully uploaded`
										: uploadSummary.success > 0
											? `${uploadSummary.success} of ${uploadSummary.total} registrations uploaded. ${uploadSummary.failed} failed.`
											: `All ${uploadSummary.failed} row${uploadSummary.failed > 1 ? 's' : ''} failed validation`}
								</AlertDialogDescription>
							</div>
						</div>
					</AlertDialogHeader>

					<div className="space-y-4">
						{/* Upload Summary Cards */}
						{uploadSummary.total > 0 && (
							<div className="grid grid-cols-3 gap-3">
								<div className="bg-blue-50 border-blue-200 rounded-lg p-3">
									<div className="text-xs text-blue-600 font-medium mb-1">Total Rows</div>
									<div className="text-2xl font-bold text-blue-700">{uploadSummary.total}</div>
								</div>
								<div className="bg-green-50 border-green-200 rounded-lg p-3">
									<div className="text-xs text-green-600 font-medium mb-1">Successful</div>
									<div className="text-2xl font-bold text-green-700">{uploadSummary.success}</div>
								</div>
								<div className="bg-red-50 border-red-200 rounded-lg p-3">
									<div className="text-xs text-red-600 font-medium mb-1">Failed</div>
									<div className="text-2xl font-bold text-red-700">{uploadSummary.failed}</div>
								</div>
							</div>
						)}

						{/* Error Summary - Only show if there are errors */}
						{importErrors.length > 0 && (
							<>
								<div className="bg-red-50 border border-red-200 rounded-lg p-4">
									<div className="flex items-center gap-2 mb-2">
										<AlertTriangle className="h-4 w-4 text-red-600" />
										<span className="font-semibold text-red-800">
											{importErrors.length} row{importErrors.length > 1 ? 's' : ''} failed validation
										</span>
									</div>
									<p className="text-sm text-red-700">
										Please correct these errors in your Excel file and try uploading again. Row numbers correspond to your Excel file (including header row).
									</p>
								</div>

								{/* Detailed Error List */}
								<div className="space-y-3">
									{importErrors.map((error, index) => (
										<div key={index} className="border border-red-200 rounded-xl p-4 bg-red-50/50">
											<div className="flex items-start justify-between mb-2">
												<div className="flex items-center gap-2">
													<Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300 rounded-lg">
														Row {error.row}
													</Badge>
													<span className="font-medium text-sm">
														{error.student_register_no} - {error.course_code}
													</span>
												</div>
											</div>

											<div className="space-y-1">
												{error.errors.map((err, errIndex) => (
													<div key={errIndex} className="flex items-start gap-2 text-sm">
														<XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
														<span className="text-red-700">{err}</span>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							</>
						)}

						{/* Success Message - Only show if no errors */}
						{importErrors.length === 0 && uploadSummary.total > 0 && (
							<div className="bg-green-50 border border-green-200 rounded-lg p-4">
								<div className="flex items-center gap-2">
									<CheckCircle className="h-5 w-5 text-green-600" />
									<span className="font-semibold text-green-800">
										All {uploadSummary.success} exam registration{uploadSummary.success > 1 ? 's' : ''} uploaded successfully
									</span>
								</div>
							</div>
						)}

						{/* Helpful Tips - Only show if there are errors */}
						{importErrors.length > 0 && (
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
								<div className="flex items-start gap-2">
									<div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
										<span className="text-xs font-bold text-blue-600">i</span>
									</div>
									<div>
										<h4 className="font-semibold text-blue-800 text-sm mb-1">Required Excel Format & Tips:</h4>
										<ul className="text-xs text-blue-700 space-y-1">
											<li>• <strong>Institution Code</strong> (required): Must match existing institution (e.g., JKKNCAS)</li>
											<li>• <strong>Learner Register Number</strong> (required): e.g., 24JUGEN6001</li>
											<li>• <strong>Learner Name</strong> (required): Full name of the learner</li>
											<li>• <strong>Examination Session Code</strong> (required): Must match existing session (e.g., JKKNCAS-NOV-DEC-2025)</li>
											<li>• <strong>Course Code</strong> (required): Must match existing course offering (e.g., 24UENS03)</li>
											<li>• <strong>Registration Status</strong> (required): Pending, Approved, Rejected, or Cancelled</li>
											<li>• <strong>Is Regular</strong> (optional): TRUE/FALSE (default: TRUE)</li>
											<li>• <strong>Attempt Number</strong> (optional): 1-10 (default: 1)</li>
											<li>• <strong>Fee Paid</strong> (optional): TRUE/FALSE (default: FALSE)</li>
											<li>• <strong>Fee Amount</strong> (optional): Cannot be negative</li>
											<li>• <strong>Payment Date</strong> (optional): Format DD-MM-YYYY</li>
											<li>• <strong>Registration Date</strong> (optional): Format DD-MM-YYYY (default: today)</li>
										</ul>
										<div className="mt-2 pt-2 border-t border-blue-200">
											<p className="text-xs text-blue-700 font-medium">Common Fixes:</p>
											<ul className="text-xs text-blue-700 space-y-1 mt-1">
												<li>• <strong>Important:</strong> Examination Session and Course Offering must belong to the specified Institution</li>
												<li>• Examination Session Code format: INSTITUTION-MONTH-YEAR (e.g., JKKNCAS-NOV-DEC-2025)</li>
												<li>• Course Code format: YearCodeSubject (e.g., 24UENS03)</li>
												<li>• Ensure no empty required fields</li>
												<li>• Check field length constraints and data formats</li>
											</ul>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					<AlertDialogFooter className="flex-col sm:flex-row gap-2">
						<AlertDialogCancel className="bg-gray-100 hover:bg-gray-200">
							Close
						</AlertDialogCancel>
						{failedRowsData.length > 0 && (
							<Button
								onClick={handleDownloadFailedRows}
								variant="outline"
								className="border-amber-500 text-amber-700 hover:bg-amber-50"
							>
								<Download className="h-4 w-4 mr-2" />
								Download Failed Rows ({failedRowsData.length})
							</Button>
						)}
						{importErrors.length > 0 && (
							<Button
								onClick={() => {
									setErrorPopupOpen(false)
									setImportErrors([])
									setFailedRowsData([])
								}}
								className="bg-blue-600 hover:bg-blue-700 text-white"
							>
								Try Again
							</Button>
						)}
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</SidebarProvider>
	)
}

