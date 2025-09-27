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
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, BookOpen, TrendingUp, FileSpreadsheet } from "lucide-react"

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

const MOCK_PROGRAMS: Program[] = [
  { id: "1", institution_code: "JKKN", degree_code: "BSC", offering_department_code: "SCI", program_code: "BSC-CS", program_name: "B.Sc Computer Science", display_name: "BSc CS", program_duration_yrs: 3, pattern_type: "Semester", is_active: true, created_at: new Date().toISOString() },
]

export default function ProgramPage() {
  const [items, setItems] = useState<Program[]>(MOCK_PROGRAMS)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")

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
      .filter((i) => yearFilter === "all" || new Date(i.created_at).getFullYear().toString() === yearFilter)
    if (!sortColumn) return data
    return [...data].sort((a, b) => {
      const av = (a as any)[sortColumn]
      const bv = (b as any)[sortColumn]
      if (av === bv) return 0
      return sortDirection === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }, [items, searchTerm, sortColumn, sortDirection, statusFilter, yearFilter])

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const pageItems = filtered.slice(startIndex, endIndex)
  useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection, statusFilter, yearFilter])
  const uniqueYears = useMemo(() => Array.from(new Set(items.map(i => new Date(i.created_at).getFullYear()))).sort((a,b)=>b-a), [items])

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

  const save = () => {
    if (!validate()) return
    if (editing) {
      setItems((p) => p.map((x) => x.id === editing.id ? { ...editing, ...formData } as Program : x))
    } else {
      setItems((p) => [{
        id: String(Date.now()),
        institution_code: formData.institution_code,
        degree_code: formData.degree_code,
        offering_department_code: formData.offering_department_code,
        program_code: formData.program_code,
        program_name: formData.program_name,
        display_name: formData.display_name,
        program_duration_yrs: formData.program_duration_yrs,
        pattern_type: formData.pattern_type,
        is_active: formData.is_active,
        created_at: new Date().toISOString()
      }, ...p])
    }
    setSheetOpen(false)
    resetForm()
  }

  const remove = (id: string) => setItems((p) => p.filter((x) => x.id !== id))
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
        const now = new Date().toISOString()
        const mapped = rows.filter(r => r.institution_code && r.degree_code && r.program_code && r.program_name).map(r => ({
          id: String(Date.now() + Math.random()),
          institution_code: r.institution_code!,
          degree_code: r.degree_code!,
          offering_department_code: r.offering_department_code,
          program_code: r.program_code!,
          program_name: r.program_name as string,
          display_name: r.display_name,
          program_duration_yrs: r.program_duration_yrs || 3,
          pattern_type: r.pattern_type || "Semester",
          is_active: r.is_active ?? true,
          created_at: now
        })) as Program[]
        setItems(p => [...mapped, ...p])
      } catch {
        alert('Import failed. Please check your file.')
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

                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {uniqueYears.map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative w-full sm:w-[220px]">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-xs" />
                  </div>
                </div>

                <div className="flex gap-1 flex-wrap">
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
        <SheetContent className="sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle className="text-base">{editing ? "Edit Program" : "Add Program"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="institution_code" className="text-xs">Institution Code *</Label>
                <Input id="institution_code" value={formData.institution_code} onChange={(e) => setFormData({ ...formData, institution_code: e.target.value })} className={`h-8 text-xs ${errors.institution_code ? 'border-destructive' : ''}`} />
                {errors.institution_code && <p className="text-[10px] text-destructive mt-1">{errors.institution_code}</p>}
              </div>
              <div>
                <Label htmlFor="degree_code" className="text-xs">Degree Code *</Label>
                <Input id="degree_code" value={formData.degree_code} onChange={(e) => setFormData({ ...formData, degree_code: e.target.value })} className={`h-8 text-xs ${errors.degree_code ? 'border-destructive' : ''}`} />
                {errors.degree_code && <p className="text-[10px] text-destructive mt-1">{errors.degree_code}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="offering_department_code" className="text-xs">Offering Department Code</Label>
              <Input id="offering_department_code" value={formData.offering_department_code} onChange={(e) => setFormData({ ...formData, offering_department_code: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="program_code" className="text-xs">Program Code *</Label>
                <Input id="program_code" value={formData.program_code} onChange={(e) => setFormData({ ...formData, program_code: e.target.value })} className={`h-8 text-xs ${errors.program_code ? 'border-destructive' : ''}`} />
                {errors.program_code && <p className="text-[10px] text-destructive mt-1">{errors.program_code}</p>}
              </div>
              <div>
                <Label htmlFor="program_duration_yrs" className="text-xs">Duration (Years) *</Label>
                <Input id="program_duration_yrs" type="number" min="1" value={formData.program_duration_yrs} onChange={(e) => setFormData({ ...formData, program_duration_yrs: parseInt(e.target.value) || 3 })} className={`h-8 text-xs ${errors.program_duration_yrs ? 'border-destructive' : ''}`} />
                {errors.program_duration_yrs && <p className="text-[10px] text-destructive mt-1">{errors.program_duration_yrs}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="program_name" className="text-xs">Program Name *</Label>
              <Input id="program_name" value={formData.program_name} onChange={(e) => setFormData({ ...formData, program_name: e.target.value })} className={`h-8 text-xs ${errors.program_name ? 'border-destructive' : ''}`} />
              {errors.program_name && <p className="text-[10px] text-destructive mt-1">{errors.program_name}</p>}
            </div>
            <div>
              <Label htmlFor="display_name" className="text-xs">Display Name</Label>
              <Input id="display_name" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Pattern Type</Label>
              <div className="flex gap-2">
                <Button type="button" variant={formData.pattern_type === "Year" ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs" onClick={() => setFormData({ ...formData, pattern_type: "Year" })}>Year</Button>
                <Button type="button" variant={formData.pattern_type === "Semester" ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs" onClick={() => setFormData({ ...formData, pattern_type: "Semester" })}>Semester</Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <div className="flex gap-2">
                <Button type="button" variant={formData.is_active ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs" onClick={() => setFormData({ ...formData, is_active: true })}>Active</Button>
                <Button type="button" variant={!formData.is_active ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs" onClick={() => setFormData({ ...formData, is_active: false })}>Inactive</Button>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setSheetOpen(false); resetForm() }}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs" onClick={save}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  )
}