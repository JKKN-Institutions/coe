import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServer()
    const { id } = await params
    const { data, error } = await supabase
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
      .eq('id', id)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServer()
    const { id } = await params
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
      approved_by,
      approved_at,
      is_active 
    } = body as Record<string, unknown>

    const data: Record<string, unknown> = {
      ...(program_id !== undefined && { program_id: String(program_id) }),
      ...(course_code !== undefined && { course_code: String(course_code) }),
      ...(course_title !== undefined && { course_title: String(course_title) }),
      ...(course_type !== undefined && { course_type: String(course_type) }),
      ...(credits !== undefined && { credits: Number(credits) }),
      ...(contact_hours !== undefined && { contact_hours: contact_hours }),
      ...(prerequisites !== undefined && { prerequisites: prerequisites }),
      ...(corequisites !== undefined && { corequisites: corequisites }),
      ...(course_level !== undefined && { course_level: String(course_level) }),
      ...(offering_department_id !== undefined && { offering_department_id: offering_department_id ? String(offering_department_id) : null }),
      ...(course_coordinator_id !== undefined && { course_coordinator_id: course_coordinator_id ? String(course_coordinator_id) : null }),
      ...(approved_by !== undefined && { approved_by: approved_by ? String(approved_by) : null }),
      ...(approved_at !== undefined && { approved_at: approved_at ? String(approved_at) : null }),
      ...(is_active !== undefined && { is_active: Boolean(is_active) }),
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await supabase
      .from('courses')
      .update(data)
      .eq('id', id)
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
        )
      `)
      .single()

    if (error) throw error
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServer()
    const { id } = await params
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}
