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
  LibraryBig,
  FileText,
  Clock,
  TrendingUp,
  Edit,
  Trash2,
} from "lucide-react"

// Regulation type definition
interface Regulation {
  id: number
  regulation_year: number
  regulation_code: string
  status: boolean
  minimum_internal: number
  minimum_external: number
  minimum_attendance: number
  minimum_total: number
  maximum_internal: number
  maximum_external: number
  maximum_total: number
  maximum_qp_marks: number
  condonation_range_start: number
  condonation_range_end: number
  created_at: string
  updated_at: string
}

export default function RegulationsPage() {
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [deleteRegulationId, setDeleteRegulationId] = useState<number | null>(null)
  const itemsPerPage = 10

  // Fetch regulations from API
  useEffect(() => {
    const fetchRegulations = async () => {
      try {
        const response = await fetch('/api/regulations')
        if (response.ok) {
          const data = await response.json()
          setRegulations(data)
        } else {
          const errorData = await response.json()
          console.error('Failed to fetch regulations:', errorData)
          
          // Check if regulations table doesn't exist
          if (errorData.error === 'Regulations table not found') {
            alert(`Database Setup Required:\n\n${errorData.message}\n\nPlease follow the instructions in the console to create the regulations table.`)
            console.log('Setup Instructions:', errorData.instructions)
          }
        }
      } catch (error) {
        console.error('Error fetching regulations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRegulations()
  }, [])

  // Update time every second (client-side only)
  useEffect(() => {
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Filter regulations based on search and filters
  const filteredRegulations = regulations.filter((regulation) => {
    const matchesSearch = regulation.regulation_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         regulation.regulation_year.toString().includes(searchTerm)
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && regulation.status) ||
                         (statusFilter === "inactive" && !regulation.status)
    const matchesYear = yearFilter === "all" || regulation.regulation_year.toString() === yearFilter
    return matchesSearch && matchesStatus && matchesYear
  })

  const getStatusBadgeVariant = (regulation: Regulation) => {
    return regulation.status ? "default" : "secondary"
  }

  const getStatusText = (regulation: Regulation) => {
    return regulation.status ? "Active" : "Inactive"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDeleteRegulation = async (regulationId: number) => {
    try {
      const response = await fetch(`/api/regulations/${regulationId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setRegulations(regulations.filter(regulation => regulation.id !== regulationId))
        setDeleteRegulationId(null)
      } else {
        console.error('Failed to delete regulation')
      }
    } catch (error) {
      console.error('Error deleting regulation:', error)
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

  // Get unique years for year filter
  const uniqueYears = [...new Set(regulations.map(r => r.regulation_year))].sort((a, b) => b - a)

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
                    <BreadcrumbPage>Regulations</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Header Section */}
            <div className="flex items-center justify-between flex-shrink-0">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Regulations</h1>
                <p className="text-sm text-muted-foreground">
                  Manage examination regulations and their details
                </p>
              </div>
            </div>

            {/* Scorecard Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
              {/* Total Regulations */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Regulations</p>
                      <p className="text-2xl font-bold">{regulations.length}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <LibraryBig className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Regulations */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Regulations</p>
                      <p className="text-2xl font-bold text-green-600">
                        {regulations.filter(regulation => regulation.status).length}
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inactive Regulations */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Inactive Regulations</p>
                      <p className="text-2xl font-bold text-red-600">
                        {regulations.filter(regulation => !regulation.status).length}
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                      <LibraryBig className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* New This Month */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {regulations.filter(regulation => {
                          const regulationDate = new Date(regulation.created_at)
                          const now = new Date()
                          return regulationDate.getMonth() === now.getMonth() && regulationDate.getFullYear() === now.getFullYear()
                        }).length}
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Bar */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0 p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {/* Filter Dropdowns */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {uniqueYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Search Bar */}
                    <div className="relative w-full sm:w-[300px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search regulations…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="text-xs px-2">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs px-2">
                      <Upload className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs px-2">
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                    <Button 
                      size="sm" 
                      className="text-xs px-2"
                      onClick={() => window.location.href = '/regulations/add'}
                    >
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Add Regulation
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs px-2">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0 flex-1 flex flex-col min-h-0">
                {/* Data Table */}
                <div className="flex-1 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Code</TableHead>
                        <TableHead className="w-[80px]">Year</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[120px]">Min Attendance</TableHead>
                        <TableHead className="w-[120px]">Min Internal</TableHead>
                        <TableHead className="w-[120px]">Min External</TableHead>
                        <TableHead className="w-[120px]">Created At ↓</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                            Loading regulations...
                          </TableCell>
                        </TableRow>
                      ) : filteredRegulations.length > 0 ? (
                        filteredRegulations.map((regulation) => (
                          <TableRow key={regulation.id}>
                            <TableCell className="font-medium">
                              {regulation.regulation_code}
                            </TableCell>
                            <TableCell>
                              {regulation.regulation_year}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(regulation)}>
                                {getStatusText(regulation)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {regulation.minimum_attendance}%
                            </TableCell>
                            <TableCell>
                              {regulation.minimum_internal}
                            </TableCell>
                            <TableCell>
                              {regulation.minimum_external}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(regulation.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.location.href = `/regulations/edit/${regulation.id}`}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Regulation</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this regulation? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteRegulation(regulation.id)}
                                        className="bg-red-600 hover:bg-red-700"
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
                          <TableCell colSpan={8} className="h-24 text-center">
                            No regulations found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer Info + Pagination */}
                <div className="flex items-center justify-between space-x-2 py-3 mt-3 flex-shrink-0">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredRegulations.length} of {regulations.length} regulations
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-3 w-3 mr-1" />
                      Prev
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      Page {currentPage} of {Math.ceil(filteredRegulations.length / itemsPerPage)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(filteredRegulations.length / itemsPerPage)}
                    >
                      Next
                      <ChevronRight className="h-3 w-3 ml-1" />
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
