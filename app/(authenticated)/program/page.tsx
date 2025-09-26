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
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, BookOpen, TrendingUp, FileSpreadsheet, RefreshCw } from "lucide-react"

type Program = {
  id: string
  institution_code: string
  degree_code: string
  offering_department_code?: string
  program_code: string
  program_name: string
  display_name?: string
  program_duration_yrs: number
  pattern_type: "Year" | "Semester"
  is_active: boolean
  created_at: string
}

// No mock data; will fetch from API
const MOCK_PROGRAMS: Program[] = []

export default function ProgramPage() {
  const [items, setItems] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")

  // Dropdown data sources
  const [institutionCodes, setInstitutionCodes] = useState<string[]>([])
  const [degreeCodes, setDegreeCodes] = useState<string[]>([])
  const [departmentCodes, setDepartmentCodes] = useState<string[]>([])

  const [formData, setFormData] = useState({
    institution_code: "",
    degree_code: "",
    offering_department_code: "",
    program_code: "",
    program_name: "",
    display_name: "",
    program_duration_yrs: 3,
    pattern_type: "Semester" as "Year" | "Semester",
    is_active: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch data from API
  const fetchPrograms = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/program')
      if (!response.ok) throw new Error('Failed to fetch programs')
      const data = await response.json()
      setItems(data)
    } catch (e) {
      console.error('Error fetching programs:', e)
      setItems(MOCK_PROGRAMS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrograms()
    // Load dropdown data in parallel
    ;(async () => {
      try {
        const [instRes, degRes, depRes] = await Promise.all([
          fetch('/api/institutions'),
          fetch('/api/degrees'),
          fetch('/api/departments'),
        ])
        if (instRes.ok) {
          const data = await instRes.json()
          const codes = Array.isArray(data)
            ? Array.from(new Set(
                data
                  .map((i: any) => i?.institution_code)
                  .filter((v: any) => typeof v === 'string' && v.trim())
              ))
            : []
          setInstitutionCodes(codes)
        }
        if (degRes.ok) {
          const data = await degRes.json()
          const codes = Array.isArray(data)
            ? Array.from(new Set(
                data
                  .map((d: any) => d?.degree_code)
                  .filter((v: any) => typeof v === 'string' && v.trim())
              ))
            : []
          setDegreeCodes(codes)
        }
        if (depRes.ok) {
          const data = await depRes.json()
          const codes = Array.isArray(data)
            ? Array.from(new Set(
                data
                  .map((d: any) => d?.department_code)
                  .filter((v: any) => typeof v === 'string' && v.trim())
              ))
            : []
          setDepartmentCodes(codes)
        }
      } catch (e) {
        console.error('Failed to load dropdown data:', e)
      }
    })()
  }, [])

  const resetForm = () => {
    setFormData({
      institution_code: "",
      degree_code: "",
      offering_department_code: "",
      program_code: "",
      program_name: "",
      display_name: "",
      program_duration_yrs: 3,
      pattern_type: "Semester",
      is_active: true,
    })
    setErrors({})
    setEditing(null)
  }

  const handleSort = (c: string) => {
    if (sortColumn === c) setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    else { setSortColumn(c); setSortDirection("asc") }
  }
  const getSortIcon = (c: string) => sortColumn !== c ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    const data = items
      .filter((i) => [i.institution_code, i.degree_code, i.offering_department_code, i.program_code, i.program_name, i.display_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      .filter((i) => statusFilter === "all" || (statusFilter === "active" ? i.is_active : !i.is_active))
      // year filter removed
    if (!sortColumn) return data
    return [...data].sort((a, b) => {
      const av = (a as any)[sortColumn]
      const bv = (b as any)[sortColumn]
      if (av === bv) return 0
      return sortDirection === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }, [items, searchTerm, sortColumn, sortDirection, statusFilter])

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const pageItems = filtered.slice(startIndex, endIndex)
  useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection, statusFilter])

  const openAdd = () => { resetForm(); setSheetOpen(true) }
  const openEdit = (row: Program) => {
    setEditing(row)
    setFormData({
      institution_code: row.institution_code,
      degree_code: row.degree_code,
      offering_department_code: row.offering_department_code || "",
      program_code: row.program_code,
      program_name: row.program_name,
      display_name: row.display_name || "",
      program_duration_yrs: row.program_duration_yrs,
      pattern_type: row.pattern_type,
      is_active: row.is_active,
    })
    setSheetOpen(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.institution_code.trim()) e.institution_code = "Required"
    if (!formData.degree_code.trim()) e.degree_code = "Required"
    if (!formData.program_code.trim()) e.program_code = "Required"
    if (!formData.program_name.trim()) e.program_name = "Required"
    if (formData.program_duration_yrs < 1) e.program_duration_yrs = "Must be at least 1 year"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    try {
      setLoading(true)
      if (editing) {
        const response = await fetch('/api/program', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...formData }),
        })
        if (!response.ok) throw new Error('Failed to update program')
        const updated = await response.json()
        setItems((prev) => prev.map((x) => (x.id === editing.id ? updated : x)))
      } else {
        const response = await fetch('/api/program', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!response.ok) throw new Error('Failed to create program')
        const created = await response.json()
        setItems((prev) => [created, ...prev])
      }
      setSheetOpen(false)
      resetForm()
    } catch (e) {
      console.error('Save program failed:', e)
      alert('Failed to save program. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/program?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete program')
      setItems((p) => p.filter((x) => x.id !== id))
    } catch (e) {
      console.error('Delete program failed:', e)
      alert('Failed to delete program. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })

  const handleDownload = () => {
    const json = JSON.stringify(filtered, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `program_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    const excelData = filtered.map(r => ({
      'Institution Code': r.institution_code,
      'Degree Code': r.degree_code,
      'Offering Dept': r.offering_department_code || '',
      'Program Code': r.program_code,
      'Program Name': r.program_name,
      'Display Name': r.display_name || '',
      'Duration (Years)': r.program_duration_yrs,
      'Pattern': r.pattern_type,
      'Status': r.is_active ? 'Active' : 'Inactive',
      'Created': new Date(r.created_at).toISOString().split('T')[0]
    }))
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Program')
    XLSX.writeFile(wb, `program_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleTemplateExport = () => {
    const sample = [{
      'Institution Code': 'JKKN',
      'Degree Code': 'BSC',
      'Offering Dept': 'SCI',
      'Program Code': 'BSC-CS',
      'Program Name': 'B.Sc Computer Science',
      'Display Name': 'BSc CS',
      'Duration (Years)': 3,
      'Pattern': 'Semester',
      'Status': 'Active'
    }]
    const ws = XLSX.utils.json_to_sheet(sample)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, `program_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        setLoading(true)
        let rows: Partial<Program>[] = []
        if (file.name.endsWith('.json')) {
          rows = JSON.parse(await file.text())
        } else {
          const data = new Uint8Array(await file.arrayBuffer())
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
          rows = json.map(j => ({
            institution_code: String(j['Institution Code'] || ''),
            degree_code: String(j['Degree Code'] || ''),
            offering_department_code: String(j['Offering Dept'] || ''),
            program_code: String(j['Program Code'] || ''),
            program_name: String(j['Program Name'] || ''),
            display_name: String(j['Display Name'] || ''),
            program_duration_yrs: Number(j['Duration (Years)'] || 3),
            pattern_type: String(j['Pattern'] || 'Semester') as "Year" | "Semester",
            is_active: String(j['Status'] || '').toLowerCase() === 'active'
          }))
        }
        const validRows = rows.filter(r => r.institution_code && r.degree_code && r.program_code && r.program_name)
        if (validRows.length === 0) {
          alert('No valid rows found. Ensure required fields are present.')
          setLoading(false)
          return
        }

        let successCount = 0
        let errorCount = 0

        for (const r of validRows) {
          try {
            const payload = {
              institution_code: r.institution_code!,
              degree_code: r.degree_code!,
              offering_department_code: r.offering_department_code || null,
              program_code: r.program_code!,
              program_name: String(r.program_name || ''),
              display_name: r.display_name || '',
              program_duration_yrs: Number(r.program_duration_yrs || 3),
              pattern_type: (r.pattern_type === 'Year' ? 'Year' : 'Semester') as 'Year' | 'Semester',
              is_active: r.is_active ?? true,
            }
            const res = await fetch('/api/program', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            if (!res.ok) throw new Error('insert failed')
            const created = await res.json()
            setItems(prev => [created, ...prev])
            successCount++
          } catch (e) {
            console.error('Failed to import row:', r, e)
            errorCount++
          }
        }

        if (successCount > 0) {
          // optional refresh to ensure latest server order
          fetchPrograms()
        }
        alert(`Import completed. Success: ${successCount}, Failed: ${errorCount}`)
      } catch (e) {
        console.error('Import error:', e)
        alert('Import failed. Please check your file.')
      } finally {
        setLoading(false)
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
                  <BreadcrumbPage>Program</BreadcrumbPage>
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
                    <p className="text-xs font-medium text-muted-foreground">Total Programs</p>
                    <p className="text-xl font-bold">{items.length}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <BookOpen className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Active Programs</p>
                    <p className="text-xl font-bold text-green-600">{items.filter(i=>i.is_active).length}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <BookOpen className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Inactive Programs</p>
                    <p className="text-xl font-bold text-red-600">{items.filter(i=>!i.is_active).length}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <BookOpen className="h-3 w-3 text-red-600 dark:text-red-400" />
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
                    <BookOpen className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Program</h2>
                    <p className="text-[11px] text-muted-foreground">Manage programs</p>
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

                  {/* Year dropdown removed */}

                  <div className="relative w-full sm:w-[220px]">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-xs" />
                  </div>
                </div>

                <div className="flex gap-1 flex-wrap">
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={fetchPrograms} disabled={loading}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Refreshing…' : 'Refresh'}
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleTemplateExport}>
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                    Template
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleDownload}>Json</Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleExport}>Download</Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleImport}>Upload</Button>
                  <Button size="sm" className="text-xs px-2 h-8" onClick={openAdd}><PlusCircle className="h-3 w-3 mr-1" /> Add</Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">
              <div className="rounded-md border overflow-hidden" style={{ height: "440px" }}>
                <div className="h-full overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead className="w-[110px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("institution_code")} className="h-auto p-0 font-medium hover:bg-transparent">Inst. Code <span className="ml-1">{getSortIcon("institution_code")}</span></Button></TableHead>
                        <TableHead className="w-[110px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("degree_code")} className="h-auto p-0 font-medium hover:bg-transparent">Degree <span className="ml-1">{getSortIcon("degree_code")}</span></Button></TableHead>
                        <TableHead className="w-[140px] text-[11px]">Off. Dept</TableHead>
                        <TableHead className="w-[120px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("program_code")} className="h-auto p-0 font-medium hover:bg-transparent">Program Code <span className="ml-1">{getSortIcon("program_code")}</span></Button></TableHead>
                        <TableHead className="text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("program_name")} className="h-auto p-0 font-medium hover:bg-transparent">Program Name <span className="ml-1">{getSortIcon("program_name")}</span></Button></TableHead>
                        <TableHead className="w-[80px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("program_duration_yrs")} className="h-auto p-0 font-medium hover:bg-transparent">Years <span className="ml-1">{getSortIcon("program_duration_yrs")}</span></Button></TableHead>
                        <TableHead className="w-[110px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("pattern_type")} className="h-auto p-0 font-medium hover:bg-transparent">Pattern <span className="ml-1">{getSortIcon("pattern_type")}</span></Button></TableHead>
                        <TableHead className="w-[100px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("is_active")} className="h-auto p-0 font-medium hover:bg-transparent">Status <span className="ml-1">{getSortIcon("is_active")}</span></Button></TableHead>
                        <TableHead className="w-[120px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("created_at")} className="h-auto p-0 font-medium hover:bg-transparent">Created <span className="ml-1">{getSortIcon("created_at")}</span></Button></TableHead>
                        <TableHead className="w-[120px] text-[11px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={10} className="h-24 text-center text-[11px]">Loading…</TableCell></TableRow>
                      ) : pageItems.length ? (
                        <>
                          {pageItems.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="text-[11px] font-medium">{row.institution_code}</TableCell>
                              <TableCell className="text-[11px]">{row.degree_code}</TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{row.offering_department_code}</TableCell>
                              <TableCell className="text-[11px]">{row.program_code}</TableCell>
                              <TableCell className="text-[11px]">{row.program_name}</TableCell>
                              <TableCell className="text-[11px]">{row.program_duration_yrs}</TableCell>
                              <TableCell className="text-[11px]">{row.pattern_type}</TableCell>
                              <TableCell><Badge variant={row.is_active ? "default" : "secondary"} className="text-[11px]">{row.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(row)}><Edit className="h-3 w-3" /></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Program</AlertDialogTitle>
                                        <AlertDialogDescription>Are you sure you want to delete {row.program_name}?</AlertDialogDescription>
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
                        <TableRow><TableCell colSpan={10} className="h-24 text-center text-[11px]">No data</TableCell></TableRow>
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
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {editing ? "Edit Program" : "Add Program"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editing ? "Update program information" : "Create a new program record"}
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-blue-200 dark:border-blue-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Basic Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="institution_code" className="text-sm font-semibold">Institution Code <span className="text-red-500">*</span></Label>
                  <Select value={formData.institution_code} onValueChange={(v) => setFormData({ ...formData, institution_code: v })}>
                    <SelectTrigger id="institution_code" className={`h-10 ${errors.institution_code ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select Institution Code" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutionCodes.map(code => (
                        <SelectItem key={code} value={code}>{code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.institution_code && <p className="text-xs text-destructive mt-1">{errors.institution_code}</p>}
                </div>
                <div>
                  <Label htmlFor="degree_code" className="text-sm font-semibold">Degree Code <span className="text-red-500">*</span></Label>
                  <Select value={formData.degree_code} onValueChange={(v) => setFormData({ ...formData, degree_code: v })}>
                    <SelectTrigger id="degree_code" className={`h-10 ${errors.degree_code ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select Degree Code" />
                    </SelectTrigger>
                    <SelectContent>
                      {degreeCodes.map(code => (
                        <SelectItem key={code} value={code}>{code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.degree_code && <p className="text-xs text-destructive mt-1">{errors.degree_code}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="offering_department_code" className="text-sm font-semibold">Offering Department Code</Label>
                <Select value={formData.offering_department_code} onValueChange={(v) => setFormData({ ...formData, offering_department_code: v })}>
                  <SelectTrigger id="offering_department_code" className="h-10">
                    <SelectValue placeholder="Select Department Code" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentCodes.map(code => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="program_code" className="text-sm font-semibold">Program Code <span className="text-red-500">*</span></Label>
                  <Input id="program_code" value={formData.program_code} onChange={(e) => setFormData({ ...formData, program_code: e.target.value })} className={`h-10 ${errors.program_code ? 'border-destructive' : ''}`} placeholder="e.g., BSC-CS" />
                  {errors.program_code && <p className="text-xs text-destructive mt-1">{errors.program_code}</p>}
                </div>
                <div>
                  <Label htmlFor="program_duration_yrs" className="text-sm font-semibold">Duration (Years) <span className="text-red-500">*</span></Label>
                  <Input id="program_duration_yrs" type="number" min="1" value={formData.program_duration_yrs} onChange={(e) => setFormData({ ...formData, program_duration_yrs: parseInt(e.target.value) || 3 })} className={`h-10 ${errors.program_duration_yrs ? 'border-destructive' : ''}`} />
                  {errors.program_duration_yrs && <p className="text-xs text-destructive mt-1">{errors.program_duration_yrs}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="program_name" className="text-sm font-semibold">Program Name <span className="text-red-500">*</span></Label>
                <Input id="program_name" value={formData.program_name} onChange={(e) => setFormData({ ...formData, program_name: e.target.value })} className={`h-10 ${errors.program_name ? 'border-destructive' : ''}`} placeholder="e.g., B.Sc Computer Science" />
                {errors.program_name && <p className="text-xs text-destructive mt-1">{errors.program_name}</p>}
              </div>

              <div>
                <Label htmlFor="display_name" className="text-sm font-medium">Display Name</Label>
                <Input id="display_name" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} className="h-10" placeholder="e.g., BSc CS" />
              </div>
            </div>

            {/* Pattern & Status */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-teal-200 dark:border-teal-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-teal-500 to-green-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">Pattern & Status</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Pattern Type</Label>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant={formData.pattern_type === "Year" ? "default" : "outline"} size="sm" className="h-8 px-3 text-xs" onClick={() => setFormData({ ...formData, pattern_type: "Year" })}>Year</Button>
                    <Button type="button" variant={formData.pattern_type === "Semester" ? "default" : "outline"} size="sm" className="h-8 px-3 text-xs" onClick={() => setFormData({ ...formData, pattern_type: "Semester" })}>Semester</Button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Label className="text-sm font-semibold">Status</Label>
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
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" size="sm" className="h-10 px-6" onClick={() => { setSheetOpen(false); resetForm() }}>Cancel</Button>
              <Button size="sm" className="h-10 px-6" onClick={save}>{editing ? "Update Program" : "Create Program"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  )
}