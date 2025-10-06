"use client"

import { useMemo, useState, useEffect } from "react"
import * as XLSX from "xlsx"
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
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Building2, TrendingUp, FileSpreadsheet, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

type DepartmentInfo = {
  name?: string
  designation?: string
  email?: string
  mobile?: string
}

type Institution = {
  id: string
  institution_code: string
  name: string
  phone?: string
  email?: string
  website?: string
  created_by?: string
  counselling_code?: string
  accredited_by?: string
  address_line1?: string
  address_line2?: string
  address_line3?: string
  city?: string
  state?: string
  country?: string
  logo_url?: string
  transportation_dept?: DepartmentInfo
  administration_dept?: DepartmentInfo
  accounts_dept?: DepartmentInfo
  admission_dept?: DepartmentInfo
  placement_dept?: DepartmentInfo
  anti_ragging_dept?: DepartmentInfo
  institution_type?: string
  pin_code?: string
  timetable_type?: string
  is_active: boolean
  created_at: string
}

const MOCK_INSTITUTIONS: Institution[] = [
  {
    id: "1",
    institution_code: "JKKN",
    name: "JKKN Institutions",
    phone: "+91 9876543210",
    email: "info@jkkn.edu",
    website: "https://jkkn.edu",
    counselling_code: "JKKN001",
    accredited_by: "NAAC",
    address_line1: "123 Main Street",
    address_line2: "Educational District",
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    pin_code: "600001",
    institution_type: "university",
    timetable_type: "week_order",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    institution_code: "ENGG",
    name: "JKKN Engineering College",
    phone: "+91 9000000000",
    email: "contact@jkknengg.edu",
    website: "https://engg.jkkn.edu",
    counselling_code: "JKKN002",
    accredited_by: "AICTE",
    address_line1: "456 Tech Park",
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    pin_code: "600002",
    institution_type: "college",
    timetable_type: "week_order",
    is_active: true,
    created_at: new Date().toISOString(),
  },
]



