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
import { AppFooter } from "@/components/app-footer"
import { Save, X, ArrowLeft } from "lucide-react"

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

export default function EditRegulationPage() {
  const router = useRouter()
  const params = useParams()
  const regulationId = params.id as string
  
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [regulation, setRegulation] = useState<Regulation | null>(null)
  
  const [formData, setFormData] = useState({
    regulation_year: "",
    regulation_code: "",
    status: true,
    minimum_internal: 0,
    minimum_external: 0,
    minimum_attendance: "",
    minimum_total: 0,
    maximum_internal: 0,
    maximum_external: 0,
    maximum_total: 0,
    maximum_qp_marks: 0,
    condonation_range_start: 0,
    condonation_range_end: 0
  })

  // Update time every second
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Fetch regulation data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch regulation data
        const regulationResponse = await fetch(`/api/regulations/${regulationId}`)
        if (regulationResponse.ok) {
          const regulationData: Regulation = await regulationResponse.json()
          setRegulation(regulationData)
          setFormData({
            regulation_year: regulationData.regulation_year.toString(),
            regulation_code: regulationData.regulation_code,
            status: regulationData.status,
            minimum_internal: regulationData.minimum_internal,
            minimum_external: regulationData.minimum_external,
            minimum_attendance: regulationData.minimum_attendance.toString(),
            minimum_total: regulationData.minimum_total,
            maximum_internal: regulationData.maximum_internal,
            maximum_external: regulationData.maximum_external,
            maximum_total: regulationData.maximum_total,
            maximum_qp_marks: regulationData.maximum_qp_marks,
            condonation_range_start: regulationData.condonation_range_start,
            condonation_range_end: regulationData.condonation_range_end
          })
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    if (regulationId) {
      fetchData()
    }
  }, [regulationId])

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
      const response = await fetch(`/api/regulations/${regulationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          regulation_year: parseInt(formData.regulation_year),
          minimum_attendance: parseFloat(formData.minimum_attendance)
        }),
      })

      if (response.ok) {
        router.push('/regulations')
      } else {
        const errorData = await response.json()
        console.error('Failed to update regulation:', errorData)
        alert(`Failed to update regulation: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating regulation:', error)
      alert(`Error updating regulation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!regulation) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading regulation data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col min-h-screen">
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
                      <Link href="/regulations" className="hover:text-primary">Regulations</Link>
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
                <h1 className="text-2xl font-bold tracking-tight">Edit Regulation</h1>
                <p className="text-sm text-muted-foreground">
                  Update the regulation details below
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
                  <h2 className="text-lg font-semibold">Regulation Information</h2>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Regulation Year */}
                    <div className="space-y-2">
                      <Label htmlFor="regulation_year">Regulation Year *</Label>
                      <Input
                        id="regulation_year"
                        type="number"
                        value={formData.regulation_year}
                        onChange={(e) => handleInputChange('regulation_year', e.target.value)}
                        placeholder="e.g., 2025"
                        required
                        min="2000"
                        max="2100"
                      />
                    </div>

                    {/* Regulation Code */}
                    <div className="space-y-2">
                      <Label htmlFor="regulation_code">Regulation Code *</Label>
                      <Input
                        id="regulation_code"
                        type="text"
                        value={formData.regulation_code}
                        onChange={(e) => handleInputChange('regulation_code', e.target.value)}
                        placeholder="e.g., R25"
                        required
                        maxLength={50}
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status *</Label>
                      <Select value={formData.status ? 'active' : 'inactive'} onValueChange={(value) => handleInputChange('status', value === 'active')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Minimum Attendance */}
                    <div className="space-y-2">
                      <Label htmlFor="minimum_attendance">Minimum Attendance % *</Label>
                      <Input
                        id="minimum_attendance"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.minimum_attendance}
                        onChange={(e) => handleInputChange('minimum_attendance', e.target.value)}
                        placeholder="e.g., 75.00"
                        required
                      />
                    </div>
                  </div>

                  {/* Minimum Marks Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Minimum Marks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minimum_internal">Minimum Internal</Label>
                        <Input
                          id="minimum_internal"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.minimum_internal}
                          onChange={(e) => handleInputChange('minimum_internal', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minimum_external">Minimum External</Label>
                        <Input
                          id="minimum_external"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.minimum_external}
                          onChange={(e) => handleInputChange('minimum_external', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minimum_total">Minimum Total</Label>
                        <Input
                          id="minimum_total"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.minimum_total}
                          onChange={(e) => handleInputChange('minimum_total', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Maximum Marks Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Maximum Marks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maximum_internal">Maximum Internal</Label>
                        <Input
                          id="maximum_internal"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.maximum_internal}
                          onChange={(e) => handleInputChange("maximum_internal", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maximum_external">Maximum External</Label>
                        <Input
                          id="maximum_external"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.maximum_external}
                          onChange={(e) => handleInputChange("maximum_external", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maximum_total">Maximum Total</Label>
                        <Input
                          id="maximum_total"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.maximum_total}
                          onChange={(e) => handleInputChange("maximum_total", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maximum_qp_marks">Maximum QP Marks</Label>
                        <Input
                          id="maximum_qp_marks"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.maximum_qp_marks}
                          onChange={(e) => handleInputChange('maximum_qp_marks', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Condonation Range Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Condonation Range</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="condonation_range_start">Condonation Range Start</Label>
                        <Input
                          id="condonation_range_start"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.condonation_range_start}
                          onChange={(e) => handleInputChange('condonation_range_start', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="condonation_range_end">Condonation Range End</Label>
                        <Input
                          id="condonation_range_end"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.condonation_range_end}
                          onChange={(e) => handleInputChange('condonation_range_end', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-6 border-t">
                    <Button type="submit" disabled={loading} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {loading ? "Updating..." : "Update Regulation"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/regulations')}
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

          <AppFooter />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
