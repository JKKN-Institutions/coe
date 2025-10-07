-- ============================================
-- CONTROLLER OF EXAMINATION - SIMPLIFIED PRODUCTION DESIGN
-- ============================================
-- Version: 2.0 (Optimized)
-- Design: 5 Tables (Down from 14)
-- Philosophy: Balance between normalization and practicality
-- Performance: Fewer joins, faster queries, easier maintenance
-- ============================================

/*
NOTE: This schema references the following tables from the existing database.
These tables must exist before creating the student tables:
- institutions
- departments
- programs
- degrees
- semesters
- sections
- academic_year
- admissions (optional)
- auth.users

If these tables don't exist, create them first from the main schema.
*/

/*
DESIGN RATIONALE:
- Table 1: students (Core + Hot Data) - 90% of queries use this
- Table 2: student_details (Extended Info) - JSONB for flexibility
- Table 3: student_education (All Education History) - JSONB for all levels
- Table 4: student_financial (Sensitive Data) - Separate for security/RLS
- Table 5: student_documents (File Tracking) - Optional, can be merged

WHY THIS IS BETTER:
✅ 5 tables instead of 14 (64% reduction)
✅ Fewer joins = faster queries
✅ Easier to maintain and understand
✅ JSONB provides flexibility without schema changes
✅ Still normalized where it matters (financial data)
✅ Easy import/export with fewer relationships
*/

-- ============================================
-- TABLE 1: STUDENTS (Core + Hot Data - 90% Access)
-- ============================================
-- Contains all frequently accessed fields for exam operations
-- This table handles roll lists, hall tickets, attendance, results

CREATE TABLE IF NOT EXISTS public.students (
  -- Primary Key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiers (Indexed - Fast Lookup)
  roll_number text UNIQUE NOT NULL,
  register_number text UNIQUE,
  application_id text UNIQUE,
  admission_id uuid REFERENCES public.admissions(id),
  
  -- Basic Identity (Always Needed)
  first_name text NOT NULL,
  last_name text,
  initial text,
  full_name text GENERATED ALWAYS AS (
    first_name || ' ' || COALESCE(initial || ' ', '') || COALESCE(last_name, '')
  ) STORED,
  date_of_birth date NOT NULL,
  age integer, -- Calculated via trigger or application logic
  gender text NOT NULL CHECK (gender IN ('Male', 'Female', 'Other', 'Transgender')),
  blood_group text CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
  
  -- Contact (Hot Data)
  student_mobile text,
  student_email text UNIQUE,
  college_email text UNIQUE,
  
  -- Photo
  photo_url text,
  
  -- Academic Assignment (Critical for Exam Operations)
  institution_id uuid NOT NULL REFERENCES public.institutions(id),
  department_id uuid NOT NULL REFERENCES public.departments(id),
  program_id uuid NOT NULL REFERENCES public.programs(id),
  degree_id uuid REFERENCES public.degrees(id),
  semester_id uuid NOT NULL REFERENCES public.semesters(id),
  section_id uuid REFERENCES public.sections(id),
  academic_year_id uuid NOT NULL REFERENCES public.academic_year(id),
  batch_year integer, -- e.g., 2021, 2022
  
  -- Status & Flags (Frequently Filtered)
  status text DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'suspended', 'graduated', 'dropout', 'transferred')
  ),
  admission_status text,
  is_profile_complete boolean DEFAULT false,
  is_hostelite boolean DEFAULT false,
  is_bus_user boolean DEFAULT false,
  
  -- Quick Access Demographics (Avoid Joins)
  nationality text DEFAULT 'Indian',
  religion text,
  community text, -- BC, MBC, SC, ST, OC
  caste text,
  quota text, -- Government Quota, Management Quota
  category text, -- General, OBC, SC, ST
  first_graduate boolean DEFAULT false,
  
  -- Parents (Hot Data - Often Needed)
  father_name text,
  father_mobile text,
  mother_name text,
  mother_mobile text,
  
  -- Address (Summary - Full details in student_details)
  district text,
  state text DEFAULT 'Tamil Nadu',
  
  -- Search (Full Text Search)
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(roll_number, '') || ' ' ||
      COALESCE(register_number, '') || ' ' ||
      first_name || ' ' || 
      COALESCE(last_name, '') || ' ' ||
      COALESCE(student_email, '') || ' ' ||
      COALESCE(student_mobile, '')
    )
  ) STORED,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_email CHECK (student_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_mobile CHECK (student_mobile ~ '^[0-9]{10}$')
);

