import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { HallTicketData, HallTicketStudent, HallTicketPdfSettings } from '@/types/hall-ticket'

/**
 * Generate Hall Ticket PDF
 *
 * Creates a professional hall ticket PDF matching the sample layout:
 * - Institution header with logos and accreditation
 * - Student information section
 * - Examination subjects table
 * - Signature sections and notes
 *
 * Each student gets their own page in the PDF.
 */

interface GenerateHallTicketOptions {
	data: HallTicketData
	settings?: HallTicketPdfSettings
}

export function generateHallTicketPDF(options: GenerateHallTicketOptions): string {
	const { data } = options

	// Create a single PDF document for all students
	const doc = new jsPDF('portrait', 'mm', 'a4')
	const pageWidth = doc.internal.pageSize.getWidth()
	const margin = 6.35 // 0.25 inch narrow margin

	// Group students by semester_group (year) for year-wise PDF generation
	// Then sort within each group by register_number
	const yearOrder = ['I Year', 'II Year', 'III Year', 'IV Year', 'V Year']
	const groupedByYear = data.students.reduce((acc, student) => {
		const group = student.semester_group || 'Other'
		if (!acc[group]) acc[group] = []
		acc[group].push(student)
		return acc
	}, {} as Record<string, HallTicketStudent[]>)

	// Sort each group by register_number
	Object.values(groupedByYear).forEach(group => {
		group.sort((a, b) => a.register_number.localeCompare(b.register_number))
	})

	// Sort groups by year order and flatten
	const sortedStudents = Object.entries(groupedByYear)
		.sort((a, b) => {
			const indexA = yearOrder.indexOf(a[0])
			const indexB = yearOrder.indexOf(b[0])
			return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
		})
		.flatMap(([, students]) => students)

	// Track total pages for multi-page students
	let isFirstPage = true

	// Process each student (may need multiple pages if subjects > maxRows)
	sortedStudents.forEach((student) => {
		// Split subjects into chunks of maxRows (22) for multi-page support
		const maxRows = 22
		const totalSubjects = student.subjects.length
		const totalPages = Math.max(1, Math.ceil(totalSubjects / maxRows))

		// Process each page for this student
		for (let pageNum = 0; pageNum < totalPages; pageNum++) {
			// Add new page (except the very first page of the document)
			if (!isFirstPage) {
				doc.addPage()
			}
			isFirstPage = false

			// Get subjects for this page
			const startIdx = pageNum * maxRows
			const endIdx = Math.min(startIdx + maxRows, totalSubjects)
			const pageSubjects = student.subjects.slice(startIdx, endIdx)

			let currentY = margin

		// ========== HEADER SECTION (matching marksheet distribution style) ==========

		// College Logo (left side) - 16x16mm like marksheet distribution
		if (data.logoImage) {
			try {
				doc.addImage(data.logoImage, 'PNG', margin, currentY, 16, 16)
			} catch (e) {
				console.warn('Failed to add logo to PDF:', e)
			}
		}

		// College Logo (right side) - 16x16mm like marksheet distribution
		if (data.rightLogoImage) {
			try {
				doc.addImage(data.rightLogoImage, 'PNG', pageWidth - margin - 16, currentY, 16, 16)
			} catch (e) {
				console.warn('Failed to add right logo to PDF:', e)
			}
		}

		// Institution name (centered, bold)
		doc.setFont('times', 'bold')
		doc.setFontSize(12)
		doc.setTextColor(0, 0, 0)
		doc.text('J.K.K.NATARAJA COLLEGE OF ARTS & SCIENCE (AUTONOMOUS)', pageWidth / 2, currentY + 4, { align: 'center' })

		// Accreditation text (2 lines)
		doc.setFont('times', 'normal')
		doc.setFontSize(8)
		doc.text('(Accredited by NAAC, Approved by AICTE, Recognized by UGC Under Section 2(f) & 12(B),', pageWidth / 2, currentY + 9, { align: 'center' })
		doc.text('Affiliated to Periyar University)', pageWidth / 2, currentY + 13, { align: 'center' })

		currentY += 17

		// Address
		doc.setFont('times', 'bold')
		doc.setFontSize(9)
		doc.text('Komarapalayam- 638 183, Namakkal District, Tamil Nadu', pageWidth / 2, currentY, { align: 'center' })

		currentY += 5

		// Examination Session Title
		doc.setFont('times', 'bold')
		doc.setFontSize(11)
		doc.text(`SEMESTER EXAMINATION ${data.session.session_name}`, pageWidth / 2, currentY, { align: 'center' })

		currentY += 5

		// Hall Ticket heading with page number if multi-page
		doc.setFont('times', 'bold')
		doc.setFontSize(12)
		if (totalPages > 1) {
			doc.text(`Hall Ticket (Page ${pageNum + 1} of ${totalPages})`, pageWidth / 2, currentY, { align: 'center' })
		} else {
			doc.text('Hall Ticket', pageWidth / 2, currentY, { align: 'center' })
		}

		currentY += 6

		// ========== STUDENT INFORMATION SECTION (TABLE WITH GRID) ==========

		// Student info table with photo on right side
		const infoTableWidth = pageWidth - 2 * margin
		const labelColWidth = 35
		const valueColWidth = infoTableWidth - labelColWidth - 35 // Leave space for photo
		const photoWidth = 30
		const photoHeight = 35
		const rowHeight = 8

		// Student info fields
		const fields = [
			{ label: 'Register Number', value: student.register_number },
			{ label: 'Student Name', value: student.student_name },
			{ label: 'Date of Birth', value: student.date_of_birth || '' },
			{ label: 'Program', value: student.program },
			{ label: 'EMIS', value: student.emis || '' },
		]

		const infoTableHeight = fields.length * rowHeight
		const infoBoxY = currentY

		// Draw table borders
		doc.setDrawColor(0, 0, 0)
		doc.setLineWidth(0.3)

		// Outer border for entire info section
		doc.rect(margin, infoBoxY, infoTableWidth, Math.max(infoTableHeight, photoHeight + 5))

		// Vertical line separating info from photo area (draw first so we have photoAreaX)
		const photoAreaX = margin + labelColWidth + valueColWidth

		// Draw each row with grid lines
		fields.forEach((field, index) => {
			const rowY = infoBoxY + index * rowHeight

			// Horizontal line from left edge to photo separator (except for first row which has outer border)
			if (index > 0) {
				doc.line(margin, rowY, photoAreaX, rowY)
			}

			// Vertical line between label and value
			doc.line(margin + labelColWidth, rowY, margin + labelColWidth, rowY + rowHeight)

			// Label text (bold)
			doc.setFont('times', 'bold')
			doc.setFontSize(10)
			doc.setTextColor(0, 0, 0)
			doc.text(field.label, margin + 2, rowY + 5)

			// Value text (normal)
			doc.setFont('times', 'normal')
			doc.text(field.value, margin + labelColWidth + 2, rowY + 5)
		})

		// Vertical line separating info from photo area
		doc.line(photoAreaX, infoBoxY, photoAreaX, infoBoxY + Math.max(infoTableHeight, photoHeight + 5))

		// Photo box (inside the table on right side)
		const photoX = photoAreaX + 2.5
		const photoY = infoBoxY + 2
		doc.rect(photoX, photoY, photoWidth, photoHeight)

		// Add student photo if available
		if (student.student_photo_url) {
			try {
				doc.addImage(student.student_photo_url, 'JPEG', photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1)
			} catch (e) {
				console.warn('Failed to add student photo:', e)
			}
		}

		currentY = infoBoxY + Math.max(infoTableHeight, photoHeight + 5) // No gap - joins directly

		// ========== EXAMINATION TABLE (Joined with student info table) ==========

		// ========== FIXED LAYOUT SUBJECT TABLE ==========
		// Fixed dimensions for A4 academic document standard
		const tableWidth = pageWidth - 2 * margin
		const subjectHeaderHeight = 10 // Header row height
		const subjectRowHeight = 8 // Each subject row height
		const tableHeight = subjectHeaderHeight + (maxRows * subjectRowHeight) // Total fixed table height

		const subjectTableStartY = currentY

		// Column widths (must sum to tableWidth)
		const columnWidths = [10, 24, 22, 32, 78, 27] // S.No, Code, Date, Exam, Name, Semester

		// Prepare table data - pad to exactly maxRows rows
		// Use pageSubjects (chunk for this page) with correct serial numbers
		const tableData: string[][] = []
		for (let i = 0; i < maxRows; i++) {
			if (i < pageSubjects.length) {
				const subject = pageSubjects[i]
				// Serial number continues from previous pages
				const serialNum = startIdx + i + 1
				tableData.push([
					serialNum.toString(),
					subject.subject_code,
					formatExamDate(subject.exam_date),
					subject.exam_time,
					subject.subject_name,
					subject.semester
				])
			} else {
				// Empty row
				tableData.push(['', '', '', '', '', ''])
			}
		}

		// Draw subject table with fixed row heights
		autoTable(doc, {
			startY: subjectTableStartY,
			head: [['S.No', 'Subject Code', 'Date of Exam', 'Exam', 'Subject Name', 'Semester']],
			body: tableData,
			theme: 'plain', // No default borders - we'll draw custom borders
			styles: {
				font: 'times',
				fontStyle: 'normal',
				fontSize: 9,
				textColor: [0, 0, 0],
				cellPadding: 1,
				valign: 'middle',
				minCellHeight: subjectRowHeight,
				cellWidth: 'wrap'
			},
			headStyles: {
				font: 'times',
				fontStyle: 'bold',
				fontSize: 9,
				fillColor: [255, 255, 255],
				textColor: [0, 0, 0],
				halign: 'center',
				valign: 'middle',
				minCellHeight: subjectHeaderHeight
			},
			bodyStyles: {
				font: 'times',
				fontSize: 8,
				minCellHeight: subjectRowHeight
			},
			columnStyles: {
				0: { halign: 'center', cellWidth: columnWidths[0] }, // S.No
				1: { halign: 'center', cellWidth: columnWidths[1] }, // Subject Code
				2: { halign: 'center', cellWidth: columnWidths[2] }, // Date of Exam
				3: { halign: 'center', cellWidth: columnWidths[3] }, // Exam Time
				4: { halign: 'left', cellWidth: columnWidths[4] }, // Subject Name
				5: { halign: 'center', cellWidth: columnWidths[5] } // Semester
			},
			margin: { left: margin, right: margin },
			tableWidth: tableWidth
		})

		// Draw custom borders (fixed height, not based on actual content)
		doc.setDrawColor(0, 0, 0)
		doc.setLineWidth(0.3)

		// Draw outer border (rectangle around entire subject table - FIXED HEIGHT)
		doc.rect(margin, subjectTableStartY, tableWidth, tableHeight)

		// Draw vertical column lines (5 separators for 6 columns) - full table height
		let xPos = margin
		for (let i = 0; i < 5; i++) {
			xPos += columnWidths[i]
			doc.line(xPos, subjectTableStartY, xPos, subjectTableStartY + tableHeight)
		}

		// Draw horizontal line below header row ONLY (no lines between subject rows)
		doc.line(margin, subjectTableStartY + subjectHeaderHeight, margin + tableWidth, subjectTableStartY + subjectHeaderHeight)

		// Fixed table end position (not dynamic)
		const subjectTableEndY = subjectTableStartY + tableHeight

		// ========== SIGNATURE SECTION (Only on last page for multi-page students) ==========
		const isLastPage = pageNum === totalPages - 1

		if (isLastPage) {
			const pageHeight = doc.internal.pageSize.getHeight()
			const signatureHeight = 18 // Height for signature row
			const timingsHeight = 6 // Height for timings row
			const noteHeight = 8 // Height for note text
			const totalFooterHeight = signatureHeight + timingsHeight + noteHeight + 2 // Total space needed at bottom

			// Calculate Y position for signature section (at page bottom)
			const signatureStartY = pageHeight - margin - totalFooterHeight

			// Draw signature row using autoTable for proper alignment
			autoTable(doc, {
				startY: signatureStartY,
				body: [
					[
						{ content: '\n\nStudent Signature', styles: { halign: 'center', valign: 'bottom', fontStyle: 'bold' } },
						{ content: '\n\nSignature of the Controller\nof Examinations (FAC)', styles: { halign: 'center', valign: 'bottom', fontStyle: 'bold' } },
						{ content: '\n\nSignature of the\nChief Superintendent', styles: { halign: 'center', valign: 'bottom', fontStyle: 'bold' } }
					]
				],
				theme: 'grid',
				styles: {
					font: 'times',
					fontStyle: 'bold',
					fontSize: 7,
					textColor: [0, 0, 0],
					lineColor: [0, 0, 0],
					lineWidth: 0.3,
					cellPadding: 1,
					minCellHeight: signatureHeight
				},
				columnStyles: {
					0: { cellWidth: tableWidth / 3 },
					1: { cellWidth: tableWidth / 3 },
					2: { cellWidth: tableWidth / 3 }
				},
				margin: { left: margin, right: margin },
				tableWidth: tableWidth
			})

			// Get Y position after signature row
			const signatureEndY = (doc as any).lastAutoTable.finalY

			// Draw timings row
			autoTable(doc, {
				startY: signatureEndY,
				body: [
					[{ content: 'Timings: FN - 10.00 A.M. to 01.00 P.M.    AN - 02.00 P.M. to 05.00 P.M.', styles: { halign: 'right', fontStyle: 'bold' } }]
				],
				theme: 'grid',
				styles: {
					font: 'times',
					fontSize: 7,
					textColor: [0, 0, 0],
					lineColor: [0, 0, 0],
					lineWidth: 0.3,
					cellPadding: 1.5,
					fillColor: [255, 255, 255], // White background
					minCellHeight: timingsHeight
				},
				columnStyles: {
					0: { cellWidth: tableWidth }
				},
				margin: { left: margin, right: margin },
				tableWidth: tableWidth
			})

			// Get Y position after timings row
			const timingsEndY = (doc as any).lastAutoTable.finalY

			// ========== FOOTER NOTE ==========

			doc.setFont('times', 'bold')
			doc.setFontSize(8)
			doc.setTextColor(0, 0, 0)
			doc.text('Note: Student must bring their college ID Card and hall ticket at the time of the Examinations', margin, timingsEndY + 4)

			// ========== FOOTER PAGE NUMBER, DATE & TIME ==========
			const footerY = pageHeight - margin
			const now = new Date()
			const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
			const hours = now.getHours()
			const ampm = hours >= 12 ? 'PM' : 'AM'
			const hours12 = hours % 12 || 12
			const timeStr = `${String(hours12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${ampm}`

			doc.setFont('times', 'normal')
			doc.setFontSize(7)
			doc.setTextColor(100, 100, 100)

			// Left: Date & Time
			doc.text(`Generated: ${dateStr} ${timeStr}`, margin, footerY)

			// Right: Page number (per student)
			if (totalPages > 1) {
				doc.text(`Page ${pageNum + 1} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' })
			} else {
				doc.text('Page 1 of 1', pageWidth - margin, footerY, { align: 'right' })
			}
		} else {
			// For non-last pages, add "Continued on next page..." indicator and page info
			const pageHeight = doc.internal.pageSize.getHeight()
			doc.setFont('times', 'italic')
			doc.setFontSize(9)
			doc.setTextColor(100, 100, 100)
			doc.text('(Continued on next page...)', pageWidth / 2, pageHeight - margin - 8, { align: 'center' })

			// ========== FOOTER PAGE NUMBER, DATE & TIME (for continuation pages) ==========
			const footerY = pageHeight - margin
			const now = new Date()
			const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
			const hours = now.getHours()
			const ampm = hours >= 12 ? 'PM' : 'AM'
			const hours12 = hours % 12 || 12
			const timeStr = `${String(hours12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${ampm}`

			doc.setFont('times', 'normal')
			doc.setFontSize(7)
			doc.setTextColor(100, 100, 100)

			// Left: Date & Time
			doc.text(`Generated: ${dateStr} ${timeStr}`, margin, footerY)

			// Right: Page number (per student)
			doc.text(`Page ${pageNum + 1} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' })
		}
		} // End of page loop for this student
	})

	// Generate filename
	const programName = data.students[0]?.program?.replace(/[^a-zA-Z0-9]/g, '_') || 'Program'
	const sessionName = data.session.session_name.replace(/[^a-zA-Z0-9]/g, '_')
	const fileName = `HallTicket_${programName}_${sessionName}_${new Date().toISOString().split('T')[0]}.pdf`

	// Save the PDF
	doc.save(fileName)

	return fileName
}

/**
 * Format exam date to DD-MMM-YYYY format (e.g., 27-Oct-2025)
 */
function formatExamDate(dateStr: string): string {
	// Handle "To Be Announced" or empty/invalid strings
	if (!dateStr || dateStr === 'To Be Announced' || dateStr.toLowerCase().includes('announced')) {
		return 'To Be Announced'
	}
	try {
		const date = new Date(dateStr)
		// Check if date is valid
		if (isNaN(date.getTime())) {
			return dateStr
		}
		const day = date.getDate().toString().padStart(2, '0')
		const month = (date.getMonth() + 1).toString().padStart(2, '0')
		const year = date.getFullYear()
		return `${day}-${month}-${year}`
	} catch {
		return dateStr
	}
}

/**
 * Generate Hall Ticket PDF and return as Blob (for preview or download)
 */
export function generateHallTicketPDFBlob(options: GenerateHallTicketOptions): Blob {
	const { data } = options

	const doc = new jsPDF('portrait', 'mm', 'a4')
	const pageWidth = doc.internal.pageSize.getWidth()
	const margin = 6.35 // 0.25 inch narrow margin

	// Group students by semester_group (year) for year-wise PDF generation
	// Then sort within each group by register_number
	const yearOrder = ['I Year', 'II Year', 'III Year', 'IV Year', 'V Year']
	const groupedByYear = data.students.reduce((acc, student) => {
		const group = student.semester_group || 'Other'
		if (!acc[group]) acc[group] = []
		acc[group].push(student)
		return acc
	}, {} as Record<string, HallTicketStudent[]>)

	// Sort each group by register_number
	Object.values(groupedByYear).forEach(group => {
		group.sort((a, b) => a.register_number.localeCompare(b.register_number))
	})

	// Sort groups by year order and flatten
	const sortedStudents = Object.entries(groupedByYear)
		.sort((a, b) => {
			const indexA = yearOrder.indexOf(a[0])
			const indexB = yearOrder.indexOf(b[0])
			return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
		})
		.flatMap(([, students]) => students)

	// Track total pages for multi-page students
	let isFirstPage = true

	// Process each student (may need multiple pages if subjects > maxRows)
	sortedStudents.forEach((student) => {
		// Split subjects into chunks of maxRows (22) for multi-page support
		const maxRows = 22
		const totalSubjects = student.subjects.length
		const totalPages = Math.max(1, Math.ceil(totalSubjects / maxRows))

		// Process each page for this student
		for (let pageNum = 0; pageNum < totalPages; pageNum++) {
			// Add new page (except the very first page of the document)
			if (!isFirstPage) {
				doc.addPage()
			}
			isFirstPage = false

			// Get subjects for this page
			const startIdx = pageNum * maxRows
			const endIdx = Math.min(startIdx + maxRows, totalSubjects)
			const pageSubjects = student.subjects.slice(startIdx, endIdx)

			let currentY = margin

			// ========== HEADER SECTION (matching marksheet distribution style) ==========

			// College Logo (left side) - 16x16mm
			if (data.logoImage) {
				try {
					doc.addImage(data.logoImage, 'PNG', margin, currentY, 16, 16)
				} catch (e) {
					console.warn('Failed to add logo:', e)
				}
			}

			// College Logo (right side) - 16x16mm
			if (data.rightLogoImage) {
				try {
					doc.addImage(data.rightLogoImage, 'PNG', pageWidth - margin - 16, currentY, 16, 16)
				} catch (e) {
					console.warn('Failed to add right logo:', e)
				}
			}

			// Institution name (centered, bold)
			doc.setFont('times', 'bold')
			doc.setFontSize(12)
			doc.setTextColor(0, 0, 0)
			doc.text('J.K.K.NATARAJA COLLEGE OF ARTS & SCIENCE (AUTONOMOUS)', pageWidth / 2, currentY + 4, { align: 'center' })

			// Accreditation text (2 lines)
			doc.setFont('times', 'normal')
			doc.setFontSize(8)
			doc.text('(Accredited by NAAC, Approved by AICTE, Recognized by UGC Under Section 2(f) & 12(B),', pageWidth / 2, currentY + 9, { align: 'center' })
			doc.text('Affiliated to Periyar University)', pageWidth / 2, currentY + 13, { align: 'center' })

			currentY += 17

			// Address
			doc.setFont('times', 'bold')
			doc.setFontSize(9)
			doc.text('Komarapalayam- 638 183, Namakkal District, Tamil Nadu', pageWidth / 2, currentY, { align: 'center' })

			currentY += 5

			doc.setFont('times', 'bold')
			doc.setFontSize(12)
			doc.setTextColor(0, 0, 0)
			doc.text(`SEMESTER EXAMINATION ${data.session.session_name}`, pageWidth / 2, currentY, { align: 'center' })

			currentY += 5

			// Hall Ticket heading with page number if multi-page
			doc.setFont('times', 'bold')
			doc.setFontSize(14)
			if (totalPages > 1) {
				doc.text(`Hall Ticket (Page ${pageNum + 1} of ${totalPages})`, pageWidth / 2, currentY, { align: 'center' })
			} else {
				doc.text('Hall Ticket', pageWidth / 2, currentY, { align: 'center' })
			}

			currentY += 6

			// Student Info (Table with Grid)
			const infoTableWidth = pageWidth - 2 * margin
			const labelColWidth = 35
			const valueColWidth = infoTableWidth - labelColWidth - 35
			const photoWidth = 30
			const photoHeight = 35
			const rowHeight = 7

			const fields = [
				{ label: 'Register Number', value: student.register_number },
				{ label: 'Student Name', value: student.student_name },
				{ label: 'Date of Birth', value: student.date_of_birth || '' },
				{ label: 'Program', value: student.program },
				{ label: 'EMIS', value: student.emis || '' },
			]

			const infoTableHeight = fields.length * rowHeight
			const infoBoxY = currentY

			doc.setDrawColor(0, 0, 0)
			doc.setLineWidth(0.3)
			doc.rect(margin, infoBoxY, infoTableWidth, Math.max(infoTableHeight, photoHeight + 5))

			// Vertical line separating info from photo area (define first so we have photoAreaX)
			const photoAreaX = margin + labelColWidth + valueColWidth

			fields.forEach((field, index) => {
				const rowY = infoBoxY + index * rowHeight
				// Horizontal line from left edge to photo separator (except for first row which has outer border)
				if (index > 0) {
					doc.line(margin, rowY, photoAreaX, rowY)
				}
				doc.line(margin + labelColWidth, rowY, margin + labelColWidth, rowY + rowHeight)
				doc.setFont('times', 'bold')
				doc.setFontSize(10)
				doc.setTextColor(0, 0, 0)
				doc.text(field.label, margin + 2, rowY + 5)
				doc.setFont('times', 'normal')
				doc.text(field.value, margin + labelColWidth + 2, rowY + 5)
			})

			// Draw vertical line separating info from photo area
			doc.line(photoAreaX, infoBoxY, photoAreaX, infoBoxY + Math.max(infoTableHeight, photoHeight + 5))

			const photoX = photoAreaX + 2.5
			const photoY = infoBoxY + 2
			doc.rect(photoX, photoY, photoWidth, photoHeight)

			if (student.student_photo_url) {
				try {
					doc.addImage(student.student_photo_url, 'JPEG', photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1)
				} catch (e) {
					console.warn('Failed to add student photo:', e)
				}
			}

			currentY = infoBoxY + Math.max(infoTableHeight, photoHeight + 5) // No gap - joins directly

			// ========== FIXED LAYOUT SUBJECT TABLE ==========
			// Fixed dimensions for A4 academic document standard
			const tableWidth = pageWidth - 2 * margin
			const subjectHeaderHeight = 10 // Header row height
			const subjectRowHeight = 8 // Each subject row height
			const tableHeight = subjectHeaderHeight + (maxRows * subjectRowHeight) // Total fixed table height

			const subjectTableStartY = currentY

			// Column widths (must sum to tableWidth)
			const columnWidths = [10, 24, 22, 32, 78, 27] // S.No, Code, Date, Exam, Name, Semester

			// Prepare table data - pad to exactly maxRows rows
			// Use pageSubjects (chunk for this page) with correct serial numbers
			const tableData: string[][] = []
			for (let i = 0; i < maxRows; i++) {
				if (i < pageSubjects.length) {
					const subject = pageSubjects[i]
					// Serial number continues from previous pages
					const serialNum = startIdx + i + 1
					tableData.push([
						serialNum.toString(),
						subject.subject_code,
						formatExamDate(subject.exam_date),
						subject.exam_time,
						subject.subject_name,
						subject.semester
					])
				} else {
					// Empty row
					tableData.push(['', '', '', '', '', ''])
				}
			}

			// Draw subject table with fixed row heights
			autoTable(doc, {
				startY: subjectTableStartY,
				head: [['S.No', 'Subject Code', 'Date of Exam', 'Exam', 'Subject Name', 'Semester']],
				body: tableData,
				theme: 'plain', // No default borders - we'll draw custom borders
				styles: {
					font: 'times',
					fontStyle: 'normal',
					fontSize: 9,
					textColor: [0, 0, 0],
					cellPadding: 1,
					valign: 'middle',
					minCellHeight: subjectRowHeight,
					cellWidth: 'wrap'
				},
				headStyles: {
					font: 'times',
					fontStyle: 'bold',
					fontSize: 9,
					fillColor: [255, 255, 255],
					textColor: [0, 0, 0],
					halign: 'center',
					valign: 'middle',
					minCellHeight: subjectHeaderHeight
				},
				bodyStyles: {
					font: 'times',
					fontSize: 9,
					minCellHeight: subjectRowHeight
				},
				columnStyles: {
					0: { halign: 'center', cellWidth: columnWidths[0] }, // S.No
					1: { halign: 'center', cellWidth: columnWidths[1] }, // Subject Code
					2: { halign: 'center', cellWidth: columnWidths[2] }, // Date of Exam
					3: { halign: 'center', cellWidth: columnWidths[3] }, // Exam Time
					4: { halign: 'left', cellWidth: columnWidths[4] }, // Subject Name
					5: { halign: 'center', cellWidth: columnWidths[5] } // Semester
				},
				margin: { left: margin, right: margin },
				tableWidth: tableWidth
			})

			// Draw custom borders (fixed height, not based on actual content)
			doc.setDrawColor(0, 0, 0)
			doc.setLineWidth(0.3)

			// Draw outer border (rectangle around entire subject table - FIXED HEIGHT)
			doc.rect(margin, subjectTableStartY, tableWidth, tableHeight)

			// Draw vertical column lines (5 separators for 6 columns) - full table height
			let xPos = margin
			for (let i = 0; i < 5; i++) {
				xPos += columnWidths[i]
				doc.line(xPos, subjectTableStartY, xPos, subjectTableStartY + tableHeight)
			}

			// Draw horizontal line below header row ONLY (no lines between subject rows)
			doc.line(margin, subjectTableStartY + subjectHeaderHeight, margin + tableWidth, subjectTableStartY + subjectHeaderHeight)

			// Fixed table end position (not dynamic)
			const subjectTableEndY = subjectTableStartY + tableHeight

			// ========== SIGNATURE SECTION (Only on last page for multi-page students) ==========
			const isLastPage = pageNum === totalPages - 1

			if (isLastPage) {
				const pageHeight = doc.internal.pageSize.getHeight()
				const signatureHeight = 18 // Height for signature row
				const timingsHeight = 6 // Height for timings row
				const noteHeight = 8 // Height for note text
				const totalFooterHeight = signatureHeight + timingsHeight + noteHeight + 2 // Total space needed at bottom

				// Calculate Y position for signature section (at page bottom)
				const signatureStartY = pageHeight - margin - totalFooterHeight

				// Draw signature row using autoTable for proper alignment
				autoTable(doc, {
					startY: signatureStartY,
					body: [
						[
							{ content: '\n\nStudent Signature', styles: { halign: 'center', valign: 'bottom', fontStyle: 'bold' } },
							{ content: '\n\nSignature of the Controller\nof Examinations (FAC)', styles: { halign: 'center', valign: 'bottom', fontStyle: 'bold' } },
							{ content: '\n\nSignature of the\nChief Superintendent', styles: { halign: 'center', valign: 'bottom', fontStyle: 'bold' } }
						]
					],
					theme: 'grid',
					styles: {
						font: 'times',
						fontStyle: 'bold',
						fontSize: 7,
						textColor: [0, 0, 0],
						lineColor: [0, 0, 0],
						lineWidth: 0.3,
						cellPadding: 1,
						minCellHeight: signatureHeight
					},
					columnStyles: {
						0: { cellWidth: tableWidth / 3 },
						1: { cellWidth: tableWidth / 3 },
						2: { cellWidth: tableWidth / 3 }
					},
					margin: { left: margin, right: margin },
					tableWidth: tableWidth
				})

				// Get Y position after signature row
				const signatureEndY = (doc as any).lastAutoTable.finalY

				// Draw timings row
				autoTable(doc, {
					startY: signatureEndY,
					body: [
						[{ content: 'Timings: FN - 10.00 A.M. to 01.00 P.M.    AN - 02.00 P.M. to 05.00 P.M.', styles: { halign: 'right', fontStyle: 'bold' } }]
					],
					theme: 'grid',
					styles: {
						font: 'times',
						fontSize: 7,
						textColor: [0, 0, 0],
						lineColor: [0, 0, 0],
						lineWidth: 0.3,
						cellPadding: 1.5,
						fillColor: [255, 255, 255], // White background
						minCellHeight: timingsHeight
					},
					columnStyles: {
						0: { cellWidth: tableWidth }
					},
					margin: { left: margin, right: margin },
					tableWidth: tableWidth
				})

				// Get Y position after timings row
				const timingsEndY = (doc as any).lastAutoTable.finalY

				// ========== FOOTER NOTE ==========

				doc.setFont('times', 'bold')
				doc.setFontSize(8)
				doc.setTextColor(0, 0, 0)
				doc.text('Note: Student must bring their college ID Card and hall ticket at the time of the Examinations', margin, timingsEndY + 4)

				// ========== FOOTER PAGE NUMBER, DATE & TIME ==========
				const footerY = pageHeight - margin
				const now = new Date()
				const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
				const hours = now.getHours()
				const ampm = hours >= 12 ? 'PM' : 'AM'
				const hours12 = hours % 12 || 12
				const timeStr = `${String(hours12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${ampm}`

				doc.setFont('times', 'normal')
				doc.setFontSize(7)
				doc.setTextColor(100, 100, 100)

				// Left: Date & Time
				doc.text(`Generated: ${dateStr} ${timeStr}`, margin, footerY)

				// Right: Page number (per student)
				if (totalPages > 1) {
					doc.text(`Page ${pageNum + 1} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' })
				} else {
					doc.text('Page 1 of 1', pageWidth - margin, footerY, { align: 'right' })
				}
			} else {
				// For non-last pages, add "Continued on next page..." indicator and page info
				const pageHeight = doc.internal.pageSize.getHeight()
				doc.setFont('times', 'italic')
				doc.setFontSize(9)
				doc.setTextColor(100, 100, 100)
				doc.text('(Continued on next page...)', pageWidth / 2, pageHeight - margin - 8, { align: 'center' })

				// ========== FOOTER PAGE NUMBER, DATE & TIME (for continuation pages) ==========
				const footerY = pageHeight - margin
				const now = new Date()
				const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
				const hours = now.getHours()
				const ampm = hours >= 12 ? 'PM' : 'AM'
				const hours12 = hours % 12 || 12
				const timeStr = `${String(hours12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${ampm}`

				doc.setFont('times', 'normal')
				doc.setFontSize(7)
				doc.setTextColor(100, 100, 100)

				// Left: Date & Time
				doc.text(`Generated: ${dateStr} ${timeStr}`, margin, footerY)

				// Right: Page number (per student)
				doc.text(`Page ${pageNum + 1} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' })
			}
		} // End of page loop for this student
	})

	return doc.output('blob')
}
