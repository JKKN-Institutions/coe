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

export default function AddBatchPage() {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    batch_code: "",
    batch_year: new Date().getFullYear(),
    status: true
  })

  // Update time every second
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])


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
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push('/batch')
      } else {
        const errorData = await response.json()
        console.error('Failed to create batch:', errorData)
        alert(`Failed to create batch: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating batch:', error)
      alert(`Error creating batch: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
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
                      <Link href="/batch" className="hover:text-primary">Batch</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Add</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Page Header */}
            <div className="flex items-center justify-between flex-shrink-0">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Add Batch</h1>
                <p className="text-sm text-muted-foreground">
                  Fill in the batch details below
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
                    {/* Batch Code */}
                    <div className="space-y-2">
                      <Label htmlFor="batch_code">Batch Code *</Label>
                      <Input
                        id="batch_code"
                        type="text"
                        value={formData.batch_code}
                        onChange={(e) => handleInputChange('batch_code', e.target.value)}
                        placeholder="e.g., CS2024A"
                        required
                        maxLength={50}
                      />
                      <p className="text-xs text-muted-foreground">Unique identifier for the batch</p>
                    </div>

                    {/* Batch Year */}
                    <div className="space-y-2">
                      <Label htmlFor="batch_year">Batch Year *</Label>
                      <Input
                        id="batch_year"
                        type="number"
                        value={formData.batch_year}
                        onChange={(e) => handleInputChange('batch_year', parseInt(e.target.value) || new Date().getFullYear())}
                        placeholder="e.g., 2024"
                        required
                        min="2000"
                        max="2100"
                      />
                      <p className="text-xs text-muted-foreground">Academic year for this batch</p>
                    </div>

                    {/* Status */}
                    <div className="space-y-2 md:col-span-2">
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
                      <p className="text-xs text-muted-foreground">Active batches are currently in use</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-6 border-t">
                    <Button type="submit" disabled={loading} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {loading ? "Saving..." : "Save Batch"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/batch')}
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
