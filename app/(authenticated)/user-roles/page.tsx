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
  Users,
  Shield,
  UserPlus,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
} from "lucide-react"

interface User {
  id: string
  full_name: string
  email: string
  role_id?: string
  roles?: {
    id: string
    role_name: string
    role_description: string
    is_active: boolean
  }
  created_at: string
  is_active: boolean
}

interface Role {
  id: string
  role_name: string
  role_description: string
  is_active: boolean
}

export default function UserRolesPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkRoleId, setBulkRoleId] = useState("")
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users and roles
        const [usersResponse, rolesResponse] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/roles')
        ])

        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData)
        }

        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json()
          setRoles(rolesData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const filteredUsers = users
    .filter((user) => {
      const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = roleFilter === "all" || user.role_id === roleFilter
      const matchesStatus = statusFilter === "all" ||
                           (statusFilter === "active" && user.is_active) ||
                           (statusFilter === "inactive" && !user.is_active)
      return matchesSearch && matchesRole && matchesStatus
    })
    .sort((a, b) => {
      if (!sortColumn) return 0

      let aValue: string | boolean
      let bValue: string | boolean

      switch (sortColumn) {
        case 'full_name':
          aValue = a.full_name.toLowerCase()
          bValue = b.full_name.toLowerCase()
          break
        case 'email':
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
          break
        case 'role_name':
          aValue = a.roles?.role_name?.toLowerCase() || ''
          bValue = b.roles?.role_name?.toLowerCase() || ''
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

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelection = new Set(selectedUsers)
    if (checked) {
      newSelection.add(userId)
    } else {
      newSelection.delete(userId)
    }
    setSelectedUsers(newSelection)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allUserIds = paginatedUsers.map(user => user.id)
      setSelectedUsers(new Set(allUserIds))
    } else {
      setSelectedUsers(new Set())
    }
  }

  const handleInlineRoleChange = async (userId: string, newRoleId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: newRoleId })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(prev => prev.map(user =>
          user.id === userId ? updatedUser : user
        ))
        setEditingUserId(null)
      }
    } catch (error) {
      console.error('Error updating user role:', error)
    }
  }

  const handleBulkRoleAssign = async () => {
    if (!bulkRoleId || selectedUsers.size === 0) return

    try {
      const promises = Array.from(selectedUsers).map(userId =>
        fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_id: bulkRoleId })
        })
      )

      const responses = await Promise.all(promises)
      const allSuccessful = responses.every(response => response.ok)

      if (allSuccessful) {
        // Refetch the updated users to get the full role data
        const updatedUsersPromises = Array.from(selectedUsers).map(userId =>
          fetch(`/api/users/${userId}`).then(res => res.json())
        )
        const updatedUsers = await Promise.all(updatedUsersPromises)

        setUsers(prev => prev.map(user => {
          const updatedUser = updatedUsers.find(u => u.id === user.id)
          return updatedUser || user
        }))
        setSelectedUsers(new Set())
        setBulkRoleId("")
      }
    } catch (error) {
      console.error('Error bulk updating user roles:', error)
    }
  }

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter, statusFilter, sortColumn, sortDirection])

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
                  <BreadcrumbPage>User Roles</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Header Section */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-xl font-bold tracking-tight">User Role Assignment</h1>
              <p className="text-xs text-muted-foreground">
                Assign roles to users and manage user permissions
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
                    <p className="text-xl font-bold">{users.length}</p>
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
                    <p className="text-xs font-medium text-muted-foreground">Assigned Roles</p>
                    <p className="text-xl font-bold text-green-600">
                      {users.filter(user => user.role_id).length}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <Shield className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Unassigned</p>
                    <p className="text-xl font-bold text-orange-600">
                      {users.filter(user => !user.role_id).length}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <UserPlus className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Available Roles</p>
                    <p className="text-xl font-bold text-purple-600">
                      {roles.filter(role => role.is_active).length}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Shield className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Bar */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">User Roles</h2>
                    <p className="text-[11px] text-muted-foreground">Assign and manage user roles</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>{role.role_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

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
                    <Input
                      placeholder="Search users…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {selectedUsers.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Select value={bulkRoleId} onValueChange={setBulkRoleId}>
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.filter(role => role.is_active).map(role => (
                            <SelectItem key={role.id} value={role.id}>{role.role_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleBulkRoleAssign}
                        disabled={!bulkRoleId}
                        size="sm"
                        className="text-xs h-8"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Assign ({selectedUsers.size})
                      </Button>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="text-xs px-1 h-8">
                    <Settings className="h-3 w-3" />
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
                        <TableHead className="w-[50px] text-xs">
                          <Checkbox
                            checked={paginatedUsers.length > 0 && paginatedUsers.every(user => selectedUsers.has(user.id))}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all users"
                          />
                        </TableHead>
                        <TableHead className="w-[180px] text-xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('full_name')}
                            className="h-auto p-0 font-medium hover:bg-transparent"
                          >
                            Full Name
                            <span className="ml-1">
                              {getSortIcon('full_name')}
                            </span>
                          </Button>
                        </TableHead>
                        <TableHead className="w-[180px] text-xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('email')}
                            className="h-auto p-0 font-medium hover:bg-transparent"
                          >
                            Email
                            <span className="ml-1">
                              {getSortIcon('email')}
                            </span>
                          </Button>
                        </TableHead>
                        <TableHead className="w-[160px] text-xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('role_name')}
                            className="h-auto p-0 font-medium hover:bg-transparent"
                          >
                            Current Role
                            <span className="ml-1">
                              {getSortIcon('role_name')}
                            </span>
                          </Button>
                        </TableHead>
                        <TableHead className="w-[100px] text-xs">Status</TableHead>
                        <TableHead className="w-[100px] text-xs text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-xs">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : paginatedUsers.length > 0 ? (
                        <>
                          {paginatedUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedUsers.has(user.id)}
                                  onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                                  aria-label={`Select ${user.full_name}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium text-xs">
                                {user.full_name}
                              </TableCell>
                              <TableCell className="text-xs">
                                {user.email}
                              </TableCell>
                              <TableCell>
                                {editingUserId === user.id ? (
                                  <Select
                                    value={user.role_id || ""}
                                    onValueChange={(value) => handleInlineRoleChange(user.id, value)}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="">Unassigned</SelectItem>
                                      {roles.filter(role => role.is_active).map(role => (
                                        <SelectItem key={role.id} value={role.id}>{role.role_name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {user.roles?.role_name ? (
                                      <Badge variant="outline" className="text-xs">
                                        {user.roles.role_name}
                                      </Badge>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Unassigned</span>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(user.is_active)} className="text-xs">
                                  {getStatusText(user.is_active)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setEditingUserId(editingUserId === user.id ? null : user.id)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {Array.from({ length: Math.max(0, itemsPerPage - paginatedUsers.length) }).map((_, index) => (
                            <TableRow key={`empty-${index}`}>
                              <TableCell>&nbsp;</TableCell>
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
                            <TableCell colSpan={6} className="text-center text-xs">
                              No users found.
                            </TableCell>
                          </TableRow>
                          {Array.from({ length: itemsPerPage - 1 }).map((_, index) => (
                            <TableRow key={`empty-no-data-${index}`}>
                              <TableCell>&nbsp;</TableCell>
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
                  Showing {filteredUsers.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
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
                  <div className="text-xs text-muted-foreground px-2">
                    Page {currentPage} of {totalPages || 1}
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
            </CardContent>
          </Card>
        </div>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}