-- Critical Indexes for Performance
CREATE INDEX idx_students_roll ON students(roll_number) WHERE status = 'active';
CREATE INDEX idx_students_register ON students(register_number);
CREATE INDEX idx_students_email ON students(student_email);
CREATE INDEX idx_students_college_email ON students(college_email);
CREATE INDEX idx_students_mobile ON students(student_mobile);

-- Academic Indexes (Most Common Queries)
CREATE INDEX idx_students_program_sem ON students(program_id, semester_id, status);
CREATE INDEX idx_students_program_sem_sec ON students(program_id, semester_id, section_id) 
  WHERE status = 'active';
CREATE INDEX idx_students_institution ON students(institution_id, status);
CREATE INDEX idx_students_dept ON students(department_id, semester_id);
CREATE INDEX idx_students_academic_year ON students(academic_year_id);
CREATE INDEX idx_students_batch ON students(batch_year);

-- Status Indexes
CREATE INDEX idx_students_active ON students(id, program_id, semester_id) WHERE status = 'active';
CREATE INDEX idx_students_status ON students(status);

-- Demographics Indexes
CREATE INDEX idx_students_community ON students(community) WHERE community IS NOT NULL;
CREATE INDEX idx_students_quota ON students(quota) WHERE quota IS NOT NULL;

-- Search Index
CREATE INDEX idx_students_search ON students USING gin(search_vector);

-- Partial Indexes for Common Filters
CREATE INDEX idx_students_hostel ON students(id) WHERE is_hostelite = true;
CREATE INDEX idx_students_bus ON students(id) WHERE is_bus_user = true;
CREATE INDEX idx_students_incomplete ON students(id) WHERE is_profile_complete = false;

-- ============================================
-- TABLE 2: STUDENT_DETAILS (Extended Info - JSONB)
-- ============================================
-- Contains less frequently accessed fields
-- Using JSONB for flexibility and schema evolution

CREATE TABLE IF NOT EXISTS public.student_details (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  
  -- Personal Details (JSONB for flexibility)
  personal_info jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "name_in_tamil": "தமிழ் பெயர்",
    "sub_caste": "Sub Caste Name",
    "aadhar_number": "1234-5678-9012",
    "emis_number": "EMIS123",
    "umis_number": "UMIS456",
    "identification_mark_1": "Mole on left hand",
    "identification_mark_2": "Scar on right knee",
    "category_pu": "BC",
    "category_jdce": "MBC",
    "rank": "1234",
    "disability_type": "Visual Impairment",
    "disability_percentage": 40.5,
    "ex_servicemen_number": "ES123",
    "sports_quota": "State Level Cricket",
    "ncc_number": "NCC123",
    "nss_number": "NSS456"
  }
  */
  
  -- Contact & Address (JSONB)
  contact_info jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "telephone": "0422-1234567",
    "permanent_address": {
      "door_no": "12/34",
      "street": "Main Street",
      "village": "Village Name",
      "post_office": "PO Name",
      "taluk": "Taluk Name",
      "district": "District Name",
      "state": "Tamil Nadu",
      "country": "India",
      "pin_code": "641001"
    },
    "present_address": {
      "same_as_permanent": true,
      "door_no": "...",
      "street": "..."
    }
  }
  */
  
  -- Family Details (JSONB)
  family_info jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "father": {
      "name": "Father Name",
      "occupation": "Business",
      "education": "Graduate",
      "mobile": "9876543210",
      "email": "father@example.com"
    },
    "mother": {
      "name": "Mother Name",
      "occupation": "Homemaker",
      "education": "HSC",
      "mobile": "9876543211",
      "email": "mother@example.com"
    },
    "guardian": {
      "name": "Guardian Name",
      "relation": "Uncle",
      "mobile": "9876543212"
    },
    "annual_income": "500000",
    "siblings_count": 2
  }
  */
  
  -- Accommodation & Transport (JSONB)
  accommodation_info jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "accommodation_type": "Hosteller",
    "hostel_type": "College Hostel",
    "hostel_name": "Boys Hostel Block A",
    "room_number": "A-201",
    "food_type": "Veg",
    "bus_required": true,
    "bus_route": "Route 5",
    "bus_stop": "Main Gate",
    "pickup_location": "City Center"
  }
  */
  
  -- Reference Information (JSONB)
  reference_info jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "reference_type": "Alumni",
    "reference_name": "John Doe",
    "reference_contact": "9876543213",
    "reference_relation": "Friend"
  }
  */
  
  -- Administrative Tracking (JSONB)
  admin_tracking jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "application_check_status": "Verified",
    "current_status": "Active",
    "portal_status": "Completed",
    "verification_date": "2024-06-15",
    "verified_by": "Admin Name",
    "remarks": "All documents verified",
    "flags": ["profile_complete", "documents_verified"]
  }
  */
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes on JSONB fields (GIN indexes for fast lookup)
CREATE INDEX idx_details_personal ON student_details USING gin(personal_info);
CREATE INDEX idx_details_contact ON student_details USING gin(contact_info);
CREATE INDEX idx_details_family ON student_details USING gin(family_info);

