import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/common/use-toast'
import type { Exam-rooms, Exam-roomsFormData } from '@/types/exam-rooms'
import {
	fetchExam-roomss as fetchExam-roomssService,
	createExam-rooms,
	updateExam-rooms,
	deleteExam-rooms
} from '@/services/exam-management/exam-rooms-service'

export function useExam-roomss() {
	const { toast } = useToast()
	const [exam-roomss, setExam-roomss] = useState<Exam-rooms[]>([])
	const [loading, setLoading] = useState(true)

	// Fetch exam-rooms
	const fetchExam-roomss = useCallback(async () => {
		try {
			setLoading(true)
			const data = await fetchExam-roomssService()
			setExam-roomss(data)
		} catch (error) {
			console.error('Error fetching exam-rooms:', error)
			toast({
				title: '❌ Fetch Failed',
				description: 'Failed to load exam-rooms.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}, [toast])

	// Refresh exam-rooms
	const refreshExam-roomss = useCallback(async () => {
		try {
			setLoading(true)
			const data = await fetchExam-roomssService()
			setExam-roomss(data)
			toast({
				title: '✅ Refreshed',
				description: `Loaded ${data.length} exam-rooms.`,
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
			})
		} catch (error) {
			console.error('Error refreshing exam-rooms:', error)
			toast({
				title: '❌ Refresh Failed',
				description: 'Failed to load exam-rooms.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}, [toast])

	// Save exam-rooms (create or update)
	const saveExam-rooms = useCallback(async (data: Exam-roomsFormData, editing: Exam-rooms | null) => {
		try {
			let savedExam-rooms: Exam-rooms

			if (editing) {
				savedExam-rooms = await updateExam-rooms(editing.id, data)
				setExam-roomss(prev => prev.map(item => item.id === editing.id ? savedExam-rooms : item))
				toast({
					title: '✅ Record Updated',
					description: 'Record has been updated successfully.',
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			} else {
				savedExam-rooms = await createExam-rooms(data)
				setExam-roomss(prev => [savedExam-rooms, ...prev])
				toast({
					title: '✅ Record Created',
					description: 'Record has been created successfully.',
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			}

			return savedExam-rooms
		} catch (error) {
			console.error('Save exam-rooms error:', error)
			toast({
				title: '❌ Operation Failed',
				description: error instanceof Error ? error.message : 'Failed to save record.',
				variant: 'destructive'
			})
			throw error
		}
	}, [toast])

	// Remove exam-rooms
	const removeExam-rooms = useCallback(async (id: string) => {
		try {
			await deleteExam-rooms(id)
			setExam-roomss(prev => prev.filter(item => item.id !== id))
			toast({
				title: '✅ Record Deleted',
				description: 'Record has been removed.',
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
			})
		} catch (error) {
			console.error('Error deleting exam-rooms:', error)
			toast({
				title: '❌ Delete Failed',
				description: 'Failed to delete record.',
				variant: 'destructive'
			})
			throw error
		}
	}, [toast])

	// Load exam-rooms on mount
	useEffect(() => {
		fetchExam-roomss()
	}, [fetchExam-roomss])

	return {
		exam-roomss,
		loading,
		setLoading,
		fetchExam-roomss,
		refreshExam-roomss,
		saveExam-rooms,
		removeExam-rooms,
	}
}
