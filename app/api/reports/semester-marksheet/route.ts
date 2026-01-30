import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// =====================================================
// GRADE CONVERSION TABLE (UG)
// =====================================================

const UG_GRADE_TABLE = [
	{ min: 90, max: 100, gradePoint: 10.0, letterGrade: 'O', description: 'Outstanding' },
	{ min: 80, max: 89, gradePoint: 9.0, letterGrade: 'A+', description: 'Excellent' },
	{ min: 70, max: 79, gradePoint: 8.0, letterGrade: 'A', description: 'Good' },
	{ min: 60, max: 69, gradePoint: 7.0, letterGrade: 'B+', description: 'Above Average' },
	{ min: 50, max: 59, gradePoint: 6.0, letterGrade: 'B', description: 'Average' },
	{ min: 40, max: 49, gradePoint: 5.0, letterGrade: 'C', description: 'Satisfactory' },
	{ min: 0, max: 39, gradePoint: 0.0, letterGrade: 'U', description: 'Re-Appear' },
	{ min: -1, max: -1, gradePoint: 0.0, letterGrade: 'AAA', description: 'ABSENT' }
]

// Part descriptions mapping
const PART_DESCRIPTIONS: Record<string, string> = {
	'Part I': 'Language I (Tamil/Hindi/French etc.)',
	'Part II': 'Language II (English)',
	'Part III': 'Core/Major Subjects',
	'Part IV': 'Allied/Skill Enhancement/Foundation',
	'Part V': 'Extension Activities/Projects'
}

// Part order for sorting
const PART_ORDER = ['Part I', 'Part II', 'Part III', 'Part IV', 'Part V']

/**
 * Get grade details from percentage
 * Supports continuous/interpolated grade points
 */
function getGradeFromPercentage(
	percentage: number,
	isAbsent: boolean = false
): { gradePoint: number; letterGrade: string; description: string } {
	if (isAbsent) {
		return { gradePoint: 0, letterGrade: 'AAA', description: 'ABSENT' }
	}

	// Use continuous grade point calculation
	// Grade point = percentage / 10 (capped at range boundaries)
	const continuousGP = Math.round((percentage / 10) * 10) / 10

	for (const grade of UG_GRADE_TABLE) {
		if (percentage >= grade.min && percentage <= grade.max) {
			return {
				gradePoint: continuousGP,
				letterGrade: grade.letterGrade,
				description: grade.description
			}
		}
	}

	return { gradePoint: 0, letterGrade: 'U', description: 'Re-Appear' }
}

/**
 * Check if student passed based on pass marks
 * UG: Passing requires 40% in ESE AND 40% in Total
 * PG: Passing requires 50% in ESE AND 50% in Total
 */
function checkPassStatus(
	eseMarks: number,
	eseMax: number,
	totalMarks: number,
	totalMax: number,
	passingPercentage: number = 40  // Default to UG (40%), use 50 for PG
): { isPassing: boolean; result: string } {
	const esePercentage = eseMax > 0 ? (eseMarks / eseMax) * 100 : 0
	const totalPercentage = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0

	const passesESE = esePercentage >= passingPercentage
	const passesTotal = totalPercentage >= passingPercentage

	if (passesESE && passesTotal) {
		return { isPassing: true, result: 'PASS' }
	}
	return { isPassing: false, result: 'RA' }
}

/**
 * Check if program is PG based on code or name
 */
function isPGProgram(programCode: string, programName?: string): boolean {
	const code = programCode?.toUpperCase() || ''
	const name = programName?.toUpperCase() || ''

	// Check code prefixes
	const pgCodePrefixes = ['M', 'MBA', 'MCA', 'MSW', 'MSC', 'MA', 'MCOM', 'PHD', 'PG']
	if (pgCodePrefixes.some(prefix => code.startsWith(prefix))) {
		return true
	}

	// Check if code contains 'PG'
	if (code.includes('PG')) {
		return true
	}

	// Check program name for PG indicators
	const pgNamePatterns = ['M.SC', 'MSC', 'M.A.', 'M.A ', 'MA ', 'M.COM', 'MCOM', 'MBA', 'MCA', 'M.PHIL', 'MPHIL', 'PH.D', 'PHD', 'POST GRADUATE', 'POSTGRADUATE', 'MASTER']
	if (pgNamePatterns.some(pattern => name.includes(pattern))) {
		return true
	}

	return false
}

/**
 * Get part order for sorting
 */
function getPartOrder(partName: string): number {
	const index = PART_ORDER.findIndex(p => p.toLowerCase() === partName?.toLowerCase())
	return index >= 0 ? index : 999
}

// =====================================================
// API HANDLERS
// =====================================================