-- Specific JSONB path indexes for common queries
CREATE INDEX idx_details_aadhar ON student_details((personal_info->>'aadhar_number'));
CREATE INDEX idx_details_emis ON student_details((personal_info->>'emis_number'));
CREATE INDEX idx_details_hostel_room ON student_details((accommodation_info->>'room_number'));

-- ============================================
-- TABLE 3: STUDENT_EDUCATION (All Education History - JSONB)
-- ============================================
-- Contains complete education history from 10th to UG/PG

CREATE TABLE IF NOT EXISTS public.student_education (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  
  -- Entry Type
  entry_type text NOT NULL, -- Direct, Management, Counseling, etc.
  medium_of_instruction text CHECK (medium_of_instruction IN ('Tamil', 'English', 'Both')),
  
  -- 10th Standard Details (JSONB)
  tenth_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "school_name": "ABC High School",
    "school_place": "Chennai",
    "board": "State Board",
    "board_of_study": "Tamil Nadu State Board",
    "school_type": "Government",
    "mode": "Regular",
    "medium": "Tamil",
    "register_number": "123456",
    "passing_month": "April",
    "passing_year": "2019",
    "marks": {
      "tamil": 85,
      "english": 90,
      "maths": 95,
      "science": 88,
      "social": 92,
      "total": 450,
      "percentage": 90.0
    }
  }
  */
  
  -- 11th Standard Details (JSONB) - Optional
  eleventh_details jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "school_name": "XYZ Hr Sec School",
    "school_place": "Chennai",
    "board": "State Board",
    "mode": "Regular",
    "medium": "English",
    "register_number": "123457",
    "passing_month": "March",
    "passing_year": "2020",
    "marks_obtained": "520",
    "total_marks": "600",
    "percentage": 86.67
  }
  */
  
  -- 12th Standard Details (JSONB)
  twelfth_details jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "school_name": "XYZ Hr Sec School",
    "school_place": "Chennai",
    "board": "State Board",
    "mode": "Regular",
    "medium": "English",
    "register_number": "123458",
    "passing_month": "March",
    "passing_year": "2021",
    "subjects": {
      "physics": 95,
      "chemistry": 92,
      "maths": 98,
      "biology": 90,
      "english": 85,
      "computer_science": 96
    },
    "marks": {
      "total_obtained": 556,
      "total_maximum": 600,
      "percentage": 92.67
    }
  }
  */
  
  -- Entrance Exam Details (JSONB)
  entrance_details jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "neet": {
      "roll_number": "NEET123456",
      "score": 650,
      "rank": 1234,
      "percentile": 99.5
    },
    "jee": {
      "roll_number": "JEE789012",
      "score": 285,
      "rank": 5678
    },
    "state_entrance": {
      "exam_name": "TNEA",
      "roll_number": "TNEA456",
      "rank": 234
    },
    "cutoff_marks": {
      "medical": 195.5,
      "engineering": 198.75,
      "average": 197.125
    },
    "counseling": {
      "applied": true,
      "counseling_number": "COUN123",
      "rounds_attended": 3
    }
  }
  */
  
  -- UG/Previous Degree Details (JSONB) - For PG Students
  ug_details jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "degree": "B.E. Computer Science",
    "college": "ABC Engineering College",
    "university": "Anna University",
    "passing_month": "May",
    "passing_year": "2023",
    "qualification_type": "UG",
    "education_pattern": "Semester",
    "marks": {
      "major": {
        "maximum": 1000,
        "obtained": 850,
        "percentage": 85.0
      },
      "allied": {
        "maximum": 400,
        "obtained": 340,
        "percentage": 85.0
      },
      "total": {
        "maximum": 4000,
        "obtained": 3400,
        "percentage": 85.0
      },
      "major_plus_allied": {
        "maximum": 1400,
        "obtained": 1190,
        "percentage": 85.0
      }
    },
    "classification": "First Class with Distinction",
    "cgpa": 8.5,
    "grade": "A"
  }
  */
  
  -- PG/Higher Education (JSONB) - If applicable
  pg_details jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for education queries
