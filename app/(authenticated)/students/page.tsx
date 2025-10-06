"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
	Download,
	Upload,
	PlusCircle,
	Search,
	ChevronLeft,
	ChevronRight,
	Edit,
	Trash2,
	FileSpreadsheet,
	FileJson,
	RefreshCw,
	Users,
	UserCheck,
	UserX,
	TrendingUp,
	User,
	GraduationCap,
	Wallet,
	FileText,
	Phone,
	Mail,
	MapPin,
	Calendar,
	Settings,
} from "lucide-react"
import Link from "next/link"
import * as XLSX from 'xlsx'

// Student type based on corrected schema
type Student = {
	id: string
	roll_number: string
	register_number?: string
	application_id?: string
	admission_id?: string
	first_name: string
	last_name?: string
	initial?: string
	full_name: string
	date_of_birth: string
	age?: number
	gender: string
	blood_group?: string
	student_mobile?: string
	student_email?: string
	college_email?: string
	photo_url?: string
	institution_id: string
	department_id: string
	program_id: string
	degree_id?: string
	semester_id: string
	section_id?: string
	academic_year_id: string
	batch_year?: number
	status: string
	admission_status?: string
	is_profile_complete: boolean
	is_hostelite: boolean
	is_bus_user: boolean
	nationality: string
	religion?: string
	community?: string
	caste?: string
	quota?: string
	category?: string
	first_graduate: boolean
	father_name?: string
	father_mobile?: string
	mother_name?: string
	mother_mobile?: string
	district?: string
	state: string
	created_at: string
	updated_at?: string
}

