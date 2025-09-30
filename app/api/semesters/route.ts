import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('semester')
      .select('*')
      .order('institution_code', { ascending: true })
      .order('degree_code', { ascending: true })
      .order('display_order', { ascending: true })

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

    // Check for conflicts with existing semester (institution_code, degree_code, semester_name) combination
    if (body.institution_code && body.degree_code && body.semester_name) {
      const { data: existingSemester, error: checkError } = await supabase
        .from('semester')
        .select('id, semester_name, institution_code, degree_code')
        .eq('institution_code', body.institution_code)
        .eq('degree_code', body.degree_code)
        .eq('semester_name', body.semester_name)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for conflicts:', checkError)
        return NextResponse.json({ error: 'Failed to check for conflicts' }, { status: 500 })
      }

      if (existingSemester) {
        return NextResponse.json({
          error: `Semester conflict: A semester with institution "${body.institution_code}", degree "${body.degree_code}", and name "${body.semester_name}" already exists. Please choose a different name.`
        }, { status: 409 })
      }
    }

    const { data, error } = await supabase
      .from('semester')
      .insert([body])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      
      // Check for unique constraint violation
      if (error.code === '23505' && error.constraint === 'semesters_institution_degree_semester_unique') {
        return NextResponse.json({ 
          error: `Semester conflict: A semester with this institution, degree, and name combination already exists. Please choose a different name.` 
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

