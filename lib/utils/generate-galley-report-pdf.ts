import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface CourseMarks {
	course: {
		id: string
		course_code: string
		course_name: string
		display_code: string
		credit: number
		internal_max_mark: number
		external_max_mark: number
		total_max_mark: number
	}
	internal_marks: number
	internal_max: number
	external_marks: number
	external_max: number
	total_marks: number
	total_max: number
	letter_grade: string
	grade_points: number
	is_pass: boolean
	pass_status: string
}

interface StudentData {
	student: {
		id: string
		first_name: string
		last_name: string
		register_number: string
		roll_number: string
	}
	courses: CourseMarks[]
	semester_result: {
		sgpa: number
		cgpa: number
		percentage: number
		result_status: string
		result_class: string
		total_backlogs: number
	} | null
}

interface CourseAnalysis {
	course: {
		id: string
		course_code: string
		course_name: string
		credit: number
		internal_max_mark: number
		external_max_mark: number
		total_max_mark: number
	}
	registered: number
	appeared: number
	absent: number
	passed: number
	failed: number
	reappear: number
	pass_percentage: string
	grades: Record<string, number>
}

interface GalleyReportData {
	institution: {
		id: string
		institution_code: string
		institution_name: string
	}
	session: {
		id: string
		session_name: string
		session_code: string
		session_type: string
	}
	program: {
		id: string
		program_code: string
		program_name: string
		display_name: string
		degrees?: { degree_code: string; degree_name: string }
	}
	semester: number
	batch: string
	students: StudentData[]
	courseAnalysis: CourseAnalysis[]
	statistics: {
		total_students: number
		total_passed: number
		total_failed: number
		total_with_backlogs: number
		pass_percentage: string
		grade_distribution: Record<string, number>
		top_performers: Array<{
			register_number: string
			name: string
			cgpa: number
			sgpa: number
		}>
		highest_scorer: {
			register_number: string
			name: string
			total_marks: number
			total_max: number
		} | null
	}
	logoImage?: string
	rightLogoImage?: string
}

