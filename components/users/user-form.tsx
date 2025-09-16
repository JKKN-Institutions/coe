"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

type Institution = { id: string; name: string }

type Mode = "add" | "edit"

export type UserPayload = {
  id?: string
  name: string
  email: string
  password?: string
  role: "ADMIN" | "STAFF" | "STUDENT" | "USER"
  institutionId?: string | null
  isActive: boolean
  image?: string | null
  emailVerified?: string | null
}

export default function UserForm({
  mode,
  initialData,
  institutions,
}: {
  mode: Mode
  initialData?: Partial<UserPayload>
  institutions: Institution[]
}) {
  const router = useRouter()
  const [form, setForm] = useState<UserPayload>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "",
    role: (initialData?.role as UserPayload["role"]) || "USER",
    institutionId: (initialData?.institutionId as string | undefined) || undefined,
    isActive: initialData?.isActive ?? true,
    image: (initialData?.image as string | undefined) || undefined,
    emailVerified: initialData?.emailVerified || undefined,
  })
  const [submitting, setSubmitting] = useState(false)

  const headerTitle = mode === "add" ? "Add User" : "Edit User"

  const handleChange = (key: keyof UserPayload, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value as never }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = mode === "add" ? "/api/users" : `/api/users/${initialData?.id}`
      const method = mode === "add" ? "POST" : "PUT"
      const payload: Record<string, unknown> = { ...form }
      if (mode === "edit" && !form.password) {
        delete payload.password
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err && (err.error as string)) || "Request failed")
      }
      toast.success(mode === "add" ? "User created" : "User updated")
      router.push("/users")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save user")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="rounded-xl shadow">
      <CardHeader>
        <CardTitle>{headerTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">Fill in the user details below</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={form.name} onChange={(e) => handleChange("name", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => handleChange("email", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <Label htmlFor="password">Password {mode === "edit" && <span className="text-xs text-muted-foreground">(leave empty to keep)</span>}</Label>
            <Input id="password" type="password" required={mode === "add"} value={form.password} onChange={(e) => handleChange("password", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => handleChange("role", v as UserPayload["role"])}>
              <SelectTrigger className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="STAFF">STAFF</SelectItem>
                <SelectItem value="STUDENT">STUDENT</SelectItem>
                <SelectItem value="USER">USER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Institution</Label>
            <Select value={form.institutionId || ""} onValueChange={(v) => handleChange("institutionId", v || undefined)}>
              <SelectTrigger className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <SelectValue placeholder="Select an institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isActive" checked={form.isActive} onCheckedChange={(v) => handleChange("isActive", Boolean(v))} />
            <Label htmlFor="isActive" className="!m-0">Is Active</Label>
          </div>
          <div>
            <Label htmlFor="image">Image</Label>
            <Input id="image" type="url" placeholder="https://..." value={form.image || ""} onChange={(e) => handleChange("image", e.target.value || undefined)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <Label htmlFor="emailVerified">Email Verified</Label>
            <Input id="emailVerified" type="datetime-local" value={form.emailVerified || ""} onChange={(e) => handleChange("emailVerified", e.target.value || undefined)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/users")}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


