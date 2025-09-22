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
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    regulation_year: "",
    regulation_code: "",
    status: true,
    minimum_internal: "",
    minimum_external: "",
    minimum_attendance: "",
    minimum_total: "",
    maximum_internal: "",
    maximum_external: "",
    maximum_total: "",
    maximum_qp_marks: "",
    condonation_range_start: "",
    condonation_range_end: ""
  })

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch regulation data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const regulationResponse = await fetch(`/api/regulations/${regulationId}`)
        if (regulationResponse.ok) {
          const regulationData: Regulation = await regulationResponse.json()
          setRegulation(regulationData)
          setFormData({
            regulation_year: regulationData.regulation_year.toString(),
            regulation_code: regulationData.regulation_code,
            status: regulationData.status,
            minimum_internal: regulationData.minimum_internal.toString(),
            minimum_external: regulationData.minimum_external.toString(),
            minimum_attendance: regulationData.minimum_attendance.toString(),
            minimum_total: regulationData.minimum_total.toString(),
            maximum_internal: regulationData.maximum_internal.toString(),
            maximum_external: regulationData.maximum_external.toString(),
            maximum_total: regulationData.maximum_total.toString(),
            maximum_qp_marks: regulationData.maximum_qp_marks.toString(),
            condonation_range_start: regulationData.condonation_range_start.toString(),
            condonation_range_end: regulationData.condonation_range_end.toString()
          })
        } else {
          setError("Failed to fetch regulation data")
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("An error occurred while fetching data")
      }
    }

    fetchData()
  }, [regulationId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!formData.regulation_year || !formData.regulation_code) {
      setError("Please fill all required fields")
      setLoading(false)
      return
    }

    try {
      const payload = {
        regulation_year: parseInt(formData.regulation_year),
        regulation_code: formData.regulation_code,
        status: formData.status,
        minimum_internal: parseFloat(formData.minimum_internal) || 0,
        minimum_external: parseFloat(formData.minimum_external) || 0,
        minimum_attendance: parseFloat(formData.minimum_attendance) || 0,
        minimum_total: parseFloat(formData.minimum_total) || 0,
        maximum_internal: parseFloat(formData.maximum_internal) || 0,
        maximum_external: parseFloat(formData.maximum_external) || 0,
        maximum_total: parseFloat(formData.maximum_total) || 0,
        maximum_qp_marks: parseFloat(formData.maximum_qp_marks) || 0,
        condonation_range_start: parseFloat(formData.condonation_range_start) || 0,
        condonation_range_end: parseFloat(formData.condonation_range_end) || 0
      }

      const response = await fetch(`/api/regulations/${regulationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        router.push("/regulations")
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to update regulation")
      }
    } catch (error) {
      console.error("Error updating regulation:", error)
      setError("An error occurred while updating the regulation")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push("/regulations")
  }

  const formatCurrentDateTime = () => {
    if (!currentTime) return ""
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }
    return currentTime.toLocaleDateString('en-US', options)
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
              <ModeToggle />
            </div>
          </header>

          {/* Breadcrumb */}
          <div className="flex items-center px-6 py-3 bg-muted/50">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/regulations">Regulations</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Edit Regulation</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-background overflow-y-auto">
            <div className="max-w-6xl mx-auto">
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">Edit Regulation</h1>
                      <p className="text-sm text-muted-foreground mt-1">
                        Update regulation details and marking scheme
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={handleCancel}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to List
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {error && (
                    <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Information Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-primary">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="regulation_year" className="text-sm font-medium">
                            Regulation Year <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="regulation_year"
                            type="number"
                            value={formData.regulation_year}
                            onChange={(e) => setFormData({ ...formData, regulation_year: e.target.value })}
                            placeholder="e.g., 2024"
                            required
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="regulation_code" className="text-sm font-medium">
                            Regulation Code <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="regulation_code"
                            value={formData.regulation_code}
                            onChange={(e) => setFormData({ ...formData, regulation_code: e.target.value })}
                            placeholder="e.g., R2024"
                            required
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status" className="text-sm font-medium">
                            Status
                          </Label>
                          <Select
                            value={formData.status ? "active" : "inactive"}
                            onValueChange={(value) => setFormData({ ...formData, status: value === "active" })}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Attendance Requirements */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-primary">Attendance Requirements</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="minimum_attendance" className="text-sm font-medium">
                            Minimum Attendance (%)
                          </Label>
                          <Input
                            id="minimum_attendance"
                            type="number"
                            step="0.01"
                            value={formData.minimum_attendance}
                            onChange={(e) => setFormData({ ...formData, minimum_attendance: e.target.value })}
                            placeholder="75.00"
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="condonation_range_start" className="text-sm font-medium">
                            Condonation Start (%)
                          </Label>
                          <Input
                            id="condonation_range_start"
                            type="number"
                            step="0.01"
                            value={formData.condonation_range_start}
                            onChange={(e) => setFormData({ ...formData, condonation_range_start: e.target.value })}
                            placeholder="65.00"
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="condonation_range_end" className="text-sm font-medium">
                            Condonation End (%)
                          </Label>
                          <Input
                            id="condonation_range_end"
                            type="number"
                            step="0.01"
                            value={formData.condonation_range_end}
                            onChange={(e) => setFormData({ ...formData, condonation_range_end: e.target.value })}
                            placeholder="74.99"
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Minimum Marks Configuration */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-primary">Minimum Passing Marks</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="minimum_internal" className="text-sm font-medium">
                            Internal Marks
                          </Label>
                          <Input
                            id="minimum_internal"
                            type="number"
                            step="0.01"
                            value={formData.minimum_internal}
                            onChange={(e) => setFormData({ ...formData, minimum_internal: e.target.value })}
                            placeholder="0"
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="minimum_external" className="text-sm font-medium">
                            External Marks
                          </Label>
                          <Input
                            id="minimum_external"
                            type="number"
                            step="0.01"
                            value={formData.minimum_external}
                            onChange={(e) => setFormData({ ...formData, minimum_external: e.target.value })}
                            placeholder="0"
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="minimum_total" className="text-sm font-medium">
                            Total Marks
                          </Label>
                          <Input
                            id="minimum_total"
                            type="number"
                            step="0.01"
                            value={formData.minimum_total}
                            onChange={(e) => setFormData({ ...formData, minimum_total: e.target.value })}
                            placeholder="40"
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Maximum Marks Configuration */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-primary">Maximum Marks Configuration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="maximum_internal" className="text-sm font-medium">
                            Internal Marks
                          </Label>
                          <Input
                            id="maximum_internal"
                            type="number"
                            step="0.01"
                            value={formData.maximum_internal}
                            onChange={(e) => setFormData({ ...formData, maximum_internal: e.target.value })}
                            placeholder="40"
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="maximum_external" className="text-sm font-medium">
                            External Marks
                          </Label>
                          <Input
                            id="maximum_external"
                            type="number"
                            step="0.01"
                            value={formData.maximum_external}
                            onChange={(e) => setFormData({ ...formData, maximum_external: e.target.value })}
                            placeholder="60"
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="maximum_total" className="text-sm font-medium">
                            Total Marks
                          </Label>
                          <Input
                            id="maximum_total"
                            type="number"
                            step="0.01"
                            value={formData.maximum_total}
                            onChange={(e) => setFormData({ ...formData, maximum_total: e.target.value })}
                            placeholder="100"
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="maximum_qp_marks" className="text-sm font-medium">
                            Question Paper Marks
                          </Label>
                          <Input
                            id="maximum_qp_marks"
                            type="number"
                            step="0.01"
                            value={formData.maximum_qp_marks}
                            onChange={(e) => setFormData({ ...formData, maximum_qp_marks: e.target.value })}
                            placeholder="100"
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-6 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={loading}
                        className="min-w-[120px]"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="min-w-[120px]"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Update
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </main>

          {/* Footer */}
          <footer className="flex h-12 shrink-0 items-center justify-center bg-muted/50 border-t px-6">
            <p className="text-sm text-muted-foreground">
              Developed by JKKN Educational Institution © {new Date().getFullYear()}. All Rights Reserved.
            </p>
          </footer>
          <AppFooter />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}