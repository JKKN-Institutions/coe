"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Edit, FileSpreadsheet, PlusCircle, Search, Upload } from "lucide-react"

interface Permission {
  id: string
  name: string
  description?: string
  resource: string
  action: string
  is_active: boolean
  created_at: string
}

export default function PermissionsPage() {
  const [items, setItems] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/permissions')
        if (res.ok) setItems(await res.json())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSort = (column: string) => {
    if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setSortColumn(column); setSortDirection('asc') }
  }

  const filtered = useMemo(() => {
    return items
      .filter(p => {
        const q = searchTerm.toLowerCase()
        const matches = p.name.toLowerCase().includes(q) || p.resource.toLowerCase().includes(q) || p.action.toLowerCase().includes(q)
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && p.is_active) || (statusFilter === 'inactive' && !p.is_active)
        return matches && matchesStatus
      })
      .sort((a, b) => {
        if (!sortColumn) return 0
        let av: string | number = ''
        let bv: string | number = ''
        switch (sortColumn) {
          case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break
          case 'resource': av = a.resource.toLowerCase(); bv = b.resource.toLowerCase(); break
          case 'action': av = a.action.toLowerCase(); bv = b.action.toLowerCase(); break
          case 'status': av = a.is_active ? 1 : 0; bv = b.is_active ? 1 : 0; break
          case 'created_at': av = new Date(a.created_at).getTime(); bv = new Date(b.created_at).getTime(); break
          default: return 0
        }
        if (sortDirection === 'asc') return av > bv ? 1 : av < bv ? -1 : 0
        return av < bv ? 1 : av > bv ? -1 : 0
      })
  }, [items, searchTerm, statusFilter, sortColumn, sortDirection])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const pageItems = filtered.slice(startIndex, endIndex)

  useEffect(() => { setCurrentPage(1) }, [searchTerm, statusFilter, sortColumn, sortDirection])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/permissions/${id}`, { method: 'DELETE' })
      if (res.ok) setItems(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  const handleDownloadJson = () => {
    const json = JSON.stringify(filtered, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `permissions_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleTemplate = () => {
    const sample = [{ Name: 'roles_view', Description: 'View roles', Resource: 'roles', Action: 'view', Active: 'Active' }]
    const ws = XLSX.utils.json_to_sheet(sample)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Permissions Template')
    XLSX.writeFile(wb, `permissions_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleExport = () => {
    const rows = filtered.map(p => ({ Name: p.name, Description: p.description || '', Resource: p.resource, Action: p.action, Active: p.is_active ? 'Active' : 'Inactive', Created: new Date(p.created_at).toLocaleDateString('en-US') }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Permissions')
    XLSX.writeFile(wb, `permissions_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        let items: { name: string; description?: string; resource: string; action: string; is_active?: boolean }[] = []
        if (file.name.endsWith('.json')) {
          const text = await file.text()
          const parsed = JSON.parse(text) as any[]
          items = parsed.map(p => ({
            name: p.name || p.Name || '',
            description: p.description || p.Description || '',
            resource: p.resource || p.Resource || '',
            action: p.action || p.Action || '',
            is_active: typeof p.is_active === 'boolean' ? p.is_active : (String(p.Active || '').toLowerCase() === 'active')
          }))
        } else if (file.name.endsWith('.csv')) {
          const text = await file.text()
          const [headerLine, ...lines] = text.split(/\r?\n/)
          const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''))
          const idx = (name: RegExp) => headers.findIndex(h => name.test(h))
          const nameIdx = idx(/name/i)
          const descIdx = idx(/(description)/i)
          const resIdx = idx(/resource/i)
          const actIdx = idx(/action/i)
          const activeIdx = idx(/(active|is_active)/i)
          for (const line of lines) {
            if (!line.trim()) continue
            const vals = line.match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/"/g, '').trim()) || []
            items.push({
              name: vals[nameIdx] || '',
              description: vals[descIdx] || '',
              resource: vals[resIdx] || '',
              action: vals[actIdx] || '',
              is_active: (vals[activeIdx] || '').toLowerCase() === 'active'
            })
          }
        } else {
          const buf = new Uint8Array(await file.arrayBuffer())
          const wb = XLSX.read(buf, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
          items = data.map(row => ({
            name: String(row['Name'] || row['name'] || ''),
            description: String(row['Description'] || row['description'] || ''),
            resource: String(row['Resource'] || row['resource'] || ''),
            action: String(row['Action'] || row['action'] || ''),
            is_active: String(row['Active'] || row['is_active'] || '').toLowerCase() === 'active'
          }))
        }

        let success = 0
        let fail = 0
        for (const item of items) {
          try {
            const res = await fetch('/api/permissions', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                name: item.name,
                description: item.description,
                resource: item.resource,
                action: item.action,
                is_active: item.is_active ?? true
              })
            })
            if (res.ok) success++; else fail++
          } catch { fail++ }
        }
        const refresh = await fetch('/api/permissions')
        if (refresh.ok) setItems(await refresh.json())
        alert(`Import completed. Success: ${success}, Failed: ${fail}`)
      } catch (err) {
        console.error('Import error', err)
        alert('Import failed. Please check your file.')
      }
    }
    input.click()
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/" className="hover:text-primary">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Permissions</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="h-3 w-3 rounded-sm bg-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Permissions</h2>
                    <p className="text-[11px] text-muted-foreground">Browse, filter and manage permissions</p>
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
                    <Input placeholder="Search permissions…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleTemplate}>
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                    Template
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleDownloadJson}>
                    <Download className="h-3 w-3 mr-1" />
                    Json
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleExport}>
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={handleImport}>
                    <Upload className="h-3 w-3 mr-1" />
                    Upload
                  </Button>
                  <Button size="sm" className="text-xs px-2 h-8" onClick={() => (window.location.href = '/permissions/add')}>
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">
              <div className="rounded-md border overflow-hidden" style={{ height: '440px' }}>
                <div className="h-full overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead className="w-[180px] text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="h-auto p-0 font-medium hover:bg-transparent">Name <span className="ml-1">{!sortColumn || sortColumn !== 'name' ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</span></Button>
                        </TableHead>
                        <TableHead className="text-[11px]">Resource</TableHead>
                        <TableHead className="text-[11px]">Action</TableHead>
                        <TableHead className="text-[11px]">Description</TableHead>
                        <TableHead className="w-[100px] text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('status')} className="h-auto p-0 font-medium hover:bg-transparent">Status <span className="ml-1">{!sortColumn || sortColumn !== 'status' ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</span></Button>
                        </TableHead>
                        <TableHead className="w-[120px] text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('created_at')} className="h-auto p-0 font-medium hover:bg-transparent">Created <span className="ml-1">{!sortColumn || sortColumn !== 'created_at' ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</span></Button>
                        </TableHead>
                        <TableHead className="w-[120px] text-[11px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-[11px]">Loading permissions...</TableCell>
                        </TableRow>
                      ) : pageItems.length > 0 ? (
                        <>
                          {pageItems.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium text-[11px]">{p.name}</TableCell>
                              <TableCell className="text-[11px]">{p.resource}</TableCell>
                              <TableCell className="text-[11px]">{p.action}</TableCell>
                              <TableCell className="text-[11px]">{p.description}</TableCell>
                              <TableCell>
                                <Badge variant={p.is_active ? 'default' : 'secondary'} className="text-[11px]">{p.is_active ? 'Active' : 'Inactive'}</Badge>
                              </TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="outline" size="sm" onClick={() => (window.location.href = `/permissions/edit/${p.id}`)} className="h-7 w-7 p-0">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">×</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Permission</AlertDialogTitle>
                                        <AlertDialogDescription>Are you sure you want to delete this permission? This action cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {Array.from({ length: Math.max(0, itemsPerPage - pageItems.length) }).map((_, i) => (
                            <TableRow key={`empty-${i}`}>
                              <TableCell colSpan={7}>&nbsp;</TableCell>
                            </TableRow>
                          ))}
                        </>
                      ) : (
                        <>
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-xs">No permissions found.</TableCell>
                          </TableRow>
                          {Array.from({ length: itemsPerPage - 1 }).map((_, i) => (
                            <TableRow key={`empty-no-${i}`}>
                              <TableCell colSpan={7}>&nbsp;</TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center justify-between space-x-2 py-2 mt-2">
                <div className="text-xs text-muted-foreground">Showing {filtered.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} permissions</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-7 px-2 text-xs"><ChevronLeft className="h-3 w-3 mr-1" /> Previous</Button>
                  <div className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages || 1}</div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages} className="h-7 px-2 text-xs">Next <ChevronRight className="h-3 w-3 ml-1" /></Button>
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


