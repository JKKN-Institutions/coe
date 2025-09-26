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
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Users, TrendingUp, FileSpreadsheet } from "lucide-react"

type Section = {
  id: string
  institution_code: string
  section_name: string
  section_id: string
  section_description?: string
  arrear_section?: boolean
  is_active: boolean
  created_at: string
}

const MOCK_SECTIONS: Section[] = [
  { id: "1", institution_code: "JKKN", section_name: "A", section_id: "A1", section_description: "Regular", arrear_section: false, is_active: true, created_at: new Date().toISOString() },
]

export default function SectionPage() {
  const [items, setItems] = useState<Section[]>(MOCK_SECTIONS)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Section | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
  const [formData, setFormData] = useState({ institution_code: "", section_name: "", section_id: "", section_description: "", arrear_section: false, is_active: true })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const resetForm = () => { setFormData({ institution_code: "", section_name: "", section_id: "", section_description: "", arrear_section: false, is_active: true }); setErrors({}); setEditing(null) }
  const handleSort = (c: string) => { if (sortColumn === c) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortColumn(c); setSortDirection("asc") } }
  const getSortIcon = (c: string) => sortColumn !== c ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    const data = items
      .filter((i) => [i.institution_code, i.section_name, i.section_id, i.section_description].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      .filter((i) => statusFilter === "all" || (statusFilter === "active" ? i.is_active : !i.is_active))
      .filter((i) => yearFilter === "all" || new Date(i.created_at).getFullYear().toString() === yearFilter)
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
  useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection, statusFilter, yearFilter])
  const uniqueYears = useMemo(() => Array.from(new Set(items.map(i => new Date(i.created_at).getFullYear()))).sort((a,b)=>b-a), [items])

  const openAdd = () => { resetForm(); setSheetOpen(true) }
  const openEdit = (row: Section) => { setEditing(row); setFormData({ institution_code: row.institution_code, section_name: row.section_name, section_id: row.section_id, section_description: row.section_description || "", arrear_section: !!row.arrear_section, is_active: row.is_active }); setSheetOpen(true) }
  const validate = () => { const e: Record<string, string> = {}; if (!formData.institution_code.trim()) e.institution_code = "Required"; if (!formData.section_name.trim()) e.section_name = "Required"; if (!formData.section_id.trim()) e.section_id = "Required"; setErrors(e); return Object.keys(e).length === 0 }
  const save = () => { if (!validate()) return; if (editing) setItems((p) => p.map((x) => x.id === editing.id ? { ...editing, ...formData } as Section : x)); else setItems((p) => [{ id: String(Date.now()), created_at: new Date().toISOString(), ...formData }, ...p]); setSheetOpen(false); resetForm() }
  const remove = (id: string) => setItems((p) => p.filter((x) => x.id !== id))
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  const handleDownload = () => { const json = JSON.stringify(filtered, null, 2); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `section_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) }
  const handleExport = () => { const excelData = filtered.map(r=>({'Institution Code':r.institution_code,'Section ID':r.section_id,'Section Name':r.section_name,'Description':r.section_description||'','Arrear':r.arrear_section?'Yes':'No','Status':r.is_active?'Active':'Inactive','Created':new Date(r.created_at).toISOString().split('T')[0]})); const ws=XLSX.utils.json_to_sheet(excelData); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Section'); XLSX.writeFile(wb,`section_export_${new Date().toISOString().split('T')[0]}.xlsx`) }
  const handleTemplateExport = () => { const sample=[{'Institution Code':'JKKN','Section ID':'A1','Section Name':'A','Description':'Regular','Arrear':'No','Status':'Active'}]; const ws=XLSX.utils.json_to_sheet(sample); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Template'); XLSX.writeFile(wb,`section_template_${new Date().toISOString().split('T')[0]}.xlsx`) }
  const handleImport = () => { const input=document.createElement('input'); input.type='file'; input.accept='.json,.csv,.xlsx,.xls'; input.onchange=async(e)=>{ const file=(e.target as HTMLInputElement).files?.[0]; if(!file) return; try{ let rows: Partial<Section>[]=[]; if(file.name.endsWith('.json')) rows=JSON.parse(await file.text()); else { const data=new Uint8Array(await file.arrayBuffer()); const wb=XLSX.read(data,{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]]; const json=XLSX.utils.sheet_to_json(ws) as Record<string,unknown>[]; rows=json.map(j=>({ institution_code:String(j['Institution Code']||''), section_id:String(j['Section ID']||''), section_name:String(j['Section Name']||''), section_description:String(j['Description']||''), arrear_section:String(j['Arrear']||'').toLowerCase()==='yes', is_active:String(j['Status']||'').toLowerCase()==='active' })) } const now=new Date().toISOString(); const mapped=rows.filter(r=>r.institution_code&&r.section_id&&r.section_name).map(r=>({ id:String(Date.now()+Math.random()), created_at:now, ...r })) as Section[]; setItems(p=>[...mapped,...p]) } catch { alert('Import failed. Please check your file.') } }; input.click() }

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
                    <p className="text-xl font-bold text-green-600">{items.filter(i=>i.is_active).length}</p>
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
                    <p className="text-xl font-bold text-red-600">{items.filter(i=>!i.is_active).length}</p>
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
                        <TableHead className="w-[120px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("section_id")} className="h-auto p-0 font-medium hover:bg-transparent">Section ID <span className="ml-1">{getSortIcon("section_id")}</span></Button></TableHead>
                        <TableHead className="text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("section_name")} className="h-auto p-0 font-medium hover:bg-transparent">Section Name <span className="ml-1">{getSortIcon("section_name")}</span></Button></TableHead>
                        <TableHead className="w-[200px] text-[11px]">Description</TableHead>
                        <TableHead className="w-[100px] text-[11px]">Arrear</TableHead>
                        <TableHead className="w-[100px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("is_active")} className="h-auto p-0 font-medium hover:bg-transparent">Status <span className="ml-1">{getSortIcon("is_active")}</span></Button></TableHead>
                        <TableHead className="w-[120px] text-[11px]"><Button variant="ghost" size="sm" onClick={() => handleSort("created_at")} className="h-auto p-0 font-medium hover:bg-transparent">Created <span className="ml-1">{getSortIcon("created_at")}</span></Button></TableHead>
                        <TableHead className="w-[120px] text-[11px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={9} className="h-24 text-center text-[11px]">Loading…</TableCell></TableRow>
                      ) : pageItems.length ? (
                        <>
                          {pageItems.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="text-[11px] font-medium">{row.institution_code}</TableCell>
                              <TableCell className="text-[11px]">{row.section_id}</TableCell>
                              <TableCell className="text-[11px]">{row.section_name}</TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{row.section_description}</TableCell>
                              <TableCell className="text-[11px]">{row.arrear_section ? "Yes" : "No"}</TableCell>
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
                                        <AlertDialogTitle>Delete Section</AlertDialogTitle>
                                        <AlertDialogDescription>Are you sure you want to delete {row.section_name}?</AlertDialogDescription>
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
                        <TableRow><TableCell colSpan={9} className="h-24 text-center text-[11px]">No data</TableCell></TableRow>
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
            <SheetTitle className="text-base">{editing ? "Edit Section" : "Add Section"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Institution Code *</Label>
                <Input value={formData.institution_code} onChange={(e) => setFormData({ ...formData, institution_code: e.target.value })} className={`h-8 text-xs ${errors.institution_code ? 'border-destructive' : ''}`} />
                {errors.institution_code && <p className="text-[10px] text-destructive mt-1">{errors.institution_code}</p>}
              </div>
              <div>
                <Label className="text-xs">Section ID *</Label>
                <Input value={formData.section_id} onChange={(e) => setFormData({ ...formData, section_id: e.target.value })} className={`h-8 text-xs ${errors.section_id ? 'border-destructive' : ''}`} />
                {errors.section_id && <p className="text-[10px] text-destructive mt-1">{errors.section_id}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Section Name *</Label>
                <Input value={formData.section_name} onChange={(e) => setFormData({ ...formData, section_name: e.target.value })} className={`h-8 text-xs ${errors.section_name ? 'border-destructive' : ''}`} />
                {errors.section_name && <p className="text-[10px] text-destructive mt-1">{errors.section_name}</p>}
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input value={formData.section_description} onChange={(e) => setFormData({ ...formData, section_description: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Arrear Section</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={formData.arrear_section ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs" onClick={() => setFormData({ ...formData, arrear_section: true })}>Yes</Button>
                  <Button type="button" variant={!formData.arrear_section ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs" onClick={() => setFormData({ ...formData, arrear_section: false })}>No</Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={formData.is_active ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs" onClick={() => setFormData({ ...formData, is_active: true })}>Active</Button>
                  <Button type="button" variant={!formData.is_active ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs" onClick={() => setFormData({ ...formData, is_active: false })}>Inactive</Button>
                </div>
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


