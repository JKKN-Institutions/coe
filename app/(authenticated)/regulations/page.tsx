"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { AppFooter } from "@/components/app-footer"
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
  LibraryBig,
  FileText,
  Clock,
  TrendingUp,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
} from "lucide-react"

// Regulation type definition
interface Regulation {
  id: number 
  regulation_year: number
  regulation_code: string
  status: boolean
  minimum_internal: number
  minimum_external: number
  minimum_attendance: number
  minimum_total: number
  maximum_internal: number
  maximum_external: number
  maximum_total: number
  maximum_qp_marks: number
  condonation_range_start: number
  condonation_range_end: number
  created_at: string
  updated_at: string
}

export default function RegulationsPage() {
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
  const [deleteRegulationId, setDeleteRegulationId] = useState<number | null>(null)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch regulations from API
  useEffect(() => {
    const fetchRegulations = async () => {
      try {
        const response = await fetch('/api/regulations')
        if (response.ok) {
          const data = await response.json()
          setRegulations(data)
        } else {
          const errorData = await response.json()
          console.error('Failed to fetch regulations:', errorData)
          
          // Check if regulations table doesn't exist
          if (errorData.error === 'Regulations table not found') {
            alert(`Database Setup Required:\n\n${errorData.message}\n\nPlease follow the instructions in the console to create the regulations table.`)
            console.log('Setup Instructions:', errorData.instructions)
          }
        }
      } catch (error) {
        console.error('Error fetching regulations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRegulations()
  }, [])

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Filter and sort regulations
  const filteredRegulations = regulations
    .filter((regulation) => {
      const matchesSearch = regulation.regulation_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           regulation.regulation_year.toString().includes(searchTerm)
      const matchesStatus = statusFilter === "all" ||
                           (statusFilter === "active" && regulation.status) ||
                           (statusFilter === "inactive" && !regulation.status)
      const matchesYear = yearFilter === "all" || regulation.regulation_year.toString() === yearFilter
      return matchesSearch && matchesStatus && matchesYear
    })
    .sort((a, b) => {
      if (!sortColumn) return 0

      let aValue: string | number
      let bValue: string | number

      switch (sortColumn) {
        case 'regulation_code':
          aValue = a.regulation_code.toLowerCase()
          bValue = b.regulation_code.toLowerCase()
          break
        case 'regulation_year':
          aValue = a.regulation_year
          bValue = b.regulation_year
          break
        case 'status':
          aValue = a.status ? 1 : 0
          bValue = b.status ? 1 : 0
          break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          return 0
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

  const getStatusBadgeVariant = (regulation: Regulation) => {
    return regulation.status ? "default" : "secondary"
  }

  const getStatusText = (regulation: Regulation) => {
    return regulation.status ? "Active" : "Inactive"
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDeleteRegulation = async (regulationId: number) => {
    try {
      const response = await fetch(`/api/regulations/${regulationId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setRegulations(regulations.filter(regulation => regulation.id !== regulationId))
        setDeleteRegulationId(null)
      } else {
        console.error('Failed to delete regulation')
      }
    } catch (error) {
      console.error('Error deleting regulation:', error)
    }
  }


  // Download function - downloads filtered data as JSON
  const handleDownload = () => {
    const dataToDownload = filteredRegulations
    const jsonData = JSON.stringify(dataToDownload, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `regulations_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Template Export function - exports Excel template with headers and sample data
  const handleTemplateExport = () => {
    // Prepare headers
    const headers = ['Regulation Code', 'Year', 'Status', 'Min Internal', 'Min External', 'Min Attendance', 'Min Total', 'Max Internal', 'Max External', 'Max Total', 'Max QP Marks', 'Condonation Start', 'Condonation End']

    // Sample data - one row with example values
    const sampleData = [{
      'Regulation Code': 'R25',
      'Year': 2024,
      'Status': 'Active',
      'Min Internal': 14,
      'Min External': 26,
      'Min Attendance': 75,
      'Min Total': 40,
      'Max Internal': 40,
      'Max External': 60,
      'Max Total': 100,
      'Max QP Marks': 100,
      'Condonation Start': 65,
      'Condonation End': 74
    }]

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(sampleData)
    const wb = XLSX.utils.book_new()

    // Define column widths
    const colWidths = [
      { wch: 18 },  // Regulation Code
      { wch: 10 },  // Year
      { wch: 10 },  // Status
      { wch: 12 },  // Min Internal
      { wch: 12 },  // Min External
      { wch: 15 },  // Min Attendance
      { wch: 10 },  // Min Total
      { wch: 12 },  // Max Internal
      { wch: 12 },  // Max External
      { wch: 10 },  // Max Total
      { wch: 12 },  // Max QP Marks
      { wch: 18 },  // Condonation Start
      { wch: 18 }   // Condonation End
    ]
    ws['!cols'] = colWidths

    // Apply header styling
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')

    // Style headers (first row)
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!ws[cellAddress]) continue

      ws[cellAddress].s = {
        font: {
          bold: true,
          name: 'Arial',
          sz: 11,
          color: { rgb: 'FFFFFF' }
        },
        fill: {
          fgColor: { rgb: '0066CC' },
          bgColor: { rgb: '0066CC' },
          patternType: 'solid'
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    }

    // Style sample data row
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col })
      if (!ws[cellAddress]) continue

      ws[cellAddress].s = {
        font: {
          name: 'Arial',
          sz: 10,
          color: { rgb: '666666' },
          italic: true
        },
        fill: {
          fgColor: { rgb: 'F0F0F0' },
          bgColor: { rgb: 'F0F0F0' },
          patternType: 'solid'
        },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    }

    // Add instructions as a comment in the first cell
    if (!ws.A1.c) ws.A1.c = []
    ws.A1.c.push({
      a: 'Template Instructions',
      t: 'This is a template for importing regulations data.\n\nInstructions:\n1. Replace the sample data with your actual data\n2. Keep the header row as is\n3. Status should be either "Active" or "Inactive"\n4. All numeric fields should contain numbers only\n5. Save the file and use the Import button to upload'
    })

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Regulations Template')

    // Write the file
    XLSX.writeFile(wb, `regulations_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Export function - exports filtered data as Excel with formatting
  const handleExport = () => {
    // Prepare headers with S.No
    const headers = ['S.No', 'Regulation Code', 'Year', 'Status', 'Min Internal', 'Min External', 'Min Attendance', 'Min Total', 'Max Internal', 'Max External', 'Max Total', 'Max QP Marks', 'Condonation Start', 'Condonation End']

    // Prepare data with S.No starting from 1
    const excelData = filteredRegulations.map((reg, index) => ({
      'S.No': index + 1,
      'Regulation Code': reg.regulation_code,
      'Year': reg.regulation_year,
      'Status': reg.status ? 'Active' : 'Inactive',
      'Min Internal': reg.minimum_internal,
      'Min External': reg.minimum_external,
      'Min Attendance': reg.minimum_attendance,
      'Min Total': reg.minimum_total,
      'Max Internal': reg.maximum_internal,
      'Max External': reg.maximum_external,
      'Max Total': reg.maximum_total,
      'Max QP Marks': reg.maximum_qp_marks,
      'Condonation Start': reg.condonation_range_start,
      'Condonation End': reg.condonation_range_end
    }))

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()

    // Define column widths
    const colWidths = [
      { wch: 5 },   // S.No
      { wch: 15 },  // Regulation Code
      { wch: 8 },   // Year
      { wch: 10 },  // Status
      { wch: 12 },  // Min Internal
      { wch: 12 },  // Min External
      { wch: 15 },  // Min Attendance
      { wch: 10 },  // Min Total
      { wch: 12 },  // Max Internal
      { wch: 12 },  // Max External
      { wch: 10 },  // Max Total
      { wch: 12 },  // Max QP Marks
      { wch: 15 },  // Condonation Start
      { wch: 15 }   // Condonation End
    ]
    ws['!cols'] = colWidths

    // Apply header styling
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')

    // Style headers (first row)
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!ws[cellAddress]) continue

      ws[cellAddress].s = {
        font: {
          bold: true,
          name: 'Times New Roman',
          sz: 11
        },
        fill: {
          fgColor: { rgb: '16a34a' },
          bgColor: { rgb: '16a34a' },
          patternType: 'solid'
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    }

    // Apply data cell styling (Times New Roman font)
    for (let row = 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        if (!ws[cellAddress]) continue

        if (!ws[cellAddress].s) ws[cellAddress].s = {}
        ws[cellAddress].s.font = {
          name: 'Times New Roman',
          sz: 11
        }
        ws[cellAddress].s.border = {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Regulations')

    // Write the file
    XLSX.writeFile(wb, `regulations_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Import function - handles file upload (JSON, CSV, Excel)
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        let dataToImport: Partial<Regulation>[] = []

        if (file.name.endsWith('.json')) {
          const reader = new FileReader()
          reader.onload = async (event) => {
            const content = event.target?.result as string
            dataToImport = JSON.parse(content)
            await processImport(dataToImport)
          }
          reader.readAsText(file)
        } else if (file.name.endsWith('.csv')) {
          const reader = new FileReader()
          reader.onload = async (event) => {
            const content = event.target?.result as string
            // Parse CSV
            const lines = content.split('\n')
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())

            const hasSNo = headers[0] === 'S.No'
            const startIndex = hasSNo ? 1 : 0

            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue
              const values = lines[i].match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/"/g, '').trim()) || []

              const regulation: Partial<Regulation> = {
                regulation_code: values[startIndex] || '',
                regulation_year: parseInt(values[startIndex + 1]) || new Date().getFullYear(),
                status: values[startIndex + 2] === 'Active',
                minimum_internal: parseFloat(values[startIndex + 3]) || 0,
                minimum_external: parseFloat(values[startIndex + 4]) || 0,
                minimum_attendance: parseFloat(values[startIndex + 5]) || 0,
                minimum_total: parseFloat(values[startIndex + 6]) || 0,
                maximum_internal: parseFloat(values[startIndex + 7]) || 0,
                maximum_external: parseFloat(values[startIndex + 8]) || 0,
                maximum_total: parseFloat(values[startIndex + 9]) || 0,
                maximum_qp_marks: parseFloat(values[startIndex + 10]) || 0,
                condonation_range_start: parseFloat(values[startIndex + 11]) || 0,
                condonation_range_end: parseFloat(values[startIndex + 12]) || 0
              }
              dataToImport.push(regulation)
            }
            await processImport(dataToImport)
          }
          reader.readAsText(file)
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const reader = new FileReader()
          reader.onload = async (event) => {
            const data = new Uint8Array(event.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(worksheet)

            dataToImport = (jsonData as Record<string, unknown>[]).map((row) => ({
              regulation_code: String(row['Regulation Code'] || ''),
              regulation_year: Number(row['Year']) || new Date().getFullYear(),
              status: row['Status'] === 'Active',
              minimum_internal: Number(row['Min Internal']) || 0,
              minimum_external: Number(row['Min External']) || 0,
              minimum_attendance: Number(row['Min Attendance']) || 0,
              minimum_total: Number(row['Min Total']) || 0,
              maximum_internal: Number(row['Max Internal']) || 0,
              maximum_external: Number(row['Max External']) || 0,
              maximum_total: Number(row['Max Total']) || 0,
              maximum_qp_marks: Number(row['Max QP Marks']) || 0,
              condonation_range_start: Number(row['Condonation Start']) || 0,
              condonation_range_end: Number(row['Condonation End']) || 0
            }))
            await processImport(dataToImport)
          }
          reader.readAsArrayBuffer(file)
        }
      } catch (error) {
        alert('Error reading file. Please check the file format.')
        console.error('File read error:', error)
      }
    }

    // Helper function to process import
    async function processImport(dataToImport: Partial<Regulation>[]) {
      try {
        // Send data to API
        let successCount = 0
        let failCount = 0

        for (const regulation of dataToImport) {
          try {
            const response = await fetch('/api/regulations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(regulation)
            })

            if (response.ok) {
              successCount++
            } else {
              failCount++
            }
          } catch (error) {
            failCount++
          }
        }

        // Refresh the regulations list
        const response = await fetch('/api/regulations')
        if (response.ok) {
          const data = await response.json()
          setRegulations(data)
        }

        alert(`Import completed!\nSuccessful: ${successCount}\nFailed: ${failCount}`)

      } catch (error) {
        alert('Error importing file. Please check the file format.')
        console.error('Import error:', error)
      }
    }

    input.click()
  }

  // Get unique years for year filter
  const uniqueYears = [...new Set(regulations.map(r => r.regulation_year))].sort((a, b) => b - a)

  // Calculate pagination
  const totalPages = Math.ceil(filteredRegulations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRegulations = filteredRegulations.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, yearFilter, sortColumn, sortDirection])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader />

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 flex-shrink-0 px-0 py-0">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/" className="hover:text-primary">Dashboard</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Regulations</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Header Section */}
            <div className="flex items-center justify-between flex-shrink-0">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Regulations</h1>
                <p className="text-xs text-muted-foreground">
                  Manage examination regulations and their details
                </p>
              </div>
            </div>

            {/* Scorecard Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
              {/* Total Regulations */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Regulations</p>
                      <p className="text-xl font-bold">{regulations.length}</p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Regulations */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Active Regulations</p>
                      <p className="text-xl font-bold text-green-600">
                        {regulations.filter(r => r.status).length}
                      </p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <LibraryBig className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inactive Regulations */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Inactive Regulations</p>
                      <p className="text-xl font-bold text-red-600">
                        {regulations.filter(r => !r.status).length}
                      </p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                      <Clock className="h-3 w-3 text-red-600 dark:text-red-400" />
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
                        {regulations.filter(r => {
                          const d = new Date(r.created_at)
                          const now = new Date()
                          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
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
                      <LibraryBig className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">Regulations</h2>
                      <p className="text-[11px] text-muted-foreground">Browse, filter and manage regulation records</p>
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

                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {uniqueYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Search Bar */}
                    <div className="relative w-full sm:w-[220px]">
                      <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search regulations…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 flex-wrap">
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
                      onClick={handleDownload}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Json
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 h-8"
                      onClick={handleExport}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 h-8"
                      onClick={handleImport}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs px-2 h-8"
                      onClick={() => window.location.href = '/regulations/add'}
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
                          <TableHead className="w-[150px] text-[11px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort('regulation_code')}
                              className="h-auto p-0 font-medium hover:bg-transparent"
                            >
                              Regulation Code
                              <span className="ml-1">
                                {getSortIcon('regulation_code')}
                              </span>
                            </Button>
                          </TableHead>
                          <TableHead className="w-[100px] text-[11px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort('regulation_year')}
                              className="h-auto p-0 font-medium hover:bg-transparent"
                            >
                              Year
                              <span className="ml-1">
                                {getSortIcon('regulation_year')}
                              </span>
                            </Button>
                          </TableHead>
                          <TableHead className="w-[100px] text-[11px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort('status')}
                              className="h-auto p-0 font-medium hover:bg-transparent"
                            >
                              Status
                              <span className="ml-1">
                                {getSortIcon('status')}
                              </span>
                            </Button>
                          </TableHead>
                          <TableHead className="w-[120px] text-[11px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort('created_at')}
                              className="h-auto p-0 font-medium hover:bg-transparent"
                            >
                              Created
                              <span className="ml-1">
                                {getSortIcon('created_at')}
                              </span>
                            </Button>
                          </TableHead>
                          <TableHead className="w-[120px] text-[11px] text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-[11px]">
                              Loading regulations...
                            </TableCell>
                          </TableRow>
                        ) : paginatedRegulations.length > 0 ? (
                          <>
                            {paginatedRegulations.map((regulation) => (
                              <TableRow key={regulation.id}>
                                <TableCell className="font-medium text-[11px]">
                                  {regulation.regulation_code}
                                </TableCell>
                                <TableCell className="text-[11px]">
                                  {regulation.regulation_year}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusBadgeVariant(regulation)} className="text-[11px]">
                                    {getStatusText(regulation)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-[11px] text-muted-foreground">
                                  {formatDate(regulation.created_at)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.location.href = `/regulations/edit/${regulation.id}`}
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
                                          <AlertDialogTitle>Delete Regulation</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this regulation? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteRegulation(regulation.id)}
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
                            {Array.from({ length: Math.max(0, itemsPerPage - paginatedRegulations.length) }).map((_, index) => (
                              <TableRow key={`empty-${index}`}>
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
                              <TableCell colSpan={5} className="text-center text-xs">
                                No regulations found.
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
                    Showing {filteredRegulations.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredRegulations.length)} of {filteredRegulations.length} regulations
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
                      Page {currentPage} of {totalPages || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
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
  )
}
