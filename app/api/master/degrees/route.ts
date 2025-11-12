import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: list degrees
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServer()
    const { searchParams } = new URL(request.url)
    const program_id = searchParams.get('program_id')
    const institutions_id = searchParams.get('institutions_id')

    let query = supabase
      .from('degrees')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, 9999) // Increase limit from default 1000 to 10000 rows

    if (program_id) {
      query = query.eq('program_id', program_id)
    }
    if (institutions_id) {
      query = query.eq('institutions_id', institutions_id)
    }

    const { data, error } = await query

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

    // Auto-map institution_code to institutions_id
    let institution_code: string | undefined = body.institution_code
    let institutions_id: string | undefined = body.institutions_id

    // If institution_code is provided, fetch institutions_id
    if (institution_code) {
      const { data: inst, error: instError } = await supabase
        .from('institutions')
        .select('id, institution_code')
        .eq('institution_code', institution_code)
        .maybeSingle()

      if (instError || !inst) {
        return NextResponse.json({
          error: `Invalid institution_code: ${institution_code}. Institution not found.`
        }, { status: 400 })
      }

      // Auto-map the institutions_id from the fetched institution
      institutions_id = inst.id
      console.log(`✅ Auto-mapped institution_code "${institution_code}" to institutions_id "${institutions_id}"`)
    }
    // If institutions_id is provided but no institution_code, fetch the code
    else if (institutions_id && !institution_code) {
      const { data: inst } = await supabase
        .from('institutions')
        .select('institution_code')
        .eq('id', institutions_id)
        .maybeSingle()
      if (inst?.institution_code) {
        institution_code = inst.institution_code
      }
    }

    // Validate required fields
    if (!institution_code || !institutions_id) {
      return NextResponse.json({
        error: 'institution_code is required and must be valid'
      }, { status: 400 })
    }

    const insertPayload: any = {
      degree_code: body.degree_code,
      degree_name: body.degree_name,
      display_name: body.display_name ?? null,
      status: body.is_active ?? true,
      institution_code: institution_code,
      institutions_id: institutions_id,
    }
    if (body.description !== undefined) insertPayload.description = body.description ?? null

    const { data, error } = await supabase
      .from('degrees')
      .insert([insertPayload])
      .select()
      .single()

    if (error) {
      console.error('Error creating degree:', error)
      // Check if it's a foreign key constraint error
      if (error.message.includes('degrees_institution_code_fkey')) {
        return NextResponse.json({ error: 'Invalid institution code' }, { status: 400 })
      }
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

    // Auto-map institution_code to institutions_id (same logic as POST)
    let institution_code: string | undefined = body.institution_code
    let institutions_id: string | undefined = body.institutions_id

    // If institution_code is provided, fetch institutions_id
    if (institution_code) {
      const { data: inst, error: instError } = await supabase
        .from('institutions')
        .select('id, institution_code')
        .eq('institution_code', institution_code)
        .maybeSingle()

      if (instError || !inst) {
        return NextResponse.json({
          error: `Invalid institution_code: ${institution_code}. Institution not found.`
        }, { status: 400 })
      }

      // Auto-map the institutions_id from the fetched institution
      institutions_id = inst.id
      console.log(`✅ Auto-mapped institution_code "${institution_code}" to institutions_id "${institutions_id}" (UPDATE)`)
    }
    // If institutions_id is provided but no institution_code, fetch the code
    else if (institutions_id && !institution_code) {
      const { data: inst } = await supabase
        .from('institutions')
        .select('institution_code')
        .eq('id', institutions_id)
        .maybeSingle()
      if (inst?.institution_code) {
        institution_code = inst.institution_code
      }
    }

    const updatePayload: any = {
      degree_code: body.degree_code,
      degree_name: body.degree_name,
      display_name: body.display_name ?? null,
      status: body.is_active,
    }
    if (body.description !== undefined) updatePayload.description = body.description ?? null
    if (institution_code) updatePayload.institution_code = institution_code
    if (institutions_id) updatePayload.institutions_id = institutions_id

    const { data, error } = await supabase
      .from('degrees')
      .update(updatePayload)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating degree:', error)
      // Check if it's a foreign key constraint error
      if (error.message.includes('degrees_institution_code_fkey')) {
        return NextResponse.json({ error: 'Invalid institution code' }, { status: 400 })
      }
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
      .from('degrees')
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


