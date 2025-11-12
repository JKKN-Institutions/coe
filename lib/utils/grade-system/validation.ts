/**
 * Grade System Validation Utilities
 *
 * This module contains all validation logic for grade system operations.
 * It provides comprehensive validation for form data and import operations.
 */

import type { GradeSystemFormData } from '@/types/grade-system'

/**
 * Validates grade system form data
 * @param formData - Grade system form data
 * @returns Object with field names as keys and error messages as values
 */
export function validateGradeSystemFormData(
	formData: GradeSystemFormData
): Record<string, string> {
	const errors: Record<string, string> = {}

	// Required field validation
	if (!formData.institutions_code.trim()) {
		errors.institutions_code = 'Required'
	}

	if (!formData.grade_system_code.trim()) {
		errors.grade_system_code = 'Required'
	}

	if (!formData.grade_id.trim()) {
		errors.grade_id = 'Required'
	}

	if (!formData.regulation_id.trim()) {
		errors.regulation_id = 'Required'
	}

	if (!formData.min_mark.trim()) {
		errors.min_mark = 'Required'
	}

	if (!formData.max_mark.trim()) {
		errors.max_mark = 'Required'
	}

	if (!formData.description.trim()) {
		errors.description = 'Required'
	}

	// Numeric validation
	const minMark = Number(formData.min_mark)
	const maxMark = Number(formData.max_mark)

	if (formData.min_mark && (isNaN(minMark) || minMark < 0 || minMark > 100)) {
		errors.min_mark = 'Min mark must be between 0 and 100'
	}

	if (formData.max_mark && (isNaN(maxMark) || maxMark < 0 || maxMark > 100)) {
		errors.max_mark = 'Max mark must be between 0 and 100'
	}

	// Constraint: min_mark < max_mark
	if (formData.min_mark && formData.max_mark && minMark >= maxMark) {
		errors.min_mark = 'Min mark must be less than max mark'
	}

	return errors
}

/**
 * Validates import row data
 * @param data - Row data from Excel/CSV import
 * @param rowIndex - Row number in file (for error reporting)
 * @returns Array of validation error messages
 */
export function validateGradeSystemImportRow(
	data: any,
	rowIndex: number
): string[] {
	const errors: string[] = []

	// Required field validations
	if (!data.grade_system_code || data.grade_system_code.trim() === '') {
		errors.push('System Code is required')
	}

	if (!data.institutions_code || data.institutions_code.trim() === '') {
		errors.push('Institution Code is required')
	}

	if (!data.grade_id || data.grade_id.trim() === '') {
		errors.push('Grade is required')
	}

	if (!data.regulation_id) {
		errors.push('Regulation ID is required')
	}

	if (data.min_mark === undefined || data.min_mark === null || data.min_mark === '') {
		errors.push('Min Mark is required')
	} else {
		const minMark = Number(data.min_mark)
		if (isNaN(minMark) || minMark < 0 || minMark > 100) {
			errors.push('Min Mark must be between 0 and 100')
		}
	}

	if (data.max_mark === undefined || data.max_mark === null || data.max_mark === '') {
		errors.push('Max Mark is required')
	} else {
		const maxMark = Number(data.max_mark)
		if (isNaN(maxMark) || maxMark < 0 || maxMark > 100) {
			errors.push('Max Mark must be between 0 and 100')
		}
	}

	// Constraint: min_mark < max_mark
	if (data.min_mark !== undefined && data.max_mark !== undefined) {
		const minMark = Number(data.min_mark)
		const maxMark = Number(data.max_mark)
		if (!isNaN(minMark) && !isNaN(maxMark) && minMark >= maxMark) {
			errors.push('Min Mark must be less than Max Mark')
		}
	}

	if (!data.description || data.description.trim() === '') {
		errors.push('Description is required')
	}

	// Status validation
	if (data.is_active !== undefined && data.is_active !== null) {
		if (typeof data.is_active !== 'boolean') {
			const statusValue = String(data.is_active).toLowerCase()
			if (statusValue !== 'true' && statusValue !== 'false' && statusValue !== 'active' && statusValue !== 'inactive') {
				errors.push('Status must be true/false or Active/Inactive')
			}
		}
	}

	return errors
}

/**
 * Validates mark range (min and max)
 * @param minMark - Minimum mark
 * @param maxMark - Maximum mark
 * @returns Object with validation errors
 */
export function validateMarkRange(
	minMark: number,
	maxMark: number
): Record<string, string> {
	const errors: Record<string, string> = {}

	if (minMark < 0 || minMark > 100) {
		errors.min_mark = 'Min mark must be between 0 and 100'
	}

	if (maxMark < 0 || maxMark > 100) {
		errors.max_mark = 'Max mark must be between 0 and 100'
	}

	if (minMark >= maxMark) {
		errors.min_mark = 'Min mark must be less than max mark'
	}

	return errors
}
