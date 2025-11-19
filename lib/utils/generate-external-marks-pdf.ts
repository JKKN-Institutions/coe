import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface StudentMark {
	dummy_number: string
	total_marks_obtained: number | null
	total_marks_in_words: string
	remarks: string
}

interface ExternalMarksPDFData {
	subject_code: string
	subject_name: string
	packet_no: string
	total_sheets: number
	maximum_marks: number
	minimum_pass_marks: number
	exam_date: string
	students: StudentMark[]
	logoImage?: string
	rightLogoImage?: string
}

/**
 * Generates External Marks Entry Sheet PDF
 * Single page PDF with signature fields
 */
export function generateExternalMarksPDF(data: ExternalMarksPDFData): string {
	const doc = new jsPDF()
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 12.7 // 0.5 inch in mm
	let currentY = margin

	// ========== HEADER SECTION ==========

	// College Logos
	if (data.logoImage) {
		try {
			const logoSize = 20
			doc.addImage(data.logoImage, 'PNG', margin, currentY, logoSize, logoSize)
		} catch (e) {
			console.warn('Failed to add logo to PDF:', e)
		}
	}

	if (data.rightLogoImage) {
		try {
			const logoSize = 20
			doc.addImage(data.rightLogoImage, 'PNG', pageWidth - margin - logoSize, currentY, logoSize, logoSize)
		} catch (e) {
			console.warn('Failed to add right logo to PDF:', e)
		}
	}

	// College name and details (centered)
	doc.setFont('times', 'bold')
	doc.setFontSize(14)
	doc.setTextColor(0, 0, 0)
	doc.text('J.K.K.NATARAJA COLLEGE OF ARTS & SCIENCE (AUTONOMOUS)', pageWidth / 2, currentY + 5, { align: 'center' })

	doc.setFont('times', 'normal')
	doc.setFontSize(9)
	doc.text('(Accredited by NAAC, Approved by AICTE, Recognized by', pageWidth / 2, currentY + 11, { align: 'center' })
	doc.text('UGC Under Section 2(f) & 12(B), Affiliated to Periyar University)', pageWidth / 2, currentY + 16, { align: 'center' })

	doc.setFont('times', 'bold')
	doc.setFontSize(10)
	doc.text('Komarapalayam- 638 183, Namakkal District, Tamil Nadu', pageWidth / 2, currentY + 22, { align: 'center' })

	currentY += 30

	// Report Title
	doc.setFont('times', 'bold')
	doc.setFontSize(12)
	doc.setTextColor(0, 0, 0)
	doc.text('External Marks Entry Sheet', pageWidth / 2, currentY, { align: 'center' })

	currentY += 8

	// ========== COURSE DETAILS SECTION ==========

	doc.setFont('times', 'bold')
	doc.setFontSize(9)

	const leftColX = margin + 5
	const labelWidth = 50

	// Subject Code & Name
	doc.text('Subject Code & Name', leftColX, currentY)
	doc.setFont('times', 'normal')

	const subjectTextMaxWidth = pageWidth - leftColX - labelWidth - margin - 10
	const subjectText = `: ${data.subject_code} - ${data.subject_name}`
	const subjectLines = doc.splitTextToSize(subjectText, subjectTextMaxWidth)
	doc.text(subjectLines, leftColX + labelWidth, currentY)

	if (subjectLines.length > 1) {
		currentY += (subjectLines.length - 1) * 5
	}

	currentY += 6

	// Packet Details Row
	doc.setFont('times', 'bold')
	doc.setFontSize(9)
	const packetDetailsText = `Packet No: ${data.packet_no} | Total Sheets: ${data.total_sheets} | Maximum Marks: ${data.maximum_marks} | Date: ${data.exam_date}`
	doc.text(packetDetailsText, leftColX, currentY)

	currentY += 8

	// ========== MARKS TABLE SECTION ==========

	// Prepare table data
	const tableData = data.students.map((student, index) => [
		index + 1,
		student.dummy_number,
		student.total_marks_obtained ?? '-',
		student.total_marks_in_words || '-',
		student.remarks || '-'
	])

	// Calculate available height for table (leave space for signatures)
	const signatureSpace = 35

	autoTable(doc, {
		startY: currentY,
		head: [['S.No', 'Dummy No', 'Marks Awarded', 'Mark in Words', 'Remarks']],
		body: tableData,
		theme: 'grid',
		styles: {
			fontSize: 8,
			font: 'times',
			cellPadding: 1.5,
			textColor: [0, 0, 0],
			lineColor: [0, 0, 0],
			lineWidth: 0.5,
			halign: 'center',
			valign: 'middle'
		},
		headStyles: {
			fillColor: [255, 255, 255],
			textColor: [0, 0, 0],
			fontStyle: 'bold',
			lineWidth: 0.5,
			lineColor: [0, 0, 0]
		},
		bodyStyles: {
			lineWidth: 0.5,
			lineColor: [0, 0, 0]
		},
		columnStyles: {
			0: { cellWidth: 15, halign: 'center' },  // S.No
			1: { cellWidth: 30, halign: 'center' },  // Dummy No
			2: { cellWidth: 25, halign: 'center' },  // Marks Awarded
			3: { cellWidth: 'auto', halign: 'left' },  // Mark in Words
			4: { cellWidth: 30, halign: 'center' }   // Remarks
		},
		margin: { left: margin, right: margin },
		tableWidth: 'auto',
		didDrawPage: function(hookData: any) {
			// Only add signatures on the last page (which should be the only page)
			if (hookData.pageNumber === doc.getNumberOfPages()) {
				const finalY = hookData.cursor.y

				// Signature section
				const signatureY = pageHeight - 25

				// Draw signature boxes
				doc.setFont('times', 'normal')
				doc.setFontSize(9)

				// Calculate box widths
				const boxWidth = (pageWidth - (margin * 2) - 10) / 3

				// Left signature box - Internal/External Examiner
				const leftBoxX = margin
				doc.setLineWidth(0.5)
				doc.setDrawColor(0, 0, 0)
				doc.rect(leftBoxX, signatureY - 8, boxWidth, 15)
				doc.text('Name & Signature of', leftBoxX + boxWidth / 2, signatureY, { align: 'center' })
				doc.text('Internal/External Examiner', leftBoxX + boxWidth / 2, signatureY + 4, { align: 'center' })

				// Middle signature box - Chief/Chairman
				const middleBoxX = leftBoxX + boxWidth + 5
				doc.rect(middleBoxX, signatureY - 8, boxWidth, 15)
				doc.text('Name & Signature of', middleBoxX + boxWidth / 2, signatureY, { align: 'center' })
				doc.text('Chief/Chairman', middleBoxX + boxWidth / 2, signatureY + 4, { align: 'center' })

				// Right signature box - COE
				const rightBoxX = middleBoxX + boxWidth + 5
				doc.rect(rightBoxX, signatureY - 8, boxWidth, 15)
				doc.text('Signature of COE', rightBoxX + boxWidth / 2, signatureY + 2, { align: 'center' })
			}
		}
	})

	// Save PDF with format: CourseCode_PacketNo_TotalSheets_Date_mark.pdf
	// Example: 24UGTA01_1_23_2025-11-19_mark.pdf
	const fileName = `${data.subject_code}_${data.packet_no}_${data.total_sheets}_${new Date().toISOString().split('T')[0]}_mark.pdf`
	doc.save(fileName)

	return fileName
}
