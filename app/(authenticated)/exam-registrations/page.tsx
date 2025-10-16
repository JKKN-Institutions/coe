"use client"

import { useMemo, useState, useEffect } from "react"
import * as XLSX from "xlsx"
import supabaseAuthService from "@/lib/auth/supabase-auth-service"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
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
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ClipboardCheck, TrendingUp, FileSpreadsheet, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

// Exam Registration type definition
interface ExamRegistration {
	id: string
	institutions_id: string
	student_id: string
	examination_session_id: string
	course_offering_id: string
	registration_date: string
	registration_status: string
	is_regular: boolean
	attempt_number: number
	fee_paid: boolean
	fee_amount: number | null
	payment_date: string | null
	payment_transaction_id: string | null
	remarks: string | null
	approved_by: string | null
	approved_date: string | null
	created_at: string
	updated_at: string
	institution?: { institution_code: string; institution_name: string }
	student?: { roll_number: string; first_name: string; last_name: string }
	examination_session?: { session_name: string; session_code: string }
	course_offering?: { course_code: string; course_name: string }
	approved_by_faculty?: { faculty_name: string; faculty_code: string }
}

export default function ExamRegistrationsPage() {
	const { toast } = useToast()
	const [items, setItems] = useState<ExamRegistration[]>([])
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState("")
	const [sortColumn, setSortColumn] = useState<string | null>(null)
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

	const [sheetOpen, setSheetOpen] = useState(false)
	const [editing, setEditing] = useState<ExamRegistration | null>(null)
	const [statusFilter, setStatusFilter] = useState("all")
	const [errorPopupOpen, setErrorPopupOpen] = useState(false)
	const [importErrors, setImportErrors] = useState<Array<{
		row: number
		student_id: string
		course_offering_id: string
		errors: string[]
	}>>([])
	const [uploadSummary, setUploadSummary] = useState<{
		total: number
		success: number
		failed: number
	}>({ total: 0, success: 0, failed: 0 })

	// Dropdowns for foreign keys
	const [institutions, setInstitutions] = useState<Array<{ id: string; institution_code: string; institution_name?: string }>>([])
	const [allStudents, setAllStudents] = useState<Array<{ id: string; roll_number: string; first_name?: string; last_name?: string; institution_id?: string }>>([])
	const [allExaminationSessions, setAllExaminationSessions] = useState<Array<{ id: string; session_code: string; session_name?: string; institutions_id?: string }>>([])
	const [allCourseOfferings, setAllCourseOfferings] = useState<Array<{ id: string; course_code: string; course_name?: string; institutions_id?: string }>>([])

	// Filtered dropdowns based on selected institution
	const [filteredStudents, setFilteredStudents] = useState<Array<{ id: string; roll_number: string; first_name?: string; last_name?: string }>>([])
	const [filteredExaminationSessions, setFilteredExaminationSessions] = useState<Array<{ id: string; session_code: string; session_name?: string }>>([])
	const [filteredCourseOfferings, setFilteredCourseOfferings] = useState<Array<{ id: string; course_code: string; course_name?: string }>>([])

	const [formData, setFormData] = useState({
		institutions_id: "",
		student_id: "",
		examination_session_id: "",
		course_offering_id: "",
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

	// Fetch data from API
	const fetchExamRegistrations = async () => {
		try {
			setLoading(true)
			const response = await fetch('/api/exam-registrations')
			if (!response.ok) {
				throw new Error('Failed to fetch exam registrations')
			}
			const data = await response.json()
			setItems(data)
		} catch (error) {
			console.error('Error fetching exam registrations:', error)
			setItems([])
		} finally {
			setLoading(false)
		}
	}

	const fetchInstitutions = async () => {
		try {
			const res = await fetch('/api/institutions')
			if (res.ok) {
				const data = await res.json()
				const mapped = Array.isArray(data)
					? data.filter((i: any) => i?.institution_code).map((i: any) => ({
						id: i.id,
						institution_code: i.institution_code,
						institution_name: i.institution_name || i.name
					}))
					: []
				setInstitutions(mapped)
			}
		} catch (e) {
			console.error('Failed to load institutions:', e)
		}
	}

	const fetchStudents = async () => {
		try {
			const res = await fetch('/api/students')
			if (res.ok) {
				const data = await res.json()
				const mapped = Array.isArray(data)
					? data.filter((s: any) => s?.roll_number).map((s: any) => ({
						id: s.id,
						roll_number: s.roll_number,
						first_name: s.first_name,
						last_name: s.last_name,
						institution_id: s.institution_id
					}))
					: []
				setAllStudents(mapped)
			}
		} catch (e) {
			console.error('Failed to load students:', e)
		}
	}

	const fetchExaminationSessions = async () => {
		try {
			const res = await fetch('/api/examination-sessions')
			if (res.ok) {
				const data = await res.json()
				const mapped = Array.isArray(data)
					? data.filter((s: any) => s?.session_code).map((s: any) => ({
						id: s.id,
						session_code: s.session_code,
						session_name: s.session_name,
						institutions_id: s.institutions_id
					}))
					: []
				setAllExaminationSessions(mapped)
			}
		} catch (e) {
			console.error('Failed to load examination sessions:', e)
		}
	}

	const fetchCourseOfferings = async () => {
		try {
			const res = await fetch('/api/course-offering')
			if (res.ok) {
				const data = await res.json()
				const mapped = Array.isArray(data)
					? data.filter((c: any) => c?.course_code).map((c: any) => ({
						id: c.id,
						course_code: c.course_code,
						course_name: c.course_name,
						institutions_id: c.institutions_id
					}))
					: []
				setAllCourseOfferings(mapped)
			}
		} catch (e) {
			console.error('Failed to load course offerings:', e)
		}
	}

	// Load data on component mount
	useEffect(() => {
		fetchExamRegistrations()
		fetchInstitutions()
		fetchStudents()
		fetchExaminationSessions()
		fetchCourseOfferings()
	}, [])

	// Filter dropdowns based on selected institution
	useEffect(() => {
		if (formData.institutions_id) {
			// Filter students by institution
			const studentsFiltered = allStudents.filter(s => s.institution_id === formData.institutions_id)
			setFilteredStudents(studentsFiltered)

			// Filter examination sessions by institution
			const sessionsFiltered = allExaminationSessions.filter(s => s.institutions_id === formData.institutions_id)
			setFilteredExaminationSessions(sessionsFiltered)

			// Filter course offerings by institution
			const coursesFiltered = allCourseOfferings.filter(c => c.institutions_id === formData.institutions_id)
			setFilteredCourseOfferings(coursesFiltered)

			// Reset dependent fields if they don't match the filtered results
			if (formData.student_id && !studentsFiltered.find(s => s.id === formData.student_id)) {
				setFormData(prev => ({ ...prev, student_id: "" }))
			}
			if (formData.examination_session_id && !sessionsFiltered.find(s => s.id === formData.examination_session_id)) {
				setFormData(prev => ({ ...prev, examination_session_id: "" }))
			}
			if (formData.course_offering_id && !coursesFiltered.find(c => c.id === formData.course_offering_id)) {
				setFormData(prev => ({ ...prev, course_offering_id: "" }))
			}
		} else {
			// If no institution selected, show all
			setFilteredStudents(allStudents)
			setFilteredExaminationSessions(allExaminationSessions)
			setFilteredCourseOfferings(allCourseOfferings)
		}
	}, [formData.institutions_id, allStudents, allExaminationSessions, allCourseOfferings])

	const resetForm = () => {
		setFormData({
			institutions_id: "",
			student_id: "",
			examination_session_id: "",
			course_offering_id: "",
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

	const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const pageItems = filtered.slice(startIndex, endIndex)

	useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection, statusFilter])

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

	const validate = () => {
		const e: Record<string, string> = {}
		if (!formData.institutions_id) e.institutions_id = "Required"
		if (!formData.student_id) e.student_id = "Required"
		if (!formData.examination_session_id) e.examination_session_id = "Required"
		if (!formData.course_offering_id) e.course_offering_id = "Required"
		if (!formData.registration_status) e.registration_status = "Required"
		if (formData.attempt_number < 1) e.attempt_number = "Must be at least 1"
		if (formData.fee_amount && Number(formData.fee_amount) < 0) e.fee_amount = "Cannot be negative"
		setErrors(e)
		return Object.keys(e).length === 0
	}

	const save = async () => {
		if (!validate()) return

		try {
			setLoading(true)

			let payload = {
				...formData,
				fee_amount: formData.fee_amount ? Number(formData.fee_amount) : null,
				payment_date: formData.payment_date || null,
				payment_transaction_id: formData.payment_transaction_id || null,
				remarks: formData.remarks || null,
				approved_by: formData.approved_by || null,
				approved_date: formData.approved_date || null,
			}

			if (editing) {
				// Update existing exam registration
				const response = await fetch('/api/exam-registrations', {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ id: editing.id, ...payload }),
				})

				if (!response.ok) {
					const errorData = await response.json()
					throw new Error(errorData.error || 'Failed to update exam registration')
				}

				const updated = await response.json()
				setItems((prev) => prev.map((p) => (p.id === editing.id ? updated : p)))

				toast({
					title: "✅ Exam Registration Updated",
					description: `Registration has been successfully updated.`,
					className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
				})
			} else {
				// Create new exam registration
				const response = await fetch('/api/exam-registrations', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				})

				if (!response.ok) {
					const errorData = await response.json()
					throw new Error(errorData.error || 'Failed to create exam registration')
				}

				const created = await response.json()
				setItems((prev) => [created, ...prev])

				toast({
					title: "✅ Exam Registration Created",
					description: `Registration has been successfully created.`,
					className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
				})
			}

			setSheetOpen(false)
			resetForm()
		} catch (error) {
			console.error('Error saving exam registration:', error)
			const errorMessage = error instanceof Error ? error.message : 'Failed to save exam registration. Please try again.'
			toast({
				title: "❌ Save Failed",
				description: errorMessage,
				variant: "destructive",
				className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
			})
		} finally {
			setLoading(false)
		}
	}

	const remove = async (id: string) => {
		try {
			setLoading(true)
			const registration = items.find(i => i.id === id)
			const studentName = registration?.student ? `${registration.student.first_name} ${registration.student.last_name}` : 'Exam Registration'

			const response = await fetch(`/api/exam-registrations?id=${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || 'Failed to delete exam registration')
			}

			setItems((prev) => prev.filter((p) => p.id !== id))

			toast({
				title: "✅ Exam Registration Deleted",
				description: `${studentName}'s registration has been successfully deleted.`,
				className: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200",
			})
		} catch (error) {
			console.error('Error deleting exam registration:', error)
			const errorMessage = error instanceof Error ? error.message : 'Failed to delete exam registration. Please try again.'
			toast({
				title: "❌ Delete Failed",
				description: errorMessage,
				variant: "destructive",
				className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
			})
		} finally {
			setLoading(false)
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
			student_roll_number: item.student?.roll_number || '',
			examination_session_code: item.examination_session?.session_code || '',
			course_code: item.course_offering?.course_code || '',
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
	}

	const handleExport = () => {
		const excelData = filtered.map((r) => ({
			'Institution Code': r.institution?.institution_code || '',
			'Student Roll Number': r.student?.roll_number || '',
			'Student Name': r.student ? `${r.student.first_name} ${r.student.last_name}` : '',
			'Examination Session': r.examination_session?.session_name || '',
			'Course': r.course_offering?.course_name || '',
			'Registration Date': formatDate(r.registration_date),
			'Status': r.registration_status,
			'Type': r.is_regular ? 'Regular' : 'Arrear',
			'Attempt': r.attempt_number,
			'Fee Paid': r.fee_paid ? 'Yes' : 'No',
			'Fee Amount': r.fee_amount || '',
			'Payment Date': r.payment_date ? formatDate(r.payment_date) : '',
			'Transaction ID': r.payment_transaction_id || '',
			'Remarks': r.remarks || '',
			'Created': formatDate(r.created_at),
		}))

		const ws = XLSX.utils.json_to_sheet(excelData)

		// Set column widths
		const colWidths = [
			{ wch: 15 }, // Institution Code
			{ wch: 15 }, // Student Roll Number
			{ wch: 25 }, // Student Name
			{ wch: 25 }, // Examination Session
			{ wch: 30 }, // Course
			{ wch: 15 }, // Registration Date
			{ wch: 12 }, // Status
			{ wch: 10 }, // Type
			{ wch: 8 },  // Attempt
			{ wch: 10 }, // Fee Paid
			{ wch: 12 }, // Fee Amount
			{ wch: 15 }, // Payment Date
			{ wch: 20 }, // Transaction ID
			{ wch: 30 }, // Remarks
			{ wch: 12 }  // Created
		]
		ws['!cols'] = colWidths

		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Exam Registrations')
		XLSX.writeFile(wb, `exam_registrations_export_${new Date().toISOString().split('T')[0]}.xlsx`)
	}

	const handleTemplateExport = () => {
		const wb = XLSX.utils.book_new()

		// Sheet 1: Template with sample row
		const sample = [{
			'Institution Code': 'JKKN',
			'Student Roll Number': '2023001',
			'Examination Session Code': 'ES2024-01',
			'Course Code': 'CS101',
			'Registration Date': '2024-01-15',
			'Registration Status': 'Pending',
			'Is Regular': 'true',
			'Attempt Number': '1',
			'Fee Paid': 'false',
			'Fee Amount': '500',
			'Payment Date': '',
			'Payment Transaction ID': '',
			'Remarks': ''
		}]

		const ws = XLSX.utils.json_to_sheet(sample)

		// Set column widths
		const colWidths = [
			{ wch: 18 }, // Institution Code
			{ wch: 20 }, // Student Roll Number
			{ wch: 25 }, // Examination Session Code
			{ wch: 15 }, // Course Code
			{ wch: 18 }, // Registration Date
			{ wch: 18 }, // Registration Status
			{ wch: 12 }, // Is Regular
			{ wch: 15 }, // Attempt Number
			{ wch: 10 }, // Fee Paid
			{ wch: 12 }, // Fee Amount
			{ wch: 15 }, // Payment Date
			{ wch: 25 }, // Payment Transaction ID
			{ wch: 30 }  // Remarks
		]
		ws['!cols'] = colWidths

		// Style mandatory field headers red with asterisk
		const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
		const mandatoryFields = ['Institution Code', 'Student Roll Number', 'Examination Session Code', 'Course Code', 'Registration Status']

		for (let col = range.s.c; col <= range.e.c; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
			if (!ws[cellAddress]) continue

			const cell = ws[cellAddress]
			const isMandatory = mandatoryFields.includes(cell.v as string)

			if (isMandatory) {
				cell.v = cell.v + ' *'
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

		// Sheet 2: Reference Data
		const references = [
			{ 'Reference Type': 'Registration Status', 'Valid Values': 'Pending, Approved, Rejected, Cancelled' },
			{ 'Reference Type': 'Is Regular', 'Valid Values': 'true, false' },
			{ 'Reference Type': 'Fee Paid', 'Valid Values': 'true, false' },
			{ 'Reference Type': 'Attempt Number', 'Valid Values': '1-10' },
		]

		const wsRef = XLSX.utils.json_to_sheet(references)
		const refColWidths = [
			{ wch: 25 }, // Reference Type
			{ wch: 50 }  // Valid Values
		]
		wsRef['!cols'] = refColWidths

		XLSX.utils.book_append_sheet(wb, wsRef, 'Reference Data')

		XLSX.writeFile(wb, `exam_registrations_template_${new Date().toISOString().split('T')[0]}.xlsx`)
	}

	const handleImport = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.json,.csv,.xlsx,.xls'
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) return
			try {
				let rows: any[] = []
				if (file.name.endsWith('.json')) {
					const text = await file.text()
					rows = JSON.parse(text)
				} else if (file.name.endsWith('.csv')) {
					const text = await file.text()
					const lines = text.split('\n').filter(line => line.trim())
					if (lines.length < 2) {
						toast({
							title: "❌ Invalid CSV File",
							description: "CSV file must have at least a header row and one data row",
							variant: "destructive",
							className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
						})
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
				} else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
					const data = new Uint8Array(await file.arrayBuffer())
					const wb = XLSX.read(data, { type: 'array' })
					const ws = wb.Sheets[wb.SheetNames[0]]
					rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
				}

				const now = new Date().toISOString()
				const validationErrors: Array<{
					row: number
					student_id: string
					course_offering_id: string
					errors: string[]
				}> = []

				// Map rows to exam registrations
				const mapped = []
				for (let i = 0; i < rows.length; i++) {
					const r = rows[i]
					const rowNumber = i + 2

					// Find IDs from codes
					const institution = institutions.find(inst => inst.institution_code === String(r['Institution Code'] || ''))
					const student = allStudents.find(s => s.roll_number === String(r['Student Roll Number'] || ''))
					const session = allExaminationSessions.find(s => s.session_code === String(r['Examination Session Code'] || ''))
					const course = allCourseOfferings.find(c => c.course_code === String(r['Course Code'] || ''))

					if (!institution || !student || !session || !course) {
						validationErrors.push({
							row: rowNumber,
							student_id: String(r['Student Roll Number'] || 'N/A'),
							course_offering_id: String(r['Course Code'] || 'N/A'),
							errors: [
								!institution ? 'Institution code not found' : '',
								!student ? 'Student roll number not found' : '',
								!session ? 'Examination session code not found' : '',
								!course ? 'Course code not found' : ''
							].filter(Boolean)
						})
						continue
					}

					// Validate foreign key relationships
					const fkErrors: string[] = []
					if (student.institution_id !== institution.id) {
						fkErrors.push('Student does not belong to the specified institution')
					}
					if (session.institutions_id !== institution.id) {
						fkErrors.push('Examination session does not belong to the specified institution')
					}
					if (course.institutions_id !== institution.id) {
						fkErrors.push('Course offering does not belong to the specified institution')
					}

					if (fkErrors.length > 0) {
						validationErrors.push({
							row: rowNumber,
							student_id: String(r['Student Roll Number'] || 'N/A'),
							course_offering_id: String(r['Course Code'] || 'N/A'),
							errors: fkErrors
						})
						continue
					}

					const registrationData = {
						institutions_id: institution.id,
						student_id: student.id,
						examination_session_id: session.id,
						course_offering_id: course.id,
						registration_date: String(r['Registration Date'] || new Date().toISOString().split('T')[0]),
						registration_status: String(r['Registration Status'] || 'Pending'),
						is_regular: String(r['Is Regular'] || 'true').toLowerCase() === 'true',
						attempt_number: Number(r['Attempt Number'] || 1),
						fee_paid: String(r['Fee Paid'] || 'false').toLowerCase() === 'true',
						fee_amount: r['Fee Amount'] ? Number(r['Fee Amount']) : null,
						payment_date: String(r['Payment Date'] || '') || null,
						payment_transaction_id: String(r['Payment Transaction ID'] || '') || null,
						remarks: String(r['Remarks'] || '') || null,
					}

					const errors = validateExamRegistrationData(registrationData, rowNumber)
					if (errors.length > 0) {
						validationErrors.push({
							row: rowNumber,
							student_id: student.roll_number,
							course_offering_id: course.course_code,
							errors: errors
						})
						continue
					}

					mapped.push(registrationData)
				}

				// If there are validation errors, show them in popup
				if (validationErrors.length > 0) {
					setImportErrors(validationErrors)
					setUploadSummary({
						total: rows.length,
						success: 0,
						failed: validationErrors.length
					})
					setErrorPopupOpen(true)
					return
				}

				if (mapped.length === 0) {
					toast({
						title: "❌ No Valid Data",
						description: "No valid data found in the file. Please check required fields.",
						variant: "destructive",
						className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
					})
					return
				}

				// Save each registration to the database
				setLoading(true)
				let successCount = 0
				let errorCount = 0
				const uploadErrors: Array<{
					row: number
					student_id: string
					course_offering_id: string
					errors: string[]
				}> = []

				for (let i = 0; i < mapped.length; i++) {
					const registration = mapped[i]
					const rowNumber = i + 2

					try {
						const response = await fetch('/api/exam-registrations', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(registration),
						})

						if (response.ok) {
							const savedRegistration = await response.json()
							setItems(prev => [savedRegistration, ...prev])
							successCount++
						} else {
							const errorData = await response.json()
							errorCount++
							uploadErrors.push({
								row: rowNumber,
								student_id: String(registration.student_id),
								course_offering_id: String(registration.course_offering_id),
								errors: [errorData.error || 'Failed to save exam registration']
							})
						}
					} catch (error) {
						errorCount++
						uploadErrors.push({
							row: rowNumber,
							student_id: String(registration.student_id),
							course_offering_id: String(registration.course_offering_id),
							errors: [error instanceof Error ? error.message : 'Network error']
						})
					}
				}

				setLoading(false)

				const totalRows = mapped.length

				// Update upload summary
				setUploadSummary({
					total: totalRows,
					success: successCount,
					failed: errorCount
				})

				// Show detailed results with error dialog if needed
				if (uploadErrors.length > 0) {
					setImportErrors(uploadErrors)
					setErrorPopupOpen(true)
				}

				if (successCount > 0 && errorCount === 0) {
					toast({
						title: "✅ Upload Complete",
						description: `Successfully uploaded all ${successCount} row${successCount > 1 ? 's' : ''} (${successCount} registration${successCount > 1 ? 's' : ''}) to the database.`,
						className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
						duration: 5000,
					})
				} else if (successCount > 0 && errorCount > 0) {
					toast({
						title: "⚠️ Partial Upload Success",
						description: `Processed ${totalRows} row${totalRows > 1 ? 's' : ''}: ${successCount} successful, ${errorCount} failed. View error details below.`,
						className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
						duration: 6000,
					})
				} else if (errorCount > 0) {
					toast({
						title: "❌ Upload Failed",
						description: `Processed ${totalRows} row${totalRows > 1 ? 's' : ''}: 0 successful, ${errorCount} failed. View error details below.`,
						variant: "destructive",
						className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
						duration: 6000,
					})
				}
			} catch (err) {
				console.error('Import error:', err)
				setLoading(false)
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
			<AppSidebar />
			<SidebarInset className="flex flex-col min-h-screen">
				<AppHeader />

				<div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
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
									<BreadcrumbPage>Exam Registrations</BreadcrumbPage>
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
										<p className="text-xs font-medium text-muted-foreground">Total Registrations</p>
										<p className="text-xl font-bold">{items.length}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
										<ClipboardCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Approved</p>
										<p className="text-xl font-bold text-green-600">{items.filter(i => i.registration_status === 'Approved').length}</p>
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
										<p className="text-xs font-medium text-muted-foreground">Pending</p>
										<p className="text-xl font-bold text-yellow-600">{items.filter(i => i.registration_status === 'Pending').length}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
										<AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Fee Paid</p>
										<p className="text-xl font-bold text-blue-600">{items.filter(i => i.fee_paid).length}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
										<TrendingUp className="h-3 w-3 text-purple-600 dark:text-purple-400" />
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<Card className="flex-1 flex flex-col min-h-0">
						<CardHeader className="flex-shrink-0 p-3">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
										<ClipboardCheck className="h-3 w-3 text-primary" />
									</div>
									<div>
										<h2 className="text-sm font-semibold">Exam Registrations</h2>
										<p className="text-[11px] text-muted-foreground">Manage exam course registrations</p>
									</div>
								</div>
								<div className="hidden" />
							</div>

							<div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
								<div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
									<Select value={statusFilter} onValueChange={setStatusFilter}>
										<SelectTrigger className="w-[140px] h-8">
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

									<div className="relative w-full sm:w-[220px]">
										<Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
										<Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-xs" />
									</div>
								</div>

								<div className="flex gap-1 flex-wrap">
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={fetchExamRegistrations} disabled={loading}>
										<RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleTemplateExport}>
										<FileSpreadsheet className="h-3 w-3 mr-1" />
										Template
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleDownload}>Json</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleExport}>Download</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleImport}>Upload</Button>
									<Button size="sm" className="text-xs px-2 h-8" onClick={openAdd} disabled={loading}>
										<PlusCircle className="h-3 w-3 mr-1" />
										Add
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">

							<div className="rounded-md border overflow-hidden" style={{ height: "440px" }}>
								<div className="h-full overflow-auto">
									<Table>
										<TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
											<TableRow>
												<TableHead className="w-[120px] text-[11px]">
													<Button variant="ghost" size="sm" onClick={() => handleSort("student")} className="h-auto p-0 font-medium hover:bg-transparent">
														Student
														<span className="ml-1">{getSortIcon("student")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[120px] text-[11px]">
													<Button variant="ghost" size="sm" onClick={() => handleSort("examination_session")} className="h-auto p-0 font-medium hover:bg-transparent">
														Session
														<span className="ml-1">{getSortIcon("examination_session")}</span>
													</Button>
												</TableHead>
												<TableHead className="text-[11px]">Course</TableHead>
												<TableHead className="w-[100px] text-[11px]">
													<Button variant="ghost" size="sm" onClick={() => handleSort("registration_status")} className="h-auto p-0 font-medium hover:bg-transparent">
														Status
														<span className="ml-1">{getSortIcon("registration_status")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[80px] text-[11px]">Type</TableHead>
												<TableHead className="w-[80px] text-[11px]">Attempt</TableHead>
												<TableHead className="w-[80px] text-[11px]">Fee Paid</TableHead>
												<TableHead className="w-[120px] text-[11px] text-center">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{loading ? (
												<TableRow>
													<TableCell colSpan={8} className="h-24 text-center text-[11px]">Loading…</TableCell>
												</TableRow>
											) : pageItems.length ? (
												<>
													{pageItems.map((row) => (
														<TableRow key={row.id}>
															<TableCell className="text-[11px] font-medium">
																{row.student?.roll_number || '-'}
																<br />
																<span className="text-muted-foreground text-[10px]">
																	{row.student ? `${row.student.first_name} ${row.student.last_name}` : ''}
																</span>
															</TableCell>
															<TableCell className="text-[11px]">
																{row.examination_session?.session_code || '-'}
																<br />
																<span className="text-muted-foreground text-[10px]">
																	{row.examination_session?.session_name || ''}
																</span>
															</TableCell>
															<TableCell className="text-[11px]">
																{row.course_offering?.course_code || '-'}
																<br />
																<span className="text-muted-foreground text-[10px]">
																	{row.course_offering?.course_name || ''}
																</span>
															</TableCell>
															<TableCell>
																<Badge
																	variant={
																		row.registration_status === 'Approved' ? "default" :
																			row.registration_status === 'Pending' ? "secondary" :
																				"destructive"
																	}
																	className={`text-[11px] ${row.registration_status === 'Approved'
																		? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
																		: row.registration_status === 'Pending'
																			? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200'
																			: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
																		}`}
																>
																	{row.registration_status}
																</Badge>
															</TableCell>
															<TableCell className="text-[11px]">
																{row.is_regular ? 'Regular' : 'Arrear'}
															</TableCell>
															<TableCell className="text-[11px]">
																{row.attempt_number}
															</TableCell>
															<TableCell className="text-[11px]">
																<Badge
																	variant={row.fee_paid ? "default" : "secondary"}
																	className={`text-[11px] ${row.fee_paid
																		? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
																		: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-200'
																		}`}
																>
																	{row.fee_paid ? 'Yes' : 'No'}
																</Badge>
															</TableCell>
															<TableCell>
																<div className="flex items-center justify-center gap-1">
																	<Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(row)}>
																		<Edit className="h-3 w-3" />
																	</Button>
																	<AlertDialog>
																		<AlertDialogTrigger asChild>
																			<Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
																				<Trash2 className="h-3 w-3" />
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
													<TableCell colSpan={8} className="h-24 text-center text-[11px]">No data</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</div>
							</div>

							<div className="flex items-center justify-between space-x-2 py-2 mt-2">
								<div className="text-xs text-muted-foreground">
									Showing {filtered.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length}
								</div>
								<div className="flex items-center gap-2">
									<Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 px-2 text-xs">
										<ChevronLeft className="h-3 w-3 mr-1" /> Previous
									</Button>
									<div className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</div>
									<Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-7 px-2 text-xs">
										Next <ChevronRight className="h-3 w-3 ml-1" />
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
				<AppFooter />
			</SidebarInset>

			<Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) resetForm(); setSheetOpen(o) }}>
				<SheetContent className="sm:max-w-[800px] overflow-y-auto">
					<SheetHeader className="pb-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
									<ClipboardCheck className="h-5 w-5 text-white" />
								</div>
								<div>
									<SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
										{editing ? "Edit Exam Registration" : "Add Exam Registration"}
									</SheetTitle>
									<p className="text-sm text-muted-foreground mt-1">
										{editing ? "Update exam registration information" : "Create a new exam registration record"}
									</p>
								</div>
							</div>
						</div>
					</SheetHeader>

					<div className="mt-6 space-y-6">
						{/* Basic Information Section */}
						<div className="space-y-4">
							<div className="flex items-center gap-3 pb-3 border-b border-blue-200 dark:border-blue-800">
								<div className="h-8 w-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
									<ClipboardCheck className="h-4 w-4 text-white" />
								</div>
								<h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Basic Information</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Institution dropdown */}
								<div className="space-y-2">
									<Label htmlFor="institutions_id" className="text-sm font-semibold">
										Institution <span className="text-red-500">*</span>
									</Label>
									<Select
										value={formData.institutions_id}
										onValueChange={(id) => {
											setFormData(prev => ({ ...prev, institutions_id: id }))
										}}
									>
										<SelectTrigger className={`h-10 ${errors.institutions_id ? 'border-destructive' : ''}`}>
											<SelectValue placeholder="Select Institution" />
										</SelectTrigger>
										<SelectContent>
											{institutions.map(inst => (
												<SelectItem key={inst.id} value={inst.id}>
													{inst.institution_code}{inst.institution_name ? ` - ${inst.institution_name}` : ''}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.institutions_id && <p className="text-xs text-destructive">{errors.institutions_id}</p>}
								</div>

								{/* Student dropdown */}
								<div className="space-y-2">
									<Label htmlFor="student_id" className="text-sm font-semibold">
										Student <span className="text-red-500">*</span>
									</Label>
									<Select
										value={formData.student_id}
										onValueChange={(id) => {
											setFormData(prev => ({ ...prev, student_id: id }))
										}}
										disabled={!formData.institutions_id}
									>
										<SelectTrigger className={`h-10 ${errors.student_id ? 'border-destructive' : ''} ${!formData.institutions_id ? 'bg-muted cursor-not-allowed' : ''}`}>
											<SelectValue placeholder={!formData.institutions_id ? "Select Institution First" : filteredStudents.length === 0 ? "No Students Available" : "Select Student"} />
										</SelectTrigger>
										<SelectContent>
											{filteredStudents.map(student => (
												<SelectItem key={student.id} value={student.id}>
													{student.roll_number}{student.first_name ? ` - ${student.first_name} ${student.last_name}` : ''}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.student_id && <p className="text-xs text-destructive">{errors.student_id}</p>}
									{!formData.institutions_id && <p className="text-xs text-muted-foreground">Please select an institution first</p>}
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
							<div className="flex items-center gap-3 pb-3 border-b border-purple-200 dark:border-purple-800">
								<div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
									<ClipboardCheck className="h-4 w-4 text-white" />
								</div>
								<h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Fee Information</h3>
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
						<div className="flex justify-end gap-3 pt-6 border-t">
							<Button
								variant="outline"
								size="sm"
								className="h-10 px-6"
								onClick={() => { setSheetOpen(false); resetForm() }}
							>
								Cancel
							</Button>
							<Button
								size="sm"
								className="h-10 px-6"
								onClick={save}
								disabled={loading}
							>
								{editing ? "Update Registration" : "Create Registration"}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

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

						{/* Error Summary */}
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

						{/* Detailed Error List */}
						<div className="space-y-3">
							{importErrors.map((error, index) => (
								<div key={index} className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/5">
									<div className="flex items-start justify-between mb-2">
										<div className="flex items-center gap-2">
											<Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-700">
												Row {error.row}
											</Badge>
											<span className="font-medium text-sm">
												{error.student_id} - {error.course_offering_id}
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

						{/* Helpful Tips */}
						<div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
							<div className="flex items-start gap-2">
								<div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mt-0.5">
									<span className="text-xs font-bold text-blue-600 dark:text-blue-400">i</span>
								</div>
								<div>
									<h4 className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-1">Common Fixes:</h4>
									<ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
										<li>• Ensure all required fields (Institution, Student, Session, Course, Status) are provided</li>
										<li>• Institution code, Student roll number, Session code, and Course code must exist in the system</li>
										<li>• <strong>Important:</strong> Student, Examination Session, and Course Offering must belong to the same Institution</li>
										<li>• Attempt Number must be between 1 and 10</li>
										<li>• Fee Amount cannot be negative</li>
										<li>• Registration Status: Pending, Approved, Rejected, or Cancelled</li>
										<li>• Is Regular and Fee Paid: true/false</li>
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
