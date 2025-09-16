"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle"
import { Save, X, ArrowLeft } from "lucide-react"

interface Program {
  id: string
  program_name: string
  program_code: string
}

interface Batch {
  id: string
  program_id: string
  batch_name: string
  batch_code: string
  academic_year: string
  start_date?: string
  end_date?: string
  max_students: number
  current_students: number
  is_active: boolean
  description?: string
  created_at: string
  updated_at: string
  programs?: {
    id: string
    program_name: string
    program_code: string
  }
}

export default function EditBatchPage() {
  const router = useRouter()
  const params = useParams()
  const batchId = params.id as string
  
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [batch, setBatch] = useState<Batch | null>(null)
  
  const [formData, setFormData] = useState({
    program_id: "",
    batch_name: "",
    batch_code: "",
    academic_year: "",
    start_date: "",
    end_date: "",
    max_students: 0,
    current_students: 0,
    is_active: true,
    description: ""
  })

  // Update time every second
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Fetch programs and batch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch programs
        const programsResponse = await fetch('/api/programs')
        if (programsResponse.ok) {
          const programsData = await programsResponse.json()
          setPrograms(programsData)
        }

        // Fetch batch data
        const batchResponse = await fetch(`/api/batches/${batchId}`)
        if (batchResponse.ok) {
          const batchData: Batch = await batchResponse.json()
          setBatch(batchData)
          setFormData({
            program_id: batchData.program_id,
            batch_name: batchData.batch_name,
            batch_code: batchData.batch_code,
            academic_year: batchData.academic_year,
            start_date: batchData.start_date ? batchData.start_date : "",
            end_date: batchData.end_date ? batchData.end_date : "",
            max_students: batchData.max_students,
            current_students: batchData.current_students,
            is_active: batchData.is_active,
            description: batchData.description || ""
          })
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    if (batchId) {
      fetchData()
    }
  }, [batchId])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          max_students: Number(formData.max_students),
          current_students: Number(formData.current_students)
        }),
      })

      if (response.ok) {
        router.push('/batches')
      } else {
        const errorData = await response.json()
        console.error('Failed to update batch:', errorData)
        alert(`Failed to update batch: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating batch:', error)
      alert(`Error updating batch: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!batch) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading batch data...</p>
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
                      <Link href="/batches" className="hover:text-primary">Batches</Link>
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
                <h1 className="text-2xl font-bold tracking-tight">Edit Batch</h1>
                <p className="text-sm text-muted-foreground">
                  Update the batch details below
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
                  <h2 className="text-lg font-semibold">Batch Information</h2>
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

                    {/* Batch Name */}
                    <div className="space-y-2">
                      <Label htmlFor="batch_name">Batch Name *</Label>
                      <Input
                        id="batch_name"
                        type="text"
                        value={formData.batch_name}
                        onChange={(e) => handleInputChange('batch_name', e.target.value)}
                        placeholder="e.g., Computer Science 2024"
                        required
                        maxLength={255}
                      />
                    </div>

                    {/* Batch Code */}
                    <div className="space-y-2">
                      <Label htmlFor="batch_code">Batch Code *</Label>
                      <Input
                        id="batch_code"
                        type="text"
                        value={formData.batch_code}
                        onChange={(e) => handleInputChange('batch_code', e.target.value)}
                        placeholder="e.g., CS2024"
                        required
                        maxLength={50}
                      />
                    </div>

                    {/* Academic Year */}
                    <div className="space-y-2">
                      <Label htmlFor="academic_year">Academic Year *</Label>
                      <Input
                        id="academic_year"
                        type="text"
                        value={formData.academic_year}
                        onChange={(e) => handleInputChange('academic_year', e.target.value)}
                        placeholder="e.g., 2024-2025"
                        required
                        maxLength={9}
                      />
                    </div>

                    {/* Start Date */}
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange('end_date', e.target.value)}
                      />
                    </div>

                    {/* Max Students */}
                    <div className="space-y-2">
                      <Label htmlFor="max_students">Maximum Students</Label>
                      <Input
                        id="max_students"
                        type="number"
                        min="0"
                        value={formData.max_students}
                        onChange={(e) => handleInputChange('max_students', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    {/* Current Students */}
                    <div className="space-y-2">
                      <Label htmlFor="current_students">Current Students</Label>
                      <Input
                        id="current_students"
                        type="number"
                        min="0"
                        value={formData.current_students}
                        onChange={(e) => handleInputChange('current_students', parseInt(e.target.value) || 0)}
                      />
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

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Enter batch description..."
                      rows={3}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-6 border-t">
                    <Button type="submit" disabled={loading} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {loading ? "Updating..." : "Update Batch"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/batches')}
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
