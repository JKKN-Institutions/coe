import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const program_id = searchParams.get('program_id')
    const course_type = searchParams.get('course_type')
    const course_level = searchParams.get('course_level')
    const is_active = searchParams.get('is_active')

    let query = supabaseServer
      .from('courses')
      .select(`
        *,
        programs:program_id (
          id,
          program_name,
          program_code
        ),
        departments:offering_department_id (
          id,
          department_name
        ),
        course_coordinator:course_coordinator_id (
          id,
          full_name,
          email
        ),
        created_by_user:created_by (
          id,
          full_name,
          email
        ),
        approved_by_user:approved_by (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`course_code.ilike.%${search}%,course_title.ilike.%${search}%`)
    }
    if (program_id) {
      query = query.eq('program_id', program_id)
    }
    if (course_type) {
      query = query.eq('course_type', course_type)
    }
    if (course_level) {
      query = query.eq('course_level', course_level)
    }
    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      
      // Check if courses table doesn't exist
      if (error.message.includes('relation "courses" does not exist')) {
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
      
      throw error
    }

    return NextResponse.json(data || [])
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
    const { 
      program_id, 
      course_code, 
      course_title, 
      course_type, 
      credits, 
      contact_hours, 
      prerequisites, 
      corequisites, 
      course_level, 
      offering_department_id, 
      course_coordinator_id, 
      created_by,
      is_active = true 
    } = body as Record<string, unknown>

    if (!program_id || !course_code || !course_title || !course_type || !credits) {
      return NextResponse.json({ 
        error: 'Missing required fields: program_id, course_code, course_title, course_type, and credits are required' 
      }, { status: 400 })
    }

    const { data, error } = await supabaseServer.from('courses').insert({
      program_id: String(program_id),
      course_code: String(course_code),
      course_title: String(course_title),
      course_type: String(course_type),
      credits: Number(credits),
      contact_hours: contact_hours || { lecture: 0, tutorial: 0, practical: 0 },
      prerequisites: prerequisites || [],
      corequisites: corequisites || [],
      course_level: course_level ? String(course_level) : 'Beginner',
      offering_department_id: offering_department_id ? String(offering_department_id) : null,
      course_coordinator_id: course_coordinator_id ? String(course_coordinator_id) : null,
      created_by: String(created_by),
      is_active: Boolean(is_active),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select(`
      *,
      programs:program_id (
        id,
        program_name,
        program_code
      ),
      departments:offering_department_id (
        id,
        department_name
      ),
      course_coordinator:course_coordinator_id (
        id,
        full_name,
        email
      )
    `).single()

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