export default function StudentsPage() {
	const { toast } = useToast()
	const [students, setStudents] = useState<Student[]>([])
	const [loading, setLoading] = useState(true)
	const [sheetOpen, setSheetOpen] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null)
	const [editing, setEditing] = useState<Student | null>(null)
	const [currentTab, setCurrentTab] = useState("basic")
	const [searchQuery, setSearchQuery] = useState("")
	const [filterStatus, setFilterStatus] = useState("all")
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage] = useState(10)

	// Form state for basic info
	const [formData, setFormData] = useState({
		roll_number: "",
		register_number: "",
		application_id: "",
		first_name: "",
		last_name: "",
		initial: "",
		date_of_birth: "",
		gender: "",
		blood_group: "",
		student_mobile: "",
		student_email: "",
		college_email: "",
		photo_url: "",
		institution_id: "",
		department_id: "",
		program_id: "",
		degree_id: "",
		semester_id: "",
		section_id: "",
		academic_year_id: "",
		batch_year: "",
		status: "active",
		nationality: "Indian",
		religion: "",
		community: "",
		caste: "",
		quota: "",
		category: "",
		first_graduate: false,
		father_name: "",
		father_mobile: "",
		mother_name: "",
		mother_mobile: "",
		district: "",
		state: "Tamil Nadu",
		is_hostelite: false,
		is_bus_user: false,
	})

	const [errors, setErrors] = useState<Record<string, string>>({})

	// Fetch students from API
	useEffect(() => {
		fetchStudents()
	}, [])

	const fetchStudents = async () => {
		try {
			setLoading(true)
			const response = await fetch('/api/students')
			if (response.ok) {
				const data = await response.json()
				setStudents(data)
			} else {
				console.error('Failed to fetch students')
			}
		} catch (error) {
			console.error('Error fetching students:', error)
		} finally {
			setLoading(false)
		}
	}

	const refreshStudents = async () => {
		setLoading(true)
		try {
			const response = await fetch('/api/students')
			if (response.ok) {
				const data = await response.json()
				setStudents(data)
				toast({
					title: '✅ Refreshed',
					description: `Loaded ${data.length} students.`,
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			} else {
				toast({
					title: '❌ Refresh Failed',
					description: 'Failed to load students.',
					variant: 'destructive'
				})
			}
		} catch (error) {
			console.error('Error refreshing students:', error)
			toast({
				title: '❌ Refresh Failed',
				description: 'Failed to load students.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}

	const resetForm = () => {
		setFormData({
			roll_number: "",
			register_number: "",
			application_id: "",
			first_name: "",
			last_name: "",
			initial: "",
			date_of_birth: "",
			gender: "",
			blood_group: "",
			student_mobile: "",
			student_email: "",
			college_email: "",
			photo_url: "",
			institution_id: "",
			department_id: "",
			program_id: "",
			degree_id: "",
			semester_id: "",
			section_id: "",
			academic_year_id: "",
			batch_year: "",
			status: "active",
			nationality: "Indian",
			religion: "",
			community: "",
			caste: "",
			quota: "",
			category: "",
			first_graduate: false,
			father_name: "",
			father_mobile: "",
			mother_name: "",
			mother_mobile: "",
			district: "",
			state: "Tamil Nadu",
			is_hostelite: false,
			is_bus_user: false,
		})
		setErrors({})
		setEditing(null)
		setCurrentTab("basic")
	}

	const openAdd = () => {
		resetForm()
		setSheetOpen(true)
	}

	const openEdit = (student: Student) => {
		setEditing(student)
		setFormData({
			roll_number: student.roll_number || "",
			register_number: student.register_number || "",
			application_id: student.application_id || "",
			first_name: student.first_name || "",
			last_name: student.last_name || "",
			initial: student.initial || "",
			date_of_birth: student.date_of_birth || "",
			gender: student.gender || "",
			blood_group: student.blood_group || "",
			student_mobile: student.student_mobile || "",
			student_email: student.student_email || "",
			college_email: student.college_email || "",
			photo_url: student.photo_url || "",
			institution_id: student.institution_id || "",
			department_id: student.department_id || "",
			program_id: student.program_id || "",
			degree_id: student.degree_id || "",
			semester_id: student.semester_id || "",
			section_id: student.section_id || "",
			academic_year_id: student.academic_year_id || "",
			batch_year: String(student.batch_year || ""),
			status: student.status || "active",
			nationality: student.nationality || "Indian",
			religion: student.religion || "",
			community: student.community || "",
			caste: student.caste || "",
			quota: student.quota || "",
			category: student.category || "",
			first_graduate: student.first_graduate || false,
			father_name: student.father_name || "",
			father_mobile: student.father_mobile || "",
			mother_name: student.mother_name || "",
			mother_mobile: student.mother_mobile || "",
			district: student.district || "",
			state: student.state || "Tamil Nadu",
			is_hostelite: student.is_hostelite || false,
			is_bus_user: student.is_bus_user || false,
		})
		setSheetOpen(true)
	}

	const validate = () => {
		const e: Record<string, string> = {}

		if (!formData.roll_number.trim()) e.roll_number = "Roll number is required"
		if (!formData.first_name.trim()) e.first_name = "First name is required"
		if (!formData.date_of_birth) e.date_of_birth = "Date of birth is required"
		if (!formData.gender) e.gender = "Gender is required"
		if (!formData.institution_id) e.institution_id = "Institution is required"
		if (!formData.department_id) e.department_id = "Department is required"
		if (!formData.program_id) e.program_id = "Program is required"
		if (!formData.semester_id) e.semester_id = "Semester is required"
		if (!formData.academic_year_id) e.academic_year_id = "Academic year is required"

		setErrors(e)
		return Object.keys(e).length === 0
	}

	const handleSave = async () => {
		if (!validate()) {
			toast({
				title: '❌ Validation Failed',
				description: 'Please fill in all required fields.',
				variant: 'destructive'
			})
			return
		}

		try {
			const payload = {
				...formData,
				batch_year: formData.batch_year ? Number(formData.batch_year) : null,
			}

			let res: Response
			if (editing) {
				res = await fetch(`/api/students/${editing.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				})
			} else {
				res = await fetch('/api/students', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				})
			}

			if (!res.ok) {
				const ed = await res.json().catch(() => ({}))
				throw new Error(ed.error || ed.details || 'Failed to save student')
			}

			const saved = await res.json()

			if (editing) {
				setStudents(p => p.map(s => s.id === editing.id ? saved : s))
				toast({
					title: '✅ Record Updated',
					description: `${formData.first_name}'s profile has been updated.`,
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			} else {
				setStudents(p => [saved, ...p])
				toast({
					title: '✅ Record Created',
					description: `${formData.first_name} has been added successfully.`,
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			}

			setSheetOpen(false)
			resetForm()
		} catch (e) {
			console.error('Save student error:', e)
			toast({
				title: '❌ Operation Failed',
				description: e instanceof Error ? e.message : 'Failed to save record.',
				variant: 'destructive'
			})
		}
	}

	const handleDelete = async () => {
		if (!deleteStudentId) return

		try {
			const response = await fetch(`/api/students/${deleteStudentId}`, {
				method: 'DELETE',
			})

			if (response.ok) {
				setStudents(students.filter(s => s.id !== deleteStudentId))
				toast({
					title: '✅ Record Deleted',
					description: 'Student has been removed.',
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			} else {
				throw new Error('Failed to delete student')
			}
		} catch (error) {
			console.error('Error deleting student:', error)
			toast({
				title: '❌ Delete Failed',
				description: 'Failed to delete student.',
				variant: 'destructive'
			})
		} finally {
			setDeleteDialogOpen(false)
			setDeleteStudentId(null)
		}
	}

	// Export functions
	const downloadStudentsExcel = () => {
		const data = students.map(s => ({
			'Roll Number': s.roll_number || '',
			'Register Number': s.register_number || '',
			'First Name': s.first_name,
			'Last Name': s.last_name || '',
			'Initial': s.initial || '',
			'Date of Birth': s.date_of_birth,
			'Age': s.age || '',
			'Gender': s.gender,
			'Blood Group': s.blood_group || '',
			'Mobile': s.student_mobile || '',
			'Email': s.student_email || '',
			'College Email': s.college_email || '',
			'Nationality': s.nationality,
			'Religion': s.religion || '',
			'Community': s.community || '',
			'Caste': s.caste || '',
			'Quota': s.quota || '',
			'Category': s.category || '',
			'First Graduate': s.first_graduate ? 'Yes' : 'No',
			'Father Name': s.father_name || '',
			'Father Mobile': s.father_mobile || '',
			'Mother Name': s.mother_name || '',
			'Mother Mobile': s.mother_mobile || '',
			'District': s.district || '',
			'State': s.state,
			'Batch Year': s.batch_year || '',
			'Status': s.status,
			'Hostelite': s.is_hostelite ? 'Yes' : 'No',
			'Bus User': s.is_bus_user ? 'Yes' : 'No',
			'Profile Complete': s.is_profile_complete ? 'Yes' : 'No',
		}))

		const ws = XLSX.utils.json_to_sheet(data)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Students')
		XLSX.writeFile(wb, `students_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: '✅ Export Successful',
			description: `${students.length} students exported to Excel.`,
			className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
		})
	}

	const downloadStudentsJSON = () => {
		const jsonStr = JSON.stringify(students, null, 2)
		const blob = new Blob([jsonStr], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `students_${new Date().toISOString().split('T')[0]}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)

		toast({
			title: '✅ Export Successful',
			description: `${students.length} students exported to JSON.`,
			className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
		})
	}

	const downloadTemplate = () => {
		const template = [{
			'Roll Number*': '',
			'Register Number': '',
			'First Name*': '',
			'Last Name': '',
			'Initial': '',
			'Date of Birth* (YYYY-MM-DD)': '',
			'Gender* (Male/Female/Other/Transgender)': '',
			'Blood Group (A+/A-/B+/B-/O+/O-/AB+/AB-)': '',
			'Mobile': '',
			'Email': '',
			'College Email': '',
			'Nationality': 'Indian',
			'Religion': '',
			'Community': '',
			'Caste': '',
			'Quota': '',
			'Category': '',
			'First Graduate (Yes/No)': 'No',
			'Father Name': '',
			'Father Mobile': '',
			'Mother Name': '',
			'Mother Mobile': '',
			'District': '',
			'State': 'Tamil Nadu',
			'Batch Year': '',
			'Status': 'active',
			'Hostelite (Yes/No)': 'No',
			'Bus User (Yes/No)': 'No',
		}]

		const ws = XLSX.utils.json_to_sheet(template)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Template')
		XLSX.writeFile(wb, 'students_template.xlsx')

		toast({
			title: '✅ Template Downloaded',
			description: 'Students import template downloaded.',
			className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
		})
	}

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		try {
			let jsonData: any[] = []

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

			for (const row of jsonData) {
				try {
					const payload = {
						roll_number: row['Roll Number*'] || row['Roll Number'] || row.roll_number,
						register_number: row['Register Number'] || row.register_number || null,
						first_name: row['First Name*'] || row['First Name'] || row.first_name,
						last_name: row['Last Name'] || row.last_name || null,
						initial: row['Initial'] || row.initial || null,
						date_of_birth: row['Date of Birth* (YYYY-MM-DD)'] || row['Date of Birth'] || row.date_of_birth,
						gender: row['Gender* (Male/Female/Other/Transgender)'] || row['Gender'] || row.gender,
						blood_group: row['Blood Group (A+/A-/B+/B-/O+/O-/AB+/AB-)'] || row['Blood Group'] || row.blood_group || null,
						student_mobile: row['Mobile'] || row.student_mobile || null,
						student_email: row['Email'] || row.student_email || null,
						college_email: row['College Email'] || row.college_email || null,
						nationality: row['Nationality'] || row.nationality || 'Indian',
						religion: row['Religion'] || row.religion || null,
						community: row['Community'] || row.community || null,
						caste: row['Caste'] || row.caste || null,
						quota: row['Quota'] || row.quota || null,
						category: row['Category'] || row.category || null,
						first_graduate: typeof row.first_graduate === 'boolean' ? row.first_graduate : String(row['First Graduate (Yes/No)'] || row['First Graduate'] || 'No').toUpperCase() === 'YES',
						father_name: row['Father Name'] || row.father_name || null,
						father_mobile: row['Father Mobile'] || row.father_mobile || null,
						mother_name: row['Mother Name'] || row.mother_name || null,
						mother_mobile: row['Mother Mobile'] || row.mother_mobile || null,
						district: row['District'] || row.district || null,
						state: row['State'] || row.state || 'Tamil Nadu',
						batch_year: row['Batch Year'] || row.batch_year || null,
						status: row['Status'] || row.status || 'active',
						is_hostelite: typeof row.is_hostelite === 'boolean' ? row.is_hostelite : String(row['Hostelite (Yes/No)'] || row['Hostelite'] || 'No').toUpperCase() === 'YES',
						is_bus_user: typeof row.is_bus_user === 'boolean' ? row.is_bus_user : String(row['Bus User (Yes/No)'] || row['Bus User'] || 'No').toUpperCase() === 'YES',
					}

					const res = await fetch('/api/students', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(payload)
					})

					if (res.ok) {
						successCount++
					} else {
						errorCount++
					}
				} catch (err) {
					errorCount++
				}
			}

			await fetchStudents()

			toast({
				title: successCount > 0 ? '✅ Upload Complete' : '❌ Upload Failed',
				description: `${successCount} students uploaded successfully. ${errorCount} failed.`,
				className: successCount > 0 ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
			})

			e.target.value = ''
		} catch (error) {
			console.error('Upload error:', error)
			toast({
				title: '❌ Upload Failed',
				description: 'Failed to process file.',
				variant: 'destructive'
			})
		}
	}

	// Filter and search logic
	const filteredStudents = students.filter(student => {
		const matchesSearch =
			student.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			student.register_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			student.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			student.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			student.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			student.student_mobile?.includes(searchQuery)

		const matchesStatus = filterStatus === 'all' || student.status === filterStatus

		return matchesSearch && matchesStatus
	})

	// Pagination
	const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
	const startIndex = (currentPage - 1) * itemsPerPage
	const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage)

	// Stats
	const stats = {
		total: students.length,
		active: students.filter(s => s.status === 'active').length,
		inactive: students.filter(s => s.status === 'inactive').length,
		graduated: students.filter(s => s.status === 'graduated').length,
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<AppHeader>
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
									<BreadcrumbPage>Students</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				</AppHeader>

				<div className="flex flex-col gap-3 p-3 h-[calc(100vh-8rem)] overflow-hidden">
					{/* Stats Cards */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Total Students</p>
										<p className="text-xl font-bold text-blue-600">{stats.total}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
										<Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Active Students</p>
										<p className="text-xl font-bold text-green-600">{stats.active}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
										<UserCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Inactive Students</p>
										<p className="text-xl font-bold text-red-600">{stats.inactive}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
										<UserX className="h-3 w-3 text-red-600 dark:text-red-400" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Graduated</p>
										<p className="text-xl font-bold text-purple-600">{stats.graduated}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
										<GraduationCap className="h-3 w-3 text-purple-600 dark:text-purple-400" />
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Main Content */}
					<Card className="flex-1 flex flex-col min-h-0">
						<CardHeader className="flex-shrink-0 p-3">
							<div className="flex items-center justify-between mb-2">
								<h2 className="text-base font-bold">Students Management</h2>
							</div>

							<div className="flex flex-col sm:flex-row gap-2">
								{/* Search */}
								<div className="relative flex-1">
									<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search by roll number, name, email..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="pl-8 h-9"
									/>
								</div>

								{/* Status Filter */}
								<Select value={filterStatus} onValueChange={setFilterStatus}>
									<SelectTrigger className="w-[150px] h-9">
										<SelectValue placeholder="Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Status</SelectItem>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="inactive">Inactive</SelectItem>
										<SelectItem value="graduated">Graduated</SelectItem>
										<SelectItem value="suspended">Suspended</SelectItem>
									</SelectContent>
								</Select>

								{/* Action Buttons */}
								<div className="flex gap-1 flex-wrap">
									<Button variant="outline" size="sm" className="text-xs px-2 h-9" onClick={refreshStudents} disabled={loading}>
										<RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-9" onClick={downloadTemplate}>
										<FileSpreadsheet className="h-3 w-3 mr-1" />
										Template
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-9" onClick={downloadStudentsExcel}>
										<Download className="h-3 w-3 mr-1" />
										Excel
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-9" onClick={downloadStudentsJSON}>
										<FileJson className="h-3 w-3 mr-1" />
										JSON
									</Button>
									<Button variant="outline" size="sm" className="text-xs px-2 h-9" onClick={() => document.getElementById('file-upload')?.click()}>
										<Upload className="h-3 w-3 mr-1" />
										Import
									</Button>
									<input
										id="file-upload"
										type="file"
										accept=".xlsx,.xls,.json"
										onChange={handleFileUpload}
										className="hidden"
									/>
									<Button size="sm" className="text-xs px-2 h-9" onClick={openAdd}>
										<PlusCircle className="h-3 w-3 mr-1" />
										Add Student
									</Button>
								</div>
							</div>
						</CardHeader>

						<CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">
							<div className="rounded-md border overflow-hidden flex-1 flex flex-col min-h-0">
								<div className="flex-1 overflow-auto">
									<Table>
										<TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
											<TableRow>
												<TableHead className="font-bold text-xs">Roll Number</TableHead>
												<TableHead className="font-bold text-xs">Name</TableHead>
												<TableHead className="font-bold text-xs">Gender</TableHead>
												<TableHead className="font-bold text-xs">Mobile</TableHead>
												<TableHead className="font-bold text-xs">Email</TableHead>
												<TableHead className="font-bold text-xs">Batch</TableHead>
												<TableHead className="font-bold text-xs">Status</TableHead>
												<TableHead className="font-bold text-xs text-right">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{loading ? (
												<TableRow>
													<TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
														Loading students...
													</TableCell>
												</TableRow>
											) : paginatedStudents.length === 0 ? (
												<TableRow>
													<TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
														No students found
													</TableCell>
												</TableRow>
											) : (
												paginatedStudents.map((student) => (
													<TableRow key={student.id}>
														<TableCell className="font-medium text-xs">{student.roll_number}</TableCell>
														<TableCell className="text-xs">{student.full_name}</TableCell>
														<TableCell className="text-xs">{student.gender}</TableCell>
														<TableCell className="text-xs">{student.student_mobile || '-'}</TableCell>
														<TableCell className="text-xs">{student.student_email || '-'}</TableCell>
														<TableCell className="text-xs">{student.batch_year || '-'}</TableCell>
														<TableCell className="text-xs">
															<Badge variant={
																student.status === 'active' ? 'default' :
																student.status === 'graduated' ? 'secondary' :
																student.status === 'suspended' ? 'destructive' : 'outline'
															}>
																{student.status}
															</Badge>
														</TableCell>
														<TableCell className="text-right">
															<div className="flex gap-1 justify-end">
																<Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(student)}>
																	<Edit className="h-3 w-3" />
																</Button>
																<Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => {
																	setDeleteStudentId(student.id)
																	setDeleteDialogOpen(true)
																}}>
																	<Trash2 className="h-3 w-3" />
																</Button>
															</div>
														</TableCell>
													</TableRow>
												))
											)}
										</TableBody>
									</Table>
								</div>

								{/* Pagination */}
								{filteredStudents.length > 0 && (
									<div className="flex items-center justify-between border-t px-4 py-2 bg-slate-50 dark:bg-slate-900/50">
										<div className="text-xs text-muted-foreground">
											Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
										</div>
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
												disabled={currentPage === 1}
												className="h-7"
											>
												<ChevronLeft className="h-3 w-3" />
											</Button>
											<span className="text-xs font-medium">
												Page {currentPage} of {totalPages}
											</span>
											<Button
												variant="outline"
												size="sm"
												onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
												disabled={currentPage === totalPages}
												className="h-7"
											>
												<ChevronRight className="h-3 w-3" />
											</Button>
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Add/Edit Sheet */}
				<Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) resetForm(); setSheetOpen(o) }}>
					<SheetContent className="sm:max-w-[900px] overflow-y-auto">
						<SheetHeader>
							<SheetTitle className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
								{editing ? 'Edit Student' : 'Add New Student'}
							</SheetTitle>
						</SheetHeader>

						<Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-4">
							<TabsList className="grid w-full grid-cols-4">
								<TabsTrigger value="basic">Basic Info</TabsTrigger>
								<TabsTrigger value="contact">Contact</TabsTrigger>
								<TabsTrigger value="academic">Academic</TabsTrigger>
								<TabsTrigger value="other">Other</TabsTrigger>
							</TabsList>

							{/* Basic Info Tab */}
							<TabsContent value="basic" className="space-y-4 mt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="text-sm font-semibold">Roll Number <span className="text-red-500">*</span></Label>
										<Input
											value={formData.roll_number}
											onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
											className={`h-10 ${errors.roll_number ? 'border-destructive' : ''}`}
											placeholder="e.g., 24CS001"
										/>
										{errors.roll_number && <p className="text-xs text-destructive">{errors.roll_number}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Register Number</Label>
										<Input
											value={formData.register_number}
											onChange={(e) => setFormData({ ...formData, register_number: e.target.value })}
											className="h-10"
											placeholder="e.g., 412124CS001"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">First Name <span className="text-red-500">*</span></Label>
										<Input
											value={formData.first_name}
											onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
											className={`h-10 ${errors.first_name ? 'border-destructive' : ''}`}
										/>
										{errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Last Name</Label>
										<Input
											value={formData.last_name}
											onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Initial</Label>
										<Input
											value={formData.initial}
											onChange={(e) => setFormData({ ...formData, initial: e.target.value })}
											className="h-10"
											placeholder="e.g., S"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Date of Birth <span className="text-red-500">*</span></Label>
										<Input
											type="date"
											value={formData.date_of_birth}
											onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
											className={`h-10 ${errors.date_of_birth ? 'border-destructive' : ''}`}
										/>
										{errors.date_of_birth && <p className="text-xs text-destructive">{errors.date_of_birth}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Gender <span className="text-red-500">*</span></Label>
										<Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
											<SelectTrigger className={`h-10 ${errors.gender ? 'border-destructive' : ''}`}>
												<SelectValue placeholder="Select gender" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Male">Male</SelectItem>
												<SelectItem value="Female">Female</SelectItem>
												<SelectItem value="Other">Other</SelectItem>
												<SelectItem value="Transgender">Transgender</SelectItem>
											</SelectContent>
										</Select>
										{errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Blood Group</Label>
										<Select value={formData.blood_group} onValueChange={(v) => setFormData({ ...formData, blood_group: v })}>
											<SelectTrigger className="h-10">
												<SelectValue placeholder="Select blood group" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="A+">A+</SelectItem>
												<SelectItem value="A-">A-</SelectItem>
												<SelectItem value="B+">B+</SelectItem>
												<SelectItem value="B-">B-</SelectItem>
												<SelectItem value="O+">O+</SelectItem>
												<SelectItem value="O-">O-</SelectItem>
												<SelectItem value="AB+">AB+</SelectItem>
												<SelectItem value="AB-">AB-</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</TabsContent>

							{/* Contact Tab */}
							<TabsContent value="contact" className="space-y-4 mt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="text-sm font-semibold">Student Mobile</Label>
										<Input
											value={formData.student_mobile}
											onChange={(e) => setFormData({ ...formData, student_mobile: e.target.value })}
											className="h-10"
											placeholder="10-digit mobile"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Student Email</Label>
										<Input
											type="email"
											value={formData.student_email}
											onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
											className="h-10"
											placeholder="student@example.com"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">College Email</Label>
										<Input
											type="email"
											value={formData.college_email}
											onChange={(e) => setFormData({ ...formData, college_email: e.target.value })}
											className="h-10"
											placeholder="student@college.edu"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Father Name</Label>
										<Input
											value={formData.father_name}
											onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Father Mobile</Label>
										<Input
											value={formData.father_mobile}
											onChange={(e) => setFormData({ ...formData, father_mobile: e.target.value })}
											className="h-10"
											placeholder="10-digit mobile"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Mother Name</Label>
										<Input
											value={formData.mother_name}
											onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Mother Mobile</Label>
										<Input
											value={formData.mother_mobile}
											onChange={(e) => setFormData({ ...formData, mother_mobile: e.target.value })}
											className="h-10"
											placeholder="10-digit mobile"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">District</Label>
										<Input
											value={formData.district}
											onChange={(e) => setFormData({ ...formData, district: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">State</Label>
										<Input
											value={formData.state}
											onChange={(e) => setFormData({ ...formData, state: e.target.value })}
											className="h-10"
										/>
									</div>
								</div>
							</TabsContent>

							{/* Academic Tab */}
							<TabsContent value="academic" className="space-y-4 mt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="text-sm font-semibold">Institution ID <span className="text-red-500">*</span></Label>
										<Input
											value={formData.institution_id}
											onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
											className={`h-10 ${errors.institution_id ? 'border-destructive' : ''}`}
											placeholder="Institution UUID"
										/>
										{errors.institution_id && <p className="text-xs text-destructive">{errors.institution_id}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Department ID <span className="text-red-500">*</span></Label>
										<Input
											value={formData.department_id}
											onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
											className={`h-10 ${errors.department_id ? 'border-destructive' : ''}`}
											placeholder="Department UUID"
										/>
										{errors.department_id && <p className="text-xs text-destructive">{errors.department_id}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Program ID <span className="text-red-500">*</span></Label>
										<Input
											value={formData.program_id}
											onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
											className={`h-10 ${errors.program_id ? 'border-destructive' : ''}`}
											placeholder="Program UUID"
										/>
										{errors.program_id && <p className="text-xs text-destructive">{errors.program_id}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Semester ID <span className="text-red-500">*</span></Label>
										<Input
											value={formData.semester_id}
											onChange={(e) => setFormData({ ...formData, semester_id: e.target.value })}
											className={`h-10 ${errors.semester_id ? 'border-destructive' : ''}`}
											placeholder="Semester UUID"
										/>
										{errors.semester_id && <p className="text-xs text-destructive">{errors.semester_id}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Academic Year ID <span className="text-red-500">*</span></Label>
										<Input
											value={formData.academic_year_id}
											onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
											className={`h-10 ${errors.academic_year_id ? 'border-destructive' : ''}`}
											placeholder="Academic Year UUID"
										/>
										{errors.academic_year_id && <p className="text-xs text-destructive">{errors.academic_year_id}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Section ID</Label>
										<Input
											value={formData.section_id}
											onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
											className="h-10"
											placeholder="Section UUID (optional)"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Batch Year</Label>
										<Input
											type="number"
											value={formData.batch_year}
											onChange={(e) => setFormData({ ...formData, batch_year: e.target.value })}
											className="h-10"
											placeholder="e.g., 2024"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Status</Label>
										<Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
											<SelectTrigger className="h-10">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="active">Active</SelectItem>
												<SelectItem value="inactive">Inactive</SelectItem>
												<SelectItem value="suspended">Suspended</SelectItem>
												<SelectItem value="graduated">Graduated</SelectItem>
												<SelectItem value="dropout">Dropout</SelectItem>
												<SelectItem value="transferred">Transferred</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</TabsContent>

							{/* Other Tab */}
							<TabsContent value="other" className="space-y-4 mt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="text-sm font-semibold">Nationality</Label>
										<Input
											value={formData.nationality}
											onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Religion</Label>
										<Input
											value={formData.religion}
											onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Community</Label>
										<Input
											value={formData.community}
											onChange={(e) => setFormData({ ...formData, community: e.target.value })}
											className="h-10"
											placeholder="e.g., BC, MBC, SC, ST, OC"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Caste</Label>
										<Input
											value={formData.caste}
											onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Quota</Label>
										<Input
											value={formData.quota}
											onChange={(e) => setFormData({ ...formData, quota: e.target.value })}
											className="h-10"
											placeholder="e.g., Government, Management"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Category</Label>
										<Input
											value={formData.category}
											onChange={(e) => setFormData({ ...formData, category: e.target.value })}
											className="h-10"
											placeholder="e.g., General, OBC, SC, ST"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">First Graduate</Label>
										<div className="flex items-center gap-3 h-10">
											<button
												type="button"
												onClick={() => setFormData({ ...formData, first_graduate: !formData.first_graduate })}
												className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.first_graduate ? 'bg-green-500' : 'bg-gray-300'}`}
											>
												<span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.first_graduate ? 'translate-x-6' : 'translate-x-1'}`} />
											</button>
											<span className={`text-sm font-medium ${formData.first_graduate ? 'text-green-600' : 'text-gray-500'}`}>
												{formData.first_graduate ? 'Yes' : 'No'}
											</span>
										</div>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Hostelite</Label>
										<div className="flex items-center gap-3 h-10">
											<button
												type="button"
												onClick={() => setFormData({ ...formData, is_hostelite: !formData.is_hostelite })}
												className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_hostelite ? 'bg-green-500' : 'bg-gray-300'}`}
											>
												<span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_hostelite ? 'translate-x-6' : 'translate-x-1'}`} />
											</button>
											<span className={`text-sm font-medium ${formData.is_hostelite ? 'text-green-600' : 'text-gray-500'}`}>
												{formData.is_hostelite ? 'Yes' : 'No'}
											</span>
										</div>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Bus User</Label>
										<div className="flex items-center gap-3 h-10">
											<button
												type="button"
												onClick={() => setFormData({ ...formData, is_bus_user: !formData.is_bus_user })}
												className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_bus_user ? 'bg-green-500' : 'bg-gray-300'}`}
											>
												<span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_bus_user ? 'translate-x-6' : 'translate-x-1'}`} />
											</button>
											<span className={`text-sm font-medium ${formData.is_bus_user ? 'text-green-600' : 'text-gray-500'}`}>
												{formData.is_bus_user ? 'Yes' : 'No'}
											</span>
										</div>
									</div>

									<div className="space-y-2 md:col-span-2">
										<Label className="text-sm font-semibold">Photo URL</Label>
										<Input
											value={formData.photo_url}
											onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
											className="h-10"
											placeholder="https://example.com/photo.jpg"
										/>
									</div>
								</div>
							</TabsContent>
						</Tabs>

						<div className="flex justify-end gap-2 mt-6 pt-4 border-t">
							<Button variant="outline" onClick={() => setSheetOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleSave}>
								{editing ? 'Update' : 'Create'} Student
							</Button>
						</div>
					</SheetContent>
				</Sheet>

				{/* Delete Confirmation Dialog */}
				<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This will permanently delete this student record. This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<AppFooter />
			</SidebarInset>
		</SidebarProvider>
	)
}
