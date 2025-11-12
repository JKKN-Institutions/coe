"use client"

import { useMemo, useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { AppFooter } from "@/components/layout/app-footer"
import { PageTransition } from "@/components/common/page-transition"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ModernBreadcrumb } from "@/components/common/modern-breadcrumb"
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
import { useFormValidation, ValidationPresets } from "@/hooks/common/use-form-validation"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Building2, TrendingUp, FileSpreadsheet, RefreshCw, CheckCircle, XCircle, AlertTriangle, Home, Shield, Users, BookOpen, Calendar, FileText, Award, GraduationCap, School, LayoutGrid, Layers } from "lucide-react"

// Import types
import type { Institution, DepartmentInfo, InstitutionFormData, InstitutionImportError } from "@/types/institutions"

// Import services
import { fetchInstitutions as fetchInstitutionsService, createInstitution, updateInstitution, deleteInstitution } from "@/services/master/institutions-service"

// Import utilities
import { validateInstitutionData } from "@/lib/utils/institution-validation"
import { exportToJSON, exportToExcel, exportTemplate } from "@/lib/utils/institution-export-import"


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
  const [importErrors, setImportErrors] = useState<InstitutionImportError[]>([])
  const [uploadSummary, setUploadSummary] = useState<{
    total: number
    success: number
    failed: number
  }>({ total: 0, success: 0, failed: 0 })

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

  // Validation hook
  const { errors, validate, clearErrors } = useFormValidation({
    institution_code: [ValidationPresets.required('Institution code is required')],
    name: [ValidationPresets.required('Institution name is required')],
    email: [ValidationPresets.email('Invalid email address')],
  })

  // Fetch data from API
  const fetchInstitutions = async () => {
    try {
      setLoading(true)
      const data = await fetchInstitutionsService()
      setItems(data)
    } catch (error) {
      console.error('Error fetching institutions:', error)
      setItems([])
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
    clearErrors()
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

  const save = async () => {
    if (!validate(formData)) {
      toast({
        title: "⚠️ Validation Error",
        description: "Please fix all validation errors before submitting.",
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      })
      return
    }

    try {
      setLoading(true)

      if (editing) {
        // Update existing institution
        const updatedInstitution = await updateInstitution(editing.id, formData as InstitutionFormData)
        setItems((prev) => prev.map((p) => (p.id === editing.id ? updatedInstitution : p)))

        toast({
          title: "✅ Institution Updated",
          description: `${updatedInstitution.name} has been successfully updated.`,
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
        })
      } else {
        // Create new institution
        const newInstitution = await createInstitution(formData as InstitutionFormData)
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to save institution. Please try again.'
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
      const institutionName = items.find(i => i.id === id)?.name || 'Institution'

      await deleteInstitution(id)

      setItems((prev) => prev.filter((p) => p.id !== id))

      toast({
        title: "✅ Institution Deleted",
        description: `${institutionName} has been successfully deleted.`,
        className: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200",
      })
    } catch (error) {
      console.error('Error deleting institution:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete institution. Please try again.'
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

  // Export/Import/Template handlers
  const handleDownload = () => exportToJSON(filtered)
  const handleExport = () => exportToExcel(filtered)
  const handleTemplateExport = () => exportTemplate()

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
          setUploadSummary({
            total: rows.length,
            success: 0,
            failed: validationErrors.length
          })
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
        const uploadErrors: Array<{
          row: number
          institution_code: string
          name: string
          errors: string[]
        }> = []

        for (let i = 0; i < mapped.length; i++) {
          const institution = mapped[i]
          const rowNumber = i + 2 // +2 for header row in Excel

          try {
            const response = await fetch('/api/master/institutions', {
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
              const errorData = await response.json()
              errorCount++
              uploadErrors.push({
                row: rowNumber,
                institution_code: institution.institution_code || 'N/A',
                name: institution.name || 'N/A',
                errors: [errorData.error || 'Failed to save institution']
              })
            }
          } catch (error) {
            errorCount++
            uploadErrors.push({
              row: rowNumber,
              institution_code: institution.institution_code || 'N/A',
              name: institution.name || 'N/A',
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

        // Show error dialog if needed
        if (uploadErrors.length > 0) {
          setImportErrors(uploadErrors)
          setErrorPopupOpen(true)
        }

        // Show appropriate toast message
        if (successCount > 0 && errorCount === 0) {
          toast({
            title: "✅ Upload Complete",
            description: `Successfully uploaded all ${successCount} row${successCount > 1 ? 's' : ''} (${successCount} institution${successCount > 1 ? 's' : ''}) to the database.`,
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
          title="Institutions"
          description="Manage institutions and their details"
          showSearch={true}
        />
        <PageTransition>
           {/* Breadcrumb */}
           <ModernBreadcrumb
              items={[
                { label: "Academic", current: true }
              ]}
            />
            
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-4">
            {/* Premium Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-premium-hover p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Institutions</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-grotesk">{items.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="card-premium-hover p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Active</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-grotesk">{items.filter(i=>i.is_active).length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>

              <div className="card-premium-hover p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Inactive</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1 font-grotesk">{items.filter(i=>!i.is_active).length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </div>

              <div className="card-premium-hover p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">New This Month</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1 font-grotesk">{items.filter(i=>{ const d=new Date(i.created_at); const n=new Date(); return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear() }).length}</p>
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
                    <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold font-grotesk text-slate-900 dark:text-slate-100">All Institutions</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Manage and organize institutions</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
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

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search institutions..."
                      className="pl-10 w-[240px] search-premium"
                    />
                  </div>

                  <Button variant="outline" onClick={fetchInstitutions} disabled={loading} className="btn-premium-secondary">
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
                    Add Institution
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
                          <Button variant="ghost" size="sm" onClick={() => handleSort("institution_code")} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                            College Code
                            <span className="ml-1">{getSortIcon("institution_code")}</span>
                          </Button>
                        </th>
                        <th className="text-left font-semibold text-sm">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("name")} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                            College Name
                            <span className="ml-1">{getSortIcon("name")}</span>
                          </Button>
                        </th>
                        <th className="text-left font-semibold text-sm">Email</th>
                        <th className="text-left font-semibold text-sm">Mobile</th>
                        <th className="text-left font-semibold text-sm">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("is_active")} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                            Status
                            <span className="ml-1">{getSortIcon("is_active")}</span>
                          </Button>
                        </th>
                        <th className="text-center font-semibold text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="h-24 text-center text-sm text-slate-500">Loading…</td>
                        </tr>
                      ) : pageItems.length ? (
                        <>
                          {pageItems.map((row) => (
                            <tr key={row.id}>
                              <td className="font-medium text-sm">{row.institution_code}</td>
                              <td className="text-sm">{row.name}</td>
                              <td className="text-sm text-slate-600 dark:text-slate-400">{row.email || '-'}</td>
                              <td className="text-sm text-slate-600 dark:text-slate-400">{row.phone || '-'}</td>
                              <td>
                                <span className={row.is_active ? 'pill-success' : 'pill-error'}>
                                  {row.is_active ? "Active" : "Inactive"}
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
                              </td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td colSpan={6} className="h-24 text-center text-sm text-slate-500">No data</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {filtered.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} institutions
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


