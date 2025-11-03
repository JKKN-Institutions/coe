import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServer()
    const { searchParams } = new URL(request.url)
    const program_id = searchParams.get('program_id')
    const program_code = searchParams.get('program_code')
    const institution_id = searchParams.get('institution_id')
    const institution_code = searchParams.get('institution_code')

    let query = supabase
      .from('semesters')
      .select('*', { count: 'exact' })
      .order('institution_code', { ascending: true })
      .order('program_code', { ascending: true })
      .order('display_order', { ascending: true })
      .range(0, 9999) // Increase limit from default 1000 to 10000 rows

    if (program_id) {
      query = query.eq('program_id', program_id)
    }
    if (program_code) {
      query = query.eq('program_code', program_code)
    }
    if (institution_id) {
      query = query.eq('institution_id', institution_id)
    }
    if (institution_code) {
      query = query.eq('institution_code', institution_code)
    }

    const { data, error } = await query

    if (error) {
      console.error('Semester table error:', error)
      return NextResponse.json({ error: 'Failed to fetch semesters' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Semesters API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('POST /api/semesters - Request body:', body)
    const supabase = getSupabaseServer()

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

    // 4. Insert with both IDs and codes
    const { data, error } = await supabase
      .from('semesters')
      .insert([{
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
      }])
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

      return NextResponse.json({
        error: `Failed to create semester: ${error.message || 'Unknown database error'}`,
        details: error
      }, { status: 500 })
    }

    return NextResponse.json(data?.[0] ?? null, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

