import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface CourseMapping {
	id: string
	semester_code: string
	semester_name: string
	semester_number: number
	course_code: string
	course_title: string
	course_category?: string
	course_type?: string
	course_group?: string
	evaluation_pattern?: string
	credits?: number
	exam_hours?: number
	course_order?: number
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
	degreeName: string
	batchName: string
	regulationName?: string
	mappings: CourseMapping[]
}

export function generateCourseMappingPDF(data: ReportData) {
	const doc = new jsPDF('landscape', 'mm', 'a4')
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()

	// Helper function to add header to each page
	const addHeader = () => {
		// College Logo placeholder (left)
		doc.setFillColor(230, 230, 230)
		doc.rect(10, 10, 25, 25, 'F')
		doc.setFontSize(8)
		doc.setTextColor(100)
		doc.text('LOGO', 22.5, 22.5, { align: 'center' })

		// College name and details (centered)
		doc.setFontSize(14)
		doc.setFont('helvetica', 'bold')
		doc.setTextColor(0, 0, 0)
		doc.text(data.institutionName.toUpperCase(), pageWidth / 2, 15, { align: 'center' })

		if (data.institutionAddress) {
			doc.setFontSize(9)
			doc.setFont('helvetica', 'normal')
			doc.text(data.institutionAddress, pageWidth / 2, 20, { align: 'center' })
		}

		doc.setFontSize(8)
		doc.setFont('helvetica', 'italic')
		doc.text('(An Autonomous Institution)', pageWidth / 2, 25, { align: 'center' })

		// Title
		doc.setFontSize(12)
		doc.setFont('helvetica', 'bold')
		doc.text('DEGREE BRANCH COURSE DETAILS', pageWidth / 2, 32, { align: 'center' })

		// Program/Degree Branch and Batch
		doc.setFontSize(10)
		doc.setFont('helvetica', 'bold')
		const programText = `${data.degreeName} - ${data.programName}`
		doc.text(programText, pageWidth / 2, 38, { align: 'center' })

		doc.setFontSize(9)
		doc.setFont('helvetica', 'normal')
		doc.text(`Batch: ${data.batchName}`, pageWidth / 2, 43, { align: 'center' })

		if (data.regulationName) {
			doc.text(`Regulation: ${data.regulationName}`, pageWidth / 2, 48, { align: 'center' })
		}

		// Horizontal line
		doc.setLineWidth(0.5)
		doc.line(10, data.regulationName ? 50 : 45, pageWidth - 10, data.regulationName ? 50 : 45)
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

	let startY = data.regulationName ? 53 : 48

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
		const tableData = sortedCourses.map((course) => {
			// Determine PART based on course_group
			let part = '-'
			if (course.course_group) {
				if (course.course_group.toLowerCase().includes('general')) {
					part = 'I'
				} else if (course.course_group.toLowerCase().includes('elective')) {
					part = course.course_group
				} else {
					part = course.course_group
				}
			}

			// Format internal marks
			const internalMarks = `${course.internal_max_mark || 0}, ${course.internal_pass_mark || 0}, ${course.internal_converted_mark || 0}`

			// Format external marks (ESE)
			const externalMarks = `${course.external_max_mark || 0}, ${course.external_pass_mark || 0}, ${course.external_converted_mark || 0}`

			// Format total marks
			const totalMarks = `${course.total_max_mark || 0}, ${course.total_pass_mark || 0}`

			return [
				semester.semesterNumber || semKey,
				part,
				course.course_code || '-',
				course.course_title || '-',
				course.course_category || '-',
				course.course_type || '-',
				course.evaluation_pattern || '-',
				course.credits?.toString() || '-',
				course.exam_hours?.toString() || '-',
				course.course_order?.toString() || '-',
				internalMarks,
				externalMarks,
				totalMarks
			]
		})

		// Add semester heading
		if (index > 0) {
			startY += 10 // Add spacing between semesters
		}

		autoTable(doc, {
			startY: startY,
			head: [[
				'SEM',
				'PART',
				'COURSE\nCODE',
				'COURSE TITLE',
				'COURSE\nCATEG.',
				'COURSE\nTYPE',
				'EVALUATION\nPATTERN',
				'CREDIT',
				'EXAM\nHRS',
				'SORT\nORDER',
				'INTERNAL MARKS\n(Max, Pass, Conv)',
				'ESE MARKS\n(Max, Pass, Conv)',
				'TOTAL\n(Max, Min)'
			]],
			body: tableData,
			theme: 'grid',
			headStyles: {
				fillColor: [41, 128, 185],
				textColor: 255,
				fontSize: 7,
				fontStyle: 'bold',
				halign: 'center',
				valign: 'middle',
				lineWidth: 0.1,
				lineColor: [0, 0, 0]
			},
			bodyStyles: {
				fontSize: 7,
				cellPadding: 2,
				valign: 'middle',
				lineWidth: 0.1,
				lineColor: [0, 0, 0]
			},
			columnStyles: {
				0: { halign: 'center', cellWidth: 12 }, // SEM
				1: { halign: 'center', cellWidth: 15 }, // PART
				2: { halign: 'center', cellWidth: 22 }, // COURSE CODE
				3: { halign: 'left', cellWidth: 45 }, // COURSE TITLE
				4: { halign: 'center', cellWidth: 18 }, // COURSE CATEG
				5: { halign: 'center', cellWidth: 18 }, // COURSE TYPE
				6: { halign: 'center', cellWidth: 22 }, // EVALUATION PATTERN
				7: { halign: 'center', cellWidth: 14 }, // CREDIT
				8: { halign: 'center', cellWidth: 14 }, // EXAM HRS
				9: { halign: 'center', cellWidth: 14 }, // SORT ORDER
				10: { halign: 'center', cellWidth: 28 }, // INTERNAL MARKS
				11: { halign: 'center', cellWidth: 28 }, // ESE MARKS
				12: { halign: 'center', cellWidth: 24 } // TOTAL
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
