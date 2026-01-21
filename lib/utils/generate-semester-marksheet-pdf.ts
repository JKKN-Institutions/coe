/**
 * Semester Mark Sheet PDF Generator
 *
 * Generates print-ready A4 portrait PDF marksheets matching JKKN university format.
 * Layout matches hall ticket style but without header section.
 *
 * Layout Specifications:
 * - Page Size: A4 (210 × 297 mm)
 * - Orientation: Portrait
 * - Student Info: Table with photo on right (like hall ticket)
 * - Course Table: Blue header with course details
 * - Summary: Part-wise credits and GPA at bottom
 *
 * Paper: A4 (210mm × 297mm)
 * Orientation: Portrait
 */

import jsPDF from 'jspdf'
import autoTable, { RowInput } from 'jspdf-autotable'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface MarksheetCourse {
	courseCode: string
	courseName: string
	part: string
	partDescription?: string
	semester: number
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
}

export interface PartBreakdown {
	partName: string
	partDescription: string
	courses: MarksheetCourse[]
	totalCredits: number
	totalCreditPoints: number
	partGPA: number
	creditsEarned: number
}

export interface StudentMarksheetData {
	student: {
		id: string
		name: string
		registerNo: string
		dateOfBirth?: string
		photoUrl?: string
	}
	semester: number
	session: {
		id: string
		name: string
		monthYear: string
	}
	program: {
		code: string
		name: string
		isPG?: boolean // Flag to indicate PG program (no Part column)
	}
	institution?: {
		name: string
		code: string
		address?: string
	}
	courses: MarksheetCourse[]
	partBreakdown: PartBreakdown[]
	summary: {
		totalCourses: number
		totalCredits: number
		creditsEarned: number
		totalCreditPoints: number
		semesterGPA: number
		cgpa?: number
		passedCount: number
		failedCount: number
		overallResult: string
		folio?: string
	}
	logoImage?: string
	watermarkImage?: string
	generatedDate?: string
}

export interface MarksheetPDFOptions {
	showWatermark?: boolean
	showPhoto?: boolean
	fontSize?: number
	compactMode?: boolean
}

// ============================================================
// CONSTANTS - A4 DIMENSIONS AND LAYOUT
// ============================================================

const A4_WIDTH = 210  // mm
const A4_HEIGHT = 297 // mm
const MARGIN = 6.35   // 0.25 inch narrow margin (like hall ticket)
const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN

// Colors matching reference - Blue theme
const COLORS = {
	blue: [0, 51, 102] as [number, number, number],        // Dark blue for headers
	lightBlue: [173, 216, 230] as [number, number, number], // Light blue for alternating
	cream: [255, 255, 230] as [number, number, number],    // Cream/yellow for info cells
	white: [255, 255, 255] as [number, number, number],
	black: [0, 0, 0] as [number, number, number]
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Convert Part name to Roman numeral
 */
function partToRoman(part: string): string {
	const match = part.match(/Part\s*(\w+)/i)
	if (!match) return part
	const partNum = match[1].toUpperCase()
	const romanMap: Record<string, string> = {
		'1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V',
		'I': 'I', 'II': 'II', 'III': 'III', 'IV': 'IV', 'V': 'V'
	}
	return romanMap[partNum] || partNum
}

/**
 * Get month and year from session
 */
function getMonthYear(session: { name: string; monthYear: string }): string {
	if (session.monthYear) return session.monthYear
	const sessionName = session.name || ''
	const match = sessionName.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s]?(\d{4})/i)
	if (match) return `${match[1]}-${match[2]}`
	return new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-')
}

/**
 * Generate folio number
 */
function generateFolio(programCode: string): string {
	const programType = programCode?.startsWith('M') ? 'PG' : 'UG'
	const randomNum = Math.floor(Math.random() * 100000).toString().padStart(8, '0')
	return `${programType}-${randomNum}`
}

/**
 * Check if program is PG based on code
 */
function isPGProgram(programCode: string): boolean {
	const pgPrefixes = ['M', 'MBA', 'MCA', 'MSW', 'MSc', 'MA', 'MCom', 'PhD']
	return pgPrefixes.some(prefix => programCode?.toUpperCase().startsWith(prefix.toUpperCase()))
}

// ============================================================
// PDF GENERATOR FUNCTION
// ============================================================

/**
 * Add a student's marksheet to a PDF document
 */
