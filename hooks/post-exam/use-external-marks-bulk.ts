'use client'

/**
 * Custom Hook for External Marks Bulk Upload
 * Manages state, data fetching, filtering, sorting, and pagination
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import type {
	ExternalMark,
	Institution,
	ExamSession,
	Program,
	Course,
	ImportPreviewRow,
	UploadSummary,
	UploadError
} from '@/types/external-marks'
import {
	fetchInstitutions as fetchInstitutionsApi,
	fetchSessions as fetchSessionsApi,
	fetchPrograms as fetchProgramsApi,
	fetchCourses as fetchCoursesApi,
	fetchExternalMarks,
	bulkUploadMarks,
	bulkDeleteMarks
} from '@/services/post-exam/external-marks-bulk-service'

interface UseExternalMarksBulkReturn {
	// Data
	items: ExternalMark[]
	institutions: Institution[]
	sessions: ExamSession[]
	programs: Program[]
	courses: Course[]

	// Loading & Error States
	loading: boolean
	fetchError: string | null

	// Filters
	selectedInstitution: string
	selectedSession: string
	selectedProgram: string
	selectedCourse: string
	statusFilter: string
	searchTerm: string

	// Filter Setters
	setSelectedInstitution: (id: string) => void
	setSelectedSession: (id: string) => void
	setSelectedProgram: (id: string) => void
	setSelectedCourse: (id: string) => void
	setStatusFilter: (status: string) => void
	setSearchTerm: (term: string) => void

	// Sorting
	sortColumn: string | null
	sortDirection: 'asc' | 'desc'
	handleSort: (column: string) => void

	// Pagination
	currentPage: number
	itemsPerPage: number
	totalPages: number
	setCurrentPage: (page: number) => void
	setItemsPerPage: (count: number) => void

	// Computed Data
	filtered: ExternalMark[]
	pageItems: ExternalMark[]
	startIndex: number
	endIndex: number

	// Selection
	selectedIds: Set<string>
	selectAll: boolean
	handleSelectAll: (checked: boolean) => void
	handleSelectItem: (id: string, checked: boolean) => void
	clearSelection: () => void

	// Import/Upload State
	importPreviewData: ImportPreviewRow[]
	setImportPreviewData: (data: ImportPreviewRow[]) => void
	uploadErrors: UploadError[]
	setUploadErrors: (errors: UploadError[]) => void
	uploadSummary: UploadSummary
	setUploadSummary: (summary: UploadSummary) => void

	// Actions
	refreshData: () => Promise<void>
	uploadMarks: (
		validRows: ImportPreviewRow[],
		userId: string | undefined
	) => Promise<{ success: boolean; result?: any; error?: string }>
	deleteSelected: () => Promise<{ success: boolean; result?: any; error?: string }>
}

export function useExternalMarksBulk(): UseExternalMarksBulkReturn {
	// Data State
	const [items, setItems] = useState<ExternalMark[]>([])
	const [institutions, setInstitutions] = useState<Institution[]>([])
	const [sessions, setSessions] = useState<ExamSession[]>([])
	const [programs, setPrograms] = useState<Program[]>([])
	const [courses, setCourses] = useState<Course[]>([])

	// Loading & Error States
	const [loading, setLoading] = useState(false)
	const [fetchError, setFetchError] = useState<string | null>(null)

	// Filter State
	const [selectedInstitution, setSelectedInstitution] = useState('')
	const [selectedSession, setSelectedSession] = useState('')
	const [selectedProgram, setSelectedProgram] = useState('')
	const [selectedCourse, setSelectedCourse] = useState('')
	const [statusFilter, setStatusFilter] = useState('all')
	const [searchTerm, setSearchTerm] = useState('')

	// Sort State
	const [sortColumn, setSortColumn] = useState<string | null>(null)
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

	// Pagination State
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState(10)

	// Selection State
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
	const [selectAll, setSelectAll] = useState(false)

	// Import/Upload State
	const [importPreviewData, setImportPreviewData] = useState<ImportPreviewRow[]>([])
	const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
	const [uploadSummary, setUploadSummary] = useState<UploadSummary>({
		total: 0,
		success: 0,
		failed: 0,
		skipped: 0
	})

	// Fetch institutions on mount
	useEffect(() => {
		const loadInstitutions = async () => {
			try {
				const data = await fetchInstitutionsApi()
				setInstitutions(data)
			} catch (error) {
				console.error('Failed to fetch institutions:', error)
			}
		}
		loadInstitutions()
	}, [])

	// Fetch dependent data when institution changes
	useEffect(() => {
		if (selectedInstitution) {
			const loadDependentData = async () => {
				try {
					const [sessionsData, programsData, coursesData] = await Promise.all([
						fetchSessionsApi(selectedInstitution),
						fetchProgramsApi(selectedInstitution),
						fetchCoursesApi(selectedInstitution)
					])
					setSessions(sessionsData)
					setPrograms(programsData)
					setCourses(coursesData)
				} catch (error) {
					console.error('Failed to fetch dependent data:', error)
				}
			}
			loadDependentData()
		} else {
			setSessions([])
			setPrograms([])
			setCourses([])
		}
		setSelectedSession('')
		setSelectedProgram('')
		setSelectedCourse('')
	}, [selectedInstitution])

	// Fetch marks when filters change
	const fetchMarks = useCallback(async () => {
		if (!selectedInstitution) return

		try {
			setLoading(true)
			setFetchError(null)
			const data = await fetchExternalMarks({
				institutionId: selectedInstitution,
				sessionId: selectedSession || undefined,
				programId: selectedProgram || undefined,
				courseId: selectedCourse || undefined
			})
			setItems(data)
			setFetchError(null)
		} catch (error) {
			console.error('Failed to fetch marks:', error)
			const errorMsg = error instanceof Error
				? error.message
				: 'Unable to connect to the server. Please check your connection and try again.'
			setFetchError(errorMsg)
			setItems([])
		} finally {
			setLoading(false)
		}
	}, [selectedInstitution, selectedSession, selectedProgram, selectedCourse])

	useEffect(() => {
		if (selectedInstitution) {
			fetchMarks()
		}
	}, [selectedInstitution, selectedSession, selectedProgram, selectedCourse, fetchMarks])

	// Sorting
	const handleSort = useCallback((column: string) => {
		if (sortColumn === column) {
			setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
		} else {
			setSortColumn(column)
			setSortDirection('asc')
		}
	}, [sortColumn])

	// Filtering and Sorting
	const filtered = useMemo(() => {
		const q = searchTerm.toLowerCase()
		let data = items.filter((i) =>
			[i.dummy_number, i.student_name, i.course_code, i.course_name]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		)

		if (statusFilter !== 'all') {
			data = data.filter((i) => i.entry_status?.toLowerCase() === statusFilter.toLowerCase())
		}

		if (!sortColumn) return data

		return [...data].sort((a, b) => {
			const av = (a as any)[sortColumn]
			const bv = (b as any)[sortColumn]
			if (av === bv) return 0
			if (sortDirection === 'asc') return av > bv ? 1 : -1
			return av < bv ? 1 : -1
		})
	}, [items, searchTerm, sortColumn, sortDirection, statusFilter])

	// Pagination
	const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const pageItems = filtered.slice(startIndex, endIndex)

	// Reset page on filter/sort changes
	useEffect(() => {
		setCurrentPage(1)
	}, [searchTerm, sortColumn, sortDirection, statusFilter, itemsPerPage])

	// Selection handlers
	const handleSelectAll = useCallback((checked: boolean) => {
		setSelectAll(checked)
		if (checked) {
			setSelectedIds(new Set(pageItems.map(item => item.id)))
		} else {
			setSelectedIds(new Set())
		}
	}, [pageItems])

	const handleSelectItem = useCallback((id: string, checked: boolean) => {
		setSelectedIds(prev => {
			const newSelected = new Set(prev)
			if (checked) {
				newSelected.add(id)
			} else {
				newSelected.delete(id)
			}
			setSelectAll(newSelected.size === pageItems.length)
			return newSelected
		})
	}, [pageItems.length])

	const clearSelection = useCallback(() => {
		setSelectedIds(new Set())
		setSelectAll(false)
	}, [])

	// Upload marks
	const uploadMarks = useCallback(async (
		validRows: ImportPreviewRow[],
		userId: string | undefined
	) => {
		if (!selectedInstitution) {
			return { success: false, error: 'Please select an institution before uploading marks.' }
		}

		if (validRows.length === 0) {
			return { success: false, error: 'No valid rows to upload.' }
		}

		setLoading(true)

		try {
			const marksData = validRows.map(row => ({
				dummy_number: row.dummy_number,
				course_code: row.course_code,
				session_code: row.session_code,
				program_code: row.program_code,
				total_marks_obtained: row.total_marks_obtained,
				marks_out_of: row.marks_out_of,
				remarks: row.remarks
			}))

			const result = await bulkUploadMarks({
				action: 'bulk-upload',
				institutions_id: selectedInstitution,
				examination_session_id: selectedSession || null,
				program_id: selectedProgram || null,
				course_id: selectedCourse || null,
				marks_data: marksData,
				file_name: 'bulk_upload.xlsx',
				file_type: 'XLSX',
				uploaded_by: userId
			})

			// Update summary
			setUploadSummary({
				total: result.total,
				success: result.successful,
				failed: result.failed,
				skipped: result.skipped
			})

			// Collect errors
			const allErrors = [
				...(result.errors || []),
				...(result.validation_errors || [])
			]

			if (allErrors.length > 0) {
				setUploadErrors(allErrors)
			}

			// Refresh data
			await fetchMarks()
			setImportPreviewData([])

			return { success: true, result }
		} catch (error) {
			console.error('Upload error:', error)
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to upload marks'
			}
		} finally {
			setLoading(false)
		}
	}, [selectedInstitution, selectedSession, selectedProgram, selectedCourse, fetchMarks])

	// Delete selected marks
	const deleteSelected = useCallback(async () => {
		if (selectedIds.size === 0) {
			return { success: false, error: 'No items selected' }
		}

		const totalSelected = selectedIds.size
		setLoading(true)

		try {
			const result = await bulkDeleteMarks(Array.from(selectedIds))

			const deleted = result.deleted || 0
			const skipped = result.skipped || 0

			// Update summary for error dialog
			setUploadSummary({
				total: totalSelected,
				success: deleted,
				failed: 0,
				skipped: skipped
			})

			// Format errors for error dialog if any were skipped
			if (result.non_deletable && result.non_deletable.length > 0) {
				const deleteErrors = result.non_deletable.map((e, index) => ({
					row: index + 1,
					dummy_number: e.dummy_number,
					course_code: '-',
					errors: [e.reason]
				}))
				setUploadErrors(deleteErrors)
			}

			clearSelection()
			await fetchMarks()

			return { success: true, result: { deleted, skipped, non_deletable: result.non_deletable } }
		} catch (error) {
			console.error('Delete error:', error)
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to delete records'
			}
		} finally {
			setLoading(false)
		}
	}, [selectedIds, clearSelection, fetchMarks])

	return {
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
		clearSelection,

		// Import/Upload State
		importPreviewData,
		setImportPreviewData,
		uploadErrors,
		setUploadErrors,
		uploadSummary,
		setUploadSummary,

		// Actions
		refreshData: fetchMarks,
		uploadMarks,
		deleteSelected
	}
}
