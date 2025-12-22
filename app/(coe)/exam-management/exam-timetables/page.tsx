"use client"

import React, { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/common/use-toast"
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Calendar, TrendingUp, CheckCircle, XCircle, FileSpreadsheet, Upload, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, DoorOpen, Users, MapPin } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface ExamTimetable {
	id: string
	institutions_id: string
	examination_session_id: string
	course_offering_id: string
	exam_date: string
	session: string
	exam_mode: string
	is_published: boolean
	instructions?: string
	created_at: string
	// Joined data
	institution_code?: string
	institution_name?: string
	session_code?: string
	session_name?: string
	course_code?: string
	course_name?: string
	program_code?: string
	program_name?: string
	student_count?: number
	course_count?: number
	seat_alloc_count?: number
}

interface CourseDetail {
	exam_timetable_id: string
	course_code: string
	course_name: string
	program_code: string
	program_name: string
	student_count: number
}

interface ExamRoom {
	id: string
	room_code: string
	room_name: string
	building?: string
	floor?: string
	room_order: number
	seating_capacity: number
	exam_capacity: number
	rows: number
	columns: number
}

interface RoomAllocation {
	room: ExamRoom
	column_start: string
	student_count: number
}

export default function ExamTimetablesListPage() {
	const router = useRouter()
	const { toast } = useToast()

	const [items, setItems] = useState<ExamTimetable[]>([])
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState("")
	const [sortColumn, setSortColumn] = useState<string | null>("exam_date")
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

	const [statusFilter, setStatusFilter] = useState("all")
	const [sessionFilter, setSessionFilter] = useState("all")
	const [modeFilter, setModeFilter] = useState("all")

	// Upload state
	const [uploadSummary, setUploadSummary] = useState<{
		total: number
		success: number
		failed: number
	}>({ total: 0, success: 0, failed: 0 })

	const [uploadErrors, setUploadErrors] = useState<Array<{
		row: number
		course_code: string
		exam_date: string
		errors: string[]
	}>>([])

	const [showErrorDialog, setShowErrorDialog] = useState(false)

	// Hall allocation state
	const [showHallAllocation, setShowHallAllocation] = useState(false)
	const [selectedTimetable, setSelectedTimetable] = useState<ExamTimetable | null>(null)
	const [availableRooms, setAvailableRooms] = useState<ExamRoom[]>([])
	const [roomAllocations, setRoomAllocations] = useState<RoomAllocation[]>([])
	const [allocating, setAllocating] = useState(false)

	// Expanded row state for course details
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
	const [courseDetails, setCourseDetails] = useState<Map<string, CourseDetail[]>>(new Map())

	// Fetch exam timetables
	const fetchExamTimetables = async () => {
		try {
			setLoading(true)
			const response = await fetch('/api/exam-management/exam-timetables')
			if (!response.ok) {
				throw new Error('Failed to fetch exam timetables')
			}
			const data = await response.json()

			// Transform nested data for display
			const transformed = data.map((item: any) => ({
				...item,
				institution_name: item.institutions?.institution_name || 'N/A',
				session_name: item.examination_sessions?.session_name || 'N/A',
				course_code: item.course_offerings?.courses?.course_code || 'N/A',
				course_title: item.course_offerings?.courses?.course_title || 'N/A',
				program_name: item.course_offerings?.programs?.program_name || 'N/A',
			}))

			setItems(transformed)
		} catch (error) {
			console.error('Error fetching exam timetables:', error)
			setItems([])
			toast({
				title: "❌ Error",
				description: "Failed to load exam timetables",
				variant: "destructive",
			})
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchExamTimetables()
	}, [])

	// Delete handler
	const remove = async (id: string) => {
		try {
			setLoading(true)
			const itemName = items.find(i => i.id === id)?.course_title || 'Exam Timetable'

			const response = await fetch(`/api/exam-management/exam-timetables?id=${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || 'Failed to delete exam timetable')
			}

			setItems((prev) => prev.filter((p) => p.id !== id))

			toast({
				title: "✅ Exam Timetable Deleted",
				description: `${itemName} has been successfully deleted.`,
				className: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200",
			})
		} catch (error) {
			console.error('Error deleting exam timetable:', error)
			const errorMessage = error instanceof Error ? error.message : 'Failed to delete exam timetable. Please try again.'
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

	// Filter, sort, and paginate
	const filtered = useMemo(() => {
		const q = searchTerm.toLowerCase()
		const data = items
			.filter((i) =>
				[i.course_code, i.course_title, i.session_name, i.institution_name, i.program_name]
					.filter(Boolean)
					.some((v) => String(v).toLowerCase().includes(q))
			)
			.filter((i) => statusFilter === "all" || (statusFilter === "published" ? i.is_published : !i.is_published))
			.filter((i) => sessionFilter === "all" || i.session === sessionFilter)
			.filter((i) => modeFilter === "all" || i.exam_mode?.toLowerCase() === modeFilter.toLowerCase())

		if (!sortColumn) return data
		const sorted = [...data].sort((a, b) => {
			const av = (a as any)[sortColumn]
			const bv = (b as any)[sortColumn]
			if (av === bv) return 0
			if (sortDirection === "asc") return av > bv ? 1 : -1
			return av < bv ? 1 : -1
		})
		return sorted
	}, [items, searchTerm, sortColumn, sortDirection, statusFilter, sessionFilter, modeFilter])

	const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const paginatedItems = filtered.slice(startIndex, endIndex)

	useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection])

	const handleSort = (column: string) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc")
		} else {
			setSortColumn(column)
			setSortDirection("asc")
		}
	}

	const getSortIcon = (column: string) => {
		if (sortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />
		return sortDirection === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		})
	}

	// Template Export
	const handleTemplateExport = () => {
		const wb = XLSX.utils.book_new()

		// Sheet 1: Template with sample row
		const sample = [{
			'Institution Code': 'JKKN001',
			'Examination Session Code': 'APR2025',
			'Course Offering ID': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
			'Exam Date': '2025-04-15',
			'Session (FN/AN)': 'FN',
			'Exam Mode': 'Offline',
			'Is Published': 'No',
			'Instructions': 'Calculators are allowed'
		}]

		const ws = XLSX.utils.json_to_sheet(sample)

		// Set column widths
		const colWidths = [
			{ wch: 18 }, // Institution Code
			{ wch: 25 }, // Examination Session Code
			{ wch: 40 }, // Course Offering ID
			{ wch: 15 }, // Exam Date
			{ wch: 15 }, // Session
			{ wch: 12 }, // Exam Mode
			{ wch: 12 }, // Is Published
			{ wch: 30 }  // Instructions
		]
		ws['!cols'] = colWidths

		// Style the header row - mandatory fields in red
		const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
		const mandatoryFields = ['Institution Code', 'Examination Session Code', 'Course Offering ID', 'Exam Date', 'Session (FN/AN)']

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

		// Sheet 2: Session Reference
		const sessionReference = [
			{ 'Session Code': 'FN', 'Session Name': 'Forenoon', 'Typical Time': '10:00 AM - 1:00 PM' },
			{ 'Session Code': 'AN', 'Session Name': 'Afternoon', 'Typical Time': '2:00 PM - 5:00 PM' }
		]

		const wsSession = XLSX.utils.json_to_sheet(sessionReference)
		wsSession['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 25 }]
		XLSX.utils.book_append_sheet(wb, wsSession, 'Session Reference')

		// Sheet 3: Exam Mode Reference
		const modeReference = [
			{ 'Mode': 'Offline', 'Description': 'Traditional paper-based examination' },
			{ 'Mode': 'Online', 'Description': 'Computer-based online examination' }
		]

		const wsMode = XLSX.utils.json_to_sheet(modeReference)
		wsMode['!cols'] = [{ wch: 15 }, { wch: 40 }]
		XLSX.utils.book_append_sheet(wb, wsMode, 'Mode Reference')

		// Sheet 4: Instructions
		const instructions = [
			{ 'Field': 'Institution Code', 'Format': 'Text (e.g., JKKN001)', 'Example': 'JKKN001', 'Required': 'Yes' },
			{ 'Field': 'Examination Session Code', 'Format': 'Text (e.g., APR2025)', 'Example': 'APR2025', 'Required': 'Yes' },
			{ 'Field': 'Course Offering ID', 'Format': 'UUID', 'Example': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'Required': 'Yes' },
			{ 'Field': 'Exam Date', 'Format': 'YYYY-MM-DD', 'Example': '2025-04-15', 'Required': 'Yes' },
			{ 'Field': 'Session (FN/AN)', 'Format': 'FN or AN', 'Example': 'FN', 'Required': 'Yes' },
			{ 'Field': 'Exam Mode', 'Format': 'Offline or Online', 'Example': 'Offline', 'Required': 'No (default: Offline)' },
			{ 'Field': 'Is Published', 'Format': 'Yes/No', 'Example': 'No', 'Required': 'No (default: No)' },
			{ 'Field': 'Instructions', 'Format': 'Text', 'Example': 'Calculators allowed', 'Required': 'No' }
		]

		const wsInstructions = XLSX.utils.json_to_sheet(instructions)
		wsInstructions['!cols'] = [{ wch: 28 }, { wch: 25 }, { wch: 40 }, { wch: 25 }]
		XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions')

		XLSX.writeFile(wb, `exam_timetable_template_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: "✅ Template Downloaded",
			description: "Template file with reference sheets has been downloaded successfully.",
			className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
		})
	}

	// Import/Upload from Excel
	const handleImport = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.xlsx,.xls,.csv'
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) return

			try {
				setLoading(true)
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
				} else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
					const data = new Uint8Array(await file.arrayBuffer())
					const wb = XLSX.read(data, { type: 'array' })
					const ws = wb.Sheets[wb.SheetNames[0]]
					rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
				}

				if (rows.length === 0) {
					toast({
						title: "❌ No Data Found",
						description: "The file contains no data rows.",
						variant: "destructive",
					})
					setLoading(false)
					return
				}

				// Process upload
				await processUpload(rows)
			} catch (err) {
				console.error('Import error:', err)
				toast({
					title: "❌ Import Error",
					description: "Import failed. Please check your file format and try again.",
					variant: "destructive",
				})
				setLoading(false)
			}
		}
		input.click()
	}

	// Process Upload - Validate and Save
	const processUpload = async (rows: any[]) => {
		let successCount = 0
		let errorCount = 0
		const uploadErrors: Array<{
			row: number
			course_code: string
			exam_date: string
			errors: string[]
		}> = []

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i]
			const rowNumber = i + 2 // +2 for header row in Excel
			const validationErrors: string[] = []

			// Extract fields
			const institution_code = String(row['Institution Code'] || row.institution_code || '').trim()
			const examination_session_code = String(row['Examination Session Code'] || row.examination_session_code || '').trim()
			const course_offering_id = String(row['Course Offering ID'] || row.course_offering_id || '').trim()
			const exam_date = String(row['Exam Date'] || row.exam_date || '').trim()
			const session = String(row['Session (FN/AN)'] || row['Session'] || row.session || '').trim()
			const exam_mode = String(row['Exam Mode'] || row.exam_mode || 'Offline').trim()
			const is_published = String(row['Is Published'] || row.is_published || 'No').toLowerCase() === 'yes'
			const instructions = String(row['Instructions'] || row.instructions || '').trim()

			// Validation
			if (!institution_code) validationErrors.push('Institution Code required')
			if (!examination_session_code) validationErrors.push('Examination Session Code required')
			if (!course_offering_id) validationErrors.push('Course Offering ID required')
			if (!exam_date) validationErrors.push('Exam Date required')
			if (!session) validationErrors.push('Session required')

			// Format validation
			if (session && !['FN', 'AN'].includes(session.toUpperCase())) {
				validationErrors.push('Session must be FN or AN')
			}

			if (exam_mode && !['Offline', 'Online'].includes(exam_mode)) {
				validationErrors.push('Exam Mode must be Offline or Online')
			}

			// Date format validation
			if (exam_date && !/^\d{4}-\d{2}-\d{2}$/.test(exam_date)) {
				validationErrors.push('Exam Date must be in YYYY-MM-DD format')
			}

			// UUID validation for course_offering_id
			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			if (course_offering_id && !uuidRegex.test(course_offering_id)) {
				validationErrors.push('Course Offering ID must be a valid UUID')
			}

			if (validationErrors.length > 0) {
				errorCount++
				uploadErrors.push({
					row: rowNumber,
					course_code: course_offering_id.substring(0, 8) + '...',
					exam_date: exam_date || 'N/A',
					errors: validationErrors
				})
				continue
			}

			// Fetch institution_id from institution_code
			try {
				const institutionResponse = await fetch(`/api/master/institutions?code=${institution_code}`)
				if (!institutionResponse.ok) {
					errorCount++
					uploadErrors.push({
						row: rowNumber,
						course_code: course_offering_id.substring(0, 8) + '...',
						exam_date: exam_date,
						errors: [`Institution with code "${institution_code}" not found`]
					})
					continue
				}
				const institutions = await institutionResponse.json()
				const institution = institutions.find((inst: any) => inst.institution_code === institution_code)

				if (!institution) {
					errorCount++
					uploadErrors.push({
						row: rowNumber,
						course_code: course_offering_id.substring(0, 8) + '...',
						exam_date: exam_date,
						errors: [`Institution with code "${institution_code}" not found`]
					})
					continue
				}

				// Fetch examination_session_id from examination_session_code
				const sessionResponse = await fetch(`/api/exam-management/examination-sessions`)
				if (!sessionResponse.ok) {
					errorCount++
					uploadErrors.push({
						row: rowNumber,
						course_code: course_offering_id.substring(0, 8) + '...',
						exam_date: exam_date,
						errors: [`Examination session with code "${examination_session_code}" not found`]
					})
					continue
				}
				const sessions = await sessionResponse.json()
				const examSession = sessions.find((s: any) => s.session_code === examination_session_code)

				if (!examSession) {
					errorCount++
					uploadErrors.push({
						row: rowNumber,
						course_code: course_offering_id.substring(0, 8) + '...',
						exam_date: exam_date,
						errors: [`Examination session with code "${examination_session_code}" not found`]
					})
					continue
				}

				// Create payload
				const payload = {
					institutions_id: institution.id,
					examination_session_id: examSession.id,
					course_offering_id: course_offering_id,
					exam_date: exam_date,
					session: session.toUpperCase(),
					exam_mode: exam_mode,
					is_published: is_published,
					instructions: instructions || null
				}

				// Save to API
				const response = await fetch('/api/exam-management/exam-timetables', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
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
						course_code: course_offering_id.substring(0, 8) + '...',
						exam_date: exam_date,
						errors: [errorData.error || 'Failed to save']
					})
				}
			} catch (error) {
				errorCount++
				uploadErrors.push({
					row: rowNumber,
					course_code: course_offering_id.substring(0, 8) + '...',
					exam_date: exam_date,
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

		// Show error dialog if needed
		if (uploadErrors.length > 0) {
			setUploadErrors(uploadErrors)
			setShowErrorDialog(true)
		}

		// Refresh data
		if (successCount > 0) {
			fetchExamTimetables()
		}

		// Show appropriate toast message
		if (successCount > 0 && errorCount === 0) {
			toast({
				title: "✅ Upload Complete",
				description: `Successfully uploaded all ${successCount} row${successCount > 1 ? 's' : ''} (${successCount} exam timetable${successCount > 1 ? 's' : ''}) to the database.`,
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
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<AppHeader />
				<div className="flex flex-1 flex-col gap-4 p-4">
					{/* Breadcrumb */}
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="/">Home</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>Exam Timetables</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>

					{/* Scorecards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Total Timetables</p>
										<p className="text-xl font-bold">{items.length}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
										<Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Published</p>
										<p className="text-xl font-bold text-green-600">{items.filter(i => i.is_published).length}</p>
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
										<p className="text-xs font-medium text-muted-foreground">Draft</p>
										<p className="text-xl font-bold text-red-600">{items.filter(i => !i.is_published).length}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
										<XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">This Month</p>
										<p className="text-xl font-bold text-blue-600">
											{items.filter(i => {
												const d = new Date(i.created_at)
												const n = new Date()
												return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
											}).length}
										</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
										<TrendingUp className="h-3 w-3 text-purple-600 dark:text-purple-400" />
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Main Content */}
					<Card className="flex-1 flex flex-col min-h-0">
						<CardHeader className="flex-shrink-0 p-3">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
										<Calendar className="h-3 w-3 text-primary" />
									</div>
									<div>
										<h2 className="text-sm font-semibold">Exam Timetables</h2>
										<p className="text-[11px] text-muted-foreground">Manage examination schedules and timetables</p>
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
											<SelectItem value="published">Published</SelectItem>
											<SelectItem value="draft">Draft</SelectItem>
										</SelectContent>
									</Select>

									<Select value={sessionFilter} onValueChange={setSessionFilter}>
										<SelectTrigger className="w-[140px] h-8">
											<SelectValue placeholder="All Sessions" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Sessions</SelectItem>
											<SelectItem value="FN">Forenoon (FN)</SelectItem>
											<SelectItem value="AN">Afternoon (AN)</SelectItem>
										</SelectContent>
									</Select>

									<Select value={modeFilter} onValueChange={setModeFilter}>
										<SelectTrigger className="w-[140px] h-8">
											<SelectValue placeholder="All Modes" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Modes</SelectItem>
											<SelectItem value="offline">Offline</SelectItem>
											<SelectItem value="online">Online</SelectItem>
										</SelectContent>
									</Select>

									<div className="relative w-full sm:w-[220px]">
										<Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
										<Input
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											placeholder="Search…"
											className="pl-8 h-8 text-xs"
										/>
									</div>
								</div>

								<div className="flex gap-1 flex-wrap">
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={fetchExamTimetables} disabled={loading}>
										<RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleTemplateExport}>
										<FileSpreadsheet className="h-3 w-3 mr-1" />
										Template
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleImport} disabled={loading}>
										<Upload className="h-3 w-3 mr-1" />
										Upload
									</Button>
									<Button size="sm" className="text-xs px-2 h-8" onClick={() => router.push('/exam_timetable')} disabled={loading}>
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
												<TableHead className="w-[40px] text-[11px]"></TableHead>
												<TableHead className="w-[100px] text-[11px]">
													<Button variant="ghost" size="sm" onClick={() => handleSort("exam_date")} className="h-auto p-0 font-medium hover:bg-transparent">
														Date
														<span className="ml-1">{getSortIcon("exam_date")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[60px] text-[11px]">
													<Button variant="ghost" size="sm" onClick={() => handleSort("session")} className="h-auto p-0 font-medium hover:bg-transparent">
														Session
														<span className="ml-1">{getSortIcon("session")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[90px] text-[11px]">
													<Button variant="ghost" size="sm" onClick={() => handleSort("institution_code")} className="h-auto p-0 font-medium hover:bg-transparent">
														Inst.
														<span className="ml-1">{getSortIcon("institution_code")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[110px] text-[11px]">
													<Button variant="ghost" size="sm" onClick={() => handleSort("session_code")} className="h-auto p-0 font-medium hover:bg-transparent">
														Exam Session
														<span className="ml-1">{getSortIcon("session_code")}</span>
													</Button>
												</TableHead>
												<TableHead className="text-[11px]">
													<Button variant="ghost" size="sm" onClick={() => handleSort("course_code")} className="h-auto p-0 font-medium hover:bg-transparent">
														Course
														<span className="ml-1">{getSortIcon("course_code")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[60px] text-[11px] text-center">
													<Button variant="ghost" size="sm" onClick={() => handleSort("course_count")} className="h-auto p-0 font-medium hover:bg-transparent">
														Crs
														<span className="ml-1">{getSortIcon("course_count")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[60px] text-[11px] text-center">
													<Button variant="ghost" size="sm" onClick={() => handleSort("student_count")} className="h-auto p-0 font-medium hover:bg-transparent">
														Lrnrs
														<span className="ml-1">{getSortIcon("student_count")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[60px] text-[11px] text-center">
													<Button variant="ghost" size="sm" onClick={() => handleSort("seat_alloc_count")} className="h-auto p-0 font-medium hover:bg-transparent">
														Seats
														<span className="ml-1">{getSortIcon("seat_alloc_count")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[60px] text-[11px]">
													<Button variant="ghost" size="sm" onClick={() => handleSort("exam_mode")} className="h-auto p-0 font-medium hover:bg-transparent">
														Mode
														<span className="ml-1">{getSortIcon("exam_mode")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[70px] text-[11px]">
													<Button variant="ghost" size="sm" onClick={() => handleSort("is_published")} className="h-auto p-0 font-medium hover:bg-transparent">
														Status
														<span className="ml-1">{getSortIcon("is_published")}</span>
													</Button>
												</TableHead>
												<TableHead className="w-[150px] text-[11px] text-center">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{loading ? (
												<TableRow>
													<TableCell colSpan={12} className="h-24 text-center text-[11px]">Loading…</TableCell>
												</TableRow>
											) : paginatedItems.length ? (
												<>
													{paginatedItems.map((item) => {
														const dateKey = `${item.exam_date}-${item.session}`
														const isExpanded = expandedRows.has(dateKey)
														return (
															<React.Fragment key={item.id}>
																<TableRow>
																	<TableCell className="text-[11px]">
																		<Button
																			variant="ghost"
																			size="sm"
																			className="h-6 w-6 p-0"
																			onClick={() => {
																				const newExpanded = new Set(expandedRows)
																				if (isExpanded) {
																					newExpanded.delete(dateKey)
																				} else {
																					newExpanded.add(dateKey)
																				}
																				setExpandedRows(newExpanded)
																			}}
																		>
																			{isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
																		</Button>
																	</TableCell>
																	<TableCell className="text-[11px] font-medium">
																		{formatDate(item.exam_date)}
																	</TableCell>
																	<TableCell className="text-[11px]">
																		<Badge variant="outline" className="text-[11px]">
																			{item.session}
																		</Badge>
																	</TableCell>
																	<TableCell className="text-[11px]">{item.institution_code}</TableCell>
																	<TableCell className="text-[11px]">{item.session_code}</TableCell>
																	<TableCell className="text-[11px]">
																		<div className="flex flex-col">
																			<span className="font-medium">{item.course_code}</span>
																			<span className="text-[10px] text-muted-foreground">{item.course_name}</span>
																		</div>
																	</TableCell>
																	<TableCell className="text-[11px] text-center">
																		<Badge variant="secondary" className="text-[11px]">{item.course_count || 0}</Badge>
																	</TableCell>
																	<TableCell className="text-[11px] text-center">
																		<Badge variant="secondary" className="text-[11px]">{item.student_count || 0}</Badge>
																	</TableCell>
																	<TableCell className="text-[11px] text-center">
																		<Badge variant="secondary" className="text-[11px]">{item.seat_alloc_count || 0}</Badge>
																	</TableCell>
																	<TableCell>
																		<Badge
																			variant={item.exam_mode?.toLowerCase() === 'online' ? 'default' : 'secondary'}
																			className="text-[11px]"
																		>
																			{item.exam_mode || 'Offline'}
																		</Badge>
																	</TableCell>
																	<TableCell>
																		<Badge
																			variant={item.is_published ? "default" : "secondary"}
																			className={`text-[11px] ${
																				item.is_published
																					? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
																					: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
																			}`}
																		>
																			{item.is_published ? 'Published' : 'Draft'}
																		</Badge>
																	</TableCell>
																	<TableCell>
																		<div className="flex items-center justify-center gap-1">
																			<Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => router.push(`/exam_timetable?id=${item.id}`)}>
																				<Edit className="h-3 w-3" />
																			</Button>
																			<Button
																				variant="outline"
																				size="sm"
																				className="h-7 w-7 p-0"
																				onClick={() => {
																					setSelectedTimetable(item)
																					setShowHallAllocation(true)
																				}}
																			>
																				<DoorOpen className="h-3 w-3" />
																			</Button>
																			<AlertDialog>
																				<AlertDialogTrigger asChild>
																					<Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
																						<Trash2 className="h-3 w-3" />
																					</Button>
																				</AlertDialogTrigger>
																				<AlertDialogContent>
																					<AlertDialogHeader>
																						<AlertDialogTitle>Delete Exam Timetable</AlertDialogTitle>
																						<AlertDialogDescription>
																							Are you sure you want to delete this exam timetable? This action cannot be undone.
																						</AlertDialogDescription>
																					</AlertDialogHeader>
																					<AlertDialogFooter>
																						<AlertDialogCancel>Cancel</AlertDialogCancel>
																						<AlertDialogAction onClick={() => remove(item.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
																					</AlertDialogFooter>
																				</AlertDialogContent>
																			</AlertDialog>
																		</div>
																	</TableCell>
																</TableRow>
															</React.Fragment>
														)
													})}
												</>
											) : (
												<TableRow>
													<TableCell colSpan={12} className="h-24 text-center text-[11px]">No data</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</div>
							</div>

							<div className="flex items-center justify-between space-x-2 py-2 mt-2">
								<div className="text-xs text-muted-foreground">
									Showing {filtered.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
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

				{/* Upload Error Dialog */}
				<AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
					<AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
						<AlertDialogHeader>
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
									<XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
								</div>
								<div>
									<AlertDialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
										Upload Validation Errors
									</AlertDialogTitle>
									<AlertDialogDescription className="text-sm text-muted-foreground mt-1">
										Please fix the following errors before uploading the data
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

							{/* Error Summary */}
							<div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
								<div className="flex items-center gap-2 mb-2">
									<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
									<span className="font-semibold text-red-800 dark:text-red-200">
										{uploadErrors.length} row{uploadErrors.length > 1 ? 's' : ''} failed validation
									</span>
								</div>
								<p className="text-sm text-red-700 dark:text-red-300">
									Please correct these errors in your Excel file and try uploading again. Row numbers correspond to your Excel file (including header row).
								</p>
							</div>

							{/* Detailed Error List */}
							<div className="space-y-3">
								{uploadErrors.map((error, index) => (
									<div key={index} className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/5">
										<div className="flex items-start justify-between mb-2">
											<div className="flex items-center gap-2">
												<Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-700">
													Row {error.row}
												</Badge>
												<span className="font-medium text-sm">
													{error.course_code} - {error.exam_date}
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
											<li>• Ensure all required fields are provided and not empty</li>
											<li>• Institution Code and Examination Session Code must exist in the system</li>
											<li>• Course Offering ID must be a valid UUID format</li>
											<li>• Exam Date must be in YYYY-MM-DD format (e.g., 2025-04-15)</li>
											<li>• Session must be either FN or AN</li>
											<li>• Exam Mode must be either Offline or Online</li>
											<li>• Is Published values: Yes/No</li>
										</ul>
									</div>
								</div>
							</div>
						</div>

						<AlertDialogFooter>
							<AlertDialogAction onClick={() => setShowErrorDialog(false)}>
								Close
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{/* Hall Allocation Dialog */}
				<Dialog open={showHallAllocation} onOpenChange={setShowHallAllocation}>
					<DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<DoorOpen className="h-5 w-5" />
								Hall Allocation - {selectedTimetable?.course_code}
							</DialogTitle>
							<DialogDescription>
								Allocate learners to examination halls for {selectedTimetable?.course_name} on {selectedTimetable?.exam_date} ({selectedTimetable?.session})
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							{/* Summary */}
							<div className="grid grid-cols-3 gap-3">
								<div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded-lg p-3">
									<div className="text-xs text-blue-600 font-medium mb-1">Total Learners</div>
									<div className="text-2xl font-bold text-blue-700">{selectedTimetable?.student_count || 0}</div>
								</div>
								<div className="bg-green-50 dark:bg-green-900/10 border border-green-200 rounded-lg p-3">
									<div className="text-xs text-green-600 font-medium mb-1">Seats Allocated</div>
									<div className="text-2xl font-bold text-green-700">{selectedTimetable?.seat_alloc_count || 0}</div>
								</div>
								<div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 rounded-lg p-3">
									<div className="text-xs text-orange-600 font-medium mb-1">Remaining</div>
									<div className="text-2xl font-bold text-orange-700">
										{(selectedTimetable?.student_count || 0) - (selectedTimetable?.seat_alloc_count || 0)}
									</div>
								</div>
							</div>

							{/* Room Selection - Placeholder for future implementation */}
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold mb-2 flex items-center gap-2">
									<MapPin className="h-4 w-4" />
									Room Allocation
								</h3>
								<p className="text-sm text-muted-foreground">
									Room selection and seat allocation interface will be implemented here.
									This will include:
								</p>
								<ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4">
									<li>• Select rooms sorted by room_order</li>
									<li>• Enter column start (C1, C2, etc.)</li>
									<li>• Enter learner count (validated against room capacity)</li>
									<li>• Auto-populate learners by program_code, attempt_number, learner_reg_no</li>
									<li>• Display room capacity, balance, rows, and columns</li>
								</ul>
							</div>
						</div>

						<DialogFooter>
							<Button variant="outline" onClick={() => setShowHallAllocation(false)}>
								Close
							</Button>
							<Button onClick={() => {
								toast({
									title: "Feature Coming Soon",
									description: "Complete hall allocation implementation is in progress.",
								})
							}}>
								<Users className="h-4 w-4 mr-2" />
								Allocate Seats
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<AppFooter />
			</SidebarInset>
		</SidebarProvider>
	)
}
