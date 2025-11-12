import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/common/use-toast'
import type { Exam_timetable, Exam_timetableFormData } from '@/types/exam_timetable'
import {
	fetchExam_timetables as fetchExam_timetablesService,
	createExam_timetable,
	updateExam_timetable,
	deleteExam_timetable
} from '@/services/exam-management/exam_timetable-service'

export function useExam_timetables() {
	const { toast } = useToast()
	const [exam_timetables, setExam_timetables] = useState<Exam_timetable[]>([])
	const [loading, setLoading] = useState(true)

	// Fetch exam_timetable
	const fetchExam_timetables = useCallback(async () => {
		try {
			setLoading(true)
			const data = await fetchExam_timetablesService()
			setExam_timetables(data)
		} catch (error) {
			console.error('Error fetching exam_timetable:', error)
			toast({
				title: '❌ Fetch Failed',
				description: 'Failed to load exam_timetable.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}, [toast])

	// Refresh exam_timetable
	const refreshExam_timetables = useCallback(async () => {
		try {
			setLoading(true)
			const data = await fetchExam_timetablesService()
			setExam_timetables(data)
			toast({
				title: '✅ Refreshed',
				description: `Loaded ${data.length} exam_timetable.`,
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
			})
		} catch (error) {
			console.error('Error refreshing exam_timetable:', error)
			toast({
				title: '❌ Refresh Failed',
				description: 'Failed to load exam_timetable.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}, [toast])

	// Save exam_timetable (create or update)
	const saveExam_timetable = useCallback(async (data: Exam_timetableFormData, editing: Exam_timetable | null) => {
		try {
			let savedExam_timetable: Exam_timetable

			if (editing) {
				savedExam_timetable = await updateExam_timetable(editing.id, data)
				setExam_timetables(prev => prev.map(item => item.id === editing.id ? savedExam_timetable : item))
				toast({
					title: '✅ Record Updated',
					description: 'Record has been updated successfully.',
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			} else {
				savedExam_timetable = await createExam_timetable(data)
				setExam_timetables(prev => [savedExam_timetable, ...prev])
				toast({
					title: '✅ Record Created',
					description: 'Record has been created successfully.',
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			}

			return savedExam_timetable
		} catch (error) {
			console.error('Save exam_timetable error:', error)
			toast({
				title: '❌ Operation Failed',
				description: error instanceof Error ? error.message : 'Failed to save record.',
				variant: 'destructive'
			})
			throw error
		}
	}, [toast])

	// Remove exam_timetable
	const removeExam_timetable = useCallback(async (id: string) => {
		try {
			await deleteExam_timetable(id)
			setExam_timetables(prev => prev.filter(item => item.id !== id))
			toast({
				title: '✅ Record Deleted',
				description: 'Record has been removed.',
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
			})
		} catch (error) {
			console.error('Error deleting exam_timetable:', error)
			toast({
				title: '❌ Delete Failed',
				description: 'Failed to delete record.',
				variant: 'destructive'
			})
			throw error
		}
	}, [toast])

	// Load exam_timetable on mount
	useEffect(() => {
		fetchExam_timetables()
	}, [fetchExam_timetables])

	return {
		exam_timetables,
		loading,
		setLoading,
		fetchExam_timetables,
		refreshExam_timetables,
		saveExam_timetable,
		removeExam_timetable,
	}
}
