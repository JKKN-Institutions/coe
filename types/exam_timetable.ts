// Exam Timetable type definition
export interface ExamTimetable {
	id: string
	institutions_id: string
	examination_session_id: string
	course_offering_id: string
	exam_date: string
	session: string
	exam_time: string
	duration_minutes: number
	exam_mode: string
	is_published: boolean
	instructions?: string
	created_by?: string
	created_at: string
}

// Generated Course Data for child table
export interface GeneratedCourseData {
	course_offering_id: string
	course_code: string
	course_title: string
	program_name: string
	program_code?: string
	program_order?: number | string
	semester?: number
	course_semester_code?: string
	course_semester_name?: string
	course_semester_number?: number
	course_program_code?: string
	course_institution_code?: string
	course_regulation_code?: string
	regular_count: number
	arrear_count: number
	exam_date: string
	session: string
	exam_time: string
	duration_minutes: number
	is_published: boolean
	instructions?: string
	existing_timetable_id?: string
}

// Examination Session type
export interface ExaminationSession {
	id: string
	session_code: string
	session_name: string
}

// Program type
export interface Program {
	id: string
	institution_code: string
	program_code: string
	program_name: string
	program_type: string
}

// Semester type
export interface Semester {
	id: string
	semester_code: string
	semester_name: string
}

// Institution type
export interface Institution {
	id: string
	institution_code: string
	institution_name: string
}

// Form data for creating/updating exam timetable
export interface ExamTimetableFormData {
	institutions_id: string
	examination_session_id: string
	course_offering_id: string
	exam_date: string
	session: string
	exam_time: string
	duration_minutes: number
	exam_mode: string
	is_published: boolean
	instructions?: string
}
