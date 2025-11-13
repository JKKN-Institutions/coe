import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/hooks/common/use-toast'
import type {
	ExamRegistration,
	ExamRegistrationFormData,
	InstitutionOption,
	StudentOption,
	ExaminationSessionOption,
	CourseOfferingOption
} from '@/types/exam-registrations'
import {
	fetchExamRegistrations as fetchExamRegistrationsService,
	createExamRegistration,
	updateExamRegistration,
	deleteExamRegistration,
	fetchInstitutions,
	fetchStudents,
	fetchExaminationSessions,
	fetchCourseOfferings
} from '@/services/exam-management/exam-registrations-service'

export function useExamRegistrations() {
	const { toast } = useToast()
	const [examRegistrations, setExamRegistrations] = useState<ExamRegistration[]>([])
	const [loading, setLoading] = useState(true)

	// Dropdown data
	const [institutions, setInstitutions] = useState<InstitutionOption[]>([])
	const [allStudents, setAllStudents] = useState<StudentOption[]>([])
	const [allExaminationSessions, setAllExaminationSessions] = useState<ExaminationSessionOption[]>([])
	const [allCourseOfferings, setAllCourseOfferings] = useState<CourseOfferingOption[]>([])

	// Filtered dropdowns based on selected institution
	const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('')

	// Filter dropdowns by institution
	const filteredStudents = useMemo(() => {
		if (!selectedInstitutionId) return []
		return allStudents.filter(s => s.institution_id === selectedInstitutionId)
	}, [allStudents, selectedInstitutionId])

	const filteredExaminationSessions = useMemo(() => {
		if (!selectedInstitutionId) return []
		return allExaminationSessions.filter(s => s.institutions_id === selectedInstitutionId)
	}, [allExaminationSessions, selectedInstitutionId])

	const filteredCourseOfferings = useMemo(() => {
		if (!selectedInstitutionId) return []
		return allCourseOfferings.filter(c => c.institutions_id === selectedInstitutionId)
	}, [allCourseOfferings, selectedInstitutionId])

	// Fetch exam registrations
	const fetchExamRegistrations = useCallback(async () => {
		try {
			setLoading(true)
			const data = await fetchExamRegistrationsService()
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
	}, [toast])

	// Refresh exam registrations
	const refreshExamRegistrations = useCallback(async () => {
		try {
			setLoading(true)
			const data = await fetchExamRegistrationsService()
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
	}, [toast])

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

	// Load data on mount
	useEffect(() => {
		fetchExamRegistrations()
		loadDropdownData()
	}, [fetchExamRegistrations, loadDropdownData])

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
		// Dropdown control
		selectedInstitutionId,
		setSelectedInstitutionId,
		loadDropdownData,
	}
}
