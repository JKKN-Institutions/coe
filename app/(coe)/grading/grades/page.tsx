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
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/common/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Award, TrendingUp, FileSpreadsheet, RefreshCw, Download, Upload, XCircle, AlertTriangle } from "lucide-react"

type Grade = {
	id: string
	institutions_id: string
	institutions_code: string
	grade: string
	grade_point: number
	description: string
	regulation_id: string // UUID
	regulation_code?: string
	qualify: boolean
	exclude_cgpa: boolean
	order_index: number | null
	is_absent: boolean
	result_status: string | null
	created_at: string
	updated_at: string
}

export default function GradesPage() {
	const { toast } = useToast()
	const [items, setItems] = useState<Grade[]>([])
	const [loading, setLoading] = useState(false)
	const [searchTerm, setSearchTerm] = useState("")
	const [sortColumn, setSortColumn] = useState<string | null>(null)
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

	const [sheetOpen, setSheetOpen] = useState(false)
	const [editing, setEditing] = useState<Grade | null>(null)

	// Dropdown data
	const [institutions, setInstitutions] = useState<Array<{ id: string; institution_code: string; name: string }>>([])
	// Result status options
	const resultStatusOptions = ['Pass', 'Fail', 'Withheld', 'Absent', 'Debarred']
	const [regulations, setRegulations] = useState<Array<{ id: string; regulation_code: string; regulation_year: number }>>([])

	const [formData, setFormData] = useState({
		institutions_code: "",
		regulation_id: "",
		grade: "",
		grade_point: "",
		description: "",
		qualify: false,
		exclude_cgpa: false,
		order_index: "",
		is_absent: false,
		result_status: "",
	})
	const [errors, setErrors] = useState<Record<string, string>>({})

	// Upload summary state
	const [uploadSummary, setUploadSummary] = useState<{
		total: number
		success: number
		failed: number
	}>({ total: 0, success: 0, failed: 0 })

	const [importErrors, setImportErrors] = useState<Array<{
		row: number
		grade: string
		grade_point: string
		errors: string[]
	}>>([])

	const [errorPopupOpen, setErrorPopupOpen] = useState(false)

	const resetForm = () => {
		setFormData({
			institutions_code: "",
			regulation_id: "",
			grade: "",
			grade_point: "",
			description: "",
			qualify: false,
			exclude_cgpa: false,
			order_index: "",
			is_absent: false,
			result_status: "",
		})
		setErrors({})
		setEditing(null)
	}

	const handleSort = (c: string) => {
		if (sortColumn === c) setSortDirection(sortDirection === "asc" ? "desc" : "asc")
		else { setSortColumn(c); setSortDirection("asc") }
	}
	const getSortIcon = (c: string) => sortColumn !== c ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)

	const filtered = useMemo(() => {
		const q = searchTerm.toLowerCase()
		const data = items
			.filter((i) => [i.institutions_code, i.regulation_code, i.grade, i.description, String(i.grade_point)].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))

		if (!sortColumn) return data
		return [...data].sort((a, b) => {
			const av = (a as any)[sortColumn]
			const bv = (b as any)[sortColumn]
			if (av === bv) return 0
			return sortDirection === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
		})
	}, [items, searchTerm, sortColumn, sortDirection])

	const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const pageItems = filtered.slice(startIndex, endIndex)
	useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection])

	const openAdd = () => { resetForm(); setSheetOpen(true) }
	const openEdit = (row: Grade) => {
		setEditing(row)
		setFormData({
			institutions_code: row.institutions_code,
			regulation_id: row.regulation_id,
			grade: row.grade,
			grade_point: String(row.grade_point),
			description: row.description,
			qualify: row.qualify,
			exclude_cgpa: row.exclude_cgpa,
			order_index: row.order_index !== null ? String(row.order_index) : "",
			is_absent: row.is_absent,
			result_status: row.result_status || "",
		})
		setSheetOpen(true)
	}

	const validate = () => {
		const e: Record<string, string> = {}
		if (!formData.institutions_code.trim()) e.institutions_code = "Required"
		if (!formData.regulation_id) e.regulation_id = "Required"
		if (!formData.grade.trim()) e.grade = "Required"
		if (formData.grade_point === '' || formData.grade_point === null || formData.grade_point === undefined) e.grade_point = "Required"
		if (!formData.description.trim()) e.description = "Required"

		const gp = Number(formData.grade_point)
		if (!e.grade_point && (isNaN(gp) || gp < 0 || gp > 10)) e.grade_point = "Must be between 0 and 10"

		// Order index validation (optional but must be non-negative integer if provided)
		if (formData.order_index !== '' && formData.order_index !== null && formData.order_index !== undefined) {
			const orderIdx = Number(formData.order_index)
			if (isNaN(orderIdx) || orderIdx < 0 || !Number.isInteger(orderIdx)) {
				e.order_index = "Must be a non-negative integer"
			}
		}

		setErrors(e)
		return Object.keys(e).length === 0
	}

	const [saving, setSaving] = useState(false)
	const save = async () => {
		if (!validate()) return
		try {
			setSaving(true)
			const payload = {
				institutions_code: formData.institutions_code,
				regulation_id: formData.regulation_id,
				grade: formData.grade,
				grade_point: Number(formData.grade_point),
				description: formData.description,
				qualify: formData.qualify,
				exclude_cgpa: formData.exclude_cgpa,
				order_index: formData.order_index !== '' ? Number(formData.order_index) : null,
				is_absent: formData.is_absent,
				result_status: formData.result_status && formData.result_status !== 'none' ? formData.result_status : null,
			}
			if (editing) {
				const res = await fetch('/api/grading/grades', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
				if (!res.ok) {
					const errorData = await res.json()
					throw new Error(errorData.error || 'Update failed')
				}
				const updated = await res.json()
				setItems((p) => p.map((x) => x.id === editing.id ? updated : x))
			} else {
				const res = await fetch('/api/grading/grades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
				if (!res.ok) {
					const errorData = await res.json()
					throw new Error(errorData.error || 'Create failed')
				}
				const created = await res.json()
				setItems((p) => [created, ...p])
			}
			setSheetOpen(false)
			resetForm()
		} catch (e) {
			console.error(e)
			const errorMessage = e instanceof Error ? e.message : 'Failed to save grade'
			alert(errorMessage)
		} finally {
			setSaving(false)
		}
	}

	const remove = async (id: string) => {
		try {
			const res = await fetch(`/api/grading/grades?id=${id}`, { method: 'DELETE' })
			if (!res.ok) throw new Error('Delete failed')
			setItems((p) => p.filter((x) => x.id !== id))
		} catch (e) {
			console.error(e)
			alert('Failed to delete grade')
		}
	}

	const handleDownload = () => {
		const json = JSON.stringify(filtered, null, 2)
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `grades_${new Date().toISOString().split('T')[0]}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)

		toast({
			title: '✅ Export Successful',
			description: `${filtered.length} grades exported to JSON.`,
			className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
		})
	}

	const handleExport = () => {
		const excelData = filtered.map(r => ({
			'Institution Code': r.institutions_code,
			'Regulation ID': r.regulation_id,
			'Regulation Code': r.regulation_code || '',
			'Grade': r.grade,
			'Grade Point': r.grade_point,
			'Description': r.description,
			'Qualify': r.qualify ? 'Pass' : 'Fail',
			'Exclude CGPA': r.exclude_cgpa ? 'Yes' : 'No',
			'Order Index': r.order_index ?? '',
			'Is Absent': r.is_absent ? 'Yes' : 'No',
			'Result Status': r.result_status || '',
			'Created': new Date(r.created_at).toISOString().split('T')[0]
		}))
		const ws = XLSX.utils.json_to_sheet(excelData)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Grades')
		XLSX.writeFile(wb, `grades_export_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: '✅ Export Successful',
			description: `${filtered.length} grades exported to Excel.`,
			className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
		})
	}

	const handleTemplateExport = async () => {
		// Ensure reference data is loaded
		let currentInstitutions = institutions
		let currentRegulations = regulations

		// Fetch data if not already loaded
		if (institutions.length === 0 || regulations.length === 0) {
			toast({
				title: '⏳ Loading Reference Data',
				description: 'Fetching latest reference data...',
				className: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
			})

			try {
				// Fetch institutions
				if (institutions.length === 0) {
					const resInst = await fetch('/api/master/institutions')
					if (resInst.ok) {
						const dataInst = await resInst.json()
						currentInstitutions = dataInst.filter((i: any) => i.is_active).map((i: any) => ({
							id: i.id,
							institution_code: i.institution_code,
							name: i.name
						}))
						setInstitutions(currentInstitutions)
					}
				}

				// Fetch regulations
				if (regulations.length === 0) {
					const resReg = await fetch('/api/master/regulations')
					if (resReg.ok) {
						const dataReg = await resReg.json()
						currentRegulations = dataReg.filter((r: any) => r.status).map((r: any) => ({
							id: r.id,
							regulation_code: r.regulation_code,
							regulation_year: r.regulation_year
						}))
						setRegulations(currentRegulations)
					}
				}
			} catch (error) {
				console.error('Error fetching reference data:', error)
			}
		}

		const wb = XLSX.utils.book_new()

		// Sheet 1: Template with sample row (using codes, not IDs)
		const sample = [{
			'Institution Code *': 'JKKN',
			'Regulation Code *': 'REG-2024',
			'Grade *': 'O',
			'Grade Point *': 10,
			'Min Mark *': 90,
			'Max Mark *': 100,
			'Description *': 'Outstanding',
			'Qualify': 'Pass',
			'Exclude CGPA': 'No',
			'Order Index': 1,
			'Is Absent': 'No',
			'Result Status': 'Pass'
		}]

		const wsTemplate = XLSX.utils.json_to_sheet(sample)
		wsTemplate['!cols'] = [
			{ wch: 20 }, // Institution Code
			{ wch: 20 }, // Regulation Code
			{ wch: 10 }, // Grade
			{ wch: 15 }, // Grade Point
			{ wch: 12 }, // Min Mark
			{ wch: 12 }, // Max Mark
			{ wch: 35 }, // Description
			{ wch: 12 }, // Qualify
			{ wch: 15 }, // Exclude CGPA
			{ wch: 12 }, // Order Index
			{ wch: 12 }, // Is Absent
			{ wch: 15 }  // Result Status
		]
		XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template')

		// Sheet 2: Unified Reference Sheet with all lookup data
		const referenceData: any[] = []

		// Institutions Section
		referenceData.push({ 'Type': '=== INSTITUTIONS ===', 'Code': '', 'Name/Details': '', 'Additional Info': '' })
		currentInstitutions.forEach(inst => {
			referenceData.push({
				'Type': 'Institution',
				'Code': inst.institution_code,
				'Name/Details': inst.name,
				'Additional Info': ''
			})
		})
		if (currentInstitutions.length === 0) {
			referenceData.push({ 'Type': 'Institution', 'Code': 'No data available', 'Name/Details': '', 'Additional Info': '' })
		}
		referenceData.push({ 'Type': '', 'Code': '', 'Name/Details': '', 'Additional Info': '' }) // Blank separator

		// Regulations Section
		referenceData.push({ 'Type': '=== REGULATIONS ===', 'Code': '', 'Name/Details': '', 'Additional Info': '' })
		currentRegulations.forEach(reg => {
			referenceData.push({
				'Type': 'Regulation',
				'Code': reg.regulation_code,
				'Name/Details': `Year ${reg.regulation_year}`,
				'Additional Info': `ID: ${reg.id}`
			})
		})
		if (currentRegulations.length === 0) {
			referenceData.push({ 'Type': 'Regulation', 'Code': 'No data available', 'Name/Details': '', 'Additional Info': '' })
		}

		const wsReference = XLSX.utils.json_to_sheet(referenceData)
		wsReference['!cols'] = [
			{ wch: 20 }, // Type
			{ wch: 25 }, // Code
			{ wch: 40 }, // Name/Details
			{ wch: 20 }  // Additional Info
		]
		XLSX.utils.book_append_sheet(wb, wsReference, 'Reference Data')

		// Export file
		XLSX.writeFile(wb, `grades_template_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: '✅ Template Downloaded',
			description: 'Grades upload template with unified reference data has been downloaded successfully.',
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
				let rows: Partial<Grade>[] = []
				if (file.name.endsWith('.json')) {
					rows = JSON.parse(await file.text())
				} else {
					const data = new Uint8Array(await file.arrayBuffer())
					const wb = XLSX.read(data, { type: 'array' })
					const ws = wb.Sheets[wb.SheetNames[0]]
					const json = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
					rows = json.map(j => ({
						institutions_code: String(j['Institution Code *'] || j['Institution Code'] || ''),
						regulation_code: String(j['Regulation Code *'] || j['Regulation Code'] || ''),
						grade: String(j['Grade *'] || j['Grade'] || ''),
						grade_point: Number(j['Grade Point *'] || j['Grade Point'] || 0),
						description: String(j['Description *'] || j['Description'] || ''),
						qualify: String(j['Qualify'] || '').toLowerCase() === 'pass' || String(j['Qualify'] || '').toLowerCase() === 'true',
						exclude_cgpa: String(j['Exclude CGPA'] || '').toLowerCase() === 'yes' || String(j['Exclude CGPA'] || '').toLowerCase() === 'true',
						order_index: j['Order Index'] !== undefined && j['Order Index'] !== '' ? Number(j['Order Index']) : null,
						is_absent: String(j['Is Absent'] || '').toLowerCase() === 'yes' || String(j['Is Absent'] || '').toLowerCase() === 'true',
						result_status: String(j['Result Status'] || '') || null
					}))
				}

				// Filter out rows with missing required fields (using regulation_code now)
				const mapped = rows.filter(r => r.institutions_code && r.regulation_code && r.grade && r.grade_point !== undefined && r.description)

				if (mapped.length === 0) {
					alert('No valid rows found. Ensure all required fields are provided.')
					return
				}

				// Upload with row tracking
				setLoading(true)
				let successCount = 0
				let errorCount = 0
				const uploadErrors: Array<{
					row: number
					grade: string
					grade_point: string
					errors: string[]
				}> = []

				for (let i = 0; i < mapped.length; i++) {
					const gradeItem = mapped[i]
					const rowNumber = i + 2 // +2 for header row in Excel

					// Auto-map regulation_code to regulation_id
					const regulation = regulations.find(r => r.regulation_code === gradeItem.regulation_code)
					if (!regulation) {
						errorCount++
						uploadErrors.push({
							row: rowNumber,
							grade: gradeItem.grade || 'N/A',
							grade_point: String(gradeItem.grade_point) || 'N/A',
							errors: [`Invalid regulation code: "${gradeItem.regulation_code}". Please check the Reference Data sheet.`]
						})
						continue
					}

					const payload = {
						institutions_code: gradeItem.institutions_code,
						regulation_id: regulation.id, // Use auto-mapped ID from regulation_code
						grade: gradeItem.grade,
						grade_point: gradeItem.grade_point,
						description: gradeItem.description,
						qualify: gradeItem.qualify ?? false,
						exclude_cgpa: gradeItem.exclude_cgpa ?? false,
						order_index: (gradeItem as any).order_index ?? null,
						is_absent: (gradeItem as any).is_absent ?? false,
						result_status: (gradeItem as any).result_status ?? null
					}

					try {
						const response = await fetch('/api/grading/grades', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(payload)
						})

						if (response.ok) {
							const savedGrade = await response.json()
							setItems(prev => [savedGrade, ...prev])
							successCount++
						} else {
							const errorData = await response.json()
							errorCount++
							uploadErrors.push({
								row: rowNumber,
								grade: gradeItem.grade || 'N/A',
								grade_point: String(gradeItem.grade_point) || 'N/A',
								errors: [errorData.error || 'Failed to save grade']
							})
						}
					} catch (error) {
						errorCount++
						uploadErrors.push({
							row: rowNumber,
							grade: gradeItem.grade || 'N/A',
							grade_point: String(gradeItem.grade_point) || 'N/A',
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

				// Show error dialog with upload summary
				setImportErrors(uploadErrors)
				setErrorPopupOpen(true)

				// Show appropriate toast message
				if (successCount > 0 && errorCount === 0) {
					toast({
						title: '✅ Upload Complete',
						description: `Successfully uploaded all ${successCount} row${successCount > 1 ? 's' : ''} (${successCount} grade${successCount > 1 ? 's' : ''}) to the database.`,
						className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
						duration: 5000,
					})
				} else if (successCount > 0 && errorCount > 0) {
					toast({
						title: '⚠️ Partial Upload Success',
						description: `Processed ${totalRows} row${totalRows > 1 ? 's' : ''}: ${successCount} successful, ${errorCount} failed. View error details in the dialog.`,
						className: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
						duration: 6000,
					})
				} else if (errorCount > 0) {
					toast({
						title: '❌ Upload Failed',
						description: `Processed ${totalRows} row${totalRows > 1 ? 's' : ''}: 0 successful, ${errorCount} failed. View error details in the dialog.`,
						variant: 'destructive',
						className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
						duration: 6000,
					})
				}
			} catch (err) {
				console.error(err)
				alert('Import failed. Please check your file format.')
			}
		}
		input.click()
	}

	const fetchGrades = async () => {
		try {
			setLoading(true)
			const res = await fetch('/api/grading/grades')
			if (!res.ok) throw new Error('Fetch failed')
			const data = await res.json()
			setItems(data)
		} catch (e) {
			console.error(e)
			alert('Failed to fetch grades')
		} finally {
			setLoading(false)
		}
	}

	const fetchInstitutions = async () => {
		try {
			const res = await fetch('/api/master/institutions')
			if (res.ok) {
				const data = await res.json()
				setInstitutions(data.filter((i: any) => i.is_active).map((i: any) => ({
					id: i.id,
					institution_code: i.institution_code,
					name: i.name
				})))
			}
		} catch (e) {
			console.error('Failed to fetch institutions:', e)
		}
	}

	const fetchRegulations = async () => {
		try {
			const res = await fetch('/api/master/regulations')
			if (res.ok) {
				const data = await res.json()
				setRegulations(data.filter((r: any) => r.status).map((r: any) => ({
					id: String(r.id),
					regulation_code: r.regulation_code,
					regulation_year: r.regulation_year
				})))
			}
		} catch (e) {
			console.error('Failed to fetch regulations:', e)
		}
	}

	useEffect(() => {
		fetchGrades()
		fetchInstitutions()
		fetchRegulations()
	}, [])

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
									<BreadcrumbPage>Grades</BreadcrumbPage>
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
										<p className="text-xs font-medium text-muted-foreground">Total Grades</p>
										<p className="text-xl font-bold">{items.length}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
										<Award className="h-3 w-3 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Passing Grades</p>
										<p className="text-xl font-bold text-green-600">{items.filter(i=>i.qualify).length}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
										<Award className="h-3 w-3 text-green-600 dark:text-green-400" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Failing Grades</p>
										<p className="text-xl font-bold text-red-600">{items.filter(i=>!i.qualify).length}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
										<Award className="h-3 w-3 text-red-600 dark:text-red-400" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">New This Month</p>
										<p className="text-xl font-bold text-blue-600">{items.filter(i=>{ const d=new Date(i.created_at); const n=new Date(); return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear() }).length}</p>
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
										<Award className="h-3 w-3 text-primary" />
									</div>
									<div>
										<h2 className="text-sm font-semibold">Grades</h2>
										<p className="text-[11px] text-muted-foreground">Manage grades</p>
									</div>
								</div>
							</div>

							<div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
								<div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
									<div className="relative w-full sm:w-[220px]">
										<Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
										<Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-xs" />
									</div>
								</div>

								<div className="flex gap-1 flex-wrap">
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={fetchGrades} disabled={loading}>
										<RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleTemplateExport}>
										<FileSpreadsheet className="h-3 w-3 mr-1" />
										Template
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleExport}>
										<Download className="h-3 w-3 mr-1" />
										Download
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleDownload}>
										<Download className="h-3 w-3 mr-1" />
										JSON
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleImport}>
										<Upload className="h-3 w-3 mr-1" />
										Upload
									</Button>
									<Button size="sm" className="text-xs px-2 h-8" onClick={openAdd}>
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
												<TableHead className="w-[100px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("institutions_code")} className="h-auto p-0 font-medium hover:bg-transparent">Institution <span className="ml-1">{getSortIcon("institutions_code")}</span></Button></TableHead>
												<TableHead className="w-[80px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("grade")} className="h-auto p-0 font-medium hover:bg-transparent">Grade <span className="ml-1">{getSortIcon("grade")}</span></Button></TableHead>
												<TableHead className="w-[80px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("grade_point")} className="h-auto p-0 font-medium hover:bg-transparent">GP <span className="ml-1">{getSortIcon("grade_point")}</span></Button></TableHead>
												<TableHead className="text-[11px]">Description</TableHead>
												<TableHead className="w-[80px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("qualify")} className="h-auto p-0 font-medium hover:bg-transparent">Pass <span className="ml-1">{getSortIcon("qualify")}</span></Button></TableHead>
												<TableHead className="w-[100px] text-[11px] text-center">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{loading ? (
												<TableRow><TableCell colSpan={6} className="h-24 text-center text-[11px]">Loading…</TableCell></TableRow>
											) : pageItems.length ? (
												<>
													{pageItems.map((row) => (
														<TableRow key={row.id}>
															<TableCell className="text-[11px] font-medium">{row.institutions_code}</TableCell>
															<TableCell className="text-[11px] font-semibold">{row.grade}</TableCell>
															<TableCell className="text-[11px]">{row.grade_point}</TableCell>
															<TableCell className="text-[11px]">{row.description.length > 30 ? row.description.substring(0, 30) + '...' : row.description}</TableCell>
															<TableCell><Badge variant={row.qualify ? "default" : "destructive"} className="text-[11px] bg-green-600">{row.qualify ? "Pass" : "Fail"}</Badge></TableCell>
															<TableCell>
																<div className="flex items-center justify-center gap-1">
																	<Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(row)}><Edit className="h-3 w-3" /></Button>
																	<AlertDialog>
																		<AlertDialogTrigger asChild>
																			<Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3" /></Button>
																		</AlertDialogTrigger>
																		<AlertDialogContent>
																			<AlertDialogHeader>
																				<AlertDialogTitle>Delete Grade</AlertDialogTitle>
																				<AlertDialogDescription>Are you sure you want to delete grade {row.grade}?</AlertDialogDescription>
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
												<TableRow><TableCell colSpan={6} className="h-24 text-center text-[11px]">No data</TableCell></TableRow>
											)}
										</TableBody>
									</Table>
								</div>
							</div>

							<div className="flex items-center justify-between space-x-2 py-2 mt-2">
								<div className="text-xs text-muted-foreground">Showing {filtered.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length}</div>
								<div className="flex items-center gap-2">

									<Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 px-2 text-xs"><ChevronLeft className="h-3 w-3 mr-1" /> Previous</Button>
									<div className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</div>
									<Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-7 px-2 text-xs">Next <ChevronRight className="h-3 w-3 ml-1" /></Button>
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
									<Award className="h-5 w-5 text-white" />
								</div>
								<div>
									<SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
										{editing ? "Edit Grade" : "Add Grade"}
									</SheetTitle>
									<p className="text-sm text-muted-foreground mt-1">
										{editing ? "Update grade information" : "Create a new grade record"}
									</p>
								</div>
							</div>
						</div>
					</SheetHeader>

					<div className="mt-6 space-y-8">
						{/* Basic Information */}
						<div className="space-y-4">
							<div className="flex items-center gap-3 pb-3 border-b border-blue-200 dark:border-blue-800">
								<div className="h-8 w-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
									<Award className="h-4 w-4 text-white" />
								</div>
								<h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Basic Information</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label className="text-sm font-semibold">Institution Code *</Label>
									<Select value={formData.institutions_code} onValueChange={(v) => setFormData({ ...formData, institutions_code: v })}>
										<SelectTrigger className={`h-10 ${errors.institutions_code ? 'border-destructive' : ''}`}>
											<SelectValue placeholder="Select institution" />
										</SelectTrigger>
										<SelectContent>
											{institutions.map((inst) => (
												<SelectItem key={inst.id} value={inst.institution_code}>
													{inst.institution_code} - {inst.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.institutions_code && <p className="text-xs text-destructive">{errors.institutions_code}</p>}
								</div>
								<div className="space-y-2">
									<Label className="text-sm font-semibold">Regulation *</Label>
									<Select value={formData.regulation_id} onValueChange={(v) => setFormData({ ...formData, regulation_id: v })}>
										<SelectTrigger className={`h-10 ${errors.regulation_id ? 'border-destructive' : ''}`}>
											<SelectValue placeholder="Select regulation" />
										</SelectTrigger>
										<SelectContent>
											{regulations.map((reg) => (
												<SelectItem key={reg.id} value={String(reg.id)}>
													{reg.regulation_code}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.regulation_id && <p className="text-xs text-destructive">{errors.regulation_id}</p>}
								</div>
								<div className="space-y-2">
									<Label className="text-sm font-semibold">Grade *</Label>
									<Input value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className={`h-10 ${errors.grade ? 'border-destructive' : ''}`} placeholder="e.g., O, A+, A, B+" />
									{errors.grade && <p className="text-xs text-destructive">{errors.grade}</p>}
								</div>
								<div className="space-y-2">
									<Label className="text-sm font-semibold">Grade Point *</Label>
									<Input type="number" min="0" max="10" step="0.01" value={formData.grade_point} onChange={(e) => setFormData({ ...formData, grade_point: e.target.value })} className={`h-10 ${errors.grade_point ? 'border-destructive' : ''}`} placeholder="e.g., 10, 9.5, 8" />
									{errors.grade_point && <p className="text-xs text-destructive">{errors.grade_point}</p>}
								</div>
								<div className="space-y-2 md:col-span-2">
									<Label className="text-sm font-semibold">Description *</Label>
									<Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`min-h-[80px] ${errors.description ? 'border-destructive' : ''}`} placeholder="Description of this grade" />
									{errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
								</div>
							</div>
						</div>

						{/* Settings */}
						<div className="space-y-4">
							<div className="flex items-center gap-3 pb-3 border-b border-purple-200 dark:border-purple-800">
								<div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
									<Award className="h-4 w-4 text-white" />
								</div>
								<h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Settings</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="flex items-center gap-3">
									<Label htmlFor="qualify" className="text-sm font-semibold">Qualify</Label>
									<Switch
										id="qualify"
										checked={formData.qualify}
										onCheckedChange={(v) => setFormData({ ...formData, qualify: v })}
									/>
									<span className={`text-sm font-medium ${formData.qualify ? 'text-green-600' : 'text-red-500'}`}>
										{formData.qualify ? 'Pass' : 'Fail'}
									</span>
								</div>
								<div className="flex items-center gap-3">
									<Label htmlFor="exclude_cgpa" className="text-sm font-semibold">Exclude CGPA</Label>
									<Switch
										id="exclude_cgpa"
										checked={formData.exclude_cgpa}
										onCheckedChange={(v) => setFormData({ ...formData, exclude_cgpa: v })}
									/>
									<span className={`text-sm font-medium ${formData.exclude_cgpa ? 'text-orange-600' : 'text-gray-500'}`}>
										{formData.exclude_cgpa ? 'Yes' : 'No'}
									</span>
								</div>
								<div className="flex items-center gap-3">
									<Label htmlFor="is_absent" className="text-sm font-semibold">Is Absent</Label>
									<Switch
										id="is_absent"
										checked={formData.is_absent}
										onCheckedChange={(v) => setFormData({ ...formData, is_absent: v })}
									/>
									<span className={`text-sm font-medium ${formData.is_absent ? 'text-orange-600' : 'text-gray-500'}`}>
										{formData.is_absent ? 'Yes' : 'No'}
									</span>
								</div>
								<div className="space-y-2">
									<Label className="text-sm font-semibold">Order Index</Label>
									<Input type="number" min="0" value={formData.order_index} onChange={(e) => setFormData({ ...formData, order_index: e.target.value })} className={`h-10 ${errors.order_index ? 'border-destructive' : ''}`} placeholder="e.g., 1, 2, 3" />
									{errors.order_index && <p className="text-xs text-destructive">{errors.order_index}</p>}
								</div>
								<div className="space-y-2 md:col-span-2">
									<Label className="text-sm font-semibold">Result Status</Label>
									<Select value={formData.result_status} onValueChange={(v) => setFormData({ ...formData, result_status: v })}>
										<SelectTrigger className="h-10">
											<SelectValue placeholder="Select result status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">None</SelectItem>
											{resultStatusOptions.map((status) => (
												<SelectItem key={status} value={status}>{status}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						{/* Actions */}
						<div className="flex justify-end gap-3 pt-6 border-t">
							<Button variant="outline" size="sm" className="h-10 px-6" onClick={() => { setSheetOpen(false); resetForm() }} disabled={saving}>Cancel</Button>
							<Button size="sm" className="h-10 px-6" onClick={save} disabled={saving}>
								{saving ? (editing ? 'Updating…' : 'Creating…') : (editing ? 'Update Grade' : 'Create Grade')}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{/* Upload Results Dialog */}
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
									<Award className="h-5 w-5 text-green-600 dark:text-green-400" />
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
										? 'All grades have been successfully uploaded to the database'
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
														{error.grade} - {error.grade_point}
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
									<Award className="h-5 w-5 text-green-600 dark:text-green-400" />
									<span className="font-semibold text-green-800 dark:text-green-200">
										All {uploadSummary.success} grade{uploadSummary.success > 1 ? 's' : ''} uploaded successfully
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
									<h4 className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-1">Required Excel Format:</h4>
									<ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
										<li>• <strong>Institution Code *</strong> (required): Must match existing institution code from Reference Data sheet</li>
										<li>• <strong>Regulation Code *</strong> (required): Must match existing regulation code from Reference Data sheet</li>
										<li>• <strong>Grade *</strong> (required): Grade value (e.g., O, A+, A, B+)</li>
										<li>• <strong>Grade Point *</strong> (required): Numeric value between 0 and 10</li>
										<li>• <strong>Min Mark *</strong> (required): Minimum mark value between 0 and 100</li>
										<li>• <strong>Max Mark *</strong> (required): Maximum mark value between 0 and 100</li>
										<li>• <strong>Description *</strong> (required): Description of the grade</li>
										<li>• <strong>Qualify</strong> (optional): Pass/Fail or true/false (default: Fail)</li>
										<li>• <strong>Exclude CGPA</strong> (optional): Yes/No or true/false (default: No)</li>
									</ul>
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
