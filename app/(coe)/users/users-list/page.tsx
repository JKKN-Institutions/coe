"use client"

import { useState, useEffect, useMemo } from "react"
import XLSX from "@/lib/utils/excel-compat"
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
import { Label } from "@/components/ui/label"
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { ProtectedRoute } from "@/components/common/protected-route"
import { AppHeader } from "@/components/layout/app-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppFooter } from "@/components/layout/app-footer"
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
import { useToast } from "@/hooks/common/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Edit,
  Trash2,
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
  PlusCircle,
  Save,
  X,
} from "lucide-react"

// Import types from centralized module
import type {
	User,
	Institution,
	Role,
	UserFormData as FormDataType,
	UserPayload,
} from '@/types/user'

// Import service layer functions
import {
	fetchUsers as fetchUsersService,
	fetchInstitutions as fetchInstitutionsService,
	fetchRoles as fetchRolesService,
	createUser,
	updateUser,
	deleteUser as deleteUserService,
	toggleUserStatus,
} from '@/services/users/user-service'

// Import validation utilities
import {
	validateUserFormData,
	validateEmail,
} from '@/lib/utils/user/validation'

// Import export/import utilities
import {
	exportToJSON,
	exportToExcel,
	exportTemplate,
} from '@/lib/utils/user/export-import'

