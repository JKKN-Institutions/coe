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
  BookText,
  GraduationCap,
  Clock,
  TrendingUp,
  Edit,
  Trash2,
  FileSpreadsheet,
} from "lucide-react"

// Course type definition
interface Course {
  id: string
  course_code: string
  course_title: string
  course_type: string
  credits: number
  course_level: string
  is_active: boolean
  created_at: string
  updated_at: string
  programs?: {
    id: string
    program_name: string
    program_code: string
  }
  departments?: {
    id: string
    department_name: string
  }
  course_coordinator?: {
    id: string
    full_name: string
    email: string
  }
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null)
  const itemsPerPage = 10

  // Fetch courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/courses')
        if (response.ok) {
          const data = await response.json()
          setCourses(data)
        } else {
          const errorData = await response.json()
          console.error('Failed to fetch courses:', errorData)
          
          // Check if courses table doesn't exist
          if (errorData.error === 'Courses table not found') {
            alert(`Database Setup Required:\n\n${errorData.message}\n\nPlease follow the instructions in the console to create the courses table.`)
            console.log('Setup Instructions:', errorData.instructions)
          }
        }
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  // Update time every second (client-side only)
  useEffect(() => {
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Filter courses based on search and filters
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.course_title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && course.is_active) ||
                         (statusFilter === "inactive" && !course.is_active)
    const matchesType = typeFilter === "all" || course.course_type === typeFilter
    const matchesLevel = levelFilter === "all" || course.course_level === levelFilter
    return matchesSearch && matchesStatus && matchesType && matchesLevel
  })

  const getStatusBadgeVariant = (course: Course) => {
    return course.is_active ? "default" : "secondary"
  }

  const getStatusText = (course: Course) => {
    return course.is_active ? "Active" : "Inactive"
  }

  const getTypeBadgeVariant = (courseType: string) => {
    switch (courseType.toLowerCase()) {
      case 'core': return "default"
      case 'elective': return "secondary"
      case 'practical': return "outline"
      case 'project': return "destructive"
      default: return "default"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setCourses(courses.filter(course => course.id !== courseId))
        setDeleteCourseId(null)
      } else {
        console.error('Failed to delete course')
      }
    } catch (error) {
      console.error('Error deleting course:', error)
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
        <SidebarInset className="flex flex-col min-h-screen">
          <AppHeader />

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
                    <BreadcrumbPage>Courses</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Scorecard Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
              {/* Total Courses */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Courses</p>
                      <p className="text-xl font-bold">{courses.length}</p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <BookText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Courses */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Active Courses</p>
                      <p className="text-xl font-bold text-green-600">
                        {courses.filter(course => course.is_active).length}
                      </p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <GraduationCap className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inactive Courses */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Inactive Courses</p>
                      <p className="text-xl font-bold text-red-600">
                        {courses.filter(course => !course.is_active).length}
                      </p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                      <BookText className="h-3 w-3 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* New This Month */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">New This Month</p>
                      <p className="text-xl font-bold text-blue-600">
                        {courses.filter(course => {
                          const courseDate = new Date(course.created_at)
                          const now = new Date()
                          return courseDate.getMonth() === now.getMonth() && courseDate.getFullYear() === now.getFullYear()
                        }).length}
                      </p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                      <TrendingUp className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Bar */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0 p-3">
                {/* Compact Header like edit page */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookText className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">Courses</h2>
                      <p className="text-[11px] text-muted-foreground">Manage courses and their details</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    {/* Filter Dropdowns */}
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

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Core">Core</SelectItem>
                        <SelectItem value="Elective">Elective</SelectItem>
                        <SelectItem value="Practical">Practical</SelectItem>
                        <SelectItem value="Project">Project</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="All Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Search Bar */}
                    <div className="relative w-full sm:w-[220px]">
                      <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search courses…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 flex-wrap">
                    <Button variant="outline" size="sm" className="text-xs px-2 h-8">
                      <FileSpreadsheet className="h-3 w-3 mr-1" />
                      Template
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs px-2 h-8">
                      <Download className="h-3 w-3 mr-1" />
                      Json
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs px-2 h-8">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs px-2 h-8">
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                    <Button 
                      size="sm" 
                      className="text-xs px-2 h-8"
                      onClick={() => window.location.href = '/courses/add'}
                    >
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">
                {/* Data Table */}
                <div className="rounded-md border overflow-hidden" style={{ height: '440px' }}>
                  <div className="h-full overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                          <TableHead className="w-[120px] text-[11px]">Course Code</TableHead>
                          <TableHead className="text-[11px]">Course Title</TableHead>
                          <TableHead className="w-[100px] text-[11px]">Type</TableHead>
                          <TableHead className="w-[80px] text-[11px]">Credits</TableHead>
                          <TableHead className="w-[100px] text-[11px]">Level</TableHead>
                          <TableHead className="w-[100px] text-[11px]">Status</TableHead>
                          <TableHead className="w-[120px] text-[11px]">Created At</TableHead>
                          <TableHead className="w-[120px] text-[11px] text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center text-[11px]">
                              Loading courses...
                            </TableCell>
                          </TableRow>
                        ) : filteredCourses.length > 0 ? (
                          <>
                            {filteredCourses.map((course) => (
                              <TableRow key={course.id}>
                                <TableCell className="font-medium text-[11px]">
                                  {course.course_code}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-[11px]">{course.course_title}</div>
                                    {course.programs && (
                                      <div className="text-[10px] text-muted-foreground">
                                        {course.programs.program_name} ({course.programs.program_code})
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getTypeBadgeVariant(course.course_type)} className="text-[11px]">
                                    {course.course_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-[11px]">{course.credits}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[11px]">
                                    {course.course_level}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusBadgeVariant(course)} className="text-[11px]">
                                    {getStatusText(course)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-[11px] text-muted-foreground">
                                  {formatDate(course.created_at)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.location.href = `/courses/edit/${course.id}`}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Course</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this course? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteCourse(course.id)}
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
                            ))}
                            {/* Fill empty rows to maintain consistent height */}
                            {Array.from({ length: Math.max(0, itemsPerPage - filteredCourses.length) }).map((_, index) => (
                              <TableRow key={`empty-${index}`}>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
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
                              <TableCell colSpan={8} className="text-center text-xs">
                                No courses found.
                              </TableCell>
                            </TableRow>
                            {/* Fill remaining rows */}
                            {Array.from({ length: itemsPerPage - 1 }).map((_, index) => (
                              <TableRow key={`empty-no-data-${index}`}>
                                <TableCell>&nbsp;</TableCell>
                                <TableCell>&nbsp;</TableCell>
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

                {/* Pagination Controls */}
                <div className="flex items-center justify-between space-x-2 py-2 mt-2">
                  <div className="text-xs text-muted-foreground">
                    Showing {filteredCourses.length === 0 ? 0 : 1}-{Math.min(itemsPerPage, filteredCourses.length)} of {filteredCourses.length} courses
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
                      Page {currentPage} of {Math.ceil(filteredCourses.length / itemsPerPage) || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredCourses.length / itemsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil(filteredCourses.length / itemsPerPage)}
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
    </div>
  )
}
