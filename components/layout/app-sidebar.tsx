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
	Hash,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavUser } from "@/components/layout/nav-user"
import { useAuth } from "@/context/auth-context"
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
				{ title: "Users",           url: "/users/users-list",     icon: Users },
				{ title: "Roles",           url: "/users/roles",          icon: Shield },
				{ title: "Permissions",     url: "/users/permissions",    icon: Key },
				{ title: "Role Permission", url: "/users/role-permissions", icon: LibraryBig },
			],
		},
		{
			title: "Master",
			url: "#",
			icon: Database,
			isActive: false,
			roles: [], // Super admin only
			items: [
				{ title: "Institutions",          url: "/master/institutions",    icon: School },
				{ title: "Degree",                url: "/master/degrees",         icon: GraduationCap },
				{ title: "Department",            url: "/master/departments",     icon: Grid2X2 },
				{ title: "Program",               url: "/master/programs",        icon: GraduationCap },
				{ title: "Semester",              url: "/master/semesters",       icon: CalendarCheck2 },
				{ title: "Academic Year",         url: "/master/academic-years",  icon: Calendar },
				{ title: "Batch",                 url: "/master/batches",         icon: SquareStack },
				{ title: "Regulations",           url: "/master/regulations",     icon: LibraryBig },
				{ title: "Section",               url: "/master/sections",        icon: Shapes },
				{ title: "Board",                 url: "/master/boards",          icon: Shapes },
				{ title: "Grade Card Report",     url: "#",                       icon: FileText },
				{ title: "Hall",                  url: "#",                       icon: Shapes },
				{ title: "QP Template",           url: "#",                       icon: NotepadText },
				{ title: "COE Calender",          url: "#",                       icon: CalendarDays },
				{ title: "Fee Details",           url: "#",                       icon: Tags },
				{ title: "Fee Structure",         url: "#",                       icon: CreditCard },
				{ title: "Moderation Mark Setup", url: "#",                       icon: ListChecks },
			],
		},
		{
			title: "Courses",
			url: "#",
			icon: BookText,
			isActive: false,
			roles: [], // COE and above
			items: [
				{ title: "Courses",        url: "/master/courses",                      icon: BookText },
				{ title: "Course Offering",url: "/course-management/course-offering",   icon: BookText },
				{ title: "Course Mapping", url: "/course-management/course-mapping-index", icon: TableProperties },
			],
		},
		{
			title: "Student",
			url: "#",
			icon: GraduationCap,
			roles: [], // Available to all authenticated users
			items: [
				{ title: "Student List",      url: "/users/students-list", icon: GraduationCap },
				{ title: "Student Promotion", url: "#" },
			],
		},
		{
			title: "Grading",
			url: "#",
			icon: Database,
			roles: [], // COE and above
			items: [
				{ title: "Grades",       url: "/grading/grades",       icon: BookText },
				{ title: "Grade System", url: "/grading/grade-system", icon: CalendarDays },
			],
		},
		{
			title: "Pre-Exam",
			url: "#",
			icon: CalendarClock,
			roles: [], // COE and above
			items: [
				{ title: "Exam Types",            url: "/exam-management/exam-types",           icon: Tags },
				{ title: "Examination Sessions",  url: "/exam-management/examination-sessions", icon: CalendarDays },
				{ title: "Exam Registrations",    url: "/exam-management/exam-registrations",   icon: UserPlus },
				{ title: "Exam Timetable",        url: "/exam-management/exam-timetables",      icon: Calendar },
			],
		},
		{
			title: "During-Exam",
			url: "#",
			icon: Play,
			roles: [],
			items: [
				// Granular access: coe_office can mark attendance but cannot correct it
				{ title: "Exam Attendance",        url: "/exam-management/exam-attendance",       icon: ClipboardCheck, roles: [] },
				{ title: "Attendance Correction",  url: "/exam-management/attendance-correction", icon: Edit,           roles: [] }, // Restricted: No coe_office access
				{ title: "Exam Rooms",             url: "/exam-management/exam-rooms",            icon: Shapes,         roles: [] },
			],
		},
		{
			title: "Post-Exam",
			url: "#",
			icon: CheckSquare,
			roles: [], // COE and above
			items: [
				{ title: "Dummy Numbers", url: "/utilities/dummy-numbers", icon: Hash },
			],
		},
		{
			title: "Reports",
			url: "#",
			icon: PieChart,
			roles: [],
			items: [
				{ title: "Attendance Report", url: "/exam-management/reports/attendance", icon: PieChart },
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
			<SidebarHeader className="h-16 flex items-center mb-8">
				<div className="flex items-center gap-4 px-4">
					{/* Logo - Collapsed version (Icon only) */}
					<div className="group-data-[collapsible=icon]:flex hidden flex-col items-center justify-center gap-2 transition-all duration-300">
						{/* Crown Icon with enhanced styling */}
						<div className="relative group/logo">
							<div className="absolute inset-0 bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-xl blur-lg opacity-25 group-hover/logo:opacity-40 transition-opacity duration-300 animate-pulse" />
							<div className="relative h-11 w-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-green-500/20 via-green-600/15 to-green-700/20 border-2 border-green-500/40 shadow-xl backdrop-blur-sm group-hover/logo:scale-110 group-hover/logo:shadow-2xl group-hover/logo:border-green-400/60 transition-all duration-300">
								<Crown className="h-4 w-6 text-green-600 dark:text-green-400 drop-shadow-lg group-hover/logo:text-green-500 dark:group-hover/logo:text-green-300 transition-colors" />
							</div>
						</div>
						{/* JKKN Text */}
						<div className="text-[11px] font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-green-700 to-green-800 dark:from-green-400 dark:via-green-500 dark:to-green-600 drop-shadow-sm">
							JKKN
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

			{/* ===== Sidebar Content ===== */}
			<SidebarContent className="px1 py-4">
				{/* Filtered Navigation based on user roles */}
				<NavMain items={filteredNavItems} />
			</SidebarContent>

			{/* ===== Sidebar Footer ===== */}
			<SidebarFooter className="border-t border-border/40 mt-auto p-2">
				<NavUser />
			</SidebarFooter>

			{/* ===== Sidebar Rail ===== */}
			<SidebarRail />
		</Sidebar>
	)
}
