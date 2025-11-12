import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/common/use-toast'
import type { Course-mapping, Course-mappingFormData } from '@/types/course-mapping'
import {
	fetchCourse-mappings as fetchCourse-mappingsService,
	createCourse-mapping,
	updateCourse-mapping,
	deleteCourse-mapping
} from '@/services/course-management/course-mapping-service'

export function useCourse-mappings() {
	const { toast } = useToast()
	const [course-mappings, setCourse-mappings] = useState<Course-mapping[]>([])
	const [loading, setLoading] = useState(true)

	// Fetch course-mapping
	const fetchCourse-mappings = useCallback(async () => {
		try {
			setLoading(true)
			const data = await fetchCourse-mappingsService()
			setCourse-mappings(data)
		} catch (error) {
			console.error('Error fetching course-mapping:', error)
			toast({
				title: '❌ Fetch Failed',
				description: 'Failed to load course-mapping.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}, [toast])

	// Refresh course-mapping
	const refreshCourse-mappings = useCallback(async () => {
		try {
			setLoading(true)
			const data = await fetchCourse-mappingsService()
			setCourse-mappings(data)
			toast({
				title: '✅ Refreshed',
				description: `Loaded ${data.length} course-mapping.`,
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
			})
		} catch (error) {
			console.error('Error refreshing course-mapping:', error)
			toast({
				title: '❌ Refresh Failed',
				description: 'Failed to load course-mapping.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}, [toast])

	// Save course-mapping (create or update)
	const saveCourse-mapping = useCallback(async (data: Course-mappingFormData, editing: Course-mapping | null) => {
		try {
			let savedCourse-mapping: Course-mapping

			if (editing) {
				savedCourse-mapping = await updateCourse-mapping(editing.id, data)
				setCourse-mappings(prev => prev.map(item => item.id === editing.id ? savedCourse-mapping : item))
				toast({
					title: '✅ Record Updated',
					description: 'Record has been updated successfully.',
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			} else {
				savedCourse-mapping = await createCourse-mapping(data)
				setCourse-mappings(prev => [savedCourse-mapping, ...prev])
				toast({
					title: '✅ Record Created',
					description: 'Record has been created successfully.',
					className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
				})
			}

			return savedCourse-mapping
		} catch (error) {
			console.error('Save course-mapping error:', error)
			toast({
				title: '❌ Operation Failed',
				description: error instanceof Error ? error.message : 'Failed to save record.',
				variant: 'destructive'
			})
			throw error
		}
	}, [toast])

	// Remove course-mapping
	const removeCourse-mapping = useCallback(async (id: string) => {
		try {
			await deleteCourse-mapping(id)
			setCourse-mappings(prev => prev.filter(item => item.id !== id))
			toast({
				title: '✅ Record Deleted',
				description: 'Record has been removed.',
				className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
			})
		} catch (error) {
			console.error('Error deleting course-mapping:', error)
			toast({
				title: '❌ Delete Failed',
				description: 'Failed to delete record.',
				variant: 'destructive'
			})
			throw error
		}
	}, [toast])

	// Load course-mapping on mount
	useEffect(() => {
		fetchCourse-mappings()
	}, [fetchCourse-mappings])

	return {
		course-mappings,
		loading,
		setLoading,
		fetchCourse-mappings,
		refreshCourse-mappings,
		saveCourse-mapping,
		removeCourse-mapping,
	}
}
