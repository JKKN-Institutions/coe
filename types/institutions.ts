export type DepartmentInfo = {
  name?: string
  designation?: string
  email?: string
  mobile?: string
}

export interface Institution {
  id: string
  institution_code: string
  name: string
  phone?: string
  email?: string
  website?: string
  created_by?: string
  counselling_code?: string
  accredited_by?: string
  address_line1?: string
  address_line2?: string
  address_line3?: string
  city?: string
  state?: string
  country?: string
  logo_url?: string
  transportation_dept?: DepartmentInfo
  administration_dept?: DepartmentInfo
  accounts_dept?: DepartmentInfo
  admission_dept?: DepartmentInfo
  placement_dept?: DepartmentInfo
  anti_ragging_dept?: DepartmentInfo
  institution_type?: string
  pin_code?: string
  timetable_type?: string
  is_active: boolean
  created_at: string
}

export interface InstitutionFormData {
  institution_code: string
  name: string
  phone: string
  email: string
  website: string
  counselling_code: string
  accredited_by: string
  address_line1: string
  address_line2: string
  address_line3: string
  city: string
  state: string
  country: string
  pin_code: string
  logo_url: string
  institution_type: string
  timetable_type: string
  transportation_dept: DepartmentInfo
  administration_dept: DepartmentInfo
  accounts_dept: DepartmentInfo
  admission_dept: DepartmentInfo
  placement_dept: DepartmentInfo
  anti_ragging_dept: DepartmentInfo
  is_active: boolean
}

export interface InstitutionImportError {
  row: number
  institution_code: string
  name: string
  errors: string[]
}

export interface UploadSummary {
  total: number
  success: number
  failed: number
}
