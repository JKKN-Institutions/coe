"use client"

import { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { AppFooter } from "@/components/app-footer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Edit,
  Trash2,
  MoreHorizontal,
  RefreshCcw,
  Filter,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
} from "lucide-react"

interface User {
  id: string
  email: string
  full_name: string
  username?: string
  avatar_url?: string
  bio?: string
  website?: string
  location?: string
  date_of_birth?: string
  phone?: string
  is_active: boolean
  is_verified: boolean
  roles?: string
  institution_id?: string
  preferences?: Record<string, unknown>
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export default function UsersPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const itemsPerPage = 10

  const fetchUsers = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)

      const url = searchTerm
        ? `/api/users?q=${encodeURIComponent(searchTerm)}`
        : '/api/users'

      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`)
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        setUsers(data)
        toast({
          title: "Success",
          description: `Loaded ${data.length} users`,
          duration: 2000,
        })
      } else {
        console.error('Invalid response format:', data)
        setUsers([])
        toast({
          title: "Warning",
          description: "No users found",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm) {
        fetchUsers(false)
      } else if (searchTerm === "") {
        fetchUsers(false)
      }
    }, 500)

    return () => clearTimeout(debounceTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const handleRefresh = () => {
    setRefreshing(true)
    setSearchTerm("")
    setStatusFilter("all")
    setRoleFilter("all")
    setCurrentPage(1)
    setSelectedUsers(new Set())
    fetchUsers(false)
  }

  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const filteredUsers = users.filter((user) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active) ||
      (statusFilter === "verified" && user.is_verified) ||
      (statusFilter === "unverified" && !user.is_verified)

    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "admin" && user.roles?.includes("admin")) ||
      (roleFilter === "user" && (user.roles === "user" || !user.roles)) ||
      (roleFilter === "moderator" && user.roles?.includes("moderator"))

    return matchesStatus && matchesRole
  })

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortColumn) return 0
    let av: string | number | boolean = ''
    let bv: string | number | boolean = ''
    switch (sortColumn) {
      case 'name':
        av = (a.full_name || '').toLowerCase()
        bv = (b.full_name || '').toLowerCase()
        break
      case 'email':
        av = (a.email || '').toLowerCase()
        bv = (b.email || '').toLowerCase()
        break
      case 'role':
        av = (a.roles || 'user').toLowerCase()
        bv = (b.roles || 'user').toLowerCase()
        break
      case 'status':
        av = a.is_active ? 1 : 0
        bv = b.is_active ? 1 : 0
        break
      case 'created_at':
        av = new Date(a.created_at).getTime()
        bv = new Date(b.created_at).getTime()
        break
      default:
        return 0
    }
    if (sortDirection === 'asc') return av > bv ? 1 : av < bv ? -1 : 0
    return av < bv ? 1 : av > bv ? -1 : 0
  })

  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage)

  const handleDeleteUser = async () => {
    if (!deleteUserId) return

    try {
      const response = await fetch(`/api/users/${deleteUserId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setUsers(users.filter(user => user.id !== deleteUserId))
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
      } else {
        throw new Error('Failed to delete user')
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    } finally {
      setDeleteUserId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return

    try {
      const promises = Array.from(selectedUsers).map(userId =>
        fetch(`/api/users/${userId}`, { method: 'DELETE' })
      )

      await Promise.all(promises)

      setUsers(users.filter(user => !selectedUsers.has(user.id)))
      setSelectedUsers(new Set())

      toast({
        title: "Success",
        description: `Deleted ${selectedUsers.size} users`,
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete some users",
        variant: "destructive",
      })
    }
  }

  const handleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(user => user.id)))
    }
  }

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const exportUsers = () => {
    const csvContent = [
      ['ID', 'Name', 'Email', 'Phone', 'Roles', 'Status', 'Verified', 'Created At'],
      ...filteredUsers.map(user => [
        user.id,
        user.full_name,
        user.email,
        user.phone || '',
        user.roles || '',
        user.is_active ? 'Active' : 'Inactive',
        user.is_verified ? 'Yes' : 'No',
        new Date(user.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`
    a.click()

    toast({
      title: "Success",
      description: `Exported ${filteredUsers.length} users`,
    })
  }

  const handleDownloadJson = () => {
    const json = JSON.stringify(filteredUsers, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleTemplateExport = () => {
    const sample = [{
      'Full Name': 'John Doe',
      'Email': 'john@example.com',
      'Role': 'user',
      'Phone': '9876543210',
      'Active': 'Active',
      'Verified': 'Yes',
      'Institution Id': ''
    }]
    const ws = XLSX.utils.json_to_sheet(sample)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Users Template')
    XLSX.writeFile(wb, `users_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleExportXlsx = () => {
    const rows = filteredUsers.map(u => ({
      'Full Name': u.full_name,
      'Email': u.email,
      'Role': u.roles || 'user',
      'Phone': u.phone || '',
      'Active': u.is_active ? 'Active' : 'Inactive',
      'Verified': u.is_verified ? 'Yes' : 'No',
      'Created': new Date(u.created_at).toLocaleDateString('en-US')
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Users')
    XLSX.writeFile(wb, `users_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        let items: { full_name: string; email: string; role?: string; phone?: string; is_active?: boolean; is_verified?: boolean; institution_id?: string }[] = []
        if (file.name.endsWith('.json')) {
          const text = await file.text()
          const parsed = JSON.parse(text) as any[]
          items = parsed.map(p => ({
            full_name: p.full_name || p['Full Name'] || '',
            email: p.email || p['Email'] || '',
            role: p.role || p['Role'] || 'user',
            phone: p.phone || p['Phone'] || '',
            is_active: typeof p.is_active === 'boolean' ? p.is_active : (String(p.Active || '').toLowerCase() === 'active'),
            is_verified: typeof p.is_verified === 'boolean' ? p.is_verified : (String(p.Verified || '').toLowerCase().startsWith('y')),
            institution_id: p.institution_id || p['Institution Id'] || ''
          }))
        } else if (file.name.endsWith('.csv')) {
          const text = await file.text()
          const [headerLine, ...lines] = text.split(/\r?\n/)
          const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''))
          const idx = (re: RegExp) => headers.findIndex(h => re.test(h))
          const nameIdx = idx(/full name|full_name|name/i)
          const emailIdx = idx(/email/i)
          const roleIdx = idx(/role/i)
          const phoneIdx = idx(/phone/i)
          const activeIdx = idx(/active|is_active/i)
          const verifiedIdx = idx(/verified|is_verified/i)
          const instIdx = idx(/institution id|institution_id/i)
          for (const line of lines) {
            if (!line.trim()) continue
            const vals = line.match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/"/g, '').trim()) || []
            items.push({
              full_name: vals[nameIdx] || '',
              email: vals[emailIdx] || '',
              role: vals[roleIdx] || 'user',
              phone: vals[phoneIdx] || '',
              is_active: (vals[activeIdx] || '').toLowerCase() === 'active',
              is_verified: (vals[verifiedIdx] || '').toLowerCase().startsWith('y'),
              institution_id: vals[instIdx] || ''
            })
          }
        } else {
          const buf = new Uint8Array(await file.arrayBuffer())
          const wb = XLSX.read(buf, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
          items = data.map(row => ({
            full_name: String(row['Full Name'] || row['full_name'] || row['Name'] || ''),
            email: String(row['Email'] || row['email'] || ''),
            role: String(row['Role'] || row['role'] || 'user'),
            phone: String(row['Phone'] || row['phone'] || ''),
            is_active: String(row['Active'] || row['is_active'] || '').toLowerCase() === 'active',
            is_verified: String(row['Verified'] || row['is_verified'] || '').toLowerCase().startsWith('y'),
            institution_id: String(row['Institution Id'] || row['institution_id'] || '')
          }))
        }

        let success = 0
        let fail = 0
        for (const item of items) {
          if (!item.email || !item.full_name) { fail++; continue }
          const payload = {
            full_name: item.full_name,
            email: item.email,
            username: item.email,
            phone: item.phone || '',
            is_active: item.is_active ?? true,
            is_verified: item.is_verified ?? true,
            role: item.role || 'user',
            institution_id: item.institution_id || '',
            preferences: {},
            metadata: {}
          }
          try {
            const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (res.ok) success++; else fail++
          } catch { fail++ }
        }
        await fetchUsers(false)
        alert(`Import completed. Success: ${success}, Failed: ${fail}`)
      } catch (err) {
        console.error('Import error', err)
        alert('Import failed. Please check your file.')
      }
    }
    input.click()
  }

  const getStatusIcon = (user: User) => {
    if (user.is_active && user.is_verified) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    } else if (user.is_active && !user.is_verified) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getRoleBadgeVariant = (role?: string) => {
    if (!role) return "outline"
    if (role.includes("admin")) return "destructive"
    if (role.includes("moderator")) return "secondary"
    return "default"
  }

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    verified: users.filter(u => u.is_verified).length,
    thisMonth: users.filter(u => {
      const userDate = new Date(u.created_at)
      const now = new Date()
      return userDate.getMonth() === now.getMonth() &&
             userDate.getFullYear() === now.getFullYear()
    }).length
  }

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
                    <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Users Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Users Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage user accounts, roles, and permissions
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Scorecard Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total Users</p>
                    <p className="text-xl font-bold">{stats.total}</p>
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
                    <p className="text-xs font-medium text-muted-foreground">Active Users</p>
                    <p className="text-xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Inactive Users</p>
                    <p className="text-xl font-bold text-red-600">{stats.inactive}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">New This Month</p>
                    <p className="text-xl font-bold text-blue-600">{stats.thisMonth}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Calendar className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Layout aligned to reference: compact header + filters + actions */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Users</h2>
                    <p className="text-[11px] text-muted-foreground">Manage user accounts, roles and status</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <div className="relative flex-1 sm:flex-none sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="unverified">Unverified</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <Shield className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTemplateExport}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadJson}
                  >
                    JSON
                  </Button>
                  {selectedUsers.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedUsers.size})
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportUsers}
                    disabled={filteredUsers.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImport}
                  >
                    Upload
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => router.push('/user/add')}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-0 flex-1 flex flex-col min-h-0">
              <div className="rounded-md border flex-1 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="h-auto p-0 font-medium hover:bg-transparent">
                          User
                          <span className="ml-1">{getSortIcon('name')}</span>
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('email')} className="h-auto p-0 font-medium hover:bg-transparent">
                          Email
                          <span className="ml-1">{getSortIcon('email')}</span>
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('role')} className="h-auto p-0 font-medium hover:bg-transparent">
                          Role
                          <span className="ml-1">{getSortIcon('role')}</span>
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('status')} className="h-auto p-0 font-medium hover:bg-transparent">
                          Status
                          <span className="ml-1">{getSortIcon('status')}</span>
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('created_at')} className="h-auto p-0 font-medium hover:bg-transparent">
                          Created
                          <span className="ml-1">{getSortIcon('created_at')}</span>
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                            Loading users...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/50">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell>{getStatusIcon(user)}</TableCell>
                          <TableCell>
                            <div className="font-medium">{user.full_name}</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.roles)}>
                              {user.roles || 'User'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={user.is_active ? "default" : "secondary"}>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {user.is_verified && (
                                <Badge variant="outline" className="ml-1">
                                  Verified
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push(`/user/edit/${user.id}`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Copy Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteUserId(user.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              {searchTerm ? 'No users found matching your search' : 'No users found'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-8 w-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <AppFooter />
      </SidebarInset>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </SidebarProvider>
  )
}