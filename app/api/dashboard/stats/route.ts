import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: Request) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const userId = searchParams.get('user_id')
		const userEmail = searchParams.get('email')

		if (!userId && !userEmail) {
			return NextResponse.json({ error: 'User ID or email is required' }, { status: 400 })
		}

		// Get user details - try by email first (for parent app OAuth), then by ID
		let userData = null
		let userError = null

		if (userEmail) {
			const result = await supabase
				.from('users')
				.select('id, is_super_admin, institution_id, email, role')
				.eq('email', userEmail)
				.single()
			userData = result.data
			userError = result.error
		}

		// If not found by email, try by ID
		if (!userData && userId) {
			const result = await supabase
				.from('users')
				.select('id, is_super_admin, institution_id, email, role')
				.eq('id', userId)
				.single()
			userData = result.data
			userError = result.error
		}

		// If still not found, return default stats (user not in local DB yet)
		if (userError || !userData) {
			// Return default stats for users not yet in local database
			return NextResponse.json({
				totalStudents: 0,
				activeCourses: 0,
				totalPrograms: 0,
				facultyMembers: 0,
				attendanceRatio: '0.0%',
				attendanceDetails: { total: 0, present: 0, absent: 0 },
				upcomingExams: [],
				isSuperAdmin: false,
				institutionId: null,
				userRole: 'user',
				userRoleName: 'User',
				userRoleDescription: 'Standard user - contact admin to assign roles',
				userRoles: [],
				userEmail: userEmail || ''
			})
		}

		const isSuperAdmin = userData.is_super_admin
		const userInstitutionId = userData.institution_id

		// Get user's active roles from user_roles table (RBAC system)
		const { data: userRolesData, error: rolesError } = await supabase
			.from('user_roles')
			.select(`
				role_id,
				assigned_at,
				expires_at,
				roles!inner(id, name, description)
			`)
			.eq('user_id', userId)
			.eq('is_active', true)
			.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

		if (rolesError) {
			console.error('Error fetching user roles:', rolesError)
		}

		// Extract role names and details
		const userRoles = (userRolesData || [])
			.filter((ur: any) => ur.roles)
			.map((ur: any) => ({
				name: ur.roles.name,
				description: ur.roles.description || '',
				assigned_at: ur.assigned_at,
				expires_at: ur.expires_at
			}))

		// Determine primary display role (prioritize coe-related roles)
		let displayRole = 'user'
		let roleDescription = ''

		if (userRoles.length > 0) {
			// Priority order: super_admin, coe, deputy_coe, coe_office, admin, faculty_coe
			const rolePriority = ['super_admin', 'coe', 'deputy_coe', 'coe_office', 'admin', 'faculty_coe']

			for (const priority of rolePriority) {
				const foundRole = userRoles.find((r: any) => r.name === priority)
				if (foundRole) {
					displayRole = foundRole.name
					roleDescription = foundRole.description || ''
					break
				}
			}

			// If no priority role found, use the first role
			if (displayRole === 'user' && userRoles.length > 0) {
				displayRole = userRoles[0].name
				roleDescription = userRoles[0].description || ''
			}
		}

		// Format display role name
		const formatRoleName = (role: string) => {
			const roleMap: Record<string, string> = {
				'super_admin': 'Super Admin',
				'coe': 'Controller of Examination',
				'deputy_coe': 'Deputy COE',
				'coe_office': 'COE Office',
				'admin': 'Administrator',
				'faculty_coe': 'Faculty COE',
				'user': 'User'
			}
			return roleMap[role] || role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
		}

		const formattedRoleName = formatRoleName(displayRole)

		// 1. Total Students Count (distinct stu_register_no from exam_registrations)
		let studentsQuery = supabase
			.from('exam_registrations')
			.select('stu_register_no')

		if (!isSuperAdmin && userInstitutionId) {
			studentsQuery = studentsQuery.eq('institutions_id', userInstitutionId)
		}

		const { data: studentData, error: studentError } = await studentsQuery

		if (studentError) {
			console.error('Error fetching students:', studentError)
		}

		// Count distinct register numbers
		const uniqueStudents = new Set(
			(studentData || [])
				.filter(s => s.stu_register_no)
				.map(s => s.stu_register_no)
		)
		const totalStudents = uniqueStudents.size

		// 2. Active Courses Count
		let coursesQuery = supabase
			.from('courses')
			.select('id', { count: 'exact', head: true })
			.eq('is_active', true)

		if (!isSuperAdmin && userInstitutionId) {
			coursesQuery = coursesQuery.eq('institution_code', userInstitutionId)
		}

		const { count: activeCourses, error: coursesError } = await coursesQuery

		if (coursesError) {
			console.error('Error fetching courses:', coursesError)
		}

		// 3. Program Count
		let programsQuery = supabase
			.from('programs')
			.select('id', { count: 'exact', head: true })

		if (!isSuperAdmin && userInstitutionId) {
			// Fetch institution UUID from institution_code
			const { data: instData } = await supabase
				.from('institutions')
				.select('id')
				.eq('institution_code', userInstitutionId)
				.single()

			if (instData) {
				programsQuery = programsQuery.eq('institutions_id', instData.id)
			}
		}

		const { count: totalPrograms, error: programsError } = await programsQuery

		if (programsError) {
			console.error('Error fetching programs:', programsError)
		}

		// 4. Faculty Members Count (users with 'faculty_coe' role)
		// First, get the faculty_coe role ID
		const { data: facultyRole } = await supabase
			.from('roles')
			.select('id')
			.eq('name', 'faculty_coe')
			.single()

		let facultyCount = 0
		if (facultyRole) {
			let facultyQuery = supabase
				.from('user_roles')
				.select('user_id', { count: 'exact', head: true })
				.eq('role_id', facultyRole.id)
				.eq('is_active', true)

			// If not super admin, filter by institution
			if (!isSuperAdmin && userInstitutionId) {
				// Get user IDs from the institution
				const { data: instUsers } = await supabase
					.from('users')
					.select('id')
					.eq('institution_id', userInstitutionId)

				if (instUsers && instUsers.length > 0) {
					const userIds = instUsers.map(u => u.id)
					facultyQuery = facultyQuery.in('user_id', userIds)
				}
			}

			const { count, error: facultyError } = await facultyQuery

			if (facultyError) {
				console.error('Error fetching faculty:', facultyError)
			} else {
				facultyCount = count || 0
			}
		}

		// 5. Upcoming Exams (from exam_timetables where exam_date >= today)
		const today = new Date().toISOString().split('T')[0]

		let upcomingExamsQuery = supabase
			.from('exam_timetables')
			.select(`
				*,
				institutions(id, institution_code, name),
				examination_sessions(id, session_code, session_name),
				course_offerings(
					id,
					course_id,
					course_mapping:course_id(id, course_code, course_title),
					programs(id, program_code, program_name)
				)
			`)
			.gte('exam_date', today)
			.order('exam_date', { ascending: true })
			.limit(5)

		if (!isSuperAdmin && userInstitutionId) {
			// Get institution UUID
			const { data: instData } = await supabase
				.from('institutions')
				.select('id')
				.eq('institution_code', userInstitutionId)
				.single()

			if (instData) {
				upcomingExamsQuery = upcomingExamsQuery.eq('institutions_id', instData.id)
			}
		}

		const { data: upcomingExams, error: examsError } = await upcomingExamsQuery

		if (examsError) {
			console.error('Error fetching upcoming exams:', examsError)
		}

		// Transform upcoming exams data
		const transformedExams = (upcomingExams || []).map(exam => ({
			id: exam.id,
			exam_date: exam.exam_date,
			session: exam.session,
			exam_mode: exam.exam_mode,
			institution_name: exam.institutions?.name || 'N/A',
			session_name: exam.examination_sessions?.session_name || 'N/A',
			course_code: exam.course_offerings?.course_mapping?.course_code || 'N/A',
			course_name: exam.course_offerings?.course_mapping?.course_title || 'N/A',
			program_name: exam.course_offerings?.programs?.program_name || 'N/A'
		}))

		// 6. Exam Attendance Ratio
		let attendanceQuery = supabase.from('exam_attendance').select('id, attendance_status')

		if (!isSuperAdmin && userInstitutionId) {
			// Get institution UUID
			const { data: instData } = await supabase
				.from('institutions')
				.select('id')
				.eq('institution_code', userInstitutionId)
				.single()

			if (instData) {
				attendanceQuery = attendanceQuery.eq('institutions_id', instData.id)
			}
		}

		const { data: attendanceData, error: attendanceError } = await attendanceQuery

		if (attendanceError) {
			console.error('Error fetching attendance:', attendanceError)
		}

		const totalAttendanceRecords = (attendanceData || []).length
		const presentCount = (attendanceData || []).filter(
			a => a.attendance_status === 'Present'
		).length

		const attendanceRatio =
			totalAttendanceRecords > 0
				? ((presentCount / totalAttendanceRecords) * 100).toFixed(1)
				: '0.0'

		// Return all stats
		return NextResponse.json({
			totalStudents,
			activeCourses: activeCourses || 0,
			totalPrograms: totalPrograms || 0,
			facultyMembers: facultyCount,
			attendanceRatio: `${attendanceRatio}%`,
			attendanceDetails: {
				total: totalAttendanceRecords,
				present: presentCount,
				absent: totalAttendanceRecords - presentCount
			},
			upcomingExams: transformedExams,
			isSuperAdmin,
			institutionId: userInstitutionId,
			userRole: displayRole,
			userRoleName: formattedRoleName,
			userRoleDescription: roleDescription,
			userRoles: userRoles,
			userEmail: userData.email
		})
	} catch (e) {
		console.error('Dashboard stats API error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