export async function GET(req: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(req.url)
		const action = searchParams.get('action')

		// Get marksheet data for a specific student
		if (action === 'student-marksheet') {
			const studentId = searchParams.get('studentId')
			const sessionId = searchParams.get('sessionId')
			const semester = searchParams.get('semester')

			if (!studentId || !sessionId) {
				return NextResponse.json({ error: 'studentId and sessionId are required' }, { status: 400 })
			}

			// Fetch final marks with course details
			let query = supabase
				.from('final_marks')
				.select(`
					id,
					student_id,
					course_id,
					internal_marks_obtained,
					internal_marks_maximum,
					external_marks_obtained,
					external_marks_maximum,
					total_marks_obtained,
					total_marks_maximum,
					percentage,
					grade_points,
					letter_grade,
					grade_description,
					is_pass,
					pass_status,
					course_offerings (
						semester,
						course_mapping (
							course_order,
							semester_code,
							courses (
								course_code,
								course_name,
								credit,
								course_part_master
							)
						)
					),
					exam_registrations (
						stu_register_no,
						student_name
					)
				`)
				.eq('student_id', studentId)
				.eq('examination_session_id', sessionId)
				.eq('is_active', true)

			if (semester) {
				query = query.eq('course_offerings.semester', parseInt(semester))
			}

			const { data: finalMarks, error: fmError } = await query

			if (fmError) {
				console.error('Error fetching final marks:', fmError)
				throw fmError
			}

			if (!finalMarks || finalMarks.length === 0) {
				return NextResponse.json({ error: 'No marks found for the student' }, { status: 404 })
			}

			// Get student details - exam_registrations may be array or single object
			const examReg = Array.isArray(finalMarks[0]?.exam_registrations)
				? finalMarks[0]?.exam_registrations[0]
				: finalMarks[0]?.exam_registrations
			const studentName = examReg?.student_name || ''
			const registerNo = examReg?.stu_register_no || ''

			// Get semester result for GPA summary (fetch early to get program_code for learner lookup)
			const { data: semesterResult } = await supabase
				.from('semester_results')
				.select('*')
				.eq('student_id', studentId)
				.eq('examination_session_id', sessionId)
				.single()

			// Fetch program name from MyJKKN API using program_code
			let programName = semesterResult?.program_name || ''
			const programCode = semesterResult?.program_code || ''

			// Fetch extended learner details from learners_profiles for JasperReports fields
			let dateOfBirth: string | null = null
			let photoUrl: string | null = null
			let learnerExtendedInfo: {
				firstName?: string
				middleName?: string
				lastName?: string
				fatherName?: string
				motherName?: string
				guardianName?: string
				gender?: string
				admissionYear?: string
				batchName?: string
			} = {}

			// Fetch learner profile from MyJKKN API (primary source)
			// Include program_id (UUID) and institution to help narrow down results since search by register_number may not work
			const institutionIdForLookup = semesterResult?.institutions_id
			console.log(`[Semester Marksheet] Fetching learner profile from MyJKKN API for registerNo: "${registerNo}", programCode: "${programCode}", institutionId: "${institutionIdForLookup}"`)

			// Get MyJKKN institution IDs for filtering
			let myjkknInstitutionId: string | null = null
			let myjkknProgramId: string | null = null  // UUID, not string code
			if (institutionIdForLookup) {
				const { data: institution } = await supabase
					.from('institutions')
					.select('myjkkn_institution_ids')
					.eq('id', institutionIdForLookup)
					.single()
				const myjkknIds = institution?.myjkkn_institution_ids || []
				if (myjkknIds.length > 0) {
					myjkknInstitutionId = myjkknIds[0]  // Use first MyJKKN institution ID
					console.log(`[Semester Marksheet] Using MyJKKN institution_id: ${myjkknInstitutionId}`)

					// Look up MyJKKN program_id (UUID) from program_code
					// The external API needs program_id (UUID), not program_code (string)
					if (programCode) {
						try {
							const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
							const progRes = await fetch(`${baseUrl}/api/myjkkn/programs?institution_id=${myjkknInstitutionId}&limit=100`)
							if (progRes.ok) {
								const progData = await progRes.json()
								const programs = progData.data || progData || []
								// Find program by code (MyJKKN uses program_id as code field)
								const matchingProg = programs.find((p: any) =>
									(p.program_id === programCode || p.program_code === programCode)
								)
								
								if (matchingProg && matchingProg.id) {
									myjkknProgramId = matchingProg.id  // This is the UUID
									console.log(`[Semester Marksheet] Found MyJKKN program UUID: ${myjkknProgramId} for code ${programCode}`)
								}
							}
						} catch (progErr) {
							console.warn('[Semester Marksheet] Failed to look up program_id:', progErr)
						}
					}
				}
			}

			if (registerNo) {
				try {
					const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
					// Build query params - use institution_id and program_id (UUIDs)
					// Use fetchAll=true to get all learners (will paginate automatically)
					// Don't use search/register_number as filter - external API doesn't support it well
					const params = new URLSearchParams({
						limit: '100000',  // Large limit to trigger fetchAll mode
						fetchAll: 'true'  // Explicitly request all pages
					})
					// Use program_id (UUID) - this is what the external API expects
					if (myjkknProgramId) {
						params.set('program_id', myjkknProgramId)
					}
					if (myjkknInstitutionId) {
						params.set('institution_id', myjkknInstitutionId)
					}
					console.log(`[Semester Marksheet] Querying learner-profiles with: ${params.toString()}`)
					const myjkknRes = await fetch(`${baseUrl}/api/myjkkn/learner-profiles?${params.toString()}`)

					console.log(`[Semester Marksheet] MyJKKN API response status:`, myjkknRes.status)

					if (myjkknRes.ok) {
						const myjkknData = await myjkknRes.json()
						let profiles = myjkknData.data || myjkknData || []

						console.log(`[Semester Marksheet] MyJKKN API returned ${profiles.length} profiles`)

						// If no exact match found but we have results, look for matching register number
						if (profiles.length > 0) {
							// Find the exact matching learner by register_number
							const matchingProfile = profiles.find((p: any) =>
								p.register_number === registerNo || p.roll_number === registerNo
							)

							const learnerProfile = matchingProfile || profiles[0]

							if (matchingProfile) {
								console.log(`[Semester Marksheet] Found exact match for ${registerNo}`)
							} else {
								console.log(`[Semester Marksheet] No exact match, using first result`)
							}

							console.log(`[Semester Marksheet] Learner profile found:`, {
								hasData: true,
								register_number: learnerProfile.register_number,
								hasPhotoUrl: !!learnerProfile.student_photo_url,
								photoUrlPreview: learnerProfile.student_photo_url?.substring(0, 80) || 'NULL'
							})

							// Format DOB as DD-MM-YYYY
							if (learnerProfile.date_of_birth) {
								const dob = new Date(learnerProfile.date_of_birth)
								if (!isNaN(dob.getTime())) {
									dateOfBirth = `${String(dob.getDate()).padStart(2, '0')}-${String(dob.getMonth() + 1).padStart(2, '0')}-${dob.getFullYear()}`
								}
							}

							// Get photo URL from MyJKKN (if available)
							if (learnerProfile.student_photo_url) {
								photoUrl = learnerProfile.student_photo_url
								console.log(`[Semester Marksheet] Found photo URL from MyJKKN for ${registerNo}:`, photoUrl?.substring(0, 100))
							}

							// Extract extended info for JasperReports compatibility
							learnerExtendedInfo = {
								firstName: learnerProfile.first_name || undefined,
								middleName: undefined,  // Not available in MyJKKN API
								lastName: learnerProfile.last_name || undefined,
								fatherName: learnerProfile.father_name || undefined,
								motherName: learnerProfile.mother_name || undefined,
								guardianName: undefined,  // Not available in MyJKKN API
								gender: learnerProfile.gender || undefined,
								admissionYear: learnerProfile.admission_year?.toString() || undefined,
								batchName: undefined  // Not directly available, would need batch lookup
							}
						} else {
							console.log(`[Semester Marksheet] No profile found in MyJKKN API for ${registerNo}`)
						}
					} else {
						console.warn(`[Semester Marksheet] MyJKKN API error: ${myjkknRes.status}`)
					}
				} catch (myjkknError) {
					console.warn('[Semester Marksheet] Failed to fetch from MyJKKN API:', myjkknError)
				}

				// Fallback: Fetch photo URL from local Supabase if not found in MyJKKN
				if (!photoUrl) {
					console.log(`[Semester Marksheet] Photo not in MyJKKN, checking local DB for ${registerNo}`)
					const { data: localProfile } = await supabase
						.from('learners_profiles')
						.select('student_photo_url')
						.eq('register_number', registerNo)
						.maybeSingle()

					if (localProfile?.student_photo_url) {
						photoUrl = localProfile.student_photo_url
						console.log(`[Semester Marksheet] Found photo URL from local DB for ${registerNo}:`, photoUrl?.substring(0, 100))
					} else {
						console.log(`[Semester Marksheet] No photo URL found in local DB for ${registerNo}`)
					}
				}
			}

			if (programCode && !programName) {
				// Get institution to look up program
				const institutionId = semesterResult?.institutions_id
				if (institutionId) {
					const { data: institution } = await supabase
						.from('institutions')
						.select('myjkkn_institution_ids')
						.eq('id', institutionId)
						.single()

					const myjkknIds: string[] = institution?.myjkkn_institution_ids || []

					if (myjkknIds.length > 0) {
						try {
							const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

							for (const myjkknInstId of myjkknIds) {
								const params = new URLSearchParams({
									limit: '100',
									is_active: 'true',
									institution_id: myjkknInstId
								})

								const res = await fetch(`${baseUrl}/api/myjkkn/programs?${params.toString()}`)

								if (res.ok) {
									const response = await res.json()
									const programs = response.data || response || []

									// Find program by code (MyJKKN uses program_id as code)
									const matchingProgram = programs.find((p: any) =>
										(p.program_id === programCode || p.program_code === programCode)
									)

									if (matchingProgram) {
										programName = matchingProgram.program_name || matchingProgram.name || ''
										break
									}
								}
							}
						} catch (error) {
							console.warn('[Semester Marksheet] Failed to fetch program name from MyJKKN:', error)
						}
					}
				}
			}

			// Process courses and group by part
			interface ProcessedCourse {
				courseCode: string
				courseName: string
				part: string
				partDescription: string
				semester: number
				semesterCode: string
				courseOrder: number
				credits: number
				eseMax: number
				ciaMax: number
				totalMax: number
				eseMarks: number
				ciaMarks: number
				totalMarks: number
				percentage: number
				gradePoint: number
				letterGrade: string
				creditPoints: number
				isPassing: boolean
				result: string
				// Enhanced status flags (optional - from JasperReports decode)
				assessmentType?: string
				passMarks?: number
				isAbsent?: boolean
				isMalpractice?: boolean
				isIneligible?: boolean
				isTermFail?: boolean
				isFinalFail?: boolean
			}

			const processedCourses: ProcessedCourse[] = []

			// Determine passing percentage based on program type (UG: 40%, PG: 50%)
			const isPG = isPGProgram(programCode, programName)
			const passingPercentage = isPG ? 50 : 40

			finalMarks.forEach((fm: any) => {
				const courseData = fm.course_offerings?.course_mapping?.courses
				if (!courseData) return

				const eseMarks = fm.external_marks_obtained || 0
				const ciaMarks = fm.internal_marks_obtained || 0
				const totalMarks = fm.total_marks_obtained || 0
				const eseMax = fm.external_marks_maximum || 75
				const ciaMax = fm.internal_marks_maximum || 25
				const totalMax = fm.total_marks_maximum || 100
				const percentage = fm.percentage || (totalMax > 0 ? (totalMarks / totalMax) * 100 : 0)

				// Use grade values from database if available, otherwise calculate
				let gradePoint = fm.grade_points
				let letterGrade = fm.letter_grade

				if (gradePoint === null || gradePoint === undefined) {
					const gradeInfo = getGradeFromPercentage(percentage)
					gradePoint = gradeInfo.gradePoint
					letterGrade = gradeInfo.letterGrade
				}

				// Enhanced status detection (from JasperReports decode)
				const isAbsent = (eseMarks === 0 && ciaMarks === 0 && totalMarks === 0) ||
				                 (letterGrade === 'AAA')
				const passMarks = Math.ceil(totalMax * (passingPercentage / 100)) // UG: 40%, PG: 50%

				// Check pass status (UG: 40%, PG: 50%)
				const { isPassing, result } = checkPassStatus(eseMarks, eseMax, totalMarks, totalMax, passingPercentage)

				// If failed, grade point becomes 0
				const finalGradePoint = (isPassing && !isAbsent) ? gradePoint : 0
				const credits = courseData.credit || 0
				const creditPoints = credits * finalGradePoint

				const part = courseData.course_part_master || 'Part III'

				processedCourses.push({
					courseCode: courseData.course_code,
					courseName: courseData.course_name,
					part,
					partDescription: PART_DESCRIPTIONS[part] || '',
					semester: fm.course_offerings?.semester || 1,
					semesterCode: fm.course_offerings?.course_mapping?.semester_code || '',
					courseOrder: fm.course_offerings?.course_mapping?.course_order || 0,
					credits,
					eseMax,
					ciaMax,
					totalMax,
					eseMarks,
					ciaMarks,
					totalMarks,
					percentage: Math.round(percentage * 100) / 100,
					gradePoint: Math.round(finalGradePoint * 10) / 10,
					letterGrade: letterGrade || 'U',
					creditPoints: Math.round(creditPoints * 10) / 10,
					isPassing,
					result,
					// Enhanced fields
					assessmentType: undefined, // Can be populated from DB if available
					passMarks,
					isAbsent,
					isMalpractice: false,     // Can be populated from DB if available
					isIneligible: false,      // Can be populated from DB if available
					isTermFail: !isPassing && !isAbsent,
					isFinalFail: !isPassing && !isAbsent
				})
			})

			// Sort by part order, then course order
			processedCourses.sort((a, b) => {
				const partDiff = getPartOrder(a.part) - getPartOrder(b.part)
				if (partDiff !== 0) return partDiff
				return a.courseOrder - b.courseOrder
			})

			// Group courses by part
			const partGroups: Record<string, {
				partName: string
				partDescription: string
				courses: ProcessedCourse[]
				totalCredits: number
				totalCreditPoints: number
				partGPA: number
				creditsEarned: number
			}> = {}

			processedCourses.forEach(course => {
				if (!partGroups[course.part]) {
					partGroups[course.part] = {
						partName: course.part,
						partDescription: course.partDescription,
						courses: [],
						totalCredits: 0,
						totalCreditPoints: 0,
						partGPA: 0,
						creditsEarned: 0
					}
				}
				partGroups[course.part].courses.push(course)
				partGroups[course.part].totalCredits += course.credits
				partGroups[course.part].totalCreditPoints += course.creditPoints
				if (course.isPassing) {
					partGroups[course.part].creditsEarned += course.credits
				}
			})

			// Calculate part-wise GPA
			Object.values(partGroups).forEach(part => {
				part.partGPA = part.totalCredits > 0
					? Math.round((part.totalCreditPoints / part.totalCredits) * 100) / 100
					: 0
			})

			// Sort parts by order
			const sortedParts = Object.values(partGroups).sort((a, b) =>
				getPartOrder(a.partName) - getPartOrder(b.partName)
			)

			// Calculate overall semester GPA
			const totalCredits = processedCourses.reduce((sum, c) => sum + c.credits, 0)
			const totalCreditPoints = processedCourses.reduce((sum, c) => sum + c.creditPoints, 0)
			const semesterGPA = totalCredits > 0
				? Math.round((totalCreditPoints / totalCredits) * 100) / 100
				: 0

			// Calculate credits earned (only passed courses)
			const creditsEarned = processedCourses
				.filter(c => c.isPassing)
				.reduce((sum, c) => sum + c.credits, 0)

			// Determine overall result
			const hasFailures = processedCourses.some(c => !c.isPassing)
			const overallResult = hasFailures ? 'RA' : 'PASS'

			// Calculate totals for JasperReports summary fields
			const totalIAMax = processedCourses.reduce((sum, c) => sum + c.ciaMax, 0)
			const totalIASecured = processedCourses.reduce((sum, c) => sum + c.ciaMarks, 0)
			const totalEAMax = processedCourses.reduce((sum, c) => sum + c.eseMax, 0)
			const totalEASecured = processedCourses.reduce((sum, c) => sum + c.eseMarks, 0)
			const totalMaxMarks = processedCourses.reduce((sum, c) => sum + c.totalMax, 0)
			const totalSecured = processedCourses.reduce((sum, c) => sum + c.totalMarks, 0)
			const percentage = totalMaxMarks > 0 ? Math.round((totalSecured / totalMaxMarks) * 10000) / 100 : 0

			return NextResponse.json({
				student: {
					id: studentId,
					name: studentName,
					firstName: learnerExtendedInfo.firstName,
					middleName: learnerExtendedInfo.middleName,
					lastName: learnerExtendedInfo.lastName,
					registerNo,
					dateOfBirth: dateOfBirth,
					photoUrl: photoUrl,
					fatherName: learnerExtendedInfo.fatherName,
					motherName: learnerExtendedInfo.motherName,
					guardianName: learnerExtendedInfo.guardianName,
					gender: learnerExtendedInfo.gender,
					admissionYear: learnerExtendedInfo.admissionYear,
					batchName: learnerExtendedInfo.batchName
				},
				semester: parseInt(semester || '1'),
				session: {
					id: sessionId,
					name: semesterResult?.session_name || '',
					monthYear: semesterResult?.month_year || ''
				},
				program: {
					code: programCode,
					name: programName,
					isPG: isPG
				},
				courses: processedCourses,
				partBreakdown: sortedParts,
				summary: {
					totalCourses: processedCourses.length,
					totalCredits,
					creditsEarned,
					totalCreditPoints: Math.round(totalCreditPoints * 100) / 100,
					semesterGPA,
					cgpa: semesterResult?.cgpa || semesterGPA,
					passedCount: processedCourses.filter(c => c.isPassing).length,
					failedCount: processedCourses.filter(c => !c.isPassing).length,
					overallResult,
					folio: semesterResult?.folio_number || null,
					// JasperReports-compatible fields
					totalIAMax,
					totalIASecured,
					totalEAMax,
					totalEASecured,
					totalMaxMarks,
					totalSecured,
					percentage,
					resultPublicationDate: semesterResult?.result_publication_date || null
				},
				// Generated date for PDF
				generatedDate: new Date().toLocaleDateString('en-IN', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric'
				})
			})
		}

		// Get marksheet data for multiple students (batch)
		if (action === 'batch-marksheet') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')
			const programCode = searchParams.get('programCode')
			const semester = searchParams.get('semester')

			if (!institutionId || !sessionId) {
				return NextResponse.json({
					error: 'institutionId and sessionId are required'
				}, { status: 400 })
			}

			// Fetch all final marks for the criteria
			let query = supabase
				.from('final_marks')
				.select(`
					id,
					student_id,
					course_id,
					internal_marks_obtained,
					internal_marks_maximum,
					external_marks_obtained,
					external_marks_maximum,
					total_marks_obtained,
					total_marks_maximum,
					percentage,
					grade_points,
					letter_grade,
					is_pass,
					course_offerings (
						semester,
						course_mapping (
							course_order,
							semester_code,
							courses (
								course_code,
								course_name,
								credit,
								course_part_master
							)
						)
					),
					exam_registrations (
						stu_register_no,
						student_name
					)
				`)
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('is_active', true)

			if (programCode) {
				query = query.eq('program_code', programCode)
			}

			if (semester) {
				query = query.eq('course_offerings.semester', parseInt(semester))
			}

			const { data: finalMarks, error } = await query

			if (error) throw error

			// Fetch program name from MyJKKN API for PG detection
			let batchProgramName = ''
			if (programCode) {
				// Get institution to look up program
				const { data: institution } = await supabase
					.from('institutions')
					.select('myjkkn_institution_ids')
					.eq('id', institutionId)
					.single()

				const myjkknIds: string[] = institution?.myjkkn_institution_ids || []

				if (myjkknIds.length > 0) {
					try {
						const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

						for (const myjkknInstId of myjkknIds) {
							const params = new URLSearchParams({
								limit: '100',
								is_active: 'true',
								institution_id: myjkknInstId
							})

							const res = await fetch(`${baseUrl}/api/myjkkn/programs?${params.toString()}`)

							if (res.ok) {
								const response = await res.json()
								const programs = response.data || response || []

								const matchingProgram = programs.find((p: any) =>
									(p.program_id === programCode || p.program_code === programCode)
								)

								if (matchingProgram) {
									batchProgramName = matchingProgram.program_name || matchingProgram.name || ''
									break
								}
							}
						}
					} catch (error) {
						console.warn('[Semester Marksheet Batch] Failed to fetch program name from MyJKKN:', error)
					}
				}
			}

			// Determine if this is a PG program (for passing percentage)
			const batchIsPG = isPGProgram(programCode || '', batchProgramName)
			const batchPassingPercentage = batchIsPG ? 50 : 40

			// Group by student
			const studentMap: Record<string, any> = {}

			finalMarks?.forEach((fm: any) => {
				const studentId = fm.student_id
				if (!studentMap[studentId]) {
					studentMap[studentId] = {
						studentId,
						studentName: fm.exam_registrations?.student_name || '',
						registerNo: fm.exam_registrations?.stu_register_no || '',
						courses: []
					}
				}

				const courseData = fm.course_offerings?.course_mapping?.courses
				if (!courseData) return

				const eseMarks = fm.external_marks_obtained || 0
				const ciaMarks = fm.internal_marks_obtained || 0
				const totalMarks = fm.total_marks_obtained || 0
				const percentage = fm.percentage || 0

				let gradePoint = fm.grade_points
				let letterGrade = fm.letter_grade

				if (gradePoint === null || gradePoint === undefined) {
					const gradeInfo = getGradeFromPercentage(percentage)
					gradePoint = gradeInfo.gradePoint
					letterGrade = gradeInfo.letterGrade
				}

				// Enhanced status detection
				const isAbsent = (eseMarks === 0 && ciaMarks === 0 && totalMarks === 0) ||
				                 (letterGrade === 'AAA')
				const totalMax = fm.total_marks_maximum || 100

				// Use pre-calculated passing percentage (UG: 40%, PG: 50%)
				const passMarks = Math.ceil(totalMax * (batchPassingPercentage / 100))

				const { isPassing, result } = checkPassStatus(
					eseMarks,
					fm.external_marks_maximum || 75,
					totalMarks,
					totalMax,
					batchPassingPercentage
				)

				const finalGradePoint = (isPassing && !isAbsent) ? gradePoint : 0
				const credits = courseData.credit || 0

				studentMap[studentId].courses.push({
					courseCode: courseData.course_code,
					courseName: courseData.course_name,
					part: courseData.course_part_master || 'Part III',
					semester: fm.course_offerings?.semester || 1,
					courseOrder: fm.course_offerings?.course_mapping?.course_order || 0,
					credits,
					eseMax: fm.external_marks_maximum || 75,
					ciaMax: fm.internal_marks_maximum || 25,
					totalMax,
					eseMarks,
					ciaMarks,
					totalMarks,
					percentage: Math.round(percentage * 100) / 100,
					gradePoint: Math.round(finalGradePoint * 10) / 10,
					letterGrade: letterGrade || 'U',
					creditPoints: Math.round(credits * finalGradePoint * 10) / 10,
					isPassing,
					result,
					// Enhanced fields
					assessmentType: undefined,
					passMarks,
					isAbsent,
					isMalpractice: false,
					isIneligible: false,
					isTermFail: !isPassing && !isAbsent,
					isFinalFail: !isPassing && !isAbsent
				})
			})

			// Fetch date of birth and photo for all students from MyJKKN API (primary source)
			const registerNumbers = Object.values(studentMap).map((s: any) => s.registerNo).filter(Boolean)
			const dobMap: Record<string, string> = {}
			const photoMap: Record<string, string> = {}

			if (registerNumbers.length > 0) {
				console.log(`[Semester Marksheet Batch] Fetching learner profiles from MyJKKN API for ${registerNumbers.length} students`)
				const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

				// Get MyJKKN institution ID and program UUID for better filtering
				const { data: institution } = await supabase
					.from('institutions')
					.select('myjkkn_institution_ids')
					.eq('id', institutionId)
					.single()

				const myjkknIds = institution?.myjkkn_institution_ids || []
				let myjkknInstitutionId = myjkknIds.length > 0 ? myjkknIds[0] : null
				let myjkknProgramId: string | null = null

				// Look up MyJKKN program_id (UUID) from program_code
				if (programCode && myjkknInstitutionId) {
					try {
						const progRes = await fetch(`${baseUrl}/api/myjkkn/programs?institution_id=${myjkknInstitutionId}&limit=100`)
						if (progRes.ok) {
							const progData = await progRes.json()
							const programs = progData.data || progData || []
							const matchingProg = programs.find((p: any) =>
								(p.program_id === programCode || p.program_code === programCode)
							)
							if (matchingProg && matchingProg.id) {
								myjkknProgramId = matchingProg.id
								console.log(`[Semester Marksheet Batch] Found MyJKKN program UUID: ${myjkknProgramId} for code ${programCode}`)
							}
						}
					} catch (progErr) {
						console.warn('[Semester Marksheet Batch] Failed to look up program_id:', progErr)
					}
				}

				// Fetch ALL profiles with institution_id and program_id (UUID), then filter locally
				// This is the same approach used by individual marksheet fetch which works correctly
				if (myjkknInstitutionId) {
					try {
						const params = new URLSearchParams({
							limit: '100000',
							fetchAll: 'true'
						})
						if (myjkknProgramId) {
							params.set('program_id', myjkknProgramId)
						}
						params.set('institution_id', myjkknInstitutionId)

						console.log(`[Semester Marksheet Batch] Querying learner-profiles with: ${params.toString()}`)
						const myjkknRes = await fetch(`${baseUrl}/api/myjkkn/learner-profiles?${params.toString()}`)

						if (myjkknRes.ok) {
							const myjkknData = await myjkknRes.json()
							const allProfiles = myjkknData.data || myjkknData || []
							console.log(`[Semester Marksheet Batch] MyJKKN API returned ${allProfiles.length} profiles`)

							// Build lookup maps by register_number
							allProfiles.forEach((lp: any) => {
								const regNo = lp.register_number || lp.roll_number
								if (regNo && registerNumbers.includes(regNo)) {
									// Extract DOB
									if (lp.date_of_birth) {
										const dob = new Date(lp.date_of_birth)
										if (!isNaN(dob.getTime())) {
											dobMap[regNo] = `${String(dob.getDate()).padStart(2, '0')}-${String(dob.getMonth() + 1).padStart(2, '0')}-${dob.getFullYear()}`
										}
									}
									// Extract photo URL
									if (lp.student_photo_url) {
										photoMap[regNo] = lp.student_photo_url
									}
								}
							})
						}
					} catch (err) {
						console.warn('[Semester Marksheet Batch] Failed to fetch profiles from MyJKKN:', err)
					}
				}

				console.log(`[Semester Marksheet Batch] Retrieved ${Object.keys(photoMap).length} photos from MyJKKN, ${Object.keys(dobMap).length} DOBs`)

				// Fallback: Fetch missing photo URLs from local Supabase
				const missingPhotoRegNumbers = registerNumbers.filter(rn => !photoMap[rn])
				if (missingPhotoRegNumbers.length > 0) {
					console.log(`[Semester Marksheet Batch] Fetching ${missingPhotoRegNumbers.length} missing photos from local DB`)
					const { data: localProfiles } = await supabase
						.from('learners_profiles')
						.select('register_number, student_photo_url')
						.in('register_number', missingPhotoRegNumbers)

					localProfiles?.forEach((lp: any) => {
						if (lp.student_photo_url && lp.register_number) {
							photoMap[lp.register_number] = lp.student_photo_url
						}
					})
					console.log(`[Semester Marksheet Batch] Total photos after local fallback: ${Object.keys(photoMap).length}`)
				}
			}

			// Process each student's data into marksheet format
			const marksheets = Object.values(studentMap).map((student: any) => {
				// Sort courses
				student.courses.sort((a: any, b: any) => {
					const partDiff = getPartOrder(a.part) - getPartOrder(b.part)
					if (partDiff !== 0) return partDiff
					return a.courseOrder - b.courseOrder
				})

				// Group courses by part
				const partGroups: Record<string, {
					partName: string
					partDescription: string
					courses: any[]
					totalCredits: number
					totalCreditPoints: number
					partGPA: number
					creditsEarned: number
				}> = {}

				student.courses.forEach((course: any) => {
					if (!partGroups[course.part]) {
						partGroups[course.part] = {
							partName: course.part,
							partDescription: PART_DESCRIPTIONS[course.part] || '',
							courses: [],
							totalCredits: 0,
							totalCreditPoints: 0,
							partGPA: 0,
							creditsEarned: 0
						}
					}
					partGroups[course.part].courses.push(course)
					partGroups[course.part].totalCredits += course.credits
					partGroups[course.part].totalCreditPoints += course.creditPoints
					if (course.isPassing) {
						partGroups[course.part].creditsEarned += course.credits
					}
				})

				// Calculate part-wise GPA
				Object.values(partGroups).forEach(part => {
					part.partGPA = part.totalCredits > 0
						? Math.round((part.totalCreditPoints / part.totalCredits) * 100) / 100
						: 0
				})

				// Sort parts by order
				const sortedParts = Object.values(partGroups).sort((a, b) =>
					getPartOrder(a.partName) - getPartOrder(b.partName)
				)

				// Calculate GPA
				const totalCredits = student.courses.reduce((sum: number, c: any) => sum + c.credits, 0)
				const totalCreditPoints = student.courses.reduce((sum: number, c: any) => sum + c.creditPoints, 0)
				const semesterGPA = totalCredits > 0
					? Math.round((totalCreditPoints / totalCredits) * 100) / 100
					: 0

				const creditsEarned = student.courses
					.filter((c: any) => c.isPassing)
					.reduce((sum: number, c: any) => sum + c.credits, 0)

				const hasFailures = student.courses.some((c: any) => !c.isPassing)

				return {
					student: {
						id: student.studentId,
						name: student.studentName,
						registerNo: student.registerNo,
						dateOfBirth: dobMap[student.registerNo] || null,
						photoUrl: photoMap[student.registerNo] || null
					},
					semester: parseInt(semester || '1'),
					session: {
						id: sessionId,
						name: '',
						monthYear: ''
					},
					program: {
						code: programCode || '',
						name: batchProgramName || programCode || '',
						isPG: batchIsPG
					},
					courses: student.courses,
					partBreakdown: sortedParts,
					summary: {
						totalCourses: student.courses.length,
						totalCredits,
						creditsEarned,
						totalCreditPoints: Math.round(totalCreditPoints * 100) / 100,
						semesterGPA,
						passedCount: student.courses.filter((c: any) => c.isPassing).length,
						failedCount: student.courses.filter((c: any) => !c.isPassing).length,
						overallResult: hasFailures ? 'RA' : 'PASS'
					}
				}
			})

			// Sort by register number
			marksheets.sort((a, b) => a.student.registerNo.localeCompare(b.student.registerNo))

			return NextResponse.json({
				marksheets,
				total: marksheets.length
			})
		}

		// Get programs for dropdown
		if (action === 'programs') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')

			console.log('[Semester Marksheet API - Programs] institutionId:', institutionId, 'sessionId:', sessionId)

			if (!institutionId) {
				return NextResponse.json({ error: 'institutionId is required' }, { status: 400 })
			}

			// Get institution's myjkkn_institution_ids for MyJKKN API call
			const { data: institution, error: instError } = await supabase
				.from('institutions')
				.select('id, institution_code, myjkkn_institution_ids')
				.eq('id', institutionId)
				.single()

			if (instError || !institution) {
				console.error('[Semester Marksheet API] Institution not found:', instError)
				return NextResponse.json({ error: 'Institution not found' }, { status: 404 })
			}

			console.log('[Semester Marksheet API - Programs] Institution found:', institution.institution_code, 'myjkkn_ids:', institution.myjkkn_institution_ids)

			const myjkknInstitutionIds: string[] = institution.myjkkn_institution_ids || []

			if (myjkknInstitutionIds.length === 0) {
				console.log('[Semester Marksheet API] No myjkkn_institution_ids found - returning empty')
				return NextResponse.json({ programs: [] })
			}

			// Fetch programs from MyJKKN API for each institution ID
			const allPrograms: any[] = []
			const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

			for (const myjkknInstId of myjkknInstitutionIds) {
				try {
					const params = new URLSearchParams({
						limit: '100',
						is_active: 'true',
						institution_id: myjkknInstId
					})

					const res = await fetch(`${baseUrl}/api/myjkkn/programs?${params.toString()}`)

					if (!res.ok) {
						console.error(`[Semester Marksheet API] HTTP error ${res.status} for inst ${myjkknInstId}`)
						continue
					}

					const response = await res.json()
					const programs = response.data || response || []

					// Client-side filter by institution_id
					const filteredPrograms = Array.isArray(programs)
						? programs.filter((p: any) => p.institution_id === myjkknInstId && p.is_active !== false)
						: []

					allPrograms.push(...filteredPrograms)
				} catch (error) {
					console.error(`[Semester Marksheet API] Error fetching programs for inst ${myjkknInstId}:`, error)
				}
			}

			// Deduplicate by program_code (MyJKKN uses program_id as the CODE field, not UUID!)
			// Per myjkkn-coe-dev-rules: use program_id || program_code for the code field
			const programMap = new Map<string, string>()
			for (const prog of allPrograms) {
				// MyJKKN returns program_id as the CODE (e.g., "UEN"), not as a UUID
				const code = prog.program_id || prog.program_code
				if (code && !programMap.has(code)) {
					programMap.set(code, prog.program_name || prog.name || code)
				}
			}

			// Convert to array and sort by program code
			const programs = Array.from(programMap.entries())
				.map(([code, name]) => ({
					program_code: code,
					program_name: name
				}))
				.sort((a, b) => a.program_code.localeCompare(b.program_code))

			console.log('[Semester Marksheet API - Programs] Returning', programs.length, 'programs:', programs.map(p => p.program_code))

			return NextResponse.json({ programs })
		}

		// Get semesters for dropdown
		if (action === 'semesters') {
			const institutionId = searchParams.get('institutionId')
			const programCode = searchParams.get('programCode')
			const sessionId = searchParams.get('sessionId')

			if (!institutionId) {
				return NextResponse.json({ error: 'institutionId is required' }, { status: 400 })
			}

			let query = supabase
				.from('semester_results')
				.select('semester')
				.eq('institutions_id', institutionId)
				.eq('is_active', true)

			if (programCode) {
				query = query.eq('program_code', programCode)
			}

			if (sessionId) {
				query = query.eq('examination_session_id', sessionId)
			}

			const { data, error } = await query

			if (error) throw error

			const semesters = [...new Set(data?.map(d => d.semester))].sort((a, b) => a - b)

			return NextResponse.json({ semesters })
		}

		// Get students for dropdown
		if (action === 'students') {
			const institutionId = searchParams.get('institutionId')
			const sessionId = searchParams.get('sessionId')
			const programCode = searchParams.get('programCode')
			const semester = searchParams.get('semester')

			if (!institutionId || !sessionId) {
				return NextResponse.json({ error: 'institutionId and sessionId are required' }, { status: 400 })
			}

			// Use semester_results_detailed_view which has student_name pre-joined
			let query = supabase
				.from('semester_results_detailed_view')
				.select('student_id, register_number, student_name')
				.eq('institutions_id', institutionId)
				.eq('examination_session_id', sessionId)
				.eq('is_active', true)

			if (programCode) {
				query = query.eq('program_code', programCode)
			}

			if (semester) {
				query = query.eq('semester', parseInt(semester))
			}

			const { data, error } = await query.order('register_number')

			if (error) throw error

			// Deduplicate by student_id
			const studentMap = new Map()
			data?.forEach(s => {
				if (!studentMap.has(s.student_id)) {
					studentMap.set(s.student_id, {
						id: s.student_id,
						registerNo: s.register_number,
						name: s.student_name
					})
				}
			})

			return NextResponse.json({ students: Array.from(studentMap.values()) })
		}

		return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

	} catch (error) {
		console.error('Semester marksheet API error:', error)
		return NextResponse.json({
			error: error instanceof Error ? error.message : 'Failed to process request'
		}, { status: 500 })
	}
}
