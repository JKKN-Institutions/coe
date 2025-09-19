"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppFooter } from "@/components/app-footer"
import {
  Save, X, ArrowLeft, Calendar, Hash, ToggleLeft, Percent,
  Calculator, FileText, Settings2, AlertCircle, Gauge, ListChecks,
  BookOpen, Target, Award, Home, ChevronRight
} from "lucide-react"

export default function AddRegulationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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
      const response = await fetch('/api/regulations', {
        method: 'POST',
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
        console.error('Failed to create regulation:', errorData)
        alert(`Failed to create regulation: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating regulation:', error)
      alert(`Error creating regulation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader />

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <nav className="flex items-center space-x-1 text-sm">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
              <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600" />
              <Link
                href="/regulations"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Regulations</span>
              </Link>
              <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600" />
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-medium">
                <FileText className="h-3.5 w-3.5" />
                <span>Add New</span>
              </div>
            </nav>
          </div>

          {/* Page Header */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Add Regulation</h1>
              <p className="text-xs text-muted-foreground">
                Configure a new examination regulation
              </p>
            </div>
          </div>

          {/* Form Card */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0 pb-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.back()}
                    className="h-7 w-7 p-0"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                  <h2 className="text-base font-semibold">New Regulation Form</h2>
                </div>
                <Badge variant="outline" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  All fields marked with <span className="text-red-500"> * </span> are required
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 flex-1 overflow-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information */}
                <Card className="border-blue-200/60 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/40 via-blue-50/20 to-transparent dark:from-blue-950/20 dark:via-blue-950/10">
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                          <BookOpen className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Basic Information</h3>
                          <p className="text-xs text-muted-foreground">Essential regulation details</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Regulation Year */}
                      <div className="space-y-2">
                        <Label htmlFor="regulation_year" className="text-xs font-medium flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-blue-500" />
                          Regulation Year <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="regulation_year"
                          type="number"
                          value={formData.regulation_year}
                          onChange={(e) => handleInputChange('regulation_year', e.target.value)}
                          placeholder="e.g., 2025"
                          required
                          min="2000"
                          max="2100"
                          className="h-9 text-sm border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                        />
                      </div>

                      {/* Regulation Code */}
                      <div className="space-y-2">
                        <Label htmlFor="regulation_code" className="text-xs font-medium flex items-center gap-1.5">
                          <Hash className="h-3 w-3 text-blue-500" />
                          Regulation Code <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="regulation_code"
                          type="text"
                          value={formData.regulation_code}
                          onChange={(e) => handleInputChange('regulation_code', e.target.value)}
                          placeholder="e.g., R25"
                          required
                          maxLength={50}
                          className="h-9 text-sm border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                        />
                      </div>

                      {/* Status */}
                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-xs font-medium flex items-center gap-1.5">
                          <ToggleLeft className="h-3 w-3 text-blue-500" />
                          Status <span className="text-red-500">*</span>
                        </Label>
                        <Select value={formData.status ? 'active' : 'inactive'} onValueChange={(value) => handleInputChange('status', value === 'active')}>
                          <SelectTrigger className="h-9 text-sm border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                Active
                              </div>
                            </SelectItem>
                            <SelectItem value="inactive">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                                Inactive
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Minimum Attendance */}
                      <div className="space-y-2">
                        <Label htmlFor="minimum_attendance" className="text-xs font-medium flex items-center gap-1.5">
                          <Percent className="h-3 w-3 text-blue-500" />
                          Min. Attendance <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="minimum_attendance"
                          type="text"
                          pattern="[0-9]+(\.[0-9]{1,2})?"
                          min="0"
                          max="100"
                          value={formData.minimum_attendance}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              handleInputChange('minimum_attendance', value);
                            }
                          }}
                          placeholder="75.00"
                          required
                          className="h-9 text-sm border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Minimum Marks Section */}
                <Card className="border-emerald-200/60 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/40 via-emerald-50/20 to-transparent dark:from-emerald-950/20 dark:via-emerald-950/10">
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                          <Target className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Minimum Marks Configuration</h3>
                          <p className="text-xs text-muted-foreground">Set minimum passing requirements</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minimum_internal" className="text-xs font-medium text-muted-foreground">
                          Minimum Internal Marks
                        </Label>
                        <Input
                          id="minimum_internal"
                          type="text"
                          pattern="[0-9]+(\.[0-9]{1,2})?"
                          min="0"
                          value={formData.minimum_internal}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              handleInputChange('minimum_internal', value === '' ? 0 : parseFloat(value));
                            }
                          }}
                          placeholder="0.00"
                          className="h-9 text-sm border-emerald-200/60 dark:border-emerald-800/30 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white/60 dark:bg-slate-900/30 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="minimum_external" className="text-xs font-medium text-muted-foreground">
                          Minimum External Marks
                        </Label>
                        <Input
                          id="minimum_external"
                          type="text"
                          pattern="[0-9]+(\.[0-9]{1,2})?"
                          min="0"
                          value={formData.minimum_external}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              handleInputChange('minimum_external', value === '' ? 0 : parseFloat(value));
                            }
                          }}
                          placeholder="0.00"
                          className="h-9 text-sm border-emerald-200/60 dark:border-emerald-800/30 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white/60 dark:bg-slate-900/30 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="minimum_total" className="text-xs font-medium text-muted-foreground">
                          Minimum Total Marks
                        </Label>
                        <Input
                          id="minimum_total"
                          type="text"
                          pattern="[0-9]+(\.[0-9]{1,2})?"
                          min="0"
                          value={formData.minimum_total}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              handleInputChange('minimum_total', value === '' ? 0 : parseFloat(value));
                            }
                          }}
                          placeholder="0.00"
                          className="h-9 text-sm border-emerald-200/60 dark:border-emerald-800/30 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white/60 dark:bg-slate-900/30 transition-colors"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Maximum Marks Section */}
                <Card className="border-purple-200/60 dark:border-purple-900/30 bg-gradient-to-br from-purple-50/40 via-purple-50/20 to-transparent dark:from-purple-950/20 dark:via-purple-950/10">
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                          <Award className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Maximum Marks Configuration</h3>
                          <p className="text-xs text-muted-foreground">Set maximum possible marks</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maximum_internal" className="text-xs font-medium text-muted-foreground">
                          Maximum Internal
                        </Label>
                        <Input
                          id="maximum_internal"
                          type="text"
                          pattern="[0-9]+(\.[0-9]{1,2})?"
                          min="0"
                          value={formData.maximum_internal}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              handleInputChange('maximum_internal', value === '' ? 0 : parseFloat(value));
                            }
                          }}
                          placeholder="40.00"
                          className="h-9 text-sm border-purple-200/60 dark:border-purple-800/30 focus:border-purple-500 dark:focus:border-purple-400 bg-white/60 dark:bg-slate-900/30 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maximum_external" className="text-xs font-medium text-muted-foreground">
                          Maximum External
                        </Label>
                        <Input
                          id="maximum_external"
                          type="text"
                          pattern="[0-9]+(\.[0-9]{1,2})?"
                          min="0"
                          value={formData.maximum_external}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              handleInputChange('maximum_external', value === '' ? 0 : parseFloat(value));
                            }
                          }}
                          placeholder="60.00"
                          className="h-9 text-sm border-purple-200/60 dark:border-purple-800/30 focus:border-purple-500 dark:focus:border-purple-400 bg-white/60 dark:bg-slate-900/30 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maximum_total" className="text-xs font-medium text-muted-foreground">
                          Maximum Total
                        </Label>
                        <Input
                          id="maximum_total"
                          type="text"
                          pattern="[0-9]+(\.[0-9]{1,2})?"
                          min="0"
                          value={formData.maximum_total}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              handleInputChange('maximum_total', value === '' ? 0 : parseFloat(value));
                            }
                          }}
                          placeholder="100.00"
                          className="h-9 text-sm border-purple-200/60 dark:border-purple-800/30 focus:border-purple-500 dark:focus:border-purple-400 bg-white/60 dark:bg-slate-900/30 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maximum_qp_marks" className="text-xs font-medium text-muted-foreground">
                          Question Paper Marks
                        </Label>
                        <Input
                          id="maximum_qp_marks"
                          type="text"
                          pattern="[0-9]+(\.[0-9]{1,2})?"
                          min="0"
                          value={formData.maximum_qp_marks}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              handleInputChange('maximum_qp_marks', value === '' ? 0 : parseFloat(value));
                            }
                          }}
                          placeholder="100.00"
                          className="h-9 text-sm border-purple-200/60 dark:border-purple-800/30 focus:border-purple-500 dark:focus:border-purple-400 bg-white/60 dark:bg-slate-900/30 transition-colors"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Condonation Range Section */}
                <Card className="border-orange-200/60 dark:border-orange-900/30 bg-gradient-to-br from-orange-50/40 via-orange-50/20 to-transparent dark:from-orange-950/20 dark:via-orange-950/10">
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
                          <Settings2 className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Condonation Settings</h3>
                          <p className="text-xs text-muted-foreground">Configure attendance condonation range</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="condonation_range_start" className="text-xs font-medium text-muted-foreground">
                          Condonation Start (%)
                        </Label>
                        <Input
                          id="condonation_range_start"
                          type="text"
                          pattern="[0-9]+(\.[0-9]{1,2})?"
                          min="0"
                          max="100"
                          value={formData.condonation_range_start}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              handleInputChange('condonation_range_start', value === '' ? 0 : parseFloat(value));
                            }
                          }}
                          placeholder="65.00"
                          className="h-9 text-sm border-orange-200/60 dark:border-orange-800/30 focus:border-orange-500 dark:focus:border-orange-400 bg-white/60 dark:bg-slate-900/30 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="condonation_range_end" className="text-xs font-medium text-muted-foreground">
                          Condonation End (%)
                        </Label>
                        <Input
                          id="condonation_range_end"
                          type="text"
                          pattern="[0-9]+(\.[0-9]{1,2})?"
                          min="0"
                          max="100"
                          value={formData.condonation_range_end}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              handleInputChange('condonation_range_end', value === '' ? 0 : parseFloat(value));
                            }
                          }}
                          placeholder="74.99"
                          className="h-9 text-sm border-orange-200/60 dark:border-orange-800/30 focus:border-orange-500 dark:focus:border-orange-400 bg-white/60 dark:bg-slate-900/30 transition-colors"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/regulations')}
                    className="flex items-center gap-2"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    size="sm"
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                  >
                    <Save className="h-3 w-3" />
                    {loading ? "Saving..." : "Save Regulation"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}