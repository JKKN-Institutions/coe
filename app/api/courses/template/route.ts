import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { generateCourseTemplate, workbookToBuffer, CourseReferenceData } from '@/lib/utils/excel-template-generator'

/**
 * GET /api/courses/template
 * Generates and downloads an Excel template for course master upload
 */
export async function GET(req: NextRequest) {
	try {
		const supabase = getSupabaseServer()

		// Fetch reference data from related tables
		const [institutionsRes, departmentsRes, regulationsRes] = await Promise.all([
			supabase
				.from('institutions')
				.select('institution_code')
				.eq('status', true)
				.order('institution_code'),
			supabase
				.from('departments')
				.select('department_code, department_name')
				.eq('status', true)
				.order('department_code'),
			supabase
				.from('regulations')
				.select('regulation_code')
				.eq('status', true)
				.order('regulation_code'),
		])

		// Prepare reference data (with fallbacks in case tables are empty)
		const referenceData: CourseReferenceData = {
			institutions: institutionsRes.data || [],
			departments: departmentsRes.data || [],
			regulations: regulationsRes.data || [],
		}

		// Generate workbook
		const workbook = generateCourseTemplate(referenceData)

		// Convert to buffer
		const buffer = workbookToBuffer(workbook)

		// Set response headers for file download
		const headers = new Headers()
		headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
		headers.set('Content-Disposition', `attachment; filename="Course_Master_Template_${new Date().toISOString().split('T')[0]}.xlsx"`)

		return new NextResponse(buffer, {
			status: 200,
			headers,
		})
	} catch (error) {
		console.error('Template generation error:', error)
		return NextResponse.json(
			{
				error: 'Failed to generate template',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		)
	}
}
