"use client"

import { useState, useEffect, useMemo } from "react"
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
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
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

  const getRoleName = (r: Role): string => (r.role_name || r.name || "")
  const getRoleDescription = (r: Role): string => (r.role_description || "")

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

    const fetchPermissions = async () => {
      try {
        const res = await fetch('/api/permissions')
        if (res.ok) setPermissions(await res.json())
      } catch (e) {
        console.error('Failed to fetch permissions', e)
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
        const res = await fetch(`/api/role-permissions?role_id=${selectedRole.id}`)
        if (res.ok) {
          const rows: { permission_id: string }[] = await res.json()
          setSelectedPermissionIds(new Set(rows.map(r => r.permission_id)))
          setModified(false)
        }
      } catch (e) {
        console.error('Failed to fetch role-permissions', e)
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

  const handleSavePermissions = async () => {
    if (!selectedRole) return

    try {
      const response = await fetch('/api/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: selectedRole.id, permission_ids: Array.from(selectedPermissionIds) })
      })

      if (response.ok) setModified(false)
    } catch (error) {
      console.error('Error updating permissions:', error)
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
                                  <div className="font-semibold">{getRoleName(role)}</div>
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
                                      setSelectedPermissionIds(new Set())
                                      setModified(false)
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
                  {selectedRole && modified && (
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
                    {Object.entries(permissionsByResource).map(([resource, list]) => (
                      <div key={resource} className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground border-b pb-1">{resource}</h4>
                        <div className="space-y-2">
                          {list.map((perm) => {
                            const checked = selectedPermissionIds.has(perm.id)
                            const label = `${perm.action} ${perm.name !== perm.action ? `(${perm.name})` : ''}`.trim()
                            return (
                              <div key={perm.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={perm.id}
                                  checked={checked}
                                  onCheckedChange={(c) => handlePermissionToggle(perm.id, c as boolean)}
                                />
                                <label htmlFor={perm.id} className="text-xs font-medium leading-none">
                                  {label}
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