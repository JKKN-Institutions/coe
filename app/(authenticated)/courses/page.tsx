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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppFooter } from "@/components/app-footer"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
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
  GraduationCap,
  Clock,
  TrendingUp,
  Edit,
  Trash2,
  FileSpreadsheet,
} from "lucide-react"
import * as XLSX from 'xlsx'

// Course type definition
interface Course {
  id: string
  institutions_id?: string
  regulation_id?: string
  offering_department_id?: string
  institution_code?: string
  regulation_code?: string
  offering_department_code?: string
  course_code: string
  course_title: string
  display_code?: string
  course_category?: string
  course_type: string
  course_part_master?: string
  credits: number
  split_credit?: boolean
  theory_credit?: number
  practical_credit?: number
  qp_code?: string
  e_code_name?: string
  duration_hours?: number
  evaluation_type?: string
  result_type?: string
  self_study_course?: boolean
  outside_class_course?: boolean
  open_book?: boolean
  online_course?: boolean
  dummy_number_required?: boolean
  annual_course?: boolean
  multiple_qp_set?: boolean
  no_of_qp_setter?: number
  no_of_scrutinizer?: number
  fee_exception?: boolean
  syllabus_pdf_url?: string
  description?: string
  course_level: string
  is_active: boolean
  created_at: string
  updated_at: string
  programs?: {
    id: string
    program_name: string
    program_code: string
  }
  departments?: {
    id: string
    department_name: string
  }
  course_coordinator?: {
    id: string
    full_name: string
    email: string
  }
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null)
  const itemsPerPage = 10

  // Single-page add/edit state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const { toast } = useToast()
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Dropdown sources
  const [institutions, setInstitutions] = useState<Array<{ id: string, institution_code: string }>>([])
  const [departmentsSrc, setDepartmentsSrc] = useState<Array<{ id: string, department_code: string, department_name?: string }>>([])
  const [regulations, setRegulations] = useState<Array<{ id: string, regulation_code: string }>>([])
  const [codesLoading, setCodesLoading] = useState(false)

  const [formData, setFormData] = useState({
    institution_code: "",
    regulation_code: "",
    offering_department_code: "",
    course_code: "",
    course_title: "",
    display_code: "",
<<<<<<< HEAD
    course_category: "",
    course_type: "",
    course_part_master: "",
    credits: "",
    split_credit: false,
    theory_credit: "",
    practical_credit: "",
    qp_code: "",
    e_code_name: "",
    duration_hours: "",
    evaluation_type: "",
=======
    course_category: "Theory",
    course_type: "",
    course_part_master: "",
    credits: "0",
    split_credit: false,
    theory_credit: "0",
    practical_credit: "0",
    qp_code: "",
    e_code_name: "",
    duration_hours: "",
    evaluation_type: "CA",
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
    result_type: "Mark",
    self_study_course: false,
    outside_class_course: false,
    open_book: false,
    online_course: false,
<<<<<<< HEAD
    dummy_number_required: false,
=======
    dummy_number_not_required: true,
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
    annual_course: false,
    multiple_qp_set: false,
    no_of_qp_setter: "",
    no_of_scrutinizer: "",
    fee_exception: false,
    syllabus_pdf_url: "",
    description: "",
    is_active: true,
  })

  // Fetch courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/courses')
        if (response.ok) {
          const data = await response.json()
          setCourses(data)
        } else {
          let errorData: any = {}
          try {
            errorData = await response.json()
          } catch {
            const text = await response.text().catch(() => '')
            errorData = text ? { error: text } : { error: 'Unknown error' }
          }
          console.error(`Failed to fetch courses (status ${response.status}):`, errorData)
          
          // Check if courses table doesn't exist
          if (errorData.error === 'Courses table not found') {
            alert(`Database Setup Required:\n\n${errorData.message}\n\nPlease follow the instructions in the console to create the courses table.`)
            console.log('Setup Instructions:', errorData.instructions)
          }
        }
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
    // also fetch dropdown codes
    ;(async () => {
      try {
        setCodesLoading(true)
        const [instRes, deptRes, regRes] = await Promise.all([
          fetch('/api/institutions').catch(() => null),
          fetch('/api/departments').catch(() => null),
          fetch('/api/regulations').catch(() => null),
        ])
        if (instRes && instRes.ok) {
          const data = await instRes.json()
          const mapped = Array.isArray(data) ? data.filter((i: any) => i?.institution_code).map((i: any) => ({ id: i.id, institution_code: i.institution_code })) : []
          setInstitutions(mapped)
        }
        if (deptRes && deptRes.ok) {
          const data = await deptRes.json()
          const mapped = Array.isArray(data) ? data.filter((d: any) => d?.department_code).map((d: any) => ({ id: d.id, department_code: d.department_code, department_name: d.department_name })) : []
          setDepartmentsSrc(mapped)
        }
        if (regRes && regRes.ok) {
          const data = await regRes.json()
          const mapped = Array.isArray(data) ? data.filter((r: any) => r?.regulation_code).map((r: any) => ({ id: r.id, regulation_code: r.regulation_code })) : []
          setRegulations(mapped)
        }
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
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.course_title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && course.is_active) ||
                         (statusFilter === "inactive" && !course.is_active)
    const matchesType = typeFilter === "all" || course.course_type === typeFilter
    const matchesLevel = levelFilter === "all" || course.course_level === levelFilter
    return matchesSearch && matchesStatus && matchesType && matchesLevel
  })

  const getStatusBadgeVariant = (course: Course) => {
    return course.is_active ? "default" : "secondary"
  }

  const getStatusText = (course: Course) => {
    return course.is_active ? "Active" : "Inactive"
  }

  const getTypeBadgeVariant = (courseType: string) => {
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
      duration_hours: "",
      evaluation_type: "",
      result_type: "Mark",
      self_study_course: false,
      outside_class_course: false,
      open_book: false,
      online_course: false,
<<<<<<< HEAD
      dummy_number_required: false,
=======
      dummy_number_not_required: true,
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
      annual_course: false,
      multiple_qp_set: false,
      no_of_qp_setter: "",
      no_of_scrutinizer: "",
      fee_exception: false,
      syllabus_pdf_url: "",
      description: "",
      is_active: true,
    })
    setErrors({})
    setEditing(null)
  }

  const openAdd = () => { resetForm(); setSheetOpen(true) }
  const openEdit = (row: Course) => {
    setEditing(row)
    setFormData({
<<<<<<< HEAD
      institution_code: row.institution_code || "",
      regulation_code: row.regulation_code || "",
      offering_department_code: row.offering_department_code || "",
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
      duration_hours: String(row.duration_hours ?? ''),
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
=======
      institution_code: (row as any).institution_code || "",
      regulation_code: (row as any).regulation_code || "",
      offering_department_code: (row as any).offering_department_code || "",
      course_code: row.course_code || "",
      course_title: row.course_title || "",
      display_code: (row as any).display_code || (row.course_code || ''),
      course_category: (row as any).course_category || "",
      course_type: row.course_type || "",
      course_part_master: (row as any).course_part_master || "",
      credits: String(row.credits ?? '0'),
      split_credit: Boolean((row as any).split_credit) || false,
      theory_credit: String((row as any).theory_credit ?? '0'),
      practical_credit: String((row as any).practical_credit ?? '0'),
      qp_code: (row as any).qp_code || "",
      e_code_name: (row as any).e_code_name || "",
      duration_hours: String((row as any).duration_hours ?? ''),
      evaluation_type: (row as any).evaluation_type || "",
      result_type: (row as any).result_type || "Mark",
      self_study_course: Boolean((row as any).self_study_course) || false,
      outside_class_course: Boolean((row as any).outside_class_course) || false,
      open_book: Boolean((row as any).open_book) || false,
      online_course: Boolean((row as any).online_course) || false,
      dummy_number_not_required: Boolean((row as any).dummy_number_not_required) !== false,
      annual_course: Boolean((row as any).annual_course) || false,
      multiple_qp_set: Boolean((row as any).multiple_qp_set) || false,
      no_of_qp_setter: String((row as any).no_of_qp_setter ?? ''),
      no_of_scrutinizer: String((row as any).no_of_scrutinizer ?? ''),
      fee_exception: Boolean((row as any).fee_exception) || false,
      syllabus_pdf_url: (row as any).syllabus_pdf_url || "",
      description: (row as any).description || "",
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
      is_active: row.is_active,
    })
    setSheetOpen(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.institution_code) e.institution_code = 'Required'
    if (!formData.regulation_code) e.regulation_code = 'Required'
    if (!formData.course_code) e.course_code = 'Required'
    if (!formData.course_title) e.course_title = 'Required'
    if (!formData.display_code) e.display_code = 'Required'
    if (!formData.qp_code) e.qp_code = 'Required'
    if (!formData.course_category) e.course_category = 'Required'
    if (!formData.evaluation_type) e.evaluation_type = 'Required'
    if (!formData.result_type) e.result_type = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    try {
      const payload: any = {
        institution_code: formData.institution_code,
        regulation_code: formData.regulation_code,
        offering_department_code: formData.offering_department_code || null,
        course_code: formData.course_code,
        course_title: formData.course_title,
        display_code: formData.display_code || null,
        course_category: formData.course_category || null,
        course_type: formData.course_type || null,
        course_part_master: formData.course_part_master || null,
        credits: formData.credits ? Math.trunc(Number(formData.credits)) : 0,
        split_credit: Boolean(formData.split_credit),
        theory_credit: formData.theory_credit ? Math.trunc(Number(formData.theory_credit)) : 0,
        practical_credit: formData.practical_credit ? Math.trunc(Number(formData.practical_credit)) : 0,
        qp_code: formData.qp_code || null,
        e_code_name: formData.e_code_name || null,
        duration_hours: formData.duration_hours ? Math.trunc(Number(formData.duration_hours)) : 0,
        evaluation_type: formData.evaluation_type,
        result_type: formData.result_type,
        self_study_course: Boolean(formData.self_study_course),
        outside_class_course: Boolean(formData.outside_class_course),
        open_book: Boolean(formData.open_book),
        online_course: Boolean(formData.online_course),
<<<<<<< HEAD
        dummy_number_required: Boolean(formData.dummy_number_required),
=======
        dummy_number_not_required: Boolean(formData.dummy_number_not_required),
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
        annual_course: Boolean(formData.annual_course),
        multiple_qp_set: Boolean(formData.multiple_qp_set),
        no_of_qp_setter: formData.no_of_qp_setter ? Number(formData.no_of_qp_setter) : null,
        no_of_scrutinizer: formData.no_of_scrutinizer ? Number(formData.no_of_scrutinizer) : null,
        fee_exception: Boolean(formData.fee_exception),
        syllabus_pdf_url: formData.syllabus_pdf_url || null,
        description: formData.description || null,
        is_active: Boolean(formData.is_active),
      }
      let res: Response
      if (editing) {
        res = await fetch(`/api/courses/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        res = await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      if (!res.ok) {
        const ed = await res.json().catch(() => ({}))
        throw new Error(ed.error || ed.details || 'Failed to save course')
      }
      const saved = await res.json()
      if (editing) {
        setCourses(p => p.map(c => c.id === editing.id ? { ...c, ...payload, id: editing.id } as any : c))
        toast({ title: '✅ Record Updated', description: `${formData.course_title} has been successfully updated.`, className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' })
      } else {
        setCourses(p => [saved, ...p])
        toast({ title: '✅ Record Created', description: `${formData.course_title} has been successfully created.`, className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' })
      }
      setSheetOpen(false)
      resetForm()
    } catch (e) {
      console.error('Save course error:', e)
      toast({ title: '❌ Operation Failed', description: 'Failed to save record. Please try again.', variant: 'destructive', className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200' })
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
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCourses(courses.filter(course => course.id !== courseId))
        setDeleteCourseId(null)
      } else {
        console.error('Failed to delete course')
      }
    } catch (error) {
      console.error('Error deleting course:', error)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'Institution Code*', 'Regulation Code*', 'Offering Department Code',
      'Course Code*', 'Course Name*', 'Display Code*',
      'Course Category*', 'Course Type', 'Part',
      'Credit', 'Split Credit (TRUE/FALSE)', 'Theory Credit', 'Practical Credit',
      'QP Code*', 'E-Code Name (Tamil/English/French/Malayalam/Hindi)', 'Duration (hours)',
      'Evaluation Type* (CA/ESE/CA + ESE)', 'Result Type* (Mark/Status)',
      'Self Study Course (TRUE/FALSE)', 'Outside Class Course (TRUE/FALSE)',
      'Open Book (TRUE/FALSE)', 'Online Course (TRUE/FALSE)',
      'Dummy Number Required (TRUE/FALSE)', 'Annual Course (TRUE/FALSE)',
      'Multiple QP Set (TRUE/FALSE)', 'No of QP Setter', 'No of Scrutinizer',
      'Fee Exception (TRUE/FALSE)', 'Syllabus PDF URL', 'Description', 'Status (TRUE/FALSE)'
    ]

    const ws = XLSX.utils.aoa_to_sheet([headers])
    ws['!cols'] = headers.map(() => ({ wch: 20 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Courses Template')
    XLSX.writeFile(wb, 'courses_template.xlsx')

    toast({
      title: '✅ Template Downloaded',
      description: 'Course upload template has been downloaded successfully.',
      className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
    })
  }

  const downloadCoursesExcel = () => {
    const data = courses.map(c => ({
      'Institution Code': c.institution_code || '',
      'Regulation Code': c.regulation_code || '',
      'Offering Department Code': c.offering_department_code || '',
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
      'Duration (hours)': c.duration_hours || 0,
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
      'Status': c.is_active ? 'TRUE' : 'FALSE'
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Courses')
    XLSX.writeFile(wb, `courses_${new Date().toISOString().split('T')[0]}.xlsx`)

    toast({
      title: '✅ Export Successful',
      description: `${courses.length} courses exported to Excel.`,
      className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      let successCount = 0
      let errorCount = 0

      for (const row of jsonData) {
        try {
          const payload = {
            institution_code: row['Institution Code*'] || row['Institution Code'],
            regulation_code: row['Regulation Code*'] || row['Regulation Code'],
            offering_department_code: row['Offering Department Code'] || null,
            course_code: row['Course Code*'] || row['Course Code'],
            course_title: row['Course Name*'] || row['Course Name'],
            display_code: row['Display Code*'] || row['Display Code'],
            course_category: row['Course Category*'] || row['Course Category'],
            course_type: row['Course Type'] || null,
            course_part_master: row['Part'] || null,
            credits: Number(row['Credit']) || 0,
            split_credit: String(row['Split Credit (TRUE/FALSE)'] || row['Split Credit']).toUpperCase() === 'TRUE',
            theory_credit: Number(row['Theory Credit']) || 0,
            practical_credit: Number(row['Practical Credit']) || 0,
            qp_code: row['QP Code*'] || row['QP Code'],
            e_code_name: row['E-Code Name (Tamil/English/French/Malayalam/Hindi)'] || row['E-Code Name'] || null,
            duration_hours: Number(row['Duration (hours)'] || row['Duration']) || 0,
            evaluation_type: row['Evaluation Type* (CA/ESE/CA + ESE)'] || row['Evaluation Type'],
            result_type: row['Result Type* (Mark/Status)'] || row['Result Type'] || 'Mark',
            self_study_course: String(row['Self Study Course (TRUE/FALSE)'] || row['Self Study Course']).toUpperCase() === 'TRUE',
            outside_class_course: String(row['Outside Class Course (TRUE/FALSE)'] || row['Outside Class Course']).toUpperCase() === 'TRUE',
            open_book: String(row['Open Book (TRUE/FALSE)'] || row['Open Book']).toUpperCase() === 'TRUE',
            online_course: String(row['Online Course (TRUE/FALSE)'] || row['Online Course']).toUpperCase() === 'TRUE',
            dummy_number_required: String(row['Dummy Number Required (TRUE/FALSE)'] || row['Dummy Number Required']).toUpperCase() === 'TRUE',
            annual_course: String(row['Annual Course (TRUE/FALSE)'] || row['Annual Course']).toUpperCase() === 'TRUE',
            multiple_qp_set: String(row['Multiple QP Set (TRUE/FALSE)'] || row['Multiple QP Set']).toUpperCase() === 'TRUE',
            no_of_qp_setter: Number(row['No of QP Setter']) || null,
            no_of_scrutinizer: Number(row['No of Scrutinizer']) || null,
            fee_exception: String(row['Fee Exception (TRUE/FALSE)'] || row['Fee Exception']).toUpperCase() === 'TRUE',
            syllabus_pdf_url: row['Syllabus PDF URL'] || null,
            description: row['Description'] || null,
            is_active: String(row['Status (TRUE/FALSE)'] || row['Status']).toUpperCase() !== 'FALSE'
          }

          const res = await fetch('/api/courses', {
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

      // Refresh courses list
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }

      toast({
        title: successCount > 0 ? '✅ Upload Complete' : '❌ Upload Failed',
        description: `${successCount} courses uploaded successfully. ${errorCount} failed.`,
        className: successCount > 0 ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
      })

      // Reset file input
      e.target.value = ''
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: '❌ Upload Failed',
        description: 'Failed to process Excel file.',
        variant: 'destructive'
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
    <div className="h-screen">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col min-h-screen">
          <AppHeader />

          <div className="flex flex-col flex-1 p-3 space-y-3 overflow-y-auto">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/" className="hover:text-primary">Dashboard</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Courses</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Scorecard Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
              {/* Total Courses */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Courses</p>
                      <p className="text-xl font-bold">{courses.length}</p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <BookText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Courses */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Active Courses</p>
                      <p className="text-xl font-bold text-green-600">
                        {courses.filter(course => course.is_active).length}
                      </p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <GraduationCap className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inactive Courses */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Inactive Courses</p>
                      <p className="text-xl font-bold text-red-600">
                        {courses.filter(course => !course.is_active).length}
                      </p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                      <BookText className="h-3 w-3 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* New This Month */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">New This Month</p>
                      <p className="text-xl font-bold text-blue-600">
                        {courses.filter(course => {
                          const courseDate = new Date(course.created_at)
                          const now = new Date()
                          return courseDate.getMonth() === now.getMonth() && courseDate.getFullYear() === now.getFullYear()
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

            {/* Action Bar */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0 p-3">
                {/* Compact Header like edit page */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookText className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">Courses</h2>
                      <p className="text-[11px] text-muted-foreground">Manage courses and their details</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    {/* Filter Dropdowns */}
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

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[140px] h-8">
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

                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="All Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Search Bar */}
                    <div className="relative w-full sm:w-[220px]">
                      <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search courses…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 flex-wrap">
                    <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={downloadTemplate}>
                      <FileSpreadsheet className="h-3 w-3 mr-1" />
                      Template
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={downloadCoursesExcel}>
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={() => document.getElementById('file-upload')?.click()}>
                      <Upload className="h-3 w-3 mr-1" />
                      Import
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button 
                      size="sm" 
                      className="text-xs px-2 h-8"
                      onClick={openAdd}
                    >
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">
                {/* Data Table */}
                <div className="rounded-md border overflow-hidden" style={{ height: '440px' }}>
                  <div className="h-full overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                          <TableHead className="w-[120px] text-[11px]">Course Code</TableHead>
                          <TableHead className="text-[11px]">Course Title</TableHead>
                          <TableHead className="w-[100px] text-[11px]">Type</TableHead>
                          <TableHead className="w-[80px] text-[11px]">Credits</TableHead>
                          <TableHead className="w-[100px] text-[11px]">Level</TableHead>
                          <TableHead className="w-[100px] text-[11px]">Status</TableHead>
                          <TableHead className="w-[120px] text-[11px]">Created At</TableHead>
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
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-[11px]">{course.course_title}</div>
                                    {course.programs && (
                                      <div className="text-[10px] text-muted-foreground">
                                        {course.programs.program_name} ({course.programs.program_code})
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getTypeBadgeVariant(course.course_type)} className="text-[11px]">
                                    {course.course_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-[11px]">{course.credits}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[11px]">
                                    {course.course_level}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusBadgeVariant(course)} className="text-[11px]">
                                    {getStatusText(course)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-[11px] text-muted-foreground">
                                  {formatDate(course.created_at)}
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
              </CardContent>
            </Card>
          </div>

          <AppFooter />
        </SidebarInset>
      </SidebarProvider>

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
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-semibold">Course Name <span className="text-red-500">*</span></Label>
                  <Input value={formData.course_title} onChange={(e) => setFormData({ ...formData, course_title: e.target.value })} className={`h-10 ${errors.course_title ? 'border-destructive' : ''}`} placeholder="Enter course name" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Display Code <span className="text-red-500">*</span></Label>
                  <Input value={formData.display_code} onChange={(e) => setFormData({ ...formData, display_code: e.target.value })} className={`h-10 ${errors.display_code ? 'border-destructive' : ''}`} placeholder="Will default from course code" />
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
                  <Label className="text-sm font-semibold">Credit</Label>
                  <Input type="number" step="1" value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: e.target.value })} className="h-10" placeholder="e.g., 3" />
                </div>
                <div className="space-y-2">
<<<<<<< HEAD
                  <Label className="text-sm font-semibold">Split Credit</Label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormData({ ...formData, split_credit: !formData.split_credit })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.split_credit ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.split_credit ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${formData.split_credit ? 'text-green-600' : 'text-gray-500'}`}>{formData.split_credit ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
=======
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
                  <Label className="text-sm font-semibold">Theory Credit</Label>
                  <Input type="number" step="1" value={formData.theory_credit} onChange={(e) => setFormData({ ...formData, theory_credit: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Practical Credit</Label>
                  <Input type="number" step="1" value={formData.practical_credit} onChange={(e) => setFormData({ ...formData, practical_credit: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">QP Code</Label>
                  <Input value={formData.qp_code} onChange={(e) => setFormData({ ...formData, qp_code: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">E-Code Name</Label>
<<<<<<< HEAD
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
=======
                  <Input value={formData.e_code_name} onChange={(e) => setFormData({ ...formData, e_code_name: e.target.value })} className="h-10" />
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Duration (hours)</Label>
                  <Input type="number" step="1" value={formData.duration_hours} onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })} className="h-10" />
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
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-sm font-semibold">Syllabus PDF URL</Label>
                  <Input value={formData.syllabus_pdf_url} onChange={(e) => setFormData({ ...formData, syllabus_pdf_url: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-sm font-semibold">Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-[100px]" placeholder="Add details about the course" />
                </div>
<<<<<<< HEAD
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
                    <button type="button" onClick={() => setFormData({ ...formData, self_study_course: !formData.self_study_course })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.self_study_course ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.self_study_course ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${formData.self_study_course ? 'text-green-600' : 'text-gray-500'}`}>{formData.self_study_course ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Outside Class Course</Label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormData({ ...formData, outside_class_course: !formData.outside_class_course })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.outside_class_course ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.outside_class_course ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${formData.outside_class_course ? 'text-green-600' : 'text-gray-500'}`}>{formData.outside_class_course ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Open Book</Label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormData({ ...formData, open_book: !formData.open_book })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.open_book ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.open_book ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${formData.open_book ? 'text-green-600' : 'text-gray-500'}`}>{formData.open_book ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Online Course</Label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormData({ ...formData, online_course: !formData.online_course })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.online_course ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.online_course ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${formData.online_course ? 'text-green-600' : 'text-gray-500'}`}>{formData.online_course ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Dummy Number Required</Label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormData({ ...formData, dummy_number_required: !formData.dummy_number_required })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.dummy_number_required ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.dummy_number_required ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${formData.dummy_number_required ? 'text-green-600' : 'text-gray-500'}`}>{formData.dummy_number_required ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Annual Course</Label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormData({ ...formData, annual_course: !formData.annual_course })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.annual_course ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.annual_course ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${formData.annual_course ? 'text-green-600' : 'text-gray-500'}`}>{formData.annual_course ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Multiple QP Set</Label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormData({ ...formData, multiple_qp_set: !formData.multiple_qp_set })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.multiple_qp_set ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.multiple_qp_set ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${formData.multiple_qp_set ? 'text-green-600' : 'text-gray-500'}`}>{formData.multiple_qp_set ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">No of QP Setter</Label>
                  <Input type="number" step="1" value={formData.no_of_qp_setter} onChange={(e) => setFormData({ ...formData, no_of_qp_setter: e.target.value })} className="h-10" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">No of Scrutinizer</Label>
                  <Input type="number" step="1" value={formData.no_of_scrutinizer} onChange={(e) => setFormData({ ...formData, no_of_scrutinizer: e.target.value })} className="h-10" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Fee Exception</Label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormData({ ...formData, fee_exception: !formData.fee_exception })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.fee_exception ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.fee_exception ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${formData.fee_exception ? 'text-green-600' : 'text-gray-500'}`}>{formData.fee_exception ? 'Yes' : 'No'}</span>
                  </div>
                </div>
=======
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-sm font-semibold">Status</Label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormData({ ...formData, is_active: !formData.is_active })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
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
    </div>
  )
}