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
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, BookOpen, TrendingUp, FileSpreadsheet, RefreshCw } from "lucide-react"


type Semester = {
  id: string
  institution_code: string
  degree_code: string
  semester_name: string
  display_name?: string
  student_group?: string
  display_order?: number
  initial_semester?: boolean
  terminal_semester?: boolean
  created_at: string
}

const MOCK_SEMESTERS: Semester[] = [
  { id: "1", institution_code: "JKKN", degree_code: "BSC", semester_name: "Semester 1", display_name: "Sem I", student_group: "UG", display_order: 1, initial_semester: true, terminal_semester: false, created_at: new Date().toISOString() },
]

export default function SemesterPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<Semester[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Semester | null>(null)
  const [yearFilter, setYearFilter] = useState("all")
  
  // Add state for institutions and degrees
  const [institutions, setInstitutions] = useState<Array<{id: string, institution_code: string, name: string}>>([])
  const [degrees, setDegrees] = useState<Array<{id: string, degree_code: string, degree_name: string}>>([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)

  const [formData, setFormData] = useState({
    institution_code: "",
    degree_code: "",
    semester_name: "",
    display_name: "",
    student_group: "",
    display_order: 1,
    initial_semester: false,
    terminal_semester: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch data from API
  const fetchSemesters = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/semesters')
      if (!response.ok) {
        throw new Error('Failed to fetch semesters')
      }
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Error fetching semesters:', error)
      toast({
        title: "❌ Fetch Failed",
        description: "Failed to load semesters. Please try again.",
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      })
      // Fallback to mock data on error
      setItems(MOCK_SEMESTERS)
    } finally {
      setLoading(false)
    }
  }

  // Fetch institutions for dropdown
  const fetchInstitutions = async () => {
    try {
      setLoadingDropdowns(true)
      const response = await fetch('/api/institutions')
      if (!response.ok) {
        throw new Error('Failed to fetch institutions')
      }
      const data = await response.json()
      
      // Remove duplicates and create unique entries
      const uniqueInstitutions = data.reduce((acc: any[], institution: any) => {
        const existingIndex = acc.findIndex(i => i.institution_code === institution.institution_code)
        if (existingIndex === -1) {
          acc.push({
            id: institution.id,
            institution_code: institution.institution_code,
            name: institution.name
          })
        }
        return acc
      }, [])
      
      setInstitutions(uniqueInstitutions)
    } catch (error) {
      console.error('Error fetching institutions:', error)
      toast({
        title: "❌ Fetch Failed",
        description: "Failed to load institutions. Please try again.",
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      })
    } finally {
      setLoadingDropdowns(false)
    }
  }

  // Fetch degrees for dropdown
  const fetchDegrees = async () => {
    try {
      setLoadingDropdowns(true)
      const response = await fetch('/api/degrees')
      if (!response.ok) {
        throw new Error('Failed to fetch degrees')
      }
      const data = await response.json()
      
      // Remove duplicates and create unique entries
      const uniqueDegrees = data.reduce((acc: any[], degree: any) => {
        const existingIndex = acc.findIndex(d => d.degree_code === degree.degree_code)
        if (existingIndex === -1) {
          acc.push({
            degree_code: degree.degree_code,
            degree_name: degree.degree_name,
            id: degree.id // Add id for unique key
          })
        }
        return acc
      }, [])
      
      setDegrees(uniqueDegrees)
    } catch (error) {
      console.error('Error fetching degrees:', error)
      toast({
        title: "❌ Fetch Failed",
        description: "Failed to load degrees. Please try again.",
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      })
    } finally {
      setLoadingDropdowns(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchSemesters()
    fetchInstitutions()
    fetchDegrees()
  }, [])

  const resetForm = () => { setFormData({ institution_code: "", degree_code: "", semester_name: "", display_name: "", student_group: "", display_order: 1, initial_semester: false, terminal_semester: false }); setErrors({}); setEditing(null) }

  const handleSort = (c: string) => { if (sortColumn === c) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortColumn(c); setSortDirection("asc") } }
  const getSortIcon = (c: string) => sortColumn !== c ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    const data = items
      .filter((i) => [i.institution_code, i.degree_code, i.semester_name, i.display_name, i.student_group].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      .filter((i) => yearFilter === "all" || new Date(i.created_at).getFullYear().toString() === yearFilter)
    if (!sortColumn) return data
    return [...data].sort((a, b) => {
      const av = (a as any)[sortColumn]
      const bv = (b as any)[sortColumn]
      if (av === bv) return 0
      return sortDirection === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }, [items, searchTerm, sortColumn, sortDirection, yearFilter])

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const pageItems = filtered.slice(startIndex, endIndex)
  useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection, yearFilter])
  const uniqueYears = useMemo(() => Array.from(new Set(items.map(i => new Date(i.created_at).getFullYear()))).sort((a,b)=>b-a), [items])

  const openAdd = () => { resetForm(); setSheetOpen(true) }
  const openEdit = (row: Semester) => { setEditing(row); setFormData({ institution_code: row.institution_code, degree_code: row.degree_code, semester_name: row.semester_name, display_name: row.display_name || "", student_group: row.student_group || "", display_order: row.display_order || 1, initial_semester: !!row.initial_semester, terminal_semester: !!row.terminal_semester }); setSheetOpen(true) }

  const validate = () => { const e: Record<string, string> = {}; if (!formData.institution_code.trim()) e.institution_code = "Required"; if (!formData.degree_code.trim()) e.degree_code = "Required"; if (!formData.semester_name.trim()) e.semester_name = "Required"; setErrors(e); return Object.keys(e).length === 0 }

  const save = async () => {
    if (!validate()) return

    console.log('Form data before save:', formData)
    console.log('Validation passed, proceeding with save...')

    try {
      setLoading(true)

      if (editing) {
        // Update existing semester
        const response = await fetch(`/api/semesters/${editing.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          })
          throw new Error(`Failed to update semester: ${errorData.error || response.statusText}`)
        }

        const updatedSemester = await response.json()
        setItems((prev) => prev.map((p) => (p.id === editing.id ? updatedSemester : p)))
      } else {
        // Create new semester
        console.log('Creating semester with data:', formData)
        const response = await fetch('/api/semesters', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          })
          throw new Error(`Failed to create semester: ${errorData.error || response.statusText}`)
        }

        const newSemester = await response.json()
        setItems((prev) => [newSemester, ...prev])
      }

      setSheetOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving semester:', error)
      toast({
        title: "❌ Save Failed",
        description: "Failed to save semester. Please try again.",
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

      const response = await fetch(`/api/semesters/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete semester')
      }

      setItems((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Error deleting semester:', error)
      toast({
        title: "❌ Delete Failed",
        description: "Failed to delete semester. Please try again.",
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      })
    } finally {
      setLoading(false)
    }
  }
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })

  const handleDownload = () => { const json = JSON.stringify(filtered, null, 2); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `semester_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) }
  const handleExport = () => { const excelData = filtered.map(r=>({'Institution Code':r.institution_code,'Degree Code':r.degree_code,'Semester Name':r.semester_name,'Display Name':r.display_name||'','Student Group':r.student_group||'','Order':r.display_order||'', 'Initial':r.initial_semester?'Yes':'No','Terminal':r.terminal_semester?'Yes':'No','Created':new Date(r.created_at).toISOString().split('T')[0]})); const ws=XLSX.utils.json_to_sheet(excelData); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Semester'); XLSX.writeFile(wb,`semester_export_${new Date().toISOString().split('T')[0]}.xlsx`) }
  const handleTemplateExport = () => { const sample=[{'Institution Code':'JKKN','Degree Code':'BSC','Semester Name':'Semester 1','Display Name':'Sem I','Student Group':'UG','Order':1,'Initial':'Yes','Terminal':'No'}]; const ws=XLSX.utils.json_to_sheet(sample); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Template'); XLSX.writeFile(wb,`semester_template_${new Date().toISOString().split('T')[0]}.xlsx`) }
  const handleImport = () => { const input=document.createElement('input'); input.type='file'; input.accept='.json,.csv,.xlsx,.xls'; input.onchange=async(e)=>{ const file=(e.target as HTMLInputElement).files?.[0]; if(!file) return; try{ let rows: Partial<Semester>[]=[]; if(file.name.endsWith('.json')) rows=JSON.parse(await file.text()); else { const data=new Uint8Array(await file.arrayBuffer()); const wb=XLSX.read(data,{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]]; const json=XLSX.utils.sheet_to_json(ws) as Record<string,unknown>[]; rows=json.map(j=>({institution_code:String(j['Institution Code']||''),degree_code:String(j['Degree Code']||''),semester_name:String(j['Semester Name']||''),display_name:String(j['Display Name']||''),student_group:String(j['Student Group']||''),display_order:Number(j['Order']||0),initial_semester:String(j['Initial']||'').toLowerCase()==='yes',terminal_semester:String(j['Terminal']||'').toLowerCase()==='yes'})) } const now=new Date().toISOString(); const mapped=rows.filter(r=>r.institution_code&&r.degree_code&&r.semester_name).map(r=>({ id:String(Date.now()+Math.random()), created_at:now, institution_code:r.institution_code!, degree_code:r.degree_code!, semester_name:r.semester_name as string, display_name:(r as any).display_name||'', student_group:(r as any).student_group||'', display_order:(r as any).display_order||1, initial_semester:(r as any).initial_semester??false, terminal_semester:(r as any).terminal_semester??false })) as Semester[]; setItems(p=>[...mapped,...p]) } catch { alert('Import failed. Please check your file.') } }; input.click() }

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
                  <BreadcrumbPage>Semester</BreadcrumbPage>
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
                    <p className="text-xs font-medium text-muted-foreground">Total Semesters</p>
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
                    <p className="text-xs font-medium text-muted-foreground">Initial Semesters</p>
                    <p className="text-xl font-bold text-green-600">{items.filter(i=>i.initial_semester).length}</p>
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
                    <p className="text-xs font-medium text-muted-foreground">Terminal Semesters</p>
                    <p className="text-xl font-bold text-red-600">{items.filter(i=>i.terminal_semester).length}</p>
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
                    <h2 className="text-sm font-semibold">Semester</h2>
                    <p className="text-[11px] text-muted-foreground">Manage semesters</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
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
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={fetchSemesters} disabled={loading}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
        
       
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleTemplateExport}>
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                    Template
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleDownload}>Json</Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleExport}>Download</Button>
                  <Button size="sm" className="text-xs px-2 h-8" onClick={openAdd} disabled={loading}><PlusCircle className="h-3 w-3 mr-1" /> Add</Button>
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
                        <TableHead className="text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("semester_name")} className="h-auto p-0 font-medium hover:bg-transparent">Semester Name <span className="ml-1">{getSortIcon("semester_name")}</span></Button></TableHead>
                        <TableHead className="w-[140px] text-[11px]">Display</TableHead>
                        <TableHead className="w-[120px] text-[11px]">Student Group</TableHead>
                        <TableHead className="w-[80px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("display_order")} className="h-auto p-0 font-medium hover:bg-transparent">Order <span className="ml-1">{getSortIcon("display_order")}</span></Button></TableHead>
                        <TableHead className="w-[100px] text-[11px]">Initial</TableHead>
                        <TableHead className="w-[100px] text-[11px]">Terminal</TableHead>
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
                              <TableCell className="text-[11px]">{row.semester_name}</TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{row.display_name}</TableCell>
                              <TableCell className="text-[11px]">{row.student_group}</TableCell>
                              <TableCell className="text-[11px]">{row.display_order}</TableCell>
                              <TableCell className="text-[11px]">{row.initial_semester ? "Yes" : "No"}</TableCell>
                              <TableCell className="text-[11px]">{row.terminal_semester ? "Yes" : "No"}</TableCell>
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
                                        <AlertDialogTitle>Delete Semester</AlertDialogTitle>
                                        <AlertDialogDescription>Are you sure you want to delete {row.semester_name}?</AlertDialogDescription>
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
        <SheetContent className="sm:max-w-[520px] overflow-y-auto">
          <SheetHeader className="pb-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {editing ? "Edit Semester" : "Add Semester"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editing ? "Update semester information" : "Create a new semester record"}
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
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Basic Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Institution <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.institution_code} 
                    onValueChange={(value) => setFormData({ ...formData, institution_code: value })}
                    disabled={loadingDropdowns}
                  >
                    <SelectTrigger className={`h-9 ${errors.institution_code ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder={loadingDropdowns ? "Loading..." : "Select Institution"} />
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
                  <Label className="text-sm font-semibold">Degree <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.degree_code} 
                    onValueChange={(value) => setFormData({ ...formData, degree_code: value })}
                    disabled={loadingDropdowns}
                  >
                    <SelectTrigger className={`h-9 ${errors.degree_code ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder={loadingDropdowns ? "Loading..." : "Select Degree"} />
                    </SelectTrigger>
                    <SelectContent>
                      {degrees.map((degree) => (
                        <SelectItem key={degree.id} value={degree.degree_code}>
                          {degree.degree_code} - {degree.degree_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.degree_code && <p className="text-xs text-destructive">{errors.degree_code}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Semester Name <span className="text-red-500">*</span></Label>
                <Input value={formData.semester_name} onChange={(e) => setFormData({ ...formData, semester_name: e.target.value })} className={`h-9 ${errors.semester_name ? 'border-destructive' : ''}`} placeholder="e.g., Semester 1" />
                {errors.semester_name && <p className="text-xs text-destructive">{errors.semester_name}</p>}
              </div>
            </div>

            {/* Display Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-purple-200 dark:border-purple-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Display Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Display Name</Label>
                  <Input value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} className="h-9" placeholder="e.g., Sem I" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Student Group</Label>
                  <Input value={formData.student_group} onChange={(e) => setFormData({ ...formData, student_group: e.target.value })} className="h-9" placeholder="e.g., UG" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Display Order</Label>
                <Input type="number" inputMode="numeric" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value || 0) })} className="h-9" placeholder="1" />
              </div>
            </div>

            {/* Semester Properties Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-orange-200 dark:border-orange-800">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Semester Properties</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, initial_semester: !formData.initial_semester })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      formData.initial_semester ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.initial_semester ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <Label className="text-sm font-medium">Initial Semester</Label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, terminal_semester: !formData.terminal_semester })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      formData.terminal_semester ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.terminal_semester ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <Label className="text-sm font-medium">Terminal Semester</Label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" size="sm" className="h-10 px-6" onClick={() => { setSheetOpen(false); resetForm() }}>Cancel</Button>
              <Button size="sm" className="h-10 px-6" onClick={save}>{editing ? "Update Semester" : "Create Semester"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Toaster />
    </SidebarProvider>

  )
}






