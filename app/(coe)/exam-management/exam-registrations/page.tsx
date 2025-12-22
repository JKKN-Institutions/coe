"use client"

import { useState, useEffect, useMemo } from "react"
import XLSX from "@/lib/utils/excel-compat"
import supabaseAuthService from "@/services/auth/supabase-auth-service"
import type { ExamRegistration, ExamRegistrationImportError, UploadSummary } from "@/types/exam-registrations"
import { useExamRegistrations } from "@/hooks/exam-management/use-exam-registrations"
import { validateExamRegistrationData, validateExamRegistrationImport } from "@/lib/utils/exam-registrations/validation"
import { exportToJSON, exportToExcel, exportTemplate } from "@/lib/utils/exam-registrations/export-import"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { PremiumNavbar } from "@/components/layout/premium-navbar"
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
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ClipboardCheck, TrendingUp, FileSpreadsheet, RefreshCw, CheckCircle, XCircle, AlertTriangle, Home, Shield, Users, BookOpen, Calendar, FileText, Award, GraduationCap, School, LayoutGrid, Layers, Building2 } from "lucide-react"


export default function ExamRegistrationsPage() {
	const { toast } = useToast()

	// Use custom hook for exam registrations data management
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
		// Dropdown control
		selectedInstitutionId,
		setSelectedInstitutionId,
	} = useExamRegistrations()

	// Local UI state
	const [items, setItems] = useState<ExamRegistration[]>([])
	const [searchTerm, setSearchTerm] = useState("")
	const [sortColumn, setSortColumn] = useState<string | null>(null)
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

	const [sheetOpen, setSheetOpen] = useState(false)
	const [editing, setEditing] = useState<ExamRegistration | null>(null)
	const [statusFilter, setStatusFilter] = useState("all")
	const [errorPopupOpen, setErrorPopupOpen] = useState(false)
	const [importErrors, setImportErrors] = useState<ExamRegistrationImportError[]>([])
	const [uploadSummary, setUploadSummary] = useState<UploadSummary>({ total: 0, success: 0, failed: 0 })

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
		setFormData({
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

	// Use imported template export function
	const handleTemplateExport = () => {
		exportTemplate()
		toast({
			title: '✅ Template Downloaded',
			description: 'Exam registration upload template has been downloaded successfully.',
			className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
		})
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
				const preValidationErrors: Array<{
					row: number
					student_register_no: string
					course_code: string
					errors: string[]
				}> = []

				// Map rows to exam registrations with pre-validation
				const mapped = []
				for (let i = 0; i < rows.length; i++) {
					const r = rows[i]
					const rowNumber = i + 2

					// Step 1: Validate Institution Code
					const institutionCode = String(r['Institution Code'] || '').trim()
					if (!institutionCode) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: String(r['Student Register Number'] || 'N/A'),
							course_code: String(r['Course Code'] || 'N/A'),
							errors: ['Institution Code is required']
						})
						continue
					}

					const institution = institutions.find(inst => inst.institution_code === institutionCode)
					if (!institution) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: String(r['Student Register Number'] || 'N/A'),
							course_code: String(r['Course Code'] || 'N/A'),
							errors: [`Institution Code "${institutionCode}" not found. Please ensure the institution exists in the system.`]
						})
						continue
					}

					// Step 2: Validate Student Register Number
					const studentRegisterNo = String(r['Student Register Number'] || '').trim()
					if (!studentRegisterNo) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: 'N/A',
							course_code: String(r['Course Code'] || 'N/A'),
							errors: ['Student Register Number is required']
						})
						continue
					}

					// Step 3: Validate Examination Session Code
					const sessionCode = String(r['Examination Session Code'] || '').trim()
					if (!sessionCode) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: studentRegisterNo,
							course_code: String(r['Course Code'] || 'N/A'),
							errors: ['Examination Session Code is required']
						})
						continue
					}

					const session = allExaminationSessions.find(s => s.session_code === sessionCode)
					if (!session) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: studentRegisterNo,
							course_code: String(r['Course Code'] || 'N/A'),
							errors: [`Examination Session Code "${sessionCode}" not found. Please ensure the session exists in the system.`]
						})
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
						continue
					}

					// Step 6: Find student by register_number in students table
					// Must match both register_number AND belong to the same institution
					const matchingStudent = allStudents.find(s =>
						s.register_number === studentRegisterNo && s.institution_id === institution.id
					)

					if (!matchingStudent) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: studentRegisterNo,
							course_code: courseCode,
							errors: [`Student with Register Number "${studentRegisterNo}" not found in Institution "${institutionCode}". Please ensure the student exists in the students table.`]
						})
						continue
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
					const status = String(r['Registration Status'] || 'Pending')
					if (!['Pending', 'Approved', 'Rejected', 'Cancelled'].includes(status)) {
						dataErrors.push('Registration Status must be one of: Pending, Approved, Rejected, Cancelled')
					}

					// Validate boolean fields
					const isRegular = String(r['Is Regular'] || 'TRUE').toUpperCase()
					if (!['TRUE', 'FALSE'].includes(isRegular)) {
						dataErrors.push('Is Regular must be TRUE or FALSE')
					}

					const feePaid = String(r['Fee Paid'] || 'FALSE').toUpperCase()
					if (!['TRUE', 'FALSE'].includes(feePaid)) {
						dataErrors.push('Fee Paid must be TRUE or FALSE')
					}

					if (dataErrors.length > 0) {
						preValidationErrors.push({
							row: rowNumber,
							student_register_no: studentRegisterNo,
							course_code: courseCode,
							errors: dataErrors
						})
						continue
					}

					// Step 8: Create registration data with all validated IDs
					const registrationData = {
						institutions_id: institution.id,
						student_id: matchingStudent.id,
						examination_session_id: session.id,
						course_offering_id: course.id,
						stu_register_no: studentRegisterNo,
						student_name: String(r['Student Name'] || '') || null,
						registration_date: String(r['Registration Date'] || new Date().toISOString().split('T')[0]),
						registration_status: status,
						is_regular: isRegular === 'TRUE',
						attempt_number: attemptNum,
						fee_paid: feePaid === 'TRUE',
						fee_amount: r['Fee Amount'] ? Number(r['Fee Amount']) : null,
						payment_date: String(r['Payment Date'] || '') || null,
						payment_transaction_id: String(r['Payment Transaction ID'] || '') || null,
						remarks: String(r['Remarks'] || '') || null,
						// Store original codes for error display
						_displayCodes: {
							studentRegisterNo: studentRegisterNo,
							courseCode: courseCode
						}
					}

					mapped.push(registrationData)
				}

				// If there are pre-validation errors, show them in popup
				if (preValidationErrors.length > 0) {
					setImportErrors(preValidationErrors)
					setUploadSummary({
						total: rows.length,
						success: 0,
						failed: preValidationErrors.length
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
					student_register_no: string
					course_code: string
					errors: string[]
				}> = []

				for (let i = 0; i < mapped.length; i++) {
					const registration = mapped[i]
					const rowNumber = i + 2
					const displayCodes = (registration as any)._displayCodes

					// Remove display codes before sending to API
					const { _displayCodes, ...registrationPayload } = registration as any

					try {
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
							const errorData = await response.json()
							errorCount++
							uploadErrors.push({
								row: rowNumber,
								student_register_no: displayCodes?.studentRegisterNo || 'N/A',
								course_code: displayCodes?.courseCode || 'N/A',
								errors: [errorData.error || 'Failed to create exam registration']
							})
						}
					} catch (error) {
						errorCount++
						uploadErrors.push({
							row: rowNumber,
							student_register_no: displayCodes?.studentRegisterNo || 'N/A',
							course_code: displayCodes?.courseCode || 'N/A',
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
						description: `Successfully uploaded all ${successCount} row${successCount > 1 ? 's' : ''} (${successCount} exam registration${successCount > 1 ? 's' : ''}) to the database.`,
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
			<SidebarInset>
				<PremiumNavbar
					title="Exam Registrations"
					description="Manage student exam course registrations"
					showSearch={true}
				/>
				<PageTransition>
					<div className="flex flex-1 flex-col gap-6 p-6 md:p-10">
						{/* Premium Stats Cards */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="card-premium-hover p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-slate-600 dark:text-slate-400">Total Registrations</p>
										<p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-grotesk">{items.length}</p>
									</div>
									<div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
										<ClipboardCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
							</div>

							<div className="card-premium-hover p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-slate-600 dark:text-slate-400">Approved</p>
										<p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-grotesk">{items.filter(i => i.registration_status === 'Approved').length}</p>
									</div>
									<div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
										<CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
									</div>
								</div>
							</div>

							<div className="card-premium-hover p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-slate-600 dark:text-slate-400">Pending</p>
										<p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1 font-grotesk">{items.filter(i => i.registration_status === 'Pending').length}</p>
									</div>
									<div className="h-12 w-12 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
										<AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
									</div>
								</div>
							</div>

							<div className="card-premium-hover p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-slate-600 dark:text-slate-400">Fee Paid</p>
										<p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1 font-grotesk">{items.filter(i => i.fee_paid).length}</p>
									</div>
									<div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
										<TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
									</div>
								</div>
							</div>
						</div>

					<div className="card-premium overflow-hidden">
						{/* Table Header */}
						<div className="p-6 border-b border-slate-200 dark:border-slate-800">
							<div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
										<ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
									</div>
									<div>
										<h2 className="text-lg font-semibold font-grotesk text-slate-900 dark:text-slate-100">All Exam Registrations</h2>
										<p className="text-sm text-slate-600 dark:text-slate-400">Manage student exam course registrations</p>
									</div>
								</div>

								<div className="flex flex-wrap gap-2">
									<Select value={statusFilter} onValueChange={setStatusFilter}>
										<SelectTrigger className="w-[140px]">
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

									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
										<Input
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											placeholder="Search registrations..."
											className="pl-10 w-[240px] search-premium"
										/>
									</div>

									<Button variant="outline" onClick={fetchExamRegistrations} disabled={loading} className="btn-premium-secondary">
										<RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
									<Button variant="outline" onClick={handleTemplateExport} className="btn-premium-secondary">
										<FileSpreadsheet className="h-4 w-4 mr-2" />
										Template
									</Button>
									<Button variant="outline" onClick={handleDownload} className="btn-premium-secondary">
										Json
									</Button>
									<Button variant="outline" onClick={handleExport} className="btn-premium-secondary">
										Download
									</Button>
									<Button variant="outline" onClick={handleImport} className="btn-premium-secondary">
										Upload
									</Button>
									<Button onClick={openAdd} disabled={loading} className="btn-premium-primary">
										<PlusCircle className="h-4 w-4 mr-2" />
										Add Registration
									</Button>
								</div>
							</div>
						</div>

						{/* Table Content */}
						<div className="p-6">
							<div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
								<div className="overflow-auto" style={{ maxHeight: "500px" }}>
									<table className="table-premium">
										<thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
											<tr>
												<th className="text-left font-semibold text-sm">
													<Button variant="ghost" size="sm" onClick={() => handleSort("student")} className="hover:bg-slate-100 dark:hover:bg-slate-800">
														Student
														<span className="ml-1">{getSortIcon("student")}</span>
													</Button>
												</th>
												<th className="text-left font-semibold text-sm">
													<Button variant="ghost" size="sm" onClick={() => handleSort("examination_session")} className="hover:bg-slate-100 dark:hover:bg-slate-800">
														Session
														<span className="ml-1">{getSortIcon("examination_session")}</span>
													</Button>
												</th>
												<th className="text-left font-semibold text-sm">Course</th>
												<th className="text-left font-semibold text-sm">
													<Button variant="ghost" size="sm" onClick={() => handleSort("registration_status")} className="hover:bg-slate-100 dark:hover:bg-slate-800">
														Status
														<span className="ml-1">{getSortIcon("registration_status")}</span>
													</Button>
												</th>
												<th className="text-left font-semibold text-sm">Type</th>
												<th className="text-left font-semibold text-sm">Attempt</th>
												<th className="text-left font-semibold text-sm">Fee Paid</th>
												<th className="text-center font-semibold text-sm">Actions</th>
											</tr>
										</thead>
										<tbody>
											{loading ? (
												<tr>
													<td colSpan={8} className="h-24 text-center text-sm text-slate-500">Loading…</td>
												</tr>
											) : pageItems.length ? (
												<>
													{pageItems.map((row) => (
														<tr key={row.id}>
															<td className="font-medium text-sm">
																{row.student?.register_number || '-'}
																<br />
																<span className="text-slate-500 dark:text-slate-400 text-xs">
																	{row.student ? `${row.student.first_name} ` : ''}
																</span>
															</td>
															<td className="text-sm">
																{row.examination_session?.session_code || '-'}
															</td>
															<td className="text-sm">
																{row.course_offering?.course_code || '-'}
																<br />
																<span className="text-slate-500 dark:text-slate-400 text-xs">
																	{row.course_offering?.course_name || ''}
																</span>
															</td>
															<td>
																<span className={
																	row.registration_status === 'Approved' ? 'pill-success' :
																	row.registration_status === 'Pending' ? 'pill-warning' :
																	row.registration_status === 'Rejected' ? 'pill-error' :
																	'pill-neutral'
																}>
																	{row.registration_status}
																</span>
															</td>
															<td className="text-sm">
																{row.is_regular ? 'Regular' : 'Arrear'}
															</td>
															<td className="text-sm">
																{row.attempt_number}
															</td>
															<td>
																<span className={row.fee_paid ? 'pill-success' : 'pill-neutral'}>
																	{row.fee_paid ? 'Yes' : 'No'}
																</span>
															</td>
															<td className="text-center">
																<div className="flex items-center justify-center gap-2">
																	<Button variant="outline" size="sm" className="btn-premium-icon" onClick={() => openEdit(row)}>
																		<Edit className="h-4 w-4" />
																	</Button>
																	<AlertDialog>
																		<AlertDialogTrigger asChild>
																			<Button variant="outline" size="sm" className="btn-premium-destructive">
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
															</td>
														</tr>
													))}
												</>
											) : (
												<tr>
													<td colSpan={8} className="h-24 text-center text-sm text-slate-500">No data</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>

							{/* Pagination */}
							<div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
								<div className="text-sm text-slate-600 dark:text-slate-400">
									Showing {filtered.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} registrations
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
										disabled={currentPage === 1}
										className="btn-premium-secondary"
									>
										<ChevronLeft className="h-4 w-4 mr-1" /> Previous
									</Button>
									<div className="text-sm text-slate-600 dark:text-slate-400 px-3">
										Page {currentPage} of {totalPages}
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
										disabled={currentPage >= totalPages}
										className="btn-premium-secondary"
									>
										Next <ChevronRight className="h-4 w-4 ml-1" />
									</Button>
								</div>
							</div>
						</div>
					</div>
					</div>
				</PageTransition>
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
													{inst.institution_code}{inst.name ? ` - ${inst.name}` : ''}
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

								{/* Student Register Number */}
								<div className="space-y-2">
									<Label htmlFor="stu_register_no" className="text-sm font-semibold">
										Student Register Number
									</Label>
									<Input
										id="stu_register_no"
										type="text"
										placeholder="e.g., REG2023001"
										value={formData.stu_register_no}
										onChange={(e) => setFormData({ ...formData, stu_register_no: e.target.value })}
										className="h-10"
									/>
									<p className="text-xs text-muted-foreground">Optional: Enter student's register number</p>
								</div>

								{/* Student Name */}
								<div className="space-y-2">
									<Label htmlFor="student_name" className="text-sm font-semibold">
										Student Name (Override)
									</Label>
									<Input
										id="student_name"
										type="text"
										placeholder="e.g., John Doe"
										value={formData.student_name}
										onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
										className="h-10"
									/>
									<p className="text-xs text-muted-foreground">Optional: Override student name if needed</p>
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
							<div className={`h-10 w-10 rounded-full flex items-center justify-center ${
								importErrors.length === 0
									? 'bg-green-100 dark:bg-green-900/20'
									: 'bg-red-100 dark:bg-red-900/20'
							}`}>
								{importErrors.length === 0 ? (
									<CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
								) : (
									<XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
								)}
							</div>
							<div>
								<AlertDialogTitle className={`text-xl font-bold ${
									importErrors.length === 0
										? 'text-green-600 dark:text-green-400'
										: 'text-red-600 dark:text-red-400'
								}`}>
									{importErrors.length === 0 ? 'Upload Successful' : 'Data Validation Errors'}
								</AlertDialogTitle>
								<AlertDialogDescription className="text-sm text-muted-foreground mt-1">
									{importErrors.length === 0
										? 'All exam registrations have been successfully uploaded to the database'
										: 'Please fix the following errors before importing the data'}
								</AlertDialogDescription>
							</div>
						</div>
					</AlertDialogHeader>

					<div className="space-y-4">
						{/* Upload Summary Cards */}
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

						{/* Error Summary - Only show if there are errors */}
						{importErrors.length > 0 && (
							<>
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
														{error.student_register_no} - {error.course_code}
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
							</>
						)}

						{/* Success Message - Only show if no errors */}
						{importErrors.length === 0 && uploadSummary.total > 0 && (
							<div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
								<div className="flex items-center gap-2">
									<CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
									<span className="font-semibold text-green-800 dark:text-green-200">
										All {uploadSummary.success} exam registration{uploadSummary.success > 1 ? 's' : ''} uploaded successfully
									</span>
								</div>
							</div>
						)}

						{/* Helpful Tips */}
						<div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
							<div className="flex items-start gap-2">
								<div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mt-0.5">
									<span className="text-xs font-bold text-blue-600 dark:text-blue-400">i</span>
								</div>
								<div>
									<h4 className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-1">Required Excel Format & Tips:</h4>
									<ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
										<li>• <strong>Institution Code</strong> (required): Must match existing institution (e.g., JKKNCAS)</li>
										<li>• <strong>Student Register Number</strong> (required): e.g., 24JUGEN6001</li>
										<li>• <strong>Student Name</strong> (required): Full name of the student</li>
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
									<div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
										<p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Common Fixes:</p>
										<ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 mt-1">
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
					</div>

					<AlertDialogFooter>
						<AlertDialogAction onClick={() => setErrorPopupOpen(false)}>
							Close
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</SidebarProvider>
	)
}
