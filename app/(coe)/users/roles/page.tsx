"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import XLSX from "@/lib/utils/excel-compat"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AppFooter } from "@/components/layout/app-footer"
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
import { ProtectedRoute } from "@/components/common/protected-route"

interface Role {
  id: string
  name?: string
  role_name?: string
  role_description?: string
  description?: string
  is_active: boolean
  created_at: string
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/users/roles')
        if (response.ok) {
          const data = await response.json()
          setRoles(data)
        }
      } catch (e) {
        console.error('Failed to fetch roles', e)
      } finally {
        setLoading(false)
      }
    }

    fetchRoles()
  }, [])

  const getRoleName = (r: Role) => r.role_name || r.name || ''
  const getRoleDescription = (r: Role) => r.role_description || r.description || ''

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const filtered = useMemo(() => {
    return roles
      .filter(r => {
        const matches = getRoleName(r).toLowerCase().includes(searchTerm.toLowerCase()) || getRoleDescription(r).toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && r.is_active) || (statusFilter === 'inactive' && !r.is_active)
        return matches && matchesStatus
      })
      .sort((a, b) => {
        if (!sortColumn) return 0
        let aVal: string | number = ''
        let bVal: string | number = ''
        switch (sortColumn) {
          case 'name':
            aVal = getRoleName(a).toLowerCase()
            bVal = getRoleName(b).toLowerCase()
            break
          case 'created_at':
            aVal = new Date(a.created_at).getTime()
            bVal = new Date(b.created_at).getTime()
            break
          case 'status':
            aVal = a.is_active ? 1 : 0
            bVal = b.is_active ? 1 : 0
            break
          default:
            return 0
        }
        if (sortDirection === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      })
  }, [roles, searchTerm, statusFilter, sortColumn, sortDirection])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const pageItems = filtered.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, sortColumn, sortDirection])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/users/roles/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRoles(prev => prev.filter(r => r.id !== id))
      }
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
    a.download = `roles_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleTemplate = () => {
    const sample = [
      {
        Name: 'admin',
        Description: 'Administrator role',
        Active: 'Active'
      }
    ]
    const ws = XLSX.utils.json_to_sheet(sample)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Roles Template')
    XLSX.writeFile(wb, `roles_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleExport = () => {
    const rows = filtered.map(r => ({
      Name: getRoleName(r),
      Description: getRoleDescription(r),
      Active: r.is_active ? 'Active' : 'Inactive',
      Created: new Date(r.created_at).toLocaleDateString('en-US')
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Roles')
    XLSX.writeFile(wb, `roles_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        let items: { name: string; description?: string; is_active?: boolean }[] = []
        if (file.name.endsWith('.json')) {
          const text = await file.text()
          const parsed = JSON.parse(text) as any[]
          items = parsed.map(p => ({
            name: p.name || p.role_name || p.Name || '',
            description: p.description || p.role_description || p.Description || '',
            is_active: typeof p.is_active === 'boolean' ? p.is_active : (String(p.Active || '').toLowerCase() === 'active')
          }))
        } else if (file.name.endsWith('.csv')) {
          const text = await file.text()
          const [headerLine, ...lines] = text.split(/\r?\n/)
          const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''))
          const nameIdx = headers.findIndex(h => /name/i.test(h))
          const descIdx = headers.findIndex(h => /(description|role_description)/i.test(h))
          const activeIdx = headers.findIndex(h => /(active|is_active)/i.test(h))
          for (const line of lines) {
            if (!line.trim()) continue
            const vals = line.match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/"/g, '').trim()) || []
            items.push({
              name: vals[nameIdx] || '',
              description: vals[descIdx] || '',
              is_active: (vals[activeIdx] || '').toLowerCase() === 'active'
            })
          }
        } else {
          const buf = new Uint8Array(await file.arrayBuffer())
          const wb = XLSX.read(buf, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
          items = data.map(row => ({
            name: String(row['Name'] || row['name'] || row['role_name'] || ''),
            description: String(row['Description'] || row['description'] || row['role_description'] || ''),
            is_active: String(row['Active'] || row['is_active'] || '').toLowerCase() === 'active'
          }))
        }

        let success = 0
        let fail = 0
        for (const item of items) {
          try {
            const res = await fetch('/api/users/roles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                role_name: item.name,
                name: item.name,
                role_description: item.description,
                description: item.description,
                is_active: item.is_active ?? true
              })
            })
            if (res.ok) success++; else fail++
          } catch {
            fail++
          }
        }

        const refresh = await fetch('/api/users/roles')
        if (refresh.ok) setRoles(await refresh.json())
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
    <ProtectedRoute requiredRoles={["admin","super_admin"]} requireAnyRole={true}>
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
                  <BreadcrumbPage>Roles</BreadcrumbPage>
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
                    <h2 className="text-sm font-semibold">Roles</h2>
                    <p className="text-[11px] text-muted-foreground">Browse, filter and manage roles</p>
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
                    <Input placeholder="Search roles…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" />
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
                  <Button size="sm" className="text-xs px-2 h-8" onClick={() => (window.location.href = '/roles/add')}>
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
                        <TableHead className="w-[200px] text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="h-auto p-0 font-medium hover:bg-transparent">
                            Name
                            <span className="ml-1">{!sortColumn || sortColumn !== 'name' ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</span>
                          </Button>
                        </TableHead>
                        <TableHead className="text-[11px]">Description</TableHead>
                        <TableHead className="w-[100px] text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('status')} className="h-auto p-0 font-medium hover:bg-transparent">
                            Status
                            <span className="ml-1">{!sortColumn || sortColumn !== 'status' ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</span>
                          </Button>
                        </TableHead>
                        <TableHead className="w-[120px] text-[11px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('created_at')} className="h-auto p-0 font-medium hover:bg-transparent">
                            Created
                            <span className="ml-1">{!sortColumn || sortColumn !== 'created_at' ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</span>
                          </Button>
                        </TableHead>
                        <TableHead className="w-[120px] text-[11px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-[11px]">Loading roles...</TableCell>
                        </TableRow>
                      ) : pageItems.length > 0 ? (
                        <>
                          {pageItems.map(role => (
                            <TableRow key={role.id}>
                              <TableCell className="font-medium text-[11px]">{getRoleName(role)}</TableCell>
                              <TableCell className="text-[11px]">{getRoleDescription(role)}</TableCell>
                              <TableCell>
                                <Badge variant={role.is_active ? 'default' : 'secondary'} className="text-[11px]">{role.is_active ? 'Active' : 'Inactive'}</Badge>
                              </TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">{formatDate(role.created_at)}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="outline" size="sm" onClick={() => (window.location.href = `/roles/edit/${role.id}`)} className="h-7 w-7 p-0">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                                        <span className="sr-only">Delete</span>
                                        ×
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this role? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(role.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {Array.from({ length: Math.max(0, itemsPerPage - pageItems.length) }).map((_, i) => (
                            <TableRow key={`empty-${i}`}>
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
                            <TableCell colSpan={5} className="text-center text-xs">No roles found.</TableCell>
                          </TableRow>
                          {Array.from({ length: itemsPerPage - 1 }).map((_, i) => (
                            <TableRow key={`empty-no-${i}`}>
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

              <div className="flex items-center justify-between space-x-2 py-2 mt-2">
                <div className="text-xs text-muted-foreground">
                  Showing {filtered.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} roles
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-7 px-2 text-xs">
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Previous
                  </Button>
                  <div className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages || 1}</div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages} className="h-7 px-2 text-xs">
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
    </ProtectedRoute>
  )
}


