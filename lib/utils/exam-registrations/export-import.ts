import XLSX from '@/lib/utils/excel-compat'
import type { ExamRegistration } from '@/types/exam-registrations'

/**
 * Export exam registrations to JSON format
 */
export function exportToJSON(items: ExamRegistration[]): void {
	const exportData = items.map(item => ({
		id: item.id,
		institution_code: item.institution?.institution_code || '',
		institution_name: item.institution?.name || '',
		student_register_no: item.stu_register_no || '',
		student_name: item.student_name || `${item.student?.first_name || ''} ${item.student?.last_name || ''}`.trim(),
		student_roll_number: item.student?.roll_number || '',
		session_code: item.examination_session?.session_code || '',
		session_name: item.examination_session?.session_name || '',
		course_code: item.course_offering?.course_code || '',
		course_name: item.course_offering?.course_name || '',
		registration_date: item.registration_date,
		registration_status: item.registration_status,
		is_regular: item.is_regular,
		attempt_number: item.attempt_number,
		fee_paid: item.fee_paid,
		fee_amount: item.fee_amount,
		payment_date: item.payment_date,
		payment_transaction_id: item.payment_transaction_id,
		remarks: item.remarks,
		approved_by: item.approved_by_faculty?.faculty_name || '',
		approved_date: item.approved_date,
		created_at: item.created_at,
		updated_at: item.updated_at
	}))

	const json = JSON.stringify(exportData, null, 2)
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `exam-registrations_${new Date().toISOString().split('T')[0]}.json`
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

/**
 * Export exam registrations to Excel format
 */
export function exportToExcel(items: ExamRegistration[]): void {
	const excelData = items.map((item) => ({
		'Registration ID': item.id,
		'Institution Code': item.institution?.institution_code || '',
		'Institution Name': item.institution?.name || '',
		'Student Register No': item.stu_register_no || '',
		'Student Name': item.student_name || `${item.student?.first_name || ''} ${item.student?.last_name || ''}`.trim(),
		'Student Roll No': item.student?.roll_number || '',
		'Session Code': item.examination_session?.session_code || '',
		'Session Name': item.examination_session?.session_name || '',
		'Course Code': item.course_offering?.course_code || '',
		'Course Name': item.course_offering?.course_name || '',
		'Registration Date': item.registration_date,
		'Status': item.registration_status,
		'Regular Student': item.is_regular ? 'Yes' : 'No',
		'Attempt Number': item.attempt_number,
		'Fee Paid': item.fee_paid ? 'Yes' : 'No',
		'Fee Amount': item.fee_amount || '',
		'Payment Date': item.payment_date || '',
		'Transaction ID': item.payment_transaction_id || '',
		'Remarks': item.remarks || '',
		'Approved By': item.approved_by_faculty?.faculty_name || '',
		'Approved Date': item.approved_date || '',
		'Created At': new Date(item.created_at).toISOString().split('T')[0],
		'Updated At': item.updated_at ? new Date(item.updated_at).toISOString().split('T')[0] : ''
	}))

	const ws = XLSX.utils.json_to_sheet(excelData)

	// Set column widths for better readability
	const colWidths = [
		{ wch: 25 }, // Registration ID
		{ wch: 15 }, // Institution Code
		{ wch: 30 }, // Institution Name
		{ wch: 20 }, // Student Register No
		{ wch: 25 }, // Student Name
		{ wch: 15 }, // Student Roll No
		{ wch: 15 }, // Session Code
		{ wch: 30 }, // Session Name
		{ wch: 15 }, // Course Code
		{ wch: 30 }, // Course Name
		{ wch: 15 }, // Registration Date
		{ wch: 12 }, // Status
		{ wch: 15 }, // Regular Student
		{ wch: 15 }, // Attempt Number
		{ wch: 10 }, // Fee Paid
		{ wch: 12 }, // Fee Amount
		{ wch: 15 }, // Payment Date
		{ wch: 20 }, // Transaction ID
		{ wch: 30 }, // Remarks
		{ wch: 25 }, // Approved By
		{ wch: 15 }, // Approved Date
		{ wch: 12 }, // Created At
		{ wch: 12 }  // Updated At
	]
	ws['!cols'] = colWidths

	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, ws, 'Exam Registrations')
	XLSX.writeFile(wb, `exam-registrations_export_${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Export Excel template for bulk import
 * Includes sample data and marks mandatory fields with asterisks
 */
export function exportTemplate(): void {
	const sample = [{
		'Institution Code': 'INST001',
		'Student Register No': 'REG2024001',
		'Student Name': 'John Doe',
		'Session Code': 'SEM202401',
		'Course Code': 'CS101',
		'Registration Date': '2024-01-15',
		'Status': 'Pending',
		'Regular Student': 'Yes',
		'Attempt Number': '1',
		'Fee Paid': 'No',
		'Fee Amount': '',
		'Payment Date': '',
		'Transaction ID': '',
		'Remarks': '',
		'Approved By': '',
		'Approved Date': ''
	}, {
		'Institution Code': 'INST002',
		'Student Register No': 'REG2024002',
		'Student Name': 'Jane Smith',
		'Session Code': 'SEM202401',
		'Course Code': 'CS102',
		'Registration Date': '2024-01-16',
		'Status': 'Approved',
		'Regular Student': 'Yes',
		'Attempt Number': '1',
		'Fee Paid': 'Yes',
		'Fee Amount': '5000',
		'Payment Date': '2024-01-16',
		'Transaction ID': 'TXN123456',
		'Remarks': 'Early registration',
		'Approved By': 'FAC001',
		'Approved Date': '2024-01-17'
	}]

	const ws = XLSX.utils.json_to_sheet(sample)

	// Set column widths
	const colWidths = [
		{ wch: 18 }, // Institution Code
		{ wch: 20 }, // Student Register No
		{ wch: 25 }, // Student Name
		{ wch: 15 }, // Session Code
		{ wch: 15 }, // Course Code
		{ wch: 18 }, // Registration Date
		{ wch: 15 }, // Status
		{ wch: 18 }, // Regular Student
		{ wch: 18 }, // Attempt Number
		{ wch: 12 }, // Fee Paid
		{ wch: 15 }, // Fee Amount
		{ wch: 15 }, // Payment Date
		{ wch: 20 }, // Transaction ID
		{ wch: 30 }, // Remarks
		{ wch: 20 }, // Approved By
		{ wch: 15 }  // Approved Date
	]
	ws['!cols'] = colWidths

	// Style header row
	const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
	const mandatoryFields = [
		'Institution Code',
		'Student Register No',
		'Session Code',
		'Course Code',
		'Registration Date',
		'Status',
		'Attempt Number'
	]

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

	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, ws, 'Template')

	// Add instructions sheet
	const instructions = [
		{ 'Field': 'Institution Code *', 'Description': 'The unique code for the institution (must exist in system)', 'Example': 'INST001' },
		{ 'Field': 'Student Register No *', 'Description': 'Student registration number', 'Example': 'REG2024001' },
		{ 'Field': 'Student Name', 'Description': 'Full name of the student (optional if auto-filled)', 'Example': 'John Doe' },
		{ 'Field': 'Session Code *', 'Description': 'Examination session code (must exist in system)', 'Example': 'SEM202401' },
		{ 'Field': 'Course Code *', 'Description': 'Course offering code (must exist in system)', 'Example': 'CS101' },
		{ 'Field': 'Registration Date *', 'Description': 'Date of registration (YYYY-MM-DD format)', 'Example': '2024-01-15' },
		{ 'Field': 'Status *', 'Description': 'Registration status: Pending, Approved, Rejected, Cancelled, or Completed', 'Example': 'Pending' },
		{ 'Field': 'Regular Student', 'Description': 'Is this a regular student? (Yes/No, true/false, 1/0)', 'Example': 'Yes' },
		{ 'Field': 'Attempt Number *', 'Description': 'Exam attempt number (1-10)', 'Example': '1' },
		{ 'Field': 'Fee Paid', 'Description': 'Has fee been paid? (Yes/No, true/false, 1/0)', 'Example': 'No' },
		{ 'Field': 'Fee Amount', 'Description': 'Fee amount (0-999,999.99)', 'Example': '5000' },
		{ 'Field': 'Payment Date', 'Description': 'Date of payment (YYYY-MM-DD format)', 'Example': '2024-01-16' },
		{ 'Field': 'Transaction ID', 'Description': 'Payment transaction ID', 'Example': 'TXN123456' },
		{ 'Field': 'Remarks', 'Description': 'Additional remarks or notes (max 500 characters)', 'Example': 'Early registration' },
		{ 'Field': 'Approved By', 'Description': 'Faculty code who approved (if applicable)', 'Example': 'FAC001' },
		{ 'Field': 'Approved Date', 'Description': 'Date of approval (YYYY-MM-DD format)', 'Example': '2024-01-17' }
	]

	const wsInstructions = XLSX.utils.json_to_sheet(instructions)
	wsInstructions['!cols'] = [
		{ wch: 25 }, // Field
		{ wch: 60 }, // Description
		{ wch: 20 }  // Example
	]
	XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions')

	XLSX.writeFile(wb, `exam-registrations_template_${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Format boolean value for display
 */
export function formatBoolean(value: boolean): string {
	return value ? 'Yes' : 'No'
}

/**
 * Format date for display
 */
export function formatDate(dateString: string | null): string {
	if (!dateString) return ''
	try {
		return new Date(dateString).toISOString().split('T')[0]
	} catch {
		return dateString
	}
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number | null): string {
	if (amount === null || amount === undefined) return ''
	return new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		minimumFractionDigits: 2
	}).format(amount)
}