function addStudentMarksheetToDoc(
	doc: jsPDF,
	data: StudentMarksheetData,
	options: MarksheetPDFOptions = {}
): void {
	const pageWidth = doc.internal.pageSize.getWidth()
	let currentY = MARGIN

	// Determine if this is a PG program (no Part column)
	const isPG = data.program.isPG || isPGProgram(data.program.code)

	// ========== STUDENT INFORMATION SECTION (TABLE WITH GRID + PHOTO) ==========

	// Table layout matching hall ticket style
	const infoTableWidth = pageWidth - 2 * MARGIN
	const photoWidth = 30
	const photoHeight = 35
	const rowHeight = 10

	// Row 1: NAME OF THE | [name] | DATE OF BIRTH (DD-MM-YYYY) | [dob] | Photo
	// Row 2: REGISTER NO | [regno] | MONTH & YEAR | [month]
	// Row 3: PROGRAMME | [program] | FOLIO NUMBER | [folio]

	const col1 = 35  // Label 1
	const col2 = 50  // Value 1
	const col3 = 32  // Label 2
	const col4 = 38  // Value 2
	const col5 = infoTableWidth - col1 - col2 - col3 - col4 // Photo column

	const infoTableHeight = 3 * rowHeight // 3 rows
	const infoBoxY = currentY

	// Draw table borders
	doc.setDrawColor(...COLORS.blue)
	doc.setLineWidth(0.5)

	// Outer border for entire info section
	doc.rect(MARGIN, infoBoxY, infoTableWidth, infoTableHeight)

	// Row 1: NAME OF THE | [name] | DATE OF BIRTH | [dob] | Photo
	let x = MARGIN
	let y = infoBoxY

	// NAME OF THE (label)
	doc.setFillColor(...COLORS.cream)
	doc.rect(x, y, col1, rowHeight, 'FD')
	doc.setFont('helvetica', 'bold')
	doc.setFontSize(8)
	doc.setTextColor(...COLORS.blue)
	doc.text('NAME OF THE', x + 2, y + 6)

	// Student Name (value)
	x += col1
	doc.setFillColor(...COLORS.white)
	doc.rect(x, y, col2, rowHeight, 'FD')
	doc.setFont('helvetica', 'bold')
	doc.setFontSize(9)
	doc.setTextColor(...COLORS.black)
	doc.text(data.student.name.toUpperCase(), x + 2, y + 6)

	// DATE OF BIRTH (label)
	x += col2
	doc.setFillColor(...COLORS.cream)
	doc.rect(x, y, col3, rowHeight, 'FD')
	doc.setFont('helvetica', 'bold')
	doc.setFontSize(7)
	doc.setTextColor(...COLORS.blue)
	doc.text('DATE OF BIRTH', x + 2, y + 4)
	doc.setFontSize(6)
	doc.text('(DD-MM-YYYY)', x + 2, y + 8)

	// DOB Value
	x += col3
	doc.setFillColor(...COLORS.white)
	doc.rect(x, y, col4, rowHeight, 'FD')
	doc.setFont('helvetica', 'normal')
	doc.setFontSize(9)
	doc.setTextColor(...COLORS.black)
	doc.text(data.student.dateOfBirth || '-', x + 2, y + 6)

	// Photo cell (spans all 3 rows)
	x += col4
	doc.setFillColor(...COLORS.white)
	doc.rect(x, y, col5, infoTableHeight, 'FD')

	// Add student photo if available
	if (data.student.photoUrl && options.showPhoto !== false) {
		try {
			const photoX = x + (col5 - photoWidth) / 2
			const photoY = y + (infoTableHeight - photoHeight) / 2
			doc.addImage(data.student.photoUrl, 'JPEG', photoX, photoY, photoWidth, photoHeight)
		} catch (e) {
			console.warn('Failed to add student photo:', e)
		}
	}

	// Row 2: REGISTER NO | [regno] | MONTH & YEAR | [month]
	x = MARGIN
	y += rowHeight

	doc.setFillColor(...COLORS.cream)
	doc.rect(x, y, col1, rowHeight, 'FD')
	doc.setFont('helvetica', 'bold')
	doc.setFontSize(8)
	doc.setTextColor(...COLORS.blue)
	doc.text('REGISTER NO', x + 2, y + 6)

	x += col1
	doc.setFillColor(...COLORS.white)
	doc.rect(x, y, col2, rowHeight, 'FD')
	doc.setFont('helvetica', 'bold')
	doc.setFontSize(9)
	doc.setTextColor(...COLORS.black)
	doc.text(data.student.registerNo, x + 2, y + 6)

	x += col2
	doc.setFillColor(...COLORS.cream)
	doc.rect(x, y, col3, rowHeight, 'FD')
	doc.setFont('helvetica', 'bold')
	doc.setFontSize(8)
	doc.setTextColor(...COLORS.blue)
	doc.text('MONTH & YEAR', x + 2, y + 6)

	x += col3
	doc.setFillColor(...COLORS.white)
	doc.rect(x, y, col4, rowHeight, 'FD')
	doc.setFont('helvetica', 'normal')
	doc.setFontSize(9)
	doc.setTextColor(...COLORS.black)
	doc.text(data.session.monthYear || getMonthYear(data.session), x + 2, y + 6)

	// Row 3: PROGRAMME | [program] | FOLIO NUMBER | [folio]
	x = MARGIN
	y += rowHeight

	doc.setFillColor(...COLORS.cream)
	doc.rect(x, y, col1, rowHeight, 'FD')
	doc.setFont('helvetica', 'bold')
	doc.setFontSize(8)
	doc.setTextColor(...COLORS.blue)
	doc.text('PROGRAMME', x + 2, y + 6)

	x += col1
	doc.setFillColor(...COLORS.white)
	doc.rect(x, y, col2, rowHeight, 'FD')
	doc.setFont('helvetica', 'bold')
	doc.setFontSize(9)
	doc.setTextColor(...COLORS.black)
	const programName = data.program.name || data.program.code
	// Truncate if too long
	const maxProgramLen = 20
	const displayProgram = programName.length > maxProgramLen ? programName.substring(0, maxProgramLen) + '...' : programName
	doc.text(displayProgram, x + 2, y + 6)

	x += col2
	doc.setFillColor(...COLORS.cream)
	doc.rect(x, y, col3, rowHeight, 'FD')
	doc.setFont('helvetica', 'bold')
	doc.setFontSize(8)
	doc.setTextColor(...COLORS.blue)
	doc.text('FOLIO NUMBER', x + 2, y + 6)

	x += col3
	doc.setFillColor(...COLORS.white)
	doc.rect(x, y, col4, rowHeight, 'FD')
	doc.setFont('helvetica', 'normal')
	doc.setFontSize(9)
	doc.setTextColor(...COLORS.black)
	doc.text(data.summary.folio || generateFolio(data.program.code), x + 2, y + 6)

	currentY = infoBoxY + infoTableHeight + 2

	// ========== COURSE DETAILS TABLE ==========

	// For UG: PART | SEMESTER | COURSE CODE | COURSE TITLE | CREDITS | MAXIMUM (ESE/CIA/TOTAL) | MARKS SECURED (ESE/CIA/TOTAL) | GRADE POINT | GRADE | RESULT
	// For PG: No PART column

	// Column widths for course table - must sum to CONTENT_WIDTH
	// UG: PART(10) + SEM(12) + CODE(22) + TITLE(52) + CR(10) + ESE(10) + CIA(10) + TOT(12) + ESE(10) + CIA(10) + TOT(12) + GP(10) + GR(8) + RES(9) = 197
	// PG: SEM(12) + CODE(22) + TITLE(62) + CR(10) + ESE(10) + CIA(10) + TOT(12) + ESE(10) + CIA(10) + TOT(12) + GP(10) + GR(8) + RES(9) = 197

	const ugColWidths = [10, 12, 22, 52, 10, 10, 10, 12, 10, 10, 12, 10, 8, 9] // 14 columns
	const pgColWidths = [12, 22, 62, 10, 10, 10, 12, 10, 10, 12, 10, 8, 9]     // 13 columns (no PART)

	const colWidths = isPG ? pgColWidths : ugColWidths

	// Two-row header
	let headers: RowInput[]

	if (isPG) {
		// PG courses - no PART column
		headers = [
			[
				{ content: 'SEMESTER', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'COURSE\nCODE', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'COURSE TITLE', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'CREDITS', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 6 } },
				{ content: 'MAXIMUM', colSpan: 3, styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'MARKS\nSECURED', colSpan: 3, styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'GRADE\nPOINT', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 6 } },
				{ content: 'GRADE', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'RESULT', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } }
			],
			[
				{ content: 'ESE', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'CIA', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'TOTAL', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'ESE', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'CIA', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'TOTAL', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } }
			]
		]
	} else {
		// UG courses - with PART column
		headers = [
			[
				{ content: 'PART', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'SEMESTER', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 6 } },
				{ content: 'COURSE\nCODE', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'COURSE TITLE', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'CREDITS', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 6 } },
				{ content: 'MAXIMUM', colSpan: 3, styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'MARKS\nSECURED', colSpan: 3, styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'GRADE\nPOINT', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 6 } },
				{ content: 'GRADE', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'RESULT', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } }
			],
			[
				{ content: 'ESE', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'CIA', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'TOTAL', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'ESE', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'CIA', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } },
				{ content: 'TOTAL', styles: { halign: 'center', fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 } }
			]
		]
	}

	// Body rows
	const body: RowInput[] = data.courses.map(course => {
		if (isPG) {
			// PG - no PART column
			return [
				{ content: course.semester.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.courseCode, styles: { halign: 'left', fontSize: 7 } },
				{ content: course.courseName.toUpperCase(), styles: { halign: 'left', fontSize: 7 } },
				{ content: course.credits.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.eseMax.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.ciaMax.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.totalMax.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.eseMarks.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.ciaMarks.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.totalMarks.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.gradePoint > 0 ? course.gradePoint.toFixed(1) : '0', styles: { halign: 'center', fontSize: 8 } },
				{ content: course.letterGrade, styles: { halign: 'center', fontSize: 8 } },
				{ content: course.result, styles: { halign: 'center', fontSize: 8, fontStyle: 'bold' } }
			]
		} else {
			// UG - with PART column
			return [
				{ content: partToRoman(course.part), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.semester.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.courseCode, styles: { halign: 'left', fontSize: 7 } },
				{ content: course.courseName.toUpperCase(), styles: { halign: 'left', fontSize: 7 } },
				{ content: course.credits.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.eseMax.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.ciaMax.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.totalMax.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.eseMarks.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.ciaMarks.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.totalMarks.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: course.gradePoint > 0 ? course.gradePoint.toFixed(1) : '0', styles: { halign: 'center', fontSize: 8 } },
				{ content: course.letterGrade, styles: { halign: 'center', fontSize: 8 } },
				{ content: course.result, styles: { halign: 'center', fontSize: 8, fontStyle: 'bold' } }
			]
		}
	})

	// Build column styles object
	const columnStyles: Record<number, any> = {}
	colWidths.forEach((width, i) => {
		columnStyles[i] = {
			cellWidth: width,
			halign: i <= 1 ? 'center' : (isPG && i === 2) || (!isPG && i === 3) ? 'left' : 'center'
		}
	})

	autoTable(doc, {
		startY: currentY,
		head: headers,
		body: body,
		theme: 'grid',
		styles: {
			fontSize: 8,
			cellPadding: 1.5,
			lineColor: COLORS.blue,
			lineWidth: 0.3,
			textColor: COLORS.black,
			overflow: 'linebreak',
			valign: 'middle',
			minCellHeight: 6
		},
		headStyles: {
			fillColor: COLORS.blue,
			textColor: COLORS.white,
			fontSize: 7,
			fontStyle: 'bold',
			minCellHeight: 8
		},
		columnStyles: columnStyles,
		margin: { left: MARGIN, right: MARGIN },
		tableWidth: CONTENT_WIDTH
	})

	currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 60

	// ========== PART-WISE GPA SUMMARY (Only for UG) ==========

	if (!isPG && data.partBreakdown && data.partBreakdown.length > 0) {
		// Check if we need a new page
		if (currentY > A4_HEIGHT - 60) {
			doc.addPage()
			currentY = MARGIN
		}

		// "(IN THE CURRENT SEMESTER)" title
		doc.setFont('helvetica', 'bold')
		doc.setFontSize(9)
		doc.setTextColor(...COLORS.blue)
		doc.text('(IN THE CURRENT SEMESTER)', MARGIN, currentY)
		currentY += 4

		// Part summary table with blue borders
		const summaryHeaders: RowInput[] = [[
			{ content: 'PART', styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, fillColor: COLORS.blue, textColor: COLORS.white } },
			{ content: 'CREDITS EARNED', styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, fillColor: COLORS.blue, textColor: COLORS.white } },
			{ content: 'GPA', styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, fillColor: COLORS.blue, textColor: COLORS.white } }
		]]

		const summaryBody: RowInput[] = data.partBreakdown
			.filter(part => part.courses.length > 0)
			.map(part => [
				{ content: partToRoman(part.partName), styles: { halign: 'center', fontSize: 8 } },
				{ content: part.creditsEarned.toString(), styles: { halign: 'center', fontSize: 8 } },
				{ content: part.partGPA.toFixed(2), styles: { halign: 'center', fontSize: 8 } }
			])

		autoTable(doc, {
			startY: currentY,
			head: summaryHeaders,
			body: summaryBody,
			theme: 'grid',
			styles: {
				fontSize: 8,
				cellPadding: 2,
				lineColor: COLORS.blue,
				lineWidth: 0.3,
				textColor: COLORS.black,
				valign: 'middle'
			},
			headStyles: {
				fillColor: COLORS.blue,
				textColor: COLORS.white,
				fontStyle: 'bold'
			},
			columnStyles: {
				0: { cellWidth: 25, halign: 'center' },
				1: { cellWidth: 40, halign: 'center' },
				2: { cellWidth: 30, halign: 'center' }
			},
			margin: { left: MARGIN },
			tableWidth: 95
		})

		currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 40
	}

	// ========== FOOTNOTES ==========

	doc.setFont('helvetica', 'normal')
	doc.setFontSize(7)
	doc.setTextColor(...COLORS.black)

	const footnote = 'Passing Minimum is 40% of Maximum (in ESE and Total separately) P: Pass, RA: Re-Appear, AAA: Absent, ESE: End Semester Examination, CIA: Continuous Internal Assessment, GPA: Grade Points Average, ***Not Secured Passing Minimum.'
	const splitNote = doc.splitTextToSize(footnote, CONTENT_WIDTH)
	doc.text(splitNote, MARGIN, currentY)

	currentY += splitNote.length * 3.5 + 8

	// ========== DATE SECTION ==========

	const dateStr = data.generatedDate || new Date().toLocaleDateString('en-IN', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	})

	doc.setFont('helvetica', 'normal')
	doc.setFontSize(9)
	doc.setTextColor(...COLORS.black)
	doc.text(dateStr, MARGIN, currentY)
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

