"use client"

import * as React from "react"
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
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Master",
      url: "#",
      icon: Settings2,
      isActive: false,
      items: [
        { title: "Users", url: "/user", icon: Users },
        { title: "User Roles", url: "/user-roles", icon: Shield },
        { title: "Role Permissions", url: "/role-permissions", icon: Key },
        { title: "Regulation", url: "/regulations", icon: LibraryBig },
        { title: "Batches", url: "/batches", icon: SquareStack },
        { title: "Programme", url: "#", icon: GraduationCap },
        { title: "Branch", url: "#", icon: School },
        { title: "Programme-Branch", url: "#", icon: Grid2X2 },
        { title: "Courses", url: "/courses", icon: BookText },
        { title: "Regulations", url: "/regulations", icon: LibraryBig },
        { title: "Pgm-Branch-Courses", url: "#", icon: TableProperties },
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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-16 flex items-center">
        <div className="flex items-center gap-3 px-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
            <span className="text-white font-bold text-lg">J</span>
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-sm">JKKN COE</span>
            <p className="text-xs text-muted-foreground">Controller of Examination</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}


