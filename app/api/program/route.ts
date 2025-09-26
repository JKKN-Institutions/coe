import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('program')
      .select(`
        id,
        institution_code,
        degree_code,
        offering_department_code,
        program_code,
        program_name,
        display_name,
        program_duration_yrs,
        pattern_type,
        is_active,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Program table error:', error)
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e) {
    console.error('Program API error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()

    const insertPayload: any = {
      institution_code: body.institution_code,
      degree_code: body.degree_code,
      offering_department_code: body.offering_department_code ?? null,
      program_code: body.program_code,
      program_name: body.program_name,
      display_name: body.display_name ?? null,
      program_duration_yrs: Number(body.program_duration_yrs ?? 3),
      pattern_type: body.pattern_type === 'Year' ? 'Year' : 'Semester',
      is_active: body.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!insertPayload.institution_code || !insertPayload.degree_code || !insertPayload.program_code || !insertPayload.program_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('program')
      .insert([insertPayload])
      .select(`
        id,
        institution_code,
        degree_code,
        offering_department_code,
        program_code,
        program_name,
        display_name,
        program_duration_yrs,
        pattern_type,
        is_active,
        created_at
      `)
      .single()

    if (error) {
      console.error('Error creating program:', error)
      return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error('Program creation error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseServer()
    const updatePayload: any = {
      institution_code: body.institution_code,
      degree_code: body.degree_code,
      offering_department_code: body.offering_department_code ?? null,
      program_code: body.program_code,
      program_name: body.program_name,
      display_name: body.display_name ?? null,
      program_duration_yrs: Number(body.program_duration_yrs ?? 3),
      pattern_type: body.pattern_type === 'Year' ? 'Year' : 'Semester',
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('program')
      .update(updatePayload)
      .eq('id', body.id)
      .select(`
        id,
        institution_code,
        degree_code,
        offering_department_code,
        program_code,
        program_name,
        display_name,
        program_duration_yrs,
        pattern_type,
        is_active,
        created_at
      `)
      .single()

    if (error) {
      console.error('Error updating program:', error)
      return NextResponse.json({ error: 'Failed to update program' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('Program update error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseServer()
    const { error } = await supabase
      .from('program')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting program:', error)
      return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Program deletion error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


