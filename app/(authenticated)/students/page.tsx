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

// Comprehensive Student type based on full schema
type Student = {
	// PRIMARY IDENTIFIERS
	id: string
	application_id?: string
	admission_id?: string
	roll_number: string
	register_number?: string

	// BASIC INFORMATION
	first_name: string
	last_name?: string
	initial?: string
	full_name?: string
	name_in_tamil?: string
	date_of_birth: string
	age?: number
	gender: string
	blood_group?: string

	// CONTACT INFORMATION
	student_mobile?: string
	student_email?: string
	college_email?: string
	telephone_number?: string

	// PERMANENT ADDRESS
	permanent_address_door_no?: string
	permanent_address_street?: string
	permanent_address_village?: string
	permanent_address_post_office?: string
	permanent_address_taluk?: string
	permanent_address_district?: string
	permanent_address_state?: string
	permanent_address_country?: string
	permanent_address_pin_code?: string

	// ACADEMIC ASSIGNMENT
	institution_id: string
	institution_code?: string
	degree_id?: string
	degree_code?: string
	department_id: string
	department_code?: string
	program_id: string
	program_code?: string
	semester_id: string
	semester_code?: string
	section_id?: string
	section_code?: string
	academic_year_id: string
	academic_year?: string
	batch_year?: number

	// DEMOGRAPHICS
	nationality: string
	religion?: string
	community?: string
	caste?: string
	sub_caste?: string
	aadhar_number?: string
	emis_number?: string

	// SPECIAL STATUS & CATEGORIES
	first_graduate: boolean
	quota?: string
	category?: string
	disability_type?: string
	disability_percentage?: number
	sports_quota?: string
	ncc_number?: string
	nss_number?: string

	// FAMILY DETAILS
	father_name?: string
	father_occupation?: string
	father_education?: string
	father_mobile?: string
	father_email?: string
	mother_name?: string
	mother_occupation?: string
	mother_education?: string
	mother_mobile?: string
	mother_email?: string
	guardian_name?: string
	guardian_relation?: string
	guardian_mobile?: string
	guardian_email?: string
	annual_income?: number

	// 10TH STANDARD
	tenth_last_school?: string
	tenth_board_of_study?: string
	tenth_school_type?: string
	tenth_school_name?: string
	tenth_school_place?: string
	tenth_board?: string
	tenth_mode?: string
	tenth_medium?: string
	tenth_register_number?: string
	tenth_passing_month?: string
	tenth_passing_year?: number
	tenth_marks?: any // JSONB

	// 11TH STANDARD
	eleventh_last_school?: string
	eleventh_school_type?: string
	eleventh_school_name?: string
	eleventh_school_place?: string
	eleventh_board?: string
	eleventh_mode?: string
	eleventh_medium?: string
	eleventh_register_number?: string
	eleventh_passing_month?: string
	eleventh_passing_year?: number
	eleventh_marks?: any // JSONB

	// 12TH STANDARD
	twelfth_last_school?: string
	twelfth_school_type?: string
	twelfth_school_name?: string
	twelfth_school_place?: string
	twelfth_board?: string
	twelfth_mode?: string
	twelfth_medium?: string
	twelfth_register_number?: string
	twelfth_passing_month?: string
	twelfth_passing_year?: number
	twelfth_marks?: any // JSONB
	twelfth_subject_marks?: any // JSONB

	// ENTRANCE EXAM
	entry_type?: string
	medical_cutoff_marks?: number
	engineering_cutoff_marks?: number
	neet_roll_number?: string
	neet_score?: number
	counseling_applied?: boolean
	counseling_number?: string

	// UG DEGREE (for PG students)
	qualifying_degree?: string
	ug_last_college?: string
	ug_university?: string
	ug_passing_month?: string
	ug_passing_year?: number
	ug_qualification_type?: string
	ug_education_pattern?: string
	ug_major_marks?: number
	ug_major_max_marks?: number
	ug_major_percentage?: number
	ug_allied_marks?: number
	ug_allied_max_marks?: number
	ug_allied_percentage?: number
	ug_total_marks?: number
	ug_total_max_marks?: number
	ug_total_percentage?: number
	ug_class_obtained?: string
	ug_overall_grade?: string

	// ACCOMMODATION & TRANSPORT
	accommodation_type?: string
	hostel_type?: string
	food_type?: string
	bus_required?: boolean
	bus_route?: string
	bus_pickup_location?: string
	is_hostelite: boolean
	is_bus_user: boolean

	// FINANCIAL DETAILS
	bank_beneficiary_name?: string
	bank_account_number?: string
	bank_ifsc_code?: string
	bank_name?: string
	bank_branch?: string
	fixed_fee?: number
	fee_payment_date?: string
	fee_amount_paid?: number

	// DOCUMENTS & CERTIFICATES
	original_certificates_submitted?: any // JSONB array
	xerox_certificates_submitted?: any // JSONB array

	// REFERENCE
	reference_type?: string
	reference_name?: string
	reference_contact?: string

	// MEDIA
	student_photo_url?: string
	photo_url?: string

	// STATUS & FLAGS
	status: string
	admission_status?: string
	is_profile_complete: boolean

	// AUDIT FIELDS
	created_at: string
	updated_at?: string
	created_by?: string
	updated_by?: string
	deleted_at?: string
	deleted_by?: string
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

	// Comprehensive form state
	const [formData, setFormData] = useState({
		// PRIMARY IDENTIFIERS
		roll_number: "",
		register_number: "",
		application_id: "",
		admission_id: "",

		// BASIC INFORMATION
		first_name: "",
		last_name: "",
		initial: "",
		name_in_tamil: "",
		date_of_birth: "",
		gender: "",
		blood_group: "",

		// CONTACT INFORMATION
		student_mobile: "",
		student_email: "",
		college_email: "",
		telephone_number: "",

		// PERMANENT ADDRESS
		permanent_address_door_no: "",
		permanent_address_street: "",
		permanent_address_village: "",
		permanent_address_post_office: "",
		permanent_address_taluk: "",
		permanent_address_district: "",
		permanent_address_state: "Tamil Nadu",
		permanent_address_country: "India",
		permanent_address_pin_code: "",

		// ACADEMIC ASSIGNMENT
		institution_id: "",
		department_id: "",
		program_id: "",
		degree_id: "",
		semester_id: "",
		section_id: "",
		academic_year_id: "",
		batch_year: "",

		// DEMOGRAPHICS
		nationality: "Indian",
		religion: "",
		community: "",
		caste: "",
		sub_caste: "",
		aadhar_number: "",
		emis_number: "",

		// SPECIAL STATUS & CATEGORIES
		first_graduate: false,
		quota: "",
		category: "",
		disability_type: "",
		disability_percentage: "",
		sports_quota: "",
		ncc_number: "",
		nss_number: "",

		// FAMILY DETAILS
		father_name: "",
		father_occupation: "",
		father_education: "",
		father_mobile: "",
		father_email: "",
		mother_name: "",
		mother_occupation: "",
		mother_education: "",
		mother_mobile: "",
		mother_email: "",
		guardian_name: "",
		guardian_relation: "",
		guardian_mobile: "",
		guardian_email: "",
		annual_income: "",

		// 10TH STANDARD
		tenth_last_school: "",
		tenth_board_of_study: "",
		tenth_school_type: "",
		tenth_school_name: "",
		tenth_school_place: "",
		tenth_board: "",
		tenth_mode: "",
		tenth_medium: "",
		tenth_register_number: "",
		tenth_passing_month: "",
		tenth_passing_year: "",
		tenth_marks: "",

		// 11TH STANDARD
		eleventh_last_school: "",
		eleventh_school_type: "",
		eleventh_school_name: "",
		eleventh_school_place: "",
		eleventh_board: "",
		eleventh_mode: "",
		eleventh_medium: "",
		eleventh_register_number: "",
		eleventh_passing_month: "",
		eleventh_passing_year: "",
		eleventh_marks: "",

		// 12TH STANDARD
		twelfth_last_school: "",
		twelfth_school_type: "",
		twelfth_school_name: "",
		twelfth_school_place: "",
		twelfth_board: "",
		twelfth_mode: "",
		twelfth_medium: "",
		twelfth_register_number: "",
		twelfth_passing_month: "",
		twelfth_passing_year: "",
		twelfth_marks: "",
		twelfth_subject_marks: "",

		// ENTRANCE EXAM
		entry_type: "",
		medical_cutoff_marks: "",
		engineering_cutoff_marks: "",
		neet_roll_number: "",
		neet_score: "",
		counseling_applied: false,
		counseling_number: "",

		// UG DEGREE (for PG students)
		qualifying_degree: "",
		ug_last_college: "",
		ug_university: "",
		ug_passing_month: "",
		ug_passing_year: "",
		ug_qualification_type: "",
		ug_education_pattern: "",
		ug_major_marks: "",
		ug_major_max_marks: "",
		ug_major_percentage: "",
		ug_allied_marks: "",
		ug_allied_max_marks: "",
		ug_allied_percentage: "",
		ug_total_marks: "",
		ug_total_max_marks: "",
		ug_total_percentage: "",
		ug_class_obtained: "",
		ug_overall_grade: "",

		// ACCOMMODATION & TRANSPORT
		accommodation_type: "",
		hostel_type: "",
		food_type: "",
		bus_required: false,
		bus_route: "",
		bus_pickup_location: "",
		is_hostelite: false,
		is_bus_user: false,

		// FINANCIAL DETAILS
		bank_beneficiary_name: "",
		bank_account_number: "",
		bank_ifsc_code: "",
		bank_name: "",
		bank_branch: "",
		fixed_fee: "",
		fee_payment_date: "",
		fee_amount_paid: "",

		// DOCUMENTS & CERTIFICATES (JSONB)
		original_certificates_submitted: "",
		xerox_certificates_submitted: "",

		// REFERENCE
		reference_type: "",
		reference_name: "",
		reference_contact: "",

		// MEDIA
		student_photo_url: "",
		photo_url: "",

		// STATUS
		status: "active",
		admission_status: "",
		is_profile_complete: false,
	})

	const [errors, setErrors] = useState<Record<string, string>>({})

	// Dropdown options state
	const [institutions, setInstitutions] = useState<any[]>([])
	const [departments, setDepartments] = useState<any[]>([])
	const [programs, setPrograms] = useState<any[]>([])
	const [degrees, setDegrees] = useState<any[]>([])
	const [semesters, setSemesters] = useState<any[]>([])
	const [sections, setSections] = useState<any[]>([])
	const [academicYears, setAcademicYears] = useState<any[]>([])
	const [isLoadingEdit, setIsLoadingEdit] = useState(false)

	// Fetch students from API
	useEffect(() => {
		fetchStudents()
		fetchDropdownData()
	}, [])

	const fetchDropdownData = async () => {
		try {
			// Fetch institutions and academic years (not dependent on other fields)
			const [instRes, ayRes] = await Promise.all([
				fetch('/api/institutions'),
				fetch('/api/academic-year')
			])

			if (instRes.ok) setInstitutions(await instRes.json())
			if (ayRes.ok) setAcademicYears(await ayRes.json())
		} catch (error) {
			console.error('Error fetching dropdown data:', error)
		}
	}

	// Fetch departments when institution changes
	useEffect(() => {
		console.log('🔄 Institution useEffect triggered:', {
			institution_id: formData.institution_id,
			isLoadingEdit,
			institutionsLoaded: institutions.length
		})

		if (formData.institution_id && !isLoadingEdit) {
			console.log('✅ Calling fetchDepartments')
			fetchDepartments(formData.institution_id)
		} else if (!formData.institution_id && !isLoadingEdit) {
			console.log('🧹 Clearing departments and dependent fields')
			setDepartments([])
			setPrograms([])
			setDegrees([])
			setSemesters([])
			setSections([])
			// Clear dependent fields only if not loading edit
			setFormData(prev => ({
				...prev,
				department_id: '',
				program_id: '',
				degree_id: '',
				semester_id: '',
				section_id: ''
			}))
		}
	}, [formData.institution_id, institutions])

	// Fetch programs when department changes
	useEffect(() => {
		if (formData.department_id && !isLoadingEdit) {
			fetchPrograms(formData.department_id)
		} else if (!formData.department_id && !isLoadingEdit) {
			setPrograms([])
			setDegrees([])
			setSemesters([])
			setSections([])
			// Clear dependent fields only if not loading edit
			setFormData(prev => ({
				...prev,
				program_id: '',
				degree_id: '',
				semester_id: '',
				section_id: ''
			}))
		}
	}, [formData.department_id])

	// Fetch degrees, semesters, and sections when program changes
	useEffect(() => {
		if (formData.program_id && !isLoadingEdit) {
			fetchDegrees(formData.program_id)
			fetchSemesters(formData.program_id)
			fetchSections(formData.program_id)
		} else if (!formData.program_id && !isLoadingEdit) {
			setDegrees([])
			setSemesters([])
			setSections([])
			// Clear dependent fields only if not loading edit
			setFormData(prev => ({
				...prev,
				degree_id: '',
				semester_id: '',
				section_id: ''
			}))
		}
	}, [formData.program_id])

	const fetchDepartments = async (institutionId: string) => {
		try {
			// First get the institution to retrieve its code
			const institution = institutions.find(inst => inst.id === institutionId)
			console.log('🔍 fetchDepartments called with institutionId:', institutionId)
			console.log('🏛️ Found institution:', institution)

			if (!institution) {
				console.error('❌ Institution not found in state. Available institutions:', institutions)
				return
			}

			// Filter by institution_code only (departments table doesn't have institution_id)
			const url = `/api/departments?institution_code=${institution.institution_code}`
			console.log('📡 Fetching departments from:', url)

			const res = await fetch(url)
			console.log('📥 Response status:', res.status)

			if (res.ok) {
				const data = await res.json()
				console.log('✅ Departments fetched:', data.length, 'items', data)
				setDepartments(data)
			} else {
				const errorText = await res.text()
				console.error('❌ Failed to fetch departments:', res.status, errorText)
			}
		} catch (error) {
			console.error('❌ Error fetching departments:', error)
		}
	}

	const fetchPrograms = async (departmentId: string) => {
		try {
			// Get department to retrieve its code
			const department = departments.find(dept => dept.id === departmentId)
			if (!department) {
				console.error('Department not found')
				return
			}

			// Filter by department_code only (programs table uses offering_department_code)
			const res = await fetch(`/api/program?department_code=${department.department_code}`)
			if (res.ok) {
				const data = await res.json()
				setPrograms(data)
			}
		} catch (error) {
			console.error('Error fetching programs:', error)
		}
	}

	const fetchDegrees = async (programId: string) => {
		try {
			const res = await fetch(`/api/degrees?program_id=${programId}`)
			if (res.ok) {
				const data = await res.json()
				setDegrees(data)
			}
		} catch (error) {
			console.error('Error fetching degrees:', error)
		}
	}

	const fetchSemesters = async (programId: string) => {
		try {
			const res = await fetch(`/api/semesters?program_id=${programId}`)
			if (res.ok) {
				const data = await res.json()
				setSemesters(data)
			}
		} catch (error) {
			console.error('Error fetching semesters:', error)
		}
	}

	const fetchSections = async (programId: string) => {
		try {
			const res = await fetch(`/api/section?program_id=${programId}`)
			if (res.ok) {
				const data = await res.json()
				setSections(data)
			}
		} catch (error) {
			console.error('Error fetching sections:', error)
		}
	}

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
			// PRIMARY IDENTIFIERS
			roll_number: "",
			register_number: "",
			application_id: "",
			admission_id: "",

			// BASIC INFORMATION
			first_name: "",
			last_name: "",
			initial: "",
			name_in_tamil: "",
			date_of_birth: "",
			gender: "",
			blood_group: "",

			// CONTACT INFORMATION
			student_mobile: "",
			student_email: "",
			college_email: "",
			telephone_number: "",

			// PERMANENT ADDRESS
			permanent_address_door_no: "",
			permanent_address_street: "",
			permanent_address_village: "",
			permanent_address_post_office: "",
			permanent_address_taluk: "",
			permanent_address_district: "",
			permanent_address_state: "Tamil Nadu",
			permanent_address_country: "India",
			permanent_address_pin_code: "",

			// ACADEMIC ASSIGNMENT
			institution_id: "",
			department_id: "",
			program_id: "",
			degree_id: "",
			semester_id: "",
			section_id: "",
			academic_year_id: "",
			batch_year: "",

			// DEMOGRAPHICS
			nationality: "Indian",
			religion: "",
			community: "",
			caste: "",
			sub_caste: "",
			aadhar_number: "",
			emis_number: "",

			// SPECIAL STATUS & CATEGORIES
			first_graduate: false,
			quota: "",
			category: "",
			disability_type: "",
			disability_percentage: "",
			sports_quota: "",
			ncc_number: "",
			nss_number: "",

			// FAMILY DETAILS
			father_name: "",
			father_occupation: "",
			father_education: "",
			father_mobile: "",
			father_email: "",
			mother_name: "",
			mother_occupation: "",
			mother_education: "",
			mother_mobile: "",
			mother_email: "",
			guardian_name: "",
			guardian_relation: "",
			guardian_mobile: "",
			guardian_email: "",
			annual_income: "",

			// 10TH STANDARD
			tenth_last_school: "",
			tenth_board_of_study: "",
			tenth_school_type: "",
			tenth_school_name: "",
			tenth_school_place: "",
			tenth_board: "",
			tenth_mode: "",
			tenth_medium: "",
			tenth_register_number: "",
			tenth_passing_month: "",
			tenth_passing_year: "",
			tenth_marks: "",

			// 11TH STANDARD
			eleventh_last_school: "",
			eleventh_school_type: "",
			eleventh_school_name: "",
			eleventh_school_place: "",
			eleventh_board: "",
			eleventh_mode: "",
			eleventh_medium: "",
			eleventh_register_number: "",
			eleventh_passing_month: "",
			eleventh_passing_year: "",
			eleventh_marks: "",

			// 12TH STANDARD
			twelfth_last_school: "",
			twelfth_school_type: "",
			twelfth_school_name: "",
			twelfth_school_place: "",
			twelfth_board: "",
			twelfth_mode: "",
			twelfth_medium: "",
			twelfth_register_number: "",
			twelfth_passing_month: "",
			twelfth_passing_year: "",
			twelfth_marks: "",
			twelfth_subject_marks: "",

			// ENTRANCE EXAM
			entry_type: "",
			medical_cutoff_marks: "",
			engineering_cutoff_marks: "",
			neet_roll_number: "",
			neet_score: "",
			counseling_applied: false,
			counseling_number: "",

			// UG DEGREE (for PG students)
			qualifying_degree: "",
			ug_last_college: "",
			ug_university: "",
			ug_passing_month: "",
			ug_passing_year: "",
			ug_qualification_type: "",
			ug_education_pattern: "",
			ug_major_marks: "",
			ug_major_max_marks: "",
			ug_major_percentage: "",
			ug_allied_marks: "",
			ug_allied_max_marks: "",
			ug_allied_percentage: "",
			ug_total_marks: "",
			ug_total_max_marks: "",
			ug_total_percentage: "",
			ug_class_obtained: "",
			ug_overall_grade: "",

			// ACCOMMODATION & TRANSPORT
			accommodation_type: "",
			hostel_type: "",
			food_type: "",
			bus_required: false,
			bus_route: "",
			bus_pickup_location: "",
			is_hostelite: false,
			is_bus_user: false,

			// FINANCIAL DETAILS
			bank_beneficiary_name: "",
			bank_account_number: "",
			bank_ifsc_code: "",
			bank_name: "",
			bank_branch: "",
			fixed_fee: "",
			fee_payment_date: "",
			fee_amount_paid: "",

			// DOCUMENTS & CERTIFICATES (JSONB)
			original_certificates_submitted: "",
			xerox_certificates_submitted: "",

			// REFERENCE
			reference_type: "",
			reference_name: "",
			reference_contact: "",

			// MEDIA
			student_photo_url: "",
			photo_url: "",

			// STATUS
			status: "active",
			admission_status: "",
			is_profile_complete: false,
		})
		setErrors({})
		setEditing(null)
		setCurrentTab("basic")
	}

	const openAdd = () => {
		resetForm()
		setSheetOpen(true)
	}

	const openEdit = async (student: Student) => {
		setEditing(student)
		setIsLoadingEdit(true)

		// Load dependent dropdowns based on existing student data
		if (student.institution_id) {
			await fetchDepartments(student.institution_id)
		}
		if (student.department_id) {
			await fetchPrograms(student.department_id)
		}
		if (student.program_id) {
			await fetchDegrees(student.program_id)
			await fetchSemesters(student.program_id)
			await fetchSections(student.program_id)
		}

		setFormData({
			// PRIMARY IDENTIFIERS
			roll_number: student.roll_number || "",
			register_number: student.register_number || "",
			application_id: student.application_id || "",
			admission_id: student.admission_id || "",

			// BASIC INFORMATION
			first_name: student.first_name || "",
			last_name: student.last_name || "",
			initial: student.initial || "",
			name_in_tamil: student.name_in_tamil || "",
			date_of_birth: student.date_of_birth || "",
			gender: student.gender || "",
			blood_group: student.blood_group || "",

			// CONTACT INFORMATION
			student_mobile: student.student_mobile || "",
			student_email: student.student_email || "",
			college_email: student.college_email || "",
			telephone_number: student.telephone_number || "",

			// PERMANENT ADDRESS
			permanent_address_door_no: student.permanent_address_door_no || "",
			permanent_address_street: student.permanent_address_street || "",
			permanent_address_village: student.permanent_address_village || "",
			permanent_address_post_office: student.permanent_address_post_office || "",
			permanent_address_taluk: student.permanent_address_taluk || "",
			permanent_address_district: student.permanent_address_district || "",
			permanent_address_state: student.permanent_address_state || "Tamil Nadu",
			permanent_address_country: student.permanent_address_country || "India",
			permanent_address_pin_code: student.permanent_address_pin_code || "",

			// ACADEMIC ASSIGNMENT
			institution_id: student.institution_id || "",
			department_id: student.department_id || "",
			program_id: student.program_id || "",
			degree_id: student.degree_id || "",
			semester_id: student.semester_id || "",
			section_id: student.section_id || "",
			academic_year_id: student.academic_year_id || "",
			batch_year: String(student.batch_year || ""),

			// DEMOGRAPHICS
			nationality: student.nationality || "Indian",
			religion: student.religion || "",
			community: student.community || "",
			caste: student.caste || "",
			sub_caste: student.sub_caste || "",
			aadhar_number: student.aadhar_number || "",
			emis_number: student.emis_number || "",

			// SPECIAL STATUS & CATEGORIES
			first_graduate: student.first_graduate || false,
			quota: student.quota || "",
			category: student.category || "",
			disability_type: student.disability_type || "",
			disability_percentage: String(student.disability_percentage || ""),
			sports_quota: student.sports_quota || "",
			ncc_number: student.ncc_number || "",
			nss_number: student.nss_number || "",

			// FAMILY DETAILS
			father_name: student.father_name || "",
			father_occupation: student.father_occupation || "",
			father_education: student.father_education || "",
			father_mobile: student.father_mobile || "",
			father_email: student.father_email || "",
			mother_name: student.mother_name || "",
			mother_occupation: student.mother_occupation || "",
			mother_education: student.mother_education || "",
			mother_mobile: student.mother_mobile || "",
			mother_email: student.mother_email || "",
			guardian_name: student.guardian_name || "",
			guardian_relation: student.guardian_relation || "",
			guardian_mobile: student.guardian_mobile || "",
			guardian_email: student.guardian_email || "",
			annual_income: String(student.annual_income || ""),

			// 10TH STANDARD
			tenth_last_school: student.tenth_last_school || "",
			tenth_board_of_study: student.tenth_board_of_study || "",
			tenth_school_type: student.tenth_school_type || "",
			tenth_school_name: student.tenth_school_name || "",
			tenth_school_place: student.tenth_school_place || "",
			tenth_board: student.tenth_board || "",
			tenth_mode: student.tenth_mode || "",
			tenth_medium: student.tenth_medium || "",
			tenth_register_number: student.tenth_register_number || "",
			tenth_passing_month: student.tenth_passing_month || "",
			tenth_passing_year: String(student.tenth_passing_year || ""),
			tenth_marks: student.tenth_marks ? JSON.stringify(student.tenth_marks) : "",

			// 11TH STANDARD
			eleventh_last_school: student.eleventh_last_school || "",
			eleventh_school_type: student.eleventh_school_type || "",
			eleventh_school_name: student.eleventh_school_name || "",
			eleventh_school_place: student.eleventh_school_place || "",
			eleventh_board: student.eleventh_board || "",
			eleventh_mode: student.eleventh_mode || "",
			eleventh_medium: student.eleventh_medium || "",
			eleventh_register_number: student.eleventh_register_number || "",
			eleventh_passing_month: student.eleventh_passing_month || "",
			eleventh_passing_year: String(student.eleventh_passing_year || ""),
			eleventh_marks: student.eleventh_marks ? JSON.stringify(student.eleventh_marks) : "",

			// 12TH STANDARD
			twelfth_last_school: student.twelfth_last_school || "",
			twelfth_school_type: student.twelfth_school_type || "",
			twelfth_school_name: student.twelfth_school_name || "",
			twelfth_school_place: student.twelfth_school_place || "",
			twelfth_board: student.twelfth_board || "",
			twelfth_mode: student.twelfth_mode || "",
			twelfth_medium: student.twelfth_medium || "",
			twelfth_register_number: student.twelfth_register_number || "",
			twelfth_passing_month: student.twelfth_passing_month || "",
			twelfth_passing_year: String(student.twelfth_passing_year || ""),
			twelfth_marks: student.twelfth_marks ? JSON.stringify(student.twelfth_marks) : "",
			twelfth_subject_marks: student.twelfth_subject_marks ? JSON.stringify(student.twelfth_subject_marks) : "",

			// ENTRANCE EXAM
			entry_type: student.entry_type || "",
			medical_cutoff_marks: String(student.medical_cutoff_marks || ""),
			engineering_cutoff_marks: String(student.engineering_cutoff_marks || ""),
			neet_roll_number: student.neet_roll_number || "",
			neet_score: String(student.neet_score || ""),
			counseling_applied: student.counseling_applied || false,
			counseling_number: student.counseling_number || "",

			// UG DEGREE (for PG students)
			qualifying_degree: student.qualifying_degree || "",
			ug_last_college: student.ug_last_college || "",
			ug_university: student.ug_university || "",
			ug_passing_month: student.ug_passing_month || "",
			ug_passing_year: String(student.ug_passing_year || ""),
			ug_qualification_type: student.ug_qualification_type || "",
			ug_education_pattern: student.ug_education_pattern || "",
			ug_major_marks: String(student.ug_major_marks || ""),
			ug_major_max_marks: String(student.ug_major_max_marks || ""),
			ug_major_percentage: String(student.ug_major_percentage || ""),
			ug_allied_marks: String(student.ug_allied_marks || ""),
			ug_allied_max_marks: String(student.ug_allied_max_marks || ""),
			ug_allied_percentage: String(student.ug_allied_percentage || ""),
			ug_total_marks: String(student.ug_total_marks || ""),
			ug_total_max_marks: String(student.ug_total_max_marks || ""),
			ug_total_percentage: String(student.ug_total_percentage || ""),
			ug_class_obtained: student.ug_class_obtained || "",
			ug_overall_grade: student.ug_overall_grade || "",

			// ACCOMMODATION & TRANSPORT
			accommodation_type: student.accommodation_type || "",
			hostel_type: student.hostel_type || "",
			food_type: student.food_type || "",
			bus_required: student.bus_required || false,
			bus_route: student.bus_route || "",
			bus_pickup_location: student.bus_pickup_location || "",
			is_hostelite: student.is_hostelite || false,
			is_bus_user: student.is_bus_user || false,

			// FINANCIAL DETAILS
			bank_beneficiary_name: student.bank_beneficiary_name || "",
			bank_account_number: student.bank_account_number || "",
			bank_ifsc_code: student.bank_ifsc_code || "",
			bank_name: student.bank_name || "",
			bank_branch: student.bank_branch || "",
			fixed_fee: String(student.fixed_fee || ""),
			fee_payment_date: student.fee_payment_date || "",
			fee_amount_paid: String(student.fee_amount_paid || ""),

			// DOCUMENTS & CERTIFICATES (JSONB)
			original_certificates_submitted: student.original_certificates_submitted ? JSON.stringify(student.original_certificates_submitted) : "",
			xerox_certificates_submitted: student.xerox_certificates_submitted ? JSON.stringify(student.xerox_certificates_submitted) : "",

			// REFERENCE
			reference_type: student.reference_type || "",
			reference_name: student.reference_name || "",
			reference_contact: student.reference_contact || "",

			// MEDIA
			student_photo_url: student.student_photo_url || student.photo_url || "",
			photo_url: student.photo_url || student.student_photo_url || "",

			// STATUS
			status: student.status || "active",
			admission_status: student.admission_status || "",
			is_profile_complete: student.is_profile_complete || false,
		})

		setIsLoadingEdit(false)
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
			// PRIMARY IDENTIFIERS
			'Roll Number': s.roll_number || '',
			'Register Number': s.register_number || '',
			'Application ID': s.application_id || '',
			'Admission ID': s.admission_id || '',

			// BASIC INFORMATION
			'First Name': s.first_name,
			'Last Name': s.last_name || '',
			'Initial': s.initial || '',
			'Name in Tamil': s.name_in_tamil || '',
			'Date of Birth': s.date_of_birth,
			'Age': s.age || '',
			'Gender': s.gender,
			'Blood Group': s.blood_group || '',

			// CONTACT INFORMATION
			'Student Mobile': s.student_mobile || '',
			'Student Email': s.student_email || '',
			'College Email': s.college_email || '',
			'Telephone': s.telephone_number || '',

			// PERMANENT ADDRESS
			'Address Door No': s.permanent_address_door_no || '',
			'Address Street': s.permanent_address_street || '',
			'Address Village': s.permanent_address_village || '',
			'Address Post Office': s.permanent_address_post_office || '',
			'Address Taluk': s.permanent_address_taluk || '',
			'Address District': s.permanent_address_district || '',
			'Address State': s.permanent_address_state || '',
			'Address Country': s.permanent_address_country || '',
			'Address PIN Code': s.permanent_address_pin_code || '',

			// ACADEMIC ASSIGNMENT
			'Institution Code': s.institution_code || '',
			'Department Code': s.department_code || '',
			'Program Code': s.program_code || '',
			'Degree Code': s.degree_code || '',
			'Semester Code': s.semester_code || '',
			'Section Code': s.section_code || '',
			'Academic Year': s.academic_year || '',
			'Batch Year': s.batch_year || '',
			'Status': s.status,

			// DEMOGRAPHICS
			'Nationality': s.nationality,
			'Religion': s.religion || '',
			'Community': s.community || '',
			'Caste': s.caste || '',
			'Sub Caste': s.sub_caste || '',
			'Aadhar Number': s.aadhar_number || '',
			'EMIS Number': s.emis_number || '',

			// SPECIAL STATUS & CATEGORIES
			'First Graduate': s.first_graduate ? 'Yes' : 'No',
			'Quota': s.quota || '',
			'Category': s.category || '',
			'Disability Type': s.disability_type || '',
			'Disability Percentage': s.disability_percentage || '',
			'Sports Quota': s.sports_quota || '',
			'NCC Number': s.ncc_number || '',
			'NSS Number': s.nss_number || '',

			// FAMILY DETAILS
			'Father Name': s.father_name || '',
			'Father Occupation': s.father_occupation || '',
			'Father Education': s.father_education || '',
			'Father Mobile': s.father_mobile || '',
			'Father Email': s.father_email || '',
			'Mother Name': s.mother_name || '',
			'Mother Occupation': s.mother_occupation || '',
			'Mother Education': s.mother_education || '',
			'Mother Mobile': s.mother_mobile || '',
			'Mother Email': s.mother_email || '',
			'Guardian Name': s.guardian_name || '',
			'Guardian Relation': s.guardian_relation || '',
			'Guardian Mobile': s.guardian_mobile || '',
			'Guardian Email': s.guardian_email || '',
			'Annual Income': s.annual_income || '',

			// 10TH STANDARD
			'10th School Name': s.tenth_school_name || '',
			'10th School Place': s.tenth_school_place || '',
			'10th Board': s.tenth_board || '',
			'10th Medium': s.tenth_medium || '',
			'10th Register Number': s.tenth_register_number || '',
			'10th Passing Year': s.tenth_passing_year || '',
			'10th Marks (JSON)': s.tenth_marks ? JSON.stringify(s.tenth_marks) : '',

			// 11TH STANDARD
			'11th School Name': s.eleventh_school_name || '',
			'11th School Place': s.eleventh_school_place || '',
			'11th Board': s.eleventh_board || '',
			'11th Passing Year': s.eleventh_passing_year || '',
			'11th Marks (JSON)': s.eleventh_marks ? JSON.stringify(s.eleventh_marks) : '',

			// 12TH STANDARD
			'12th School Name': s.twelfth_school_name || '',
			'12th School Place': s.twelfth_school_place || '',
			'12th Board': s.twelfth_board || '',
			'12th Register Number': s.twelfth_register_number || '',
			'12th Passing Year': s.twelfth_passing_year || '',
			'12th Marks (JSON)': s.twelfth_marks ? JSON.stringify(s.twelfth_marks) : '',
			'12th Subject Marks (JSON)': s.twelfth_subject_marks ? JSON.stringify(s.twelfth_subject_marks) : '',

			// ENTRANCE EXAM
			'Entry Type': s.entry_type || '',
			'Medical Cutoff': s.medical_cutoff_marks || '',
			'Engineering Cutoff': s.engineering_cutoff_marks || '',
			'NEET Roll Number': s.neet_roll_number || '',
			'NEET Score': s.neet_score || '',
			'Counseling Applied': s.counseling_applied ? 'Yes' : 'No',
			'Counseling Number': s.counseling_number || '',

			// UG DEGREE (for PG students)
			'UG Qualifying Degree': s.qualifying_degree || '',
			'UG College': s.ug_last_college || '',
			'UG University': s.ug_university || '',
			'UG Passing Year': s.ug_passing_year || '',
			'UG Total Percentage': s.ug_total_percentage || '',
			'UG Class Obtained': s.ug_class_obtained || '',

			// ACCOMMODATION & TRANSPORT
			'Accommodation Type': s.accommodation_type || '',
			'Hostel Type': s.hostel_type || '',
			'Food Type': s.food_type || '',
			'Bus Required': s.bus_required ? 'Yes' : 'No',
			'Bus Route': s.bus_route || '',
			'Bus Pickup Location': s.bus_pickup_location || '',
			'Hostelite': s.is_hostelite ? 'Yes' : 'No',
			'Bus User': s.is_bus_user ? 'Yes' : 'No',

			// FINANCIAL DETAILS
			'Bank Beneficiary Name': s.bank_beneficiary_name || '',
			'Bank Account Number': s.bank_account_number || '',
			'Bank IFSC Code': s.bank_ifsc_code || '',
			'Bank Name': s.bank_name || '',
			'Bank Branch': s.bank_branch || '',
			'Fixed Fee': s.fixed_fee || '',
			'Fee Payment Date': s.fee_payment_date || '',
			'Fee Amount Paid': s.fee_amount_paid || '',

			// DOCUMENTS & REFERENCE
			'Original Certificates (JSON)': s.original_certificates_submitted ? JSON.stringify(s.original_certificates_submitted) : '',
			'Xerox Certificates (JSON)': s.xerox_certificates_submitted ? JSON.stringify(s.xerox_certificates_submitted) : '',
			'Reference Type': s.reference_type || '',
			'Reference Name': s.reference_name || '',
			'Reference Contact': s.reference_contact || '',

			// MEDIA
			'Student Photo URL': s.student_photo_url || s.photo_url || '',

			// STATUS
			'Admission Status': s.admission_status || '',
			'Profile Complete': s.is_profile_complete ? 'Yes' : 'No',
		}))

		const ws = XLSX.utils.json_to_sheet(data)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Students')
		XLSX.writeFile(wb, `students_comprehensive_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: '✅ Export Successful',
			description: `${students.length} students exported to Excel with all fields.`,
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

	const downloadTemplate = async () => {
		// Main template with correct column order
		const template = [{
			

			// Columns A-G: Academic Codes (REQUIRED - after Roll Number)
			'Institution Code*': '',
			'Department Code*': '',
			'Program Code*': '',
			'Degree Code': '',
			'Semester Code*': '',
			'Section Code': '',
			'Academic Year*': '',
			'Batch Year': '',

			// Column H: Roll Number
			'Roll Number*': '',
			
			// PRIMARY IDENTIFIERS (continued)
			'Register Number': '',
			'Application ID': '',
			'Admission ID': '',

			// BASIC INFORMATION
			'First Name*': '',
			'Last Name': '',
			'Initial': '',
			'Name in Tamil': '',
			'Date of Birth* (DD-MM-YYYY)': '',
			'Gender* (Male/Female/Other/Transgender)': '',
			'Blood Group (A+/A-/B+/B-/O+/O-/AB+/AB-)': '',
			'Nationality': 'Indian',

			// CONTACT INFORMATION
			'Student Mobile': '',
			'Student Email': '',
			'College Email': '',
			'Telephone': '',

			// PERMANENT ADDRESS
			'Address Door No': '',
			'Address Street': '',
			'Address Village': '',
			'Address Post Office': '',
			'Address Taluk': '',
			'Address District': '',
			'Address State': 'Tamil Nadu',
			'Address Country': 'India',
			'Address PIN Code': '',

			// DEMOGRAPHICS
			'Religion': '',
			'Community': '',
			'Caste': '',
			'Sub Caste': '',
			'Aadhar Number': '',
			'EMIS Number': '',

			// SPECIAL STATUS & CATEGORIES
			'First Graduate (Yes/No)': 'No',
			'Quota': '',
			'Category': '',
			'Disability Type': '',
			'Disability Percentage': '',
			'Sports Quota': '',
			'NCC Number': '',
			'NSS Number': '',

			// FAMILY DETAILS
			'Father Name': '',
			'Father Occupation': '',
			'Father Education': '',
			'Father Mobile': '',
			'Father Email': '',
			'Mother Name': '',
			'Mother Occupation': '',
			'Mother Education': '',
			'Mother Mobile': '',
			'Mother Email': '',
			'Guardian Name': '',
			'Guardian Relation': '',
			'Guardian Mobile': '',
			'Guardian Email': '',
			'Annual Income': '',

			// 10TH STANDARD (No JSON fields)
			'10th School Name': '',
			'10th School Place': '',
			'10th Board': '',
			'10th Medium': '',
			'10th Register Number': '',
			'10th Passing Year': '',

			// 11TH STANDARD (No JSON fields)
			'11th School Name': '',
			'11th School Place': '',
			'11th Board': '',
			'11th Passing Year': '',

			// 12TH STANDARD (No JSON fields)
			'12th School Name': '',
			'12th School Place': '',
			'12th Board': '',
			'12th Register Number': '',
			'12th Passing Year': '',

			// ENTRANCE EXAM
			'Entry Type': '',
			'Medical Cutoff': '',
			'Engineering Cutoff': '',
			'NEET Roll Number': '',
			'NEET Score': '',
			'Counseling Applied (Yes/No)': 'No',
			'Counseling Number': '',

			// UG DEGREE (for PG students)
			'UG Qualifying Degree': '',
			'UG College': '',
			'UG University': '',
			'UG Passing Year': '',
			'UG Total Percentage': '',
			'UG Class Obtained': '',

			// ACCOMMODATION & TRANSPORT
			'Accommodation Type': '',
			'Hostel Type': '',
			'Food Type': '',
			'Bus Required (Yes/No)': 'No',
			'Bus Route': '',
			'Bus Pickup Location': '',
			'Hostelite (Yes/No)': 'No',
			'Bus User (Yes/No)': 'No',

			// FINANCIAL DETAILS
			'Bank Beneficiary Name': '',
			'Bank Account Number': '',
			'Bank IFSC Code': '',
			'Bank Name': '',
			'Bank Branch': '',
			'Fixed Fee': '',
			'Fee Payment Date (DD-MM-YYYY)': '',
			'Fee Amount Paid': '',

			// REFERENCE (No document JSON fields)
			'Reference Type': '',
			'Reference Name': '',
			'Reference Contact': '',

			// MEDIA
			'Student Photo URL': '',

			// STATUS
			'Admission Status': '',
		}]

		// Fetch ALL reference data for comprehensive single sheet
		try {
			// Fetch all departments
			const deptRes = await fetch('/api/departments')
			const allDepartments = deptRes.ok ? await deptRes.json() : []

			// Fetch all programs
			const progRes = await fetch('/api/program')
			const allPrograms = progRes.ok ? await progRes.json() : []

			// Fetch all semesters
			const semRes = await fetch('/api/semesters')
			const allSemesters = semRes.ok ? await semRes.json() : []

			// Fetch all sections
			const secRes = await fetch('/api/section')
			const allSections = secRes.ok ? await secRes.json() : []

			// Calculate max rows needed
			const maxRows = Math.max(
				institutions.length,
				allDepartments.length,
				allPrograms.length,
				degrees.length,
				allSemesters.length,
				allSections.length,
				academicYears.length,
				4, // Gender values
				8  // Blood group values
			)

			// Create single comprehensive reference sheet with all data side by side
			const referenceData = []
			for (let i = 0; i < maxRows; i++) {
				referenceData.push({
					'Institution Code': institutions[i]?.institution_code || '',
					'Institution Name': institutions[i]?.institution_name || institutions[i]?.name || '',
					'': '', // Spacer
					'Department Code': allDepartments[i]?.department_code || '',
					'Department Name': allDepartments[i]?.department_name || '',
					' ': '', // Spacer
					'Program Code': allPrograms[i]?.program_code || '',
					'Program Name': allPrograms[i]?.program_name || '',
					'  ': '', // Spacer
					'Degree Code': degrees[i]?.degree_code || '',
					'Degree Name': degrees[i]?.degree_name || '',
					'   ': '', // Spacer
					'Semester Code': allSemesters[i]?.semester_code || '',
					'Semester Name': allSemesters[i]?.semester_name || '',
					'    ': '', // Spacer
					'Section Code': allSections[i]?.section_code || '',
					'Section Name': allSections[i]?.section_name || '',
					'     ': '', // Spacer
					'Academic Year': academicYears[i]?.year_code || academicYears[i]?.year_name || '',
					'      ': '', // Spacer
					'Gender': ['Male', 'Female', 'Other', 'Transgender'][i] || '',
					'       ': '', // Spacer
					'Blood Group': ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'][i] || ''
				})
			}

			// Create workbook with 2 sheets
			const wb = XLSX.utils.book_new()

			// Main template sheet
			const wsTemplate = XLSX.utils.json_to_sheet(template)
			XLSX.utils.book_append_sheet(wb, wsTemplate, 'Student Upload Template')

			// Single comprehensive reference sheet
			const wsReference = XLSX.utils.json_to_sheet(referenceData)
			XLSX.utils.book_append_sheet(wb, wsReference, 'Reference Data')

			// Download file
			XLSX.writeFile(wb, 'students_upload_template_with_references.xlsx')

			toast({
				title: '✅ Template Downloaded',
				description: 'Student upload template with comprehensive reference data sheet downloaded successfully.',
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
			})
		} catch (error) {
			console.error('Error generating template:', error)
			toast({
				title: '❌ Error',
				description: 'Failed to generate template. Please try again.',
				variant: 'destructive'
			})
		}
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
							<TabsList className="grid w-full grid-cols-9 gap-1">
								<TabsTrigger value="basic" className="text-xs px-2">Basic</TabsTrigger>
								<TabsTrigger value="contact" className="text-xs px-2">Contact</TabsTrigger>
								<TabsTrigger value="address" className="text-xs px-2">Address</TabsTrigger>
								<TabsTrigger value="academic" className="text-xs px-2">Academic</TabsTrigger>
								<TabsTrigger value="education" className="text-xs px-2">10th/11th/12th</TabsTrigger>
								<TabsTrigger value="entrance" className="text-xs px-2">Entrance/UG</TabsTrigger>
								<TabsTrigger value="accommodation" className="text-xs px-2">Transport/Fee</TabsTrigger>
								<TabsTrigger value="documents" className="text-xs px-2">Documents</TabsTrigger>
								<TabsTrigger value="other" className="text-xs px-2">Other</TabsTrigger>
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
										<Label className="text-sm font-semibold">Application ID</Label>
										<Input
											value={formData.application_id}
											onChange={(e) => setFormData({ ...formData, application_id: e.target.value })}
											className="h-10"
											placeholder="Application ID"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Admission ID</Label>
										<Input
											value={formData.admission_id}
											onChange={(e) => setFormData({ ...formData, admission_id: e.target.value })}
											className="h-10"
											placeholder="Admission ID"
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
										<Label className="text-sm font-semibold">Name in Tamil</Label>
										<Input
											value={formData.name_in_tamil}
											onChange={(e) => setFormData({ ...formData, name_in_tamil: e.target.value })}
											className="h-10"
											placeholder="தமிழில் பெயர்"
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

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Student Photo URL</Label>
										<Input
											value={formData.student_photo_url}
											onChange={(e) => setFormData({ ...formData, student_photo_url: e.target.value })}
											className="h-10"
											placeholder="https://example.com/photo.jpg"
										/>
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
										<Label className="text-sm font-semibold">Telephone Number</Label>
										<Input
											value={formData.telephone_number}
											onChange={(e) => setFormData({ ...formData, telephone_number: e.target.value })}
											className="h-10"
											placeholder="Landline number"
										/>
									</div>

									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1">Father Details</h3>
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
										<Label className="text-sm font-semibold">Father Occupation</Label>
										<Input
											value={formData.father_occupation}
											onChange={(e) => setFormData({ ...formData, father_occupation: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Father Education</Label>
										<Input
											value={formData.father_education}
											onChange={(e) => setFormData({ ...formData, father_education: e.target.value })}
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
										<Label className="text-sm font-semibold">Father Email</Label>
										<Input
											type="email"
											value={formData.father_email}
											onChange={(e) => setFormData({ ...formData, father_email: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1">Mother Details</h3>
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
										<Label className="text-sm font-semibold">Mother Occupation</Label>
										<Input
											value={formData.mother_occupation}
											onChange={(e) => setFormData({ ...formData, mother_occupation: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Mother Education</Label>
										<Input
											value={formData.mother_education}
											onChange={(e) => setFormData({ ...formData, mother_education: e.target.value })}
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
										<Label className="text-sm font-semibold">Mother Email</Label>
										<Input
											type="email"
											value={formData.mother_email}
											onChange={(e) => setFormData({ ...formData, mother_email: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1">Guardian Details (if applicable)</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Guardian Name</Label>
										<Input
											value={formData.guardian_name}
											onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Guardian Relation</Label>
										<Input
											value={formData.guardian_relation}
											onChange={(e) => setFormData({ ...formData, guardian_relation: e.target.value })}
											className="h-10"
											placeholder="e.g., Uncle, Aunt, Brother"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Guardian Mobile</Label>
										<Input
											value={formData.guardian_mobile}
											onChange={(e) => setFormData({ ...formData, guardian_mobile: e.target.value })}
											className="h-10"
											placeholder="10-digit mobile"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Guardian Email</Label>
										<Input
											type="email"
											value={formData.guardian_email}
											onChange={(e) => setFormData({ ...formData, guardian_email: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Annual Family Income (₹)</Label>
										<Input
											type="number"
											value={formData.annual_income}
											onChange={(e) => setFormData({ ...formData, annual_income: e.target.value })}
											className="h-10"
											placeholder="e.g., 500000"
										/>
									</div>
								</div>
							</TabsContent>

							{/* Address Tab */}
							<TabsContent value="address" className="space-y-4 mt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1">Permanent Address</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Door No</Label>
										<Input
											value={formData.permanent_address_door_no}
											onChange={(e) => setFormData({ ...formData, permanent_address_door_no: e.target.value })}
											className="h-10"
											placeholder="e.g., 12/A"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Street</Label>
										<Input
											value={formData.permanent_address_street}
											onChange={(e) => setFormData({ ...formData, permanent_address_street: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Village/Area</Label>
										<Input
											value={formData.permanent_address_village}
											onChange={(e) => setFormData({ ...formData, permanent_address_village: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Post Office</Label>
										<Input
											value={formData.permanent_address_post_office}
											onChange={(e) => setFormData({ ...formData, permanent_address_post_office: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Taluk</Label>
										<Input
											value={formData.permanent_address_taluk}
											onChange={(e) => setFormData({ ...formData, permanent_address_taluk: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">District</Label>
										<Input
											value={formData.permanent_address_district}
											onChange={(e) => setFormData({ ...formData, permanent_address_district: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">State</Label>
										<Input
											value={formData.permanent_address_state}
											onChange={(e) => setFormData({ ...formData, permanent_address_state: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Country</Label>
										<Input
											value={formData.permanent_address_country}
											onChange={(e) => setFormData({ ...formData, permanent_address_country: e.target.value })}
											className="h-10"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">PIN Code</Label>
										<Input
											value={formData.permanent_address_pin_code}
											onChange={(e) => setFormData({ ...formData, permanent_address_pin_code: e.target.value })}
											className="h-10"
											placeholder="6-digit PIN"
											maxLength={6}
										/>
									</div>
								</div>
							</TabsContent>

							{/* Academic Tab */}
							<TabsContent value="academic" className="space-y-4 mt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="text-sm font-semibold">Institution <span className="text-red-500">*</span></Label>
										<Select value={formData.institution_id} onValueChange={(v) => setFormData({ ...formData, institution_id: v })}>
											<SelectTrigger className={`h-10 ${errors.institution_id ? 'border-destructive' : ''}`}>
												<SelectValue placeholder="Select institution" />
											</SelectTrigger>
											<SelectContent>
												{institutions.map((inst) => (
													<SelectItem key={inst.id} value={inst.id}>
														{inst.institution_code} - {inst.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{errors.institution_id && <p className="text-xs text-destructive">{errors.institution_id}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Department <span className="text-red-500">*</span></Label>
										<Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v })}>
											<SelectTrigger className={`h-10 ${errors.department_id ? 'border-destructive' : ''}`}>
												<SelectValue placeholder="Select department" />
											</SelectTrigger>
											<SelectContent>
												{departments.map((dept) => (
													<SelectItem key={dept.id} value={dept.id}>
														{dept.department_code} - {dept.department_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{errors.department_id && <p className="text-xs text-destructive">{errors.department_id}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Program <span className="text-red-500">*</span></Label>
										<Select value={formData.program_id} onValueChange={(v) => setFormData({ ...formData, program_id: v })}>
											<SelectTrigger className={`h-10 ${errors.program_id ? 'border-destructive' : ''}`}>
												<SelectValue placeholder="Select program" />
											</SelectTrigger>
											<SelectContent>
												{programs.map((prog) => (
													<SelectItem key={prog.id} value={prog.id}>
														{prog.program_code} - {prog.program_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{errors.program_id && <p className="text-xs text-destructive">{errors.program_id}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Degree</Label>
										<Select value={formData.degree_id} onValueChange={(v) => setFormData({ ...formData, degree_id: v })}>
											<SelectTrigger className="h-10">
												<SelectValue placeholder="Select degree (optional)" />
											</SelectTrigger>
											<SelectContent>
												{degrees.map((deg) => (
													<SelectItem key={deg.id} value={deg.id}>
														{deg.degree_code} - {deg.degree_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Semester <span className="text-red-500">*</span></Label>
										<Select value={formData.semester_id} onValueChange={(v) => setFormData({ ...formData, semester_id: v })}>
											<SelectTrigger className={`h-10 ${errors.semester_id ? 'border-destructive' : ''}`}>
												<SelectValue placeholder="Select semester" />
											</SelectTrigger>
											<SelectContent>
												{semesters.map((sem) => (
													<SelectItem key={sem.id} value={sem.id}>
														{sem.semester_code} - {sem.semester_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{errors.semester_id && <p className="text-xs text-destructive">{errors.semester_id}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Academic Year <span className="text-red-500">*</span></Label>
										<Select value={formData.academic_year_id} onValueChange={(v) => setFormData({ ...formData, academic_year_id: v })}>
											<SelectTrigger className={`h-10 ${errors.academic_year_id ? 'border-destructive' : ''}`}>
												<SelectValue placeholder="Select academic year" />
											</SelectTrigger>
											<SelectContent>
												{academicYears.map((ay) => (
													<SelectItem key={ay.id} value={ay.id}>
														{ay.year_code} - {ay.year_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{errors.academic_year_id && <p className="text-xs text-destructive">{errors.academic_year_id}</p>}
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Section</Label>
										<Select value={formData.section_id} onValueChange={(v) => setFormData({ ...formData, section_id: v })}>
											<SelectTrigger className="h-10">
												<SelectValue placeholder="Select section (optional)" />
											</SelectTrigger>
											<SelectContent>
												{sections.map((sec) => (
													<SelectItem key={sec.id} value={sec.id}>
														{sec.section_code} - {sec.section_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
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

							{/* Education (10th/11th/12th) Tab */}
							<TabsContent value="education" className="space-y-4 mt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1">10th Standard Details</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">School Name</Label>
										<Input value={formData.tenth_school_name} onChange={(e) => setFormData({ ...formData, tenth_school_name: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">School Place</Label>
										<Input value={formData.tenth_school_place} onChange={(e) => setFormData({ ...formData, tenth_school_place: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Board</Label>
										<Input value={formData.tenth_board} onChange={(e) => setFormData({ ...formData, tenth_board: e.target.value })} className="h-10" placeholder="e.g., CBSE, State Board" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Medium</Label>
										<Input value={formData.tenth_medium} onChange={(e) => setFormData({ ...formData, tenth_medium: e.target.value })} className="h-10" placeholder="e.g., English, Tamil" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Register Number</Label>
										<Input value={formData.tenth_register_number} onChange={(e) => setFormData({ ...formData, tenth_register_number: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Passing Year</Label>
										<Input type="number" value={formData.tenth_passing_year} onChange={(e) => setFormData({ ...formData, tenth_passing_year: e.target.value })} className="h-10" placeholder="e.g., 2022" />
									</div>

									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1 mt-4">11th Standard Details</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">School Name</Label>
										<Input value={formData.eleventh_school_name} onChange={(e) => setFormData({ ...formData, eleventh_school_name: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">School Place</Label>
										<Input value={formData.eleventh_school_place} onChange={(e) => setFormData({ ...formData, eleventh_school_place: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Board</Label>
										<Input value={formData.eleventh_board} onChange={(e) => setFormData({ ...formData, eleventh_board: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Passing Year</Label>
										<Input type="number" value={formData.eleventh_passing_year} onChange={(e) => setFormData({ ...formData, eleventh_passing_year: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1 mt-4">12th Standard Details</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">School Name</Label>
										<Input value={formData.twelfth_school_name} onChange={(e) => setFormData({ ...formData, twelfth_school_name: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">School Place</Label>
										<Input value={formData.twelfth_school_place} onChange={(e) => setFormData({ ...formData, twelfth_school_place: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Board</Label>
										<Input value={formData.twelfth_board} onChange={(e) => setFormData({ ...formData, twelfth_board: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Register Number</Label>
										<Input value={formData.twelfth_register_number} onChange={(e) => setFormData({ ...formData, twelfth_register_number: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Passing Year</Label>
										<Input type="number" value={formData.twelfth_passing_year} onChange={(e) => setFormData({ ...formData, twelfth_passing_year: e.target.value })} className="h-10" />
									</div>
								</div>
							</TabsContent>

							{/* Entrance Exam & UG Details Tab */}
							<TabsContent value="entrance" className="space-y-4 mt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1">Entrance Exam Details</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Entry Type</Label>
										<Input value={formData.entry_type} onChange={(e) => setFormData({ ...formData, entry_type: e.target.value })} className="h-10" placeholder="e.g., NEET, JEE, Direct" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">NEET Roll Number</Label>
										<Input value={formData.neet_roll_number} onChange={(e) => setFormData({ ...formData, neet_roll_number: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">NEET Score</Label>
										<Input type="number" value={formData.neet_score} onChange={(e) => setFormData({ ...formData, neet_score: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Medical Cutoff Marks</Label>
										<Input type="number" value={formData.medical_cutoff_marks} onChange={(e) => setFormData({ ...formData, medical_cutoff_marks: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Engineering Cutoff Marks</Label>
										<Input type="number" value={formData.engineering_cutoff_marks} onChange={(e) => setFormData({ ...formData, engineering_cutoff_marks: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Counseling Number</Label>
										<Input value={formData.counseling_number} onChange={(e) => setFormData({ ...formData, counseling_number: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1 mt-4">UG Degree Details (for PG students)</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Qualifying Degree</Label>
										<Input value={formData.qualifying_degree} onChange={(e) => setFormData({ ...formData, qualifying_degree: e.target.value })} className="h-10" placeholder="e.g., B.E., B.Tech, B.Sc." />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">UG College</Label>
										<Input value={formData.ug_last_college} onChange={(e) => setFormData({ ...formData, ug_last_college: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">UG University</Label>
										<Input value={formData.ug_university} onChange={(e) => setFormData({ ...formData, ug_university: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">UG Passing Year</Label>
										<Input type="number" value={formData.ug_passing_year} onChange={(e) => setFormData({ ...formData, ug_passing_year: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">UG Total Percentage</Label>
										<Input type="number" value={formData.ug_total_percentage} onChange={(e) => setFormData({ ...formData, ug_total_percentage: e.target.value })} className="h-10" placeholder="e.g., 85.5" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">UG Class Obtained</Label>
										<Input value={formData.ug_class_obtained} onChange={(e) => setFormData({ ...formData, ug_class_obtained: e.target.value })} className="h-10" placeholder="e.g., First Class" />
									</div>
								</div>
							</TabsContent>

							{/* Accommodation & Financial Tab */}
							<TabsContent value="accommodation" className="space-y-4 mt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1">Accommodation & Transport</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Accommodation Type</Label>
										<Input value={formData.accommodation_type} onChange={(e) => setFormData({ ...formData, accommodation_type: e.target.value })} className="h-10" placeholder="e.g., Day Scholar, Hosteller" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Hostel Type</Label>
										<Input value={formData.hostel_type} onChange={(e) => setFormData({ ...formData, hostel_type: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Food Type</Label>
										<Input value={formData.food_type} onChange={(e) => setFormData({ ...formData, food_type: e.target.value })} className="h-10" placeholder="e.g., Veg, Non-Veg" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Bus Route</Label>
										<Input value={formData.bus_route} onChange={(e) => setFormData({ ...formData, bus_route: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Bus Pickup Location</Label>
										<Input value={formData.bus_pickup_location} onChange={(e) => setFormData({ ...formData, bus_pickup_location: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1 mt-4">Financial Details</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Bank Beneficiary Name</Label>
										<Input value={formData.bank_beneficiary_name} onChange={(e) => setFormData({ ...formData, bank_beneficiary_name: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Bank Account Number</Label>
										<Input value={formData.bank_account_number} onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Bank IFSC Code</Label>
										<Input value={formData.bank_ifsc_code} onChange={(e) => setFormData({ ...formData, bank_ifsc_code: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Bank Name</Label>
										<Input value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Bank Branch</Label>
										<Input value={formData.bank_branch} onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Fixed Fee (₹)</Label>
										<Input type="number" value={formData.fixed_fee} onChange={(e) => setFormData({ ...formData, fixed_fee: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Fee Payment Date</Label>
										<Input type="date" value={formData.fee_payment_date} onChange={(e) => setFormData({ ...formData, fee_payment_date: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Fee Amount Paid (₹)</Label>
										<Input type="number" value={formData.fee_amount_paid} onChange={(e) => setFormData({ ...formData, fee_amount_paid: e.target.value })} className="h-10" />
									</div>
								</div>
							</TabsContent>

							{/* Documents & Reference Tab */}
							<TabsContent value="documents" className="space-y-4 mt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1">Reference Information</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Reference Type</Label>
										<Input value={formData.reference_type} onChange={(e) => setFormData({ ...formData, reference_type: e.target.value })} className="h-10" placeholder="e.g., Alumni, Faculty, Advertisement" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Reference Name</Label>
										<Input value={formData.reference_name} onChange={(e) => setFormData({ ...formData, reference_name: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Reference Contact</Label>
										<Input value={formData.reference_contact} onChange={(e) => setFormData({ ...formData, reference_contact: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1 mt-4">Documents & Certificates</h3>
									</div>

									<div className="space-y-2 md:col-span-2">
										<Label className="text-sm font-semibold">Original Certificates Submitted (JSON Format)</Label>
										<Textarea
											value={formData.original_certificates_submitted}
											onChange={(e) => setFormData({ ...formData, original_certificates_submitted: e.target.value })}
											className="min-h-[80px]"
											placeholder='e.g., ["10th Certificate", "12th Certificate", "Transfer Certificate"]'
										/>
										<p className="text-xs text-muted-foreground">Enter JSON array format</p>
									</div>

									<div className="space-y-2 md:col-span-2">
										<Label className="text-sm font-semibold">Xerox Certificates Submitted (JSON Format)</Label>
										<Textarea
											value={formData.xerox_certificates_submitted}
											onChange={(e) => setFormData({ ...formData, xerox_certificates_submitted: e.target.value })}
											className="min-h-[80px]"
											placeholder='e.g., ["Aadhar Copy", "Community Certificate", "Income Certificate"]'
										/>
										<p className="text-xs text-muted-foreground">Enter JSON array format</p>
									</div>
								</div>
							</TabsContent>

							{/* Other Tab */}
							<TabsContent value="other" className="space-y-4 mt-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1">Demographics</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Nationality</Label>
										<Input value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Religion</Label>
										<Input value={formData.religion} onChange={(e) => setFormData({ ...formData, religion: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Community</Label>
										<Input value={formData.community} onChange={(e) => setFormData({ ...formData, community: e.target.value })} className="h-10" placeholder="e.g., BC, MBC, SC, ST, OC" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Caste</Label>
										<Input value={formData.caste} onChange={(e) => setFormData({ ...formData, caste: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Sub Caste</Label>
										<Input value={formData.sub_caste} onChange={(e) => setFormData({ ...formData, sub_caste: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Aadhar Number</Label>
										<Input value={formData.aadhar_number} onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })} className="h-10" placeholder="12-digit Aadhar" maxLength={12} />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">EMIS Number</Label>
										<Input value={formData.emis_number} onChange={(e) => setFormData({ ...formData, emis_number: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1 mt-4">Category & Status</h3>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Quota</Label>
										<Input value={formData.quota} onChange={(e) => setFormData({ ...formData, quota: e.target.value })} className="h-10" placeholder="e.g., Government, Management" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Category</Label>
										<Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="h-10" placeholder="e.g., General, OBC, SC, ST" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Disability Type</Label>
										<Input value={formData.disability_type} onChange={(e) => setFormData({ ...formData, disability_type: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Disability Percentage</Label>
										<Input type="number" value={formData.disability_percentage} onChange={(e) => setFormData({ ...formData, disability_percentage: e.target.value })} className="h-10" placeholder="e.g., 40" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Sports Quota</Label>
										<Input value={formData.sports_quota} onChange={(e) => setFormData({ ...formData, sports_quota: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">NCC Number</Label>
										<Input value={formData.ncc_number} onChange={(e) => setFormData({ ...formData, ncc_number: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">NSS Number</Label>
										<Input value={formData.nss_number} onChange={(e) => setFormData({ ...formData, nss_number: e.target.value })} className="h-10" />
									</div>

									<div className="space-y-2 md:col-span-2">
										<h3 className="text-sm font-bold text-blue-600 border-b pb-1 mt-4">Boolean Flags</h3>
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

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Bus Required</Label>
										<div className="flex items-center gap-3 h-10">
											<button
												type="button"
												onClick={() => setFormData({ ...formData, bus_required: !formData.bus_required })}
												className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.bus_required ? 'bg-green-500' : 'bg-gray-300'}`}
											>
												<span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.bus_required ? 'translate-x-6' : 'translate-x-1'}`} />
											</button>
											<span className={`text-sm font-medium ${formData.bus_required ? 'text-green-600' : 'text-gray-500'}`}>
												{formData.bus_required ? 'Yes' : 'No'}
											</span>
										</div>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Counseling Applied</Label>
										<div className="flex items-center gap-3 h-10">
											<button
												type="button"
												onClick={() => setFormData({ ...formData, counseling_applied: !formData.counseling_applied })}
												className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.counseling_applied ? 'bg-green-500' : 'bg-gray-300'}`}
											>
												<span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.counseling_applied ? 'translate-x-6' : 'translate-x-1'}`} />
											</button>
											<span className={`text-sm font-medium ${formData.counseling_applied ? 'text-green-600' : 'text-gray-500'}`}>
												{formData.counseling_applied ? 'Yes' : 'No'}
											</span>
										</div>
									</div>

									<div className="space-y-2">
										<Label className="text-sm font-semibold">Admission Status</Label>
										<Input value={formData.admission_status} onChange={(e) => setFormData({ ...formData, admission_status: e.target.value })} className="h-10" placeholder="e.g., Confirmed, Provisional" />
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
