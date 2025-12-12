/**
 * Course Offering Export/Import Utilities
 *
 * This module contains functions for exporting course offerings to various formats
 * (JSON, Excel) and generating import templates with reference data.
 */

import XLSX from '@/lib/utils/excel-compat'
import type {
	CourseOffering,
	Institution,
	Course,
	ExaminationSession,
	Program,
} from '@/types/course-offering'

/**
 * Exports course offerings to JSON file
 * @param items - Array of course offerings
 * @param institutions - Array of institutions for reference
 * @param courses - Array of courses for reference
 * @param sessions - Array of examination sessions for reference
 * @param programs - Array of programs for reference
 */
export function exportToJSON(
	items: CourseOffering[],
	institutions: Institution[],
	courses: Course[],
	sessions: ExaminationSession[],
	programs: Program[]
): void {
	const exportData = items.map(item => {
		const institution = institutions.find(i => i.id === item.institutions_id)
		const course = courses.find(c => c.id === item.course_id)
		const session = sessions.find(s => s.id === item.examination_session_id)
		const program = programs.find(p => p.id === item.program_id)

		return {
			institution_code: institution?.institution_code || '',
			course_code: course?.course_code || '',
			session_code: session?.session_code || '',
			program_code: program?.program_code || '',
			semester: item.semester,
			section: item.section || '',
			max_enrollment: item.max_enrollment || '',
			enrolled_count: item.enrolled_count,
			is_active: item.is_active,
			created_at: item.created_at
		}
	})

	const json = JSON.stringify(exportData, null, 2)
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `course_offerings_${new Date().toISOString().split('T')[0]}.json`
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

/**
 * Exports course offerings to Excel file with professional styling
 * @param items - Array of course offerings
 * @param institutions - Array of institutions for reference
 * @param courses - Array of courses for reference
 * @param sessions - Array of examination sessions for reference
 * @param programs - Array of programs for reference
 */
export function exportToExcel(
	items: CourseOffering[],
	institutions: Institution[],
	courses: Course[],
	sessions: ExaminationSession[],
	programs: Program[]
): void {
	const excelData = items.map((r) => {
		const institution = institutions.find(i => i.id === r.institutions_id)
		const session = sessions.find(s => s.id === r.examination_session_id)
		const program = programs.find(p => p.id === r.program_id)

		return {
			'Institution Code': r.institution_code || institution?.institution_code || 'N/A',
			'Institution Name': institution?.institution_name || 'N/A',
			'Course Code': r.course_code || 'N/A',
			'Course Title': r.course_title || 'N/A',
			'Session Code': r.session_code || session?.session_code || 'N/A',
			'Session Name': session?.session_name || 'N/A',
			'Program Code': r.program_code || program?.program_code || 'N/A',
			'Program Name': program?.program_name || 'N/A',
			'Semester': r.semester,
			'Section': r.section || '-',
			'Max Enrollment': r.max_enrollment ?? '-',
			'Enrolled Count': r.enrolled_count,
			'Status': r.is_active ? 'Active' : 'Inactive',
			'Created': new Date(r.created_at).toISOString().split('T')[0],
		}
	})

	const ws = XLSX.utils.json_to_sheet(excelData)

	// Set column widths for better readability
	const colWidths = [
		{ wch: 18 }, // Institution Code
		{ wch: 25 }, // Institution Name
		{ wch: 15 }, // Course Code
		{ wch: 35 }, // Course Title
		{ wch: 20 }, // Session Code
		{ wch: 25 }, // Session Name
		{ wch: 20 }, // Program Code
		{ wch: 30 }, // Program Name
		{ wch: 10 }, // Semester
		{ wch: 10 }, // Section
		{ wch: 15 }, // Max Enrollment
		{ wch: 15 }, // Enrolled Count
		{ wch: 10 }, // Status
		{ wch: 12 }  // Created
	]
	ws['!cols'] = colWidths

	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, ws, 'Course Offerings')
	XLSX.writeFile(wb, `course_offerings_export_${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Generates and downloads import template with sample data and reference sheets
 * @param institutions - Array of institutions for reference
 * @param courses - Array of courses for reference
 * @param sessions - Array of examination sessions for reference
 * @param programs - Array of programs for reference
 */
export function exportTemplate(
	institutions: Institution[],
	courses: Course[],
	sessions: ExaminationSession[],
	programs: Program[]
): void {
	const wb = XLSX.utils.book_new()

	// Sheet 1: Template with sample row
	const sample = [{
		'Institution Code': 'JKKN',
		'Course Code': 'CS101',
		'Session Code': 'SEM1-2025',
		'Program Code': 'BTECH-CSE',
		'Semester': '1',
		'Section': 'A',
		'Max Enrollment': '60',
		'Enrolled Count': '0',
		'Status': 'Active'
	}]

	const ws = XLSX.utils.json_to_sheet(sample)

	// Set column widths
	const colWidths = [
		{ wch: 18 }, // Institution Code
		{ wch: 15 }, // Course Code
		{ wch: 20 }, // Session Code
		{ wch: 20 }, // Program Code
		{ wch: 10 }, // Semester
		{ wch: 10 }, // Section
		{ wch: 15 }, // Max Enrollment
		{ wch: 15 }, // Enrolled Count
		{ wch: 10 }  // Status
	]
	ws['!cols'] = colWidths

	// Style mandatory field headers with red and asterisk
	const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
	const mandatoryFields = ['Institution Code', 'Course Code', 'Session Code', 'Program Code', 'Semester']

	for (let col = range.s.c; col <= range.e.c; col++) {
		const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
		if (!ws[cellAddress]) continue

		const cell = ws[cellAddress]
		const isMandatory = mandatoryFields.includes(cell.v as string)

		if (isMandatory) {
			cell.v = cell.v + ' *'
			cell.s = {
				font: { color: { rgb: 'FF0000' }, bold: true },
				fill: { fgColor: { rgb: 'FFE6E6' } }
			}
		} else {
			cell.s = {
				font: { bold: true },
				fill: { fgColor: { rgb: 'F0F0F0' } }
			}
		}
	}

	XLSX.utils.book_append_sheet(wb, ws, 'Template')

	// Sheet 2: Combined Reference Data (Single Sheet)
	const referenceData: any[] = []

	// Add Institution Codes
	const activeInstitutions = institutions.filter(i => i.is_active !== false)
	if (activeInstitutions.length > 0) {
		referenceData.push({ 'Type': 'INSTITUTION CODES', 'Code': '', 'Name': '' })
		activeInstitutions.forEach(item => {
			referenceData.push({
				'Type': 'Institution',
				'Code': item.institution_code,
				'Name': item.institution_name || 'N/A'
			})
		})
		referenceData.push({ 'Type': '', 'Code': '', 'Name': '' }) // Empty row separator
	}

	// Add Course Codes (Code only, no title)
	const activeCourses = courses.filter(c => c.is_active !== false)
	if (activeCourses.length > 0) {
		referenceData.push({ 'Type': 'COURSE CODES', 'Code': '', 'Name': '' })
		activeCourses.forEach(item => {
			referenceData.push({
				'Type': 'Course',
				'Code': item.course_code,
				'Name': '' // Empty name for courses as requested
			})
		})
		referenceData.push({ 'Type': '', 'Code': '', 'Name': '' }) // Empty row separator
	}

	// Add Session Codes
	const activeSessions = sessions.filter(s => s.is_active !== false)
	if (activeSessions.length > 0) {
		referenceData.push({ 'Type': 'SESSION CODES', 'Code': '', 'Name': '' })
		activeSessions.forEach(item => {
			referenceData.push({
				'Type': 'Session',
				'Code': item.session_code,
				'Name': item.session_name || 'N/A'
			})
		})
		referenceData.push({ 'Type': '', 'Code': '', 'Name': '' }) // Empty row separator
	}

	// Add Program Codes
	const activePrograms = programs.filter(p => p.is_active !== false)
	if (activePrograms.length > 0) {
		referenceData.push({ 'Type': 'PROGRAM CODES', 'Code': '', 'Name': '' })
		activePrograms.forEach(item => {
			referenceData.push({
				'Type': 'Program',
				'Code': item.program_code,
				'Name': item.program_name || 'N/A'
			})
		})
	}

	// Create reference sheet if we have data
	if (referenceData.length > 0) {
		const wsRef = XLSX.utils.json_to_sheet(referenceData)
		const refColWidths = [
			{ wch: 20 }, // Type
			{ wch: 25 }, // Code
			{ wch: 40 }  // Name
		]
		wsRef['!cols'] = refColWidths
		XLSX.utils.book_append_sheet(wb, wsRef, 'Reference Codes')
	}

	XLSX.writeFile(wb, `course_offerings_template_${new Date().toISOString().split('T')[0]}.xlsx`)
}
