"use client"

import { useMemo, useState, useEffect } from "react"
import * as XLSX from "xlsx"
import supabaseAuthService from "@/lib/auth/supabase-auth-service"
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
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, GraduationCap, TrendingUp, FileSpreadsheet, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"



// Degree type definition
interface Degree {
  id: string
  institution_code: string
  degree_code: string
  degree_name: string
  display_name?: string
  description?: string
  is_active: boolean
  created_at: string
}



// Note: No mock data. Always fetch from API.

export default function DegreePage() {
  const { toast } = useToast()
  const [items, setItems] = useState<Degree[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Degree | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [errorPopupOpen, setErrorPopupOpen] = useState(false)
  const [importErrors, setImportErrors] = useState<Array<{
    row: number
    degree_code: string
    degree_name: string
    errors: string[]
  }>>([])
  const [uploadSummary, setUploadSummary] = useState<{
    total: number
    success: number
    failed: number
  }>({ total: 0, success: 0, failed: 0 })

  // Institutions for dropdown
  const [institutions, setInstitutions] = useState<Array<{ id: string; institution_code: string; name?: string }>>([])

  const [formData, setFormData] = useState({
    institution_code: "",
    degree_code: "",
    degree_name: "",
    display_name: "",
    description: "",
        is_active: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch data from API
  const fetchDegrees = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/degrees')
      if (!response.ok) {
        throw new Error('Failed to fetch degrees')
      }
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Error fetching degrees:', error)
      setItems([])
    } finally {
    setLoading(false)
    }
  }

  const fetchInstitutionsList = async () => {
    try {
      const res = await fetch('/api/institutions')
      if (res.ok) {
        const data = await res.json()
        const mapped = Array.isArray(data)
          ? data.filter((i: any) => i?.institution_code).map((i: any) => ({
              id: i.id,
              institution_code: i.institution_code,
              name: i.institution_name || i.name  // Support both field names
            }))
          : []
        setInstitutions(mapped)
      }
    } catch (e) {
      console.error('Failed to load institutions:', e)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchDegrees()
    fetchInstitutionsList()
    // Skip institution_id prefill; Institution Code will be chosen from dropdown
  }, [])



  const resetForm = () => {
    setFormData({
      institution_code: "",
      degree_code: "",
      degree_name: "",
      display_name: "",
      description: "",
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
      .filter((i) => [i.institution_code, i.degree_code, i.degree_name, i.display_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
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
  
  const openEdit = (row: Degree) => {
    setEditing(row)
    setFormData({
      institution_code: row.institution_code,
      degree_code: row.degree_code,
      degree_name: row.degree_name,
      display_name: row.display_name || "",
      description: row.description || "",
      is_active: row.is_active,
    })
    setSheetOpen(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.institution_code.trim()) e.institution_code = "Required"
    if (!formData.degree_code.trim()) e.degree_code = "Required"
    if (!formData.degree_name.trim()) e.degree_name = "Required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return

    try {
      setLoading(true)
      // Find the selected institution to get its ID
      const selectedInstitution = institutions.find(inst => inst.institution_code === formData.institution_code)

      if (!selectedInstitution) {
        toast({
          title: "❌ Error",
          description: "Selected institution not found. Please refresh and try again.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Create payload with both institution_code and institutions_id (note: plural)
      let payload = {
        ...formData,
        institutions_id: selectedInstitution.id  // Add institutions_id from selected institution
      }

      if (editing) {
        // Update existing degree
        const response = await fetch('/api/degrees', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: editing.id, ...payload }),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update degree')
        }

        const updatedDegree = await response.json()
        setItems((prev) => prev.map((p) => (p.id === editing.id ? updatedDegree : p)))

        toast({
          title: "✅ Degree Updated",
          description: `${updatedDegree.degree_name} has been successfully updated.`,
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
        })
      } else {
        // Create new degree
        const response = await fetch('/api/degrees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create degree')
        }

        const newDegree = await response.json()
        setItems((prev) => [newDegree, ...prev])

        toast({
          title: "✅ Degree Created",
          description: `${newDegree.degree_name} has been successfully created.`,
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
        })
      }

      setSheetOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving degree:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save degree. Please try again.'
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
      const degreeName = items.find(i => i.id === id)?.degree_name || 'Degree'

      const response = await fetch(`/api/degrees?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete degree')
      }

      setItems((prev) => prev.filter((p) => p.id !== id))

      toast({
        title: "✅ Degree Deleted",
        description: `${degreeName} has been successfully deleted.`,
        className: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200",
      })
    } catch (error) {
      console.error('Error deleting degree:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete degree. Please try again.'
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

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })



  // Field validation function
  const validateDegreeData = (data: any, rowIndex: number) => {
    const errors: string[] = []
    
    // Required field validations
    if (!data.degree_code || data.degree_code.trim() === '') {
      errors.push('Degree Code is required')
    } else if (data.degree_code.length > 50) {
      errors.push('Degree Code must be 50 characters or less')
    }
    
    if (!data.degree_name || data.degree_name.trim() === '') {
      errors.push('Degree Name is required')
    } else if (data.degree_name.length > 255) {
      errors.push('Degree Name must be 255 characters or less')
    }
    
    // Optional field validations
    if (data.display_name && data.display_name.length > 255) {
      errors.push('Display Name must be 255 characters or less')
    }
    
    if (data.description && data.description.length > 1000) {
      errors.push('Description must be 1000 characters or less')
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
    
    return errors
  }

  // Export/Import/Template handlers
  const handleDownload = () => {
    const exportData = filtered.map(item => ({
      institution_code: item.institution_code,
      degree_code: item.degree_code,
      degree_name: item.degree_name,
      display_name: item.display_name || '',
      description: item.description || '',
      is_active: item.is_active,
      created_at: item.created_at
    }))
    
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `degrees_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }



  const handleExport = () => {
    const excelData = filtered.map((r) => ({
      'Institution Code': r.institution_code,
      'Degree Code': r.degree_code,
      'Degree Name': r.degree_name,
      'Display Name': r.display_name || '',
      'Description': r.description || '',
      'Status': r.is_active ? 'Active' : 'Inactive',
      'Created': new Date(r.created_at).toISOString().split('T')[0],
    }))
    
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // Set column widths
    const colWidths = [
      { wch: 20 }, // Institution Code
      { wch: 15 }, // Degree Code
      { wch: 30 }, // Degree Name
      { wch: 15 }, // Display Name
      { wch: 40 }, // Description
      { wch: 10 }, // Status
      { wch: 12 }  // Created
    ]
    ws['!cols'] = colWidths
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Degrees')
    XLSX.writeFile(wb, `degrees_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleTemplateExport = () => {
    // Create workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Template with sample row
    const sample = [{
      'Institution Code': 'JKKN',
      'Degree Code': 'BSC',
      'Degree Name': 'Bachelor of Science',
      'Display Name': 'B.Sc',
      'Description': 'A comprehensive science degree program',
      'Status': 'Active'
    }]

    const ws = XLSX.utils.json_to_sheet(sample)

    // Set column widths for template sheet
    const colWidths = [
      { wch: 18 }, // Institution Code
      { wch: 15 }, // Degree Code
      { wch: 30 }, // Degree Name
      { wch: 15 }, // Display Name
      { wch: 40 }, // Description
      { wch: 10 }  // Status
    ]
    ws['!cols'] = colWidths

    // Style the header row to make mandatory fields red
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    const mandatoryFields = ['Institution Code', 'Degree Code', 'Degree Name']

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

    XLSX.utils.book_append_sheet(wb, ws, 'Template')

    // Sheet 2: Institution Code References
    const institutionReference = institutions.map(inst => ({
      'Institution Code': inst.institution_code,
      'Institution Name': inst.name || 'N/A',
      'Status': inst.is_active ? 'Active' : 'Inactive'
    }))

    const wsRef = XLSX.utils.json_to_sheet(institutionReference)

    // Set column widths for reference sheet
    const refColWidths = [
      { wch: 20 }, // Institution Code
      { wch: 40 }, // Institution Name
      { wch: 10 }  // Status
    ]
    wsRef['!cols'] = refColWidths

    // Style the reference sheet header
    const refRange = XLSX.utils.decode_range(wsRef['!ref'] || 'A1')
    for (let col = refRange.s.c; col <= refRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (wsRef[cellAddress]) {
        wsRef[cellAddress].s = {
          font: { bold: true, color: { rgb: '1F2937' } },
          fill: { fgColor: { rgb: 'DBEAFE' } }
        }
      }
    }

    // Style data rows in reference sheet
    for (let row = 1; row <= refRange.e.r; row++) {
      for (let col = refRange.s.c; col <= refRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        if (wsRef[cellAddress]) {
          wsRef[cellAddress].s = {
            fill: { fgColor: { rgb: 'F0F9FF' } },
            font: { color: { rgb: '374151' } }
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, wsRef, 'Institution Codes')

    XLSX.writeFile(wb, `degrees_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        let rows: Partial<Degree>[] = []
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
            degree_code: String(j['Degree Code *'] || j['Degree Code'] || ''),
            degree_name: String(j['Degree Name *'] || j['Degree Name'] || ''),
            display_name: String(j['Display Name'] || ''),
            description: String(j['Description'] || ''),
            is_active: String(j['Status'] || '').toLowerCase() === 'active'
          }))
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const data = new Uint8Array(await file.arrayBuffer())
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
          rows = json.map(j => ({
            institution_code: String(j['Institution Code *'] || j['Institution Code'] || ''),
            degree_code: String(j['Degree Code *'] || j['Degree Code'] || ''),
            degree_name: String(j['Degree Name *'] || j['Degree Name'] || ''),
            display_name: String(j['Display Name'] || ''),
            description: String(j['Description'] || ''),
            is_active: String(j['Status'] || '').toLowerCase() === 'active'
          }))
        }
        
        const now = new Date().toISOString()
        const validationErrors: Array<{
          row: number
          degree_code: string
          degree_name: string
          errors: string[]
        }> = []
        
        const mapped = rows.map((r, index) => {
          const degreeData = {
            id: String(Date.now() + Math.random()),
            institution_code: (r as any).institution_code || '',
            degree_code: r.degree_code!,
            degree_name: r.degree_name as string,
            display_name: r.display_name || '',
            description: r.description || '',
            is_active: r.is_active ?? true,
            created_at: now,
          }
          
          // Validate the data
          const errors = validateDegreeData(degreeData, index + 2) // +2 because index is 0-based and we have header row
          if (errors.length > 0) {
            validationErrors.push({
              row: index + 2,
              degree_code: degreeData.degree_code || 'N/A',
              degree_name: degreeData.degree_name || 'N/A',
              errors: errors
            })
          }
          
          return degreeData
        }).filter(r => r.degree_code && r.degree_name) as Degree[]
        
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
            description: "No valid data found in the file. Please check that Degree Code and Degree Name are provided.",
            variant: "destructive",
            className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
          })
          return
        }
        
        // Save each degree to the database
        setLoading(true)
        let successCount = 0
        let errorCount = 0
        const uploadErrors: Array<{
          row: number
          degree_code: string
          degree_name: string
          errors: string[]
        }> = []

        for (let i = 0; i < mapped.length; i++) {
          const degree = mapped[i]
          const rowNumber = i + 2 // +2 for header row in Excel

          try {
            // Send degree with institution_code - API will auto-map to institutions_id
            const response = await fetch('/api/degrees', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(degree),
            })

            if (response.ok) {
              const savedDegree = await response.json()
              setItems(prev => [savedDegree, ...prev])
              successCount++
            } else {
              const errorData = await response.json()
              errorCount++
              uploadErrors.push({
                row: rowNumber,
                degree_code: degree.degree_code || 'N/A',
                degree_name: degree.degree_name || 'N/A',
                errors: [errorData.error || 'Failed to save degree']
              })
            }
          } catch (error) {
            errorCount++
            uploadErrors.push({
              row: rowNumber,
              degree_code: degree.degree_code || 'N/A',
              degree_name: degree.degree_name || 'N/A',
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

        // Show detailed results with error dialog if needed
        if (uploadErrors.length > 0) {
          setImportErrors(uploadErrors)
          setErrorPopupOpen(true)
        }

        if (successCount > 0 && errorCount === 0) {
          toast({
            title: "✅ Upload Complete",
            description: `Successfully uploaded all ${successCount} row${successCount > 1 ? 's' : ''} (${successCount} degree${successCount > 1 ? 's' : ''}) to the database.`,
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
                    <BreadcrumbPage>Degree</BreadcrumbPage>
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
                      <p className="text-xs font-medium text-muted-foreground">Total Degrees</p>
                    <p className="text-xl font-bold">{items.length}</p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <GraduationCap className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Active Degrees</p>
                    <p className="text-xl font-bold text-green-600">{items.filter(i=>i.is_active).length}</p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <GraduationCap className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Inactive Degrees</p>
                    <p className="text-xl font-bold text-red-600">{items.filter(i=>!i.is_active).length}</p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <GraduationCap className="h-3 w-3 text-red-600 dark:text-red-400" />
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
                      <GraduationCap className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">Degrees</h2>
                    <p className="text-[11px] text-muted-foreground">Manage degree programs</p>
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
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={fetchDegrees} disabled={loading}>
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
                          <Button variant="ghost" size="sm" onClick={() => handleSort("degree_code")} className="h-auto p-0 font-medium hover:bg-transparent">
                              Degree Code
                            <span className="ml-1">{getSortIcon("degree_code")}</span>
                            </Button>
                          </TableHead>
                          <TableHead className="text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("degree_name")} className="h-auto p-0 font-medium hover:bg-transparent">
                              Degree Name
                            <span className="ml-1">{getSortIcon("degree_name")}</span>
                            </Button>
                          </TableHead>
                          <TableHead className="w-[120px] text-[11px]">Display Name</TableHead>
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
                              <TableCell className="text-[11px]">{row.degree_code}</TableCell>
                              <TableCell className="text-[11px]">{row.degree_name}</TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{row.display_name || '-'}</TableCell>
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
                                          <AlertDialogTitle>Delete Degree</AlertDialogTitle>
                                          <AlertDialogDescription>
                                          Are you sure you want to delete {row.degree_name}? This action cannot be undone.
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
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader className="pb-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {editing ? "Edit Degree" : "Add Degree"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editing ? "Update degree information" : "Create a new degree record"}
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
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Institution Code dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="institution_code" className="text-sm font-semibold">
                    Institution Code <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.institution_code}
                    onValueChange={(code) => {
                      setFormData(prev => ({ ...prev, institution_code: code }))
                    }}
                  >
                    <SelectTrigger className={`h-10 ${errors.institution_code ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select Institution Code" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions.map(inst => (
                        <SelectItem key={inst.id} value={inst.institution_code}>
                          {inst.institution_code}{inst.name ? ` - ${inst.name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.institution_code && <p className="text-xs text-destructive">{errors.institution_code}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="degree_code" className="text-sm font-semibold">
                    Degree Code <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="degree_code" 
                    value={formData.degree_code} 
                    onChange={(e) => setFormData({ ...formData, degree_code: e.target.value })} 
                    className={`h-10 ${errors.degree_code ? 'border-destructive' : ''}`} 
                    placeholder="e.g., BSC"
                  />
                  {errors.degree_code && <p className="text-xs text-destructive">{errors.degree_code}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="degree_name" className="text-sm font-semibold">
                    Degree Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="degree_name" 
                    value={formData.degree_name} 
                    onChange={(e) => setFormData({ ...formData, degree_name: e.target.value })} 
                    className={`h-10 ${errors.degree_name ? 'border-destructive' : ''}`} 
                    placeholder="e.g., Bachelor of Science"
                  />
                  {errors.degree_name && <p className="text-xs text-destructive">{errors.degree_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name" className="text-sm font-medium">Display Name</Label>
                  <Input 
                    id="display_name" 
                    value={formData.display_name} 
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} 
                    className="h-10" 
                    placeholder="e.g., B.Sc"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Input 
                    id="description" 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    className="h-10" 
                    placeholder="Degree description"
                  />
                </div>

                
              </div>
            </div>

            {/* Status Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-teal-200 dark:border-teal-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-teal-500 to-green-600 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">Status</h3>
              </div>
              <div className="flex items-center gap-4">
                <Label className="text-sm font-semibold">Degree Status</Label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    formData.is_active ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
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
                {editing ? "Update Degree" : "Create Degree"}
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
            {/* Upload Summary */}
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
                        {error.degree_code} - {error.degree_name}
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
                    <li>• Ensure Degree Code and Degree Name are provided and not empty</li>
                    <li>• Institution Code must exist in the institutions table (foreign key validation)</li>
                    <li>• Degree Code must be 50 characters or less</li>
                    <li>• Degree Name must be 255 characters or less</li>
                    <li>• Display Name must be 255 characters or less</li>
                    <li>• Description must be 1000 characters or less</li>
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