export function generateSemesterMarksheetPDF(
	data: StudentMarksheetData,
	options: MarksheetPDFOptions = {}
): string {
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	})

	addStudentMarksheetToDoc(doc, data, options)
	return doc.output('datauristring')
}

export function downloadSemesterMarksheetPDF(
	data: StudentMarksheetData,
	filename?: string,
	options: MarksheetPDFOptions = {}
): void {
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	})

	addStudentMarksheetToDoc(doc, data, options)
	const fname = filename || `Marksheet_${data.student.registerNo}_Sem${data.semester}.pdf`
	doc.save(fname)
}

export function generateBatchMarksheetPDFs(
	students: StudentMarksheetData[],
	options: MarksheetPDFOptions = {}
): string[] {
	return students.map(student => {
		const doc = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: 'a4'
		})
		addStudentMarksheetToDoc(doc, student, options)
		return doc.output('datauristring')
	})
}

export function generateMergedMarksheetPDF(
	students: StudentMarksheetData[],
	options: MarksheetPDFOptions = {}
): string {
	if (students.length === 0) {
		throw new Error('No students provided for merged PDF')
	}

	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	})

	students.forEach((studentData, index) => {
		if (index > 0) {
			doc.addPage()
		}
		addStudentMarksheetToDoc(doc, studentData, options)
	})

	return doc.output('datauristring')
}

