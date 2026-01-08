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
	const { data, settings } = options

	// Create a single PDF document for all students
	const doc = new jsPDF('portrait', 'mm', 'a4')
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 12.7 // 0.5 inch in mm

	// Get institution settings or use defaults
	const defaultInstitutionName = data.institution.institution_name || 'J.K.K.NATARAJA COLLEGE OF ARTS & SCIENCE (AUTONOMOUS)'
	const defaultAccreditation = data.institution.accreditation_text ||
		'(Accredited by NAAC, Approved by AICTE, Recognized by\nUGC Under Section 2(f) & 12(B), Affiliated to Periyar University)'
	const defaultAddress = data.institution.address || 'Komarapalayam- 638 183, Namakkal District, Tamil Nadu.'

	// Parse logo dimensions from settings (convert px to mm)
	const parsePxToMm = (value?: string): number => {
		if (!value) return 20 // default 20mm
		const px = parseInt(value.replace('px', ''), 10)
		return isNaN(px) ? 20 : px * 0.264583 // px to mm conversion
	}

	const logoWidth = parsePxToMm(settings?.logo_width)
	const logoHeight = parsePxToMm(settings?.logo_height)
	const secondaryLogoWidth = parsePxToMm(settings?.secondary_logo_width)
	const secondaryLogoHeight = parsePxToMm(settings?.secondary_logo_height)

	// Parse hex color to RGB
	const parseHexColor = (hex?: string): [number, number, number] => {
		if (!hex || !hex.startsWith('#')) return [0, 0, 0]
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
		return result
			? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
			: [0, 0, 0]
	}

	const primaryColor = parseHexColor(settings?.primary_color || data.institution.primary_color)
	const secondaryColor = parseHexColor(settings?.secondary_color || data.institution.secondary_color)

	// Process each student (one page per student)
	data.students.forEach((student, studentIndex) => {
		// Add new page for each student (except the first one)
		if (studentIndex > 0) {
			doc.addPage()
		}

		let currentY = margin

		// ========== HEADER SECTION ==========

		// Institution name (centered, bold)
		const institutionName = settings?.institution_name || defaultInstitutionName
		doc.setFont('times', 'bold')
		doc.setFontSize(14)
		doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
		doc.text(institutionName.toUpperCase(), pageWidth / 2, currentY + 8, { align: 'center' })

		// College Logo (left side)
		if (data.logoImage) {
			try {
				doc.addImage(data.logoImage, 'PNG', margin, currentY, logoWidth, logoHeight)
			} catch (e) {
				console.warn('Failed to add logo to PDF:', e)
			}
		}

		// College Logo (right side - secondary logo)
		if (data.rightLogoImage) {
			try {
				doc.addImage(data.rightLogoImage, 'PNG', pageWidth - margin - secondaryLogoWidth, currentY, secondaryLogoWidth, secondaryLogoHeight)
			} catch (e) {
				console.warn('Failed to add right logo to PDF:', e)
			}
		}

		// Accreditation text
		const accreditationText = settings?.accreditation_text || defaultAccreditation
		doc.setFont('times', 'normal')
		doc.setFontSize(8)
		doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])

		// Split accreditation text into lines if it contains newline
		const accreditationLines = accreditationText.split('\n')
		let accreditationY = currentY + 13
		accreditationLines.forEach((line) => {
			doc.text(line, pageWidth / 2, accreditationY, { align: 'center' })
			accreditationY += 3.5
		})

		// Address
		const address = settings?.address || defaultAddress
		doc.setFont('times', 'bold')
		doc.setFontSize(9)
		doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
		doc.text(address, pageWidth / 2, accreditationY + 2, { align: 'center' })

		currentY = accreditationY + 8

		// Examination Session Title
		doc.setFont('times', 'bold')
		doc.setFontSize(12)
		doc.setTextColor(0, 0, 0)
		doc.text(`SEMESTER EXAMINATION ${data.session.session_name}`, pageWidth / 2, currentY, { align: 'center' })

		currentY += 6

		// Hall Ticket heading
		doc.setFont('times', 'bold')
		doc.setFontSize(14)
		doc.text('Hall Ticket', pageWidth / 2, currentY, { align: 'center' })

		currentY += 10

		// ========== STUDENT INFORMATION SECTION ==========

		// Draw a border box for student info
		const infoBoxY = currentY
		const infoBoxHeight = 48
		const labelWidth = 40
		const valueX = margin + labelWidth + 5

		// Student photo placeholder (right side of info box)
		const photoX = pageWidth - margin - 30
		const photoY = infoBoxY
		const photoWidth = 28
		const photoHeight = 35

		// Draw photo box
		doc.setDrawColor(0, 0, 0)
		doc.setLineWidth(0.3)
		doc.rect(photoX, photoY, photoWidth, photoHeight)

		// Add student photo if available
		if (student.student_photo_url) {
			try {
				// Note: In production, this would need to be a base64 image
				doc.addImage(student.student_photo_url, 'JPEG', photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2)
			} catch (e) {
				console.warn('Failed to add student photo:', e)
				// Draw placeholder text
				doc.setFont('times', 'normal')
				doc.setFontSize(8)
				doc.setTextColor(128, 128, 128)
				doc.text('Photo', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' })
			}
		}

		// Student info fields
		const fields = [
			{ label: 'Register Number', value: student.register_number },
			{ label: 'Student Name', value: student.student_name },
			{ label: 'Date of Birth', value: student.date_of_birth },
			{ label: 'Program', value: student.program },
			{ label: 'EMIS', value: student.emis || '' },
		]

		doc.setFontSize(10)
		let fieldY = currentY

		fields.forEach((field, index) => {
			// Label (bold)
			doc.setFont('times', 'bold')
			doc.setTextColor(0, 0, 0)
			doc.text(field.label, margin + 2, fieldY)

			// Value (normal)
			doc.setFont('times', 'normal')
			doc.text(field.value, valueX, fieldY)

			fieldY += 7
		})

		currentY = infoBoxY + infoBoxHeight + 5

		// ========== EXAMINATION TABLE ==========

		// Prepare table data
		const tableData = student.subjects.map((subject, index) => [
			(index + 1).toString(),
			subject.subject_code,
			formatExamDate(subject.exam_date),
			subject.exam_time,
			subject.subject_name,
			subject.semester
		])

		// Draw table
		autoTable(doc, {
			startY: currentY,
			head: [
				['S.No', 'Subject Code', 'Date of Exam', 'Exam', 'Subject Name', 'Semester']
			],
			body: tableData,
			theme: 'grid',
			styles: {
				font: 'times',
				fontStyle: 'normal',
				fontSize: 9,
				textColor: [0, 0, 0],
				lineColor: [0, 0, 0],
				lineWidth: 0.3,
				cellPadding: 2,
				valign: 'middle'
			},
			headStyles: {
				font: 'times',
				fontStyle: 'bold',
				fontSize: 9,
				fillColor: [255, 255, 255],
				textColor: [0, 0, 0],
				halign: 'center',
				valign: 'middle',
				lineWidth: 0.3
			},
			bodyStyles: {
				font: 'times',
				fontSize: 9
			},
			columnStyles: {
				0: { halign: 'center', cellWidth: 12 }, // S.No
				1: { halign: 'center', cellWidth: 28 }, // Subject Code
				2: { halign: 'center', cellWidth: 25 }, // Date of Exam
				3: { halign: 'center', cellWidth: 32 }, // Exam Time
				4: { halign: 'left', cellWidth: 65 }, // Subject Name
				5: { halign: 'center', cellWidth: 22 } // Semester
			},
			margin: { left: margin, right: margin },
		})

		// Get final Y position after table
		const finalY = (doc as any).lastAutoTable?.finalY || currentY + 50

		// ========== SIGNATURE SECTION ==========

		const signatureY = Math.max(finalY + 30, pageHeight - 55)

		// Three signature sections
		const sigWidth = (pageWidth - 2 * margin) / 3
		const sigSections = [
			{ label: 'Student Signature', x: margin },
			{ label: 'Signature of the Controller of Examinations (FAC)', x: margin + sigWidth },
			{ label: 'Signature of the Chief Superintendent', x: margin + 2 * sigWidth }
		]

		doc.setFont('times', 'normal')
		doc.setFontSize(8)
		doc.setTextColor(0, 0, 0)

		sigSections.forEach((sig) => {
			// Signature line
			doc.setLineWidth(0.3)
			doc.line(sig.x + 5, signatureY - 3, sig.x + sigWidth - 10, signatureY - 3)

			// Label
			const labelLines = doc.splitTextToSize(sig.label, sigWidth - 10)
			doc.text(labelLines, sig.x + sigWidth / 2, signatureY + 2, { align: 'center' })
		})

		// ========== FOOTER NOTES ==========

		const notesY = signatureY + 15

		// Timings info
		doc.setFont('times', 'normal')
		doc.setFontSize(8)
		doc.setTextColor(0, 0, 0)
		doc.text('Timings: FN - 10.00 A.M. to 01.00 P.M.', pageWidth - margin, notesY, { align: 'right' })
		doc.text('AN - 02.00 P.M. to 05.00 P.M.', pageWidth - margin, notesY + 4, { align: 'right' })

		// Important note
		doc.setFont('times', 'bold')
		doc.setFontSize(8)
		doc.text('Note: Student must bring their college ID Card and hall ticket at the time of the Examinations', margin, notesY + 8)
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
 * Format exam date to DD-MMM-YYYY format
 */
function formatExamDate(dateStr: string): string {
	try {
		const date = new Date(dateStr)
		const day = date.getDate().toString().padStart(2, '0')
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
		const month = months[date.getMonth()]
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
	const { data, settings } = options

	const doc = new jsPDF('portrait', 'mm', 'a4')
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 12.7

	const defaultInstitutionName = data.institution.institution_name || 'J.K.K.NATARAJA COLLEGE OF ARTS & SCIENCE (AUTONOMOUS)'
	const defaultAccreditation = data.institution.accreditation_text ||
		'(Accredited by NAAC, Approved by AICTE, Recognized by\nUGC Under Section 2(f) & 12(B), Affiliated to Periyar University)'
	const defaultAddress = data.institution.address || 'Komarapalayam- 638 183, Namakkal District, Tamil Nadu.'

	const parsePxToMm = (value?: string): number => {
		if (!value) return 20
		const px = parseInt(value.replace('px', ''), 10)
		return isNaN(px) ? 20 : px * 0.264583
	}

	const logoWidth = parsePxToMm(settings?.logo_width)
	const logoHeight = parsePxToMm(settings?.logo_height)
	const secondaryLogoWidth = parsePxToMm(settings?.secondary_logo_width)
	const secondaryLogoHeight = parsePxToMm(settings?.secondary_logo_height)

	const parseHexColor = (hex?: string): [number, number, number] => {
		if (!hex || !hex.startsWith('#')) return [0, 0, 0]
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
		return result
			? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
			: [0, 0, 0]
	}

	const primaryColor = parseHexColor(settings?.primary_color || data.institution.primary_color)
	const secondaryColor = parseHexColor(settings?.secondary_color || data.institution.secondary_color)

	data.students.forEach((student, studentIndex) => {
		if (studentIndex > 0) {
			doc.addPage()
		}

		let currentY = margin

		// Header
		const institutionName = settings?.institution_name || defaultInstitutionName
		doc.setFont('times', 'bold')
		doc.setFontSize(14)
		doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
		doc.text(institutionName.toUpperCase(), pageWidth / 2, currentY + 8, { align: 'center' })

		if (data.logoImage) {
			try {
				doc.addImage(data.logoImage, 'PNG', margin, currentY, logoWidth, logoHeight)
			} catch (e) {
				console.warn('Failed to add logo:', e)
			}
		}

		if (data.rightLogoImage) {
			try {
				doc.addImage(data.rightLogoImage, 'PNG', pageWidth - margin - secondaryLogoWidth, currentY, secondaryLogoWidth, secondaryLogoHeight)
			} catch (e) {
				console.warn('Failed to add right logo:', e)
			}
		}

		const accreditationText = settings?.accreditation_text || defaultAccreditation
		doc.setFont('times', 'normal')
		doc.setFontSize(8)
		doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])

		const accreditationLines = accreditationText.split('\n')
		let accreditationY = currentY + 13
		accreditationLines.forEach((line) => {
			doc.text(line, pageWidth / 2, accreditationY, { align: 'center' })
			accreditationY += 3.5
		})

		const address = settings?.address || defaultAddress
		doc.setFont('times', 'bold')
		doc.setFontSize(9)
		doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
		doc.text(address, pageWidth / 2, accreditationY + 2, { align: 'center' })

		currentY = accreditationY + 8

		doc.setFont('times', 'bold')
		doc.setFontSize(12)
		doc.setTextColor(0, 0, 0)
		doc.text(`SEMESTER EXAMINATION ${data.session.session_name}`, pageWidth / 2, currentY, { align: 'center' })

		currentY += 6

		doc.setFont('times', 'bold')
		doc.setFontSize(14)
		doc.text('Hall Ticket', pageWidth / 2, currentY, { align: 'center' })

		currentY += 10

		// Student Info
		const infoBoxY = currentY
		const infoBoxHeight = 48
		const labelWidth = 40
		const valueX = margin + labelWidth + 5

		const photoX = pageWidth - margin - 30
		const photoY = infoBoxY
		const photoWidth = 28
		const photoHeight = 35

		doc.setDrawColor(0, 0, 0)
		doc.setLineWidth(0.3)
		doc.rect(photoX, photoY, photoWidth, photoHeight)

		if (student.student_photo_url) {
			try {
				doc.addImage(student.student_photo_url, 'JPEG', photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2)
			} catch (e) {
				doc.setFont('times', 'normal')
				doc.setFontSize(8)
				doc.setTextColor(128, 128, 128)
				doc.text('Photo', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' })
			}
		}

		const fields = [
			{ label: 'Register Number', value: student.register_number },
			{ label: 'Student Name', value: student.student_name },
			{ label: 'Date of Birth', value: student.date_of_birth },
			{ label: 'Program', value: student.program },
			{ label: 'EMIS', value: student.emis || '' },
		]

		doc.setFontSize(10)
		let fieldY = currentY

		fields.forEach((field) => {
			doc.setFont('times', 'bold')
			doc.setTextColor(0, 0, 0)
			doc.text(field.label, margin + 2, fieldY)
			doc.setFont('times', 'normal')
			doc.text(field.value, valueX, fieldY)
			fieldY += 7
		})

		currentY = infoBoxY + infoBoxHeight + 5

		// Table
		const tableData = student.subjects.map((subject, index) => [
			(index + 1).toString(),
			subject.subject_code,
			formatExamDate(subject.exam_date),
			subject.exam_time,
			subject.subject_name,
			subject.semester
		])

		autoTable(doc, {
			startY: currentY,
			head: [['S.No', 'Subject Code', 'Date of Exam', 'Exam', 'Subject Name', 'Semester']],
			body: tableData,
			theme: 'grid',
			styles: {
				font: 'times',
				fontStyle: 'normal',
				fontSize: 9,
				textColor: [0, 0, 0],
				lineColor: [0, 0, 0],
				lineWidth: 0.3,
				cellPadding: 2,
				valign: 'middle'
			},
			headStyles: {
				font: 'times',
				fontStyle: 'bold',
				fontSize: 9,
				fillColor: [255, 255, 255],
				textColor: [0, 0, 0],
				halign: 'center',
				valign: 'middle',
				lineWidth: 0.3
			},
			columnStyles: {
				0: { halign: 'center', cellWidth: 12 },
				1: { halign: 'center', cellWidth: 28 },
				2: { halign: 'center', cellWidth: 25 },
				3: { halign: 'center', cellWidth: 32 },
				4: { halign: 'left', cellWidth: 65 },
				5: { halign: 'center', cellWidth: 22 }
			},
			margin: { left: margin, right: margin },
		})

		const finalY = (doc as any).lastAutoTable?.finalY || currentY + 50

		// Signatures
		const signatureY = Math.max(finalY + 30, pageHeight - 55)
		const sigWidth = (pageWidth - 2 * margin) / 3
		const sigSections = [
			{ label: 'Student Signature', x: margin },
			{ label: 'Signature of the Controller of Examinations (FAC)', x: margin + sigWidth },
			{ label: 'Signature of the Chief Superintendent', x: margin + 2 * sigWidth }
		]

		doc.setFont('times', 'normal')
		doc.setFontSize(8)
		doc.setTextColor(0, 0, 0)

		sigSections.forEach((sig) => {
			doc.setLineWidth(0.3)
			doc.line(sig.x + 5, signatureY - 3, sig.x + sigWidth - 10, signatureY - 3)
			const labelLines = doc.splitTextToSize(sig.label, sigWidth - 10)
			doc.text(labelLines, sig.x + sigWidth / 2, signatureY + 2, { align: 'center' })
		})

		// Footer Notes
		const notesY = signatureY + 15
		doc.setFont('times', 'normal')
		doc.setFontSize(8)
		doc.text('Timings: FN - 10.00 A.M. to 01.00 P.M.', pageWidth - margin, notesY, { align: 'right' })
		doc.text('AN - 02.00 P.M. to 05.00 P.M.', pageWidth - margin, notesY + 4, { align: 'right' })

		doc.setFont('times', 'bold')
		doc.text('Note: Student must bring their college ID Card and hall ticket at the time of the Examinations', margin, notesY + 8)
	})

	return doc.output('blob')
}
