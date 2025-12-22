"use client"

import { useMemo, useState, useEffect } from "react"
import XLSX from "@/lib/utils/excel-compat"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import supabaseAuthService from "@/services/auth/supabase-auth-service"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/common/use-toast"
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Calendar, TrendingUp, FileSpreadsheet, RefreshCw, CheckCircle, XCircle, AlertTriangle, CalendarCheck, Sparkles, FileDown, FileText } from "lucide-react"

// Import types from module
import type {
	ExamTimetable,
	GeneratedCourseData,
	ExaminationSession,
	Program,
	Semester,
	Institution
} from '@/types/exam_timetable'

// Import service functions
import {
	fetchInstitutions as fetchInstitutionsService,
	fetchExaminationSessions as fetchExaminationSessionsService,
	fetchPrograms as fetchProgramsService,
	fetchSemesters as fetchSemestersService,
	fetchExamTimetables as fetchExamTimetablesService,
	fetchCourseOfferings,
	fetchExamRegistrations
} from '@/services/exam-management/exam_timetable-service'

// Import export functions
import {
	exportToJSON,
	exportToExcel,
	exportToPDF,
	exportTemplate
} from '@/lib/utils/exam_timetable/export-import'

export default function ExamTimetablePage() {
  const { toast } = useToast()
  const [items, setItems] = useState<ExamTimetable[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [sheetOpen, setSheetOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  // Dropdown data
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [examinationSessions, setExaminationSessions] = useState<ExaminationSession[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])

  // Parent section filters
  const [selectedInstitutionCode, setSelectedInstitutionCode] = useState<string>("")
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  const [selectedProgramType, setSelectedProgramType] = useState<string>("")
  const [selectedProgramId, setSelectedProgramId] = useState<string>("")
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("")

  // Child section data
  const [generatedCourses, setGeneratedCourses] = useState<GeneratedCourseData[]>([])
  const [generatedLoading, setGeneratedLoading] = useState(false)

  // Fetch institutions
  const fetchInstitutions = async () => {
    try {
      const data = await fetchInstitutionsService()
      setInstitutions(data)
    } catch (error) {
      console.error('Failed to fetch institutions:', error)
    }
  }

  // Fetch examination sessions
  const fetchExaminationSessions = async () => {
    try {
      const data = await fetchExaminationSessionsService()
      setExaminationSessions(data)
    } catch (error) {
      console.error('Failed to fetch examination sessions:', error)
    }
  }

  // Fetch programs
  const fetchPrograms = async () => {
    try {
      const data = await fetchProgramsService()
      setPrograms(data)
    } catch (error) {
      console.error('Failed to fetch programs:', error)
    }
  }

  // Fetch semesters
  const fetchSemesters = async () => {
    try {
      const data = await fetchSemestersService()
      setSemesters(data)
    } catch (error) {
      console.error('Failed to fetch semesters:', error)
    }
  }

  // Fetch exam timetables from API
  const fetchExamTimetables = async () => {
    try {
      setLoading(true)
      const data = await fetchExamTimetablesService()
      setItems(data)
    } catch (error) {
      console.error('Error fetching exam timetables:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchExamTimetables()
    fetchInstitutions()
    fetchExaminationSessions()
    fetchPrograms()
    fetchSemesters()

    // Get institution code from user session
    const user = supabaseAuthService.getUser()
    if (user?.user_metadata?.institution_code) {
      setSelectedInstitutionCode(user.user_metadata.institution_code)
    }
  }, [])

  // Cascading filters following the order: Institution Code → Session Name → Program Type → Program → Semester

  // 1. Filter examination sessions by selected institution code
  const filteredSessions = useMemo(() => {
    if (!selectedInstitutionCode) return examinationSessions
    // Examination sessions are typically institution-wide, so return all
    return examinationSessions
  }, [examinationSessions, selectedInstitutionCode])

  // 2. Filter programs by selected institution code
  const filteredProgramsByInstitution = useMemo(() => {
    if (!selectedInstitutionCode) return programs
    return programs.filter(p => p.institution_code === selectedInstitutionCode)
  }, [programs, selectedInstitutionCode])

  // 3. Get unique program types from filtered programs (by institution)
  const programTypes = useMemo(() => {
    const types = new Set(filteredProgramsByInstitution.map(p => p.program_type))
    return Array.from(types)
  }, [filteredProgramsByInstitution])

  // 4. Filter programs by program type (from already filtered programs by institution)
  const filteredProgramsByType = useMemo(() => {
    if (!selectedProgramType) return filteredProgramsByInstitution
    return filteredProgramsByInstitution.filter(p => p.program_type === selectedProgramType)
  }, [filteredProgramsByInstitution, selectedProgramType])

  // 5. Filter semesters - Remove duplicates based on semester_code or semester_name
  const filteredSemesters = useMemo(() => {
    // Remove duplicates based on semester_code (primary) or semester_name (fallback)
    const uniqueSemesters = new Map<string, Semester>()

    semesters.forEach(semester => {
      const key = semester.semester_code || semester.semester_name
      if (!uniqueSemesters.has(key)) {
        uniqueSemesters.set(key, semester)
      }
    })

    let semesterList = Array.from(uniqueSemesters.values())

    // Filter semesters based on selected program's duration
    if (selectedProgramId) {
      const selectedProgram = programs.find(p => p.id === selectedProgramId)
      if (selectedProgram && selectedProgram.duration_years) {
        // Calculate max semesters based on program duration
        const maxSemesters = selectedProgram.duration_years * 2 // 2 semesters per year

        // Filter semesters to show only those within the program's duration
        semesterList = semesterList.filter(semester => {
          // Extract semester number from semester_name (e.g., "Semester 1" -> 1)
          const semesterMatch = semester.semester_name.match(/\d+/)
          if (semesterMatch) {
            const semesterNumber = parseInt(semesterMatch[0])
            return semesterNumber <= maxSemesters
          }
          return true // If no number found, include it
        })
      }
    }

    // Sort by semester_code or semester_name
    return semesterList.sort((a, b) => {
      const aValue = a.semester_code || a.semester_name
      const bValue = b.semester_code || b.semester_name
      return aValue.localeCompare(bValue)
    })
  }, [semesters, selectedProgramId, programs])

  // Handle institution code change - reset all dependent selections
  const handleInstitutionChange = (value: string) => {
    setSelectedInstitutionCode(value)
    setSelectedSessionId("")
    setSelectedProgramType("")
    setSelectedProgramId("")
    setSelectedSemesterId("")
  }

  // Handle session change - reset dependent selections
  const handleSessionChange = (value: string) => {
    setSelectedSessionId(value === "ALL" ? "" : value)
    // Session doesn't affect other dropdowns, so no resets needed
  }

  // Handle program type change - reset dependent selections
  const handleProgramTypeChange = (value: string) => {
    setSelectedProgramType(value === "ALL" ? "" : value)
    setSelectedProgramId("")
    setSelectedSemesterId("")
  }

  // Handle program change - reset dependent selections
  const handleProgramChange = (value: string) => {
    setSelectedProgramId(value === "ALL" ? "" : value)
    setSelectedSemesterId("")
  }

  // Generate courses based on selected filters (dynamic combinations)
  const handleGenerate = async () => {
    // Validation: At minimum, Institution Code is required
    if (!selectedInstitutionCode) {
      toast({
        title: "⚠️ Validation Error",
        description: "Please select an Institution Code to generate courses.",
        variant: "destructive",
        className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
      })
      return
    }

    try {
      setGeneratedLoading(true)

      // Build query parameters dynamically based on selected filters
      const params = new URLSearchParams()

      // Get institution ID from institution code
      const selectedInstitution = institutions.find(inst => inst.institution_code === selectedInstitutionCode)
      if (!selectedInstitution) {
        toast({
          title: "❌ Error",
          description: "Invalid institution selected.",
          variant: "destructive",
        })
        setGeneratedLoading(false)
        return
      }
      params.append('institutions_id', selectedInstitution.id)

      // Add optional filters if selected
      if (selectedSessionId) params.append('examination_session_id', selectedSessionId)
      if (selectedProgramId) params.append('program_id', selectedProgramId)

      // Note: Semester filtering is done client-side using course_semester_name
      // from the joined course_mapping + semesters data

      // Determine filter combination for user feedback
      let filterCombination = 'Institution Code'
      if (selectedSessionId) filterCombination += ' + Session'
      if (selectedProgramType) filterCombination += ' + Program Type'
      if (selectedProgramId) filterCombination += ' + Program'
      if (selectedSemesterId) filterCombination += ' + Semester'

      // Fetch course offerings
      const courseOfferingsResponse = await fetch(`/api/course-management/course-offering?${params.toString()}`)
      if (!courseOfferingsResponse.ok) {
        throw new Error('Failed to fetch course offerings')
      }
      let courseOfferings = await courseOfferingsResponse.json()

      // Client-side filter by program_type if selected (API doesn't support this filter)
      if (selectedProgramType) {
        courseOfferings = courseOfferings.filter((offering: any) => {
          const program = programs.find(p => p.id === offering.program_id)
          return program && program.program_type === selectedProgramType
        })
      }

      // Client-side filter by semester_name if specific semester is selected
      // This uses the course_semester_name from course_mapping joined with semesters table
      if (selectedSemesterId) {
        const selectedSemester = semesters.find(s => s.id === selectedSemesterId)
        if (selectedSemester) {
          courseOfferings = courseOfferings.filter((offering: any) => {
            // Match against course_semester_name from the joined data
            return offering.course_semester_name === selectedSemester.semester_name
          })
        }
      } else {
        // When "All Semesters" is selected, filter to show only "Semester 1" courses
        courseOfferings = courseOfferings.filter((offering: any) => {
          return offering.course_semester_name === 'Semester 1' ||
                 offering.course_semester_name === 'SEMESTER 1' ||
                 offering.course_semester_name?.toLowerCase() === 'semester 1'
        })
      }

      // Fetch exam registrations for student counts (only if session is selected)
      let registrations: any[] = []
      if (selectedSessionId) {
        const registrationsResponse = await fetch(`/api/exam-management/exam-registrations?examination_session_id=${selectedSessionId}`)
        if (registrationsResponse.ok) {
          registrations = await registrationsResponse.json()
        }
      }

      // Fetch existing timetables (only if session is selected)
      let existingTimetables: any[] = []
      if (selectedSessionId) {
        const timetablesResponse = await fetch(`/api/exam-management/exam-timetables?examination_session_id=${selectedSessionId}`)
        if (timetablesResponse.ok) {
          existingTimetables = await timetablesResponse.json()
        }
      }

      // Create a map of existing timetables by course_offering_id
      const timetableMap = new Map()
      existingTimetables.forEach((tt: ExamTimetable) => {
        timetableMap.set(tt.course_offering_id, tt)
      })

      // Map course offerings to generated data (filtering is done by API)
      const generatedData: GeneratedCourseData[] = courseOfferings.map((offering: any) => {
        // Count regular and arrear students for this course
        const regularCount = registrations.filter((reg: any) =>
          reg.course_offering_id === offering.id && reg.exam_type === 'regular'
        ).length

        const arrearCount = registrations.filter((reg: any) =>
          reg.course_offering_id === offering.id && reg.exam_type === 'arrear'
        ).length

        // Check if timetable already exists
        const existingTimetable = timetableMap.get(offering.id)

        return {
          course_offering_id: offering.id,
          course_code: offering.course_code || 'N/A',
          course_title: offering.course_title || 'N/A',
          program_name: offering.programs?.program_name || 'N/A',
          program_code: offering.programs?.program_code || offering.program_code || 'N/A',
          program_order: offering.programs?.display_order || offering.programs?.program_code || 999,
          semester: offering.semester || 0,
          course_semester_code: offering.course_semester_code || null,
          course_semester_name: offering.course_semester_name || null,
          course_semester_number: offering.course_semester_number || null,
          course_program_code: offering.course_program_code || null,
          course_institution_code: offering.course_institution_code || null,
          course_regulation_code: offering.course_regulation_code || null,
          regular_count: regularCount,
          arrear_count: arrearCount,
          exam_date: existingTimetable?.exam_date || '',
          session: existingTimetable?.session || 'FN',
          exam_time: existingTimetable?.exam_time || '10:00',
          duration_minutes: existingTimetable?.duration_minutes || 180,
          is_published: existingTimetable?.is_published || false,
          instructions: existingTimetable?.instructions || '',
          existing_timetable_id: existingTimetable?.id || undefined,
        }
      })

      // Sort the generated data: by Exam Date (if available), then by Program Order, then by Semester
      const sortedData = generatedData.sort((a, b) => {
        // Primary sort: Exam Date (if both have dates)
        if (a.exam_date && b.exam_date) {
          const dateCompare = new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
          if (dateCompare !== 0) return dateCompare
        }

        // If only one has a date, prioritize the one with date
        if (a.exam_date && !b.exam_date) return -1
        if (!a.exam_date && b.exam_date) return 1

        // Secondary sort: Program Order
        const programOrderCompare = (a.program_order || 999) - (b.program_order || 999)
        if (programOrderCompare !== 0) return programOrderCompare

        // Tertiary sort: Semester
        return (a.semester || 0) - (b.semester || 0)
      })

      setGeneratedCourses(sortedData)

      // Build filter description for toast
      const selectedSemesterName = selectedSemesterId
        ? semesters.find(s => s.id === selectedSemesterId)?.semester_name
        : null

      const filterDescription = selectedSemesterName
        ? `${filterCombination} - ${selectedSemesterName}`
        : filterCombination

      toast({
        title: "✅ Courses Generated",
        description: `Successfully loaded ${sortedData.length} course${sortedData.length > 1 ? 's' : ''} (${filterDescription}).`,
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
        duration: 5000,
      })
    } catch (error) {
      console.error('Error generating courses:', error)
      toast({
        title: "❌ Generation Failed",
        description: "Failed to generate course list. Please try again.",
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      })
    } finally {
      setGeneratedLoading(false)
    }
  }

  // Handle Check All for is_published
  const handleCheckAll = (checked: boolean) => {
    setGeneratedCourses(prev => prev.map(course => ({
      ...course,
      is_published: checked
    })))
  }

  // Handle individual course field changes
  const handleCourseFieldChange = (index: number, field: keyof GeneratedCourseData, value: any) => {
    setGeneratedCourses(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Save generated courses as timetable entries
  const handleSaveAll = async () => {
    if (generatedCourses.length === 0) {
      toast({
        title: "⚠️ No Data",
        description: "Please generate courses first before saving.",
        variant: "destructive",
      })
      return
    }

    // Validate that all required fields are filled
    const invalidCourses = generatedCourses.filter(course =>
      !course.exam_date || !course.session || !course.exam_time || !course.duration_minutes
    )

    if (invalidCourses.length > 0) {
      toast({
        title: "⚠️ Validation Error",
        description: `${invalidCourses.length} course${invalidCourses.length > 1 ? 's' : ''} ha${invalidCourses.length > 1 ? 've' : 's'} missing required fields (Exam Date, Session, Exam Time, Duration).`,
        variant: "destructive",
        className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
      })
      return
    }

    try {
      setLoading(true)
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      // Get institution_id from selected institution_code
      const selectedInstitution = institutions.find(inst => inst.institution_code === selectedInstitutionCode)
      if (!selectedInstitution) {
        toast({
          title: "❌ Error",
          description: "Invalid institution selected.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      for (const course of generatedCourses) {
        const payload = {
          id: course.existing_timetable_id,
          institutions_id: selectedInstitution.id,
          examination_session_id: selectedSessionId,
          course_offering_id: course.course_offering_id,
          exam_date: course.exam_date,
          session: course.session,
          exam_time: course.exam_time,
          duration_minutes: course.duration_minutes,
          exam_mode: 'offline',
          is_published: course.is_published,
          instructions: course.instructions || null,
        }

        try {
          const method = course.existing_timetable_id ? 'PUT' : 'POST'
          const response = await fetch('/api/exam-management/exam-timetables', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

          if (response.ok) {
            successCount++
          } else {
            const errorData = await response.json()
            errorCount++
            errors.push(`${course.course_code}: ${errorData.error || 'Failed to save'}`)
          }
        } catch (error) {
          errorCount++
          errors.push(`${course.course_code}: Network error`)
        }
      }

      if (successCount > 0 && errorCount === 0) {
        toast({
          title: "✅ Save Complete",
          description: `Successfully saved ${successCount} exam timetable entr${successCount > 1 ? 'ies' : 'y'}.`,
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
        })
        fetchExamTimetables()
        setGeneratedCourses([])
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: "⚠️ Partial Save Success",
          description: `Saved ${successCount} entr${successCount > 1 ? 'ies' : 'y'}, ${errorCount} failed. Errors: ${errors.join(', ')}`,
          className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
          duration: 8000,
        })
        fetchExamTimetables()
      } else {
        toast({
          title: "❌ Save Failed",
          description: `All ${errorCount} entr${errorCount > 1 ? 'ies' : 'y'} failed. Errors: ${errors.join(', ')}`,
          variant: "destructive",
          className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
          duration: 8000,
        })
      }
    } catch (error) {
      console.error('Error saving exam timetables:', error)
      toast({
        title: "❌ Save Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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
      .filter((i: any) =>
        statusFilter === "all" ||
        (statusFilter === "published" ? i.is_published : !i.is_published)
      )

    if (!sortColumn) return data
    const sorted = [...data].sort((a: any, b: any) => {
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

  useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection])

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  const formatTime = (t: string) => {
    const [hours, minutes] = t.split(':')
    return `${hours}:${minutes}`
  }

  // Export to JSON
  const handleDownloadJSON = () => {
    if (generatedCourses.length === 0) {
      toast({
        title: "⚠️ No Data",
        description: "Please generate courses first before exporting.",
        variant: "destructive",
      })
      return
    }

    exportToJSON(generatedCourses)

    toast({
      title: "✅ Export Complete",
      description: "Timetable data exported to JSON successfully.",
      className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
    })
  }

  // Export to Excel
  const handleExport = () => {
    if (generatedCourses.length === 0) {
      toast({
        title: "⚠️ No Data",
        description: "Please generate courses first before exporting.",
        variant: "destructive",
      })
      return
    }

    exportToExcel(generatedCourses)

    toast({
      title: "✅ Export Complete",
      description: "Timetable data exported to Excel successfully.",
      className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
    })
  }

  // Export to PDF
  const handleExportPDF = () => {
    if (generatedCourses.length === 0) {
      toast({
        title: "⚠️ No Data",
        description: "Please generate courses first before exporting.",
        variant: "destructive",
      })
      return
    }

    const selectedInstitution = institutions.find(inst => inst.institution_code === selectedInstitutionCode)
    const selectedSession = selectedSessionId ? examinationSessions.find(sess => sess.id === selectedSessionId) : undefined

    exportToPDF(generatedCourses, selectedInstitution, selectedSession)

    toast({
      title: "✅ Export Complete",
      description: "Timetable data exported to PDF successfully.",
      className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
    })
  }

  // Template Export with Reference Sheets
  const handleTemplateExport = () => {
    exportTemplate()

    toast({
      title: "✅ Template Downloaded",
      description: "Template file with reference sheets has been downloaded.",
      className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
    })
  }

  // Import from Excel/CSV/JSON
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

        if (rows.length === 0) {
          toast({
            title: "❌ No Data Found",
            description: "The file contains no data rows.",
            variant: "destructive",
          })
          return
        }

        // Update generated courses with imported data
        const updatedCourses = generatedCourses.map(course => {
          // Find matching row by course code
          const matchingRow = rows.find(row =>
            String(row['Course Code'] || row.course_code || '').trim() === course.course_code.trim()
          )

          if (matchingRow) {
            return {
              ...course,
              exam_date: String(matchingRow['Exam Date'] || matchingRow.exam_date || course.exam_date),
              session: String(matchingRow['Session (FN/AN)'] || matchingRow['Session'] || matchingRow.session || course.session),
              exam_time: String(matchingRow['Exam Time'] || matchingRow.exam_time || course.exam_time),
              duration_minutes: parseInt(String(matchingRow['Duration (Minutes)'] || matchingRow['Duration'] || matchingRow.duration_minutes || course.duration_minutes)),
              is_published: String(matchingRow['Published'] || matchingRow.is_published || '').toLowerCase() === 'yes' || matchingRow.is_published === true,
              instructions: String(matchingRow['Instructions'] || matchingRow.instructions || course.instructions || ''),
            }
          }

          return course
        })

        setGeneratedCourses(updatedCourses)

        toast({
          title: "✅ Import Complete",
          description: `Successfully imported timetable data for ${rows.length} course${rows.length > 1 ? 's' : ''}.`,
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
        })
      } catch (err) {
        console.error('Import error:', err)
        toast({
          title: "❌ Import Error",
          description: "Import failed. Please check your file format and try again.",
          variant: "destructive",
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
                  <BreadcrumbPage>Exam Timetable</BreadcrumbPage>
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
                    <p className="text-xs font-medium text-muted-foreground">Total Entries</p>
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
                    <CalendarCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Unpublished</p>
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
                    <p className="text-xl font-bold text-blue-600">{items.filter(i => {
                      const d = new Date(i.created_at)
                      const n = new Date()
                      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
                    }).length}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <TrendingUp className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Unified Add & Edit Form */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Exam Timetable Management
                    </h2>
                    <p className="text-xs text-muted-foreground">Generate and manage exam schedules</p>
                  </div>
                </div>
              </div>

              {/* Parent Section - Filter Controls */}
              <div className="space-y-3 border rounded-lg p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-md bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Filter & Generate
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  {/* Institution Code - Required */}
                  <div className="space-y-1">
                    <Label htmlFor="institution_code" className="text-xs font-semibold">
                      Institution Code <span className="text-red-500">*</span>
                    </Label>
                    <Select value={selectedInstitutionCode} onValueChange={handleInstitutionChange}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Institution" />
                      </SelectTrigger>
                      <SelectContent>
                        {institutions.map(institution => (
                          <SelectItem key={institution.id} value={institution.institution_code} className="text-xs">
                            {institution.institution_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Session Name - Optional (filtered by institution) */}
                  <div className="space-y-1">
                    <Label htmlFor="session_name" className="text-xs font-medium">
                      Session Name
                    </Label>
                    <Select
                      value={selectedSessionId || "ALL"}
                      onValueChange={handleSessionChange}
                      disabled={!selectedInstitutionCode}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="All Sessions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">All Sessions</SelectItem>
                        {filteredSessions.map(session => (
                          <SelectItem key={session.id} value={session.id} className="text-xs">
                            {session.session_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Program Type - Optional (filtered by institution) */}
                  <div className="space-y-1">
                    <Label htmlFor="program_type" className="text-xs font-medium">Program Type</Label>
                    <Select
                      value={selectedProgramType || "ALL"}
                      onValueChange={handleProgramTypeChange}
                      disabled={!selectedInstitutionCode}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">All Types</SelectItem>
                        {programTypes.map(type => (
                          <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Program - Optional (filtered by institution + program type) */}
                  <div className="space-y-1">
                    <Label htmlFor="program" className="text-xs font-medium">Program</Label>
                    <Select
                      value={selectedProgramId || "ALL"}
                      onValueChange={handleProgramChange}
                      disabled={!selectedInstitutionCode}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="All Programs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">All Programs</SelectItem>
                        {filteredProgramsByType.map(program => (
                          <SelectItem key={program.id} value={program.id} className="text-xs">
                            {program.program_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Semester - Optional (filtered by program duration) */}
                  <div className="space-y-1">
                    <Label htmlFor="semester" className="text-xs font-medium">
                      Semester
                      {selectedProgramId && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          (filtered by program)
                        </span>
                      )}
                    </Label>
                    <Select
                      value={selectedSemesterId || "ALL"}
                      onValueChange={(value) => setSelectedSemesterId(value === "ALL" ? "" : value)}
                      disabled={!selectedInstitutionCode}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="All Semesters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">All Semesters</SelectItem>
                        {filteredSemesters.map(semester => (
                          <SelectItem key={semester.id} value={semester.id} className="text-xs">
                            {semester.semester_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Generate Button */}
                  <div className="flex items-end">
                    <Button
                      onClick={handleGenerate}
                      disabled={!selectedInstitutionCode || generatedLoading}
                      className="h-9 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-xs"
                    >
                      {generatedLoading ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-0 flex-1 flex flex-col min-h-0">
              {/* Child Section - Generated Courses Table */}
              {generatedCourses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                        <CalendarCheck className="h-3 w-3 text-white" />
                      </div>
                      <h3 className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Course Timetable Entries ({generatedCourses.length})
                      </h3>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 h-8"
                        onClick={handleTemplateExport}
                      >
                        <FileSpreadsheet className="h-3 w-3 mr-1" />
                        Template
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 h-8"
                        onClick={handleDownloadJSON}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 h-8 bg-green-50 hover:bg-green-100 dark:bg-green-900/10 dark:hover:bg-green-900/20"
                        onClick={handleExport}
                      >
                        <FileSpreadsheet className="h-3 w-3 mr-1 text-green-600" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 h-8 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20"
                        onClick={handleExportPDF}
                      >
                        <FileDown className="h-3 w-3 mr-1 text-red-600" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 h-8"
                        onClick={handleImport}
                      >
                        <FileSpreadsheet className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                      <Button
                        onClick={handleSaveAll}
                        disabled={loading}
                        size="sm"
                        className="h-8 text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Save All
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border overflow-hidden" style={{ height: "500px" }}>
                    <div className="h-full overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
                          <TableRow>
                            <TableHead className="w-[80px] text-[11px]">
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  checked={generatedCourses.every(c => c.is_published)}
                                  onCheckedChange={(checked) => handleCheckAll(checked === true)}
                                />
                                <span>Publish</span>
                              </div>
                            </TableHead>
                            <TableHead className="w-[100px] text-[11px]">Course Code</TableHead>
                            <TableHead className="w-[200px] text-[11px]">Course Name</TableHead>
                            <TableHead className="w-[150px] text-[11px]">Program</TableHead>
                            <TableHead className="w-[100px] text-[11px] text-center">Learners (R|A)</TableHead>
                            <TableHead className="w-[130px] text-[11px]">Exam Date *</TableHead>
                            <TableHead className="w-[80px] text-[11px]">Session *</TableHead>
                            <TableHead className="w-[100px] text-[11px]">Time *</TableHead>
                            <TableHead className="w-[100px] text-[11px]">Duration (min) *</TableHead>
                            <TableHead className="w-[150px] text-[11px]">Instructions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {generatedCourses.map((course, index) => (
                            <TableRow key={course.course_offering_id}>
                              <TableCell>
                                <Checkbox
                                  checked={course.is_published}
                                  onCheckedChange={(checked) =>
                                    handleCourseFieldChange(index, 'is_published', checked === true)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-[11px] font-medium">{course.course_code}</TableCell>
                              <TableCell className="text-[11px]">{course.course_title}</TableCell>
                              <TableCell className="text-[11px]">{course.program_name}</TableCell>
                              <TableCell className="text-[11px] text-center">
                                <span className="text-green-600 font-medium">{course.regular_count}</span>
                                {' | '}
                                <span className="text-orange-600 font-medium">{course.arrear_count}</span>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="date"
                                  value={course.exam_date}
                                  onChange={(e) => handleCourseFieldChange(index, 'exam_date', e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={course.session}
                                  onValueChange={(value) => handleCourseFieldChange(index, 'session', value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="FN" className="text-xs">FN</SelectItem>
                                    <SelectItem value="AN" className="text-xs">AN</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="time"
                                  value={course.exam_time}
                                  onChange={(e) => handleCourseFieldChange(index, 'exam_time', e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={course.duration_minutes}
                                  onChange={(e) => handleCourseFieldChange(index, 'duration_minutes', parseInt(e.target.value))}
                                  className="h-8 text-xs"
                                  min="0"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={course.instructions || ''}
                                  onChange={(e) => handleCourseFieldChange(index, 'instructions', e.target.value)}
                                  placeholder="Optional"
                                  className="h-8 text-xs"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {generatedCourses.length === 0 && !generatedLoading && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                    <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">No Courses Generated</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Select an examination session and optional filters, then click "Generate" to load courses for timetable creation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
