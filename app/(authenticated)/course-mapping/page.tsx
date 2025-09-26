"use client"

import { useMemo, useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Link2, TrendingUp, FileSpreadsheet } from "lucide-react"

type CourseMapping = {
  id: string
  institution_code: string
  program_code: string
  course_code: string
  batch_code: string
  course_group?: string
  semester_code?: string
  course_order?: number
  internal_max_mark?: number
  internal_pass_mark?: number
  external_max_mark?: number
  external_pass_mark?: number
  total_pass_mark?: number
  total_max_mark?: number
  created_at: string
}

const MOCK_MAPPINGS: CourseMapping[] = [
  { id: "1", institution_code: "JKKN", program_code: "BSC-CS", course_code: "CS101", batch_code: "2024", course_group: "General", semester_code: "S1", course_order: 1, internal_max_mark: 40, internal_pass_mark: 14, external_max_mark: 60, external_pass_mark: 26, total_pass_mark: 40, total_max_mark: 100, created_at: new Date().toISOString() },
]

export default function CourseMappingPage() {
  const [items, setItems] = useState<CourseMapping[]>(MOCK_MAPPINGS)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<CourseMapping | null>(null)
  const [formData, setFormData] = useState({ institution_code: "", program_code: "", course_code: "", batch_code: "", course_group: "", semester_code: "", course_order: 1, internal_max_mark: 40, internal_pass_mark: 0, external_max_mark: 60, external_pass_mark: 0, total_pass_mark: 0, total_max_mark: 100 })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const resetForm = () => { setFormData({ institution_code: "", program_code: "", course_code: "", batch_code: "", course_group: "", semester_code: "", course_order: 1, internal_max_mark: 40, internal_pass_mark: 0, external_max_mark: 60, external_pass_mark: 0, total_pass_mark: 0, total_max_mark: 100 }); setErrors({}); setEditing(null) }
  const handleSort = (c: string) => { if (sortColumn === c) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortColumn(c); setSortDirection("asc") } }
  const getSortIcon = (c: string) => sortColumn !== c ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    const data = items.filter((i) => [i.institution_code, i.program_code, i.course_code, i.batch_code, i.semester_code, i.course_group].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
    if (!sortColumn) return data
    return [...data].sort((a, b) => {
      const av = (a as any)[sortColumn]
      const bv = (b as any)[sortColumn]
      if (av === bv) return 0
      return sortDirection === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }, [items, searchTerm, sortColumn, sortDirection])

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const pageItems = filtered.slice(startIndex, endIndex)
  useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection])

  const openAdd = () => { resetForm(); setSheetOpen(true) }
  const openEdit = (row: CourseMapping) => { setEditing(row); setFormData({ institution_code: row.institution_code, program_code: row.program_code, course_code: row.course_code, batch_code: row.batch_code, course_group: row.course_group || "", semester_code: row.semester_code || "", course_order: row.course_order || 1, internal_max_mark: row.internal_max_mark || 0, internal_pass_mark: row.internal_pass_mark || 0, external_max_mark: row.external_max_mark || 0, external_pass_mark: row.external_pass_mark || 0, total_pass_mark: row.total_pass_mark || 0, total_max_mark: row.total_max_mark || 0 }); setSheetOpen(true) }
  const validate = () => { const e: Record<string, string> = {}; ["institution_code","program_code","course_code","batch_code"].forEach((k) => { if (!(formData as any)[k].trim()) e[k] = "Required" }); setErrors(e); return Object.keys(e).length === 0 }
  const save = () => { if (!validate()) return; if (editing) setItems((p) => p.map((x) => x.id === editing.id ? { ...editing, ...formData } as CourseMapping : x)); else setItems((p) => [{ id: String(Date.now()), created_at: new Date().toISOString(), ...formData }, ...p]); setSheetOpen(false); resetForm() }
  const remove = (id: string) => setItems((p) => p.filter((x) => x.id !== id))

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
                  <BreadcrumbPage>Course Mapping</BreadcrumbPage>
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
                    <p className="text-xs font-medium text-muted-foreground">Total Mappings</p>
                    <p className="text-xl font-bold">{items.length}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Link2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Active Mappings</p>
                    <p className="text-xl font-bold text-green-600">{items.length}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <Link2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Inactive Mappings</p>
                    <p className="text-xl font-bold text-red-600">0</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <Link2 className="h-3 w-3 text-red-600 dark:text-red-400" />
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
                    <Link2 className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Course Mapping</h2>
                    <p className="text-[11px] text-muted-foreground">Map courses to program, batch and semester</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <div className="relative w-full sm:w-[220px]">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-xs" />
                  </div>
                </div>

                <div className="flex gap-1 flex-wrap">
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8">
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                    Template
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8">Json</Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8">Download</Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8">Upload</Button>
                  <Button size="sm" className="text-xs px-2 h-8" onClick={openAdd}>
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
                        <TableHead className="w-[110px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("institution_code")} className="h-auto p-0 font-medium hover:bg-transparent">Inst. Code <span className="ml-1">{getSortIcon("institution_code")}</span></Button></TableHead>
                        <TableHead className="w-[130px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("program_code")} className="h-auto p-0 font-medium hover:bg-transparent">Program <span className="ml-1">{getSortIcon("program_code")}</span></Button></TableHead>
                        <TableHead className="w-[120px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("course_code")} className="h-auto p-0 font-medium hover:bg-transparent">Course <span className="ml-1">{getSortIcon("course_code")}</span></Button></TableHead>
                        <TableHead className="w-[100px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("batch_code")} className="h-auto p-0 font-medium hover:bg-transparent">Batch <span className="ml-1">{getSortIcon("batch_code")}</span></Button></TableHead>
                        <TableHead className="w-[120px] text-[11px]">Group</TableHead>
                        <TableHead className="w-[100px] text-[11px]">Semester</TableHead>
                        <TableHead className="w-[80px] text-[11px]">Order</TableHead>
                        <TableHead className="w-[140px] text-[11px]">Internal (Max/Pass)</TableHead>
                        <TableHead className="w-[140px] text-[11px]">External (Max/Pass)</TableHead>
                        <TableHead className="w-[140px] text-[11px]">Total (Max/Pass)</TableHead>
                        <TableHead className="w-[120px] text-[11px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={11} className="h-24 text-center text-[11px]">Loading…</TableCell></TableRow>
                      ) : pageItems.length ? (
                        <>
                          {pageItems.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="text-[11px] font-medium">{row.institution_code}</TableCell>
                              <TableCell className="text-[11px]">{row.program_code}</TableCell>
                              <TableCell className="text-[11px]">{row.course_code}</TableCell>
                              <TableCell className="text-[11px]">{row.batch_code}</TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{row.course_group}</TableCell>
                              <TableCell className="text-[11px]">{row.semester_code}</TableCell>
                              <TableCell className="text-[11px]">{row.course_order}</TableCell>
                              <TableCell className="text-[11px]">{row.internal_max_mark}/{row.internal_pass_mark}</TableCell>
                              <TableCell className="text-[11px]">{row.external_max_mark}/{row.external_pass_mark}</TableCell>
                              <TableCell className="text-[11px]">{row.total_max_mark}/{row.total_pass_mark}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(row)}><Edit className="h-3 w-3" /></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Mapping</AlertDialogTitle>
                                        <AlertDialogDescription>Are you sure you want to delete this mapping?</AlertDialogDescription>
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
                        <TableRow><TableCell colSpan={11} className="h-24 text-center text-[11px]">No data</TableCell></TableRow>
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
        <SheetContent className="sm:max-w-[640px]">
          <SheetHeader>
            <SheetTitle className="text-base">{editing ? "Edit Mapping" : "Add Mapping"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Institution Code *</Label>
                <Input value={formData.institution_code} onChange={(e) => setFormData({ ...formData, institution_code: e.target.value })} className={`h-8 text-xs ${errors.institution_code ? 'border-destructive' : ''}`} />
                {errors.institution_code && <p className="text-[10px] text-destructive mt-1">{errors.institution_code}</p>}
              </div>
              <div>
                <Label className="text-xs">Program Code *</Label>
                <Input value={formData.program_code} onChange={(e) => setFormData({ ...formData, program_code: e.target.value })} className={`h-8 text-xs ${errors.program_code ? 'border-destructive' : ''}`} />
                {errors.program_code && <p className="text-[10px] text-destructive mt-1">{errors.program_code}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Course Code *</Label>
                <Input value={formData.course_code} onChange={(e) => setFormData({ ...formData, course_code: e.target.value })} className={`h-8 text-xs ${errors.course_code ? 'border-destructive' : ''}`} />
                {errors.course_code && <p className="text-[10px] text-destructive mt-1">{errors.course_code}</p>}
              </div>
              <div>
                <Label className="text-xs">Batch Code *</Label>
                <Input value={formData.batch_code} onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })} className={`h-8 text-xs ${errors.batch_code ? 'border-destructive' : ''}`} />
                {errors.batch_code && <p className="text-[10px] text-destructive mt-1">{errors.batch_code}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Course Group</Label>
                <Input value={formData.course_group} onChange={(e) => setFormData({ ...formData, course_group: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Semester Code</Label>
                <Input value={formData.semester_code} onChange={(e) => setFormData({ ...formData, semester_code: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Course Order</Label>
                <Input type="number" inputMode="numeric" value={formData.course_order} onChange={(e) => setFormData({ ...formData, course_order: Number(e.target.value || 0) })} className="h-8 text-xs" />
              </div>
              <div></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Internal (Max / Pass)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" inputMode="numeric" value={formData.internal_max_mark} onChange={(e) => setFormData({ ...formData, internal_max_mark: Number(e.target.value || 0) })} className="h-8 text-xs" />
                  <Input type="number" inputMode="numeric" value={formData.internal_pass_mark} onChange={(e) => setFormData({ ...formData, internal_pass_mark: Number(e.target.value || 0) })} className="h-8 text-xs" />
                </div>
              </div>
              <div>
                <Label className="text-xs">External (Max / Pass)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" inputMode="numeric" value={formData.external_max_mark} onChange={(e) => setFormData({ ...formData, external_max_mark: Number(e.target.value || 0) })} className="h-8 text-xs" />
                  <Input type="number" inputMode="numeric" value={formData.external_pass_mark} onChange={(e) => setFormData({ ...formData, external_pass_mark: Number(e.target.value || 0) })} className="h-8 text-xs" />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Total (Max / Pass)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" inputMode="numeric" value={formData.total_max_mark} onChange={(e) => setFormData({ ...formData, total_max_mark: Number(e.target.value || 0) })} className="h-8 text-xs" />
                <Input type="number" inputMode="numeric" value={formData.total_pass_mark} onChange={(e) => setFormData({ ...formData, total_pass_mark: Number(e.target.value || 0) })} className="h-8 text-xs" />
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


