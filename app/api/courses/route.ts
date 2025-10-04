import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const program_id = searchParams.get('program_id')
    const course_type = searchParams.get('course_type')
    const course_level = searchParams.get('course_level')
    const is_active = searchParams.get('is_active')

<<<<<<< HEAD
    // NOTE: The actual table is public.course (singular). Select all fields
=======
    // NOTE: The actual table is public.course (singular). Select minimal fields
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
    const supabase = getSupabaseServer()
    let query = supabase
      .from('course')
      .select(`
        id,
<<<<<<< HEAD
        institutions_id,
        regulation_id,
        offering_department_id,
        institution_code,
        regulation_code,
        offering_department_code,
        course_code,
        course_name,
        display_code,
        course_category,
        course_type,
        course_part_master,
        credit,
        split_credit,
        theory_credit,
        practical_credit,
        qp_code,
        e_code_name,
        duration_hours,
        evaluation_type,
        result_type,
        self_study_course,
        outside_class_course,
        open_book,
        online_course,
        dummy_number_not_required,
        annual_course,
        multiple_qp_set,
        no_of_qp_setter,
        no_of_scrutinizer,
        fee_exception,
        syllabus_pdf_url,
        description,
=======
        course_code,
        course_name,
        course_type,
        credit,
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    // Apply filters against the real column names
    if (search) {
      query = query.or(`course_code.ilike.%${search}%,course_name.ilike.%${search}%`)
    }
    if (course_type) {
      query = query.eq('course_type', course_type)
    }
    if (is_active !== null) {
      query = query.eq('status', is_active === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      
      // Check if course table doesn't exist
      if (error.message.includes('relation "course" does not exist')) {
        return NextResponse.json({ 
          error: 'Courses table not found',
          message: 'The courses table needs to be created in your Supabase database',
          instructions: {
            step1: 'Go to your Supabase dashboard',
            step2: 'Navigate to SQL Editor',
            step3: 'Run the provided SQL script to create the courses table',
            sql: `
-- Create enum types first
DO $$ BEGIN
  CREATE TYPE course_type AS ENUM ('Core', 'Elective', 'Practical', 'Project');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE course_level AS ENUM ('Beginner', 'Intermediate', 'Advanced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  course_code VARCHAR(20) NOT NULL,
  course_title VARCHAR(255) NOT NULL,
  course_type course_type NOT NULL,
  credits DECIMAL(3,1) NOT NULL CHECK (credits > 0),
  contact_hours JSONB DEFAULT '{"lecture": 0, "tutorial": 0, "practical": 0}',
  prerequisites JSONB DEFAULT '[]',
  corequisites JSONB DEFAULT '[]',
  course_level course_level DEFAULT 'Beginner',
  offering_department_id UUID,
  course_coordinator_id UUID,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT unique_course_code UNIQUE (program_id, course_code)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_program_id ON courses(program_id);
CREATE INDEX IF NOT EXISTS idx_courses_course_type ON courses(course_type);
CREATE INDEX IF NOT EXISTS idx_courses_is_active ON courses(is_active);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at);
            `
          }
        }, { status: 404 })
      }

      // If joined select failed due to missing related tables/columns, try a simple select('*') fallback
      try {
        const simpleQuery = getSupabaseServer()
          .from('course')
          .select('*')
          .order('created_at', { ascending: false })

        const { data: simpleData, error: simpleErr } = await simpleQuery
        if (!simpleErr) {
          return NextResponse.json(simpleData || [])
        }
        console.error('Supabase simple select error:', simpleErr)
      } catch (fallbackErr) {
        console.error('Supabase fallback failed:', fallbackErr)
      }

      // Propagate original error with details
      return NextResponse.json({
        error: 'Failed to fetch courses',
        details: error.message || 'Unknown error'
      }, { status: 500 })
    }

    // Map real table fields to the shape expected by the frontend
    const mapped = (data || []).map((row: any) => ({
      id: row.id,
<<<<<<< HEAD
      institutions_id: row.institutions_id,
      regulation_id: row.regulation_id,
      offering_department_id: row.offering_department_id,
      institution_code: row.institution_code,
      regulation_code: row.regulation_code,
      offering_department_code: row.offering_department_code,
      course_code: row.course_code,
      course_title: row.course_name,
      display_code: row.display_code,
      course_category: row.course_category,
      course_type: row.course_type,
      course_part_master: row.course_part_master,
      credits: row.credit ?? 0,
      split_credit: row.split_credit,
      theory_credit: row.theory_credit,
      practical_credit: row.practical_credit,
      qp_code: row.qp_code,
      e_code_name: row.e_code_name,
      duration_hours: row.duration_hours,
      evaluation_type: row.evaluation_type,
      result_type: row.result_type,
      self_study_course: row.self_study_course,
      outside_class_course: row.outside_class_course,
      open_book: row.open_book,
      online_course: row.online_course,
      dummy_number_required: row.dummy_number_not_required,
      annual_course: row.annual_course,
      multiple_qp_set: row.multiple_qp_set,
      no_of_qp_setter: row.no_of_qp_setter,
      no_of_scrutinizer: row.no_of_scrutinizer,
      fee_exception: row.fee_exception,
      syllabus_pdf_url: row.syllabus_pdf_url,
      description: row.description,
=======
      course_code: row.course_code,
      course_title: row.course_name, // map to expected field
      course_type: row.course_type,
      credits: row.credit ?? 0,
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
      course_level: 'Beginner', // not available; provide a default
      is_active: row.status ?? true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))

    return NextResponse.json(mapped)
  } catch (err) {
    console.error('API Error:', err)
    return NextResponse.json({ 
      error: 'Failed to fetch courses', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = body as Record<string, unknown>

    if (!input.institution_code || !input.regulation_code || !input.course_code || !input.course_title) {
      return NextResponse.json({ 
        error: 'Missing required fields: institution_code, regulation_code, course_code, course_title' 
      }, { status: 400 })
    }

    const supabase2 = getSupabaseServer()
    const { data, error } = await supabase2.from('course').insert({
      institutions_id: input.institutions_id || null,
      regulation_id: input.regulation_id || null,
      offering_department_id: input.offering_department_id || null,
      institution_code: String(input.institution_code),
      regulation_code: String(input.regulation_code),
      offering_department_code: input.offering_department_code ? String(input.offering_department_code) : null,
      course_code: String(input.course_code),
      course_name: String(input.course_title),
      course_category: input.course_category ? String(input.course_category) : null,
      course_type: input.course_type ? String(input.course_type) : null,
      course_part_master: input.course_part_master ? String(input.course_part_master) : null,
      credit: input.credits !== undefined ? Number(input.credits) : null,
      split_credit: input.split_credit !== undefined ? Boolean(input.split_credit) : false,
      theory_credit: input.theory_credit !== undefined ? Number(input.theory_credit) : null,
      practical_credit: input.practical_credit !== undefined ? Number(input.practical_credit) : null,
      qp_code: input.qp_code ? String(input.qp_code) : null,
<<<<<<< HEAD
      ...(input.e_code_name && { e_code_name: String(input.e_code_name) }),
=======
      e_code_name: input.e_code_name ? String(input.e_code_name) : null,
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
      duration_hours: input.duration_hours !== undefined ? Number(input.duration_hours) : null,
      evaluation_type: input.evaluation_type ? String(input.evaluation_type) : null,
      result_type: input.result_type ? String(input.result_type) : 'Mark',
      self_study_course: input.self_study_course !== undefined ? Boolean(input.self_study_course) : false,
      outside_class_course: input.outside_class_course !== undefined ? Boolean(input.outside_class_course) : false,
      open_book: input.open_book !== undefined ? Boolean(input.open_book) : false,
      online_course: input.online_course !== undefined ? Boolean(input.online_course) : false,
<<<<<<< HEAD
      dummy_number_not_required: input.dummy_number_required !== undefined ? Boolean(input.dummy_number_required) : false,
=======
      dummy_number_not_required: input.dummy_number_not_required !== undefined ? Boolean(input.dummy_number_not_required) : true,
>>>>>>> 7dc009fabdfc05a849f2c23af941ad7b31e8a520
      annual_course: input.annual_course !== undefined ? Boolean(input.annual_course) : false,
      multiple_qp_set: input.multiple_qp_set !== undefined ? Boolean(input.multiple_qp_set) : false,
      no_of_qp_setter: input.no_of_qp_setter !== undefined ? Number(input.no_of_qp_setter) : null,
      no_of_scrutinizer: input.no_of_scrutinizer !== undefined ? Number(input.no_of_scrutinizer) : null,
      fee_exception: input.fee_exception !== undefined ? Boolean(input.fee_exception) : false,
      syllabus_pdf_url: input.syllabus_pdf_url ? String(input.syllabus_pdf_url) : null,
      description: input.description ? String(input.description) : null,
      status: input.is_active !== undefined ? Boolean(input.is_active) : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('*').single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('API Error:', err)
    return NextResponse.json({ 
      error: 'Failed to create course', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}