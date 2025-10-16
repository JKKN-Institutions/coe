import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET - Fetch exam timetables with optional filters
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServer()
    const { searchParams } = new URL(request.url)
    const examination_session_id = searchParams.get('examination_session_id')
    const program_id = searchParams.get('program_id')
    const semester_id = searchParams.get('semester_id')
    const is_published = searchParams.get('is_published')

    let query = supabase
      .from('exam_timetables')
      .select(`
        *,
        institutions!inner(
          id,
          institution_code,
          institution_name
        ),
        examination_sessions!inner(
          id,
          session_name,
          session_code
        ),
        course_offerings!inner(
          id,
          semester,
          courses!inner(
            id,
            course_code,
            course_title
          ),
          programs!inner(
            id,
            program_code,
            program_name,
            program_type
          )
        )
      `)
      .order('exam_date', { ascending: true })
      .order('created_at', { ascending: false })

    // Apply filters
    if (examination_session_id) {
      query = query.eq('examination_session_id', examination_session_id)
    }

    if (program_id) {
      query = query.eq('course_offerings.programs.id', program_id)
    }

    if (semester_id) {
      query = query.eq('course_offerings.semester_id', semester_id)
    }

    if (is_published !== null && is_published !== undefined) {
      query = query.eq('is_published', is_published === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('Exam timetables fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch exam timetables' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e) {
    console.error('Exam timetables API error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new exam timetable entry
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()

    // Validate required fields
    if (!body.institutions_id) {
      return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
    }
    if (!body.examination_session_id) {
      return NextResponse.json({ error: 'Examination Session ID is required' }, { status: 400 })
    }
    if (!body.course_offering_id) {
      return NextResponse.json({ error: 'Course Offering ID is required' }, { status: 400 })
    }
    if (!body.exam_date) {
      return NextResponse.json({ error: 'Exam Date is required' }, { status: 400 })
    }
    if (!body.session) {
      return NextResponse.json({ error: 'Session (FN/AN) is required' }, { status: 400 })
    }

    const insertPayload: any = {
      institutions_id: body.institutions_id,
      examination_session_id: body.examination_session_id,
      course_offering_id: body.course_offering_id,
      exam_date: body.exam_date,
      session: body.session,
      exam_mode: body.exam_mode || 'Offline',
      is_published: body.is_published ?? false,
      instructions: body.instructions || null,
      created_by: body.created_by || null,
    }

    const { data, error } = await supabase
      .from('exam_timetables')
      .insert([insertPayload])
      .select(`
        *,
        institutions!inner(
          id,
          institution_code,
          institution_name
        ),
        examination_sessions!inner(
          id,
          session_name,
          session_code
        ),
        course_offerings!inner(
          id,
          semester,
          courses!inner(
            id,
            course_code,
            course_title
          ),
          programs!inner(
            id,
            program_code,
            program_name,
            program_type
          )
        )
      `)
      .single()

    if (error) {
      console.error('Error creating exam timetable:', error)

      // Handle duplicate key constraint violation
      if (error.code === '23505') {
        return NextResponse.json({
          error: 'Exam timetable entry already exists for this course, date, and session.'
        }, { status: 400 })
      }

      // Handle foreign key constraint violation
      if (error.code === '23503') {
        return NextResponse.json({
          error: 'Invalid reference. Please ensure course offering, session, and institution exist.'
        }, { status: 400 })
      }

      return NextResponse.json({ error: 'Failed to create exam timetable' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error('Exam timetable creation error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update existing exam timetable entry
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()

    if (!body.id) {
      return NextResponse.json({ error: 'Exam timetable ID is required' }, { status: 400 })
    }

    const updatePayload: any = {
      examination_session_id: body.examination_session_id,
      course_offering_id: body.course_offering_id,
      exam_date: body.exam_date,
      session: body.session,
      exam_mode: body.exam_mode || 'Offline',
      is_published: body.is_published ?? false,
      instructions: body.instructions || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('exam_timetables')
      .update(updatePayload)
      .eq('id', body.id)
      .select(`
        *,
        institutions!inner(
          id,
          institution_code,
          institution_name
        ),
        examination_sessions!inner(
          id,
          session_name,
          session_code
        ),
        course_offerings!inner(
          id,
          semester,
          courses!inner(
            id,
            course_code,
            course_title
          ),
          programs!inner(
            id,
            program_code,
            program_name,
            program_type
          )
        )
      `)
      .single()

    if (error) {
      console.error('Error updating exam timetable:', error)

      // Handle duplicate key constraint violation
      if (error.code === '23505') {
        return NextResponse.json({
          error: 'Exam timetable entry already exists for this course, date, and session.'
        }, { status: 400 })
      }

      // Handle foreign key constraint violation
      if (error.code === '23503') {
        return NextResponse.json({
          error: 'Invalid reference. Please ensure course offering and session exist.'
        }, { status: 400 })
      }

      return NextResponse.json({ error: 'Failed to update exam timetable' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('Exam timetable update error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete exam timetable entry
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Exam timetable ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseServer()

    const { error } = await supabase
      .from('exam_timetables')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting exam timetable:', error)
      return NextResponse.json({ error: 'Failed to delete exam timetable' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Exam timetable deletion error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
