import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
	try {
		const supabase = getSupabaseServer()
		const { searchParams } = new URL(request.url)

		const institutionCode = searchParams.get('institution_code')
		const programCode = searchParams.get('program_code')
		const batchCode = searchParams.get('batch_code')
		const regulationCode = searchParams.get('regulation_code')

		// Validate required parameters
		if (!institutionCode || !programCode || !batchCode) {
			return NextResponse.json(
				{ error: 'Missing required parameters: institution_code, program_code, batch_code' },
				{ status: 400 }
			)
		}

		// Fetch institution details
		const { data: institution, error: instError } = await supabase
			.from('institutions')
			.select('id, institution_code, name, address, city, state, pincode')
			.eq('institution_code', institutionCode)
			.single()

		if (instError || !institution) {
			return NextResponse.json({ error: 'Institution not found' }, { status: 404 })
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

		// Fetch batch details
		const { data: batch, error: batchError } = await supabase
			.from('batches')
			.select('id, batch_code, batch_name, start_year, end_year')
			.eq('batch_code', batchCode)
			.single()

		if (batchError || !batch) {
			return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
		}

		// Fetch regulation details (optional)
		let regulation = null
		if (regulationCode) {
			const { data: regData } = await supabase
				.from('regulations')
				.select('id, regulation_code, regulation_name')
				.eq('regulation_code', regulationCode)
				.single()

			regulation = regData
		}

		// Fetch course mappings with joins
		const { data: mappings, error: mappingsError } = await supabase
			.from('course_mapping')
			.select(`
				id,
				course_id,
				semester_code,
				course_group,
				course_category,
				course_order,
				internal_max_mark,
				internal_pass_mark,
				internal_converted_mark,
				external_max_mark,
				external_pass_mark,
				external_converted_mark,
				total_max_mark,
				total_pass_mark,
				annual_semester,
				registration_based,
				is_active,
				courses (
					id,
					course_code,
					course_title,
					course_name,
					course_category,
					course_type,
					credits,
					exam_hours,
					evaluation_pattern
				),
				semesters (
					semester_code,
					semester_name,
					semester_number
				)
			`)
			.eq('institution_code', institutionCode)
			.eq('program_code', programCode)
			.eq('batch_code', batchCode)
			.eq('is_active', true)
			.order('semester_code', { ascending: true })
			.order('course_order', { ascending: true })

		if (mappingsError) {
			console.error('Error fetching course mappings:', mappingsError)
			return NextResponse.json({ error: 'Failed to fetch course mappings' }, { status: 500 })
		}

		// Transform the data for the PDF generator
		const transformedMappings = (mappings || []).map((mapping: any) => {
			const course = mapping.courses
			const semester = mapping.semesters

			return {
				id: mapping.id,
				semester_code: mapping.semester_code,
				semester_name: semester?.semester_name || mapping.semester_code,
				semester_number: semester?.semester_number || 0,
				course_code: course?.course_code || '-',
				course_title: course?.course_title || course?.course_name || '-',
				course_category: mapping.course_category || course?.course_category || '-',
				course_type: course?.course_type || '-',
				course_group: mapping.course_group || '-',
				evaluation_pattern: course?.evaluation_pattern || '-',
				credits: course?.credits || 0,
				exam_hours: course?.exam_hours || 0,
				course_order: mapping.course_order || 0,
				internal_max_mark: mapping.internal_max_mark || 0,
				internal_pass_mark: mapping.internal_pass_mark || 0,
				internal_converted_mark: mapping.internal_converted_mark || 0,
				external_max_mark: mapping.external_max_mark || 0,
				external_pass_mark: mapping.external_pass_mark || 0,
				external_converted_mark: mapping.external_converted_mark || 0,
				total_max_mark: mapping.total_max_mark || 0,
				total_pass_mark: mapping.total_pass_mark || 0
			}
		})

		// Build institution address
		const addressParts = [
			institution.address,
			institution.city,
			institution.state,
			institution.pincode
		].filter(Boolean)
		const institutionAddress = addressParts.join(', ')

		// Prepare response data
		const reportData = {
			institutionName: institution.name,
			institutionAddress: institutionAddress || undefined,
			programName: program.program_name,
			programCode: program.program_code,
			degreeName: (program.degrees as any)?.degree_name || program.degree_code || 'Degree',
			batchName: batch.batch_name || `${batch.start_year} - ${batch.end_year}`,
			batchCode: batch.batch_code,
			regulationName: regulation?.regulation_name || undefined,
			regulationCode: regulation?.regulation_code || undefined,
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
