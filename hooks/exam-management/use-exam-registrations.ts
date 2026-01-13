import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/hooks/common/use-toast'
import { useInstitutionFilter } from '@/hooks/use-institution-filter'
import type {
	ExamRegistration,
	ExamRegistrationFormData,
	InstitutionOption,
	StudentOption,
	ExaminationSessionOption,
	CourseOfferingOption
} from '@/types/exam-registrations'
import {
	createExamRegistration,
	updateExamRegistration,
	deleteExamRegistration,
	fetchInstitutions,
	fetchStudents,
	fetchLearners,
	fetchExaminationSessions,
	fetchCourseOfferings
} from '@/services/exam-management/exam-registrations-service'

export function useExamRegistrations(programId?: string) {
	const { toast } = useToast()

	// Institution filter integration
	const {
		filter,
		isReady,
		appendToUrl,
		getInstitutionIdForCreate,
		mustSelectInstitution,
		shouldFilter,
		institutionId
	} = useInstitutionFilter()

	const [examRegistrations, setExamRegistrations] = useState<ExamRegistration[]>([])
	const [loading, setLoading] = useState(true)

	// Dropdown data
	const [institutions, setInstitutions] = useState<InstitutionOption[]>([])
	const [allStudents, setAllStudents] = useState<StudentOption[]>([])
	const [allExaminationSessions, setAllExaminationSessions] = useState<ExaminationSessionOption[]>([])
	const [allCourseOfferings, setAllCourseOfferings] = useState<CourseOfferingOption[]>([])

	// MyJKKN learners (loaded dynamically by institution)
	const [myjkknLearners, setMyjkknLearners] = useState<StudentOption[]>([])
	const [learnersLoading, setLearnersLoading] = useState(false)

	// Filtered dropdowns based on selected institution (for form use)
	const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('')

	// Get institution_code for the selected institution
	const selectedInstitutionCode = useMemo(() => {
		if (!selectedInstitutionId) return undefined
		const inst = institutions.find(i => i.id === selectedInstitutionId)
		return inst?.institution_code
	}, [selectedInstitutionId, institutions])

	// Load learners from MyJKKN when institution changes
	const loadMyJKKNLearners = useCallback(async (institutionCode: string) => {
		if (!institutionCode) {
			setMyjkknLearners([])
			return
		}

		try {
			setLearnersLoading(true)
			console.log('[useExamRegistrations] Loading learners for institution:', institutionCode)
			const learners = await fetchLearners(institutionCode)
			console.log('[useExamRegistrations] Loaded', learners.length, 'learners from MyJKKN')
			setMyjkknLearners(learners)
		} catch (error) {
			console.error('[useExamRegistrations] Failed to load MyJKKN learners:', error)
			setMyjkknLearners([])
		} finally {
			setLearnersLoading(false)
		}
	}, [])

	// Load learners when institution changes
	useEffect(() => {
		if (selectedInstitutionCode) {
			loadMyJKKNLearners(selectedInstitutionCode)
		} else {
			setMyjkknLearners([])
		}
	}, [selectedInstitutionCode, loadMyJKKNLearners])

	// Use MyJKKN learners if available, fallback to local students
	const filteredStudents = useMemo(() => {
		if (!selectedInstitutionId) return []
		// Prefer MyJKKN learners if available
		if (myjkknLearners.length > 0) {
			return myjkknLearners
		}
		// Fallback to local students filtered by institution
		return allStudents.filter(s => s.institution_id === selectedInstitutionId)
	}, [myjkknLearners, allStudents, selectedInstitutionId])

	const filteredExaminationSessions = useMemo(() => {
		if (!selectedInstitutionId) return []
		return allExaminationSessions.filter(s => s.institutions_id === selectedInstitutionId)
	}, [allExaminationSessions, selectedInstitutionId])

	// Track selected examination session for course offering filtering
	const [selectedExaminationSessionId, setSelectedExaminationSessionId] = useState<string>('')

	const filteredCourseOfferings = useMemo(() => {
		if (!selectedInstitutionId) return []
		// Filter by institution first
		let filtered = allCourseOfferings.filter(c => c.institutions_id === selectedInstitutionId)
		// Then filter by examination session if selected (follows hierarchy: Institution → Exam Session → Course Offering)
		if (selectedExaminationSessionId) {
			filtered = filtered.filter(c => c.examination_session_id === selectedExaminationSessionId)
		}
		return filtered
	}, [allCourseOfferings, selectedInstitutionId, selectedExaminationSessionId])

	// Fetch exam registrations with institution and program filter
	const fetchExamRegistrations = useCallback(async () => {
		try {
			setLoading(true)
			let url = appendToUrl('/api/exam-management/exam-registrations?pageSize=100000')
			// Add program_id filter if provided
			if (programId && programId !== 'all') {
				url += `&program_id=${encodeURIComponent(programId)}`
			}
			const response = await fetch(url)
			if (!response.ok) {
				throw new Error('Failed to fetch exam registrations')
			}
			const result = await response.json()
			let data = Array.isArray(result) ? result : result.data || []

			// Client-side filter for safety
			if (shouldFilter && institutionId) {
				data = data.filter((reg: ExamRegistration) => reg.institutions_id === institutionId)
			}

			setExamRegistrations(data)
		} catch (error) {
			console.error('Error fetching exam registrations:', error)
			toast({
				title: '❌ Fetch Failed',
				description: 'Failed to load exam registrations.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}, [appendToUrl, shouldFilter, institutionId, programId, toast])

	// Refresh exam registrations
	const refreshExamRegistrations = useCallback(async () => {
		try {
			setLoading(true)
			let url = appendToUrl('/api/exam-management/exam-registrations?pageSize=100000')
			// Add program_id filter if provided
			if (programId && programId !== 'all') {
				url += `&program_id=${encodeURIComponent(programId)}`
			}
			const response = await fetch(url)
			if (!response.ok) {
				throw new Error('Failed to fetch exam registrations')
			}
			const result = await response.json()
			let data = Array.isArray(result) ? result : result.data || []

			// Client-side filter for safety
			if (shouldFilter && institutionId) {
				data = data.filter((reg: ExamRegistration) => reg.institutions_id === institutionId)
			}

			setExamRegistrations(data)
			toast({
				title: '✅ Refreshed',
				description: `Loaded ${data.length} exam registrations.`,
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
			})
		} catch (error) {
			console.error('Error refreshing exam registrations:', error)
			toast({
				title: '❌ Refresh Failed',
				description: 'Failed to load exam registrations.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}, [appendToUrl, shouldFilter, institutionId, programId, toast])

	// Save exam registration (create or update)
	const saveExamRegistration = useCallback(async (data: ExamRegistrationFormData, editing: ExamRegistration | null) => {
		try {
			let savedExamRegistration: ExamRegistration

			if (editing) {
				savedExamRegistration = await updateExamRegistration(editing.id, data)
				setExamRegistrations(prev => prev.map(item => item.id === editing.id ? savedExamRegistration : item))
				toast({
					title: '✅ Registration Updated',
					description: 'Exam registration has been updated successfully.',
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			} else {
				savedExamRegistration = await createExamRegistration(data)
				setExamRegistrations(prev => [savedExamRegistration, ...prev])
				toast({
					title: '✅ Registration Created',
					description: 'Exam registration has been created successfully.',
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			}

			return savedExamRegistration
		} catch (error) {
			console.error('Save exam registration error:', error)
			toast({
				title: '❌ Operation Failed',
				description: error instanceof Error ? error.message : 'Failed to save registration.',
				variant: 'destructive'
			})
			throw error
		}
	}, [toast])

	// Remove exam registration
	const removeExamRegistration = useCallback(async (id: string) => {
		try {
			await deleteExamRegistration(id)
			setExamRegistrations(prev => prev.filter(item => item.id !== id))
			toast({
				title: '✅ Registration Deleted',
				description: 'Exam registration has been removed.',
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
			})
		} catch (error) {
			console.error('Error deleting exam registration:', error)
			toast({
				title: '❌ Delete Failed',
				description: 'Failed to delete registration.',
				variant: 'destructive'
			})
			throw error
		}
	}, [toast])

	// Load dropdown data
	const loadDropdownData = useCallback(async () => {
		try {
			const [institutionsData, studentsData, sessionsData, offeringsData] = await Promise.all([
				fetchInstitutions(),
				fetchStudents(),
				fetchExaminationSessions(),
				fetchCourseOfferings()
			])

			setInstitutions(institutionsData)
			setAllStudents(studentsData)
			setAllExaminationSessions(sessionsData)
			setAllCourseOfferings(offeringsData)
		} catch (error) {
			console.error('Error loading dropdown data:', error)
		}
	}, [])

	// Load data when institution filter is ready or program filter changes
	useEffect(() => {
		if (!isReady) return
		fetchExamRegistrations()
		loadDropdownData()
	}, [isReady, filter, programId])

	return {
		examRegistrations,
		loading,
		setLoading,
		fetchExamRegistrations,
		refreshExamRegistrations,
		saveExamRegistration,
		removeExamRegistration,
		// Dropdown data (unfiltered - for import validation)
		institutions,
		allStudents,
		allExaminationSessions,
		allCourseOfferings,
		// Dropdown data (filtered by institution - for forms)
		filteredStudents,
		filteredExaminationSessions,
		filteredCourseOfferings,
		// Learners loading state (from MyJKKN)
		learnersLoading,
		// Dropdown control
		selectedInstitutionId,
		setSelectedInstitutionId,
		selectedExaminationSessionId,
		setSelectedExaminationSessionId,
		loadDropdownData,
		// Institution filter values (for page use)
		isReady,
		mustSelectInstitution,
		shouldFilter,
		institutionId,
		getInstitutionIdForCreate,
	}
}
