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
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, BookOpen, TrendingUp, FileSpreadsheet, RefreshCw, CheckCircle, XCircle, AlertTriangle, Users } from "lucide-react"

// CourseOffering type definition
interface CourseOffering {
	id: string
	institutions_id: string
	course_id: string
	examination_session_id: string
	program_id: string
	semester: number
	section: string | null
	faculty_id: string | null
	max_enrollment: number | null
	enrolled_count: number
	is_active: boolean
	created_at: string
}

// Foreign key dropdown types
interface Institution {
	id: string
	institution_code: string
	institution_name: string
}

interface Course {
	id: string
	course_code: string
	course_title: string
}

interface ExaminationSession {
	id: string
	session_code: string
	session_name: string
}

interface Program {
	id: string
	program_code: string
	program_name: string
}

export default function CourseOfferingPage() {
	const { toast } = useToast()
	const [items, setItems] = useState<CourseOffering[]>([])
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState("")
	const [sortColumn, setSortColumn] = useState<string | null>(null)
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

	const [sheetOpen, setSheetOpen] = useState(false)
	const [editing, setEditing] = useState<CourseOffering | null>(null)
	const [statusFilter, setStatusFilter] = useState("all")
	const [errorPopupOpen, setErrorPopupOpen] = useState(false)
	const [importErrors, setImportErrors] = useState<Array<{
		row: number
		semester: string
		section: string
		errors: string[]
	}>>([])
	const [uploadSummary, setUploadSummary] = useState<{
		total: number
		success: number
		failed: number
	}>({ total: 0, success: 0, failed: 0 })

	// Foreign key dropdowns
	const [institutions, setInstitutions] = useState<Institution[]>([])
	const [courses, setCourses] = useState<Course[]>([])
	const [examinationSessions, setExaminationSessions] = useState<ExaminationSession[]>([])
	const [programs, setPrograms] = useState<Program[]>([])

	// Filtered dropdowns based on institution
	const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([])
	const [filteredExaminationSessions, setFilteredExaminationSessions] = useState<ExaminationSession[]>([])
	const [filteredCourses, setFilteredCourses] = useState<Course[]>([])

	const [formData, setFormData] = useState({
		institutions_id: "",
		course_id: "",
		examination_session_id: "",
		program_id: "",
		semester: "",
		section: "",
		faculty_id: "",
		max_enrollment: "",
		enrolled_count: "",
		is_active: true,
	})
	const [errors, setErrors] = useState<Record<string, string>>({})

	// Fetch data from API
	const fetchCourseOfferings = async () => {
		try {
			setLoading(true)
			const response = await fetch('/api/course-offering')
			if (!response.ok) {
				throw new Error('Failed to fetch course offers')
			}
			const data = await response.json()
			setItems(data)
		} catch (error) {
			console.error('Error fetching course offers:', error)
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

	const fetchCourses = async () => {
		try {
			const res = await fetch('/api/course-mapping')
			if (res.ok) {
				const data = await res.json()
				const mapped = Array.isArray(data)
					? data.filter((c: any) => c?.course_code).map((c: any) => ({
						id: c.id,
						course_code: c.course_code,
						course_title: c.course_title,
						institutions_id: c.institutions_id
					}))
					: []
				setCourses(mapped)
			}
		} catch (e) {
			console.error('Failed to load courses:', e)
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
				setExaminationSessions(mapped)
			}
		} catch (e) {
			console.error('Failed to load examination sessions:', e)
		}
	}

	const fetchPrograms = async () => {
		try {
			const res = await fetch('/api/program')
			if (res.ok) {
				const data = await res.json()
				const mapped = Array.isArray(data)
					? data.filter((p: any) => p?.program_code).map((p: any) => ({
						id: p.id,
						program_code: p.program_code,
						program_name: p.program_name,
						institutions_id: p.institutions_id
					}))
					: []
				setPrograms(mapped)
			}
		} catch (e) {
			console.error('Failed to load programs:', e)
		}
	}

	// Filter dropdowns when institution changes
	useEffect(() => {
		if (formData.institutions_id) {
			// Filter programs by institution
			const instPrograms = programs.filter(p => (p as any).institutions_id === formData.institutions_id)
			setFilteredPrograms(instPrograms)

			// Filter examination sessions by institution
			const instSessions = examinationSessions.filter(s => (s as any).institutions_id === formData.institutions_id)
			setFilteredExaminationSessions(instSessions)

			// Filter courses by institution
			const instCourses = courses.filter(c => (c as any).institutions_id === formData.institutions_id)
			setFilteredCourses(instCourses)

			// Reset dependent fields if they're no longer valid
			if (formData.program_id && !instPrograms.find(p => p.id === formData.program_id)) {
				setFormData(prev => ({ ...prev, program_id: "" }))
			}
			if (formData.examination_session_id && !instSessions.find(s => s.id === formData.examination_session_id)) {
				setFormData(prev => ({ ...prev, examination_session_id: "" }))
			}
			if (formData.course_id && !instCourses.find(c => c.id === formData.course_id)) {
				setFormData(prev => ({ ...prev, course_id: "" }))
			}
		} else {
			// Reset filters if no institution selected
			setFilteredPrograms([])
			setFilteredExaminationSessions([])
			setFilteredCourses([])
		}
	}, [formData.institutions_id, programs, examinationSessions, courses, formData.program_id, formData.examination_session_id, formData.course_id])

	// Load data on component mount
	useEffect(() => {
		fetchCourseOfferings()
		fetchInstitutions()
		fetchCourses()
		fetchExaminationSessions()
		fetchPrograms()
	}, [])

	const resetForm = () => {
		setFormData({
			institutions_id: "",
			course_id: "",
			examination_session_id: "",
			program_id: "",
			semester: "",
			section: "",
			faculty_id: "",
			max_enrollment: "",
			enrolled_count: "",
			is_active: true,
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
				const course = courses.find(c => c.id === i.course_id)
				const session = examinationSessions.find(s => s.id === i.examination_session_id)
				const program = programs.find(p => p.id === i.program_id)
				return [
					course?.course_code,
					course?.course_title,
					session?.session_code,
					session?.session_name,
					program?.program_code,
					program?.program_name,
					i.semester?.toString(),
					i.section
				].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
			})
			.filter((i) => statusFilter === "all" || (statusFilter === "active" ? i.is_active : !i.is_active))

		if (!sortColumn) return data
		const sorted = [...data].sort((a, b) => {
			const av = (a as any)[sortColumn]
			const bv = (b as any)[sortColumn]
			if (av === bv) return 0
			if (sortDirection === "asc") return av > bv ? 1 : -1
			return av < bv ? 1 : -1
		})
		return sorted
	}, [items, searchTerm, sortColumn, sortDirection, statusFilter, courses, examinationSessions, programs])

	const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const pageItems = filtered.slice(startIndex, endIndex)

	useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection, statusFilter])

	const openAdd = () => {
		resetForm()
		setSheetOpen(true)
	}

	const openEdit = (row: CourseOffering) => {
		setEditing(row)
		setFormData({
			institutions_id: row.institutions_id,
			course_id: row.course_id,
			examination_session_id: row.examination_session_id,
			program_id: row.program_id,
			semester: row.semester.toString(),
			section: row.section || "",
			faculty_id: row.faculty_id || "",
			max_enrollment: row.max_enrollment?.toString() || "",
			enrolled_count: row.enrolled_count.toString(),
			is_active: row.is_active,
		})
		setSheetOpen(true)
	}

	const validate = () => {
		const e: Record<string, string> = {}
		if (!formData.institutions_id.trim()) e.institutions_id = "Institution is required"
		if (!formData.course_id.trim()) e.course_id = "Course is required"
		if (!formData.examination_session_id.trim()) e.examination_session_id = "Examination session is required"
		if (!formData.program_id.trim()) e.program_id = "Program is required"
		if (!formData.semester.trim()) e.semester = "Semester is required"

		// Semester range validation
		const semester = parseInt(formData.semester)
		if (formData.semester && (isNaN(semester) || semester < 1 || semester > 12)) {
			e.semester = "Semester must be between 1 and 12"
		}

		// Enrollment validation
		const maxEnrollment = formData.max_enrollment ? parseInt(formData.max_enrollment) : null
		const enrolledCount = formData.enrolled_count ? parseInt(formData.enrolled_count) : 0

		if (maxEnrollment !== null && maxEnrollment <= 0) {
			e.max_enrollment = "Max enrollment must be greater than 0"
		}

		if (enrolledCount < 0) {
			e.enrolled_count = "Enrolled count cannot be negative"
		}

		if (maxEnrollment !== null && enrolledCount > maxEnrollment) {
			e.enrolled_count = "Enrolled count cannot exceed max enrollment"
		}

		setErrors(e)
		return Object.keys(e).length === 0
	}

	const save = async () => {
		if (!validate()) {
			toast({
				title: '⚠️ Validation Error',
				description: 'Please fix all validation errors before submitting.',
				variant: 'destructive',
				className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
			})
			return
		}

		try {
			setLoading(true)

			const payload = {
				institutions_id: formData.institutions_id,
				course_id: formData.course_id,
				examination_session_id: formData.examination_session_id,
				program_id: formData.program_id,
				semester: parseInt(formData.semester),
				section: formData.section || null,
				faculty_id: formData.faculty_id || null,
				max_enrollment: formData.max_enrollment ? parseInt(formData.max_enrollment) : null,
				enrolled_count: formData.enrolled_count ? parseInt(formData.enrolled_count) : 0,
				is_active: formData.is_active,
			}

			if (editing) {
				// Update existing Course Offers
				const response = await fetch('/api/course-offering', {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ id: editing.id, ...payload }),
				})

				if (!response.ok) {
					const errorData = await response.json()
					throw new Error(errorData.error || 'Failed to update Course Offer')
				}

				const updated = await response.json()
				setItems((prev) => prev.map((p) => (p.id === editing.id ? updated : p)))

				toast({
					title: "✅ Course Offer Updated",
					description: "Course Offer has been successfully updated.",
					className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
				})
			} else {
				// Create new Course Offer
				const response = await fetch('/api/course-offering', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				})

				if (!response.ok) {
					const errorData = await response.json()
					throw new Error(errorData.error || 'Failed to create Course Offer')
				}

				const created = await response.json()
				setItems((prev) => [created, ...prev])

				toast({
					title: "✅ Course Offer Created",
					description: "Course Offer has been successfully created.",
					className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
				})
			}

			setSheetOpen(false)
			resetForm()
		} catch (error) {
			console.error('Error saving Course Offer:', error)
			const errorMessage = error instanceof Error ? error.message : 'Failed to save Course Offer. Please try again.'
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

			const response = await fetch(`/api/course-offering?id=${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || 'Failed to delete Course Offer')
			}

			setItems((prev) => prev.filter((p) => p.id !== id))

			toast({
				title: "✅ Course Offer Deleted",
				description: "Course Offer has been successfully deleted.",
				className: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200",
			})
		} catch (error) {
			console.error('Error deleting Course Offer:', error)
			const errorMessage = error instanceof Error ? error.message : 'Failed to delete Course Offer. Please try again.'
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

	const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })

	// Export/Import/Template handlers
	const handleDownload = () => {
		const exportData = filtered.map(item => {
			const institution = institutions.find(i => i.id === item.institutions_id)
			const course = courses.find(c => c.id === item.course_id)
			const session = examinationSessions.find(s => s.id === item.examination_session_id)
			const program = programs.find(p => p.id === item.program_id)

			return {
				institution_code: institution?.institution_code || '',
				course_code: course?.course_code || '',
				session_code: session?.session_code || '',
				program_code: program?.program_code || '',
				semester: item.semester,
				section: item.section || '',
				max_enrollment: item.max_enrollment || '',
				enrolled_count: item.enrolled_count,
				is_active: item.is_active,
				created_at: item.created_at
			}
		})

		const json = JSON.stringify(exportData, null, 2)
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `course_offerings_${new Date().toISOString().split('T')[0]}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	const handleExport = () => {
		const excelData = filtered.map((r) => {
			const institution = institutions.find(i => i.id === r.institutions_id)
			const course = courses.find(c => c.id === r.course_id)
			const session = examinationSessions.find(s => s.id === r.examination_session_id)
			const program = programs.find(p => p.id === r.program_id)

			return {
				'Institution': institution?.institution_name || 'N/A',
				'Course': `${course?.course_code || 'N/A'} - ${course?.course_title || 'N/A'}`,
				'Session': session?.session_name || 'N/A',
				'Program': program?.program_name || 'N/A',
				'Semester': r.semester,
				'Section': r.section || '-',
				'Max Enrollment': r.max_enrollment || '-',
				'Enrolled': r.enrolled_count,
				'Status': r.is_active ? 'Active' : 'Inactive',
				'Created': new Date(r.created_at).toISOString().split('T')[0],
			}
		})

		const ws = XLSX.utils.json_to_sheet(excelData)

		// Set column widths
		const colWidths = [
			{ wch: 20 }, // Institution
			{ wch: 40 }, // Course
			{ wch: 30 }, // Session
			{ wch: 30 }, // Program
			{ wch: 10 }, // Semester
			{ wch: 10 }, // Section
			{ wch: 15 }, // Max Enrollment
			{ wch: 10 }, // Enrolled
			{ wch: 10 }, // Status
			{ wch: 12 }  // Created
		]
		ws['!cols'] = colWidths

		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Course Offers')
		XLSX.writeFile(wb, `course_offerings_export_${new Date().toISOString().split('T')[0]}.xlsx`)
	}

	const handleTemplateExport = () => {
		// Create workbook
		const wb = XLSX.utils.book_new()

		// Sheet 1: Template with sample row
		const sample = [{
			'Institution Code': 'JKKN',
			'Course Code': 'CS101',
			'Session Code': 'SEM1-2025',
			'Program Code': 'BTECH-CSE',
			'Semester': '1',
			'Section': 'A',
			'Max Enrollment': '60',
			'Enrolled Count': '0',
			'Status': 'Active'
		}]

		const ws = XLSX.utils.json_to_sheet(sample)

		// Set column widths for template sheet
		const colWidths = [
			{ wch: 18 }, // Institution Code
			{ wch: 15 }, // Course Code
			{ wch: 20 }, // Session Code
			{ wch: 20 }, // Program Code
			{ wch: 10 }, // Semester
			{ wch: 10 }, // Section
			{ wch: 15 }, // Max Enrollment
			{ wch: 15 }, // Enrolled Count
			{ wch: 10 }  // Status
		]
		ws['!cols'] = colWidths

		XLSX.utils.book_append_sheet(wb, ws, 'Template')

		XLSX.writeFile(wb, `course_offerings_template_${new Date().toISOString().split('T')[0]}.xlsx`)
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
				} else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
					const data = new Uint8Array(await file.arrayBuffer())
					const wb = XLSX.read(data, { type: 'array' })
					const ws = wb.Sheets[wb.SheetNames[0]]
					rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
				}

				if (rows.length === 0) {
					toast({
						title: "❌ No Valid Data",
						description: "No valid data found in the file.",
						variant: "destructive",
						className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
					})
					return
				}

				// Save each Course Offer to the database
				setLoading(true)
				let successCount = 0
				let errorCount = 0
				const uploadErrors: Array<{
					row: number
					semester: string
					section: string
					errors: string[]
				}> = []

				for (let i = 0; i < rows.length; i++) {
					const row = rows[i]
					const rowNumber = i + 2 // +2 for header row in Excel

					try {
						const response = await fetch('/api/course-offering', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(row),
						})

						if (response.ok) {
							const saved = await response.json()
							setItems(prev => [saved, ...prev])
							successCount++
						} else {
							const errorData = await response.json()
							errorCount++
							uploadErrors.push({
								row: rowNumber,
								semester: row.semester || 'N/A',
								section: row.section || 'N/A',
								errors: [errorData.error || 'Failed to save Course Offer']
							})
						}
					} catch (error) {
						errorCount++
						uploadErrors.push({
							row: rowNumber,
							semester: row.semester || 'N/A',
							section: row.section || 'N/A',
							errors: [error instanceof Error ? error.message : 'Network error']
						})
					}
				}

				setLoading(false)

				const totalRows = rows.length

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
						description: `Successfully uploaded all ${successCount} row${successCount > 1 ? 's' : ''} (${successCount} Course Offer${successCount > 1 ? 's' : ''}) to the database.`,
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
									<BreadcrumbPage>Course Offers</BreadcrumbPage>
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
										<p className="text-xs font-medium text-muted-foreground">Total Offerings</p>
										<p className="text-xl font-bold">{items.length}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
										<BookOpen className="h-3 w-3 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Active Offerings</p>
										<p className="text-xl font-bold text-green-600">{items.filter(i => i.is_active).length}</p>
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
										<p className="text-xs font-medium text-muted-foreground">Total Enrolled</p>
										<p className="text-xl font-bold text-purple-600">{items.reduce((sum, i) => sum + i.enrolled_count, 0)}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
										<Users className="h-3 w-3 text-purple-600 dark:text-purple-400" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Avg Enrollment</p>
										<p className="text-xl font-bold text-blue-600">
											{items.length > 0 ? Math.round(items.reduce((sum, i) => sum + i.enrolled_count, 0) / items.length) : 0}
										</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
										<TrendingUp className="h-3 w-3 text-orange-600 dark:text-orange-400" />
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
										<BookOpen className="h-3 w-3 text-primary" />
									</div>
									<div>
										<h2 className="text-sm font-semibold">Course Offers</h2>
										<p className="text-[11px] text-muted-foreground">Manage Course Offers</p>
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
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="inactive">Inactive</SelectItem>
										</SelectContent>
									</Select>

									<div className="relative w-full sm:w-[220px]">
										<Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
										<Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-xs" />
									</div>
								</div>

								<div className="flex gap-1 flex-wrap">
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={fetchCourseOfferings} disabled={loading}>
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
													<Button variant="ghost" size="sm" onClick={() => handleSort("semester")} className="h-auto p-0 font-medium hover:bg-transparent">
														Semester
														<span className="ml-1">{getSortIcon("semester")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[100px] text-[11px]">Section</TableHead>
												<TableHead className="text-[11px]">Course</TableHead>
												<TableHead className="text-[11px]">Program</TableHead>
												<TableHead className="w-[140px] text-[11px]">Enrollment</TableHead>
												<TableHead className="w-[100px] text-[11px]">
													<Button variant="ghost" size="sm" onClick={() => handleSort("is_active")} className="h-auto p-0 font-medium hover:bg-transparent">
														Status
														<span className="ml-1">{getSortIcon("is_active")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[120px] text-[11px] text-center">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{loading ? (
												<TableRow>
													<TableCell colSpan={7} className="h-24 text-center text-[11px]">Loading…</TableCell>
												</TableRow>
											) : pageItems.length ? (
												<>
													{pageItems.map((row) => {
														const course = courses.find(c => c.id === row.course_id)
														const program = programs.find(p => p.id === row.program_id)
														return (
															<TableRow key={row.id}>
																<TableCell className="text-[11px] font-medium">{row.semester}</TableCell>
																<TableCell className="text-[11px]">{row.section || '-'}</TableCell>
																<TableCell className="text-[11px]">{course?.course_title || 'N/A'}</TableCell>
																<TableCell className="text-[11px]">{program?.program_name || 'N/A'}</TableCell>
																<TableCell className="text-[11px]">
																	{row.enrolled_count}{row.max_enrollment ? ` / ${row.max_enrollment}` : ''}
																</TableCell>
																<TableCell>
																	<Badge
																		variant={row.is_active ? "default" : "secondary"}
																		className={`text-[11px] ${row.is_active
																			? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
																			: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
																			}`}
																	>
																		{row.is_active ? "Active" : "Inactive"}
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
																					<AlertDialogTitle>Delete Course Offer</AlertDialogTitle>
																					<AlertDialogDescription>
																						Are you sure you want to delete this Course Offer? This action cannot be undone.
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
														)
													})}
												</>
											) : (
												<TableRow>
													<TableCell colSpan={7} className="h-24 text-center text-[11px]">No data</TableCell>
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
				<SheetContent className="sm:max-w-[600px] overflow-y-auto">
					<SheetHeader className="pb-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
									<BookOpen className="h-5 w-5 text-white" />
								</div>
								<div>
									<SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
										{editing ? "Edit Course Offer" : "Add Course Offer"}
									</SheetTitle>
									<p className="text-sm text-muted-foreground mt-1">
										{editing ? "Update Course Offer information" : "Create a new Course Offer"}
									</p>
								</div>
							</div>
						</div>
					</SheetHeader>

					<div className="mt-6 space-y-8">
						{/* Basic Information Section */}
						<div className="space-y-4">
							<div className="flex items-center gap-3 pb-3 border-b border-blue-200 dark:border-blue-800">
								<div className="h-8 w-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
									<BookOpen className="h-4 w-4 text-white" />
								</div>
								<h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Basic Information</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Institution */}
								<div className="space-y-2">
									<Label htmlFor="institutions_id" className="text-sm font-semibold">
										Institution <span className="text-red-500">*</span>
									</Label>
									<Select
										value={formData.institutions_id}
										onValueChange={(v) => setFormData({ ...formData, institutions_id: v })}
									>
										<SelectTrigger id="institutions_id" className={`h-10 ${errors.institutions_id ? 'border-destructive' : ''}`}>
											<SelectValue placeholder="Select institution" />
										</SelectTrigger>
										<SelectContent>
											{institutions.map((inst) => (
												<SelectItem key={inst.id} value={inst.id}>
													{inst.institution_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.institutions_id && <p className="text-xs text-destructive">{errors.institutions_id}</p>}
								</div>

								{/* Course */}
								<div className="space-y-2">
									<Label htmlFor="course_id" className="text-sm font-semibold">
										Course <span className="text-red-500">*</span>
									</Label>
									<Select
										value={formData.course_id}
										onValueChange={(v) => setFormData({ ...formData, course_id: v })}
										disabled={!formData.institutions_id}
									>
										<SelectTrigger id="course_id" className={`h-10 ${errors.course_id ? 'border-destructive' : ''}`}>
											<SelectValue placeholder={formData.institutions_id ? "Select course" : "Select institution first"} />
										</SelectTrigger>
										<SelectContent>
											{filteredCourses.map((course) => (
												<SelectItem key={course.id} value={course.id}>
													{course.course_code} - {course.course_title}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.course_id && <p className="text-xs text-destructive">{errors.course_id}</p>}
								</div>

								{/* Examination Session */}
								<div className="space-y-2 md:col-span-2">
									<Label htmlFor="examination_session_id" className="text-sm font-semibold">
										Examination Session <span className="text-red-500">*</span>
									</Label>
									<Select
										value={formData.examination_session_id}
										onValueChange={(v) => setFormData({ ...formData, examination_session_id: v })}
										disabled={!formData.institutions_id}
									>
										<SelectTrigger id="examination_session_id" className={`h-10 ${errors.examination_session_id ? 'border-destructive' : ''}`}>
											<SelectValue placeholder={formData.institutions_id ? "Select examination session" : "Select institution first"} />
										</SelectTrigger>
										<SelectContent>
											{filteredExaminationSessions.map((session) => (
												<SelectItem key={session.id} value={session.id}>
													{session.session_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.examination_session_id && <p className="text-xs text-destructive">{errors.examination_session_id}</p>}
								</div>

								{/* Program */}
								<div className="space-y-2 md:col-span-2">
									<Label htmlFor="program_id" className="text-sm font-semibold">
										Program <span className="text-red-500">*</span>
									</Label>
									<Select
										value={formData.program_id}
										onValueChange={(v) => setFormData({ ...formData, program_id: v })}
										disabled={!formData.institutions_id}
									>
										<SelectTrigger id="program_id" className={`h-10 ${errors.program_id ? 'border-destructive' : ''}`}>
											<SelectValue placeholder={formData.institutions_id ? "Select program" : "Select institution first"} />
										</SelectTrigger>
										<SelectContent>
											{filteredPrograms.map((program) => (
												<SelectItem key={program.id} value={program.id}>
													{program.program_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.program_id && <p className="text-xs text-destructive">{errors.program_id}</p>}
								</div>

								{/* Semester */}
								<div className="space-y-2 md:col-span-2">
									<Label htmlFor="semester" className="text-sm font-semibold">
										Semester <span className="text-red-500">*</span>
									</Label>
									<Input
										id="semester"
										type="number"
										min="1"
										max="12"
										value={formData.semester}
										onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
										className={`h-10 ${errors.semester ? 'border-destructive' : ''}`}
										placeholder="e.g., 1"
									/>
									{errors.semester && <p className="text-xs text-destructive">{errors.semester}</p>}
								</div>
							</div>
						</div>

						{/* Status Section */}
						<div className="space-y-4">
							<div className="flex items-center gap-3 pb-3 border-b border-teal-200 dark:border-teal-800">
								<div className="h-8 w-8 rounded-lg bg-gradient-to-r from-teal-500 to-green-600 flex items-center justify-center">
									<CheckCircle className="h-4 w-4 text-white" />
								</div>
								<h3 className="text-lg font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">Status</h3>
							</div>
							<div className="flex items-center gap-4">
								<Label className="text-sm font-semibold">Offering Status</Label>
								<button
									type="button"
									onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
									className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'
										}`}
								>
									<span
										className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'
											}`}
									/>
								</button>
								<span className={`text-sm font-medium ${formData.is_active ? 'text-green-600' : 'text-red-500'}`}>
									{formData.is_active ? 'Active' : 'Inactive'}
								</span>
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
								{editing ? "Update Offering" : "Create Offering"}
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
												Semester {error.semester} - Section {error.section}
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
										<li>• Ensure all required fields are provided (institution, course, session, program, semester)</li>
										<li>• Semester must be between 1 and 12</li>
										<li>• Max enrollment must be greater than 0 (if provided)</li>
										<li>• Enrolled count cannot be negative</li>
										<li>• Enrolled count cannot exceed max enrollment</li>
										<li>• All foreign keys must reference existing records</li>
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
