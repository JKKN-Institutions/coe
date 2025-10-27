import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface CourseMapping {
	id: string
	semester_code: string
	semester_name: string
	semester_number: number
	display_order: number
	part_name: string
	course_code: string
	course_title: string
	course_category?: string
	course_type?: string
	course_group?: string
	evaluation_pattern?: string
	credits?: number
	exam_hours?: number
	course_order?: number
	sort_order?: number
	internal_max_mark?: number
	internal_pass_mark?: number
	internal_converted_mark?: number
	external_max_mark?: number
	external_pass_mark?: number
	external_converted_mark?: number
	total_max_mark?: number
	total_pass_mark?: number
}

interface ReportData {
	institutionName: string
	institutionAddress?: string
	programName: string
	programCode?: string
	degreeName: string
	regulationName?: string
	regulationCode?: string
	logoImage?: string
	mappings: CourseMapping[]
}

export function generateCourseMappingPDF(data: ReportData) {
	// Debug: Log the data structure
	console.log('PDF Generation Data:', {
		institutionName: data.institutionName,
		programName: data.programName,
		regulationCode: data.regulationCode,
		regulationName: data.regulationName,
		mappingsCount: data.mappings?.length || 0,
		sampleMapping: data.mappings?.[0]
	})

	// Legal size Landscape with 0.5 inch (12.7mm) margins
	const doc = new jsPDF('landscape', 'mm', 'legal')
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 12.7 // 0.5 inch in mm
	const contentWidth = pageWidth - (2 * margin)

	// Helper function to add header to each page
	const addHeader = () => {
		let currentY = margin

		// College Logo (left side)
		if (data.logoImage) {
			try {
				const logoSize = 20
				doc.addImage(data.logoImage, 'PNG', margin, currentY, logoSize, logoSize)
			} catch (e) {
				console.warn('Failed to add logo to PDF:', e)
			}
		}

		// College name and details (centered)
		doc.setFont('times', 'bold')
		doc.setFontSize(16)
		doc.setTextColor(0, 0, 0)
		doc.text(data.institutionName.toUpperCase(), pageWidth / 2, currentY + 5, { align: 'center' })

		if (data.institutionAddress) {
			// Remove institution name from address if it's already included
			let cleanAddress = data.institutionAddress
			// Remove the institution name if it appears at the start of the address
			const nameVariations = [
				data.institutionName.toUpperCase(),
				data.institutionName,
				'J.K.K NATARAJA COLLEGE OF ARTS & SCIENCE,',
				'JKKN COLLEGE OF ARTS AND SCIENCE,'
			]

			for (const name of nameVariations) {
				if (cleanAddress.startsWith(name)) {
					cleanAddress = cleanAddress.substring(name.length).trim()
					// Remove leading comma if present
					if (cleanAddress.startsWith(',')) {
						cleanAddress = cleanAddress.substring(1).trim()
					}
					break
				}
			}

			doc.setFont('times', 'normal')
			doc.setFontSize(10)
			doc.text(cleanAddress, pageWidth / 2, currentY + 11, { align: 'center' })
		}

		doc.setFont('times', 'italic')
		doc.setFontSize(10)
		doc.text('(An Autonomous Institution)', pageWidth / 2, currentY + 16, { align: 'center' })

		currentY += 22

		// Program and Regulation info (horizontal layout)
		doc.setFont('times', 'bold')
		doc.setFontSize(12)
		doc.text('DEGREE BRANCH:', margin + 10, currentY)

		doc.setFont('times', 'normal')
		doc.setFontSize(12)
		const degreeText = `${data.programName} - (Aided)`
		doc.text(degreeText, margin + 55, currentY)

		// Regulation on the right side
		doc.setFont('times', 'bold')
		doc.setFontSize(12)
		const regulationLabel = 'REGULATION:'
		const regulationLabelWidth = doc.getTextWidth(regulationLabel)
		doc.text(regulationLabel, pageWidth - margin - 70, currentY)

		doc.setFont('times', 'normal')
		doc.setFontSize(12)
		const regulationText = data.regulationCode || data.regulationName || 'N/A'
		doc.text(regulationText, pageWidth - margin - 70 + regulationLabelWidth + 5, currentY)

		currentY += 5

		// Horizontal line
		doc.setLineWidth(0.5)
		doc.setDrawColor(0, 0, 0)
		doc.line(margin, currentY, pageWidth - margin, currentY)

		return currentY + 5
	}

	// Add initial header
	let startY = addHeader()

	// Group mappings by semester
	const semesterGroups = data.mappings.reduce((acc, mapping) => {
		const semKey = mapping.semester_number || mapping.semester_code
		if (!acc[semKey]) {
			acc[semKey] = {
				semesterName: mapping.semester_name,
				semesterNumber: mapping.semester_number,
				courses: []
			}
		}
		acc[semKey].courses.push(mapping)
		return acc
	}, {} as Record<string, { semesterName: string; semesterNumber: number; courses: CourseMapping[] }>)

	// Sort semesters by number
	const sortedSemesters = Object.keys(semesterGroups).sort((a, b) => {
		const semA = semesterGroups[a].semesterNumber || 0
		const semB = semesterGroups[b].semesterNumber || 0
		return semA - semB
	})

	// Generate table for each semester
	sortedSemesters.forEach((semKey, index) => {
		const semester = semesterGroups[semKey]

		// Sort courses by course_order
		const sortedCourses = semester.courses.sort((a, b) => {
			const orderA = a.course_order || 0
			const orderB = b.course_order || 0
			return orderA - orderB
		})

		// Prepare table data
		const tableData = sortedCourses.map((course, courseIndex) => {
			// Use part_name from course (already fetched from courses table)
			const part = course.part_name || '-'

			// Use semester_name for display in SEM column with multiple fallbacks
			const semValue = course.semester_name ||
							 semester.semesterName ||
							 course.semester_code ||
							 `Sem ${semester.semesterNumber || ''}` ||
							 '-'

			return [
				semValue, // Semester name (e.g., "Semester I", "Part I")
				part, // Part (from courses.course_part_master)
				course.course_code || '-',
				course.course_title || '-',
				course.course_type || '-',
				course.evaluation_pattern || '-',
				course.credits?.toString() || '-',
				course.exam_hours?.toString() || '-',
				course.sort_order?.toString() || '-',
				// Internal marks (MAX, PASS, CONV)
				course.internal_max_mark?.toString() || '0',
				course.internal_pass_mark?.toString() || '0',
				course.internal_converted_mark?.toString() || '0',
				// ESE marks (MAX, PASS, CONV)
				course.external_max_mark?.toString() || '0',
				course.external_pass_mark?.toString() || '0',
				course.external_converted_mark?.toString() || '0',
				// Total marks (MAX, MIN)
				course.total_max_mark?.toString() || '0',
				course.total_pass_mark?.toString() || '0'
			]
		})

		// Add spacing between semesters
		if (index > 0) {
			startY += 8
		}

		autoTable(doc, {
			startY: startY,
			head: [
				[
					{ content: 'SEM', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
					{ content: 'PART', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
					{ content: 'COURSE\nCODE', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
					{ content: 'COURSE TITLE', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
					{ content: 'COURSE\nTYPE', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
					{ content: 'EVALUATION\nPATTERN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
					{ content: 'CREDIT', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
					{ content: 'EXAM\nHRS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
					{ content: 'SORT\nORDER', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
					{ content: 'INTERNAL MARKS', colSpan: 3, styles: { halign: 'center', valign: 'middle' } },
					{ content: 'ESE MARKS', colSpan: 3, styles: { halign: 'center', valign: 'middle' } },
					{ content: 'TOTAL', colSpan: 2, styles: { halign: 'center', valign: 'middle' } }
				],
				[
					'MAX', 'PASS', 'CONV', // Internal
					'MAX', 'PASS', 'CONV', // ESE
					'MAX', 'MIN' // Total
				]
			],
			body: tableData,
			theme: 'grid',
			styles: {
				font: 'times',
				fontStyle: 'normal',
				textColor: [0, 0, 0],
				lineColor: [0, 0, 0],
				lineWidth: 0.3
			},
			headStyles: {
				font: 'times',
				fontStyle: 'bold',
				fontSize: 12,
				textColor: [0, 0, 0],
				fillColor: [255, 255, 255],
				halign: 'center',
				valign: 'middle',
				lineWidth: 0.3,
				lineColor: [0, 0, 0],
				cellPadding: 1.5
			},
			bodyStyles: {
				font: 'times',
				fontStyle: 'normal',
				fontSize: 11,
				textColor: [0, 0, 0],
				fillColor: [255, 255, 255],
				valign: 'middle',
				lineWidth: 0.3,
				lineColor: [0, 0, 0],
				cellPadding: 1.5
			},
			columnStyles: {
				0: { halign: 'center', cellWidth: 18 }, // SEM
				1: { halign: 'center', cellWidth: 18 }, // PART
				2: { halign: 'center', cellWidth: 20 }, // COURSE CODE
				3: { halign: 'left', cellWidth: 90 }, // COURSE TITLE
				4: { halign: 'center', cellWidth: 18 }, // COURSE TYPE
				5: { halign: 'center', cellWidth: 20 }, // EVALUATION PATTERN
				6: { halign: 'center', cellWidth: 12 }, // CREDIT
				7: { halign: 'center', cellWidth: 12 }, // EXAM HRS
				8: { halign: 'center', cellWidth: 12 }, // SORT ORDER
				9: { halign: 'center', cellWidth: 13 }, // INT MAX
				10: { halign: 'center', cellWidth: 13 }, // INT PASS
				11: { halign: 'center', cellWidth: 13 }, // INT CONV
				12: { halign: 'center', cellWidth: 13 }, // ESE MAX
				13: { halign: 'center', cellWidth: 13 }, // ESE PASS
				14: { halign: 'center', cellWidth: 13 }, // ESE CONV
				15: { halign: 'center', cellWidth: 13 }, // TOTAL MAX
				16: { halign: 'center', cellWidth: 13 } // TOTAL MIN
			},
			margin: { left: margin, right: margin, top: margin, bottom: margin },
			tableWidth: 'wrap',
			didDrawPage: (data) => {
				// Add footer with page number and timestamp on all pages
				const currentPageNumber = doc.internal.pages.length - 1 // Get actual page number

				// Page number (centered)
				doc.setFont('times', 'normal')
				doc.setFontSize(10)
				doc.setTextColor(0, 0, 0)
				const footerText = `Page ${currentPageNumber}`
				doc.text(footerText, pageWidth / 2, pageHeight - margin + 10, { align: 'center' })

				// Date & time (right-aligned)
				doc.setFont('times', 'italic')
				doc.setFontSize(9)
				doc.setTextColor(80, 80, 80)
				const timestamp = new Date().toLocaleString()
				doc.text(`Generated on: ${timestamp}`, pageWidth - margin, pageHeight - margin + 10, { align: 'right' })
			}
		})

		// Update startY for next table
		startY = (doc as any).lastAutoTable.finalY + 8

		// Add page break after each semester (except the last one)
		if (index < sortedSemesters.length - 1) {
			doc.addPage()
			startY = margin + 5
		}
	})

	// Save the PDF
	const fileName = `Course_Mapping_${data.programName.replace(/\s+/g, '_')}_${data.regulationCode || 'Regulation'}.pdf`
	doc.save(fileName)
}
