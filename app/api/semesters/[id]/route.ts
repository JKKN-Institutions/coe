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

    // Check if there's a conflict with existing semester (institution_code, degree_code, semester_name) combination
    if (body.institution_code && body.degree_code && body.semester_name) {
      const { data: existingSemester, error: checkError } = await supabase
        .from('semesters')
        .select('id, semester_name, institution_code, degree_code')
        .eq('institution_code', body.institution_code)
        .eq('degree_code', body.degree_code)
        .eq('semester_name', body.semester_name)
        .neq('id', id)
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
      .from('semesters')
      .update(body)
      .eq('id', id)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      
      // Check for unique constraint violation
      if (error.code === '23505' && error.constraint === 'semesters_institution_degree_semester_unique') {
        return NextResponse.json({ 
          error: `Semester conflict: A semester with this institution, degree, and name combination already exists. Please choose a different name.` 
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

