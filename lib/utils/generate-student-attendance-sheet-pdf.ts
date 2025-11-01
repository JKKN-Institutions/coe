import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface StudentRecord {
	register_number: string
	student_name: string
	attendance_status: 'PRESENT' | 'ABSENT'
	program_code: string
	program_name: string
	semester: string
}

interface SheetMetadata {
	exam_date: string
	session: string
	course_code: string
	course_title: string
	program_code: string
	program_name: string
	program_order?: number
	semester: string
	regulation_code: string
	institution_name: string
	institution_code: string
	session_name: string
}

interface AttendanceSheet {
	metadata: SheetMetadata
	students: StudentRecord[]
}

interface StudentAttendanceSheetData {
	sheets: AttendanceSheet[]
	logoImage?: string
	rightLogoImage?: string
}

export function generateStudentAttendanceSheetPDF(data: StudentAttendanceSheetData): string {
	// Create a single PDF document for all sheets
	const doc = new jsPDF('portrait', 'mm', 'a4')
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 12.7 // 0.5 inch in mm
	const contentWidth = pageWidth - (2 * margin)

	// Process each sheet (grouped by exam_date, session, course)
	data.sheets.forEach((sheet, sheetIndex) => {
		// Add new page for each sheet (except the first one)
		if (sheetIndex > 0) {
			doc.addPage()
		}

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

			// College Logo (right side - JKKN text logo)
			if (data.rightLogoImage) {
				try {
					const logoSize = 20
					doc.addImage(data.rightLogoImage, 'PNG', pageWidth - margin - logoSize, currentY, logoSize, logoSize)
				} catch (e) {
					console.warn('Failed to add right logo to PDF:', e)
				}
			}

			// College name and details (centered between logos)
			doc.setFont('times', 'bold')
			doc.setFontSize(12)
			doc.setTextColor(0, 0, 0)
			doc.text('J.K.K.NATARAJA COLLEGE OF ARTS & SCIENCE (AUTONOMOUS)', pageWidth / 2, currentY + 5, { align: 'center' })

			doc.setFont('times', 'normal')
			doc.setFontSize(8)
			doc.text('(Accredited by NAAC, Approved by AICTE, Recognized by', pageWidth / 2, currentY + 10, { align: 'center' })
			doc.text('UGC Under Section 2(f) & 12(B), Affiliated to Periyar University)', pageWidth / 2, currentY + 14, { align: 'center' })

			doc.setFont('times', 'bold')
			doc.setFontSize(9)
			doc.text('Komarapalayam- 638 183, Namakkal District, Tamil Nadu', pageWidth / 2, currentY + 19, { align: 'center' })

			// Report Title
			doc.setFont('times', 'bold')
			doc.setFontSize(11)
			doc.text('Student Attendance Sheet', pageWidth / 2, currentY + 25, { align: 'center' })

			currentY += 37

			// Program/Subject/Date information section
			doc.setFont('times', 'bold')
			doc.setFontSize(9)

			const infoY = currentY
			const col1X = margin + 2
			const col2X = pageWidth * 0.65

			// Left side
			doc.text('Program code & Name', col1X, infoY)
			doc.setFont('times', 'normal')
			doc.text(`: ${sheet.metadata.program_code} - ${sheet.metadata.program_name}`, col1X + 45, infoY)

			// Right side
			doc.setFont('times', 'bold')
			doc.text('Examination', col2X, infoY)
			doc.setFont('times', 'normal')
			doc.text(`: ${sheet.metadata.session_name}`, col2X + 25, infoY)

			currentY += 5

			// Subject (with text wrapping for long course titles)
			doc.setFont('times', 'bold')
			doc.text('Subject Code & Name', col1X, currentY)
			doc.setFont('times', 'normal')

			// Calculate available width for subject text (from label end to column 2 start with some padding)
			const subjectTextMaxWidth = col2X - (col1X + 45) - 5
			const subjectText = `: ${sheet.metadata.course_code} - ${sheet.metadata.course_title}`
			const subjectLines = doc.splitTextToSize(subjectText, subjectTextMaxWidth)
			doc.text(subjectLines, col1X + 45, currentY)

			// Total Students (aligned to the first line of subject)
			doc.setFont('times', 'bold')
			doc.text('Total Students :', col2X, currentY)
			doc.setFont('times', 'normal')
			doc.text(totalStudents.toString(), col2X + 30, currentY)

			// Adjust currentY based on subject text height (if it wrapped to multiple lines)
			if (subjectLines.length > 1) {
				currentY += (subjectLines.length - 1) * 4 // Add extra space for wrapped lines
			}

			currentY += 5

			// Date & Session
			doc.setFont('times', 'bold')
			doc.text('Date & Session', col1X, currentY)
			doc.setFont('times', 'normal')
			doc.text(`: ${sheet.metadata.exam_date} & ${sheet.metadata.session}`, col1X + 45, currentY)

			// Present/Absent counts
			doc.setFont('times', 'bold')
			doc.text('Present :', col2X, currentY)
			doc.setFont('times', 'normal')
			doc.text(presentCount.toString(), col2X + 17, currentY)

			doc.setFont('times', 'bold')
			doc.text('Absent :', col2X + 25, currentY)
			doc.setFont('times', 'normal')
			doc.text(absentCount.toString(), col2X + 38, currentY)

			currentY += 3

			// Horizontal line
			doc.setLineWidth(0.5)
			doc.setDrawColor(0, 0, 0)
			doc.line(margin, currentY, pageWidth - margin, currentY)

			return currentY + 5
		}

		// Summary Statistics (calculate before header to use in header)
		const totalStudents = sheet.students.length
		const presentCount = sheet.students.filter(s => s.attendance_status === 'PRESENT').length
		const absentCount = sheet.students.filter(s => s.attendance_status === 'ABSENT').length
		const attendancePercentage = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(2) : '0.00'

		// Add initial header
		let startY = addHeader()

		// Student attendance table
		const tableData = sheet.students.map((student, index) => {
			return [
				(index + 1).toString(),
				student.register_number,
				student.student_name,
				student.attendance_status
			]
		})

		autoTable(doc, {
			startY: startY,
			head: [
				[
					'S.No',
					'Register Number',
					'Student Name',
					'Attendance Status'
				]
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
				cellPadding: 2
			},
			headStyles: {
				font: 'times',
				fontStyle: 'bold',
				fontSize: 10,
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
				0: { halign: 'center', cellWidth: 15 }, // S.No
				1: { halign: 'center', cellWidth: 35 }, // Register Number
				2: { halign: 'left', cellWidth: 80 }, // Student Name
				3: { halign: 'center', cellWidth: 35 } // Attendance Status
			},
			margin: { left: margin, right: margin },
			didParseCell: (data) => {
				// Highlight PRESENT in green, ABSENT in red
				if (data.column.index === 3 && data.section === 'body') {
					if (data.cell.text[0] === 'PRESENT') {
						data.cell.styles.textColor = [0, 128, 0] // Green
						data.cell.styles.fontStyle = 'bold'
					} else if (data.cell.text[0] === 'ABSENT') {
						data.cell.styles.textColor = [255, 0, 0] // Red
						data.cell.styles.fontStyle = 'bold'
					}
				}
			},
			didDrawPage: (data) => {
				// Add footer with page number and timestamp
				const pageCount = (doc as any).internal.getNumberOfPages()
				const currentPageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber

				// Page number (centered)
				doc.setFont('times', 'normal')
				doc.setFontSize(9)
				doc.setTextColor(0, 0, 0)
				const footerText = `Page ${currentPageNumber} of ${pageCount}`
				doc.text(footerText, pageWidth / 2, pageHeight - margin + 5, { align: 'center' })

				// Date & time (right-aligned)
				doc.setFont('times', 'italic')
				doc.setFontSize(8)
				doc.setTextColor(80, 80, 80)
				const timestamp = new Date().toLocaleString('en-GB', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit'
				})
				doc.text(`Generated on: ${timestamp}`, pageWidth - margin, pageHeight - margin + 5, { align: 'right' })
			}
		})
	})

	// Save the combined PDF with a single filename
	const fileName = `Student_Attendance_Sheets_${data.sheets[0]?.metadata.session_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
	doc.save(fileName)

	return fileName
}
