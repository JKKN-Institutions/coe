import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import type {
	StudentResultRow,
	GenerateFinalMarksPayload,
	GenerateFinalMarksResponse
} from '@/types/final-marks'

/**
 * GET /api/grading/final-marks
 * Fetch data for the final marks generation page
 * Actions: institutions, sessions, programs, courses, course-offerings, grades, final-marks
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const action = searchParams.get('action')
		const supabase = getSupabaseServer()

		switch (action) {
			case 'institutions': {
				const { data, error } = await supabase
					.from('institutions')
					.select('id, name, institution_code')
					.eq('is_active', true)
					.order('name')

				if (error) {
					console.error('Error fetching institutions:', error)
					return NextResponse.json({ error: 'Failed to fetch institutions' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			case 'sessions': {
				const institutionId = searchParams.get('institutionId')
				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				const { data, error } = await supabase
					.from('examination_sessions')
					.select('id, session_name, session_code')
					.eq('institutions_id', institutionId)
					.order('session_name', { ascending: false })

				if (error) {
					console.error('Error fetching sessions:', error)
					return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			case 'programs': {
				const institutionId = searchParams.get('institutionId')
				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				// Fetch programs with degree info
				const { data: programsData, error: programsError } = await supabase
					.from('programs')
					.select(`
						id,
						program_code,
						program_name,
						degree_id,
						degrees (
							id,
							degree_code,
							degree_name
						)
					`)
					.eq('institutions_id', institutionId)
					.eq('is_active', true)
					.order('program_name')

				if (programsError) {
					console.error('Error fetching programs:', programsError)
					return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 400 })
				}

				// Helper function to determine UG/PG from degree code/name
				const inferGradeSystem = (degreeCode?: string, degreeName?: string): 'UG' | 'PG' => {
					const code = (degreeCode || '').toUpperCase()
					const name = (degreeName || '').toUpperCase()
					// PG patterns: M.A., M.Sc., MBA, MCA, M.Com, M.Phil, Ph.D, etc.
					const pgPatterns = ['M.', 'MA', 'MSC', 'MBA', 'MCA', 'MCOM', 'MPHIL', 'PHD', 'PH.D', 'MASTER', 'POST']
					for (const pattern of pgPatterns) {
						if (code.includes(pattern) || name.includes(pattern)) {
							return 'PG'
						}
					}
					return 'UG'
				}

				// Transform to include grade_system_code based on degree name/code
				const transformed = programsData?.map((p: any) => {
					const degreeCode = p.degrees?.degree_code || null
					const degreeName = p.degrees?.degree_name || null
					return {
						id: p.id,
						program_code: p.program_code,
						program_name: p.program_name,
						degree_id: p.degree_id,
						degree_code: degreeCode,
						degree_name: degreeName,
						grade_system_code: inferGradeSystem(degreeCode, degreeName)
					}
				}) || []

				return NextResponse.json(transformed)
			}

			case 'course-offerings': {
				const institutionId = searchParams.get('institutionId')
				const programId = searchParams.get('programId')
				const sessionId = searchParams.get('sessionId')

				if (!programId) {
					return NextResponse.json({ error: 'Program ID is required' }, { status: 400 })
				}

				let query = supabase
					.from('course_offerings')
					.select(`
						id,
						course_id,
						program_id,
						semester,
						section,
						courses:course_id (
							id,
							course_code,
							course_name,
							course_type,
							credit
						)
					`)
					.eq('program_id', programId)
					.eq('is_active', true)

				if (sessionId) {
					query = query.eq('examination_session_id', sessionId)
				}

				const { data, error } = await query.order('semester')

				if (error) {
					console.error('Error fetching course offerings:', error)
					return NextResponse.json({ error: 'Failed to fetch course offerings' }, { status: 400 })
				}

				// Check which courses already have final marks saved
				let savedCourseIds: string[] = []
				if (institutionId && sessionId && data && data.length > 0) {
					const courseIds = data.map((co: any) => co.course_id)
					const { data: savedMarks } = await supabase
						.from('final_marks')
						.select('course_id')
						.eq('institutions_id', institutionId)
						.eq('program_id', programId)
						.eq('examination_session_id', sessionId)
						.in('course_id', courseIds)
						.eq('is_active', true)

					if (savedMarks) {
						savedCourseIds = [...new Set(savedMarks.map((m: any) => m.course_id))]
					}
				}

				// Transform to flatten course data and mark saved courses
				const transformed = data?.map((co: any) => ({
					id: co.id,
					course_id: co.course_id,
					program_id: co.program_id,
					semester: co.semester,
					section: co.section,
					course_code: co.courses?.course_code,
					course_name: co.courses?.course_name || co.courses?.course_code,
					course_type: co.courses?.course_type,
					credits: co.courses?.credit,
					is_saved: savedCourseIds.includes(co.course_id)
				})) || []

				return NextResponse.json(transformed)
			}

			case 'courses': {
				const institutionId = searchParams.get('institutionId')
				const programId = searchParams.get('programId')

				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				let query = supabase
					.from('courses')
					.select(`
						id,
						course_code,
						course_type,
						credit
					`)
					.eq('institutions_id', institutionId)
					.eq('is_active', true)

				const { data, error } = await query.order('course_code')

				if (error) {
					console.error('Error fetching courses:', error)
					return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			case 'grades': {
				const institutionId = searchParams.get('institutionId')
				const regulationId = searchParams.get('regulationId')

				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				let query = supabase
					.from('grades')
					.select('*')
					.eq('institutions_id', institutionId)

				if (regulationId) {
					query = query.eq('regulation_id', regulationId)
				}

				const { data, error } = await query.order('min_mark', { ascending: false })

				if (error) {
					console.error('Error fetching grades:', error)
					return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			case 'final-marks': {
				const institutionId = searchParams.get('institutionId')
				const sessionId = searchParams.get('sessionId')
				const programId = searchParams.get('programId')
				const courseId = searchParams.get('courseId')
				const resultStatus = searchParams.get('resultStatus')

				if (!institutionId) {
					return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
				}

				let query = supabase
					.from('final_marks_detailed_view')
					.select('*')
					.eq('institutions_id', institutionId)
					.eq('is_active', true)

				if (sessionId) query = query.eq('examination_session_id', sessionId)
				if (programId) query = query.eq('program_id', programId)
				if (courseId) query = query.eq('course_id', courseId)
				if (resultStatus) query = query.eq('result_status', resultStatus)

				const { data, error } = await query.order('created_at', { ascending: false })

				if (error) {
					console.error('Error fetching final marks:', error)
					return NextResponse.json({ error: 'Failed to fetch final marks' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			case 'exam-registrations': {
				const institutionId = searchParams.get('institutionId')
				const sessionId = searchParams.get('sessionId')
				const programId = searchParams.get('programId')

				if (!institutionId || !sessionId) {
					return NextResponse.json({ error: 'Institution ID and Session ID are required' }, { status: 400 })
				}

				let query = supabase
					.from('exam_registrations')
					.select(`
						id,
						stu_register_no,
						student_id,
						student_name,
						course_offering_id,
						examination_session_id,
						institutions_id,
						course_offerings!inner (
							id,
							course_id,
							program_id,
							semester,
							courses!inner (
								id,
								course_code,
								course_type,
								credit
							)
						)
					`)
					.eq('institutions_id', institutionId)
					.eq('examination_session_id', sessionId)

				if (programId) {
					query = query.eq('course_offerings.program_id', programId)
				}

				const { data, error } = await query

				if (error) {
					console.error('Error fetching exam registrations:', error)
					return NextResponse.json({ error: 'Failed to fetch exam registrations' }, { status: 400 })
				}
				return NextResponse.json(data || [])
			}

			default:
				return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
		}
	} catch (error) {
		console.error('Final marks API GET error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

/**
 * POST /api/grading/final-marks
 * Generate final marks for selected courses
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const body: GenerateFinalMarksPayload = await request.json()

		const {
			institutions_id,
			program_id,
			examination_session_id,
			course_ids,
			regulation_id,
			grade_system_code,
			calculated_by,
			save_to_db = false
		} = body

		// Validate required fields
		if (!institutions_id || !program_id || !examination_session_id || !course_ids?.length) {
			return NextResponse.json({
				error: 'Missing required fields: institutions_id, program_id, examination_session_id, course_ids'
			}, { status: 400 })
		}

		// 1. Fetch grade_system table with grades info for percentage-based grading
		let gradesQuery = supabase
			.from('grade_system')
			.select(`
				id,
				grade_system_code,
				grade,
				grade_point,
				min_mark,
				max_mark,
				description,
				grades:grade_id (
					id,
					qualify,
					is_absent,
					exclude_cgpa,
					result_status
				)
			`)
			.eq('institutions_id', institutions_id)
			.eq('is_active', true)

		if (regulation_id) {
			gradesQuery = gradesQuery.eq('regulation_id', regulation_id)
		}
		if (grade_system_code) {
			gradesQuery = gradesQuery.eq('grade_system_code', grade_system_code)
		}

		const { data: grades, error: gradesError } = await gradesQuery.order('min_mark', { ascending: false })

		if (gradesError || !grades?.length) {
			console.error('Grade system error:', gradesError)
			return NextResponse.json({
				error: 'No grade system found. Please configure grades first.'
			}, { status: 400 })
		}

		// 2. Fetch exam registrations for the selected courses
		const { data: examRegistrations, error: examRegError } = await supabase
			.from('exam_registrations')
			.select(`
				id,
				stu_register_no,
				student_id,
				student_name,
				course_offering_id,
				examination_session_id,
				institutions_id,
				course_offerings!inner (
					id,
					course_id,
					program_id,
					semester,
					courses!inner (
						id,
						course_code,
						course_name,
						course_type,
						credit,
						internal_max_mark,
						internal_pass_mark,
						internal_converted_mark,
						external_max_mark,
						external_pass_mark,
						external_converted_mark,
						total_max_mark,
						total_pass_mark
					)
				)
			`)
			.eq('institutions_id', institutions_id)
			.eq('examination_session_id', examination_session_id)
			.eq('course_offerings.program_id', program_id)
			.in('course_offerings.course_id', course_ids)

		if (examRegError) {
			console.error('Error fetching exam registrations:', examRegError)
			return NextResponse.json({ error: 'Failed to fetch exam registrations' }, { status: 400 })
		}

		if (!examRegistrations?.length) {
			return NextResponse.json({
				error: 'No exam registrations found for the selected courses and session.'
			}, { status: 400 })
		}

		// 3. Fetch internal marks for these students/courses
		const studentIds = [...new Set(examRegistrations.map((er: any) => er.student_id))]
		const { data: internalMarks, error: internalError } = await supabase
			.from('internal_marks')
			.select('*')
			.eq('institutions_id', institutions_id)
			.eq('examination_session_id', examination_session_id)
			.in('student_id', studentIds)
			.in('course_id', course_ids)
			.eq('is_active', true)

		if (internalError) {
			console.error('Error fetching internal marks:', internalError)
		}

		// Create internal marks lookup map: student_id + course_id -> marks
		const internalMarksMap = new Map<string, any>()
		internalMarks?.forEach((im: any) => {
			const key = `${im.student_id}|${im.course_id}`
			internalMarksMap.set(key, im)
		})

		// 4. Fetch external marks (marks_entry table)
		const examRegIds = examRegistrations.map((er: any) => er.id)
		const { data: externalMarks, error: externalError } = await supabase
			.from('marks_entry')
			.select('*')
			.in('exam_registration_id', examRegIds)

		if (externalError) {
			console.error('Error fetching external marks:', externalError)
		}

		// Create external marks lookup map: exam_registration_id -> marks
		const externalMarksMap = new Map<string, any>()
		externalMarks?.forEach((em: any) => {
			externalMarksMap.set(em.exam_registration_id, em)
		})

		// 5. Process each exam registration and calculate final marks
		const results: StudentResultRow[] = []
		const errors: Array<{
			student_id: string
			student_name: string
			register_no: string
			course_code: string
			error: string
		}> = []

		const summary = {
			passed: 0,
			failed: 0,
			absent: 0,
			reappear: 0,
			withheld: 0,
			distinction: 0,
			first_class: 0
		}

		for (const examReg of examRegistrations) {
			const courseOffering = (examReg as any).course_offerings
			const course = courseOffering?.courses

			if (!course) continue

			const internalKey = `${examReg.student_id}|${course.id}`
			const internalMark = internalMarksMap.get(internalKey)
			const externalMark = externalMarksMap.get(examReg.id)

			// Get marks configuration from course table (exact values, no fallbacks)
			const internalMax = Number(course.internal_max_mark) || 0
			const internalPassMark = Number(course.internal_pass_mark) || 0
			const externalMax = Number(course.external_max_mark) || 0
			const externalPassMark = Number(course.external_pass_mark) || 0
			const totalMax = Number(course.total_max_mark) || 0
			const totalPassMark = Number(course.total_pass_mark) || 0
			const isAbsent = externalMark?.is_absent || false

			// Get marks obtained (cap at max values)
			let internalMarksObtained = Number(internalMark?.total_internal_marks) || 0
			let externalMarksObtained = Number(externalMark?.total_marks_obtained) || 0

			// Validate: marks should not exceed max marks
			if (internalMarksObtained > internalMax) {
				internalMarksObtained = internalMax
			}
			if (externalMarksObtained > externalMax) {
				externalMarksObtained = externalMax
			}

			// Calculate total (cap at total max)
			let totalMarks = internalMarksObtained + externalMarksObtained
			if (totalMarks > totalMax) {
				totalMarks = totalMax
			}

			const percentage = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100 * 100) / 100 : 0

			// Determine pass/fail based on course rules
			let failReason: 'INTERNAL' | 'EXTERNAL' | 'TOTAL' | null = null
			let isPass = true

			// Case 1: Student is absent in external exam
			if (isAbsent) {
				isPass = false
				failReason = 'EXTERNAL'
			}
			// Case 2: No external marks entry found (student didn't appear)
			else if (!externalMark) {
				isPass = false
				failReason = 'EXTERNAL'
			}
			else {
				// Check internal pass condition
				if (internalPassMark > 0 && internalMarksObtained < internalPassMark) {
					isPass = false
					failReason = 'INTERNAL'
				}
				// Check external pass condition
				else if (externalPassMark > 0 && externalMarksObtained < externalPassMark) {
					isPass = false
					failReason = 'EXTERNAL'
				}
				// Check total pass condition
				else if (totalPassMark > 0 && totalMarks < totalPassMark) {
					isPass = false
					failReason = 'TOTAL'
				}
			}

			// Determine grade based on percentage
			let gradeEntry: any = undefined
			if (isAbsent || !externalMark) {
				// Find absent grade (min_mark = -1 and max_mark = -1 for absent)
				gradeEntry = grades.find((g: any) => g.grades?.is_absent === true || (g.min_mark === -1 && g.max_mark === -1))
			}
			if (!gradeEntry && !isPass) {
				// Find fail/reappear grade (U grade)
				gradeEntry = grades.find((g: any) => g.grade === 'U' || g.grades?.result_status === 'REAPPEAR')
			}
			if (!gradeEntry) {
				// Find grade by percentage range
				gradeEntry = grades.find((g: any) => percentage >= g.min_mark && percentage <= g.max_mark)
			}

			// If failed, override to U grade with 0 grade points and 'Re-Appear' description
			const letterGrade = isPass ? (gradeEntry?.grade || 'RA') : 'U'
			const gradePoint = isPass ? (gradeEntry?.grade_point || 0) : 0
			const gradeDescription = isPass ? (gradeEntry?.description || '') : 'Re-Appear'
			const credits = course.credit || 0
			const creditPoints = gradePoint * credits

			// Determine pass status based on course rules and grade system
			let passStatus: 'Pass' | 'Fail' | 'Reappear' | 'Absent' | 'Withheld' | 'Expelled' = 'Fail'
			if (isAbsent || !externalMark) {
				passStatus = 'Absent'
				summary.absent++
			} else if (isPass) {
				passStatus = 'Pass'
				summary.passed++
				// Check distinction/first class based on grade description
				const gradeDesc = (gradeEntry?.description || '').toUpperCase()
				const gradeLetter = (gradeEntry?.grade || '').toUpperCase()
				// Distinction: D, D+ grades or description contains 'DISTINCTION'
				if (gradeLetter === 'D' || gradeLetter === 'D+' || gradeDesc.includes('DISTINCTION')) {
					summary.distinction++
				}
				// First class: A, A+, D, D+, O grades or description contains 'FIRST' or grade_point >= 6.0
				if (gradeLetter === 'A' || gradeLetter === 'A+' || gradeLetter === 'D' || gradeLetter === 'D+' || gradeLetter === 'O' ||
					gradeDesc.includes('FIRST') || (gradeEntry?.grade_point || 0) >= 6.0) {
					summary.first_class++
				}
			} else {
				passStatus = 'Reappear'
				summary.failed++
				summary.reappear++
			}

			const resultRow: StudentResultRow = {
				student_id: examReg.student_id,
				student_name: examReg.student_name || 'Unknown',
				register_no: examReg.stu_register_no || 'N/A',
				exam_registration_id: examReg.id,
				course_offering_id: courseOffering.id,
				course_id: course.id,
				course_code: course.course_code,
				course_name: course.course_name || course.course_code,
				internal_marks: internalMarksObtained,
				internal_max: internalMax,
				internal_pass_mark: internalPassMark,
				external_marks: externalMarksObtained,
				external_max: externalMax,
				external_pass_mark: externalPassMark,
				total_marks: totalMarks,
				total_max: totalMax,
				total_pass_mark: totalPassMark,
				percentage,
				grade: letterGrade,
				grade_point: gradePoint,
				grade_description: gradeDescription,
				credits,
				credit_points: creditPoints,
				pass_status: passStatus,
				is_pass: isPass,
				is_absent: isAbsent,
				fail_reason: failReason,
				internal_marks_id: internalMark?.id || null,
				marks_entry_id: externalMark?.id || null
			}

			results.push(resultRow)
		}

		// 6. Save to database if requested
		let savedCount = 0
		if (save_to_db && results.length > 0) {
			for (const result of results) {
				try {
					const insertData = {
						institutions_id,
						examination_session_id,
						exam_registration_id: result.exam_registration_id,
						course_offering_id: result.course_offering_id,
						program_id,
						course_id: result.course_id,
						student_id: result.student_id,
						internal_marks_id: result.internal_marks_id,
						marks_entry_id: result.marks_entry_id,
						internal_marks_obtained: result.internal_marks,
						internal_marks_maximum: result.internal_max,
						external_marks_obtained: result.external_marks,
						external_marks_maximum: result.external_max,
						total_marks_obtained: result.total_marks,
						total_marks_maximum: result.total_max,
						percentage: result.percentage,
						grace_marks: 0,
						letter_grade: result.grade,
						grade_points: result.grade_point,
						grade_description: result.grade_description,
						is_pass: result.is_pass,
						pass_status: result.pass_status,
						result_status: 'Pending',
						calculated_by: calculated_by || null,
						calculated_at: new Date().toISOString(),
						is_active: true
					}

					const { error: insertError } = await supabase
						.from('final_marks')
						.upsert(insertData, {
							onConflict: 'student_id,course_id,examination_session_id'
						})

					if (insertError) {
						console.error('Error saving final mark:', insertError)
						errors.push({
							student_id: result.student_id,
							student_name: result.student_name,
							register_no: result.register_no,
							course_code: result.course_code,
							error: insertError.message
						})
					} else {
						savedCount++
					}
				} catch (err) {
					console.error('Error saving final mark:', err)
					errors.push({
						student_id: result.student_id,
						student_name: result.student_name,
						register_no: result.register_no,
						course_code: result.course_code,
						error: err instanceof Error ? err.message : 'Unknown error'
					})
				}
			}
		}

		const response: GenerateFinalMarksResponse = {
			success: true,
			total_students: [...new Set(results.map(r => r.student_id))].length,
			total_courses: course_ids.length,
			results,
			summary,
			saved_count: savedCount,
			errors: errors.length > 0 ? errors : undefined
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Final marks API POST error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

/**
 * DELETE /api/grading/final-marks
 * Delete final marks by ID
 */
export async function DELETE(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'ID is required' }, { status: 400 })
		}

		// Check if the record is locked or published
		const { data: existing, error: fetchError } = await supabase
			.from('final_marks')
			.select('is_locked, result_status')
			.eq('id', id)
			.single()

		if (fetchError) {
			return NextResponse.json({ error: 'Record not found' }, { status: 404 })
		}

		if (existing.is_locked) {
			return NextResponse.json({ error: 'Cannot delete locked record' }, { status: 400 })
		}

		if (existing.result_status === 'Published') {
			return NextResponse.json({ error: 'Cannot delete published result' }, { status: 400 })
		}

		// Soft delete
		const { error } = await supabase
			.from('final_marks')
			.update({ is_active: false })
			.eq('id', id)

		if (error) {
			console.error('Error deleting final mark:', error)
			return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
		}

		return NextResponse.json({ message: 'Record deleted successfully' })
	} catch (error) {
		console.error('Final marks DELETE error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
