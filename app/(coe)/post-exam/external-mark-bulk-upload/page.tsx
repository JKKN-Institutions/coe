"use client"

/**
 * External Marks Bulk Upload Page
 *
 * Refactored to follow 5-layer architecture:
 * - Types: types/external-marks.ts
 * - Services: services/post-exam/external-marks-bulk-service.ts
 * - Hooks: hooks/post-exam/use-external-marks-bulk.ts
 * - Components: components/post-exam/
 * - Page: This file (composition only)
 */

import XLSX from "@/lib/utils/excel-compat"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AppFooter } from "@/components/layout/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useToast } from "@/hooks/common/use-toast"
import { useAuth } from "@/lib/auth/auth-context-parent"
import Link from "next/link"
import { Upload } from "lucide-react"
import { useState } from "react"

// Custom Hook
import { useExternalMarksBulk } from "@/hooks/post-exam/use-external-marks-bulk"

// Types
import type { ImportPreviewRow, LookupMode } from "@/types/external-marks"

// Components
import {
	ExternalMarksFilters,
	ExternalMarksTable,
	ExternalMarksScorecards,
	ImportPreviewDialog,
	UploadErrorDialog,
	DeleteConfirmationDialog
} from "@/components/post-exam"

export default function ExternalMarkBulkUploadPage() {
	const { toast } = useToast()
	const { user } = useAuth()

	// Dialog States
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
	const [errorDialogOpen, setErrorDialogOpen] = useState(false)

	// Upload Mode: 'dummy_number' or 'register_number'
	const [lookupMode, setLookupMode] = useState<LookupMode>('dummy_number')

	// Use custom hook for all state management
	const {
		// Data
		items,
		institutions,
		sessions,
		programs,
		courses,

		// Loading & Error States
		loading,
		fetchError,

		// Filters
		selectedInstitution,
		selectedSession,
		selectedProgram,
		selectedCourse,
		statusFilter,
		searchTerm,

		// Filter Setters
		setSelectedInstitution,
		setSelectedSession,
		setSelectedProgram,
		setSelectedCourse,
		setStatusFilter,
		setSearchTerm,

		// Sorting
		sortColumn,
		sortDirection,
		handleSort,

		// Pagination
		currentPage,
		itemsPerPage,
		totalPages,
		setCurrentPage,
		setItemsPerPage,

		// Computed Data
		filtered,
		pageItems,
		startIndex,
		endIndex,

		// Selection
		selectedIds,
		selectAll,
		handleSelectAll,
		handleSelectItem,

		// Import/Upload State
		importPreviewData,
		setImportPreviewData,
		uploadErrors,
		uploadSummary,

		// Actions
		refreshData,
		uploadMarks,
		deleteSelected
	} = useExternalMarksBulk()

	// Download Template
	const handleDownloadTemplate = () => {
		const wb = XLSX.utils.book_new()

		// Template sheet - based on lookup mode
		let templateData: any[]
		let columnsReference: any[]
		let sheetName: string

		if (lookupMode === 'register_number') {
			// Register Number mode template
			templateData = [
				{
					'Register Number *': 'REG001',
					'Subject Code *': 'CS101',
					'Session Code *': 'APR2024',
					'Total Marks Obtained *': 75,
					'Marks Out Of *': 100,
					'Remarks': 'Good performance'
				},
				{
					'Register Number *': 'REG002',
					'Subject Code *': 'CS101',
					'Session Code *': 'APR2024',
					'Total Marks Obtained *': 82,
					'Marks Out Of *': 100,
					'Remarks': 'Excellent'
				}
			]

			columnsReference = [
				{ 'Column Name': 'Register Number *', 'Required': 'Yes', 'Description': 'Student register number (stu_register_no from exam registration)', 'Example': 'REG001' },
				{ 'Column Name': 'Subject Code *', 'Required': 'Yes', 'Description': 'Subject/Course code from courses table', 'Example': 'CS101' },
				{ 'Column Name': 'Session Code *', 'Required': 'Yes', 'Description': 'Examination session code', 'Example': 'APR2024' },
				{ 'Column Name': 'Total Marks Obtained *', 'Required': 'Yes', 'Description': 'External marks obtained', 'Example': '75' },
				{ 'Column Name': 'Marks Out Of *', 'Required': 'Yes', 'Description': 'Maximum marks for the course', 'Example': '100' },
				{ 'Column Name': 'Remarks', 'Required': 'No', 'Description': 'Any additional remarks', 'Example': 'Good performance' }
			]
			sheetName = 'Register Number Template'
		} else {
			// Dummy Number mode template (default)
			templateData = [
				{
					'Dummy Number *': 'D001',
					'Course Code *': 'CS101',
					'Session Code': 'APR2024',
					'Program Code': 'BCA',
					'Total Marks Obtained *': 75,
					'Marks Out Of *': 100,
					'Remarks': 'Good performance'
				},
				{
					'Dummy Number *': 'D002',
					'Course Code *': 'CS101',
					'Session Code': 'APR2024',
					'Program Code': 'BCA',
					'Total Marks Obtained *': 82,
					'Marks Out Of *': 100,
					'Remarks': 'Excellent'
				}
			]

			columnsReference = [
				{ 'Column Name': 'Dummy Number *', 'Required': 'Yes', 'Description': 'Student dummy number from exam registration', 'Example': 'D001' },
				{ 'Column Name': 'Course Code *', 'Required': 'Yes', 'Description': 'Course code from courses table', 'Example': 'CS101' },
				{ 'Column Name': 'Session Code', 'Required': 'No', 'Description': 'Examination session code', 'Example': 'APR2024' },
				{ 'Column Name': 'Program Code', 'Required': 'No', 'Description': 'Program code from programs table', 'Example': 'BCA' },
				{ 'Column Name': 'Total Marks Obtained *', 'Required': 'Yes', 'Description': 'External marks obtained', 'Example': '75' },
				{ 'Column Name': 'Marks Out Of *', 'Required': 'Yes', 'Description': 'Maximum marks for the course', 'Example': '100' },
				{ 'Column Name': 'Remarks', 'Required': 'No', 'Description': 'Any additional remarks', 'Example': 'Good performance' }
			]
			sheetName = 'Dummy Number Template'
		}

		const ws = XLSX.utils.json_to_sheet(templateData)

		// Set column widths based on mode
		if (lookupMode === 'register_number') {
			ws['!cols'] = [
				{ wch: 20 }, // Register Number
				{ wch: 15 }, // Subject Code
				{ wch: 15 }, // Session Code
				{ wch: 25 }, // Total Marks Obtained
				{ wch: 18 }, // Marks Out Of
				{ wch: 30 }  // Remarks
			]
		} else {
			ws['!cols'] = [
				{ wch: 20 }, // Dummy Number
				{ wch: 15 }, // Course Code
				{ wch: 15 }, // Session Code
				{ wch: 15 }, // Program Code
				{ wch: 25 }, // Total Marks Obtained
				{ wch: 18 }, // Marks Out Of
				{ wch: 30 }  // Remarks
			]
		}

		XLSX.utils.book_append_sheet(wb, ws, sheetName)

		// Column Reference sheet
		const wsColumns = XLSX.utils.json_to_sheet(columnsReference)
		wsColumns['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 50 }, { wch: 20 }]
		XLSX.utils.book_append_sheet(wb, wsColumns, 'Column Reference')

		// Add reference sheets
		if (sessions.length > 0) {
			const sessionsRef = sessions.map(s => ({
				'Session Code': s.session_code,
				'Session Name': s.session_name
			}))
			const wsSessions = XLSX.utils.json_to_sheet(sessionsRef)
			wsSessions['!cols'] = [{ wch: 15 }, { wch: 40 }]
			XLSX.utils.book_append_sheet(wb, wsSessions, 'Sessions Reference')
		}

		if (programs.length > 0) {
			const programsRef = programs.map(p => ({
				'Program Code': p.program_code,
				'Program Name': p.program_name
			}))
			const wsPrograms = XLSX.utils.json_to_sheet(programsRef)
			wsPrograms['!cols'] = [{ wch: 15 }, { wch: 40 }]
			XLSX.utils.book_append_sheet(wb, wsPrograms, 'Programs Reference')
		}

		if (courses.length > 0) {
			const coursesRef = courses.map(c => ({
				'Course Code': c.course_code,
				'Course Name': c.course_name,
				'Max External Marks': c.external_max_mark || 100
			}))
			const wsCourses = XLSX.utils.json_to_sheet(coursesRef)
			wsCourses['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 20 }]
			XLSX.utils.book_append_sheet(wb, wsCourses, 'Courses Reference')
		}

		if (institutions.length > 0) {
			const institutionsRef = institutions.map(i => ({
				'Institution Code': i.institution_code,
				'Institution Name': i.name
			}))
			const wsInst = XLSX.utils.json_to_sheet(institutionsRef)
			wsInst['!cols'] = [{ wch: 20 }, { wch: 40 }]
			XLSX.utils.book_append_sheet(wb, wsInst, 'Institutions Reference')
		}

		const modeLabel = lookupMode === 'register_number' ? 'register_number' : 'dummy_number'
		XLSX.writeFile(wb, `external_marks_template_${modeLabel}_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: "Template Downloaded",
			description: `External marks template (${lookupMode === 'register_number' ? 'Register Number' : 'Dummy Number'} mode) with reference sheets has been downloaded successfully.`,
			className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
		})
	}

	// Export Current Data
	const handleExportData = () => {
		if (!items || items.length === 0) {
			toast({
				title: "No Data to Export",
				description: "Please load some data before exporting.",
				variant: "destructive",
				className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
			})
			return
		}

		const exportData = items.map(item => ({
			'Dummy Number': item.dummy_number || 'N/A',
			'Student Name': item.student_name || '',
			'Course Code': item.course_code || '',
			'Course Name': item.course_name || '',
			'Program': item.program_name || '',
			'Session': item.session_name || '',
			'Total Marks Obtained': item.total_marks_obtained ?? '',
			'Marks Out Of': item.marks_out_of ?? 0,
			'Percentage': item.percentage ?? 0,
			'Attendance Status': item.attendance_status || 'Present',
			'Is Absent': item.is_absent ? 'Yes' : 'No',
			'Status': item.entry_status || 'Draft',
			'Remarks': item.remarks || ''
		}))

		const wb = XLSX.utils.book_new()
		const ws = XLSX.utils.json_to_sheet(exportData)

		// Set column widths
		ws['!cols'] = [
			{ wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 35 }, { wch: 25 },
			{ wch: 20 }, { wch: 22 }, { wch: 15 }, { wch: 12 }, { wch: 18 },
			{ wch: 12 }, { wch: 12 }, { wch: 30 }
		]

		XLSX.utils.book_append_sheet(wb, ws, 'External Marks Data')

		const fileName = `external_marks_export_${selectedInstitution ? institutions.find(i => i.id === selectedInstitution)?.institution_code || 'all' : 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`
		XLSX.writeFile(wb, fileName)

		toast({
			title: "Data Exported",
			description: `Successfully exported ${items.length} record${items.length > 1 ? 's' : ''} to Excel.`,
			className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
		})
	}

	// Import File
	const handleImportFile = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.xlsx,.xls,.csv'
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) return

			try {
				let rows: any[] = []

				if (file.name.endsWith('.csv')) {
					const text = await file.text()
					const lines = text.split('\n').filter(line => line.trim())
					if (lines.length < 2) {
						toast({
							title: "Invalid CSV File",
							description: "CSV file must have at least a header row and one data row",
							variant: "destructive",
						})
						return
					}

					const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
					rows = lines.slice(1).map(line => {
						const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
						const row: Record<string, string> = {}
						headers.forEach((header, index) => {
							row[header] = values[index] || ''
						})
						return row
					})
				} else {
					const data = new Uint8Array(await file.arrayBuffer())
					const wb = XLSX.read(data, { type: 'array' })
					if (!wb.SheetNames || wb.SheetNames.length === 0) {
						toast({
							title: "Invalid Excel File",
							description: "The Excel file has no sheets. Please check the file.",
							variant: "destructive",
						})
						return
					}
					const ws = wb.Sheets[wb.SheetNames[0]]
					if (!ws) {
						toast({
							title: "Invalid Excel File",
							description: "Could not read the first sheet. Please check the file.",
							variant: "destructive",
						})
						return
					}
					rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
				}

				// Parse and validate based on lookup mode
				const previewData: ImportPreviewRow[] = rows.map((row, index) => {
					const errors: string[] = []

					// Parse fields based on lookup mode
					let dummyNumber = ''
					let registerNumber = ''
					let subjectCode = ''
					let courseCode = ''
					let sessionCode = ''
					let programCode = ''

					if (lookupMode === 'register_number') {
						// Register Number mode - register_number + subject_code + session_code
						registerNumber = String(row['Register Number *'] || row['Register Number'] || row['register_number'] || '').trim()
						subjectCode = String(row['Subject Code *'] || row['Subject Code'] || row['subject_code'] || '').trim()
						sessionCode = String(row['Session Code *'] || row['Session Code'] || row['session_code'] || '').trim()
						courseCode = subjectCode // Subject code maps to course_code internally

						// Validate required fields for register_number mode
						if (!registerNumber) errors.push('Register Number is required')
						if (!subjectCode) errors.push('Subject Code is required')
						if (!sessionCode) errors.push('Session Code is required')
					} else {
						// Dummy Number mode (default)
						dummyNumber = String(row['Dummy Number *'] || row['Dummy Number'] || row['dummy_number'] || '').trim()
						courseCode = String(row['Course Code *'] || row['Course Code'] || row['course_code'] || '').trim()
						sessionCode = String(row['Session Code'] || row['session_code'] || '').trim()
						programCode = String(row['Program Code'] || row['program_code'] || '').trim()
						subjectCode = courseCode

						// Validate required fields for dummy_number mode
						if (!dummyNumber) errors.push('Dummy Number is required')
						if (!courseCode) errors.push('Course Code is required')
					}

					const totalMarksStr = String(row['Total Marks Obtained *'] || row['Total Marks Obtained'] || row['total_marks_obtained'] || '').trim()
					const totalMarks = parseFloat(totalMarksStr)

					const marksOutOfStr = String(row['Marks Out Of *'] || row['Marks Out Of'] || row['marks_out_of'] || '100').trim()
					const marksOutOf = parseFloat(marksOutOfStr)

					const remarks = String(row['Remarks'] || row['remarks'] || '').trim()

					// Validate marks - strict validation
					if (isNaN(totalMarks)) {
						errors.push('Total Marks Obtained must be a valid number')
					} else if (totalMarks < 0) {
						errors.push('Total Marks Obtained cannot be negative')
					} else if (totalMarks === 0) {
						errors.push('Total Marks Obtained cannot be 0 (zero marks not accepted)')
					}
					if (isNaN(marksOutOf) || marksOutOf <= 0) errors.push('Marks Out Of must be a positive number greater than 0')

					// Validate marks range
					if (!isNaN(totalMarks) && !isNaN(marksOutOf) && totalMarks > marksOutOf) {
						errors.push(`Total Marks (${totalMarks}) cannot exceed Marks Out Of (${marksOutOf})`)
					}

					return {
						row: index + 2,
						dummy_number: dummyNumber,
						register_number: registerNumber,
						subject_code: subjectCode,
						course_code: courseCode,
						session_code: sessionCode,
						program_code: programCode,
						total_marks_obtained: isNaN(totalMarks) ? 0 : totalMarks,
						marks_out_of: isNaN(marksOutOf) ? 100 : marksOutOf,
						remarks,
						errors,
						isValid: errors.length === 0,
						lookup_mode: lookupMode
					}
				})

				setImportPreviewData(previewData)
				setPreviewDialogOpen(true)

			} catch (error) {
				console.error('Import error:', error)
				toast({
					title: "Import Error",
					description: "Failed to parse the file. Please check the format.",
					variant: "destructive",
				})
			}
		}
		input.click()
	}

	// Upload Marks Handler
	const handleUploadMarks = async () => {
		if (!selectedInstitution) {
			toast({
				title: "Select Institution",
				description: "Please select an institution before uploading marks.",
				variant: "destructive",
			})
			return
		}

		const validRows = importPreviewData.filter(row => row.isValid)
		if (validRows.length === 0) {
			toast({
				title: "No Valid Data",
				description: "No valid rows to upload. Please fix the errors and try again.",
				variant: "destructive",
			})
			return
		}

		setPreviewDialogOpen(false)

		const result = await uploadMarks(validRows, user?.id, lookupMode)

		if (result.success && result.result) {
			const { successful, failed, batch_number } = result.result

			// Show error dialog if there are errors
			if (uploadErrors.length > 0) {
				setErrorDialogOpen(true)
			}

			// Show toast
			if (successful > 0 && failed === 0) {
				toast({
					title: "Upload Complete",
					description: `Successfully uploaded all ${successful} record(s). Batch #${batch_number}`,
					className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
					duration: 5000,
				})
			} else if (successful > 0 && failed > 0) {
				toast({
					title: "Partial Upload",
					description: `${successful} successful, ${failed} failed. Batch #${batch_number}`,
					className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
					duration: 6000,
				})
			} else {
				toast({
					title: "Upload Failed",
					description: `All ${failed} record(s) failed. Check errors for details.`,
					variant: "destructive",
					duration: 6000,
				})
			}
		} else {
			toast({
				title: "Upload Error",
				description: result.error || 'Failed to upload marks',
				variant: "destructive",
			})
		}
	}

	// Bulk Delete Handler
	const handleBulkDelete = async () => {
		const totalSelected = selectedIds.size

		const result = await deleteSelected()
		setDeleteDialogOpen(false)

		if (result.success && result.result) {
			const { deleted, skipped } = result.result

			// Show error dialog if any were skipped
			if (skipped > 0) {
				setErrorDialogOpen(true)

				toast({
					title: skipped === totalSelected ? "Cannot Delete Records" : "Partial Delete",
					description: `Total: ${totalSelected} | Deleted: ${deleted} | Skipped: ${skipped}`,
					className: skipped === totalSelected
						? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
						: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
					variant: skipped === totalSelected ? "destructive" : undefined,
					duration: 6000,
				})
			} else {
				toast({
					title: "Deleted Successfully",
					description: `Total: ${totalSelected} | Deleted: ${deleted} | Skipped: 0`,
					className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
				})
			}
		} else {
			toast({
				title: "Delete Failed",
				description: result.error || 'Failed to delete records',
				variant: "destructive",
				duration: 6000,
			})
		}
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex flex-col min-h-screen">
				<AppHeader />

				<div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
					{/* Breadcrumb */}
					<div className="flex items-center gap-2">
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbLink asChild>
										<Link href="/dashboard">Dashboard</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbLink asChild>
										<Link href="#">Post Exam</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage>External Marks Bulk Upload</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					{/* Scorecard Section */}
					<ExternalMarksScorecards
						items={items}
						selectedCount={selectedIds.size}
					/>

					{/* Main Card */}
					<Card className="flex-1 flex flex-col min-h-0">
						<CardHeader className="flex-shrink-0 p-3">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
										<Upload className="h-3 w-3 text-primary" />
									</div>
									<div>
										<h2 className="text-sm font-semibold">External Marks Bulk Upload</h2>
										<p className="text-[11px] text-muted-foreground">Import and manage external marks in bulk using dummy numbers or register numbers</p>
									</div>
								</div>
							</div>

							{/* Filters */}
							<ExternalMarksFilters
								institutions={institutions}
								sessions={sessions}
								programs={programs}
								courses={courses}
								selectedInstitution={selectedInstitution}
								selectedSession={selectedSession}
								selectedProgram={selectedProgram}
								selectedCourse={selectedCourse}
								statusFilter={statusFilter}
								searchTerm={searchTerm}
								lookupMode={lookupMode}
								onInstitutionChange={setSelectedInstitution}
								onSessionChange={setSelectedSession}
								onProgramChange={setSelectedProgram}
								onCourseChange={setSelectedCourse}
								onStatusChange={setStatusFilter}
								onSearchChange={setSearchTerm}
								onLookupModeChange={setLookupMode}
								onRefresh={refreshData}
								onDownloadTemplate={handleDownloadTemplate}
								onExportData={handleExportData}
								onImportFile={handleImportFile}
								onDeleteSelected={() => setDeleteDialogOpen(true)}
								loading={loading}
								itemsCount={items.length}
								selectedCount={selectedIds.size}
							/>
						</CardHeader>

						<CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">
							{/* Table */}
							<ExternalMarksTable
								pageItems={pageItems}
								filtered={filtered}
								loading={loading}
								fetchError={fetchError}
								selectedInstitution={selectedInstitution}
								selectedIds={selectedIds}
								selectAll={selectAll}
								onSelectAll={handleSelectAll}
								onSelectItem={handleSelectItem}
								sortColumn={sortColumn}
								sortDirection={sortDirection}
								onSort={handleSort}
								currentPage={currentPage}
								totalPages={totalPages}
								itemsPerPage={itemsPerPage}
								startIndex={startIndex}
								endIndex={endIndex}
								onPageChange={setCurrentPage}
								onItemsPerPageChange={setItemsPerPage}
								onRetry={refreshData}
							/>
						</CardContent>
					</Card>
				</div>

				<AppFooter />
			</SidebarInset>

			{/* Dialogs */}
			<DeleteConfirmationDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				selectedCount={selectedIds.size}
				onConfirm={handleBulkDelete}
			/>

			<ImportPreviewDialog
				open={previewDialogOpen}
				onOpenChange={setPreviewDialogOpen}
				previewData={importPreviewData}
				loading={loading}
				onUpload={handleUploadMarks}
				lookupMode={lookupMode}
			/>

			<UploadErrorDialog
				open={errorDialogOpen}
				onOpenChange={setErrorDialogOpen}
				uploadSummary={uploadSummary}
				uploadErrors={uploadErrors}
			/>
		</SidebarProvider>
	)
}
