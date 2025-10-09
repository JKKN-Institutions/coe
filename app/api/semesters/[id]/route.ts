import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { id } = await params

    const { institution_code, program_code, semester_code, semester_name, display_name, semester_type, semester_group, display_order, initial_semester, terminal_semester } = body

    // 1. Validate and fetch institutions_id from institution_code (required)
    if (!institution_code) {
      return NextResponse.json({
        error: 'Institution code is required'
      }, { status: 400 })
    }

    const { data: institutionData, error: institutionError } = await supabase
      .from('institutions')
      .select('id')
      .eq('institution_code', String(institution_code))
      .single()

    if (institutionError || !institutionData) {
      return NextResponse.json({
        error: `Institution with code "${institution_code}" not found. Please ensure the institution exists.`
      }, { status: 400 })
    }

    // 2. Validate and fetch program_id from program_code (required)
    if (!program_code) {
      return NextResponse.json({
        error: 'Program code is required'
      }, { status: 400 })
    }

    const { data: programData, error: programError } = await supabase
      .from('programs')
      .select('id')
      .eq('program_code', String(program_code))
      .single()

    if (programError || !programData) {
      return NextResponse.json({
        error: `Program with code "${program_code}" not found. Please ensure the program exists.`
      }, { status: 400 })
    }

    // 3. Check for conflicts with existing semester (institutions_id, program_id, semester_name) combination
    if (semester_name) {
      const { data: existingSemester, error: checkError } = await supabase
        .from('semesters')
        .select('id, semester_name, institution_code, program_code')
        .eq('institutions_id', institutionData.id)
        .eq('program_id', programData.id)
        .eq('semester_name', semester_name)
        .neq('id', id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for conflicts:', checkError)
        return NextResponse.json({ error: 'Failed to check for conflicts' }, { status: 500 })
      }

      if (existingSemester) {
        return NextResponse.json({
          error: `Semester conflict: A semester with institution "${institution_code}", program "${program_code}", and name "${semester_name}" already exists. Please choose a different name.`
        }, { status: 409 })
      }
    }

    // 4. Update with both IDs and codes
    const { data, error } = await supabase
      .from('semesters')
      .update({
        institutions_id: institutionData.id,
        institution_code: String(institution_code),
        program_id: programData.id,
        program_code: String(program_code),
        semester_code: String(semester_code || ''),
        semester_name: String(semester_name || ''),
        display_name: display_name ? String(display_name) : null,
        semester_type: semester_type ? String(semester_type) : null,
        semester_group: semester_group ? String(semester_group) : null,
        display_order: display_order ? Number(display_order) : null,
        initial_semester: Boolean(initial_semester),
        terminal_semester: Boolean(terminal_semester)
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Supabase error:', error)

      // Handle foreign key constraint errors
      if (error.code === '23503') {
        return NextResponse.json({
          error: 'Foreign key constraint failed. Ensure institution and program exist.'
        }, { status: 400 })
      }

      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({
          error: `Semester conflict: A semester with this institution, program, and name combination already exists. Please choose a different name.`
        }, { status: 409 })
      }

      return NextResponse.json({ error: 'Failed to update semester' }, { status: 500 })
    }

    return NextResponse.json(data?.[0] ?? null)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('semesters')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to delete semester' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Semester deleted successfully' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

