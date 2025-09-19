"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AppFooter } from "@/components/app-footer"
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
import { Checkbox } from "@/components/ui/checkbox"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
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
import {
  Download,
  Upload,
  PlusCircle,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Key,
  Save,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
} from "lucide-react"

interface Role {
  id: string
  role_name: string
  role_description: string
  permissions: Record<string, boolean>
  is_active: boolean
  created_at: string
}

const AVAILABLE_PERMISSIONS = [
  { key: 'dashboard_view', label: 'View Dashboard', category: 'Dashboard' },
  { key: 'users_view', label: 'View Users', category: 'User Management' },
  { key: 'users_create', label: 'Create Users', category: 'User Management' },
  { key: 'users_edit', label: 'Edit Users', category: 'User Management' },
  { key: 'users_delete', label: 'Delete Users', category: 'User Management' },
  { key: 'roles_view', label: 'View Roles', category: 'Role Management' },
  { key: 'roles_create', label: 'Create Roles', category: 'Role Management' },
  { key: 'roles_edit', label: 'Edit Roles', category: 'Role Management' },
  { key: 'roles_delete', label: 'Delete Roles', category: 'Role Management' },
  { key: 'regulations_view', label: 'View Regulations', category: 'Regulations' },
  { key: 'regulations_create', label: 'Create Regulations', category: 'Regulations' },
  { key: 'regulations_edit', label: 'Edit Regulations', category: 'Regulations' },
  { key: 'regulations_delete', label: 'Delete Regulations', category: 'Regulations' },
  { key: 'courses_view', label: 'View Courses', category: 'Courses' },
  { key: 'courses_create', label: 'Create Courses', category: 'Courses' },
  { key: 'courses_edit', label: 'Edit Courses', category: 'Courses' },
  { key: 'courses_delete', label: 'Delete Courses', category: 'Courses' },
  { key: 'batches_view', label: 'View Batches', category: 'Batches' },
  { key: 'batches_create', label: 'Create Batches', category: 'Batches' },
  { key: 'batches_edit', label: 'Edit Batches', category: 'Batches' },
  { key: 'batches_delete', label: 'Delete Batches', category: 'Batches' },
  { key: 'reports_view', label: 'View Reports', category: 'Reports' },
  { key: 'reports_export', label: 'Export Reports', category: 'Reports' },
  { key: 'system_settings', label: 'System Settings', category: 'System' },
]

export default function RolePermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [permissionChanges, setPermissionChanges] = useState<Record<string, boolean>>({})
  const itemsPerPage = 10

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/roles')
        if (response.ok) {
          const data = await response.json()
          setRoles(data)
        } else {
          console.error('Failed to fetch roles')
        }
      } catch (error) {
        console.error('Error fetching roles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRoles()
  }, [])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const filteredRoles = roles
    .filter((role) => {
      const matchesSearch = role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           role.role_description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" ||
                           (statusFilter === "active" && role.is_active) ||
                           (statusFilter === "inactive" && !role.is_active)
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (!sortColumn) return 0

      let aValue: string | boolean
      let bValue: string | boolean

      switch (sortColumn) {
        case 'role_name':
          aValue = a.role_name.toLowerCase()
          bValue = b.role_name.toLowerCase()
          break
        case 'role_description':
          aValue = a.role_description?.toLowerCase() || ''
          bValue = b.role_description?.toLowerCase() || ''
          break
        default:
          return 0
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />
  }

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? "default" : "secondary"
  }

  const getStatusText = (isActive: boolean) => {
    return isActive ? "Active" : "Inactive"
  }

  const handlePermissionChange = (permissionKey: string, checked: boolean) => {
    setPermissionChanges(prev => ({
      ...prev,
      [permissionKey]: checked
    }))
  }

  const handleSavePermissions = async () => {
    if (!selectedRole) return

    try {
      const updatedPermissions = {
        ...selectedRole.permissions,
        ...permissionChanges
      }

      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: updatedPermissions
        })
      })

      if (response.ok) {
        const updatedRole = await response.json()
        setRoles(prev => prev.map(role =>
          role.id === selectedRole.id ? updatedRole : role
        ))
        setSelectedRole(updatedRole)
        setPermissionChanges({})
      }
    } catch (error) {
      console.error('Error updating permissions:', error)
    }
  }

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRoles = filteredRoles.slice(startIndex, endIndex)

  const permissionsByCategory = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, sortColumn, sortDirection])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader />

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
          {/* Breadcrumb Navigation */}
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
                  <BreadcrumbPage>Role Permissions</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Header Section */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Role Permissions</h1>
              <p className="text-xs text-muted-foreground">
                Manage permissions for each role in the system
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
            {/* Roles List */}
            <Card className="flex flex-col">
              <CardHeader className="flex-shrink-0 p-3">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
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

                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search roles…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">
                <div className="rounded-md border overflow-hidden flex-1">
                  <div className="h-full overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                          <TableHead className="text-xs">Role Name</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center text-xs">
                              Loading roles...
                            </TableCell>
                          </TableRow>
                        ) : paginatedRoles.length > 0 ? (
                          paginatedRoles.map((role) => (
                            <TableRow
                              key={role.id}
                              className={selectedRole?.id === role.id ? "bg-muted/50" : ""}
                            >
                              <TableCell className="font-medium text-xs">
                                <div>
                                  <div className="font-semibold">{role.role_name}</div>
                                  {role.role_description && (
                                    <div className="text-muted-foreground text-xs">
                                      {role.role_description}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(role.is_active)} className="text-xs">
                                  {getStatusText(role.is_active)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant={selectedRole?.id === role.id ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRole(role)
                                    setPermissionChanges({})
                                  }}
                                  className="h-7 px-2 text-xs"
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  {selectedRole?.id === role.id ? "Selected" : "Manage"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-xs">
                              No roles found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions Panel */}
            <Card className="flex flex-col">
              <CardHeader className="flex-shrink-0 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">Permissions</h3>
                    {selectedRole && (
                      <p className="text-xs text-muted-foreground">
                        Managing permissions for: {selectedRole.role_name}
                      </p>
                    )}
                  </div>
                  {selectedRole && Object.keys(permissionChanges).length > 0 && (
                    <Button size="sm" onClick={handleSavePermissions} className="h-7 px-2 text-xs">
                      <Save className="h-3 w-3 mr-1" />
                      Save Changes
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-3 pt-0 flex-1">
                {selectedRole ? (
                  <div className="space-y-4 overflow-auto h-full">
                    {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground border-b pb-1">
                          {category}
                        </h4>
                        <div className="space-y-2">
                          {permissions.map((permission) => {
                            const currentValue = permissionChanges.hasOwnProperty(permission.key)
                              ? permissionChanges[permission.key]
                              : selectedRole.permissions?.[permission.key] || false

                            return (
                              <div key={permission.key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={permission.key}
                                  checked={currentValue}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(permission.key, checked as boolean)
                                  }
                                />
                                <label
                                  htmlFor={permission.key}
                                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {permission.label}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Select a role to manage its permissions
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}