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

interface User {
  id: string
  email: string
  full_name?: string
  username?: string
  avatar_url?: string
  bio?: string
  website?: string
  location?: string
  date_of_birth?: string
  phone?: string
  is_active?: boolean
  is_verified?: boolean
  role?: string
  institution_id: string
  preferences?: any
  metadata?: any
  created_at: string
  updated_at: string
}

interface Institution {
  id: string
  name: string
}

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [roles, setRoles] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    username: "",
    avatar_url: "",
    bio: "",
    website: "",
    location: "",
    date_of_birth: "",
    phone: "",
    is_active: true,
    is_verified: true,
    role: "user",
    institution_id: "",
    preferences: {},
    metadata: {}
  })

  // Update time every second
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Fetch user data, institutions and roles
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user data
        const userResponse = await fetch(`/api/users/${userId}`)
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setUser(userData)
          setFormData({
            full_name: userData.full_name || "",
            email: userData.email || "",
            username: userData.email || "",
            avatar_url: userData.avatar_url || "",
            bio: userData.bio || "",
            website: userData.website || "",
            location: userData.location || "",
            date_of_birth: userData.date_of_birth || "",
            phone: userData.phone || "",
            is_active: userData.is_active ?? true,
            is_verified: userData.is_verified ?? true,
            role: userData.role || "user",
            institution_id: userData.institution_id || "",
            preferences: userData.preferences || {},
            metadata: userData.metadata || {}
          })
        }

        // Fetch institutions
        const instResponse = await fetch('/api/institutions')
        if (instResponse.ok) {
          const instData = await instResponse.json()
          setInstitutions(instData)
        } else {
          // Fallback to mock data if API doesn't exist yet
          setInstitutions([
            { id: "1", name: "JKKN Main Campus" },
            { id: "2", name: "JKKN Branch Campus" },
            { id: "3", name: "JKKN Online Campus" }
          ])
        }

        // Fetch roles
        const rolesResponse = await fetch('/api/roles')
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json()
          setRoles(rolesData)
        } else {
          // Fallback to default roles if API doesn't exist yet
          setRoles([
            { id: "1", name: "user" },
            { id: "2", name: "admin" },
            { id: "3", name: "moderator" }
          ])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        // Fallback for roles if error
        setRoles([
          { id: "1", name: "user" },
          { id: "2", name: "admin" },
          { id: "3", name: "moderator" }
        ])
      }
    }

    if (userId) {
      fetchData()
    }
  }, [userId])

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

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }
      // Auto-set username to email when email changes
      if (field === 'email') {
        newData.username = value as string
      }
      return newData
    })
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Ensure username is same as email and is_verified is true
    const submitData = {
      ...formData,
      username: formData.email,
      is_verified: true
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        router.push('/user')
      } else {
        console.error('Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading user data...</p>
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
                      <Link href="/user" className="hover:text-primary">Users</Link>
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
                <h1 className="text-2xl font-bold tracking-tight">Edit User</h1>
                <p className="text-sm text-muted-foreground">
                  Update the user details below
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
                  <h2 className="text-lg font-semibold">User Information</h2>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Name *</Label>
                      <Input
                        id="full_name"
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        placeholder="Enter full name"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter email address"
                        required
                      />
                    </div>


                    {/* Role */}
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Institution */}
                    <div className="space-y-2">
                      <Label htmlFor="institution">Institution *</Label>
                      <Select value={formData.institution_id} onValueChange={(value) => handleInputChange('institution_id', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select institution" />
                        </SelectTrigger>
                        <SelectContent>
                          {institutions.map((institution) => (
                            <SelectItem key={institution.id} value={institution.id}>
                              {institution.name}
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


                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Contact Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </div>

                    {/* Avatar URL */}
                    <div className="space-y-2">
                      <Label htmlFor="avatar_url">Avatar URL</Label>
                      <Input
                        id="avatar_url"
                        type="url"
                        value={formData.avatar_url}
                        onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                        placeholder="Enter avatar URL"
                      />
                      {user.avatar_url && (
                        <p className="text-sm text-muted-foreground">
                          Current: {user.avatar_url}
                        </p>
                      )}
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input
                        id="bio"
                        type="text"
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        placeholder="Enter bio"
                      />
                    </div>

                    {/* Website */}
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="Enter website URL"
                      />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="Enter location"
                      />
                    </div>

                    {/* Date of Birth */}
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-6 border-t">
                    <Button type="submit" disabled={loading} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {loading ? "Updating..." : "Update User"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/user')}
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
