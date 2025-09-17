"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
import { StatusBadge } from "@/components/ui/status-badge"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle"
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
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  Edit,
  Trash2,
} from "lucide-react"

// User type definition
interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  is_active: boolean
  is_verified: boolean
  role: string
  created_at: string
  updated_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const itemsPerPage = 10

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          setUsers(data)
        } else {
          console.error('Failed to fetch users')
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Update time every second (client-side only)
  useEffect(() => {
    // Set initial time on client side only to prevent hydration mismatch
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Filter users based on search and status
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && user.is_active) ||
                         (statusFilter === "inactive" && !user.is_active) ||
                         (statusFilter === "pending" && !user.is_verified)
    return matchesSearch && matchesStatus
  })

  const getStatusBadgeVariant = (user: User) => {
    if (user.is_active) return "default"
    if (!user.is_verified) return "outline"
    return "secondary"
  }

  const getStatusText = (user: User) => {
    if (user.is_active) return "Active"
    if (!user.is_verified) return "Pending"
    return "Inactive"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Remove user from local state
        setUsers(users.filter(user => user.id !== userId))
        setDeleteUserId(null)
      } else {
        console.error('Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const formatCurrentDateTime = (date: Date | null) => {
    if (!date) return "Loading..."
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
    
    return `${day}-${month}-${year} | ${weekday} | ${time}`
  }

  return (
    <div className="h-screen">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen">
          {/* Main Header */}
          <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background text-foreground">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1 text-foreground hover:bg-accent" />
              <Separator orientation="vertical" className="mr-2 h-6 bg-border" />
              <div>
                <div className="text-base md:text-lg font-semibold">JKKN Controller of Examination Portal</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">
                  {formatCurrentDateTime(currentTime)}
                </div>
              </div>
              <ModeToggle />
            </div>
          </header>

          {/* Secondary Header with Breadcrumb */}

          <div className="flex flex-col flex-1 p-3 space-y-3 overflow-y-auto">
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
                  <BreadcrumbPage>Users</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Header Section */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="space-y-1">
              <h1 className="text-heading">Users</h1>
              <p className="text-subheading">
                Manage users and their details
              </p>
            </div>
          </div>

          {/* Scorecard Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
            {/* Total Users */}
            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold text-success">
                      {users.filter(user => user.is_active).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inactive Users */}
            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Inactive Users</p>
                    <p className="text-2xl font-bold text-destructive">
                      {users.filter(user => !user.is_active).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <UserX className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New This Month */}
            <Card className="hover-lift animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                    <p className="text-2xl font-bold text-info">
                      {users.filter(user => {
                        const userDate = new Date(user.created_at)
                        const now = new Date()
                        return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear()
                      }).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-info" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Bar */}
          <Card className="flex-1 flex flex-col min-h-0 hover-lift">
            <CardHeader className="flex-shrink-0 p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  {/* Filter Dropdown */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search users…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="hover-lift">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" className="hover-lift">
                    <Upload className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" className="hover-lift">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                  <Button 
                    size="sm" 
                    className="hover-lift"
                    onClick={() => window.location.href = '/user/add'}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                  <Button variant="outline" size="sm" className="hover-lift">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-0 flex-1 flex flex-col min-h-0">
              {/* Data Table */}
              <div className="flex-1 rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[100px] font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Contact</TableHead>
                      <TableHead className="w-[100px] font-semibold">Status</TableHead>
                      <TableHead className="w-[120px] font-semibold">Created At ↓</TableHead>
                      <TableHead className="w-[100px] font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="text-muted-foreground">Loading users...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map((user, index) => (
                        <TableRow 
                          key={user.id} 
                          className="hover:bg-muted/50 transition-colors animate-slide-up"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <TableCell className="font-mono text-sm">
                            {user.id.slice(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{user.full_name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {user.phone || <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                          <TableCell>
                            <StatusBadge 
                              variant={user.is_active ? "success" : user.is_verified ? "secondary" : "warning"}
                              size="sm"
                            >
                              {getStatusText(user)}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(user.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = `/user/edit/${user.id}`}
                                className="h-8 w-8 p-0 hover-lift"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 hover-lift"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this user? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground">No users found.</p>
                            <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Footer Info + Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 mt-4 flex-shrink-0 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{filteredUsers.length}</span> of <span className="font-medium">{users.length}</span> users
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="hover-lift"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 px-3 py-1 rounded-md bg-muted text-sm">
                    Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{Math.ceil(filteredUsers.length / itemsPerPage)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(filteredUsers.length / itemsPerPage)}
                    className="hover-lift"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Footer */}
          <footer className="flex h-12 shrink-0 items-center justify-center bg-muted/50 border-t px-6">
            <p className="text-sm text-muted-foreground">
              Developed by JKKN Educational Institution © {new Date().getFullYear()}. All Rights Reserved.
            </p>
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}