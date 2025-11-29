"use client"

import { useState, useEffect, useMemo } from "react"
import * as React from "react"
import Link from "next/link"
import { AppFooter } from "@/components/layout/app-footer"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/common/protected-route"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/hooks"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
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
  Users,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"

interface Role {
  id: string
  role_name: string
  role_description: string
  is_active: boolean
  created_at: string
  name?: string
}

interface Permission {
  id: string
  name: string
  description?: string
  resource: string
  action: string
  is_active: boolean
}

// Permissions will be loaded from API

export default function RolePermissionsPage() {
  const { refreshPermissions } = useAuth()
  const { toast } = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set())
  const [modified, setModified] = useState(false)
  const itemsPerPage = 10
  const [permissionSearch, setPermissionSearch] = useState("")
  const permissionsPanelRef = React.useRef<HTMLDivElement | null>(null)

  const getRoleName = (r: Role): string => (r.role_name || r.name || "")
  const getRoleDescription = (r: Role): string => (r.role_description || "")

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/users/roles')
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

    const fetchPermissions = async () => {
      try {
        setPermissionsLoading(true)
        const res = await fetch('/api/users/permissions')
        if (res.ok) setPermissions(await res.json())
      } catch (e) {
        console.error('Failed to fetch permissions', e)
      } finally {
        setPermissionsLoading(false)
      }
    }

    fetchRoles()
    fetchPermissions()
  }, [])

  // When role is selected, load its current permission ids
  useEffect(() => {
    const loadRolePermissions = async () => {
      if (!selectedRole) return
      try {
        setPermissionsLoading(true)
        const res = await fetch(`/api/users/role-permissions?role_id=${selectedRole.id}`)
        if (res.ok) {
          const rows: { permission_id: string }[] = await res.json()
          setSelectedPermissionIds(new Set(rows.map(r => r.permission_id)))
          setModified(false)
        }
      } catch (e) {
        console.error('Failed to fetch role-permissions', e)
      } finally {
        setPermissionsLoading(false)
      }
    }
    loadRolePermissions()
  }, [selectedRole])

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
      const matchesSearch = getRoleName(role).toLowerCase().includes(searchTerm.toLowerCase()) ||
                           getRoleDescription(role).toLowerCase().includes(searchTerm.toLowerCase())
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
          aValue = getRoleName(a).toLowerCase()
          bValue = getRoleName(b).toLowerCase()
          break
        case 'role_description':
          aValue = getRoleDescription(a).toLowerCase()
          bValue = getRoleDescription(b).toLowerCase()
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

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    setSelectedPermissionIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(permissionId)
      else next.delete(permissionId)
      return next
    })
    setModified(true)
  }

  const handleAdminToggle = (resource: string, checked: boolean) => {
    // Find all permissions for this resource
    const resourcePermissions = permissions.filter(p => p.resource === resource)
    
    setSelectedPermissionIds(prev => {
      const next = new Set(prev)
      
      if (checked) {
        // Select all permissions for this resource
        resourcePermissions.forEach(perm => next.add(perm.id))
      } else {
        // Deselect all permissions for this resource
        resourcePermissions.forEach(perm => next.delete(perm.id))
      }
      
      return next
    })
    setModified(true)
  }

  const handleCancel = () => {
    // Reset to original state
    setSelectedPermissionIds(new Set())
    setModified(false)
  }

  const handleSelectAllForAction = (action: string, select: boolean) => {
    // Find all permissions for this specific action across all resources
    const actionPermissions = permissions.filter(p => p.action.toLowerCase() === action.toLowerCase())
    
    setSelectedPermissionIds(prev => {
      const next = new Set(prev)
      
      if (select) {
        // Select all permissions for this action
        actionPermissions.forEach(perm => next.add(perm.id))
      } else {
        // Deselect all permissions for this action
        actionPermissions.forEach(perm => next.delete(perm.id))
      }
      
      return next
    })
    setModified(true)
  }

  const handleSavePermissions = async () => {
    if (!selectedRole) return

    try {
      setSaving(true)
      const response = await fetch('/api/users/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: selectedRole.id, permission_ids: Array.from(selectedPermissionIds) })
      })

      if (response.ok) {
        setModified(false)

        // Refresh permissions for the current logged-in user
        // This ensures their UI reflects the updated permissions immediately
        await refreshPermissions()

        toast({
          title: "Permissions Updated",
          description: `Permissions for "${getRoleName(selectedRole)}" have been saved successfully.`,
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update permissions')
      }
    } catch (error) {
      console.error('Error updating permissions:', error)
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Failed to save permissions. Please try again.',
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      })
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRoles = filteredRoles.slice(startIndex, endIndex)

  const permissionsByResource = useMemo(() => {
    const grouped: Record<string, Permission[]> = {}
    for (const p of permissions) {
      const key = p.resource || 'General'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(p)
    }
    // sort actions by name
    Object.values(grouped).forEach(list => list.sort((a,b) => a.action.localeCompare(b.action)))
    return grouped
  }, [permissions])

  const filteredPermissionsByResource = useMemo(() => {
    const q = permissionSearch.trim().toLowerCase()
    if (!q) return permissionsByResource
    const filtered: Record<string, Permission[]> = {}
    for (const [res, list] of Object.entries(permissionsByResource)) {
      const f = list.filter(p =>
        p.resource.toLowerCase().includes(q) ||
        p.action.toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q)
      )
      if (f.length > 0) filtered[res] = f
    }
    return filtered
  }, [permissionSearch, permissionsByResource])

  const toggleAllFilteredPermissions = (select: boolean) => {
    const next = new Set(selectedPermissionIds)
    for (const list of Object.values(filteredPermissionsByResource)) {
      for (const p of list) {
        if (select) next.add(p.id)
        else next.delete(p.id)
      }
    }
    setSelectedPermissionIds(next)
    setModified(true)
  }

  const toggleResourcePermissions = (resource: string, select: boolean) => {
    const next = new Set(selectedPermissionIds)
    const list = filteredPermissionsByResource[resource] || []
    for (const p of list) {
      if (select) next.add(p.id)
      else next.delete(p.id)
    }
    setSelectedPermissionIds(next)
    setModified(true)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, sortColumn, sortDirection])

  return (
    <ProtectedRoute requiredRoles={["admin","super_admin"]} requireAnyRole={true}>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader />

          <div className="flex flex-1 flex-col gap-6 p-6 pt-0 overflow-y-auto">
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
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Shield className="h-8 w-8 text-primary" />
                  Role Permissions
                </h1>
                <p className="text-muted-foreground">
                  Manage permissions and access control for each role in the system
              </p>
            </div>
          </div>

            {/* Role Selection Dropdown */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Role
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select 
                    value={selectedRole?.id || ""} 
                    onValueChange={(value) => {
                      const role = roles.find(r => r.id === value)
                      setSelectedRole(role || null)
                      setSelectedPermissionIds(new Set())
                      setModified(false)
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[500px]">
                      <SelectValue placeholder="Choose a role to manage permissions..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading roles...
                          </div>
                        </SelectItem>
                      ) : (
                        <>
                          {/* Search input inside dropdown */}
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="Search roles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-8 text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          
                          {/* Filtered roles */}
                          {filteredRoles.length > 0 ? (
                            filteredRoles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{getRoleName(role)}</span>
                                    {role.role_description && (
                                      <span className="text-muted-foreground text-sm">
                                        - {role.role_description}
                                      </span>
                                    )}
                                  </div>
                                  <Badge 
                                    variant={getStatusBadgeVariant(role.is_active)} 
                                    className="ml-2"
                                  >
                                    {role.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-roles" disabled>
                              No roles found
                            </SelectItem>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>

            {/* Permissions Table */}
            {selectedRole && (
              <Card className="shadow-sm" ref={permissionsPanelRef}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Permissions for: {selectedRole.role_name}
                    <Badge variant="secondary" className="ml-2">
                      {selectedRole.role_name}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Configure access permissions for this role
                    </p>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => toggleAllFilteredPermissions(true)}
                      >
                        Select All
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => toggleAllFilteredPermissions(false)}
                      >
                        Clear All
                      </Button>
                      {modified && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleCancel}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={handleSavePermissions}
                            disabled={saving}
                            className="gap-2"
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {saving ? "Saving..." : "Save Changes"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {permissionsLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-full" />
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex gap-4">
                            <Skeleton className="h-12 w-32" />
                            <Skeleton className="h-12 w-16" />
                            <Skeleton className="h-12 w-16" />
                            <Skeleton className="h-12 w-16" />
                            <Skeleton className="h-12 w-16" />
                            <Skeleton className="h-12 w-16" />
                            <Skeleton className="h-12 w-16" />
                            <Skeleton className="h-12 w-16" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                          value={permissionSearch} 
                          onChange={(e) => setPermissionSearch(e.target.value)} 
                          placeholder="Search permissions by name, resource or action…" 
                          className="pl-10"
                        />
                      </div>

                      {/* Permissions Table */}
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-[200px] font-semibold text-foreground">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Resource
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold text-foreground">
                                <div className="flex items-center justify-center gap-2">
                                  <Checkbox
                                    id="select-all-admin"
                                    checked={permissions.filter(p => p.action.toLowerCase() === 'admin').every(p => selectedPermissionIds.has(p.id))}
                                    onCheckedChange={(c) => handleSelectAllForAction('admin', c as boolean)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <label htmlFor="select-all-admin" className="cursor-pointer">
                                    Admin
                                  </label>
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold text-foreground">
                                <div className="flex items-center justify-center gap-2">
                                  <Checkbox
                                    id="select-all-view"
                                    checked={permissions.filter(p => p.action.toLowerCase() === 'view').every(p => selectedPermissionIds.has(p.id))}
                                    onCheckedChange={(c) => handleSelectAllForAction('view', c as boolean)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <label htmlFor="select-all-view" className="cursor-pointer">
                                    View
                                  </label>
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold text-foreground">
                                <div className="flex items-center justify-center gap-2">
                                  <Checkbox
                                    id="select-all-create"
                                    checked={permissions.filter(p => p.action.toLowerCase() === 'create').every(p => selectedPermissionIds.has(p.id))}
                                    onCheckedChange={(c) => handleSelectAllForAction('create', c as boolean)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <label htmlFor="select-all-create" className="cursor-pointer">
                                    Create
                                  </label>
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold text-foreground">
                                <div className="flex items-center justify-center gap-2">
                                  <Checkbox
                                    id="select-all-edit"
                                    checked={permissions.filter(p => p.action.toLowerCase() === 'edit').every(p => selectedPermissionIds.has(p.id))}
                                    onCheckedChange={(c) => handleSelectAllForAction('edit', c as boolean)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <label htmlFor="select-all-edit" className="cursor-pointer">
                                    Edit
                                  </label>
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold text-foreground">
                                <div className="flex items-center justify-center gap-2">
                                  <Checkbox
                                    id="select-all-delete"
                                    checked={permissions.filter(p => p.action.toLowerCase() === 'delete').every(p => selectedPermissionIds.has(p.id))}
                                    onCheckedChange={(c) => handleSelectAllForAction('delete', c as boolean)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <label htmlFor="select-all-delete" className="cursor-pointer">
                                    Delete
                                  </label>
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold text-foreground">
                                <div className="flex items-center justify-center gap-2">
                                  <Checkbox
                                    id="select-all-report"
                                    checked={permissions.filter(p => p.action.toLowerCase() === 'report').every(p => selectedPermissionIds.has(p.id))}
                                    onCheckedChange={(c) => handleSelectAllForAction('report', c as boolean)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <label htmlFor="select-all-report" className="cursor-pointer">
                                    Report
                                  </label>
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold text-foreground">
                                <div className="flex items-center justify-center gap-2">
                                  <Checkbox
                                    id="select-all-import"
                                    checked={permissions.filter(p => p.action.toLowerCase() === 'import').every(p => selectedPermissionIds.has(p.id))}
                                    onCheckedChange={(c) => handleSelectAllForAction('import', c as boolean)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <label htmlFor="select-all-import" className="cursor-pointer">
                                    Import
                                  </label>
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold text-foreground">
                                <div className="flex items-center justify-center gap-2">
                                  <Checkbox
                                    id="select-all-export"
                                    checked={permissions.filter(p => p.action.toLowerCase() === 'export').every(p => selectedPermissionIds.has(p.id))}
                                    onCheckedChange={(c) => handleSelectAllForAction('export', c as boolean)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <label htmlFor="select-all-export" className="cursor-pointer">
                                    Export
                                  </label>
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(filteredPermissionsByResource).map(([resource, list]) => {
                              // Group permissions by action type
                              const permissionMap = list.reduce((acc, perm) => {
                                const action = perm.action.toLowerCase()
                                acc[action] = perm
                                return acc
                              }, {} as Record<string, Permission>)

                              const actions = ['admin', 'view', 'create', 'edit', 'delete', 'report', 'import', 'export']
                              
                              // Check if admin is selected for this resource
                              const adminPermission = permissionMap['admin']
                              const isAdminSelected = adminPermission ? selectedPermissionIds.has(adminPermission.id) : false
                              
                              return (
                                <TableRow key={resource} className={`hover:bg-muted/30 transition-colors ${isAdminSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}>
                                  <TableCell className="font-medium py-4">
                                    <div className="flex items-center gap-3">
                                      <div className={`h-3 w-3 rounded-full ${isAdminSelected ? 'bg-primary' : 'bg-muted-foreground'}`} />
                                      <span className="font-semibold">{resource}</span>
                                      {isAdminSelected && (
                                        <Badge variant="secondary" className="text-xs font-medium">
                                          <Shield className="h-3 w-3 mr-1" />
                                          Admin
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  {actions.map((action) => {
                                    const permission = permissionMap[action]
                                    const checked = permission ? selectedPermissionIds.has(permission.id) : false
                                    
                                    return (
                                      <TableCell key={action} className="text-center py-4">
                                        {permission ? (
                                          <div className="flex items-center justify-center">
                                            <Checkbox
                                              id={`${resource}-${action}`}
                                              checked={checked}
                                              onCheckedChange={(c) => {
                                                if (action === 'admin') {
                                                  // If admin is selected/deselected, toggle all permissions for this resource
                                                  handleAdminToggle(resource, c as boolean)
                                                } else {
                                                  // For other actions, just toggle that specific permission
                                                  handlePermissionToggle(permission.id, c as boolean)
                                                }
                                              }}
                                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5"
                                            />
                                          </div>
                                        ) : (
                                          <div className="text-muted-foreground text-xs font-medium">
                                            —
                                          </div>
                                        )}
                                      </TableCell>
                                    )
                                  })}
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {Object.keys(filteredPermissionsByResource).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Search className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No permissions found</h3>
                          <p className="text-muted-foreground">
                            Try adjusting your search criteria
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* No Role Selected State */}
            {!selectedRole && (
              <Card className="shadow-sm">
                <CardContent className="flex items-center justify-center py-16 text-center">
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <Shield className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Select a Role</h3>
                      <p className="text-muted-foreground max-w-sm">
                        Choose a role from the list above to view and manage its permissions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
    </ProtectedRoute>
  )
}