export default function UsersPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const itemsPerPage = 10

  // Sheet state for add/edit
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Form data
  const [formData, setFormData] = useState({
    institution_code: "",
    institution_id: "",
    full_name: "",
    email: "",
    phone_number: "",
    is_active: true,
    roles: [] as string[], // Changed from single role to multiple roles
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [roleSearchTerm, setRoleSearchTerm] = useState("")

  const fetchUsers = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      const data = await fetchUsersService(searchTerm)
      if (Array.isArray(data)) {
        setUsers(data)
      } else {
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

  const fetchInstitutions = async () => {
    try {
      const data = await fetchInstitutionsService()
      setInstitutions(data)
    } catch (error) {
      console.error('Error fetching institutions:', error)
      setInstitutions([])
    }
  }

  const fetchRoles = async () => {
    try {
      const data = await fetchRolesService()
      setRoles(data)
    } catch (error) {
      console.error('Error fetching roles:', error)
      setRoles([])
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchInstitutions()
    fetchRoles()
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

  const resetForm = () => {
    setFormData({
      institution_code: "",
      institution_id: "",
      full_name: "",
      email: "",
      phone_number: "",
      is_active: true,
      roles: [], // Reset to empty array for multiple roles
    })
    setErrors({})
    setEditing(null)
    setRoleSearchTerm("")
  }

  const openAdd = () => {
    resetForm()
    setSheetOpen(true)
  }

  const openEdit = async (user: User) => {
    setEditing(user)

    // Fetch user's roles from user_roles table
    try {
      const response = await fetch(`/api/users/users-list/${user.id}/roles`)
      let userRoles: string[] = []

      if (response.ok) {
        const rolesData = await response.json()
        userRoles = rolesData.roles || []
      } else {
        // Fallback to legacy role field if user_roles fetch fails
        userRoles = user.role ? [user.role] : []
      }

      setFormData({
        institution_code: user.institution_code || "",
        institution_id: user.institution_id || "",
        full_name: user.full_name || "",
        email: user.email || "",
        phone_number: user.phone_number || user.phone || "",
        is_active: user.is_active ?? true,
        roles: userRoles, // Load multiple roles from user_roles table
      })
    } catch (error) {
      console.error('Error fetching user roles:', error)
      // Fallback to legacy role field
      setFormData({
        institution_code: user.institution_code || "",
        institution_id: user.institution_id || "",
        full_name: user.full_name || "",
        email: user.email || "",
        phone_number: user.phone_number || user.phone || "",
        is_active: user.is_active ?? true,
        roles: user.role ? [user.role] : [],
      })
    }

    setSheetOpen(true)
  }

  const validate = () => {
    const e = validateUserFormData(formData)
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    
    try {
      setLoading(true)
      
      // Find institution_id from institution_code
      const selectedInstitution = institutions.find(inst => inst.institution_code === formData.institution_code)
      const submitData = {
        ...formData,
        institution_id: selectedInstitution?.institution_code || formData.institution_code,
        username: formData.email, // Auto-set username to email
        is_verified: true
      }
      
      if (editing) {
        // Update existing user
        const response = await fetch(`/api/users/users-list/${editing.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        })
        
        if (!response.ok) {
          throw new Error('Failed to update user')
        }
        
        const updatedUser = await response.json()
        setUsers((prev) => prev.map((u) => (u.id === editing.id ? updatedUser : u)))
      } else {
        // Create new user
        const response = await fetch('/api/users/users-list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        })
        
        if (!response.ok) {
          throw new Error('Failed to create user')
        }
        
        const newUser = await response.json()
        setUsers((prev) => [newUser, ...prev])
      }
      
      setSheetOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving user:', error)
      toast({
        title: "❌ Save Failed",
        description: "Failed to save user. Please try again.",
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredRoles = useMemo(() => {
    if (!roleSearchTerm.trim()) return roles
    const search = roleSearchTerm.toLowerCase()
    return roles.filter(role => role.name.toLowerCase().includes(search))
  }, [roles, roleSearchTerm])

  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase()
    const data = users
      .filter((user) => [user.full_name, user.email, user.phone_number || user.phone, user.institution_code].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      .filter((user) => {
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && user.is_active) ||
          (statusFilter === "inactive" && !user.is_active) ||
          (statusFilter === "verified" && user.is_verified) ||
          (statusFilter === "unverified" && !user.is_verified)

        const matchesRole =
          roleFilter === "all" ||
          user.role?.toLowerCase() === roleFilter.toLowerCase()

        return matchesStatus && matchesRole
      })

    if (!sortColumn) return data
    const sorted = [...data].sort((a, b) => {
      const av = (a as any)[sortColumn]
      const bv = (b as any)[sortColumn]
      if (av === bv) return 0
      if (sortDirection === "asc") return av > bv ? 1 : -1
      return av < bv ? 1 : -1
    })
    return sorted
  }, [users, searchTerm, statusFilter, roleFilter, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  useEffect(() => setCurrentPage(1), [searchTerm, sortColumn, sortDirection])

  const handleDeleteUser = async () => {
    if (!deleteUserId) return

    try {
      const response = await fetch(`/api/users/users-list/${deleteUserId}`, {
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

  const remove = async (id: string) => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/users/users-list/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete user')
      }
      
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: "❌ Delete Failed",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return

    try {
      const promises = Array.from(selectedUsers).map(userId =>
        fetch(`/api/users/users-list/${userId}`, { method: 'DELETE' })
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
      ['ID', 'Institution Code', 'Full Name', 'Email', 'Phone Number', 'Role', 'Status', 'Verified', 'Created At'],
      ...filteredUsers.map(user => [
        user.id,
        user.institution_code || '',
        user.full_name,
        user.email,
        user.phone_number || user.phone || '',
        user.role || 'user',
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
    exportToJSON(filteredUsers)
  }

  const handleTemplateExport = () => {
    exportTemplate()
  }

  const handleExportXlsx = () => {
    exportToExcel(filteredUsers)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        let items: { institution_code: string; full_name: string; email: string; role?: string; phone_number?: string; is_active?: boolean; is_verified?: boolean; institution_id?: string }[] = []
        if (file.name.endsWith('.json')) {
          const text = await file.text()
          const parsed = JSON.parse(text) as any[]
          items = parsed.map(p => ({
            institution_code: p.institution_code || p['Institution Code'] || '',
            full_name: p.full_name || p['Full Name'] || '',
            email: p.email || p['Email'] || '',
            role: p.role || p['Role'] || 'user',
            phone_number: p.phone_number || p['Phone Number'] || p.phone || p['Phone'] || '',
            is_active: typeof p.is_active === 'boolean' ? p.is_active : (String(p.Status || p.Active || '').toLowerCase() === 'active'),
            is_verified: typeof p.is_verified === 'boolean' ? p.is_verified : (String(p.Verified || '').toLowerCase().startsWith('y')),
            institution_id: p.institution_id || p['Institution Id'] || ''
          }))
        } else if (file.name.endsWith('.csv')) {
          const text = await file.text()
          const [headerLine, ...lines] = text.split(/\r?\n/)
          const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''))
          const idx = (re: RegExp) => headers.findIndex(h => re.test(h))
          const instCodeIdx = idx(/institution code|institution_code/i)
          const nameIdx = idx(/full name|full_name|name/i)
          const emailIdx = idx(/email/i)
          const roleIdx = idx(/role/i)
          const phoneIdx = idx(/phone number|phone_number|phone/i)
          const activeIdx = idx(/status|active|is_active/i)
          const verifiedIdx = idx(/verified|is_verified/i)
          const instIdx = idx(/institution id|institution_id/i)
          for (const line of lines) {
            if (!line.trim()) continue
            const vals = line.match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/"/g, '').trim()) || []
            items.push({
              institution_code: vals[instCodeIdx] || '',
              full_name: vals[nameIdx] || '',
              email: vals[emailIdx] || '',
              role: vals[roleIdx] || 'user',
              phone_number: vals[phoneIdx] || '',
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
            institution_code: String(row['Institution Code *'] || row['Institution Code'] || row['institution_code'] || ''),
            full_name: String(row['Full Name *'] || row['Full Name'] || row['full_name'] || row['Name'] || ''),
            email: String(row['Email *'] || row['Email'] || row['email'] || ''),
            role: String(row['Role'] || row['role'] || 'user'),
            phone_number: String(row['Phone Number'] || row['phone_number'] || row['Phone'] || row['phone'] || ''),
            is_active: String(row['Status'] || row['Active'] || row['is_active'] || '').toLowerCase() === 'active',
            is_verified: String(row['Verified'] || row['is_verified'] || '').toLowerCase().startsWith('y'),
            institution_id: String(row['Institution Id'] || row['institution_id'] || '')
          }))
        }

        let success = 0
        let fail = 0
        for (const item of items) {
          if (!item.email || !item.full_name || !item.institution_code) { fail++; continue }
          const payload = {
            institution_code: item.institution_code,
            institution_id: item.institution_code, // Use institution_code as institution_id
            full_name: item.full_name,
            email: item.email,
            username: item.email,
            phone_number: item.phone_number || '',
            is_active: item.is_active ?? true,
            is_verified: item.is_verified ?? true,
            role: item.role || 'user',
            preferences: {},
            metadata: {}
          }
          try {
            const res = await fetch('/api/users/users-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
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
              <h1 className="text-xl font-bold tracking-tight">Users Management</h1>
              <p className="text-xs text-muted-foreground">
                Manage user accounts, roles, and permissions
              </p>
            </div>

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
                      className="pl-9 h-8 text-xs"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Status</SelectItem>
                      <SelectItem value="active" className="text-xs">Active</SelectItem>
                      <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                      <SelectItem value="verified" className="text-xs">Verified</SelectItem>
                      <SelectItem value="unverified" className="text-xs">Unverified</SelectItem>
                    </SelectContent>
                  </Select>

                 
                </div>

                <div className="flex gap-2 flex-wrap">
                <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing} className="text-xs h-8">
              <RefreshCcw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTemplateExport}
                    className="text-xs h-8"
                  >
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                    Template
                  </Button>

                  {selectedUsers.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="text-xs h-8"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete ({selectedUsers.size})
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportUsers}
                    disabled={filteredUsers.length === 0}
                    className="text-xs h-8"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImport}
                    className="text-xs h-8"
                  >
                    Upload
                  </Button>

                  <Button
                    size="sm"
                    onClick={openAdd}
                    disabled={loading}
                    className="text-xs h-8"
                  >
                    <PlusCircle className="h-3 w-3 mr-1" />
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
                      <TableHead className="w-12 text-[11px]"></TableHead>
                      <TableHead className="text-[11px]">
                        <Button variant="ghost" size="sm" onClick={() => handleSort('institution_code')} className="h-auto p-0 font-medium hover:bg-transparent text-[11px]">
                          Institution Code
                          <span className="ml-1">{getSortIcon('institution_code')}</span>
                        </Button>
                      </TableHead>
                      <TableHead className="text-[11px]">
                        <Button variant="ghost" size="sm" onClick={() => handleSort('full_name')} className="h-auto p-0 font-medium hover:bg-transparent text-[11px]">
                          Full Name
                          <span className="ml-1">{getSortIcon('full_name')}</span>
                        </Button>
                      </TableHead>
                      <TableHead className="text-[11px]">
                        <Button variant="ghost" size="sm" onClick={() => handleSort('email')} className="h-auto p-0 font-medium hover:bg-transparent text-[11px]">
                          Email
                          <span className="ml-1">{getSortIcon('email')}</span>
                        </Button>
                      </TableHead>
                      <TableHead className="text-[11px]">
                        <Button variant="ghost" size="sm" onClick={() => handleSort('phone_number')} className="h-auto p-0 font-medium hover:bg-transparent text-[11px]">
                          Phone Number
                          <span className="ml-1">{getSortIcon('phone_number')}</span>
                        </Button>
                      </TableHead>

                      <TableHead className="text-[11px]">
                        <Button variant="ghost" size="sm" onClick={() => handleSort('is_active')} className="h-auto p-0 font-medium hover:bg-transparent text-[11px]">
                          Status
                          <span className="ml-1">{getSortIcon('is_active')}</span>
                        </Button>
                      </TableHead>
                      <TableHead className="text-right text-[11px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center">
                          <div className="flex items-center justify-center gap-2 text-xs">
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
                            <div className="font-medium text-[11px]">{user.institution_code || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-[11px]">{user.full_name}</div>
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">{user.email}</TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">{user.phone_number || user.phone || '-'}</TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={user.is_active ? "default" : "secondary"} className="text-[11px]">
                                {user.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {user.is_verified && (
                                <Badge variant="outline" className="ml-1 text-[11px]">
                                  Verified
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(user)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {user.full_name}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => remove(user.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
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
                  <div className="text-xs text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
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
                            className="h-7 w-7 p-0 text-xs"
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
                      className="h-7 px-2 text-xs"
                    >
                      Next
                      <ChevronRight className="h-3 w-3 ml-1" />
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

      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) resetForm(); setSheetOpen(o) }}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader className="pb-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {editing ? "Edit User" : "Add User"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editing ? "Update user information" : "Create a new user record"}
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Institution Code */}
                <div className="space-y-2">
                  <Label htmlFor="institution_code" className="text-xs font-semibold">
                    Institution Code <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.institution_code} onValueChange={(value) => setFormData({ ...formData, institution_code: value })}>
                    <SelectTrigger className={`h-8 text-xs ${errors.institution_code ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select institution" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions.map((institution) => (
                        <SelectItem key={institution.id} value={institution.institution_code} className="text-xs">
                          {institution.institution_code} - {institution.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.institution_code && <p className="text-[10px] text-destructive">{errors.institution_code}</p>}
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-xs font-semibold">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className={`h-8 text-xs ${errors.full_name ? 'border-destructive' : ''}`}
                    placeholder="Enter full name"
                  />
                  {errors.full_name && <p className="text-[10px] text-destructive">{errors.full_name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`h-8 text-xs ${errors.email ? 'border-destructive' : ''}`}
                    placeholder="Enter email address"
                  />
                  {errors.email && <p className="text-[10px] text-destructive">{errors.email}</p>}
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="text-xs font-medium">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Roles (Multi-Select) */}
                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="roles" className="text-sm font-semibold">
                      Assign Roles
                    </Label>
                    {formData.roles.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {formData.roles.length} selected
                      </Badge>
                    )}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search roles..."
                      value={roleSearchTerm}
                      onChange={(e) => setRoleSearchTerm(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>

                  {/* Roles Checkbox List */}
                  <div className="border rounded-lg p-3 space-y-2 min-h-[120px] max-h-[180px] overflow-y-auto bg-muted/20">
                    {roles.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-muted-foreground">
                        <p className="text-sm">No roles available</p>
                      </div>
                    ) : filteredRoles.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-muted-foreground">
                        <p className="text-sm">No roles match "{roleSearchTerm}"</p>
                      </div>
                    ) : (
                      filteredRoles.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            id={`role-${r.id}`}
                            checked={formData.roles.includes(r.name)}
                            onChange={(e) => {
                              const isChecked = e.target.checked
                              const updatedRoles = isChecked
                                ? [...formData.roles, r.name]
                                : formData.roles.filter(role => role !== r.name)
                              setFormData({ ...formData, roles: updatedRoles })
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0"
                          />
                          <Label
                            htmlFor={`role-${r.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                          </Label>
                          {formData.roles.includes(r.name) && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Selected Roles - Horizontal Scroll */}
                  {formData.roles.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Selected Roles:</Label>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {formData.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="text-xs whitespace-nowrap flex items-center gap-1 px-3 py-1"
                          >
                            <Shield className="h-3 w-3" />
                            {role}
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, roles: formData.roles.filter(r => r !== role) })}
                              className="ml-1 hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs font-medium">Status</Label>
                  <Select value={formData.is_active ? 'active' : 'inactive'} onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active" className="text-xs">Active</SelectItem>
                      <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-6 text-xs"
                onClick={() => { setSheetOpen(false); resetForm() }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 px-6 text-xs"
                onClick={save}
                disabled={loading}
              >
                {loading ? "Saving..." : editing ? "Update User" : "Create User"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Toaster />
    </SidebarProvider>
    </ProtectedRoute>
  )
}