"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import UserForm, { type UserPayload } from "@/components/users/user-form"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

type Institution = { id: string; name: string }
type User = {
  id: string
  name: string
  email: string
  role: UserPayload["role"]
  institutionId: string | null
  isActive: boolean
  image: string | null
  emailVerified?: string | null
}

export default function EditUserPage() {
  const params = useParams()
  const id = params?.id as string
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const [instRes, userRes] = await Promise.all([
          fetch("/api/institutions"),
          fetch(`/api/users/${id}`),
        ])
        if (instRes.ok) setInstitutions((await instRes.json()) as Institution[])
        if (userRes.ok) setUser((await userRes.json()) as User)
      } catch {}
    })()
  }, [id])

  return (
    <div className="p-4 space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/users">Master Data</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/users">Users</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {user && (
        <UserForm
          mode="edit"
          initialData={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            institutionId: user.institutionId,
            isActive: user.isActive,
            image: user.image,
            emailVerified: user.emailVerified ? user.emailVerified.substring(0, 16) : undefined,
          }}
          institutions={institutions}
        />
      )}
    </div>
  )
}



