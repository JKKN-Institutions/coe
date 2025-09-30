import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServer()
    const { id } = await params
    const { data, error } = await supabase
      .from('batch')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error fetching batch:', err)
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // RBAC: require batches.edit
    const supa = createRouteHandlerClient({ cookies })
    const { data: userData } = await supa.auth.getUser()
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/auth/permissions/current`, { headers: { cookie: req.headers.get('cookie') || '' } })
    const perms = permsRes.ok ? await permsRes.json() : { permissions: [] }
    if (!perms.permissions?.includes('batches.edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const supabase = getSupabaseServer()
    const { id } = await params
    const body = await req.json()
    const {
      institutions_id,
      institution_code,
      batch_year,
      batch_name,
      batch_code,
      start_date,
      end_date,
      status
    } = body as Record<string, unknown>

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (institutions_id !== undefined) updateData.institutions_id = institutions_id ? String(institutions_id) : null
    if (institution_code !== undefined) updateData.institution_code = String(institution_code)
    if (batch_year !== undefined) updateData.batch_year = Number(batch_year)
    if (batch_name !== undefined) updateData.batch_name = String(batch_name)
    if (batch_code !== undefined) updateData.batch_code = String(batch_code)
    if (start_date !== undefined) updateData.start_date = start_date ? String(start_date) : null
    if (end_date !== undefined) updateData.end_date = end_date ? String(end_date) : null
    if (status !== undefined) updateData.status = Boolean(status)

    const { data, error } = await supabase
      .from('batch')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating batch:', err)
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // RBAC: require batches.delete
    const supa = createRouteHandlerClient({ cookies })
    const { data: userData } = await supa.auth.getUser()
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/auth/permissions/current`, { headers: { cookie: (await _req.headers).get('cookie') || '' } as any })
    const perms = permsRes.ok ? await permsRes.json() : { permissions: [] }
    if (!perms.permissions?.includes('batches.delete')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const supabase = getSupabaseServer()
    const { id } = await params
    const { error } = await supabase.from('batch').delete().eq('id', id)
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ message: 'Batch deleted successfully' })
  } catch (err) {
    console.error('Error deleting batch:', err)
    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 })
  }
}
