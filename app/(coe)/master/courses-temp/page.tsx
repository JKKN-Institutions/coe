"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { AppFooter } from "@/components/layout/app-footer"
import { PageTransition } from "@/components/common/page-transition"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useToast } from "@/hooks/common/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Download,
  Upload,
  PlusCircle,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  BookText,
  BookOpen,
  GraduationCap,
  Clock,
  TrendingUp,
  Edit,
  Trash2,
  FileSpreadsheet,
  RefreshCw,
  FileJson,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Home,
  Database,
  Shield,
  Users,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import * as XLSX from 'xlsx'
import type { CourseTemp, CourseTempImportError, UploadSummary } from '@/types/courses-temp'
import {
  fetchCourses as fetchCoursesService,
  createCourse,
  updateCourse,
  deleteCourse as deleteCourseService,
  fetchDropdownData,
  downloadTemplate,
} from '@/services/master/courses-temp-service'

// Navigation data

export default function CoursesTempPage() {
  const [courses, setCourses] = useState<CourseTemp[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [sortField, setSortField] = useState<'course_code' | 'course_title' | 'course_category' | 'credits' | 'exam_duration' | 'is_active' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const [currentPage, setCurrentPage] = useState(1)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null)
  const itemsPerPage = 10

  // Single-page add/edit state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<CourseTemp | null>(null)
  const { toast } = useToast()
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Dropdown sources
  const [institutions, setInstitutions] = useState<Array<{ id: string, institution_code: string }>>([])
  const [departmentsSrc, setDepartmentsSrc] = useState<Array<{ id: string, department_code: string, department_name?: string }>>([])
  const [regulations, setRegulations] = useState<Array<{ id: string, regulation_code: string }>>([])
  const [codesLoading, setCodesLoading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [showErrorDialog, setShowErrorDialog] = useState(false)

  const [formData, setFormData] = useState({
    institution_code: "",
    regulation_code: "",
    offering_department_code: "",
    board_code: "",
    program_code: "",
    program_name: "",
    course_code: "",
    course_title: "",
    display_code: "",
    course_category: "",
    course_type: "",
    course_part_master: "",
    credits: "",
    split_credit: false,
    theory_credit: "",
    practical_credit: "",
    qp_code: "",
    e_code_name: "",
    exam_duration: "",
    evaluation_type: "",
    result_type: "Mark",
    self_study_course: false,
    outside_class_course: false,
    open_book: false,
    online_course: false,
    dummy_number_required: false,
    annual_course: false,
    multiple_qp_set: false,
    no_of_qp_setter: "",
    no_of_scrutinizer: "",
    fee_exception: false,
    syllabus_pdf_url: "",
    description: "",
    is_active: true,
    // Required fields for marks and hours
    class_hours: "0",
    theory_hours: "0",
    practical_hours: "0",
    internal_max_mark: "0",
    internal_pass_mark: "0",
    internal_converted_mark: "0",
    external_max_mark: "0",
    external_pass_mark: "0",
    external_converted_mark: "0",
    total_pass_mark: "0",
    total_max_mark: "0",
    annual_semester: false,
    registration_based: false,
  })

  // Fetch courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await fetchCoursesService()
        setCourses(data)
      } catch (error: any) {
        console.error('Error fetching courses:', error)

        // Check if courses table doesn't exist
        if (error.message && error.message.includes('Courses table not found')) {
          alert(`Database Setup Required:\n\n${error.message}\n\nPlease check the console for setup instructions.`)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
    // also fetch dropdown codes
    ;(async () => {
      try {
        setCodesLoading(true)
        const { institutions, departments, regulations } = await fetchDropdownData()
        setInstitutions(institutions)
        setDepartmentsSrc(departments)
        setRegulations(regulations)
      } catch (e) {
        console.error('Error loading codes:', e)
      } finally {
        setCodesLoading(false)
      }
    })()
  }, [])

  // Update time every second (client-side only)
  useEffect(() => {
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Filter courses based on search and filters
  const handleSort = (field: 'course_code' | 'course_title' | 'course_category' | 'credits' | 'exam_duration' | 'is_active') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredCourses = courses
    .filter((course) => {
      const matchesSearch = course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           course.course_title.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" ||
                           (statusFilter === "active" && course.is_active) ||
                           (statusFilter === "inactive" && !course.is_active)
      const matchesType = typeFilter === "all" || course.course_type === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
    .sort((a, b) => {
      if (!sortField) return 0

      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = ''
      if (bValue === null || bValue === undefined) bValue = ''

      // Handle boolean for is_active
      if (sortField === 'is_active') {
        aValue = aValue ? 1 : 0
        bValue = bValue ? 1 : 0
      }

      // Handle numeric values
      if (sortField === 'credits' || sortField === 'exam_duration') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      }

      // Handle string values
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const getStatusBadgeVariant = (course: CourseTemp) => {
    return course.is_active ? "default" : "secondary"
  }

  const getStatusText = (course: CourseTemp) => {
    return course.is_active ? "Active" : "Inactive"
  }

  const getTypeBadgeVariant = (courseType: string | null | undefined) => {
    if (!courseType) return "default"
    switch (courseType.toLowerCase()) {
      case 'core': return "default"
      case 'elective': return "secondary"
      case 'practical': return "outline"
      case 'project': return "destructive"
      default: return "default"
    }
  }

  const resetForm = () => {
    setFormData({
      institution_code: "",
      regulation_code: "",
      offering_department_code: "",
      board_code: "",
      program_code: "",
      program_name: "",
      course_code: "",
      course_title: "",
      display_code: "",
      course_category: "",
      course_type: "",
      course_part_master: "",
      credits: "",
      split_credit: false,
      theory_credit: "",
      practical_credit: "",
      qp_code: "",
      e_code_name: "",
      exam_duration: "",
      evaluation_type: "",
      result_type: "Mark",
      self_study_course: false,
      outside_class_course: false,
      open_book: false,
      online_course: false,
      dummy_number_required: false,
      annual_course: false,
      multiple_qp_set: false,
      no_of_qp_setter: "",
      no_of_scrutinizer: "",
      fee_exception: false,
      syllabus_pdf_url: "",
      description: "",
      is_active: true,
      // Required fields for marks and hours
      class_hours: "0",
      theory_hours: "0",
      practical_hours: "0",
      internal_max_mark: "0",
      internal_pass_mark: "0",
      internal_converted_mark: "0",
      external_max_mark: "0",
      external_pass_mark: "0",
      external_converted_mark: "0",
      total_pass_mark: "0",
      total_max_mark: "0",
      annual_semester: false,
      registration_based: false,
    })
    setErrors({})
    setEditing(null)
  }

  const openAdd = () => { resetForm(); setSheetOpen(true) }
  const openEdit = (row: CourseTemp) => {
    setEditing(row)
    setFormData({
      institution_code: row.institution_code || "",
      regulation_code: row.regulation_code || "",
      offering_department_code: row.offering_department_code || "",
      board_code: row.board_code || "",
      program_code: row.program_code || "",
      program_name: row.program_name || "",
      course_code: row.course_code || "",
      course_title: row.course_title || "",
      display_code: row.display_code || (row.course_code || ''),
      course_category: row.course_category || "",
      course_type: row.course_type || "",
      course_part_master: row.course_part_master || "",
      credits: String(row.credits ?? '0'),
      split_credit: Boolean(row.split_credit) || false,
      theory_credit: String(row.theory_credit ?? '0'),
      practical_credit: String(row.practical_credit ?? '0'),
      qp_code: row.qp_code || "",
      e_code_name: row.e_code_name || "",
      exam_duration: String(row.exam_duration ?? ''),
      evaluation_type: row.evaluation_type || "",
      result_type: row.result_type || "Mark",
      self_study_course: Boolean(row.self_study_course) || false,
      outside_class_course: Boolean(row.outside_class_course) || false,
      open_book: Boolean(row.open_book) || false,
      online_course: Boolean(row.online_course) || false,
      dummy_number_required: Boolean(row.dummy_number_required) || false,
      annual_course: Boolean(row.annual_course) || false,
      multiple_qp_set: Boolean(row.multiple_qp_set) || false,
      no_of_qp_setter: String(row.no_of_qp_setter ?? ''),
      no_of_scrutinizer: String(row.no_of_scrutinizer ?? ''),
      fee_exception: Boolean(row.fee_exception) || false,
      syllabus_pdf_url: row.syllabus_pdf_url || "",
      description: row.description || "",
      is_active: row.is_active,
      // Required fields for marks and hours
      class_hours: String(row.class_hours ?? 0),
      theory_hours: String(row.theory_hours ?? 0),
      practical_hours: String(row.practical_hours ?? 0),
      internal_max_mark: String(row.internal_max_mark ?? 0),
      internal_pass_mark: String(row.internal_pass_mark ?? 0),
      internal_converted_mark: String(row.internal_converted_mark ?? 0),
      external_max_mark: String(row.external_max_mark ?? 0),
      external_pass_mark: String(row.external_pass_mark ?? 0),
      external_converted_mark: String(row.external_converted_mark ?? 0),
      total_pass_mark: String(row.total_pass_mark ?? 0),
      total_max_mark: String(row.total_max_mark ?? 0),
      annual_semester: Boolean(row.annual_semester),
      registration_based: Boolean(row.registration_based),
    })
    setSheetOpen(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}

    // Required fields
    if (!formData.institution_code.trim()) e.institution_code = 'Institution code is required'
    if (!formData.regulation_code.trim()) e.regulation_code = 'Regulation code is required'
    if (!formData.course_code.trim()) e.course_code = 'Course code is required'
    if (!formData.course_title.trim()) e.course_title = 'Course name is required'
    if (!formData.display_code.trim()) e.display_code = 'Display code is required'
    if (!formData.qp_code.trim()) e.qp_code = 'QP code is required'
    if (!formData.course_category) e.course_category = 'Course category is required'
    if (!formData.evaluation_type) e.evaluation_type = 'Evaluation type is required'
    if (!formData.result_type) e.result_type = 'Result type is required'

    // Course code validation (alphanumeric and special characters)
    if (formData.course_code && !/^[A-Za-z0-9\-_]+$/.test(formData.course_code)) {
      e.course_code = 'Course code can only contain letters, numbers, hyphens, and underscores'
    }

    // Numeric field validations
    if (formData.credits && Number(formData.credits) < 0) {
      e.credits = 'Credit must be a positive number'
    }
    if (formData.credits && Number(formData.credits) > 99) {
      e.credits = 'Credit cannot exceed 99'
    }

    if (formData.theory_credit && Number(formData.theory_credit) < 0) {
      e.theory_credit = 'Theory credit must be a positive number'
    }
    if (formData.theory_credit && Number(formData.theory_credit) > 99) {
      e.theory_credit = 'Theory credit cannot exceed 99'
    }

    if (formData.practical_credit && Number(formData.practical_credit) < 0) {
      e.practical_credit = 'Practical credit must be a positive number'
    }
    if (formData.practical_credit && Number(formData.practical_credit) > 99) {
      e.practical_credit = 'Practical credit cannot exceed 99'
    }

    if (formData.exam_duration && Number(formData.exam_duration) < 0) {
      e.exam_duration = 'Duration must be a positive number'
    }
    if (formData.exam_duration && Number(formData.exam_duration) > 150) {
      e.exam_duration = 'Duration cannot exceed 9999 hours'
    }

    // Split credit validation
    if (formData.split_credit) {
      if (!formData.theory_credit || Number(formData.theory_credit) === 0) {
        e.theory_credit = 'Theory credit is required when split credit is enabled'
      }
      if (!formData.practical_credit || Number(formData.practical_credit) === 0) {
        e.practical_credit = 'Practical credit is required when split credit is enabled'
      }
      // Validate that theory + practical credits match total credits
      const totalSplit = Number(formData.theory_credit || 0) + Number(formData.practical_credit || 0)
      const totalCredit = Number(formData.credits || 0)
      if (totalSplit !== totalCredit && totalCredit > 0) {
        e.credits = 'Total credit should equal theory + practical credits'
      }
    }

    // QP setter and scrutinizer validations
    if (formData.no_of_qp_setter && Number(formData.no_of_qp_setter) < 0) {
      e.no_of_qp_setter = 'Number of QP setter must be a positive number'
    }
    if (formData.no_of_qp_setter && Number(formData.no_of_qp_setter) > 100) {
      e.no_of_qp_setter = 'Number of QP setter cannot exceed 100'
    }

    // Validate required numeric fields for marks and hours
    const requiredNumericFields = [
      { field: 'class_hours', label: 'Class Hours', max: 999 },
      { field: 'theory_hours', label: 'Theory Hours', max: 999 },
      { field: 'practical_hours', label: 'Practical Hours', max: 999 },
      { field: 'internal_max_mark', label: 'Internal Max Mark', max: 999 },
      { field: 'internal_pass_mark', label: 'Internal Pass Mark', max: 999 },
      { field: 'internal_converted_mark', label: 'Internal Converted Mark', max: 999 },
      { field: 'external_max_mark', label: 'External Max Mark', max: 999 },
      { field: 'external_pass_mark', label: 'External Pass Mark', max: 999 },
      { field: 'external_converted_mark', label: 'External Converted Mark', max: 999 },
      { field: 'total_pass_mark', label: 'Total Pass Mark', max: 999 },
      { field: 'total_max_mark', label: 'Total Max Mark', max: 999 },
    ]

    requiredNumericFields.forEach(({ field, label, max }) => {
      const value = (formData as any)[field]
      if (!value || value.trim() === '') {
        e[field] = `${label} is required`
      } else if (isNaN(Number(value))) {
        e[field] = `${label} must be a number`
      } else if (Number(value) < 0) {
        e[field] = `${label} must be positive or zero`
      } else if (Number(value) > max) {
        e[field] = `${label} cannot exceed ${max}`
      }
    })

    if (formData.no_of_scrutinizer && Number(formData.no_of_scrutinizer) < 0) {
      e.no_of_scrutinizer = 'Number of scrutinizer must be a positive number'
    }
    if (formData.no_of_scrutinizer && Number(formData.no_of_scrutinizer) > 100) {
      e.no_of_scrutinizer = 'Number of scrutinizer cannot exceed 100'
    }

    // URL validation
    if (formData.syllabus_pdf_url && formData.syllabus_pdf_url.trim()) {
      try {
        new URL(formData.syllabus_pdf_url)
      } catch {
        e.syllabus_pdf_url = 'Please enter a valid URL'
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) {
      toast({
        title: '❌ Validation Failed',
        description: 'Please correct the errors in the form before submitting.',
        variant: 'destructive',
        className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
      })
      return
    }
    try {
      const saved = editing
        ? await updateCourse(editing.id, formData as any)
        : await createCourse(formData as any)

      if (editing) {
        setCourses(p => p.map(c => c.id === editing.id ? saved : c))
        toast({ title: '✅ Record Updated', description: `${formData.course_title} has been successfully updated.`, className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' })
      } else {
        setCourses(p => [saved, ...p])
        toast({ title: '✅ Record Created', description: `${formData.course_title} has been successfully created.`, className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' })
      }
      setSheetOpen(false)
      resetForm()
    } catch (e) {
      console.error('Save course error:', e)
      const errorMessage = e instanceof Error ? e.message : 'Failed to save record. Please try again.'
      toast({ title: '❌ Operation Failed', description: errorMessage, variant: 'destructive', className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200' })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await deleteCourseService(courseId)
      setCourses(courses.filter(course => course.id !== courseId))
      setDeleteCourseId(null)
    } catch (error) {
      console.error('Error deleting course:', error)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate()
      toast({
        title: '✅ Template Downloaded',
        description: 'Course master template with reference data has been downloaded successfully.',
        className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
      })
    } catch (error) {
      console.error('Template download error:', error)
      toast({
        title: '❌ Download Failed',
        description: 'Failed to download course template. Please try again.',
        variant: 'destructive',
        className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
      })
    }
  }

  const downloadCoursesExcel = () => {
    const data = courses.map(c => ({
      'Institution Code': c.institution_code || '',
      'Regulation Code': c.regulation_code || '',
      'Offering Department Code': c.offering_department_code || '',
      'Board Code': c.board_code || '',
      'Program Code': c.program_code || '',
      'Program Name': c.program_name || '',
      'Course Code': c.course_code,
      'Course Name': c.course_title,
      'Display Code': c.display_code || '',
      'Course Category': c.course_category || '',
      'Course Type': c.course_type || '',
      'Part': c.course_part_master || '',
      'Credit': c.credits || 0,
      'Split Credit': c.split_credit ? 'TRUE' : 'FALSE',
      'Theory Credit': c.theory_credit || 0,
      'Practical Credit': c.practical_credit || 0,
      'QP Code': c.qp_code || '',
      'E-Code Name': c.e_code_name || '',
      'Exam Duration (hours)': c.exam_duration || 0,
      'Evaluation Type': c.evaluation_type || '',
      'Result Type': c.result_type || 'Mark',
      'Self Study Course': c.self_study_course ? 'TRUE' : 'FALSE',
      'Outside Class Course': c.outside_class_course ? 'TRUE' : 'FALSE',
      'Open Book': c.open_book ? 'TRUE' : 'FALSE',
      'Online Course': c.online_course ? 'TRUE' : 'FALSE',
      'Dummy Number Required': c.dummy_number_required ? 'TRUE' : 'FALSE',
      'Annual Course': c.annual_course ? 'TRUE' : 'FALSE',
      'Multiple QP Set': c.multiple_qp_set ? 'TRUE' : 'FALSE',
      'No of QP Setter': c.no_of_qp_setter || '',
      'No of Scrutinizer': c.no_of_scrutinizer || '',
      'Fee Exception': c.fee_exception ? 'TRUE' : 'FALSE',
      'Syllabus PDF URL': c.syllabus_pdf_url || '',
      'Description': c.description || '',
      'Class Hours': c.class_hours || '',
      'Theory Hours': c.theory_hours || '',
      'Practical Hours': c.practical_hours || '',
      'Internal Max Mark': c.internal_max_mark || '',
      'Internal Pass Mark': c.internal_pass_mark || '',
      'Internal Converted Mark': c.internal_converted_mark || '',
      'External Max Mark': c.external_max_mark || '',
      'External Pass Mark': c.external_pass_mark || '',
      'External Converted Mark': c.external_converted_mark || 0,
      'Total Pass Mark': c.total_pass_mark || 0,
      'Total Max Mark': c.total_max_mark || 0,
      'Annual Semester': c.annual_semester ? 'TRUE' : 'FALSE',
      'Registration Based': c.registration_based ? 'TRUE' : 'FALSE',
      'Status': c.is_active ? 'TRUE' : 'FALSE',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Courses_Temp')
    XLSX.writeFile(wb, `courses_temp_${new Date().toISOString().split('T')[0]}.xlsx`)

    toast({
      title: '✅ Export Successful',
      description: `${courses.length} courses (temp) exported to Excel.`,
      className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
    })
  }

  const downloadCoursesJSON = () => {
    const data = courses.map(c => ({
      institution_code: c.institution_code || '',
      regulation_code: c.regulation_code || '',
      offering_department_code: c.offering_department_code || '',
      board_code: c.board_code || '',
      program_code: c.program_code || '',
      program_name: c.program_name || '',
      course_code: c.course_code,
      course_title: c.course_title,
      display_code: c.display_code || '',
      course_category: c.course_category || '',
      course_type: c.course_type || '',
      course_part_master: c.course_part_master || '',
      credits: c.credits || 0,
      split_credit: c.split_credit || false,
      theory_credit: c.theory_credit || 0,
      practical_credit: c.practical_credit || 0,
      qp_code: c.qp_code || '',
      e_code_name: c.e_code_name || '',
      exam_duration: c.exam_duration || 0,
      evaluation_type: c.evaluation_type || '',
      result_type: c.result_type || 'Mark',
      self_study_course: c.self_study_course || false,
      outside_class_course: c.outside_class_course || false,
      open_book: c.open_book || false,
      online_course: c.online_course || false,
      dummy_number_required: c.dummy_number_required || false,
      annual_course: c.annual_course || false,
      multiple_qp_set: c.multiple_qp_set || false,
      no_of_qp_setter: c.no_of_qp_setter || null,
      no_of_scrutinizer: c.no_of_scrutinizer || null,
      fee_exception: c.fee_exception || false,
      syllabus_pdf_url: c.syllabus_pdf_url || '',
      description: c.description || '',
      is_active: c.is_active,
      class_hours: c.class_hours || null,
      theory_hours: c.theory_hours || null,
      practical_hours: c.practical_hours || null,
      internal_max_mark: c.internal_max_mark || null,
      internal_pass_mark: c.internal_pass_mark || null,
      internal_converted_mark: c.internal_converted_mark || null,
      external_max_mark: c.external_max_mark || null,
      external_pass_mark: c.external_pass_mark || null,
      external_converted_mark: c.external_converted_mark || null,
      total_pass_mark: c.total_pass_mark || null,
      total_max_mark: c.total_max_mark || null,
    }))

    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `courses_temp_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: '✅ Export Successful',
      description: `${courses.length} courses (temp) exported to JSON.`,
      className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
    })
  }

  const refreshCourses = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/master/courses-temp')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
        toast({
          title: '✅ Refreshed',
          description: `Loaded ${data.length} courses (temp).`,
          className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
        })
      } else {
        toast({
          title: '❌ Refresh Failed',
          description: 'Failed to load courses.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error refreshing courses:', error)
      toast({
        title: '❌ Refresh Failed',
        description: 'Failed to load courses.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      let jsonData: any[] = []

      // Check file type
      if (file.name.endsWith('.json')) {
        // Handle JSON file
        const text = await file.text()
        const parsed = JSON.parse(text)
        jsonData = Array.isArray(parsed) ? parsed : [parsed]
      } else {
        // Handle Excel file
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data)
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]
      }

      let successCount = 0
      let errorCount = 0
      const errorDetails: string[] = []

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        const rowNumber = i + 2 // +2 because row 1 is headers and array is 0-indexed

        try {
          const payload = {
            institution_code: row['Institution Code*'] || row['Institution Code'] || row.institution_code,
            regulation_code: row['Regulation Code*'] || row['Regulation Code'] || row.regulation_code,
            offering_department_code: row['Offering Department Code*'] || row['Offering Department Code'] || row.offering_department_code || null,
            board_code: row['Board Code'] || row.board_code || null,
            program_code: row['Program Code'] || row.program_code || null,
            program_name: row['Program Name'] || row.program_name || null,
            course_code: row['Course Code*'] || row['Course Code'] || row.course_code,
            course_title: row['Course Name*'] || row['Course Name'] || row.course_title,
            display_code: row['Display Code*'] || row['Display Code'] || row.display_code,
            course_category: row['Course Category*'] || row['Course Category'] || row.course_category,
            course_type: row['Course Type'] || row.course_type || null,
            course_part_master: row['Course Part Master'] || row['Part'] || row.course_part_master || null,
            credits: Number(row['Credit'] || row.credits) || 0,
            split_credit: typeof row.split_credit === 'boolean' ? row.split_credit : String(row['Split Credit'] || row['Split Credit (TRUE/FALSE)'] || '').toUpperCase() === 'TRUE',
            theory_credit: Number(row['Theory Credit'] || row.theory_credit) || 0,
            practical_credit: Number(row['Practical Credit'] || row.practical_credit) || 0,
            qp_code: row['QP Code*'] || row['QP Code'] || row.qp_code,
            e_code_name: row['E Code Name'] || row['E-Code Name'] || row['E-Code Name (Tamil/English/French/Malayalam/Hindi)'] || row.e_code_name || null,
            exam_duration: Number(row['Exam Duration Hours'] || row['Exam Duration (hours)'] || row['Exam Duration'] || row.exam_duration) || 0,
            evaluation_type: row['Evaluation Type*'] || row['Evaluation Type'] || row['Evaluation Type* (CA/ESE/CA + ESE)'] || row.evaluation_type,
            result_type: row['Result Type*'] || row['Result Type'] || row['Result Type* (Mark/Status)'] || row.result_type || 'Mark',
            self_study_course: typeof row.self_study_course === 'boolean' ? row.self_study_course : String(row['Self Study Course'] || row['Self Study Course (TRUE/FALSE)'] || '').toUpperCase() === 'TRUE',
            outside_class_course: typeof row.outside_class_course === 'boolean' ? row.outside_class_course : String(row['Outside Class Course'] || row['Outside Class Course (TRUE/FALSE)'] || '').toUpperCase() === 'TRUE',
            open_book: typeof row.open_book === 'boolean' ? row.open_book : String(row['Open Book'] || row['Open Book (TRUE/FALSE)'] || '').toUpperCase() === 'TRUE',
            online_course: typeof row.online_course === 'boolean' ? row.online_course : String(row['Online Course'] || row['Online Course (TRUE/FALSE)'] || '').toUpperCase() === 'TRUE',
            dummy_number_required: typeof row.dummy_number_required === 'boolean' ? row.dummy_number_required : String(row['Dummy Number Not Required'] || row['Dummy Number Required'] || row['Dummy Number Required (TRUE/FALSE)'] || '').toUpperCase() === 'TRUE',
            annual_course: typeof row.annual_course === 'boolean' ? row.annual_course : String(row['Annual Course'] || row['Annual Course (TRUE/FALSE)'] || '').toUpperCase() === 'TRUE',
            multiple_qp_set: typeof row.multiple_qp_set === 'boolean' ? row.multiple_qp_set : String(row['Multiple QP Set'] || row['Multiple QP Set (TRUE/FALSE)'] || '').toUpperCase() === 'TRUE',
            no_of_qp_setter: Number(row['No of QP Setter'] || row.no_of_qp_setter) || null,
            no_of_scrutinizer: Number(row['No of Scrutinizer'] || row.no_of_scrutinizer) || null,
            fee_exception: typeof row.fee_exception === 'boolean' ? row.fee_exception : String(row['Fee Exception'] || row['Fee Exception (TRUE/FALSE)'] || '').toUpperCase() === 'TRUE',
            syllabus_pdf_url: row['Syllabus PDF URL'] || row.syllabus_pdf_url || null,
            description: row['Description'] || row.description || null,
            class_hours: Number(row['Class Hours'] || row.class_hours) || 0,
            theory_hours: Number(row['Theory Hours'] || row.theory_hours) || 0,
            practical_hours: Number(row['Practical Hours'] || row.practical_hours) || 0,
            internal_max_mark: Number(row['Internal Max Mark'] || row.internal_max_mark) || 0,
            internal_pass_mark: Number(row['Internal Pass Mark'] || row.internal_pass_mark) || 0,
            internal_converted_mark: Number(row['Internal Converted Mark'] || row.internal_converted_mark) || 0,
            external_max_mark: Number(row['External Max Mark'] || row.external_max_mark) || 0,
            external_pass_mark: Number(row['External Pass Mark'] || row.external_pass_mark) || 0,
            external_converted_mark: Number(row['External Converted Mark'] || row.external_converted_mark) || 0,
            total_pass_mark: Number(row['Total Pass Mark'] || row.total_pass_mark) || 0,
            total_max_mark: Number(row['Total Max Mark'] || row.total_max_mark) || 0,
            annual_semester: typeof row.annual_semester === 'boolean' ? row.annual_semester : String(row['Annual Semester'] || row['Annual Semester (TRUE/FALSE)'] || 'FALSE').toUpperCase() === 'TRUE',
            registration_based: typeof row.registration_based === 'boolean' ? row.registration_based : String(row['Registration Based'] || row['Registration Based (TRUE/FALSE)'] || 'FALSE').toUpperCase() === 'TRUE',
            is_active: typeof row.is_active === 'boolean' ? row.is_active : String(row['Status'] || row['Status (TRUE/FALSE)'] || 'TRUE').toUpperCase() !== 'FALSE'
          }

          // Client-side validation
          const validationErrors: string[] = []

          if (!payload.institution_code?.trim()) validationErrors.push('Institution code required')
          if (!payload.regulation_code?.trim()) validationErrors.push('Regulation code required')
          if (!payload.course_code?.trim()) validationErrors.push('Course code required')
          if (!payload.course_title?.trim()) validationErrors.push('Course name required')
          if (!payload.display_code?.trim()) validationErrors.push('Display code required')
          if (!payload.qp_code?.trim()) validationErrors.push('QP code required')
          if (!payload.course_category) validationErrors.push('Course category required')
          if (!payload.evaluation_type) validationErrors.push('Evaluation type required')
          if (!payload.result_type) validationErrors.push('Result type required')

          if (payload.course_code && !/^[A-Za-z0-9\-_]+$/.test(payload.course_code)) {
            validationErrors.push('Invalid course code format')
          }

          if (payload.credits && (payload.credits < 0 || payload.credits > 99)) {
            validationErrors.push('Credit must be 0-99')
          }

          if (validationErrors.length > 0) {
            errorCount++
            errorDetails.push(`Row ${rowNumber}: ${validationErrors.join(', ')}`)
            continue
          }

          const res = await fetch('/api/master/courses-temp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })

          if (res.ok) {
            successCount++
          } else {
            errorCount++
            const errorData = await res.json().catch(() => ({}))
            const errorMsg = errorData.error || errorData.details || 'Failed to save'
            errorDetails.push(`Row ${rowNumber}: ${errorMsg}`)
          }
        } catch (err) {
          errorCount++
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          errorDetails.push(`Row ${rowNumber}: ${errorMsg}`)
        }
      }

      // Refresh courses list
      const response = await fetch('/api/master/courses-temp')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }

      // Show detailed results
      if (errorCount === 0) {
        toast({
          title: '✅ Upload Complete',
          description: `${successCount} courses uploaded successfully!`,
          className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
        })
      } else if (successCount > 0) {
        setUploadErrors(errorDetails)
        setShowErrorDialog(true)
        toast({
          title: '⚠️ Partial Upload',
          description: `${successCount} succeeded, ${errorCount} failed. Click to view errors.`,
          className: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200'
        })
      } else {
        setUploadErrors(errorDetails)
        setShowErrorDialog(true)
        toast({
          title: '❌ Upload Failed',
          description: `All ${errorCount} rows failed. Click to view errors.`,
          variant: 'destructive',
          className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
        })
      }

      // Reset file input
      e.target.value = ''
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: '❌ Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to process file.',
        variant: 'destructive',
        className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
      })
    }
  }

  const formatCurrentDateTime = (date: Date | null) => {
    if (!date) return "Loading..."
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
    
    return `${day}-${month}-${year} | ${weekday} | ${time}`
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PremiumNavbar
          title="Courses (Temp)"
          description="Manage temporary course data with program information"
          showSearch={true}
        />

        <PageTransition>
          <div className="flex flex-1 flex-col gap-2 p-2 md:p-2 min-h-[calc(100vh-4rem)]">
            {/* Breadcrumb Navigation */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard" className="hover:text-emerald-600">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Courses (Temp)</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Premium Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Courses */}
              <div className="card-premium-hover p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Courses</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-grotesk">{courses.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <BookText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Active Courses */}
              <div className="card-premium-hover p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Active Courses</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-grotesk">
                      {courses.filter(course => course.is_active).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Inactive Courses */}
              <div className="card-premium-hover p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Inactive Courses</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1 font-grotesk">
                      {courses.filter(course => !course.is_active).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <BookText className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </div>

              {/* New This Month */}
              <div className="card-premium-hover p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">New This Month</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1 font-grotesk">
                      {courses.filter(course => {
                        const courseDate = new Date(course.created_at)
                        const now = new Date()
                        return courseDate.getMonth() === now.getMonth() && courseDate.getFullYear() === now.getFullYear()
                      }).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="card-premium overflow-hidden flex-1 flex flex-col">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    {/* Filter Dropdowns */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Core">Core</SelectItem>
                        <SelectItem value="Elective">Elective</SelectItem>
                        <SelectItem value="Practical">Practical</SelectItem>
                        <SelectItem value="Project">Project</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Search Bar */}
                    <div className="relative w-full sm:w-[240px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 search-premium"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={refreshCourses} disabled={loading} className="btn-premium-secondary">
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button variant="outline" onClick={handleDownloadTemplate} className="btn-premium-secondary">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Template
                    </Button>
                    <Button variant="outline" onClick={downloadCoursesExcel} className="btn-premium-secondary">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" onClick={downloadCoursesJSON} className="btn-premium-secondary">
                      <FileJson className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                    <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()} className="btn-premium-secondary">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button onClick={openAdd} className="btn-premium-primary">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col min-h-0">
                {/* Data Table */}
                <div className="rounded-md border overflow-hidden flex-1 min-h-[400px]">
                  <div className="h-full overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                          <TableHead
                            className="w-[120px] text-[11px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => handleSort('course_code')}
                          >
                            <div className="flex items-center gap-1">
                              Course Code
                              {sortField === 'course_code' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-[11px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => handleSort('course_title')}
                          >
                            <div className="flex items-center gap-1">
                              Course Name
                              {sortField === 'course_title' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                            </div>
                          </TableHead>
                          <TableHead
                            className="w-[140px] text-[11px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => handleSort('course_category')}
                          >
                            <div className="flex items-center gap-1">
                              Course Category
                              {sortField === 'course_category' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                            </div>
                          </TableHead>
                          <TableHead
                            className="w-[80px] text-[11px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => handleSort('credits')}
                          >
                            <div className="flex items-center gap-1">
                              Credit
                              {sortField === 'credits' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                            </div>
                          </TableHead>
                          <TableHead
                            className="w-[120px] text-[11px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => handleSort('exam_duration')}
                          >
                            <div className="flex items-center gap-1">
                              Exam Duration
                              {sortField === 'exam_duration' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                            </div>
                          </TableHead>
                          <TableHead
                            className="w-[120px] text-[11px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => handleSort('qp_code')}
                          >
                            <div className="flex items-center gap-1">
                              QP Code
                              {sortField === 'qp_code' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                            </div>
                          </TableHead>
                          <TableHead
                            className="w-[100px] text-[11px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => handleSort('is_active')}
                          >
                            <div className="flex items-center gap-1">
                              Status
                              {sortField === 'is_active' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                            </div>
                          </TableHead>
                          <TableHead className="w-[120px] text-[11px] text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center text-[11px]">
                              Loading courses...
                            </TableCell>
                          </TableRow>
                        ) : filteredCourses.length > 0 ? (
                          <>
                            {filteredCourses.map((course) => (
                              <TableRow key={course.id}>
                                <TableCell className="font-medium text-[11px]">
                                  {course.course_code}
                                </TableCell>
                                <TableCell className="font-medium text-[11px]">
                                  {course.course_title}
                                </TableCell>
                                <TableCell className="text-[11px]">
                                  {course.course_category || '-'}
                                </TableCell>
                                <TableCell className="text-[11px]">{course.credits}</TableCell>
                                <TableCell className="text-[11px]">
                                  {course.exam_duration ? `${course.exam_duration} hrs` : '-'}
                                </TableCell>
                                <TableCell className="text-[11px]">
                                  {course.qp_code || '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusBadgeVariant(course)} className="text-[11px]">
                                    {getStatusText(course)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openEdit(course)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Course</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this course? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteCourse(course.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {/* Fill empty rows to maintain consistent height */}
                            {Array.from({ length: Math.max(0, itemsPerPage - filteredCourses.length) }).map((_, index) => (
                              <TableRow key={`empty-${index}`}>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                              </TableRow>
                            ))}
                          </>
                        ) : (
                          <>
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-xs">
                                No courses found.
                              </TableCell>
                            </TableRow>
                            {/* Fill remaining rows */}
                            {Array.from({ length: itemsPerPage - 1 }).map((_, index) => (
                              <TableRow key={`empty-no-data-${index}`}>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between space-x-2 py-2 mt-2">
                  <div className="text-xs text-muted-foreground">
                    Showing {filteredCourses.length === 0 ? 0 : 1}-{Math.min(itemsPerPage, filteredCourses.length)} of {filteredCourses.length} courses
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-7 px-2 text-xs"
                    >
                      <ChevronLeft className="h-3 w-3 mr-1" />
                      Previous
                    </Button>
                    <div className="text-xs text-muted-foreground px-2">
                      Page {currentPage} of {Math.ceil(filteredCourses.length / itemsPerPage) || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredCourses.length / itemsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil(filteredCourses.length / itemsPerPage)}
                      className="h-7 px-2 text-xs"
                    >
                      Next
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PageTransition>
        <AppFooter />
      </SidebarInset>

      {/* Sheet for Add/Edit - Outside Sidebar */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) resetForm(); setSheetOpen(o) }}>
        <SheetContent className="sm:max-w-[1000px] overflow-y-auto">
          <SheetHeader className="pb-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <BookText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {editing ? 'Edit Course' : 'Add Course'}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editing ? 'Update course information' : 'Create a new course'}
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-blue-200 dark:border-blue-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                  <BookText className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Basic Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Institution Code <span className="text-red-500">*</span></Label>
                  <Select value={formData.institution_code} onValueChange={(v) => setFormData({ ...formData, institution_code: v })}>
                    <SelectTrigger className={`h-10 ${errors.institution_code ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder={codesLoading ? 'Loading...' : 'Select institution'} />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions.map(i => (
                        <SelectItem key={i.id} value={i.institution_code}>{i.institution_code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.institution_code && <p className="text-xs text-destructive">{errors.institution_code}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Regulation Code <span className="text-red-500">*</span></Label>
                  <Select value={formData.regulation_code} onValueChange={(v) => setFormData({ ...formData, regulation_code: v })}>
                    <SelectTrigger className={`h-10 ${errors.regulation_code ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder={codesLoading ? 'Loading...' : 'Select regulation'} />
                    </SelectTrigger>
                    <SelectContent>
                      {regulations.map(r => (
                        <SelectItem key={r.id} value={r.regulation_code}>{r.regulation_code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.regulation_code && <p className="text-xs text-destructive">{errors.regulation_code}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Offering Department Code</Label>
                  <Select value={formData.offering_department_code} onValueChange={(v) => setFormData({ ...formData, offering_department_code: v })}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={codesLoading ? 'Loading...' : 'Select department'} />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentsSrc.map(d => (
                        <SelectItem key={d.id} value={d.department_code}>{d.department_code}{d.department_name ? ` - ${d.department_name}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Board Code</Label>
                  <Input value={formData.board_code} onChange={(e) => setFormData({ ...formData, board_code: e.target.value })} className="h-10" placeholder="Enter board code (optional)" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Program Code</Label>
                  <Input value={formData.program_code} onChange={(e) => setFormData({ ...formData, program_code: e.target.value })} className="h-10" placeholder="Enter program code (optional)" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Program Name</Label>
                  <Input value={formData.program_name} onChange={(e) => setFormData({ ...formData, program_name: e.target.value })} className="h-10" placeholder="Enter program name (optional)" />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-sm font-semibold">Course Code <span className="text-red-500">*</span></Label>
                  <Input value={formData.course_code} onChange={(e) => {
                    const v = e.target.value
                    setFormData({
                      ...formData,
                      course_code: v,
                      display_code: formData.display_code || v,
                      qp_code: formData.qp_code || v,
                    })
                  }} className={`h-10 ${errors.course_code ? 'border-destructive' : ''}`} placeholder="e.g., CS101" />
                  {errors.course_code && <p className="text-xs text-destructive">{errors.course_code}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-semibold">Course Name <span className="text-red-500">*</span></Label>
                  <Input value={formData.course_title} onChange={(e) => setFormData({ ...formData, course_title: e.target.value })} className={`h-10 ${errors.course_title ? 'border-destructive' : ''}`} placeholder="Enter course name" />
                  {errors.course_title && <p className="text-xs text-destructive">{errors.course_title}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Display Code <span className="text-red-500">*</span></Label>
                  <Input value={formData.display_code} onChange={(e) => setFormData({ ...formData, display_code: e.target.value })} className={`h-10 ${errors.display_code ? 'border-destructive' : ''}`} placeholder="Will default from course code" />
                  {errors.display_code && <p className="text-xs text-destructive">{errors.display_code}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Course Category <span className="text-red-500">*</span></Label>
                  <Select value={formData.course_category} onValueChange={(v) => setFormData({ ...formData, course_category: v })}>
                    <SelectTrigger className={`h-10 ${errors.course_category ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Theory">Theory</SelectItem>
                      <SelectItem value="Practical">Practical</SelectItem>
                      <SelectItem value="Project">Project</SelectItem>
                      <SelectItem value="Non Academic">Non Academic</SelectItem>
                      <SelectItem value="Theory + Practical">Theory + Practical</SelectItem>
                      <SelectItem value="Theory + Project">Theory + Project</SelectItem>
                      <SelectItem value="Field Work">Field Work</SelectItem>
                      <SelectItem value="Community Service">Community Service</SelectItem>
                      <SelectItem value="Group Project">Group Project</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.course_category && <p className="text-xs text-destructive">{errors.course_category}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Course Type</Label>
                  <Select value={formData.course_type} onValueChange={(v) => setFormData({ ...formData, course_type: v })}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Core">Core</SelectItem>
                      <SelectItem value="Generic Elective">Generic Elective</SelectItem>
                      <SelectItem value="Skill Enhancement">Skill Enhancement</SelectItem>
                      <SelectItem value="Ability Enhancement">Ability Enhancement</SelectItem>
                      <SelectItem value="Language">Language</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Advance learner course">Advance learner course</SelectItem>
                      <SelectItem value="Additional Credit course">Additional Credit course</SelectItem>
                      <SelectItem value="Discipline Specific elective">Discipline Specific elective</SelectItem>
                      <SelectItem value="Audit Course">Audit Course</SelectItem>
                      <SelectItem value="Bridge course">Bridge course</SelectItem>
                      <SelectItem value="Non Academic">Non Academic</SelectItem>
                      <SelectItem value="Naanmuthalvan">Naanmuthalvan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Part</Label>
                  <Select value={formData.course_part_master} onValueChange={(v) => setFormData({ ...formData, course_part_master: v })}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select part" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Part I">Part I</SelectItem>
                      <SelectItem value="Part II">Part II</SelectItem>
                      <SelectItem value="Part III">Part III</SelectItem>
                      <SelectItem value="Part IV">Part IV</SelectItem>
                      <SelectItem value="Part V">Part V</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Credit <span className="text-red-500">*</span></Label>
                  <Input type="number" step="1" value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: e.target.value })} className={`h-10 ${errors.credits ? 'border-destructive' : ''}`} placeholder="e.g., 3" />
                  {errors.credits && <p className="text-xs text-destructive">{errors.credits}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Split Credit</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.split_credit} onCheckedChange={(v) => setFormData({ ...formData, split_credit: v })} />
                    <span className={`text-sm font-medium ${formData.split_credit ? 'text-green-600' : 'text-gray-500'}`}>{formData.split_credit ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={`text-sm font-semibold ${!formData.split_credit ? 'text-gray-400' : ''}`}>Theory Credit</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.theory_credit}
                    onChange={(e) => setFormData({ ...formData, theory_credit: e.target.value })}
                    className={`h-10 ${errors.theory_credit ? 'border-destructive' : ''}`}
                    disabled={!formData.split_credit}
                  />
                  {errors.theory_credit && <p className="text-xs text-destructive">{errors.theory_credit}</p>}
                </div>
                <div className="space-y-2">
                  <Label className={`text-sm font-semibold ${!formData.split_credit ? 'text-gray-400' : ''}`}>Practical Credit</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.practical_credit}
                    onChange={(e) => setFormData({ ...formData, practical_credit: e.target.value })}
                    className={`h-10 ${errors.practical_credit ? 'border-destructive' : ''}`}
                    disabled={!formData.split_credit}
                  />
                  {errors.practical_credit && <p className="text-xs text-destructive">{errors.practical_credit}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">QP Code <span className="text-red-500">*</span></Label>
                  <Input value={formData.qp_code} onChange={(e) => setFormData({ ...formData, qp_code: e.target.value })} className={`h-10 ${errors.qp_code ? 'border-destructive' : ''}`} />
                  {errors.qp_code && <p className="text-xs text-destructive">{errors.qp_code}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">E-Code Name</Label>
                  <Select value={formData.e_code_name || undefined} onValueChange={(v) => setFormData({ ...formData, e_code_name: v })}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select language (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tamil">Tamil</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="Malayalam">Malayalam</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Duration (hours) <span className="text-red-500">*</span></Label>
                  <Input type="number" step="1" value={formData.exam_duration} onChange={(e) => setFormData({ ...formData, exam_duration: e.target.value })} className={`h-10 ${errors.exam_duration ? 'border-destructive' : ''}`} />
                  {errors.exam_duration && <p className="text-xs text-destructive">{errors.exam_duration}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Evaluation Type <span className="text-red-500">*</span></Label>
                  <Select value={formData.evaluation_type} onValueChange={(v) => setFormData({ ...formData, evaluation_type: v })}>
                    <SelectTrigger className={`h-10 ${errors.evaluation_type ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select evaluation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CA">CA</SelectItem>
                      <SelectItem value="ESE">ESE</SelectItem>
                      <SelectItem value="CA + ESE">CA + ESE</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.evaluation_type && <p className="text-xs text-destructive">{errors.evaluation_type}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Result Type <span className="text-red-500">*</span></Label>
                  <Select value={formData.result_type} onValueChange={(v) => setFormData({ ...formData, result_type: v })}>
                    <SelectTrigger className={`h-10 ${errors.result_type ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select result type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mark">Mark</SelectItem>
                      <SelectItem value="Status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.result_type && <p className="text-xs text-destructive">{errors.result_type}</p>}
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-sm font-semibold">Syllabus PDF URL</Label>
                  <Input value={formData.syllabus_pdf_url} onChange={(e) => setFormData({ ...formData, syllabus_pdf_url: e.target.value })} className={`h-10 ${errors.syllabus_pdf_url ? 'border-destructive' : ''}`} />
                  {errors.syllabus_pdf_url && <p className="text-xs text-destructive">{errors.syllabus_pdf_url}</p>}
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-sm font-semibold">Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-[100px]" placeholder="Add details about the course" />
                </div>
              </div>
            </div>
{/* Marks and Hours Section */}
<div className="space-y-4">
  <div className="flex items-center gap-3 pb-3 border-b border-orange-200 dark:border-orange-800">
    <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
      <BookText className="h-4 w-4 text-white" />
    </div>
    <h3 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Marks & Hours</h3>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Class Hours <span className="text-red-500">*</span></Label>
      <Input type="number" step="1" value={formData.class_hours} onChange={(e) => setFormData({ ...formData, class_hours: e.target.value })} className={`h-10 ${errors.class_hours ? 'border-destructive' : ''}`} placeholder="0" />
      {errors.class_hours && <p className="text-xs text-destructive">{errors.class_hours}</p>}
    </div>
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Theory Hours <span className="text-red-500">*</span></Label>
      <Input type="number" step="1" value={formData.theory_hours} onChange={(e) => setFormData({ ...formData, theory_hours: e.target.value })} className={`h-10 ${errors.theory_hours ? 'border-destructive' : ''}`} placeholder="0" />
      {errors.theory_hours && <p className="text-xs text-destructive">{errors.theory_hours}</p>}
    </div>
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Practical Hours <span className="text-red-500">*</span></Label>
      <Input type="number" step="1" value={formData.practical_hours} onChange={(e) => setFormData({ ...formData, practical_hours: e.target.value })} className={`h-10 ${errors.practical_hours ? 'border-destructive' : ''}`} placeholder="0" />
      {errors.practical_hours && <p className="text-xs text-destructive">{errors.practical_hours}</p>}
    </div>
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Internal Max Mark <span className="text-red-500">*</span></Label>
      <Input type="number" step="1" value={formData.internal_max_mark} onChange={(e) => setFormData({ ...formData, internal_max_mark: e.target.value })} className={`h-10 ${errors.internal_max_mark ? 'border-destructive' : ''}`} placeholder="0" />
      {errors.internal_max_mark && <p className="text-xs text-destructive">{errors.internal_max_mark}</p>}
    </div>
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Internal Pass Mark <span className="text-red-500">*</span></Label>
      <Input type="number" step="1" value={formData.internal_pass_mark} onChange={(e) => setFormData({ ...formData, internal_pass_mark: e.target.value })} className={`h-10 ${errors.internal_pass_mark ? 'border-destructive' : ''}`} placeholder="0" />
      {errors.internal_pass_mark && <p className="text-xs text-destructive">{errors.internal_pass_mark}</p>}
    </div>
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Internal Converted Mark <span className="text-red-500">*</span></Label>
      <Input type="number" step="1" value={formData.internal_converted_mark} onChange={(e) => setFormData({ ...formData, internal_converted_mark: e.target.value })} className={`h-10 ${errors.internal_converted_mark ? 'border-destructive' : ''}`} placeholder="0" />
      {errors.internal_converted_mark && <p className="text-xs text-destructive">{errors.internal_converted_mark}</p>}
    </div>
    <div className="space-y-2">
      <Label className="text-sm font-semibold">External Max Mark <span className="text-red-500">*</span></Label>
      <Input type="number" step="1" value={formData.external_max_mark} onChange={(e) => setFormData({ ...formData, external_max_mark: e.target.value })} className={`h-10 ${errors.external_max_mark ? 'border-destructive' : ''}`} placeholder="0" />
      {errors.external_max_mark && <p className="text-xs text-destructive">{errors.external_max_mark}</p>}
    </div>
    <div className="space-y-2">
      <Label className="text-sm font-semibold">External Pass Mark <span className="text-red-500">*</span></Label>
      <Input type="number" step="1" value={formData.external_pass_mark} onChange={(e) => setFormData({ ...formData, external_pass_mark: e.target.value })} className={`h-10 ${errors.external_pass_mark ? 'border-destructive' : ''}`} placeholder="0" />
      {errors.external_pass_mark && <p className="text-xs text-destructive">{errors.external_pass_mark}</p>}
    </div>
    <div className="space-y-2">
      <Label className="text-sm font-semibold">External Converted Mark <span className="text-red-500">*</span></Label>
      <Input type="number" step="1" value={formData.external_converted_mark} onChange={(e) => setFormData({ ...formData, external_converted_mark: e.target.value })} className={`h-10 ${errors.external_converted_mark ? 'border-destructive' : ''}`} placeholder="0" />
      {errors.external_converted_mark && <p className="text-xs text-destructive">{errors.external_converted_mark}</p>}
    </div>
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Total Pass Mark <span className="text-red-500">*</span></Label>
      <Input type="number" step="1" value={formData.total_pass_mark} onChange={(e) => setFormData({ ...formData, total_pass_mark: e.target.value })} className={`h-10 ${errors.total_pass_mark ? 'border-destructive' : ''}`} placeholder="0" />
      {errors.total_pass_mark && <p className="text-xs text-destructive">{errors.total_pass_mark}</p>}
    </div>
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Total Max Mark <span className="text-red-500">*</span></Label>
      <Input type="number" step="1" value={formData.total_max_mark} onChange={(e) => setFormData({ ...formData, total_max_mark: e.target.value })} className={`h-10 ${errors.total_max_mark ? 'border-destructive' : ''}`} placeholder="0" />
      {errors.total_max_mark && <p className="text-xs text-destructive">{errors.total_max_mark}</p>}
    </div>
  </div>
</div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-purple-200 dark:border-purple-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                  <BookText className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Course Settings</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Self Study Course</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.self_study_course} onCheckedChange={(v) => setFormData({ ...formData, self_study_course: v })} />
                    <span className={`text-sm font-medium ${formData.self_study_course ? 'text-green-600' : 'text-gray-500'}`}>{formData.self_study_course ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Outside Class Course</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.outside_class_course} onCheckedChange={(v) => setFormData({ ...formData, outside_class_course: v })} />
                    <span className={`text-sm font-medium ${formData.outside_class_course ? 'text-green-600' : 'text-gray-500'}`}>{formData.outside_class_course ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Open Book</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.open_book} onCheckedChange={(v) => setFormData({ ...formData, open_book: v })} />
                    <span className={`text-sm font-medium ${formData.open_book ? 'text-green-600' : 'text-gray-500'}`}>{formData.open_book ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Online Course</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.online_course} onCheckedChange={(v) => setFormData({ ...formData, online_course: v })} />
                    <span className={`text-sm font-medium ${formData.online_course ? 'text-green-600' : 'text-gray-500'}`}>{formData.online_course ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Dummy Number Required</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.dummy_number_required} onCheckedChange={(v) => setFormData({ ...formData, dummy_number_required: v })} />
                    <span className={`text-sm font-medium ${formData.dummy_number_required ? 'text-green-600' : 'text-gray-500'}`}>{formData.dummy_number_required ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Annual Course</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.annual_course} onCheckedChange={(v) => setFormData({ ...formData, annual_course: v })} />
                    <span className={`text-sm font-medium ${formData.annual_course ? 'text-green-600' : 'text-gray-500'}`}>{formData.annual_course ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Multiple QP Set</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.multiple_qp_set} onCheckedChange={(v) => setFormData({ ...formData, multiple_qp_set: v })} />
                    <span className={`text-sm font-medium ${formData.multiple_qp_set ? 'text-green-600' : 'text-gray-500'}`}>{formData.multiple_qp_set ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">No of QP Setter</Label>
                  <Input type="number" step="1" value={formData.no_of_qp_setter} onChange={(e) => setFormData({ ...formData, no_of_qp_setter: e.target.value })} className={`h-10 ${errors.no_of_qp_setter ? 'border-destructive' : ''}`} placeholder="0" />
                  {errors.no_of_qp_setter && <p className="text-xs text-destructive">{errors.no_of_qp_setter}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">No of Scrutinizer</Label>
                  <Input type="number" step="1" value={formData.no_of_scrutinizer} onChange={(e) => setFormData({ ...formData, no_of_scrutinizer: e.target.value })} className={`h-10 ${errors.no_of_scrutinizer ? 'border-destructive' : ''}`} placeholder="0" />
                  {errors.no_of_scrutinizer && <p className="text-xs text-destructive">{errors.no_of_scrutinizer}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Fee Exception</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.fee_exception} onCheckedChange={(v) => setFormData({ ...formData, fee_exception: v })} />
                    <span className={`text-sm font-medium ${formData.fee_exception ? 'text-green-600' : 'text-gray-500'}`}>{formData.fee_exception ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Annual Semester *</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.annual_semester} onCheckedChange={(v) => setFormData({ ...formData, annual_semester: v })} />
                    <span className={`text-sm font-medium ${formData.annual_semester ? 'text-green-600' : 'text-gray-500'}`}>{formData.annual_semester ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Registration Based *</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.registration_based} onCheckedChange={(v) => setFormData({ ...formData, registration_based: v })} />
                    <span className={`text-sm font-medium ${formData.registration_based ? 'text-green-600' : 'text-gray-500'}`}>{formData.registration_based ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-sm font-semibold">Status</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                    <span className={`text-sm font-medium ${formData.is_active ? 'text-green-600' : 'text-red-500'}`}>{formData.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button variant="outline" size="sm" className="h-10 px-6" onClick={() => { setSheetOpen(false); resetForm() }}>Cancel</Button>
              <Button size="sm" className="h-10 px-6" onClick={save}>{editing ? 'Update Course' : 'Create Course'}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Upload Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Upload Errors ({uploadErrors.length} rows failed)
            </AlertDialogTitle>
            <AlertDialogDescription>
              The following rows could not be imported. Please fix these errors and try again.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/30 my-4">
            <div className="space-y-2">
              {uploadErrors.map((error, index) => (
                <div key={index} className="p-3 bg-background border border-red-200 rounded-md">
                  <p className="text-sm font-mono text-red-600 dark:text-red-400">{error}</p>
                </div>
              ))}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowErrorDialog(false)
                setUploadErrors([])
              }}
              className="bg-primary"
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}