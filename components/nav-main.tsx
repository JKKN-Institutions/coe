"use client"

import React, { useEffect, useState } from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
      icon?: LucideIcon
    }[]
  }[]
}) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    // Ensure SSR and first client render are identical: start all closed
    const initial: Record<string, boolean> = {}
    items.forEach((item) => {
      initial[item.title] = false
    })
    return initial
  })

  useEffect(() => {
    // After mount, hydrate open state from localStorage or isActive fallback
    const next: Record<string, boolean> = {}
    items.forEach((item) => {
      const key = `sidebar_group_open_${item.title}`
      const stored = window.localStorage.getItem(key)
      if (stored !== null) {
        next[item.title] = stored === "true"
      } else {
        next[item.title] = !!item.isActive
      }
    })
    setOpenMap(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenChange = (title: string, open: boolean) => {
    setOpenMap((prev) => ({ ...prev, [title]: open }))
    try {
      window.localStorage.setItem(`sidebar_group_open_${title}`, String(open))
    } catch {
      // ignore storage errors
    }
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          // If item has no sub-items, render as simple link
          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <a href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }
          
          // If item has sub-items, render as collapsible menu
          return (
            <Collapsible
              key={item.title}
              asChild
              open={openMap[item.title] ?? !!item.isActive}
              onOpenChange={(open: boolean) => handleOpenChange(item.title, open)}
              className="group/collapsible"
            >
              <SidebarMenuItem aria-hidden={item.title === "Master"}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <a href={subItem.url}>
                            {subItem.icon && <subItem.icon />}
                            <span>{subItem.title}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
