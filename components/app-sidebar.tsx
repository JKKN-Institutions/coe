"use client"

import * as React from "react"
import {
	// Navigation Icons
	Home,
	Database,
	PieChart,

	// Entity Icons
	GraduationCap,
	BookText,
	Users,
	Shield,
	School,

	// Calendar & Time Icons
	Calendar,
	CalendarDays,
	CalendarCheck2,
	CalendarClock,

	// Action Icons
	Play,
	CheckSquare,
	Edit,
	ClipboardCheck,
	UserPlus,

	// Structure Icons
	Grid2X2,
	Shapes,
	SquareStack,
	TableProperties,

	// Document Icons
	FileText,
	NotepadText,
	LibraryBig,

	// Misc Icons
	Tags,
	CreditCard,
	ListChecks,
	Key,
	Crown,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/lib/auth/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

/**
 * Main Navigation Data with Role-Based Access Control (RBAC)
 *
 * Role Hierarchy:
 * - super_admin: Full system access (all institutions)
 * - coe: Controller of Examination (institution-specific)
 * - deputy_coe: Deputy Controller (institution-specific)
 * - coe_office: COE Office Staff (limited access)
 * - faculty_coe: Faculty member
 * - admin: System administrator
 *
 * Access Control:
 * - Empty roles array [] = Available to ALL authenticated users
 * - Specified roles = Only users with ANY of those roles can access
 * - Sub-items can have their own role restrictions for granular control
 *
 * Note: Users can have multiple roles simultaneously (RBAC system)
 */
const data = {
	navMain: [
		{
			title: "Dashboard",
			url: "/dashboard",
			icon: Home,
			isActive: true,
			roles: [], // Available to all authenticated users
		},
		{
			title: "Admin",
			url: "#",
			icon: Shield,
			isActive: false,
			roles: ["admin", "super_admin"], // Admin and super admin
			items: [
				{ title: "Users",           url: "/user",             icon: Users },
				{ title: "Roles",           url: "/roles",           icon: Shield },
				{ title: "Permissions",     url: "/permissions",     icon: Key },
				{ title: "Role Permission", url: "/role-permissions", icon: LibraryBig },
			],
		},
		{
			title: "Master",
			url: "#",
			icon: Database,
			isActive: false,
			roles: [], // Super admin only
			items: [
				{ title: "Institutions",          url: "/institutions",  icon: School },
				{ title: "Degree",                url: "/degree",        icon: GraduationCap },
				{ title: "Department",            url: "/department",    icon: Grid2X2 },
				{ title: "Program",               url: "/program",       icon: GraduationCap },
				{ title: "Semester",              url: "/semester",      icon: CalendarCheck2 },
				{ title: "Academic Year",         url: "/academic-years", icon: Calendar },
				{ title: "Batch",                 url: "/batch",         icon: SquareStack },
				{ title: "Regulations",           url: "/regulations",   icon: LibraryBig },
				{ title: "Section",               url: "/section",       icon: Shapes },
				{ title: "Grade Card Report",     url: "#",              icon: FileText },
				{ title: "Hall",                  url: "#",              icon: Shapes },
				{ title: "QP Template",           url: "#",              icon: NotepadText },
				{ title: "COE Calender",          url: "#",              icon: CalendarDays },
				{ title: "Fee Details",           url: "#",              icon: Tags },
				{ title: "Fee Structure",         url: "#",              icon: CreditCard },
				{ title: "Moderation Mark Setup", url: "#",              icon: ListChecks },
			],
		},
		{
			title: "Courses",
			url: "#",
			icon: BookText,
			isActive: false,
			roles: [], // COE and above
			items: [
				{ title: "Courses",        url: "/courses",              icon: BookText },
				{ title: "Course Mapping", url: "/course-mapping-index", icon: TableProperties },
			],
		},
		{
			title: "Student",
			url: "#",
			icon: GraduationCap,
			roles: [], // Available to all authenticated users
			items: [
				{ title: "Student List",      url: "#" },
				{ title: "Student Promotion", url: "#" },
			],
		},
		{
			title: "Exam Master",
			url: "#",
			icon: Database,
			roles: [], // COE and above
			items: [
				{ title: "Grades",       url: "/grades",       icon: BookText },
				{ title: "Grade System", url: "/grade-system", icon: CalendarDays },
			],
		},
		{
			title: "Pre-Exam",
			url: "#",
			icon: CalendarClock,
			roles: [], // COE and above
			items: [
				{ title: "Exam Types",            url: "/exam-types",           icon: Tags },
				{ title: "Examination Sessions",  url: "/examination-sessions", icon: CalendarDays },
				{ title: "Exam Course Offer",     url: "/course-offering",      icon: BookText },
				{ title: "Exam Registrations",    url: "/exam-registrations",   icon: UserPlus },
				{ title: "Exam Timetable",        url: "/exam-timetables",      icon: Calendar },
			],
		},
		{
			title: "During-Exam",
			url: "#",
			icon: Play,
			roles: [],
			items: [
				// Granular access: coe_office can mark attendance but cannot correct it
				{ title: "Exam Attendance",        url: "/exam-attendance",       icon: ClipboardCheck, roles: [] },
				{ title: "Attendance Correction",  url: "/attendance-correction", icon: Edit,           roles: [] }, // Restricted: No coe_office access
			],
		},
		{
			title: "Post-Exam",
			url: "#",
			icon: CheckSquare,
			roles: [], // COE and above
			items: [
				{ title: "Dummy Number", url: "/", icon: BookText },
			],
		},
		{
			title: "Reports",
			url: "#",
			icon: PieChart,
			roles: [],
			items: [
				{ title: "Attendance Report", url: "/reports/attendance", icon: PieChart },
			],
		},
		
		
		
	],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { hasAnyRole } = useAuth()

	// Filter navigation items based on current user's roles
	const filteredNavItems = data.navMain.filter(item => {
		// If no roles specified, item is available to all authenticated users
		if (!item.roles || item.roles.length === 0) return true

		// Check if user has any of the required roles
		return hasAnyRole(item.roles)
	})

	return (
		<Sidebar collapsible="icon" {...props}>
			{/* ===== Sidebar Header ===== */}
			<SidebarHeader className="h-16 flex items-center mb-4">
				<div className="flex items-center gap-3 px-3">
					{/* Logo - Collapsed version (Icon only) */}
					<div className="group-data-[collapsible=icon]:block hidden">
						<div className="flex flex-col items-center space-y-1">
							{/* Crown Icon with frame */}
							<div className="h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#16a34a]/10 to-[#059669]/10 border border-[#16a34a]/20 shadow-sm">
								<Crown className="h-5 w-5 text-[#16a34a] dark:text-[#16a34a] drop-shadow-sm" />
							</div>
							{/* JKKN Text */}
							<div className="text-xs font-extrabold tracking-widest text-[#16a34a] dark:text-[#16a34a] drop-shadow-lg">
								JKKN
							</div>
						</div>
					</div>

					{/* Logo - Full version when expanded */}
					<div className="group-data-[collapsible=icon]:hidden flex flex-col items-center space-y-3">
						{/* Logo container with frame and transparency */}
						<div className="relative p-2 rounded-xl bg-gradient-to-br from-[#16a34a]/5 to-[#059669]/5 border border-[#16a34a]/20 shadow-lg backdrop-blur-sm">
							{/* Background pattern overlay */}
							<div
								className="absolute inset-0 opacity-10 rounded-xl"
								style={{
									backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2316a34a' fill-opacity='0.3'%3E%3Ccircle cx='10' cy='10' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
									backgroundSize: "20px 20px",
								}}
							/>

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

			{/* ===== Sidebar Content ===== */}
			<SidebarContent className="py-2">
				{/* Filtered Navigation based on user roles */}
				<NavMain items={filteredNavItems} />
			</SidebarContent>

			{/* ===== Sidebar Footer ===== */}
			<SidebarFooter className="mt-4">
				<NavUser />
			</SidebarFooter>

			{/* ===== Sidebar Rail ===== */}
			<SidebarRail />
		</Sidebar>
	)
}