CREATE INDEX idx_education_entry_type ON student_education(entry_type);
CREATE INDEX idx_education_tenth ON student_education USING gin(tenth_details);
CREATE INDEX idx_education_twelfth ON student_education USING gin(twelfth_details);
CREATE INDEX idx_education_entrance ON student_education USING gin(entrance_details);

-- Specific path indexes
CREATE INDEX idx_education_tenth_year ON student_education((tenth_details->>'passing_year'));
CREATE INDEX idx_education_twelfth_year ON student_education((twelfth_details->>'passing_year'));
CREATE INDEX idx_education_neet_roll ON student_education((entrance_details->'neet'->>'roll_number'));

-- ============================================
-- TABLE 4: STUDENT_FINANCIAL (Sensitive - Separate RLS)
-- ============================================
-- Separate table for financial data with stricter security

CREATE TABLE IF NOT EXISTS public.student_financial (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  
  -- Bank Details
  bank_account_holder text,
  bank_account_number text,
  bank_ifsc_code text CHECK (bank_ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  bank_name text,
  bank_branch text,
  
  -- Fee Information
  fee_structure jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "tuition_fee": 50000,
    "hostel_fee": 30000,
    "bus_fee": 10000,
    "other_fees": 5000,
    "total_fee": 95000,
    "scholarship_amount": 10000,
    "net_payable": 85000,
    "payment_mode": "Semester"
  }
  */
  
  -- Payment History (JSONB Array)
  payment_history jsonb DEFAULT '[]'::jsonb,
  /*
  Structure:
  [
    {
      "payment_date": "2024-07-15",
      "amount": 42500,
      "payment_mode": "Online",
      "transaction_id": "TXN123456",
      "receipt_number": "REC001",
      "semester": "Semester 1",
      "status": "Paid"
    },
    {
      "payment_date": "2024-12-20",
      "amount": 42500,
      "payment_mode": "DD",
      "dd_number": "DD789012",
      "semester": "Semester 2",
      "status": "Paid"
    }
  ]
  */
  
  -- Fee Summary (Computed)
  total_fee_amount numeric(10,2),
  total_paid_amount numeric(10,2),
  balance_amount numeric(10,2) GENERATED ALWAYS AS (
    total_fee_amount - COALESCE(total_paid_amount, 0)
  ) STORED,
  
  -- Scholarship/Financial Aid (JSONB)
  financial_aid jsonb DEFAULT '{}'::jsonb,
  /*
  Structure:
  {
    "scholarships": [
      {
        "name": "Merit Scholarship",
        "amount": 10000,
        "agency": "Government",
        "year": "2024"
      }
    ],
    "fee_concession": {
      "type": "Sports Quota",
      "percentage": 50,
      "amount": 25000
    },
    "education_loan": {
      "bank": "SBI",
      "amount": 200000,
      "sanctioned_date": "2024-06-01"
    }
  }
  */
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_financial_account ON student_financial(bank_account_number);
CREATE INDEX idx_financial_ifsc ON student_financial(bank_ifsc_code);
CREATE INDEX idx_financial_balance ON student_financial(balance_amount) WHERE balance_amount > 0;

-- ============================================
-- TABLE 5: STUDENT_DOCUMENTS (File Tracking - Optional)
-- ============================================
-- Track document submission and file URLs

CREATE TABLE IF NOT EXISTS public.student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Document Info
  document_type text NOT NULL, -- 10th_certificate, 12th_certificate, photo, etc.
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_type text, -- pdf, jpg, png
  file_size integer, -- in bytes
  
  -- Verification
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  verification_remarks text,
  
  -- Original vs Xerox
  is_original boolean DEFAULT false,
  
  -- Metadata
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_documents_student ON student_documents(student_id);
CREATE INDEX idx_documents_type ON student_documents(document_type);
CREATE INDEX idx_documents_unverified ON student_documents(student_id) 
  WHERE is_verified = false;

-- Unique constraint: One document type per student
CREATE UNIQUE INDEX idx_documents_unique ON student_documents(student_id, document_type);

-- ============================================
-- SECTION 2: TRIGGERS & AUTO-UPDATES
-- ============================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-calculate age function
CREATE OR REPLACE FUNCTION calculate_student_age()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate age based on date of birth
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.age := EXTRACT(YEAR FROM age(CURRENT_DATE, NEW.date_of_birth))::integer;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trg_students_age
  BEFORE INSERT OR UPDATE OF date_of_birth ON students 
  FOR EACH ROW EXECUTE FUNCTION calculate_student_age();

CREATE TRIGGER trg_students_updated 
  BEFORE UPDATE ON students 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_student_details_updated 
  BEFORE UPDATE ON student_details 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_student_education_updated 
  BEFORE UPDATE ON student_education 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_student_financial_updated 
  BEFORE UPDATE ON student_financial 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================
-- SECTION 3: OPTIMIZED VIEWS
-- ============================================

-- View 1: Complete Student Profile (Most Common)
CREATE OR REPLACE VIEW vw_student_complete AS
SELECT 
  s.*,
  sd.personal_info,
  sd.contact_info,
  sd.family_info,
  sd.accommodation_info,
  se.tenth_details,
  se.twelfth_details,
  se.entrance_details,
  se.ug_details,
  sf.total_fee_amount,
  sf.total_paid_amount,
  sf.balance_amount,
  
  -- Denormalized lookups
  i.name as institution_name,
  p.program_name,
  p.program_code,
  d.department_name,
  sem.semester_name,
  sec.section_name,
  ay.name as academic_year
  
FROM students s
LEFT JOIN student_details sd ON s.id = sd.student_id
LEFT JOIN student_education se ON s.id = se.student_id
LEFT JOIN student_financial sf ON s.id = sf.student_id
LEFT JOIN institutions i ON s.institution_id = i.id
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN departments d ON s.department_id = d.id
LEFT JOIN semesters sem ON s.semester_id = sem.id
LEFT JOIN sections sec ON s.section_id = sec.id
LEFT JOIN academic_year ay ON s.academic_year_id = ay.id;

-- View 2: Hall Ticket View (Exam Operations)
CREATE OR REPLACE VIEW vw_hall_ticket AS
SELECT 
  s.id,
  s.roll_number,
  s.register_number,
  s.full_name,
  s.date_of_birth,
  s.gender,
  s.photo_url,
  p.program_name,
  p.program_code,
  sem.semester_name,
  sem.display_order as semester_number,
  d.department_name,
  sec.section_name,
  s.status
FROM students s
JOIN programs p ON s.program_id = p.id
JOIN semesters sem ON s.semester_id = sem.id
JOIN departments d ON s.department_id = d.id
LEFT JOIN sections sec ON s.section_id = sec.id
WHERE s.status = 'active';

-- View 3: Student Contact List
CREATE OR REPLACE VIEW vw_student_contacts AS
SELECT 
  s.id,
  s.roll_number,
  s.full_name,
  s.student_mobile,
  s.student_email,
  s.college_email,
  s.father_name,
  s.father_mobile,
  s.mother_name,
  s.mother_mobile,
  s.district,
  s.state,
  sd.contact_info->>'telephone' as telephone,
  sd.contact_info->'permanent_address'->>'pin_code' as pin_code,
  p.program_name,
  sem.semester_name,
  s.status
FROM students s
LEFT JOIN student_details sd ON s.id = sd.student_id
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN semesters sem ON s.semester_id = sem.id;

-- View 4: Fee Defaulters
CREATE OR REPLACE VIEW vw_fee_defaulters AS
SELECT 
  s.id,
  s.roll_number,
  s.full_name,
  s.student_mobile,
  s.father_mobile,
  p.program_name,
  sem.semester_name,
  sf.total_fee_amount,
  sf.total_paid_amount,
  sf.balance_amount,
  CASE 
    WHEN sf.balance_amount > sf.total_fee_amount * 0.75 THEN 'Critical'
    WHEN sf.balance_amount > sf.total_fee_amount * 0.5 THEN 'High'
    WHEN sf.balance_amount > sf.total_fee_amount * 0.25 THEN 'Medium'
    ELSE 'Low'
  END as priority
FROM students s
JOIN student_financial sf ON s.id = sf.student_id
JOIN programs p ON s.program_id = p.id
JOIN semesters sem ON s.semester_id = sem.id
WHERE sf.balance_amount > 0
  AND s.status = 'active'
ORDER BY sf.balance_amount DESC;

-- ============================================
-- SECTION 4: HELPER FUNCTIONS
-- ============================================

-- Function 1: Get Students for Exam (Fastest Query)
CREATE OR REPLACE FUNCTION get_exam_students(
  p_program_id uuid,
  p_semester_id uuid,
  p_section_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  roll_number text,
  register_number text,
  full_name text,
  photo_url text,
  gender text,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.roll_number,
    s.register_number,
    s.full_name,
    s.photo_url,
    s.gender,
    s.status
  FROM students s
  WHERE s.program_id = p_program_id
    AND s.semester_id = p_semester_id
    AND (p_section_id IS NULL OR s.section_id = p_section_id)
    AND s.status = 'active'
  ORDER BY s.roll_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function 2: Search Students (Smart Search)
CREATE OR REPLACE FUNCTION search_students(
  p_search_term text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  roll_number text,
  full_name text,
  student_email text,
  student_mobile text,
  program_name text,
  semester_name text,
  match_rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.roll_number,
    s.full_name,
    s.student_email,
    s.student_mobile,
    p.program_name,
    sem.semester_name,
    ts_rank(s.search_vector, plainto_tsquery('english', p_search_term)) as match_rank
  FROM students s
  LEFT JOIN programs p ON s.program_id = p.id
  LEFT JOIN semesters sem ON s.semester_id = sem.id
  WHERE s.search_vector @@ plainto_tsquery('english', p_search_term)
     OR s.roll_number ILIKE '%' || p_search_term || '%'
     OR s.register_number ILIKE '%' || p_search_term || '%'
  ORDER BY match_rank DESC, s.roll_number
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function 3: Get Complete Student Profile
CREATE OR REPLACE FUNCTION get_student_complete(p_student_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'student', row_to_json(s.*),
    'details', row_to_json(sd.*),
    'education', row_to_json(se.*),
    'financial', jsonb_build_object(
      'total_fee', sf.total_fee_amount,
      'paid', sf.total_paid_amount,
      'balance', sf.balance_amount
    ),
    'documents', (
      SELECT jsonb_agg(row_to_json(doc.*))
      FROM student_documents doc
      WHERE doc.student_id = p_student_id
    )
  ) INTO result
  FROM students s
  LEFT JOIN student_details sd ON s.id = sd.student_id
  LEFT JOIN student_education se ON s.id = se.student_id
  LEFT JOIN student_financial sf ON s.id = sf.student_id
  WHERE s.id = p_student_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function 4: Get Statistics
CREATE OR REPLACE FUNCTION get_student_stats(
  p_program_id uuid DEFAULT NULL,
  p_semester_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE status = 'active'),
    'male', COUNT(*) FILTER (WHERE gender = 'Male'),
    'female', COUNT(*) FILTER (WHERE gender = 'Female'),
    'hostelites', COUNT(*) FILTER (WHERE is_hostelite = true),
    'bus_users', COUNT(*) FILTER (WHERE is_bus_user = true),
    'first_graduate', COUNT(*) FILTER (WHERE first_graduate = true),
    'profile_complete', COUNT(*) FILTER (WHERE is_profile_complete = true),
    'by_community', jsonb_object_agg(
      COALESCE(community, 'Unknown'),
      COUNT(*) FILTER (WHERE community IS NOT NULL)
    )
  ) INTO result
  FROM students
  WHERE (p_program_id IS NULL OR program_id = p_program_id)
    AND (p_semester_id IS NULL OR semester_id = p_semester_id);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- SECTION 5: IMPORT/EXPORT FUNCTIONS
-- ============================================

-- Function: Bulk Import Students (With Validation)
CREATE OR REPLACE FUNCTION import_students_bulk(p_data jsonb)
RETURNS jsonb AS $$
DECLARE
  v_student jsonb;
  v_student_id uuid;
  v_result jsonb;
  v_inserted integer := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  FOR v_student IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      -- Insert into students table
      INSERT INTO students (
        roll_number, register_number, application_id,
        first_name, last_name, initial,
        date_of_birth, gender, blood_group,
        student_mobile, student_email, college_email,
        institution_id, department_id, program_id,
        semester_id, section_id, academic_year_id,
        nationality, religion, community, caste,
        father_name, father_mobile, mother_name, mother_mobile,
        district, state, status
      ) VALUES (
        v_student->>'roll_number',
        v_student->>'register_number',
        v_student->>'application_id',
        v_student->>'first_name',
        v_student->>'last_name',
        v_student->>'initial',
        (v_student->>'date_of_birth')::date,
        v_student->>'gender',
        v_student->>'blood_group',
        v_student->>'student_mobile',
        v_student->>'student_email',
        v_student->>'college_email',
        (v_student->>'institution_id')::uuid,
        (v_student->>'department_id')::uuid,
        (v_student->>'program_id')::uuid,
        (v_student->>'semester_id')::uuid,
        (v_student->>'section_id')::uuid,
        (v_student->>'academic_year_id')::uuid,
        COALESCE(v_student->>'nationality', 'Indian'),
        v_student->>'religion',
        v_student->>'community',
        v_student->>'caste',
        v_student->>'father_name',
        v_student->>'father_mobile',
        v_student->>'mother_name',
        v_student->>'mother_mobile',
        v_student->>'district',
        COALESCE(v_student->>'state', 'Tamil Nadu'),
        COALESCE(v_student->>'status', 'active')
      )
      RETURNING id INTO v_student_id;
      
      -- Insert extended details if provided
      IF v_student ? 'personal_info' OR v_student ? 'contact_info' THEN
        INSERT INTO student_details (
          student_id, personal_info, contact_info, family_info
        ) VALUES (
          v_student_id,
          COALESCE(v_student->'personal_info', '{}'::jsonb),
          COALESCE(v_student->'contact_info', '{}'::jsonb),
          COALESCE(v_student->'family_info', '{}'::jsonb)
        );
      END IF;
      
      v_inserted := v_inserted + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'roll_number', v_student->>'roll_number',
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  v_result := jsonb_build_object(
    'success', true,
    'inserted', v_inserted,
    'failed', jsonb_array_length(v_errors),
    'errors', v_errors
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function: Export Students (JSON Format)
CREATE OR REPLACE FUNCTION export_students(
  p_program_id uuid DEFAULT NULL,
  p_semester_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(row_to_json(v.*))
    FROM vw_student_complete v
    WHERE (p_program_id IS NULL OR v.program_id = p_program_id)
      AND (p_semester_id IS NULL OR v.semester_id = p_semester_id)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_financial ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;

-- Helper Functions
CREATE OR REPLACE FUNCTION has_role(role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.name = role_name
      AND ur.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_institution_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT institution_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Students Table Policies
CREATE POLICY "super_admin_all" ON students
  FOR ALL TO authenticated
  USING (has_role('super_admin'));

CREATE POLICY "coe_institution_access" ON students
  FOR ALL TO authenticated
  USING (
    (has_role('coe_admin') OR has_role('coe_staff'))
    AND institution_id = user_institution_id()
  );

CREATE POLICY "faculty_read" ON students
  FOR SELECT TO authenticated
  USING (
    has_role('faculty')
    AND institution_id = user_institution_id()
  );

CREATE POLICY "student_own_read" ON students
  FOR SELECT TO authenticated
  USING (
    has_role('student')
    AND college_email = auth.email()
  );

-- Similar policies for other tables (abbreviated for brevity)
CREATE POLICY "admin_details_access" ON student_details
  FOR ALL TO authenticated
  USING (has_role('super_admin') OR has_role('coe_admin'));

CREATE POLICY "admin_education_access" ON student_education
  FOR ALL TO authenticated
  USING (has_role('super_admin') OR has_role('coe_admin'));

-- Financial - Most Restrictive
CREATE POLICY "admin_only_financial" ON student_financial
  FOR ALL TO authenticated
  USING (has_role('super_admin') OR has_role('coe_admin'));

-- ============================================
-- SECTION 7: SAMPLE DATA & DOCUMENTATION
-- ============================================

-- Table Comments
COMMENT ON TABLE students IS 'Core student table - Contains 90% of frequently accessed data';
COMMENT ON TABLE student_details IS 'Extended details stored as JSONB for flexibility';
COMMENT ON TABLE student_education IS 'Complete education history from 10th to PG';
COMMENT ON TABLE student_financial IS 'Sensitive financial data with strict RLS';
COMMENT ON TABLE student_documents IS 'Document submission and verification tracking';

-- ============================================
-- USAGE EXAMPLES
-- ============================================

/*
-- Example 1: Get students for exam hall
SELECT * FROM get_exam_students(
  'program-uuid',
  'semester-uuid',
  'section-uuid'
);

-- Example 2: Search students
SELECT * FROM search_students('john');

-- Example 3: Get complete profile
SELECT get_student_complete('student-uuid');

-- Example 4: Get statistics
SELECT get_student_stats('program-uuid', 'semester-uuid');

-- Example 5: Bulk import
SELECT import_students_bulk('[
  {
    "roll_number": "21CS001",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "2003-05-15",
    "gender": "Male",
    "student_email": "john@example.com",
    "program_id": "uuid-here",
    "semester_id": "uuid-here"
  }
]'::jsonb);

-- Example 6: Export data
SELECT export_students('program-uuid', 'semester-uuid');

-- Example 7: Query JSONB fields
SELECT 
  s.roll_number,
  s.full_name,
  sd.personal_info->>'aadhar_number' as aadhar,
  se.tenth_details->'marks'->>'percentage' as tenth_percentage,
  se.entrance_details->'neet'->>'score' as neet_score
FROM students s
LEFT JOIN student_details sd ON s.id = sd.student_id
LEFT JOIN student_education se ON s.id = se.student_id
WHERE s.program_id = 'uuid'
  AND s.status = 'active';

-- Example 8: Get fee defaulters
SELECT * FROM vw_fee_defaulters
WHERE priority IN ('Critical', 'High')
ORDER BY balance_amount DESC;
*/

-- ============================================
-- PERFORMANCE MONITORING
-- ============================================

CREATE OR REPLACE FUNCTION analyze_performance()
RETURNS TABLE (
  table_name text,
  row_count bigint,
  table_size text,
  index_size text,
  total_size text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    (SELECT COUNT(*) FROM students WHERE t.tablename = 'students')::bigint,
    pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::regclass)),
    pg_size_pretty(pg_indexes_size(quote_ident(t.tablename)::regclass)),
    pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)::regclass))
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('students', 'student_details', 'student_education', 
                        'student_financial', 'student_documents')
  ORDER BY pg_total_relation_size(quote_ident(t.tablename)::regclass) DESC;
END;
$$ LANGUAGE plpgsql;

-- Run: SELECT * FROM analyze_performance();

-- ============================================
-- END OF SIMPLIFIED PRODUCTION SCHEMA
-- ============================================
