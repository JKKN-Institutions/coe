"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  BookText,
  CalendarDays,
  CalendarCheck2,
  CreditCard,
  FileText,
  GraduationCap,
  Grid2X2,
  LibraryBig,
  ListChecks,
  NotepadText,
  School,
  Shapes,
  SquareStack,
  TableProperties,
  Tags,
  Users,
  User,
  Shield,
  ClipboardList,
  ClipboardCheck,
  Clipboard,
  UserPlus,
  Pencil,
  Home,
  Key,
  Crown,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { ProtectedRoute } from "@/components/protected-route"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const adminSection = {
  title: "Admin",
  url: "#",
  icon: Shield,
  isActive: false,
  items: [
    { title: "Users", url: "/user", icon: Users },
    { title: "Roles", url: "/roles", icon: Shield },
    { title: "Permissions", url: "/permissions", icon: Key },
    { title: "Role Permission", url: "/role-permissions", icon: LibraryBig },
  ],
}
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    // Admin group is rendered separately under a guard
    {
      title: "Master",
      url: "#",
      icon: Settings2,
      isActive: false,
      items: [
        { title: "Institutions", url: "/institutions", icon: School },
        { title: "Degree", url: "/degree", icon: GraduationCap },
        { title: "Department", url: "/department", icon: Grid2X2 },
        { title: "Program", url: "/program", icon: GraduationCap },
        { title: "Semester", url: "/semester", icon: CalendarCheck2 },
        { title: "Batch", url: "/batch", icon: SquareStack },
        { title: "Regulations", url: "/regulations", icon: LibraryBig },
        { title: "Section", url: "/section", icon: Shapes },
        { title: "Courses", url: "/courses", icon: BookText },
        { title: "Course Mapping", url: "/course-mapping", icon: TableProperties },
        { title: "Grade Card Report", url: "#", icon: FileText },
        { title: "Hall", url: "#", icon: Shapes },
        { title: "QP Template", url: "#", icon: NotepadText },
        { title: "COE Calender", url: "#", icon: CalendarDays },
        { title: "Fee Details", url: "#", icon: Tags },
        { title: "Fee Structure", url: "#", icon: CreditCard },
        { title: "Moderation Mark Setup", url: "#", icon: ListChecks },
      ],
    },
    
    {
      title: "Student",
      url: "#",
      icon: GraduationCap,
      items: [
        { title: "Student List", url: "#" },
        { title: "Student Promotion", url: "#" },
      ],
    },
    {
      title: "Examination",
      url: "#",
      icon: ClipboardList,
      items: [
        { title: "Pre-Examination", url: "#", icon: ClipboardList },
        { title: "During-Examination", url: "#", icon: ClipboardCheck },
        { title: "Post-Examination", url: "#", icon: Clipboard },
      ],
    },
    {
        title: "Reports",
        url: "#",
        icon: PieChart,
        items: [
          { title: "Reports", url: "#", icon: PieChart },
        ],
      },
  ],
}


 
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar 
      collapsible="icon" 
      {...props}
    >
      <SidebarHeader className="h-16 flex items-center">
        <div className="flex items-center gap-3 px-3">
          {/* Logo - Collapsed version (Icon only) */}
          <div className="group-data-[collapsible=icon]:block hidden">
            <div className="flex flex-col items-center space-y-1">
              {/* Crown Icon with frame */}
              <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#16a34a]/10 to-[#059669]/10 border border-[#16a34a]/20 shadow-sm">
                <Crown className='h-5 w-5 text-[#16a34a] dark:text-[#16a34a] drop-shadow-sm' />
              </div>
              {/* JKKN Text */}
              <div className='text-xs font-extrabold tracking-widest text-[#16a34a] dark:text-[#16a34a] drop-shadow-lg'>
                JKKN
              </div>
            </div>
          </div>
          
          {/* Logo - Full version when expanded */}
          <div className="group-data-[collapsible=icon]:hidden flex flex-col items-center space-y-3">
            {/* Logo container with frame and transparency */}
            <div className="relative p-2 rounded-xl bg-gradient-to-br from-[#16a34a]/5 to-[#059669]/5 border border-[#16a34a]/20 shadow-lg backdrop-blur-sm">
              {/* Background pattern overlay */}
              <div className="absolute inset-0 opacity-10 rounded-xl" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2316a34a' fill-opacity='0.3'%3E%3Ccircle cx='10' cy='10' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '20px 20px'
              }}></div>
              
              {/* JKKN Logo Image */}
              <img 
                src="/jkkn_logo.png" 
                alt="JKKN | COE" 
                className="h-18 w-28 object-contain relative z-10 filter drop-shadow-sm"
              />
            </div>
            
           
          </div>
        </div>
      </SidebarHeader>
      <br></br>

      <SidebarContent>
        <NavMain 
          items={data.navMain} 
        />
        <ProtectedRoute
          requiredRoles={["admin", "super_admin"]}
          requireAnyRole={true}
          fallback={<></>}
        >
          <NavMain items={[adminSection]} />
        </ProtectedRoute>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}


