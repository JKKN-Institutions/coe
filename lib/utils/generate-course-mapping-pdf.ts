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
	batchName: string
	batchCode?: string
	batchYear?: number
	regulationName?: string
	regulationCode?: string
	logoImage?: string
	mappings: CourseMapping[]
}

export function generateCourseMappingPDF(data: ReportData) {
	const doc = new jsPDF('landscape', 'mm', 'a4')
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()

	// Helper function to add header to each page
	const addHeader = () => {
		// College Logo (left) - using actual image
		if (data.logoImage) {
			try {
				doc.addImage(data.logoImage, 'PNG', 10, 10, 20, 20)
			} catch (e) {
				console.warn('Failed to add logo to PDF:', e)
				// Fallback to placeholder
				doc.setFillColor(240, 240, 240)
				doc.rect(10, 10, 20, 20, 'F')
			}
		} else {
			// Fallback to placeholder if image not loaded
			doc.setFillColor(240, 240, 240)
			doc.rect(10, 10, 20, 20, 'F')
		}

		// College name and details (centered)
		doc.setFontSize(16)
		doc.setFont('helvetica', 'bold')
		doc.setTextColor(0, 0, 0)
		doc.text(data.institutionName.toUpperCase(), pageWidth / 2, 16, { align: 'center' })

		if (data.institutionAddress) {
			doc.setFontSize(8)
			doc.setFont('helvetica', 'normal')
			doc.text(data.institutionAddress, pageWidth / 2, 21, { align: 'center' })
		}

		doc.setFontSize(9)
		doc.setFont('helvetica', 'italic')
		doc.text('(An Autonomous Institution)', pageWidth / 2, 26, { align: 'center' })

		// Title
		doc.setFontSize(11)
		doc.setFont('helvetica', 'bold')
		doc.text('DEGREE BRANCH : ', 15, 32)

		doc.setFont('helvetica', 'normal')
		const degreeText = `${data.programName} - (Aided)`
		doc.text(degreeText, 60, 32)

		// Batch info on right side
		doc.setFont('helvetica', 'bold')
		doc.text('BATCH : ', pageWidth - 80, 32)

		doc.setFont('helvetica', 'normal')
		const batchYear = data.batchYear || data.batchCode?.substring(1) || ''
		doc.text(`${batchYear}`, pageWidth - 40, 32)

		// Horizontal line
		doc.setLineWidth(0.5)
		doc.line(10, 35, pageWidth - 10, 35)
	}

	// Add initial header
	addHeader()

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

	let startY = 38

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
		const tableData = sortedCourses.map((course, index) => {
			// Use part_name from course (already fetched from courses table)
			const part = course.part_name || '-'

			// Use display_order from semesters table
			const semValue = course.display_order || '-'

			return [
				semValue, // Semester number (display_order from semesters table)
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

		// Add semester heading
		if (index > 0) {
			startY += 10 // Add spacing between semesters
		}

		autoTable(doc, {
			startY: startY,
			head: [
				[
					{ content: 'SEM', rowSpan: 2 },
					{ content: 'PART', rowSpan: 2 },
					{ content: 'COURSE\nCODE', rowSpan: 2 },
					{ content: 'COURSE TITLE', rowSpan: 2 },
					{ content: 'COURSE\nTYPE', rowSpan: 2 },
					{ content: 'EVALUATION\nPATTERN', rowSpan: 2 },
					{ content: 'CREDIT', rowSpan: 2 },
					{ content: 'EXAM\nHRS', rowSpan: 2 },
					{ content: 'SORT\nORDER', rowSpan: 2 },
					{ content: 'INTERNAL MARKS', colSpan: 3 },
					{ content: 'ESE MARKS', colSpan: 3 },
					{ content: 'TOTAL', colSpan: 2 }
				],
				[
					'MAX', 'PASS', 'CONV', // Internal
					'MAX', 'PASS', 'CONV', // ESE
					'MAX', 'MIN' // Total
				]
			],
			body: tableData,
			theme: 'grid',
			headStyles: {
				fillColor: [240, 240, 240],
				textColor: [0, 0, 0],
				fontSize: 7,
				fontStyle: 'bold',
				halign: 'center',
				valign: 'middle',
				lineWidth: 0.5,
				lineColor: [0, 0, 0]
			},
			bodyStyles: {
				fontSize: 7,
				cellPadding: 2,
				valign: 'middle',
				lineWidth: 0.5,
				lineColor: [0, 0, 0]
			},
			columnStyles: {
				0: { halign: 'center', cellWidth: 10 }, // SEM
				1: { halign: 'center', cellWidth: 18 }, // PART
				2: { halign: 'center', cellWidth: 22 }, // COURSE CODE
				3: { halign: 'left', cellWidth: 55 }, // COURSE TITLE
				4: { halign: 'center', cellWidth: 20 }, // COURSE TYPE
				5: { halign: 'center', cellWidth: 22 }, // EVALUATION PATTERN
				6: { halign: 'center', cellWidth: 12 }, // CREDIT
				7: { halign: 'center', cellWidth: 12 }, // EXAM HRS
				8: { halign: 'center', cellWidth: 12 }, // SORT ORDER
				9: { halign: 'center', cellWidth: 12 }, // INT MAX
				10: { halign: 'center', cellWidth: 12 }, // INT PASS
				11: { halign: 'center', cellWidth: 12 }, // INT CONV
				12: { halign: 'center', cellWidth: 12 }, // ESE MAX
				13: { halign: 'center', cellWidth: 12 }, // ESE PASS
				14: { halign: 'center', cellWidth: 12 }, // ESE CONV
				15: { halign: 'center', cellWidth: 12 }, // TOTAL MAX
				16: { halign: 'center', cellWidth: 12 } // TOTAL MIN
			},
			margin: { left: 10, right: 10 },
			didDrawPage: (data) => {
				// Add header on each new page
				if (data.pageNumber > 1) {
					addHeader()
				}

				// Add footer with page number
				doc.setFontSize(8)
				doc.setTextColor(100)
				const footerText = `Page ${data.pageNumber}`
				doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' })
			}
		})

		// Update startY for next table
		startY = (doc as any).lastAutoTable.finalY + 5
	})

	// Add generation timestamp footer
	doc.setFontSize(7)
	doc.setTextColor(100)
	const timestamp = new Date().toLocaleString()
	doc.text(`Generated on: ${timestamp}`, pageWidth - 10, pageHeight - 10, { align: 'right' })

	// Save the PDF
	const fileName = `Course_Mapping_${data.programName.replace(/\s+/g, '_')}_${data.batchName.replace(/\s+/g, '_')}.pdf`
	doc.save(fileName)
}
