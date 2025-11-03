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
import { useToast } from "@/hooks/use-toast"
import { useFormValidation, ValidationPresets } from "@/hooks/use-form-validation"
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Users, TrendingUp, FileSpreadsheet, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

type Institution = {
  id: string
  institution_code: string
  name: string
}

type Section = {
  id: string
  institutions_id?: string
  institution_code: string
  section_name: string
  section_id: string
  section_description?: string
  arrear_section: boolean
  status: boolean
  created_at: string
  updated_at?: string
}

export default function SectionPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<Section[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Section | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [errorPopupOpen, setErrorPopupOpen] = useState(false)
  const [importErrors, setImportErrors] = useState<Array<{
    row: number
    institution_code: string
    section_name: string
    errors: string[]
  }>>([])

  const [formData, setFormData] = useState({
    institutions_id: "",
    institution_code: "",
    section_name: "",
    section_id: "",
    section_description: "",
    arrear_section: false,
    status: true,
  })

  // Validation hook
  const { errors, validate, clearErrors } = useFormValidation({
    institution_code: [ValidationPresets.required('Institution code is required')],
    section_name: [ValidationPresets.required('Section name is required')],
    section_id: [ValidationPresets.required('Section ID is required')],
  })

  // Fetch data from API
  const fetchSections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/section')
      if (!response.ok) {
        throw new Error('Failed to fetch sections')
      }
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Error fetching sections:', error)
      toast({
        title: "❌ Fetch Failed",
        description: "Failed to load sections. Please refresh the page.",
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchInstitutions = async () => {
    try {
      const response = await fetch('/api/institutions')
      if (!response.ok) {
        throw new Error('Failed to fetch institutions')
      }
      const data = await response.json()
      setInstitutions(data)
    } catch (error) {
      console.error('Error fetching institutions:', error)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchSections()
    fetchInstitutions()
  }, [])

  const resetForm = () => {
    setFormData({
      institutions_id: "",
      institution_code: "",
      section_name: "",
      section_id: "",
      section_description: "",
      arrear_section: false,
      status: true,
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
      .filter((i) => [i.institution_code, i.section_name, i.section_id, i.section_description].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      .filter((i) => statusFilter === "all" || (statusFilter === "active" ? i.status : !i.status))

    if (!sortColumn) return data
    const sorted = [...data].sort((a, b) => {
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

  useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection, statusFilter])

  const openAdd = () => {
    resetForm()
    setSheetOpen(true)
  }

  const openEdit = (row: Section) => {
    setEditing(row)
    setFormData({
      institutions_id: row.institutions_id || "",
      institution_code: row.institution_code,
      section_name: row.section_name,
      section_id: row.section_id,
      section_description: row.section_description || "",
      arrear_section: row.arrear_section,
      status: row.status,
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
        // Update existing section
        const response = await fetch('/api/section', {
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
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to update section')
        }
        
        const updatedSection = await response.json()
        setItems((prev) => prev.map((p) => (p.id === editing.id ? updatedSection : p)))
        
        toast({
          title: "✅ Section Updated",
          description: `${updatedSection.section_name} has been successfully updated.`,
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
        })
      } else {
        // Create new section
        const response = await fetch('/api/section', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMsg = errorData.error || 'Failed to create section'
          
          // Check for duplicate error
          if (errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
            throw new Error(`Section ID "${formData.section_id}" already exists for this institution. Please use a different Section ID.`)
          }
          
          throw new Error(errorMsg)
        }
        
        const newSection = await response.json()
        setItems((prev) => [newSection, ...prev])
        
        toast({
          title: "✅ Section Created",
          description: `${newSection.section_name} has been successfully created.`,
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
        })
      }
      
      setSheetOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving section:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save section. Please try again.'
      
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
      
      const response = await fetch(`/api/section?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete section')
      }
      
      const sectionName = items.find(i => i.id === id)?.section_name || 'Section'
      setItems((prev) => prev.filter((p) => p.id !== id))
      
      toast({
        title: "✅ Section Deleted",
        description: `${sectionName} has been successfully deleted.`,
        className: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200",
      })
    } catch (error) {
      console.error('Error deleting section:', error)
      toast({
        title: "❌ Delete Failed",
        description: "Failed to delete section. Please try again.",
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
    const exportData = filtered.map(item => ({
      institution_code: item.institution_code,
      section_name: item.section_name,
      section_id: item.section_id,
      section_description: item.section_description || '',
      arrear_section: item.arrear_section,
      status: item.status,
      created_at: item.created_at
    }))
    
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sections_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    const excelData = filtered.map((r) => ({
      'Institution Code': r.institution_code,
      'Section ID': r.section_id,
      'Section Name': r.section_name,
      'Description': r.section_description || '',
      'Arrear Section': r.arrear_section ? 'Yes' : 'No',
      'Status': r.status ? 'Active' : 'Inactive',
      'Created': new Date(r.created_at).toISOString().split('T')[0],
    }))
    
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // Set column widths
    const colWidths = [
      { wch: 20 }, // Institution Code
      { wch: 15 }, // Section ID
      { wch: 20 }, // Section Name
      { wch: 30 }, // Description
      { wch: 10 }, // Arrear
      { wch: 10 }, // Status
      { wch: 12 }  // Created
    ]
    ws['!cols'] = colWidths
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sections')
    XLSX.writeFile(wb, `sections_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleTemplateExport = () => {
    const sample = [{
      'Institution Code': 'JKKN',
      'Section ID': 'A1',
      'Section Name': 'A',
      'Description': 'Regular',
      'Arrear Section': 'No',
      'Status': 'Active'
    }]
    
    const ws = XLSX.utils.json_to_sheet(sample)
    
    // Set column widths
    const colWidths = [
      { wch: 20 }, // Institution Code
      { wch: 15 }, // Section ID
      { wch: 20 }, // Section Name
      { wch: 30 }, // Description
      { wch: 10 }, // Arrear
      { wch: 10 }  // Status
    ]
    ws['!cols'] = colWidths
    
    // Style the header row to make mandatory fields red
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    const mandatoryFields = ['Institution Code', 'Section ID', 'Section Name']
    
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
    XLSX.writeFile(wb, `sections_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        let rows: Partial<Section>[] = []
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
            section_id: String(j['Section ID *'] || j['Section ID'] || ''),
            section_name: String(j['Section Name *'] || j['Section Name'] || ''),
            section_description: String(j['Description'] || ''),
            arrear_section: String(j['Arrear Section'] || '').toLowerCase() === 'yes',
            status: String(j['Status'] || '').toLowerCase() === 'active'
          }))
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const data = new Uint8Array(await file.arrayBuffer())
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
          rows = json.map(j => ({
            institution_code: String(j['Institution Code *'] || j['Institution Code'] || ''),
            section_id: String(j['Section ID *'] || j['Section ID'] || ''),
            section_name: String(j['Section Name *'] || j['Section Name'] || ''),
            section_description: String(j['Description'] || ''),
            arrear_section: String(j['Arrear Section'] || '').toLowerCase() === 'yes',
            status: String(j['Status'] || '').toLowerCase() === 'active'
          }))
        }
        
        const now = new Date().toISOString()
        const mapped = rows.map((r, index) => {
          const sectionData = {
            id: String(Date.now() + Math.random()),
            institutions_id: institutions.find(inst => inst.institution_code === r.institution_code)?.id || '',
            institution_code: r.institution_code!,
            section_name: r.section_name as string,
            section_id: r.section_id as string,
            section_description: (r as any).section_description || '',
            arrear_section: (r as any).arrear_section ?? false,
            status: (r as any).status ?? true,
            created_at: now,
          }
          return sectionData
        }).filter(r => r.institution_code && r.section_id && r.section_name) as Section[]
        
        if (mapped.length === 0) {
          toast({
            title: "❌ No Valid Data",
            description: "No valid data found in the file. Please check that Institution Code, Section ID and Section Name are provided.",
            variant: "destructive",
            className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
          })
          return
        }
        
        // Save each section to the database
        setLoading(true)
        let successCount = 0
        let errorCount = 0
        const uploadErrors: Array<{
          row: number
          institution_code: string
          section_name: string
          errors: string[]
        }> = []
        
        for (let i = 0; i < mapped.length; i++) {
          const section = mapped[i]
          const rowNumber = i + 2 // +2 for header row
          
          try {
            const response = await fetch('/api/section', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(section),
            })
            
            if (response.ok) {
              const savedSection = await response.json()
              setItems(prev => [savedSection, ...prev])
              successCount++
            } else {
              const errorData = await response.json().catch(() => ({}))
              const errorMsg = errorData.error || 'Failed to save section'
              
              errorCount++
              uploadErrors.push({
                row: rowNumber,
                institution_code: section.institution_code,
                section_name: section.section_name,
                errors: [errorMsg.includes('duplicate') || errorMsg.includes('already exists') 
                  ? `Duplicate: Section ID "${section.section_id}" already exists for this institution`
                  : errorMsg
                ]
              })
            }
          } catch (error) {
            errorCount++
            uploadErrors.push({
              row: rowNumber,
              institution_code: section.institution_code,
              section_name: section.section_name,
              errors: [error instanceof Error ? error.message : 'Network error']
            })
          }
        }
        
        // Show error dialog if there are errors
        if (uploadErrors.length > 0) {
          setImportErrors(uploadErrors)
          setErrorPopupOpen(true)
        }
        
        setLoading(false)
        
        // Show detailed results
        if (successCount > 0 && errorCount === 0) {
          toast({
            title: "✅ Import Successful",
            description: `Successfully imported ${successCount} section(s) to the database.`,
            className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
          })
        } else if (successCount > 0 && errorCount > 0) {
          toast({
            title: "⚠️ Partial Import Success",
            description: `Imported ${successCount} section(s) successfully, ${errorCount} failed. Check console for details.`,
            className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
          })
        } else {
          toast({
            title: "❌ Import Failed",
            description: "Failed to import any sections. Please check your data and try again.",
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
                  <BreadcrumbPage>Section</BreadcrumbPage>
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
                    <p className="text-xs font-medium text-muted-foreground">Total Sections</p>
                    <p className="text-xl font-bold">{items.length}</p>
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
                    <p className="text-xs font-medium text-muted-foreground">Active Sections</p>
                    <p className="text-xl font-bold text-green-600">{items.filter(i=>i.status).length}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <Users className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Inactive Sections</p>
                    <p className="text-xl font-bold text-red-600">{items.filter(i=>!i.status).length}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <Users className="h-3 w-3 text-red-600 dark:text-red-400" />
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
              {/* Compact Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Section</h2>
                    <p className="text-[11px] text-muted-foreground">Manage student sections</p>
                  </div>
                </div>
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
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={fetchSections} disabled={loading}>
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
                            Institution Code
                            <span className="ml-1">{getSortIcon("institution_code")}</span>
                          </Button>
                        </TableHead>
                        <TableHead className="w-[120px] text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("section_id")} className="h-auto p-0 font-medium hover:bg-transparent">
                            Section ID
                            <span className="ml-1">{getSortIcon("section_id")}</span>
                          </Button>
                        </TableHead>
                        <TableHead className="text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("section_name")} className="h-auto p-0 font-medium hover:bg-transparent">
                            Section Name
                            <span className="ml-1">{getSortIcon("section_name")}</span>
                          </Button>
                        </TableHead>
                        <TableHead className="w-[200px] text-[11px]">Description</TableHead>
                        <TableHead className="w-[100px] text-[11px]">Arrear Section</TableHead>
                        <TableHead className="w-[100px] text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("status")} className="h-auto p-0 font-medium hover:bg-transparent">
                            Status
                            <span className="ml-1">{getSortIcon("status")}</span>
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
                          {pageItems.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="text-[11px] font-medium">{row.institution_code}</TableCell>
                              <TableCell className="text-[11px]">{row.section_id}</TableCell>
                              <TableCell className="text-[11px]">{row.section_name}</TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{row.section_description || '-'}</TableCell>
                              <TableCell className="text-[11px]">{row.arrear_section ? "Yes" : "No"}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={row.status ? "default" : "secondary"} 
                                  className={`text-[11px] ${
                                    row.status 
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200' 
                                      : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                                  }`}
                                >
                                  {row.status ? "Active" : "Inactive"}
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
                                        <AlertDialogTitle>Delete Section</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete {row.section_name}? This action cannot be undone.
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
                          <TableCell colSpan={7} className="h-24 text-center text-[11px]">No data</TableCell>
                        </TableRow>
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
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader className="pb-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {editing ? "Edit Section" : "Add Section"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editing ? "Update section information" : "Create a new section record"}
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-blue-200 dark:border-blue-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Section Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="institution_code" className="text-sm font-semibold">
                    Institution Code <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.institution_code} 
                    onValueChange={(value) => {
                      const selectedInstitution = institutions.find(inst => inst.institution_code === value)
                      setFormData({ 
                        ...formData, 
                        institution_code: value,
                        institutions_id: selectedInstitution?.id || ""
                      })
                    }}
                  >
                    <SelectTrigger className={`h-10 ${errors.institution_code ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select Institution" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions.map((institution) => (
                        <SelectItem key={institution.id} value={institution.institution_code}>
                          {institution.institution_code} - {institution.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.institution_code && <p className="text-xs text-destructive">{errors.institution_code}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section_id" className="text-sm font-semibold">
                    Section ID <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="section_id" 
                    value={formData.section_id} 
                    onChange={(e) => setFormData({ ...formData, section_id: e.target.value })} 
                    className={`h-10 ${errors.section_id ? 'border-destructive' : ''}`} 
                    placeholder="e.g., A1, B1"
                  />
                  {errors.section_id && <p className="text-xs text-destructive">{errors.section_id}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section_name" className="text-sm font-semibold">
                    Section Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="section_name" 
                    value={formData.section_name} 
                    onChange={(e) => setFormData({ ...formData, section_name: e.target.value })} 
                    className={`h-10 ${errors.section_name ? 'border-destructive' : ''}`} 
                    placeholder="e.g., Section A, Section B"
                  />
                  {errors.section_name && <p className="text-xs text-destructive">{errors.section_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section_description" className="text-sm font-medium">Description</Label>
                  <Input 
                    id="section_description" 
                    value={formData.section_description} 
                    onChange={(e) => setFormData({ ...formData, section_description: e.target.value })} 
                    className="h-10" 
                    placeholder="Section description"
                  />
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-purple-200 dark:border-purple-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Status & Settings</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Arrear Section</Label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, arrear_section: !formData.arrear_section })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        formData.arrear_section ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.arrear_section ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-medium ${formData.arrear_section ? 'text-green-600' : 'text-gray-500'}`}>
                      {formData.arrear_section ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Status</Label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: !formData.status })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        formData.status ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.status ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-medium ${formData.status ? 'text-green-600' : 'text-red-500'}`}>
                      {formData.status ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
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
                {editing ? "Update Section" : "Create Section"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Upload Error Dialog */}
      <AlertDialog open={errorPopupOpen} onOpenChange={setErrorPopupOpen}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
                  Upload Errors ({importErrors.length} row{importErrors.length > 1 ? 's' : ''} failed)
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                  Please fix the following errors before importing the data
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Error Summary */}
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="font-semibold text-red-800 dark:text-red-200">
                  {importErrors.length} row{importErrors.length > 1 ? 's' : ''} failed validation
                </span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Please correct these errors in your file and try uploading again. Row numbers correspond to your Excel file (including header row).
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
                        {error.institution_code} - {error.section_name}
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
                    <li>• Section ID must be unique per institution</li>
                    <li>• Ensure all required fields are provided (Institution Code, Section ID, Section Name)</li>
                    <li>• Check for duplicate entries in your file</li>
                    <li>• Verify institution codes match existing institutions</li>
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