export default function InstitutionsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Institution | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [errorPopupOpen, setErrorPopupOpen] = useState(false)
  const [importErrors, setImportErrors] = useState<Array<{
    row: number
    institution_code: string
    name: string
    errors: string[]
  }>>([])

  const [formData, setFormData] = useState({
    institution_code: "",
    name: "",
    phone: "",
    email: "",
    website: "",
    counselling_code: "",
    accredited_by: "",
    address_line1: "",
    address_line2: "",
    address_line3: "",
    city: "",
    state: "",
    country: "",
    pin_code: "",
    logo_url: "",
    institution_type: "university",
    timetable_type: "week_order",
    transportation_dept: {} as DepartmentInfo,
    administration_dept: {} as DepartmentInfo,
    accounts_dept: {} as DepartmentInfo,
    admission_dept: {} as DepartmentInfo,
    placement_dept: {} as DepartmentInfo,
    anti_ragging_dept: {} as DepartmentInfo,
    is_active: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch data from API
  const fetchInstitutions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/institutions')
      if (!response.ok) {
        throw new Error('Failed to fetch institutions')
      }
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Error fetching institutions:', error)
      // Fallback to mock data on error
      setItems(MOCK_INSTITUTIONS)
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchInstitutions()
  }, [])

  const resetForm = () => {
    setFormData({
      institution_code: "",
      name: "",
      phone: "",
      email: "",
      website: "",
      counselling_code: "",
      accredited_by: "",
      address_line1: "",
      address_line2: "",
      address_line3: "",
      city: "",
      state: "",
      country: "",
      pin_code: "",
      logo_url: "",
      institution_type: "university",
      timetable_type: "week_order",
      transportation_dept: {} as DepartmentInfo,
      administration_dept: {} as DepartmentInfo,
      accounts_dept: {} as DepartmentInfo,
      admission_dept: {} as DepartmentInfo,
      placement_dept: {} as DepartmentInfo,
      anti_ragging_dept: {} as DepartmentInfo,
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
      .filter((i) => [i.institution_code, i.name, i.email, i.phone, i.city].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
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
  }, [items, searchTerm, sortColumn, sortDirection])

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const pageItems = filtered.slice(startIndex, endIndex)

  useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection])

  const openAdd = () => {
    resetForm()
    setSheetOpen(true)
  }
  const openEdit = (row: Institution) => {
    setEditing(row)
    setFormData({
      institution_code: row.institution_code,
      name: row.name,
      phone: row.phone || "",
      email: row.email || "",
      website: row.website || "",
      counselling_code: row.counselling_code || "",
      accredited_by: row.accredited_by || "",
      address_line1: row.address_line1 || "",
      address_line2: row.address_line2 || "",
      address_line3: row.address_line3 || "",
      city: row.city || "",
      state: row.state || "",
      country: row.country || "",
      pin_code: row.pin_code || "",
      logo_url: row.logo_url || "",
      institution_type: row.institution_type || "university",
      timetable_type: row.timetable_type || "week_order",
      transportation_dept: row.transportation_dept || {} as DepartmentInfo,
      administration_dept: row.administration_dept || {} as DepartmentInfo,
      accounts_dept: row.accounts_dept || {} as DepartmentInfo,
      admission_dept: row.admission_dept || {} as DepartmentInfo,
      placement_dept: row.placement_dept || {} as DepartmentInfo,
      anti_ragging_dept: row.anti_ragging_dept || {} as DepartmentInfo,
      is_active: row.is_active,
    })
    setSheetOpen(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.institution_code.trim()) e.institution_code = "Required"
    if (!formData.name.trim()) e.name = "Required"
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Invalid email"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    
    try {
      setLoading(true)
      
    if (editing) {
        // Update existing institution
        const response = await fetch('/api/institutions', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editing.id,
            ...formData
          }),
        })
        
        if (!response.ok) {
          throw new Error('Failed to update institution')
        }
        
        const updatedInstitution = await response.json()
        setItems((prev) => prev.map((p) => (p.id === editing.id ? updatedInstitution : p)))
        
        toast({
          title: "✅ Institution Updated",
          description: `${updatedInstitution.name} has been successfully updated.`,
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
        })
    } else {
        // Create new institution
        const response = await fetch('/api/institutions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })
        
        if (!response.ok) {
          throw new Error('Failed to create institution')
        }
        
        const newInstitution = await response.json()
        setItems((prev) => [newInstitution, ...prev])
        
        toast({
          title: "✅ Institution Created",
          description: `${newInstitution.name} has been successfully created.`,
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
        })
      }
      
    setSheetOpen(false)
    resetForm()
    } catch (error) {
      console.error('Error saving institution:', error)
      toast({
        title: "❌ Save Failed",
        description: "Failed to save institution. Please try again.",
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
      
      const response = await fetch(`/api/institutions?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete institution')
      }
      
      const institutionName = items.find(i => i.id === id)?.name || 'Institution'
      setItems((prev) => prev.filter((p) => p.id !== id))
      
      toast({
        title: "✅ Institution Deleted",
        description: `${institutionName} has been successfully deleted.`,
        className: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200",
      })
    } catch (error) {
      console.error('Error deleting institution:', error)
      toast({
        title: "❌ Delete Failed",
        description: "Failed to delete institution. Please try again.",
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })

  // Field validation function
  const validateInstitutionData = (data: any, rowIndex: number) => {
    const errors: string[] = []
    
    // Required field validations
    if (!data.institution_code || data.institution_code.trim() === '') {
      errors.push('Institution Code is required')
    } else if (data.institution_code.length > 50) {
      errors.push('Institution Code must be 50 characters or less')
    }
    
    if (!data.name || data.name.trim() === '') {
      errors.push('Institution Name is required')
    } else if (data.name.length > 200) {
      errors.push('Institution Name must be 200 characters or less')
    }
    
    // Email validation
    if (data.email && data.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        errors.push('Email format is invalid')
      } else if (data.email.length > 100) {
        errors.push('Email must be 100 characters or less')
      }
    }
    
    // Phone validation
    if (data.phone && data.phone.trim() !== '') {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/
      if (!phoneRegex.test(data.phone)) {
        errors.push('Phone number format is invalid (use 10-15 digits with optional +, spaces, hyphens, parentheses)')
      }
    }
    
    // Website validation
    if (data.website && data.website.trim() !== '') {
      try {
        new URL(data.website)
      } catch {
        errors.push('Website URL format is invalid')
      }
      if (data.website.length > 255) {
        errors.push('Website URL must be 255 characters or less')
      }
    }
    
    // PIN Code validation
    if (data.pin_code && data.pin_code.trim() !== '') {
      const pinRegex = /^[0-9]{6}$/
      if (!pinRegex.test(data.pin_code)) {
        errors.push('PIN Code must be exactly 6 digits')
      }
    }
    
    // Institution Type validation
    if (data.institution_type && data.institution_type.trim() !== '') {
      const validTypes = ['university', 'college', 'school', 'institute']
      if (!validTypes.includes(data.institution_type)) {
        errors.push(`Institution Type must be one of: ${validTypes.join(', ')}`)
      }
    }
    
    // Timetable Type validation
    if (data.timetable_type && data.timetable_type.trim() !== '') {
      const validTypes = ['week_order', 'day_order', 'custom']
      if (!validTypes.includes(data.timetable_type)) {
        errors.push(`Timetable Type must be one of: ${validTypes.join(', ')}`)
      }
    }
    
    // Status validation
    if (data.is_active !== undefined && data.is_active !== null) {
      if (typeof data.is_active !== 'boolean') {
        const statusValue = String(data.is_active).toLowerCase()
        if (statusValue !== 'true' && statusValue !== 'false' && statusValue !== 'active' && statusValue !== 'inactive') {
          errors.push('Status must be true/false or Active/Inactive')
        }
      }
    }
    
    // String length validations
    const stringFields = [
      { field: 'counselling_code', maxLength: 50, name: 'Counselling Code' },
      { field: 'accredited_by', maxLength: 100, name: 'Accredited By' },
      { field: 'address_line1', maxLength: 255, name: 'Address Line 1' },
      { field: 'address_line2', maxLength: 255, name: 'Address Line 2' },
      { field: 'address_line3', maxLength: 255, name: 'Address Line 3' },
      { field: 'city', maxLength: 100, name: 'City' },
      { field: 'state', maxLength: 100, name: 'State' },
      { field: 'country', maxLength: 100, name: 'Country' },
      { field: 'logo_url', maxLength: 500, name: 'Logo URL' }
    ]
    
    stringFields.forEach(({ field, maxLength, name }) => {
      if (data[field] && data[field].length > maxLength) {
        errors.push(`${name} must be ${maxLength} characters or less`)
      }
    })
    
    return errors
  }

  // Export/Import/Template handlers
  const handleDownload = () => {
    const exportData = filtered.map(item => {
      // Helper function to format department data
      const formatDepartment = (dept: any) => {
        if (!dept || Object.keys(dept).length === 0) return ''
        
        const name = dept.name || ''
        const email = dept.email || ''
        const mobile = dept.mobile || ''
        const designation = dept.designation || ''
        
        return `${name}\n${email}\n${mobile}\n${designation}`
      }

      return {
        institution_code: item.institution_code,
        name: item.name,
        phone: item.phone || '',
        email: item.email || '',
        website: item.website || '',
        counselling_code: item.counselling_code || '',
        accredited_by: item.accredited_by || '',
        address_line1: item.address_line1 || '',
        address_line2: item.address_line2 || '',
        address_line3: item.address_line3 || '',
        city: item.city || '',
        state: item.state || '',
        country: item.country || '',
        pin_code: item.pin_code || '',
        logo_url: item.logo_url || '',
        institution_type: item.institution_type || '',
        timetable_type: item.timetable_type || '',
        transportation_dept: formatDepartment(item.transportation_dept),
        administration_dept: formatDepartment(item.administration_dept),
        accounts_dept: formatDepartment(item.accounts_dept),
        admission_dept: formatDepartment(item.admission_dept),
        placement_dept: formatDepartment(item.placement_dept),
        anti_ragging_dept: formatDepartment(item.anti_ragging_dept),
        is_active: item.is_active,
        created_at: item.created_at
      }
    })
    
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `institutions_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    const excelData = filtered.map((r) => {
      // Helper function to format department data
      const formatDepartment = (dept: any) => {
        if (!dept || Object.keys(dept).length === 0) return ''
        
        const name = dept.name || ''
        const email = dept.email || ''
        const mobile = dept.mobile || ''
        const designation = dept.designation || ''
        
        return `${name}\n${email}\n${mobile}\n${designation}`
      }

      return {
      'Institution Code': r.institution_code,
      'Name': r.name,
      'Phone': r.phone || '',
        'Email': r.email || '',
        'Website': r.website || '',
        'Counselling Code': r.counselling_code || '',
        'Accredited By': r.accredited_by || '',
        'Address Line 1': r.address_line1 || '',
        'Address Line 2': r.address_line2 || '',
        'Address Line 3': r.address_line3 || '',
        'City': r.city || '',
        'State': r.state || '',
        'Country': r.country || '',
        'PIN Code': r.pin_code || '',
        'Logo URL': r.logo_url || '',
        'Institution Type': r.institution_type || '',
        'Timetable Type': r.timetable_type || '',
        'Transportation Dept': formatDepartment(r.transportation_dept),
        'Administration Dept': formatDepartment(r.administration_dept),
        'Accounts Dept': formatDepartment(r.accounts_dept),
        'Admission Dept': formatDepartment(r.admission_dept),
        'Placement Dept': formatDepartment(r.placement_dept),
        'Anti-Ragging Dept': formatDepartment(r.anti_ragging_dept),
      'Status': r.is_active ? 'Active' : 'Inactive',
      'Created': new Date(r.created_at).toISOString().split('T')[0],
      }
    })
    
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // Set column widths and wrap text for department columns
    const colWidths = [
      { wch: 20 }, // Institution Code
      { wch: 30 }, // Name
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 30 }, // Website
      { wch: 20 }, // Counselling Code
      { wch: 15 }, // Accredited By
      { wch: 25 }, // Address Line 1
      { wch: 25 }, // Address Line 2
      { wch: 25 }, // Address Line 3
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 15 }, // Country
      { wch: 12 }, // PIN Code
      { wch: 30 }, // Logo URL
      { wch: 15 }, // Institution Type
      { wch: 15 }, // Timetable Type
      { wch: 30 }, // Transportation Dept
      { wch: 30 }, // Administration Dept
      { wch: 30 }, // Accounts Dept
      { wch: 30 }, // Admission Dept
      { wch: 30 }, // Placement Dept
      { wch: 30 }, // Anti-Ragging Dept
      { wch: 10 }, // Status
      { wch: 12 }  // Created
    ]
    ws['!cols'] = colWidths
    
    // Apply wrap text to department columns
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    const departmentCols = [17, 18, 19, 20, 21, 22] // Transportation, Administration, Accounts, Admission, Placement, Anti-Ragging
    
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (const col of departmentCols) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            alignment: { wrapText: true, vertical: 'top' }
          }
        }
      }
    }
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Institutions')
    XLSX.writeFile(wb, `institutions_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleTemplateExport = () => {
    const sample = [{
      'Institution Code': 'JKKN',
      'Name': 'JKKN Institutions',
      'Phone': '+91 9000000000',
      'Email': 'info@example.com',
      'Website': 'https://jkkn.edu',
      'Counselling Code': 'JKKN001',
      'Accredited By': 'NAAC',
      'Address Line 1': '123 Main Street',
      'Address Line 2': 'Educational District',
      'Address Line 3': 'Near Landmark',
      'City': 'Chennai',
      'State': 'Tamil Nadu',
      'Country': 'India',
      'PIN Code': '600001',
      'Logo URL': 'https://example.com/logo.png',
      'Institution Type': 'university',
      'Timetable Type': 'week_order',
      'Status': 'Active'
    }]
    
    const ws = XLSX.utils.json_to_sheet(sample)
    
    // Set column widths
    const colWidths = [
      { wch: 20 }, // Institution Code
      { wch: 30 }, // Name
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 30 }, // Website
      { wch: 20 }, // Counselling Code
      { wch: 15 }, // Accredited By
      { wch: 25 }, // Address Line 1
      { wch: 25 }, // Address Line 2
      { wch: 25 }, // Address Line 3
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 15 }, // Country
      { wch: 12 }, // PIN Code
      { wch: 30 }, // Logo URL
      { wch: 15 }, // Institution Type
      { wch: 15 }, // Timetable Type
      { wch: 10 }  // Status
    ]
    ws['!cols'] = colWidths
    
    // Style the header row to make mandatory fields red
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    const mandatoryFields = ['Institution Code', 'Name']
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!ws[cellAddress]) continue
      
      const cell = ws[cellAddress]
      const isMandatory = mandatoryFields.includes(cell.v as string)
      
      if (isMandatory) {
        // Make mandatory field headers red with asterisk
        cell.v = cell.v + ' *'
        cell.s = {
          font: { color: { rgb: 'FF0000' }, bold: true },
          fill: { fgColor: { rgb: 'FFE6E6' } }
        }
      } else {
        // Regular field headers
        cell.s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'F0F0F0' } }
        }
      }
    }
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, `institutions_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        let rows: Partial<Institution>[] = []
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
          
          rows = dataRows.map(j => ({
            institution_code: String(j['Institution Code *'] || j['Institution Code'] || ''),
            name: String(j['Name *'] || j['Name'] || ''),
            phone: String(j['Phone'] || ''),
            email: String(j['Email'] || ''),
            website: String(j['Website'] || ''),
            counselling_code: String(j['Counselling Code'] || ''),
            accredited_by: String(j['Accredited By'] || ''),
            address_line1: String(j['Address Line 1'] || ''),
            address_line2: String(j['Address Line 2'] || ''),
            address_line3: String(j['Address Line 3'] || ''),
            city: String(j['City'] || ''),
            state: String(j['State'] || ''),
            country: String(j['Country'] || ''),
            pin_code: String(j['PIN Code'] || ''),
            logo_url: String(j['Logo URL'] || ''),
            institution_type: String(j['Institution Type'] || 'university'),
            timetable_type: String(j['Timetable Type'] || 'week_order'),
            is_active: String(j['Status'] || '').toLowerCase() === 'active'
          }))
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const data = new Uint8Array(await file.arrayBuffer())
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
          rows = json.map(j => ({
            institution_code: String(j['Institution Code *'] || j['Institution Code'] || ''),
            name: String(j['Name *'] || j['Name'] || ''),
            phone: String(j['Phone'] || ''),
            email: String(j['Email'] || ''),
            website: String(j['Website'] || ''),
            counselling_code: String(j['Counselling Code'] || ''),
            accredited_by: String(j['Accredited By'] || ''),
            address_line1: String(j['Address Line 1'] || ''),
            address_line2: String(j['Address Line 2'] || ''),
            address_line3: String(j['Address Line 3'] || ''),
            city: String(j['City'] || ''),
            state: String(j['State'] || ''),
            country: String(j['Country'] || ''),
            pin_code: String(j['PIN Code'] || ''),
            logo_url: String(j['Logo URL'] || ''),
            institution_type: String(j['Institution Type'] || 'university'),
            timetable_type: String(j['Timetable Type'] || 'week_order'),
            is_active: String(j['Status'] || '').toLowerCase() === 'active'
          }))
        }
        
        const now = new Date().toISOString()
        const validationErrors: Array<{
          row: number
          institution_code: string
          name: string
          errors: string[]
        }> = []
        
        const mapped = rows.map((r, index) => {
          const institutionData = {
            id: String(Date.now() + Math.random()),
            institution_code: r.institution_code!,
            name: r.name as string,
            phone: (r as any).phone || '',
            email: (r as any).email || '',
            website: (r as any).website || '',
            counselling_code: (r as any).counselling_code || '',
            accredited_by: (r as any).accredited_by || '',
            address_line1: (r as any).address_line1 || '',
            address_line2: (r as any).address_line2 || '',
            address_line3: (r as any).address_line3 || '',
            city: (r as any).city || '',
            state: (r as any).state || '',
            country: (r as any).country || '',
            pin_code: (r as any).pin_code || '',
            logo_url: (r as any).logo_url || '',
            institution_type: (r as any).institution_type || 'university',
            timetable_type: (r as any).timetable_type || 'week_order',
            transportation_dept: {} as DepartmentInfo,
            administration_dept: {} as DepartmentInfo,
            accounts_dept: {} as DepartmentInfo,
            admission_dept: {} as DepartmentInfo,
            placement_dept: {} as DepartmentInfo,
            anti_ragging_dept: {} as DepartmentInfo,
            is_active: (r as any).is_active ?? true,
            created_at: now,
          }
          
          // Validate the data
          const errors = validateInstitutionData(institutionData, index + 2) // +2 because index is 0-based and we have header row
          if (errors.length > 0) {
            validationErrors.push({
              row: index + 2,
              institution_code: institutionData.institution_code || 'N/A',
              name: institutionData.name || 'N/A',
              errors: errors
            })
          }
          
          return institutionData
        }).filter(r => r.institution_code && r.name) as Institution[]
        
        // If there are validation errors, show them in popup
        if (validationErrors.length > 0) {
          setImportErrors(validationErrors)
          setErrorPopupOpen(true)
          return
        }
        
        if (mapped.length === 0) {
          toast({
            title: "❌ No Valid Data",
            description: "No valid data found in the file. Please check that Institution Code and Name are provided.",
            variant: "destructive",
            className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
          })
          return
        }
        
        // Save each institution to the database
        setLoading(true)
        let successCount = 0
        let errorCount = 0
        
        for (const institution of mapped) {
          try {
            const response = await fetch('/api/institutions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(institution),
            })
            
            if (response.ok) {
              const savedInstitution = await response.json()
              setItems(prev => [savedInstitution, ...prev])
              successCount++
            } else {
              console.error('Failed to save institution:', institution.institution_code)
              errorCount++
            }
          } catch (error) {
            console.error('Error saving institution:', institution.institution_code, error)
            errorCount++
          }
        }
        
        setLoading(false)
        
        // Show detailed results
        if (successCount > 0 && errorCount === 0) {
          toast({
            title: "✅ Import Successful",
            description: `Successfully imported ${successCount} institution(s) to the database.`,
            className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
          })
        } else if (successCount > 0 && errorCount > 0) {
          toast({
            title: "⚠️ Partial Import Success",
            description: `Imported ${successCount} institution(s) successfully, ${errorCount} failed. Check console for details.`,
            className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
          })
        } else {
          toast({
            title: "❌ Import Failed",
            description: "Failed to import any institutions. Please check your data and try again.",
            variant: "destructive",
            className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
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
                  <BreadcrumbPage>Institutions</BreadcrumbPage>
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
                    <p className="text-xs font-medium text-muted-foreground">Total Institutions</p>
                    <p className="text-xl font-bold">{items.length}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Active Institutions</p>
                    <p className="text-xl font-bold text-green-600">{items.filter(i=>i.is_active).length}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Inactive Institutions</p>
                    <p className="text-xl font-bold text-red-600">{items.filter(i=>!i.is_active).length}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-red-600 dark:text-red-400" />
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
                    <Building2 className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Institutions</h2>
                    <p className="text-[11px] text-muted-foreground">Manage institutions</p>
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
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={fetchInstitutions} disabled={loading}>
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
                        <TableHead className="w-[140px] text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("institution_code")} className="h-auto p-0 font-medium hover:bg-transparent">
                            College Code
                            <span className="ml-1">{getSortIcon("institution_code")}</span>
                          </Button>
                        </TableHead>
                        <TableHead className="text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("name")} className="h-auto p-0 font-medium hover:bg-transparent">
                            College Name
                            <span className="ml-1">{getSortIcon("name")}</span>
                          </Button>
                        </TableHead>
                        <TableHead className="w-[200px] text-[11px]">Email</TableHead>
                        <TableHead className="w-[140px] text-[11px]">Mobile</TableHead>
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
                          <TableCell colSpan={6} className="h-24 text-center text-[11px]">Loading…</TableCell>
                        </TableRow>
                      ) : pageItems.length ? (
                        <>
                          {pageItems.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="text-[11px] font-medium">{row.institution_code}</TableCell>
                              <TableCell className="text-[11px]">{row.name}</TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{row.email || '-'}</TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{row.phone || '-'}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={row.is_active ? "default" : "secondary"} 
                                  className={`text-[11px] ${
                                    row.is_active 
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
                                        <AlertDialogTitle>Delete Institution</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete {row.name}? This action cannot be undone.
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
                          <TableCell colSpan={6} className="h-24 text-center text-[11px]">No data</TableCell>
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
                  <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                  <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {editing ? "Edit Institution" : "Add Institution"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editing ? "Update institution information" : "Create a new institution record"}
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
                  <Building2 className="h-4 w-4 text-white" />
              </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Basic Information</h3>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="institution_code" className="text-sm font-semibold">
                    Institution Code <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="institution_code" 
                    value={formData.institution_code} 
                    onChange={(e) => setFormData({ ...formData, institution_code: e.target.value })} 
                    className={`h-10 ${errors.institution_code ? 'border-destructive' : ''}`} 
                    placeholder="e.g., JKKN001"
                  />
                  {errors.institution_code && <p className="text-xs text-destructive">{errors.institution_code}</p>}
            </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">
                    Institution Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className={`h-10 ${errors.name ? 'border-destructive' : ''}`} 
                    placeholder="e.g., JKKN University"
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    className={`h-10 ${errors.email ? 'border-destructive' : ''}`} 
                    placeholder="info@institution.edu"
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                    className="h-10" 
                    placeholder="+91 9876543210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                  <Input 
                    id="website" 
                    value={formData.website} 
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })} 
                    className="h-10" 
                    placeholder="https://institution.edu"
                  />
              </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url" className="text-sm font-medium">Logo URL</Label>
                  <Input 
                    id="logo_url" 
                    value={formData.logo_url} 
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} 
                    className="h-10" 
                    placeholder="https://example.com/logo.png"
                  />
            </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-purple-200 dark:border-purple-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Address Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_line1" className="text-sm font-medium">Address Line 1</Label>
                  <Input 
                    id="address_line1" 
                    value={formData.address_line1} 
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })} 
                    className="h-10" 
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_line2" className="text-sm font-medium">Address Line 2</Label>
                  <Input 
                    id="address_line2" 
                    value={formData.address_line2} 
                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })} 
                    className="h-10" 
                    placeholder="Area/Locality"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_line3" className="text-sm font-medium">Address Line 3</Label>
                  <Input 
                    id="address_line3" 
                    value={formData.address_line3} 
                    onChange={(e) => setFormData({ ...formData, address_line3: e.target.value })} 
                    className="h-10" 
                    placeholder="Landmark"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium">City</Label>
                  <Input 
                    id="city" 
                    value={formData.city} 
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })} 
                    className="h-10" 
                    placeholder="City name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-medium">State</Label>
                  <Input 
                    id="state" 
                    value={formData.state} 
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })} 
                    className="h-10" 
                    placeholder="State name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium">Country</Label>
                  <Input 
                    id="country" 
                    value={formData.country} 
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })} 
                    className="h-10" 
                    placeholder="Country name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin_code" className="text-sm font-medium">PIN Code</Label>
                  <Input 
                    id="pin_code" 
                    value={formData.pin_code} 
                    onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })} 
                    className="h-10" 
                    placeholder="123456"
                  />
                </div>
              </div>
            </div>

            {/* Institutional Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-orange-200 dark:border-orange-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Institutional Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="counselling_code" className="text-sm font-medium">Counselling Code</Label>
                  <Input 
                    id="counselling_code" 
                    value={formData.counselling_code} 
                    onChange={(e) => setFormData({ ...formData, counselling_code: e.target.value })} 
                    className="h-10" 
                    placeholder="e.g., JKKN001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accredited_by" className="text-sm font-medium">Accredited By</Label>
                  <Input 
                    id="accredited_by" 
                    value={formData.accredited_by} 
                    onChange={(e) => setFormData({ ...formData, accredited_by: e.target.value })} 
                    className="h-10" 
                    placeholder="e.g., NAAC, AICTE"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution_type" className="text-sm font-medium">Institution Type</Label>
                  <Select value={formData.institution_type} onValueChange={(value) => setFormData({ ...formData, institution_type: value })}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="university">University</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="institute">Institute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timetable_type" className="text-sm font-medium">Timetable Type</Label>
                  <Select value={formData.timetable_type} onValueChange={(value) => setFormData({ ...formData, timetable_type: value })}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select timetable type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week_order">Week Order</SelectItem>
                      <SelectItem value="day_order">Day Order</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Department Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-cyan-200 dark:border-cyan-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Department Information</h3>
              </div>
              
              {/* Transportation Department */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Transportation Department</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Name</Label>
                    <Input 
                      value={formData.transportation_dept?.name || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        transportation_dept: { ...formData.transportation_dept, name: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="Department Head Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Designation</Label>
                    <Input 
                      value={formData.transportation_dept?.designation || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        transportation_dept: { ...formData.transportation_dept, designation: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="e.g., Head of Transportation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Email</Label>
                    <Input 
                      value={formData.transportation_dept?.email || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        transportation_dept: { ...formData.transportation_dept, email: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="transport@institution.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Mobile</Label>
                    <Input 
                      value={formData.transportation_dept?.mobile || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        transportation_dept: { ...formData.transportation_dept, mobile: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>
              </div>

              {/* Administration Department */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Administration Department</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Name</Label>
                    <Input 
                      value={formData.administration_dept?.name || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        administration_dept: { ...formData.administration_dept, name: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="Department Head Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Designation</Label>
                    <Input 
                      value={formData.administration_dept?.designation || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        administration_dept: { ...formData.administration_dept, designation: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="e.g., Administrative Head"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Email</Label>
                    <Input 
                      value={formData.administration_dept?.email || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        administration_dept: { ...formData.administration_dept, email: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="admin@institution.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Mobile</Label>
                    <Input 
                      value={formData.administration_dept?.mobile || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        administration_dept: { ...formData.administration_dept, mobile: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="+91 9876543211"
                    />
                  </div>
                </div>
              </div>

              {/* Accounts Department */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Accounts Department</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Name</Label>
                    <Input 
                      value={formData.accounts_dept?.name || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        accounts_dept: { ...formData.accounts_dept, name: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="Department Head Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Designation</Label>
                    <Input 
                      value={formData.accounts_dept?.designation || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        accounts_dept: { ...formData.accounts_dept, designation: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="e.g., Finance Head"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Email</Label>
                    <Input 
                      value={formData.accounts_dept?.email || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        accounts_dept: { ...formData.accounts_dept, email: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="accounts@institution.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Mobile</Label>
                    <Input 
                      value={formData.accounts_dept?.mobile || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        accounts_dept: { ...formData.accounts_dept, mobile: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="+91 9876543212"
                    />
                  </div>
                </div>
              </div>

              {/* Admission Department */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Admission Department</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Name</Label>
                    <Input 
                      value={formData.admission_dept?.name || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        admission_dept: { ...formData.admission_dept, name: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="Department Head Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Designation</Label>
                    <Input 
                      value={formData.admission_dept?.designation || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        admission_dept: { ...formData.admission_dept, designation: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="e.g., Admission Head"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Email</Label>
                    <Input 
                      value={formData.admission_dept?.email || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        admission_dept: { ...formData.admission_dept, email: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="admission@institution.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Mobile</Label>
                    <Input 
                      value={formData.admission_dept?.mobile || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        admission_dept: { ...formData.admission_dept, mobile: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="+91 9876543213"
                    />
                  </div>
                </div>
              </div>

              {/* Placement Department */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Placement Department</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Name</Label>
                    <Input 
                      value={formData.placement_dept?.name || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        placement_dept: { ...formData.placement_dept, name: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="Department Head Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Designation</Label>
                    <Input 
                      value={formData.placement_dept?.designation || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        placement_dept: { ...formData.placement_dept, designation: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="e.g., Placement Head"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Email</Label>
                    <Input 
                      value={formData.placement_dept?.email || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        placement_dept: { ...formData.placement_dept, email: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="placement@institution.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Mobile</Label>
                    <Input 
                      value={formData.placement_dept?.mobile || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        placement_dept: { ...formData.placement_dept, mobile: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="+91 9876543214"
                    />
                  </div>
                </div>
              </div>

              {/* Anti-Ragging Department */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">Anti-Ragging Department</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Name</Label>
                    <Input 
                      value={formData.anti_ragging_dept?.name || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        anti_ragging_dept: { ...formData.anti_ragging_dept, name: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="Department Head Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Designation</Label>
                    <Input 
                      value={formData.anti_ragging_dept?.designation || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        anti_ragging_dept: { ...formData.anti_ragging_dept, designation: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="e.g., Anti-Ragging Officer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Email</Label>
                    <Input 
                      value={formData.anti_ragging_dept?.email || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        anti_ragging_dept: { ...formData.anti_ragging_dept, email: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="antiragging@institution.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Mobile</Label>
                    <Input 
                      value={formData.anti_ragging_dept?.mobile || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        anti_ragging_dept: { ...formData.anti_ragging_dept, mobile: e.target.value }
                      })} 
                      className="h-9 text-xs" 
                      placeholder="+91 9876543215"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-teal-200 dark:border-teal-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-teal-500 to-green-600 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">Status</h3>
              </div>
              <div className="flex items-center gap-4">
                <Label className="text-sm font-semibold">Institution Status</Label>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
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
              >
                {editing ? "Update Institution" : "Create Institution"}
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
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="font-semibold text-red-800 dark:text-red-200">
                  {importErrors.length} record(s) have validation errors
                </span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Please correct these errors in your file and try importing again.
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
                        {error.institution_code} - {error.name}
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
                    <li>• Ensure Institution Code and Name are provided and not empty</li>
                    <li>• Use valid email format (e.g., user@domain.com)</li>
                    <li>• Use valid phone format (10-15 digits with optional +, spaces, hyphens)</li>
                    <li>• Use valid website URL format (e.g., https://example.com)</li>
                    <li>• PIN Code must be exactly 6 digits</li>
                    <li>• Institution Type: university, college, school, or institute</li>
                    <li>• Status: true/false or Active/Inactive</li>
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


