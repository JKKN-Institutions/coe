import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import {
	fetchMyJKKNStudents,
	fetchMyJKKNStaff,
	fetchMyJKKNInstitutions,
	fetchMyJKKNDepartments,
	fetchMyJKKNPrograms,
} from '@/lib/myjkkn-api'

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
				totalLearners: 0,
				activeCourses: 0,
				totalPrograms: 0,
				facultyMembers: 0,
				totalInstitutions: 0,
				totalDepartments: 0,
				totalSemesters: 0,
				activeExamSessions: 0,
				totalExaminers: 0,
				pendingEvaluations: 0,
				myJKKN: {
					learners: 0,
					staff: 0,
					institutions: 0,
					departments: 0,
					programs: 0
				},
				attendanceRatio: '0.0%',
				attendanceDetails: { total: 0, present: 0, absent: 0 },
				upcomingExams: [],
				recentResults: [],
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

		// 2. Active Courses Count (count all courses, optionally filter by institution)
		let coursesQuery = supabase
			.from('courses')
			.select('id', { count: 'exact', head: true })

		// Only filter if not super_admin and institution exists
		if (!isSuperAdmin && userInstitutionId) {
			coursesQuery = coursesQuery.eq('institution_code', userInstitutionId)
		}

		const { count: activeCourses, error: coursesError } = await coursesQuery

		if (coursesError) {
			console.error('Error fetching courses:', coursesError)
		}

		// Also get total courses without institution filter for reference
		const { count: totalCoursesAll } = await supabase
			.from('courses')
			.select('id', { count: 'exact', head: true })

		console.log(`[Dashboard Stats] Courses: filtered=${activeCourses}, total=${totalCoursesAll}`)

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

		// Also get total programs without institution filter for reference
		const { count: totalProgramsAll } = await supabase
			.from('programs')
			.select('id', { count: 'exact', head: true })

		console.log(`[Dashboard Stats] Programs: filtered=${totalPrograms}, total=${totalProgramsAll}`)

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
					course_mapping:course_id(
						id,
						courses:course_id(course_code, course_name)
					),
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
			course_code: exam.course_offerings?.course_mapping?.courses?.course_code || 'N/A',
			course_name: exam.course_offerings?.course_mapping?.courses?.course_name || 'N/A',
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

		// 7. Total Institutions Count
		const { count: totalInstitutions, error: instCountError } = await supabase
			.from('institutions')
			.select('id', { count: 'exact', head: true })

		if (instCountError) {
			console.error('Error fetching institutions count:', instCountError)
		}

		// 8. Total Departments Count
		let departmentsQuery = supabase
			.from('departments')
			.select('id', { count: 'exact', head: true })

		if (!isSuperAdmin && userInstitutionId) {
			departmentsQuery = departmentsQuery.eq('institution_code', userInstitutionId)
		}

		const { count: totalDepartments, error: deptError } = await departmentsQuery

		if (deptError) {
			console.error('Error fetching departments count:', deptError)
		}

		// 9. Total Semesters Count
		const { count: totalSemesters, error: semError } = await supabase
			.from('semesters')
			.select('id', { count: 'exact', head: true })

		if (semError) {
			console.error('Error fetching semesters count:', semError)
		}

		// 10. Active Exam Sessions Count
		let examSessionsQuery = supabase
			.from('examination_sessions')
			.select('id', { count: 'exact', head: true })
			.eq('is_active', true)

		if (!isSuperAdmin && userInstitutionId) {
			const { data: instData } = await supabase
				.from('institutions')
				.select('id')
				.eq('institution_code', userInstitutionId)
				.single()

			if (instData) {
				examSessionsQuery = examSessionsQuery.eq('institutions_id', instData.id)
			}
		}

		const { count: activeExamSessions, error: sessError } = await examSessionsQuery

		if (sessError) {
			console.error('Error fetching exam sessions count:', sessError)
		}

		// 11. Total Examiners Count
		let examinersQuery = supabase
			.from('examiners')
			.select('id', { count: 'exact', head: true })

		if (!isSuperAdmin && userInstitutionId) {
			examinersQuery = examinersQuery.eq('institution_code', userInstitutionId)
		}

		const { count: totalExaminers, error: examinerError } = await examinersQuery

		if (examinerError) {
			console.error('Error fetching examiners count:', examinerError)
		}

		// 12. Pending Evaluations (marks_entry with status pending)
		let pendingEvalQuery = supabase
			.from('marks_entry')
			.select('id', { count: 'exact', head: true })
			.eq('verification_status', 'pending')

		if (!isSuperAdmin && userInstitutionId) {
			const { data: instData } = await supabase
				.from('institutions')
				.select('id')
				.eq('institution_code', userInstitutionId)
				.single()

			if (instData) {
				pendingEvalQuery = pendingEvalQuery.eq('institutions_id', instData.id)
			}
		}

		const { count: pendingEvaluations, error: pendingError } = await pendingEvalQuery

		if (pendingError) {
			console.error('Error fetching pending evaluations:', pendingError)
		}

		// 13. Recent Results (last 5 published semester results)
		let recentResultsQuery = supabase
			.from('semester_results')
			.select(`
				id,
				stu_register_no,
				semester,
				gpa,
				cgpa,
				pass_status,
				published_at,
				examination_sessions(session_name)
			`)
			.eq('is_published', true)
			.order('published_at', { ascending: false })
			.limit(5)

		if (!isSuperAdmin && userInstitutionId) {
			const { data: instData } = await supabase
				.from('institutions')
				.select('id')
				.eq('institution_code', userInstitutionId)
				.single()

			if (instData) {
				recentResultsQuery = recentResultsQuery.eq('institutions_id', instData.id)
			}
		}

		const { data: recentResults, error: resultsError } = await recentResultsQuery

		if (resultsError) {
			console.error('Error fetching recent results:', resultsError)
		}

		const transformedResults = (recentResults || []).map(result => ({
			id: result.id,
			register_no: result.stu_register_no,
			semester: result.semester,
			gpa: result.gpa,
			cgpa: result.cgpa,
			pass_status: result.pass_status,
			published_at: result.published_at,
			session_name: (result.examination_sessions as any)?.session_name || 'N/A'
		}))

		// 14. Fetch MyJKKN API data for live counts
		let myJKKNLearners = 0
		let myJKKNStaff = 0
		let myJKKNInstitutions = 0
		let myJKKNDepartments = 0
		let myJKKNPrograms = 0

		try {
			// Fetch learners count from MyJKKN
			const learnersResponse = await fetchMyJKKNStudents({
				page: 1,
				limit: 1,
				is_active: true,
				...(userInstitutionId && !isSuperAdmin ? { institution_code: userInstitutionId } : {})
			})
			myJKKNLearners = learnersResponse.metadata?.total || 0

			// Fetch staff count from MyJKKN
			const staffResponse = await fetchMyJKKNStaff({
				page: 1,
				limit: 1,
				is_active: true,
				...(userInstitutionId && !isSuperAdmin ? { institution_code: userInstitutionId } : {})
			})
			myJKKNStaff = staffResponse.metadata?.total || 0

			// Fetch institutions count from MyJKKN (only for super_admin)
			if (isSuperAdmin) {
				const institutionsResponse = await fetchMyJKKNInstitutions({
					page: 1,
					limit: 1,
					is_active: true
				})
				myJKKNInstitutions = institutionsResponse.metadata?.total || 0
			}

			// Fetch departments count from MyJKKN
			const departmentsResponse = await fetchMyJKKNDepartments({
				page: 1,
				limit: 1,
				is_active: true,
				...(userInstitutionId && !isSuperAdmin ? { institution_code: userInstitutionId } : {})
			})
			myJKKNDepartments = departmentsResponse.metadata?.total || 0

			// Fetch programs count from MyJKKN
			const programsResponse = await fetchMyJKKNPrograms({
				page: 1,
				limit: 1,
				is_active: true,
				...(userInstitutionId && !isSuperAdmin ? { institution_code: userInstitutionId } : {})
			})
			myJKKNPrograms = programsResponse.metadata?.total || 0

		} catch (myJKKNError) {
			console.error('Error fetching MyJKKN data (non-critical):', myJKKNError)
			// Continue with local data if MyJKKN API fails
		}

		// Return all stats
		return NextResponse.json({
			// Local COE database counts
			totalLearners: totalStudents,
			// For courses/programs, if super_admin use filtered count (which equals total), otherwise use filtered
			activeCourses: isSuperAdmin ? (totalCoursesAll || 0) : (activeCourses || 0),
			totalPrograms: isSuperAdmin ? (totalProgramsAll || 0) : (totalPrograms || 0),
			facultyMembers: facultyCount,
			totalInstitutions: totalInstitutions || 0,
			totalDepartments: totalDepartments || 0,
			totalSemesters: totalSemesters || 0,
			activeExamSessions: activeExamSessions || 0,
			totalExaminers: totalExaminers || 0,
			pendingEvaluations: pendingEvaluations || 0,
			// MyJKKN live counts
			myJKKN: {
				learners: myJKKNLearners,
				staff: myJKKNStaff,
				institutions: myJKKNInstitutions,
				departments: myJKKNDepartments,
				programs: myJKKNPrograms
			},
			attendanceRatio: `${attendanceRatio}%`,
			attendanceDetails: {
				total: totalAttendanceRecords,
				present: presentCount,
				absent: totalAttendanceRecords - presentCount
			},
			upcomingExams: transformedExams,
			recentResults: transformedResults,
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
