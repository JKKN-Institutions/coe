import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

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
    const supabase = getSupabaseServer()
    const { id } = await params
    const body = await req.json()
    const {
      batch_code,
      batch_year,
      status
    } = body as Record<string, unknown>

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (batch_code !== undefined) updateData.batch_code = String(batch_code)
    if (batch_year !== undefined) updateData.batch_year = Number(batch_year)
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
