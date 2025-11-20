import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import path from 'path'
import fs from 'fs'

export async function GET(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)

		const institutionCode = searchParams.get('institution_code')
		const programCode = searchParams.get('program_code')
		const regulationCode = searchParams.get('regulation_code')

		// Handle null string as actual null
		const actualRegulationCode = regulationCode === 'null' || regulationCode === 'undefined' ? null : regulationCode

		// Validate required parameters (NO BATCH)
		if (!institutionCode || !programCode || !regulationCode) {
			return NextResponse.json(
				{ error: 'Missing required parameters: institution_code, program_code, regulation_code' },
				{ status: 400 }
			)
		}

		// Fetch institution details
		const { data: institution, error: instError } = await supabase
			.from('institutions')
			.select('id, institution_code, name, address_line1, address_line2, address_line3, city, state, pin_code')
			.eq('institution_code', institutionCode)
			.single()

		if (instError || !institution) {
			console.error('Institution fetch error:', instError, 'Code:', institutionCode)
			return NextResponse.json({
				error: 'Institution not found',
				details: instError?.message,
				institutionCode
			}, { status: 404 })
		}

		// Fetch program details with degree information
		const { data: program, error: progError } = await supabase
			.from('programs')
			.select(`
				id,
				program_code,
				program_name,
				degree_code,
				degrees (
					degree_code,
					degree_name
				)
			`)
			.eq('program_code', programCode)
			.eq('institution_code', institutionCode)
			.single()

		if (progError || !program) {
			return NextResponse.json({ error: 'Program not found' }, { status: 404 })
		}

		// Fetch regulation details
		let regulation = null
		if (actualRegulationCode) {
			const { data: regData, error: regError } = await supabase
				.from('regulations')
				.select('id, regulation_code, regulation_name')
				.eq('regulation_code', actualRegulationCode)
				.single()

			if (regError) {
				console.warn('Regulation not found:', actualRegulationCode, regError)
			}
			regulation = regData
		}

		// Fetch course mappings with proper joins using Supabase syntax
		let query = supabase
			.from('course_mapping')
			.select(`
				*,
				courses:course_id (
					id,
					course_code,
					course_name,
					course_category,
					course_type,
					course_part_master,
					credit,
					exam_duration,
					evaluation_type,
					regulation_code
				)
			`)
			.eq('institution_code', institutionCode)
			.eq('program_code', programCode)
			.eq('regulation_code', actualRegulationCode)
			.eq('is_active', true)

		const { data: mappings, error: mappingsError } = await query
			.order('semester_code', { ascending: true })
			.order('course_order', { ascending: true })

		if (mappingsError) {
			console.error('Error fetching course mappings:', mappingsError)
			return NextResponse.json({ error: 'Failed to fetch course mappings', details: mappingsError.message }, { status: 500 })
		}

		if (!mappings || mappings.length === 0) {
			return NextResponse.json({ error: 'No course mappings found for this criteria' }, { status: 404 })
		}

		// Fetch all related semesters by semester_code (since it's text, not FK)
		const semesterCodes = [...new Set(mappings.map((m: any) => m.semester_code).filter(Boolean))]
		const { data: semesters } = await supabase
			.from('semesters')
			.select('semester_code, semester_name, semester_number, display_order')
			.in('semester_code', semesterCodes)

		// Create lookup map for semesters
		const semestersMap = new Map(semesters?.map(s => [s.semester_code, s]) || [])

		// Transform the data for the PDF generator
		const transformedMappings = (mappings || []).map((mapping: any) => {
			// course data comes from the joined courses table (via course_id FK)
			const course = mapping.courses
			// semester data from manual lookup (semester_code is text, not FK)
			const semester = semestersMap.get(mapping.semester_code)

			return {
				id: mapping.id,
				// Semester information
				semester_code: mapping.semester_code,
				semester_name: semester?.semester_name || mapping.semester_code,
				semester_number: semester?.display_order || semester?.semester_number || 0,
				display_order: semester?.display_order || 0,

				// Part information (from courses table via FK join)
				part_name: course?.course_part_master || '-',

				// Course information (from courses table via FK join)
				course_code: course?.course_code || '-',
				course_title: course?.course_name || '-',
				course_category: mapping.course_category || course?.course_category || '-',
				course_type: course?.course_type || '-',
				course_group: mapping.course_group || '-',

				// Evaluation and credits (from courses table via FK join)
				evaluation_pattern: course?.evaluation_type || '-',
				credits: course?.credit || 0,
				exam_hours: course?.exam_duration || 0,

				// Sort order
				course_order: mapping.course_order || 0,
				sort_order: mapping.course_order || 0,

				// Internal marks (from course_mapping)
				internal_max_mark: mapping.internal_max_mark || 0,
				internal_pass_mark: mapping.internal_pass_mark || 0,
				internal_converted_mark: mapping.internal_converted_mark || 0,

				// External/ESE marks (from course_mapping)
				external_max_mark: mapping.external_max_mark || 0,
				external_pass_mark: mapping.external_pass_mark || 0,
				external_converted_mark: mapping.external_converted_mark || 0,

				// Total marks (from course_mapping)
				total_max_mark: mapping.total_max_mark || 0,
				total_pass_mark: mapping.total_pass_mark || 0
			}
		})

		// Build institution address
		const addressParts = [
			institution.address_line1,
			institution.address_line2,
			institution.address_line3,
			institution.city,
			institution.state,
			institution.pin_code
		].filter(Boolean)
		const institutionAddress = addressParts.join(', ')

		// Load JKKN logo (left side)
		let logoImage: string | undefined
		try {
			const logoPath = path.join(process.cwd(), 'public', 'jkkn_logo.png')
			const logoBase64 = fs.readFileSync(logoPath).toString('base64')
			logoImage = `data:image/png;base64,${logoBase64}`
		} catch (error) {
			console.warn('Failed to load logo:', error)
			logoImage = undefined
		}

		// Load right logo (JKKN text logo)
		let rightLogoImage: string | undefined
		try {
			const rightLogoPath = path.join(process.cwd(), 'public', 'jkkn_text_logo.png')
			const rightLogoBase64 = fs.readFileSync(rightLogoPath).toString('base64')
			rightLogoImage = `data:image/png;base64,${rightLogoBase64}`
		} catch (error) {
			console.warn('Failed to load right logo:', error)
			rightLogoImage = undefined
		}

		// Get regulation code from multiple sources (fallback chain)
		const finalRegulationCode = regulation?.regulation_code ||
			actualRegulationCode ||
			mappings[0]?.regulation_code ||
			mappings[0]?.courses?.regulation_code

		// Prepare response data
		const reportData = {
			institutionName: institution.name,
			institutionAddress: institutionAddress || undefined,
			programName: program.program_name,
			programCode: program.program_code,
			degreeName: (program.degrees as any)?.degree_name || program.degree_code || 'Degree',
			regulationName: regulation?.regulation_name || finalRegulationCode,
			regulationCode: finalRegulationCode,
			logoImage,
			rightLogoImage,
			mappings: transformedMappings
		}

		return NextResponse.json(reportData)
	} catch (error) {
		console.error('Error generating report data:', error)
		return NextResponse.json(
			{ error: 'Failed to generate report data' },
			{ status: 500 }
		)
	}
}
