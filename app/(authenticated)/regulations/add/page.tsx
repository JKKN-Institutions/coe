"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

export default function AddRegulationPage() {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
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
        minimum_internal: parseInt(formData.minimum_internal) || 0,
        minimum_external: parseInt(formData.minimum_external) || 0,
        minimum_attendance: parseFloat(formData.minimum_attendance) || 0,
        minimum_total: parseInt(formData.minimum_total) || 0,
        maximum_internal: parseInt(formData.maximum_internal) || 0,
        maximum_external: parseInt(formData.maximum_external) || 0,
        maximum_total: parseInt(formData.maximum_total) || 0,
        maximum_qp_marks: parseInt(formData.maximum_qp_marks) || 0,
        condonation_range_start: parseInt(formData.condonation_range_start) || 0,
        condonation_range_end: parseInt(formData.condonation_range_end) || 0
      }

      const response = await fetch('/api/regulations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        router.push('/regulations')
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to create regulation")
      }
    } catch (error) {
      console.error('Error creating regulation:', error)
      setError("An error occurred while creating the regulation")
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
                  <BreadcrumbPage>Add Regulation</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-background">
            <div className="max-w-5xl mx-auto">
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">Add New Regulation</h1>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create a new examination regulation
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
                    <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="regulation_year">Regulation Year *</Label>
                          <Input
                            id="regulation_year"
                            type="number"
                            value={formData.regulation_year}
                            onChange={(e) => setFormData({ ...formData, regulation_year: e.target.value })}
                            placeholder="Enter regulation year"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="regulation_code">Regulation Code *</Label>
                          <Input
                            id="regulation_code"
                            value={formData.regulation_code}
                            onChange={(e) => setFormData({ ...formData, regulation_code: e.target.value })}
                            placeholder="Enter regulation code"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={formData.status ? "active" : "inactive"}
                            onValueChange={(value) => setFormData({ ...formData, status: value === "active" })}
                          >
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
                    </div>

                    {/* Minimum Values */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Minimum Values</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="minimum_internal">Minimum Internal</Label>
                          <Input
                            id="minimum_internal"
                            type="number"
                            value={formData.minimum_internal}
                            onChange={(e) => setFormData({ ...formData, minimum_internal: e.target.value })}
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <Label htmlFor="minimum_external">Minimum External</Label>
                          <Input
                            id="minimum_external"
                            type="number"
                            value={formData.minimum_external}
                            onChange={(e) => setFormData({ ...formData, minimum_external: e.target.value })}
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <Label htmlFor="minimum_attendance">Minimum Attendance (%)</Label>
                          <Input
                            id="minimum_attendance"
                            type="number"
                            step="0.01"
                            value={formData.minimum_attendance}
                            onChange={(e) => setFormData({ ...formData, minimum_attendance: e.target.value })}
                            placeholder="75"
                          />
                        </div>

                        <div>
                          <Label htmlFor="minimum_total">Minimum Total</Label>
                          <Input
                            id="minimum_total"
                            type="number"
                            value={formData.minimum_total}
                            onChange={(e) => setFormData({ ...formData, minimum_total: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Maximum Values */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Maximum Values</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="maximum_internal">Maximum Internal</Label>
                          <Input
                            id="maximum_internal"
                            type="number"
                            value={formData.maximum_internal}
                            onChange={(e) => setFormData({ ...formData, maximum_internal: e.target.value })}
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <Label htmlFor="maximum_external">Maximum External</Label>
                          <Input
                            id="maximum_external"
                            type="number"
                            value={formData.maximum_external}
                            onChange={(e) => setFormData({ ...formData, maximum_external: e.target.value })}
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <Label htmlFor="maximum_total">Maximum Total</Label>
                          <Input
                            id="maximum_total"
                            type="number"
                            value={formData.maximum_total}
                            onChange={(e) => setFormData({ ...formData, maximum_total: e.target.value })}
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <Label htmlFor="maximum_qp_marks">Maximum QP Marks</Label>
                          <Input
                            id="maximum_qp_marks"
                            type="number"
                            value={formData.maximum_qp_marks}
                            onChange={(e) => setFormData({ ...formData, maximum_qp_marks: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Condonation Range */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Condonation Range</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="condonation_range_start">Range Start</Label>
                          <Input
                            id="condonation_range_start"
                            type="number"
                            value={formData.condonation_range_start}
                            onChange={(e) => setFormData({ ...formData, condonation_range_start: e.target.value })}
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <Label htmlFor="condonation_range_end">Range End</Label>
                          <Input
                            id="condonation_range_end"
                            type="number"
                            value={formData.condonation_range_end}
                            onChange={(e) => setFormData({ ...formData, condonation_range_end: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Create Regulation
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