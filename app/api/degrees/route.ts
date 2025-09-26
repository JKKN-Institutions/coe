import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: list degrees
export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('degree')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Degrees table error:', error)
      return NextResponse.json({ error: 'Failed to fetch degrees' }, { status: 500 })
    }
    const normalized = (data || []).map((row: any) => ({
      ...row,
      is_active: row.status ?? row.is_active ?? true,
    }))
    return NextResponse.json(normalized)
  } catch (e) {
    console.error('Degrees API error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: create degree
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()

    // If institution_code missing, try to resolve from institution_id (optional)
    let institution_code: string | undefined = body.institution_code
    if (!institution_code && body.institution_id) {
      const { data: inst } = await supabase
        .from('institutions')
        .select('institution_code')
        .eq('id', body.institution_id)
        .maybeSingle()
      if (inst?.institution_code) institution_code = inst.institution_code
    }

    const insertPayload: any = {
      degree_code: body.degree_code,
      degree_name: body.degree_name,
      display_name: body.display_name ?? null,
      status: body.is_active ?? true,
    }
    if (body.description !== undefined) insertPayload.description = body.description ?? null
    if (institution_code) insertPayload.institution_code = institution_code
    // Only include institution_id if provided; request says to skip if not used
    if (body.institution_id) insertPayload.institution_id = body.institution_id

    const { data, error } = await supabase
      .from('degree')
      .insert([insertPayload])
      .select()
      .single()

    if (error) {
      console.error('Error creating degree:', error)
      return NextResponse.json({ error: 'Failed to create degree' }, { status: 500 })
    }

    const normalized = data ? { ...data, is_active: (data as any).status ?? (data as any).is_active ?? true } : data
    return NextResponse.json(normalized, { status: 201 })
  } catch (e) {
    console.error('Degree creation error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: update degree
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()

    const updatePayload: any = {
      degree_code: body.degree_code,
      degree_name: body.degree_name,
      display_name: body.display_name ?? null,
      status: body.is_active,
    }
    if (body.description !== undefined) updatePayload.description = body.description ?? null
    if (body.institution_code) updatePayload.institution_code = body.institution_code
    if (body.institution_id) updatePayload.institution_id = body.institution_id

    const { data, error } = await supabase
      .from('degree')
      .update(updatePayload)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating degree:', error)
      return NextResponse.json({ error: 'Failed to update degree' }, { status: 500 })
    }

    const normalized = data ? { ...data, is_active: (data as any).status ?? (data as any).is_active ?? true } : data
    return NextResponse.json(normalized)
  } catch (e) {
    console.error('Degree update error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: delete degree by id
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Degree ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseServer()
    
    const { error } = await supabase
      .from('degree')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting degree:', error)
      return NextResponse.json({ error: 'Failed to delete degree' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Degree deletion error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