export function generateGalleyReportPDF(data: GalleyReportData): string {
	// Legal size Landscape
	const doc = new jsPDF('landscape', 'mm', 'legal')
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 8
	const contentWidth = pageWidth - (2 * margin)

	// Get unique courses for column headers
	const uniqueCourses = data.courseAnalysis.map(ca => ca.course)

	// Helper function to add header
	const addHeader = (pageTitle: string = 'END SEMESTER EXAMINATIONS') => {
		let currentY = margin

		// College Logo (left side)
		if (data.logoImage) {
			try {
				doc.addImage(data.logoImage, 'PNG', margin, currentY, 18, 18)
			} catch (e) {
				console.warn('Failed to add logo:', e)
			}
		}

		// College Logo (right side)
		if (data.rightLogoImage) {
			try {
				doc.addImage(data.rightLogoImage, 'PNG', pageWidth - margin - 18, currentY, 18, 18)
			} catch (e) {
				console.warn('Failed to add right logo:', e)
			}
		}

		// College name
		doc.setFont('times', 'bold')
		doc.setFontSize(14)
		doc.setTextColor(0, 0, 0)
		doc.text('J.K.K.NATARAJA COLLEGE OF ARTS & SCIENCE (AUTONOMOUS)', pageWidth / 2, currentY + 5, { align: 'center' })

		doc.setFont('times', 'normal')
		doc.setFontSize(9)
		doc.text('(Accredited by NAAC, Approved by AICTE, Recognized by UGC Under Section 2(f) & 12(B))', pageWidth / 2, currentY + 10, { align: 'center' })
		doc.text('Komarapalayam - 638 183, Namakkal District, Tamil Nadu', pageWidth / 2, currentY + 14, { align: 'center' })

		currentY += 18

		// Report Title
		doc.setFont('times', 'bold')
		doc.setFontSize(12)
		doc.text(pageTitle, pageWidth / 2, currentY, { align: 'center' })

		currentY += 5

		// Program and Session Info
		doc.setFont('times', 'bold')
		doc.setFontSize(10)
		const programText = `PROGRAMME & BRANCH: ${data.program?.degrees?.degree_name || ''} ${data.program?.program_name || ''}`
		doc.text(programText, margin, currentY)

		doc.text(`PROGRAMME CODE: ${data.program?.program_code || ''}`, pageWidth / 2, currentY)
		doc.text(`SEMESTER: ${data.semester}`, pageWidth - margin - 50, currentY)
		doc.text(`BATCH: ${data.batch}`, pageWidth - margin, currentY, { align: 'right' })

		currentY += 4

		// Session info
		doc.setFont('times', 'normal')
		doc.setFontSize(9)
		doc.text(`Examination Session: ${data.session?.session_name || ''} (${data.session?.session_type || ''})`, margin, currentY)

		currentY += 3

		// Horizontal line
		doc.setLineWidth(0.3)
		doc.line(margin, currentY, pageWidth - margin, currentY)

		return currentY + 2
	}

	// Add footer
	const addFooter = (pageNumber: number) => {
		doc.setFont('times', 'normal')
		doc.setFontSize(8)
		doc.setTextColor(0, 0, 0)
		doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 5, { align: 'center' })

		const timestamp = new Date().toLocaleString('en-GB', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
		doc.text(`Generated on: ${timestamp}`, pageWidth - margin, pageHeight - 5, { align: 'right' })
	}

	let pageNumber = 1

	// =========================================
	// PAGE 1: STUDENT RESULTS TABLE
	// =========================================
	let startY = addHeader(`END SEMESTER EXAMINATIONS - ${data.session?.session_name?.toUpperCase() || ''}`)

	// Build table headers - matching the attached format
	const courseHeaders: string[] = []
	const subHeaders: string[][] = []

	// Add course code headers (max 8 courses per page)
	const maxCoursesPerPage = 8
	const courseSlices = []
	for (let i = 0; i < uniqueCourses.length; i += maxCoursesPerPage) {
		courseSlices.push(uniqueCourses.slice(i, i + maxCoursesPerPage))
	}

	// Generate pages for student results
	courseSlices.forEach((coursesOnPage, pageIndex) => {
		if (pageIndex > 0) {
			doc.addPage()
			pageNumber++
			startY = addHeader(`END SEMESTER EXAMINATIONS - ${data.session?.session_name?.toUpperCase() || ''} (Continued)`)
		}

		// Build headers for this page
		const headers = [
			'REG NO',
			'NAME OF THE CANDIDATE',
		]

		// Add course headers
		coursesOnPage.forEach(course => {
			headers.push(course.course_code)
		})

		// Add result columns if last page
		if (pageIndex === courseSlices.length - 1) {
			headers.push('SGPA', 'CGPA', 'RESULT')
		}

		// Build sub-headers row
		const subHeaderRow = ['', '']
		coursesOnPage.forEach(() => {
			subHeaderRow.push('SEM INT EXT TOT RES GP LG')
		})
		if (pageIndex === courseSlices.length - 1) {
			subHeaderRow.push('', '', '')
		}

		// Build table data
		const tableData: (string | number)[][] = []

		data.students.forEach((student) => {
			const row: (string | number)[] = [
				student.student.register_number || '',
				`${student.student.first_name} ${student.student.last_name || ''}`.trim()
			]

			// Add marks for each course on this page
			coursesOnPage.forEach(course => {
				const courseMarks = student.courses.find(c => c.course.id === course.id)
				if (courseMarks) {
					const semNo = data.semester
					const int = courseMarks.internal_marks || 0
					const ext = courseMarks.external_marks || 0
					const tot = courseMarks.total_marks || 0
					const res = courseMarks.pass_status === 'Pass' ? 'P' :
						courseMarks.pass_status === 'Fail' ? 'F' :
							courseMarks.pass_status === 'Absent' || courseMarks.pass_status === 'AAA' ? 'AAA' :
								courseMarks.pass_status === 'Reappear' || courseMarks.pass_status === 'RA' ? 'RA' :
									courseMarks.pass_status || '-'
					const gp = courseMarks.grade_points?.toFixed(1) || '-'
					const lg = courseMarks.letter_grade || '-'

					row.push(`${semNo} ${int} ${ext} ${tot} ${res} ${gp} ${lg}`)
				} else {
					row.push('-')
				}
			})

			// Add result columns if last page
			if (pageIndex === courseSlices.length - 1) {
				row.push(
					student.semester_result?.sgpa?.toFixed(2) || '-',
					student.semester_result?.cgpa?.toFixed(2) || '-',
					student.semester_result?.result_status || 'Pending'
				)
			}

			tableData.push(row)
		})

		// Generate table
		autoTable(doc, {
			startY: startY,
			head: [headers],
			body: tableData,
			theme: 'grid',
			styles: {
				font: 'times',
				fontSize: 6,
				cellPadding: 1,
				lineColor: [0, 0, 0],
				lineWidth: 0.2,
				textColor: [0, 0, 0]
			},
			headStyles: {
				fillColor: [255, 255, 255],
				textColor: [0, 0, 0],
				fontStyle: 'bold',
				fontSize: 6,
				halign: 'center',
				valign: 'middle'
			},
			bodyStyles: {
				fontSize: 5.5,
				halign: 'center'
			},
			columnStyles: {
				0: { cellWidth: 22, halign: 'left' },
				1: { cellWidth: 35, halign: 'left' },
			},
			margin: { left: margin, right: margin },
			didDrawPage: () => {
				addFooter(pageNumber)
			}
		})

		startY = (doc as any).lastAutoTable.finalY + 5
	})

	// =========================================
	// PAGE: COURSE-WISE ANALYSIS
	// =========================================
	doc.addPage()
	pageNumber++
	startY = addHeader('COURSE-WISE ANALYSIS')

	// Course analysis table matching the attached format
	const courseAnalysisHeaders = [
		'TITLE OF THE COURSE',
		'INT MAX MARKS',
		'EXT MAX MARKS',
		'TOTAL MARKS',
		'NO. OF STUDENTS REGISTERED',
		'NO. OF STUDENTS APPEARED',
		'NO. OF STUDENTS ABSENT',
		'NO. OF STUDENTS PASSED',
		'NO. OF STUDENTS RE-APPEAR',
		'PASS %'
	]

	const courseAnalysisData = data.courseAnalysis.map(ca => [
		ca.course.course_name,
		ca.course.internal_max_mark || '-',
		ca.course.external_max_mark || '-',
		ca.course.total_max_mark,
		ca.registered,
		ca.appeared,
		ca.absent,
		ca.passed,
		ca.reappear,
		`${ca.pass_percentage}%`
	])

	autoTable(doc, {
		startY: startY,
		head: [courseAnalysisHeaders],
		body: courseAnalysisData,
		theme: 'grid',
		styles: {
			font: 'times',
			fontSize: 8,
			cellPadding: 2,
			lineColor: [0, 0, 0],
			lineWidth: 0.2,
			textColor: [0, 0, 0]
		},
		headStyles: {
			fillColor: [220, 220, 220],
			textColor: [0, 0, 0],
			fontStyle: 'bold',
			fontSize: 7,
			halign: 'center'
		},
		bodyStyles: {
			halign: 'center'
		},
		columnStyles: {
			0: { cellWidth: 80, halign: 'left' }
		},
		margin: { left: margin, right: margin },
		didDrawPage: () => {
			addFooter(pageNumber)
		}
	})

	startY = (doc as any).lastAutoTable.finalY + 10

	// Legend
	doc.setFont('times', 'normal')
	doc.setFontSize(8)
	doc.text('INTERNAL: TOT - TOTAL; RES - RESULT; P - PASS; RA - REAPPEAR; NA - NOT APPLICABLE; AAA - ABSENT; # - NO MARKS; LG - LETTER GRADE; GP - GRADE POINTS', margin, startY)

	// =========================================
	// PAGE: STATISTICS SUMMARY
	// =========================================
	doc.addPage()
	pageNumber++
	startY = addHeader('OVERALL STATISTICS SUMMARY')

	// Statistics summary box
	const statsData = [
		['Total Students Registered', data.statistics.total_students.toString()],
		['Total Students Passed', data.statistics.total_passed.toString()],
		['Total Students Failed', data.statistics.total_failed.toString()],
		['Students with Backlogs', data.statistics.total_with_backlogs.toString()],
		['Overall Pass Percentage', `${data.statistics.pass_percentage}%`]
	]

	autoTable(doc, {
		startY: startY,
		head: [['Summary Statistics', '']],
		body: statsData,
		theme: 'grid',
		styles: {
			font: 'times',
			fontSize: 11,
			textColor: [0, 0, 0],
			lineColor: [0, 0, 0],
			lineWidth: 0.3
		},
		headStyles: {
			fillColor: [220, 220, 220],
			fontStyle: 'bold',
			fontSize: 12,
			halign: 'center'
		},
		columnStyles: {
			0: { fontStyle: 'bold', cellWidth: 80 },
			1: { halign: 'right', cellWidth: 50 }
		},
		margin: { left: margin, right: margin }
	})

	startY = (doc as any).lastAutoTable.finalY + 10

	// Grade Distribution Table
	doc.setFont('times', 'bold')
	doc.setFontSize(11)
	doc.text('GRADE DISTRIBUTION', margin, startY)
	startY += 5

	const gradeOrder = ['O', 'A+', 'A', 'B+', 'B', 'C', 'D', 'F', 'RA', 'AB']
	const sortedGrades = Object.entries(data.statistics.grade_distribution)
		.sort((a, b) => gradeOrder.indexOf(a[0]) - gradeOrder.indexOf(b[0]))

	if (sortedGrades.length > 0) {
		autoTable(doc, {
			startY: startY,
			head: [['Grade', 'Count', 'Percentage']],
			body: sortedGrades.map(([grade, count]) => {
				const totalGrades = Object.values(data.statistics.grade_distribution).reduce((a, b) => a + b, 0)
				const percentage = ((count / totalGrades) * 100).toFixed(2)
				return [grade, count, `${percentage}%`]
			}),
			theme: 'grid',
			styles: {
				font: 'times',
				fontSize: 10,
				textColor: [0, 0, 0],
				lineColor: [0, 0, 0],
				lineWidth: 0.2
			},
			headStyles: {
				fillColor: [200, 200, 200],
				fontStyle: 'bold',
				halign: 'center'
			},
			bodyStyles: {
				halign: 'center'
			},
			columnStyles: {
				0: { cellWidth: 40 },
				1: { cellWidth: 40 },
				2: { cellWidth: 40 }
			},
			margin: { left: margin, right: margin }
		})

		startY = (doc as any).lastAutoTable.finalY + 10
	}

	// Top Performers
	if (data.statistics.top_performers && data.statistics.top_performers.length > 0) {
		doc.setFont('times', 'bold')
		doc.setFontSize(11)
		doc.text('TOP PERFORMERS', margin, startY)
		startY += 5

		autoTable(doc, {
			startY: startY,
			head: [['Rank', 'Register Number', 'Name', 'SGPA', 'CGPA']],
			body: data.statistics.top_performers.slice(0, 10).map((student, index) => [
				index + 1,
				student.register_number,
				student.name,
				student.sgpa?.toFixed(2) || '-',
				student.cgpa?.toFixed(2) || '-'
			]),
			theme: 'grid',
			styles: {
				font: 'times',
				fontSize: 10,
				textColor: [0, 0, 0],
				lineColor: [0, 0, 0],
				lineWidth: 0.2
			},
			headStyles: {
				fillColor: [255, 215, 0],
				fontStyle: 'bold',
				halign: 'center'
			},
			bodyStyles: {
				halign: 'center'
			},
			margin: { left: margin, right: margin }
		})

		startY = (doc as any).lastAutoTable.finalY + 10
	}

	// Highest Scorer
	if (data.statistics.highest_scorer) {
		doc.setFont('times', 'bold')
		doc.setFontSize(11)
		doc.text('HIGHEST TOTAL MARKS', margin, startY)
		startY += 5

		autoTable(doc, {
			startY: startY,
			body: [
				['Register Number', data.statistics.highest_scorer.register_number],
				['Name', data.statistics.highest_scorer.name],
				['Total Marks', `${data.statistics.highest_scorer.total_marks} / ${data.statistics.highest_scorer.total_max}`]
			],
			theme: 'grid',
			styles: {
				font: 'times',
				fontSize: 10,
				textColor: [0, 0, 0],
				lineColor: [0, 0, 0],
				lineWidth: 0.2
			},
			columnStyles: {
				0: { fontStyle: 'bold', cellWidth: 60, fillColor: [245, 245, 245] },
				1: { cellWidth: 80 }
			},
			margin: { left: margin, right: margin }
		})

		startY = (doc as any).lastAutoTable.finalY + 10
	}

	// Add final footer
	addFooter(pageNumber)

	// Signature section
	startY = pageHeight - 35
	doc.setFont('times', 'bold')
	doc.setFontSize(10)
	doc.text('UNIVERSITY NOMINEE', margin + 50, startY)
	doc.text('CHAIRPERSON/PRINCIPAL', pageWidth - margin - 50, startY, { align: 'right' })

	doc.setFont('times', 'normal')
	doc.setFontSize(9)
	doc.line(margin + 20, startY - 5, margin + 90, startY - 5)
	doc.line(pageWidth - margin - 90, startY - 5, pageWidth - margin - 10, startY - 5)

	// Save PDF
	const programCode = data.program?.program_code || 'PROGRAM'
	const semester = data.semester || ''
	const sessionCode = data.session?.session_code?.replace(/\s+/g, '_') || ''
	const fileName = `Galley_Report_${programCode}_Sem${semester}_${sessionCode}_${new Date().toISOString().split('T')[0]}.pdf`
	doc.save(fileName)

	return fileName
}