export function downloadMergedMarksheetPDF(
	students: StudentMarksheetData[],
	filename?: string,
	options: MarksheetPDFOptions = {}
): void {
	if (students.length === 0) {
		throw new Error('No students provided for merged PDF')
	}

	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	})

	students.forEach((studentData, index) => {
		if (index > 0) {
			doc.addPage()
		}
		addStudentMarksheetToDoc(doc, studentData, options)
	})

	const fname = filename || `Marksheets_Merged_${students.length}_students.pdf`
	doc.save(fname)
}

// Legacy class export for backward compatibility
export class SemesterMarksheetPDFGenerator {
	private doc: jsPDF
	private data: StudentMarksheetData
	private options: MarksheetPDFOptions

	constructor(data: StudentMarksheetData, options: MarksheetPDFOptions = {}) {
		this.doc = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: 'a4'
		})
		this.data = data
		this.options = options
	}

	public generate(): string {
		addStudentMarksheetToDoc(this.doc, this.data, this.options)
		return this.doc.output('datauristring')
	}

	public download(filename?: string): void {
		addStudentMarksheetToDoc(this.doc, this.data, this.options)
		const fname = filename || `Marksheet_${this.data.student.registerNo}_Sem${this.data.semester}.pdf`
		this.doc.save(fname)
	}
}
