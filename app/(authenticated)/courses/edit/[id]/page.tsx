"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle"
import { Save, X, ArrowLeft } from "lucide-react"

interface Course {
  id: string
  program_id: string
  course_code: string
  course_title: string
  course_type: string
  credits: number
  contact_hours: {
    lecture: number
    tutorial: number
    practical: number
  }
  prerequisites: string[]
  corequisites: string[]
  course_level: string
  offering_department_id?: string
  course_coordinator_id?: string
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

interface Program {
  id: string
  program_name: string
  program_code: string
}

interface Department {
  id: string
  department_name: string
}

interface User {
  id: string
  full_name: string
  email: string
}

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [course, setCourse] = useState<Course | null>(null)
  
  const [formData, setFormData] = useState({
    program_id: "",
    course_code: "",
    course_title: "",
    course_type: "",
    credits: "",
    contact_hours: {
      lecture: 0,
      tutorial: 0,
      practical: 0
    },
    prerequisites: [] as string[],
    corequisites: [] as string[],
    course_level: "Beginner",
    offering_department_id: "",
    course_coordinator_id: "",
    is_active: true
  })

  // Update time every second
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Fetch course data and related data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch course data
        const courseResponse = await fetch(`/api/courses/${courseId}`)
        if (courseResponse.ok) {
          const courseData: Course = await courseResponse.json()
          setCourse(courseData)
          setFormData({
            program_id: courseData.program_id || "",
            course_code: courseData.course_code || "",
            course_title: courseData.course_title || "",
            course_type: courseData.course_type || "",
            credits: courseData.credits?.toString() || "",
            contact_hours: courseData.contact_hours || { lecture: 0, tutorial: 0, practical: 0 },
            prerequisites: courseData.prerequisites || [],
            corequisites: courseData.corequisites || [],
            course_level: courseData.course_level || "Beginner",
            offering_department_id: courseData.offering_department_id || "",
            course_coordinator_id: courseData.course_coordinator_id || "",
            is_active: courseData.is_active ?? true
          })
        }

        // Mock data for related entities - replace with actual API calls
        setPrograms([
          { id: "1", program_name: "Computer Science Engineering", program_code: "CSE" },
          { id: "2", program_name: "Electronics and Communication Engineering", program_code: "ECE" },
          { id: "3", program_name: "Mechanical Engineering", program_code: "ME" }
        ])
        
        setDepartments([
          { id: "1", department_name: "Computer Science" },
          { id: "2", department_name: "Electronics" },
          { id: "3", department_name: "Mechanical" }
        ])
        
        setUsers([
          { id: "1", full_name: "Dr. John Smith", email: "john@jkkn.ac.in" },
          { id: "2", full_name: "Dr. Jane Doe", email: "jane@jkkn.ac.in" }
        ])
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    if (courseId) {
      fetchData()
    }
  }, [courseId])

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

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleContactHoursChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      contact_hours: {
        ...prev.contact_hours,
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          credits: parseFloat(formData.credits)
        }),
      })

      if (response.ok) {
        router.push('/courses')
      } else {
        const errorData = await response.json()
        console.error('Failed to update course:', errorData)
        alert(`Failed to update course: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating course:', error)
      alert(`Error updating course: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!course) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading course data...</p>
        </div>
      </div>
    )
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
                    <BreadcrumbLink asChild>
                      <Link href="/courses" className="hover:text-primary">Courses</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Edit</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Page Header */}
            <div className="flex items-center justify-between flex-shrink-0">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Edit Course</h1>
                <p className="text-sm text-muted-foreground">
                  Update the course details below
                </p>
              </div>
            </div>

            {/* Form Card */}
            <Card className="flex-1">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.back()}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">Course Information</h2>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Program */}
                    <div className="space-y-2">
                      <Label htmlFor="program_id">Program *</Label>
                      <Select value={formData.program_id} onValueChange={(value) => handleInputChange('program_id', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.program_name} ({program.program_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Course Code */}
                    <div className="space-y-2">
                      <Label htmlFor="course_code">Course Code *</Label>
                      <Input
                        id="course_code"
                        type="text"
                        value={formData.course_code}
                        onChange={(e) => handleInputChange('course_code', e.target.value)}
                        placeholder="e.g., CS101"
                        required
                      />
                    </div>

                    {/* Course Title */}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="course_title">Course Title *</Label>
                      <Input
                        id="course_title"
                        type="text"
                        value={formData.course_title}
                        onChange={(e) => handleInputChange('course_title', e.target.value)}
                        placeholder="Enter course title"
                        required
                      />
                    </div>

                    {/* Course Type */}
                    <div className="space-y-2">
                      <Label htmlFor="course_type">Course Type *</Label>
                      <Select value={formData.course_type} onValueChange={(value) => handleInputChange('course_type', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select course type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Core">Core</SelectItem>
                          <SelectItem value="Elective">Elective</SelectItem>
                          <SelectItem value="Practical">Practical</SelectItem>
                          <SelectItem value="Project">Project</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Credits */}
                    <div className="space-y-2">
                      <Label htmlFor="credits">Credits *</Label>
                      <Input
                        id="credits"
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.credits}
                        onChange={(e) => handleInputChange('credits', e.target.value)}
                        placeholder="e.g., 3.0"
                        required
                      />
                    </div>

                    {/* Course Level */}
                    <div className="space-y-2">
                      <Label htmlFor="course_level">Course Level</Label>
                      <Select value={formData.course_level} onValueChange={(value) => handleInputChange('course_level', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select course level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Department */}
                    <div className="space-y-2">
                      <Label htmlFor="offering_department_id">Offering Department</Label>
                      <Select value={formData.offering_department_id} onValueChange={(value) => handleInputChange('offering_department_id', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.department_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Course Coordinator */}
                    <div className="space-y-2">
                      <Label htmlFor="course_coordinator_id">Course Coordinator</Label>
                      <Select value={formData.course_coordinator_id} onValueChange={(value) => handleInputChange('course_coordinator_id', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select coordinator" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status *</Label>
                      <Select value={formData.is_active ? 'active' : 'inactive'} onValueChange={(value) => handleInputChange('is_active', value === 'active')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Contact Hours Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Contact Hours</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lecture_hours">Lecture Hours</Label>
                        <Input
                          id="lecture_hours"
                          type="number"
                          min="0"
                          value={formData.contact_hours.lecture}
                          onChange={(e) => handleContactHoursChange('lecture', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tutorial_hours">Tutorial Hours</Label>
                        <Input
                          id="tutorial_hours"
                          type="number"
                          min="0"
                          value={formData.contact_hours.tutorial}
                          onChange={(e) => handleContactHoursChange('tutorial', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="practical_hours">Practical Hours</Label>
                        <Input
                          id="practical_hours"
                          type="number"
                          min="0"
                          value={formData.contact_hours.practical}
                          onChange={(e) => handleContactHoursChange('practical', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-6 border-t">
                    <Button type="submit" disabled={loading} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {loading ? "Updating..." : "Update Course"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/courses')}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </form>
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
