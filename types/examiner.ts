/**
 * Examiner Management Types
 */

export type ExaminerType = 'UG' | 'PG' | 'PRACTICAL' | 'SCRUTINY' | 'UG_PG' | 'ALL'
export type ExaminerStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'REJECTED'
export type EmailDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'BOUNCED'
export type AppointmentType = 'UG_VALUATION' | 'PG_VALUATION' | 'PRACTICAL' | 'SCRUTINY' | 'CHIEF_EXAMINER' | 'EXTERNAL_EXAMINER'

export interface Examiner {
	id: string
	full_name: string
	email: string
	mobile?: string
	designation?: string
	department?: string
	institution_name?: string
	institution_address?: string
	ug_experience_years: number
	pg_experience_years: number
	examiner_type: ExaminerType
	is_internal: boolean
	address?: string
	city?: string
	state?: string
	pincode?: string
	email_verified: boolean
	email_verified_at?: string
	status: ExaminerStatus
	status_remarks?: string
	institution_id?: string
	institution_code?: string
	notes?: string
	created_at: string
	updated_at: string
	created_by?: string
	updated_by?: string
	// Joined data
	boards?: ExaminerBoardAssociation[]
}

export interface ExaminerBoardAssociation {
	id: string
	examiner_id: string
	board_id: string
	board_code?: string
	willing_for_valuation: boolean
	willing_for_practical: boolean
	willing_for_scrutiny: boolean
	is_active: boolean
	created_at: string
	// Joined data
	board?: {
		id: string
		board_code: string
		board_name: string
		board_type?: string
	}
}

export interface ExaminerEmailLog {
	id: string
	examiner_id: string
	board_type?: string
	board_id?: string
	email_to: string
	email_cc?: string[]
	email_bcc?: string[]
	email_subject: string
	email_body?: string
	pdf_url?: string
	status: EmailDeliveryStatus
	sent_at?: string
	error_message?: string
	retry_count: number
	institution_code?: string
	created_at: string
	created_by?: string
	// Joined data
	examiner?: Examiner
}

export interface ExaminerAppointment {
	id: string
	examiner_id: string
	institution_code: string
	board_id?: string
	board_code?: string
	appointment_type: AppointmentType
	appointment_date: string
	reporting_time?: string
	venue?: string
	subject_code?: string
	subject_name?: string
	status: string
	notes?: string
	created_at: string
	updated_at: string
	created_by?: string
	// Joined data
	examiner?: Examiner
	board?: {
		id: string
		board_code: string
		board_name: string
	}
}

export interface SmtpConfiguration {
	id: string
	institution_code?: string
	smtp_host: string
	smtp_port: number
	smtp_secure: boolean
	smtp_user: string
	smtp_password_encrypted: string
	sender_email: string
	sender_name: string
	default_cc_emails?: string[]
	is_active: boolean
	created_at: string
	updated_at: string
}

export interface ExaminerEmailVerification {
	id: string
	email: string
	verification_code: string
	attempts: number
	expires_at: string
	verified: boolean
	ip_address?: string
	created_at: string
}

// Form Data Types
export interface ExaminerFormData {
	full_name: string
	email: string
	mobile: string
	designation: string
	department: string
	institution_name: string
	institution_address: string
	ug_experience_years: number
	pg_experience_years: number
	examiner_type: ExaminerType
	is_internal: boolean
	address: string
	city: string
	state: string
	pincode: string
	status: ExaminerStatus
	status_remarks: string
	institution_code: string
	notes: string
	// Board selections
	ug_board_codes: string[]
	pg_board_codes: string[]
	willing_for_valuation: boolean
	willing_for_practical: boolean
	willing_for_scrutiny: boolean
}

export interface PublicExaminerFormData {
	full_name: string
	email: string
	mobile: string
	designation: string
	department: string
	institution_name: string
	institution_address: string
	ug_experience_years: number
	pg_experience_years: number
	ug_board_code: string
	pg_board_code: string
	willing_for_valuation: boolean
	willing_for_practical: boolean
	willing_for_scrutiny: boolean
}

// Import/Export Types
export interface ExaminerImportError {
	row: number
	email: string
	full_name: string
	errors: string[]
}

export interface ExaminerUploadSummary {
	total: number
	success: number
	failed: number
}

// API Response Types
export interface ExaminerListResponse {
	data: Examiner[]
	total: number
}

export interface SendEmailRequest {
	examiner_ids: string[]
	appointment_type: AppointmentType
	board_id?: string
	appointment_date: string
	reporting_time: string
	venue: string
	subject_name?: string
	custom_message?: string
}

export interface SendEmailResponse {
	success: boolean
	sent_count: number
	failed_count: number
	errors?: Array<{
		examiner_id: string
		email: string
		error: string
	}>
}

// Constants
export const EXAMINER_TYPE_OPTIONS: { value: ExaminerType; label: string }[] = [
	{ value: 'UG', label: 'UG Only' },
	{ value: 'PG', label: 'PG Only' },
	{ value: 'UG_PG', label: 'UG & PG Both' },
	{ value: 'PRACTICAL', label: 'Practical Only' },
	{ value: 'SCRUTINY', label: 'Scrutiny Only' },
	{ value: 'ALL', label: 'All Types' },
]

export const EXAMINER_STATUS_OPTIONS: { value: ExaminerStatus; label: string; color: string }[] = [
	{ value: 'ACTIVE', label: 'Active', color: 'bg-green-100 text-green-700' },
	{ value: 'INACTIVE', label: 'Inactive', color: 'bg-gray-100 text-gray-700' },
	{ value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
	{ value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-700' },
]

export const APPOINTMENT_TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
	{ value: 'UG_VALUATION', label: 'UG Valuation' },
	{ value: 'PG_VALUATION', label: 'PG Valuation' },
	{ value: 'PRACTICAL', label: 'Practical Examination' },
	{ value: 'SCRUTINY', label: 'Scrutiny' },
	{ value: 'CHIEF_EXAMINER', label: 'Chief Examiner' },
	{ value: 'EXTERNAL_EXAMINER', label: 'External Examiner' },
]

export const DEFAULT_EXAMINER_FORM: ExaminerFormData = {
	full_name: '',
	email: '',
	mobile: '',
	designation: '',
	department: '',
	institution_name: '',
	institution_address: '',
	ug_experience_years: 0,
	pg_experience_years: 0,
	examiner_type: 'UG',
	is_internal: false,
	address: '',
	city: '',
	state: '',
	pincode: '',
	status: 'PENDING',
	status_remarks: '',
	institution_code: '',
	notes: '',
	ug_board_codes: [],
	pg_board_codes: [],
	willing_for_valuation: true,
	willing_for_practical: false,
	willing_for_scrutiny: false,
}
