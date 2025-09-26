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
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Building2, TrendingUp, FileSpreadsheet, RefreshCw } from "lucide-react"

type Department = {
  id: string
  institution_code: string
  department_code: string
  department_name: string
  display_name?: string
  stream?: string
  is_active: boolean
  created_at: string
}

const MOCK_DEPARTMENTS: Department[] = [
  { id: "1", institution_code: "JKKN", department_code: "CSE", department_name: "Computer Science and Engineering", display_name: "CSE", stream: "Engineering", is_active: true, created_at: new Date().toISOString() },
]

export default function DepartmentPage() {
  const [items, setItems] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  // Removed year filter

  const [formData, setFormData] = useState({ institution_code: "", department_code: "", department_name: "", display_name: "", description: "", stream: "", is_active: true })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Institutions for dropdown
  const [institutions, setInstitutions] = useState<Array<{ id: string; institution_code: string; name?: string }>>([])

  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/departments')
      if (!res.ok) throw new Error('Failed to fetch departments')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Error fetching departments:', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch institutions for dropdown
  useEffect(() => {
    fetchDepartments()
    ;(async () => {
      try {
        const res = await fetch('/api/institutions')
        if (res.ok) {
          const data = await res.json()
          const mapped = Array.isArray(data)
            ? data.filter((i: any) => i?.institution_code).map((i: any) => ({ id: i.id, institution_code: i.institution_code, name: i.name }))
            : []
          setInstitutions(mapped)
        }
      } catch {}
    })()
  }, [])

  const resetForm = () => { setFormData({ institution_code: "", department_code: "", department_name: "", display_name: "", description: "", stream: "", is_active: true }); setErrors({}); setEditing(null) }

  const handleSort = (c: string) => { if (sortColumn === c) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortColumn(c); setSortDirection("asc") } }
  const getSortIcon = (c: string) => sortColumn !== c ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    const data = items
      .filter((i) => [i.institution_code, i.department_code, i.department_name, i.display_name, i.stream].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      .filter((i) => statusFilter === "all" || (statusFilter === "active" ? i.is_active : !i.is_active))
    // no year filter
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
  const openEdit = (row: Department) => { setEditing(row); setFormData({ institution_code: row.institution_code, department_code: row.department_code, department_name: row.department_name, display_name: row.display_name || "", description: (row as any).description || "", stream: row.stream || "", is_active: row.is_active }); setSheetOpen(true) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.institution_code.trim()) e.institution_code = "Required"
    if (!formData.department_code.trim()) e.department_code = "Required"
    if (!formData.department_name.trim()) e.department_name = "Required"
    // Stream, if provided, must be one of allowed values
    const allowed = ['Arts','Science','Management','Commerce','Engineering','Medical','Law']
    if (formData.stream && !allowed.includes(formData.stream)) e.stream = "Invalid stream"
    setErrors(e); return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    try {
      setLoading(true)
      if (editing) {
        const response = await fetch('/api/departments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: (editing as any).id, ...formData })
        })
        if (!response.ok) throw new Error('Failed to update department')
        const updated = await response.json()
        setItems(p => p.map(x => x.id === (editing as any).id ? updated : x))
      } else {
        const response = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        if (!response.ok) throw new Error('Failed to create department')
        const created = await response.json()
        setItems(p => [created, ...p])
      }
      setSheetOpen(false)
      resetForm()
    } catch (e) {
      console.error('Save department error:', e)
      alert('Failed to save department')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/departments?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setItems(p => p.filter(x => x.id !== id))
    } catch (e) {
      console.error('Delete department error:', e)
      alert('Failed to delete department')
    } finally {
      setLoading(false)
    }
  }
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })

  const handleDownload = () => { const json = JSON.stringify(filtered, null, 2); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `department_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) }
  const handleExport = () => {
    const excelData = filtered.map(r=>({
      'Institution Code': r.institution_code,
      'Department Code': r.department_code,
      'Department Name': r.department_name,
      'Display Name': r.display_name || '',
      'Description': (r as any).description || '',
      'Stream': r.stream || '',
      'Status': r.is_active ? 'Active' : 'Inactive',
      'Created': new Date(r.created_at).toISOString().split('T')[0]
    }))
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Department')
    XLSX.writeFile(wb, `department_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }
  const handleTemplateExport = () => {
    const sample=[{'Institution Code':'JKKN','Department Code':'CSE','Department Name':'Computer Science and Engineering','Display Name':'CSE','Description':'Optional description','Stream':'Engineering','Status':'Active'}]
    const ws=XLSX.utils.json_to_sheet(sample)
    const wb=XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,'Template')
    XLSX.writeFile(wb,`department_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }
  const handleImport = () => {
    const input=document.createElement('input'); input.type='file'; input.accept='.json,.csv,.xlsx,.xls';
    input.onchange=async(e)=>{ const file=(e.target as HTMLInputElement).files?.[0]; if(!file) return; try{
      let rows: Partial<Department & { description?: string }>[]=[];
      if(file.name.endsWith('.json')) rows=JSON.parse(await file.text());
      else {
        const data=new Uint8Array(await file.arrayBuffer()); const wb=XLSX.read(data,{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]]; const json=XLSX.utils.sheet_to_json(ws) as Record<string,unknown>[];
        rows=json.map(j=>({
          institution_code:String(j['Institution Code']||''),
          department_code:String(j['Department Code']||''),
          department_name:String(j['Department Name']||''),
          display_name:String(j['Display Name']||''),
          description:String(j['Description']||''),
          stream:String(j['Stream']||''),
          is_active:String(j['Status']||'').toLowerCase()==='active'
        }))
      }
      const allowed=['Arts','Science','Management','Commerce','Engineering','Medical','Law']
      const validRows=rows.filter(r=>r.institution_code&&r.department_code&&r.department_name).map(r=>({
        institution_code:r.institution_code!,
        department_code:r.department_code!,
        department_name:r.department_name as string,
        display_name:(r as any).display_name||'',
        description:(r as any).description||'',
        stream:(r as any).stream&&allowed.includes((r as any).stream!)?(r as any).stream:'',
        is_active:(r as any).is_active ?? true,
      }))

      if (validRows.length === 0) { alert('No valid rows to import.'); return }

      setLoading(true)
      let success=0, failed=0
      for (const row of validRows) {
        try {
          const res = await fetch('/api/departments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(row) })
          if (res.ok) {
            const saved = await res.json()
            setItems(p => [saved, ...p])
            success++
          } else {
            failed++
          }
        } catch {
          failed++
        }
      }
      setLoading(false)
      alert(`Import completed. Successful: ${success}, Failed: ${failed}`)
    } catch { alert('Import failed. Please check your file.') } };
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
                  <BreadcrumbPage>Department</BreadcrumbPage>
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
                    <p className="text-xs font-medium text-muted-foreground">Total Departments</p>
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
                    <p className="text-xs font-medium text-muted-foreground">Active Departments</p>
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
                    <p className="text-xs font-medium text-muted-foreground">Inactive Departments</p>
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
                    <h2 className="text-sm font-semibold">Department</h2>
                    <p className="text-[11px] text-muted-foreground">Manage departments</p>
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

                  {/* Year filter removed */}

                  <div className="relative w-full sm:w-[220px]">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-xs" />
                  </div>
                </div>

                <div className="flex gap-1 flex-wrap">
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={fetchDepartments} disabled={loading}>
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
                        <TableHead className="w-[120px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("institution_code")} className="h-auto p-0 font-medium hover:bg-transparent">Inst. Code <span className="ml-1">{getSortIcon("institution_code")}</span></Button></TableHead>
                        <TableHead className="w-[120px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("department_code")} className="h-auto p-0 font-medium hover:bg-transparent">Dept. Code <span className="ml-1">{getSortIcon("department_code")}</span></Button></TableHead>
                        <TableHead className="text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("department_name")} className="h-auto p-0 font-medium hover:bg-transparent">Department Name <span className="ml-1">{getSortIcon("department_name")}</span></Button></TableHead>
                        <TableHead className="w-[160px] text-[11px]">Display</TableHead>
                        <TableHead className="w-[120px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("stream")} className="h-auto p-0 font-medium hover:bg-transparent">Stream <span className="ml-1">{getSortIcon("stream")}</span></Button></TableHead>
                        <TableHead className="w-[100px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("is_active")} className="h-auto p-0 font-medium hover:bg-transparent">Status <span className="ml-1">{getSortIcon("is_active")}</span></Button></TableHead>
                        <TableHead className="w-[120px] text-[11px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={7} className="h-24 text-center text-[11px]">Loading…</TableCell></TableRow>
                      ) : pageItems.length ? (
                        <>
                          {pageItems.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="text-[11px] font-medium">{row.institution_code}</TableCell>
                              <TableCell className="text-[11px]">{row.department_code}</TableCell>
                              <TableCell className="text-[11px]">{row.department_name}</TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{row.display_name}</TableCell>
                              <TableCell className="text-[11px]">{row.stream}</TableCell>
                              <TableCell><Badge variant={row.is_active ? "default" : "secondary"} className="text-[11px]">{row.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(row)}><Edit className="h-3 w-3" /></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Department</AlertDialogTitle>
                                        <AlertDialogDescription>Are you sure you want to delete {row.department_name}?</AlertDialogDescription>
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
                        <TableRow><TableCell colSpan={7} className="h-24 text-center text-[11px]">No data</TableCell></TableRow>
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
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {editing ? "Edit Department" : "Add Department"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editing ? "Update department information" : "Create a new department"}
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="institution_code" className="text-xs">Institution Code *</Label>
                <Select value={formData.institution_code} onValueChange={(code)=> setFormData({ ...formData, institution_code: code })}>
                  <SelectTrigger className={`h-8 text-xs ${errors.institution_code ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder="Select Institution Code" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map(inst => (
                      <SelectItem key={inst.id} value={inst.institution_code}>{inst.institution_code}{inst.name?` - ${inst.name}`:''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.institution_code && <p className="text-[10px] text-destructive mt-1">{errors.institution_code}</p>}
              </div>
              <div>
                <Label htmlFor="department_code" className="text-xs">Department Code *</Label>
                <Input id="department_code" value={formData.department_code} onChange={(e) => setFormData({ ...formData, department_code: e.target.value })} className={`h-8 text-xs ${errors.department_code ? 'border-destructive' : ''}`} />
                {errors.department_code && <p className="text-[10px] text-destructive mt-1">{errors.department_code}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="department_name" className="text-xs">Department Name *</Label>
              <Input id="department_name" value={formData.department_name} onChange={(e) => setFormData({ ...formData, department_name: e.target.value })} className={`h-8 text-xs ${errors.department_name ? 'border-destructive' : ''}`} />
              {errors.department_name && <p className="text-[10px] text-destructive mt-1">{errors.department_name}</p>}
            </div>
            <div>
              <Label htmlFor="display_name" className="text-xs">Display Name</Label>
              <Input id="display_name" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Input id="description" value={(formData as any).description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label htmlFor="stream" className="text-xs">Stream</Label>
              <Select value={formData.stream} onValueChange={(v)=> setFormData({ ...formData, stream: v })}>
                <SelectTrigger className={`h-8 text-xs ${errors.stream ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="Select Stream" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arts">Arts</SelectItem>
                  <SelectItem value="Science">Science</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                  <SelectItem value="Commerce">Commerce</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Medical">Medical</SelectItem>
                  <SelectItem value="Law">Law</SelectItem>
                </SelectContent>
              </Select>
              {errors.stream && <p className="text-[10px] text-destructive mt-1">{errors.stream}</p>}
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-xs font-medium ${formData.is_active ? 'text-green-600' : 'text-red-500'}`}>
                  {formData.is_active ? 'Active' : 'Inactive'}
                </span>
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






