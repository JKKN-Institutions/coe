"use client"

import { useEffect, useState } from "react"
import UserForm, { type UserPayload } from "@/components/users/user-form"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card } from "@/components/ui/card"

type Institution = { id: string; name: string }

export default function AddUserPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/institutions")
        if (res.ok) {
          const data = (await res.json()) as Institution[]
          setInstitutions(data)
        }
      } catch {}
    })()
  }, [])

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
            <BreadcrumbPage>Add</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <UserForm mode="add" institutions={institutions} />
    </div>
  )
}



