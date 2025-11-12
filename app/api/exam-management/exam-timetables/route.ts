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

    // Fetch exam timetables with joins
    let query = supabase
      .from('exam_timetables')
      .select(`
        *,
        institutions(id, institution_code, name),
        examination_sessions(id, session_code, session_name),
        course_offerings(
          id,
          course_id,
          program_id,
          semester,
          course_mapping:course_id(id, course_code, course_title),
          programs(id, program_code, program_name)
        )
      `)
      .order('exam_date', { ascending: true })
      .order('created_at', { ascending: false })

    // Apply filters
    if (examination_session_id) {
      query = query.eq('examination_session_id', examination_session_id)
    }

    if (program_id) {
      query = query.eq('course_offerings.program_id', program_id)
    }

    if (semester_id) {
      query = query.eq('course_offerings.semester', parseInt(semester_id))
    }

    if (is_published !== null && is_published !== undefined) {
      query = query.eq('is_published', is_published === 'true')
    }

    const { data: timetables, error } = await query

    if (error) {
      console.error('Exam timetables fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch exam timetables' }, { status: 500 })
    }

    // For each timetable, fetch student count and course count
    const enrichedData = await Promise.all((timetables || []).map(async (timetable) => {
      try {
        // Get student count for this exam (by date and session)
        const { count: studentCount, error: studentError } = await supabase
          .from('exam_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('exam_timetable_id', timetable.id)

        if (studentError) {
          console.warn('Error fetching student count:', studentError)
        }

        // Get course count for this date and session
        const { count: courseCount, error: courseError } = await supabase
          .from('exam_timetables')
          .select('id', { count: 'exact', head: true })
          .eq('institutions_id', timetable.institutions_id)
          .eq('exam_date', timetable.exam_date)
          .eq('session', timetable.session)

        if (courseError) {
          console.warn('Error fetching course count:', courseError)
        }

        // Get seat allocation count from room_allocations
        const { data: allocations, error: seatError } = await supabase
          .from('room_allocations')
          .select('seats_allocated')
          .eq('exam_timetable_id', timetable.id)

        if (seatError) {
          console.warn('Error fetching seat allocation count:', seatError)
        }

        // Sum up all allocated seats
        const totalSeatsAllocated = allocations?.reduce((sum, alloc) => sum + (alloc.seats_allocated || 0), 0) || 0

        return {
          ...timetable,
          student_count: studentCount || 0,
          course_count: courseCount || 0,
          seat_alloc_count: totalSeatsAllocated,
          institution_code: timetable.institutions?.institution_code || 'N/A',
          institution_name: timetable.institutions?.name || 'N/A',
          session_code: timetable.examination_sessions?.session_code || 'N/A',
          session_name: timetable.examination_sessions?.session_name || 'N/A',
          course_code: timetable.course_offerings?.course_mapping?.course_code || 'N/A',
          course_name: timetable.course_offerings?.course_mapping?.course_title || 'N/A',
          program_code: timetable.course_offerings?.programs?.program_code || 'N/A',
          program_name: timetable.course_offerings?.programs?.program_name || 'N/A',
        }
      } catch (err) {
        console.error('Error enriching timetable data:', err)
        return {
          ...timetable,
          student_count: 0,
          course_count: 0,
          seat_alloc_count: 0,
          institution_code: (timetable as any).institutions?.institution_code || 'N/A',
          institution_name: (timetable as any).institutions?.name || 'N/A',
          session_code: (timetable as any).examination_sessions?.session_code || 'N/A',
          session_name: (timetable as any).examination_sessions?.session_name || 'N/A',
          course_code: (timetable as any).course_offerings?.course_mapping?.course_code || 'N/A',
          course_name: (timetable as any).course_offerings?.course_mapping?.course_title || 'N/A',
          program_code: (timetable as any).course_offerings?.programs?.program_code || 'N/A',
          program_name: (timetable as any).course_offerings?.programs?.program_name || 'N/A',
        }
      }
    }))

    return NextResponse.json(enrichedData)
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
      .select('*')
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
      .select('*')
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
