import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await supabaseServer
      .from('batches')
      .select(`
        *,
        programs:program_id (
          id,
          program_name,
          program_code
        )
      `)
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
    const { id } = await params
    const body = await req.json()
    const { 
      program_id,
      batch_name, 
      batch_code, 
      academic_year,
      start_date,
      end_date,
      max_students,
      current_students,
      is_active,
      description
    } = body as Record<string, unknown>

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (program_id !== undefined) updateData.program_id = String(program_id)
    if (batch_name !== undefined) updateData.batch_name = String(batch_name)
    if (batch_code !== undefined) updateData.batch_code = String(batch_code)
    if (academic_year !== undefined) updateData.academic_year = String(academic_year)
    if (start_date !== undefined) updateData.start_date = start_date ? new Date(String(start_date)).toISOString().split('T')[0] : null
    if (end_date !== undefined) updateData.end_date = end_date ? new Date(String(end_date)).toISOString().split('T')[0] : null
    if (max_students !== undefined) updateData.max_students = Number(max_students)
    if (current_students !== undefined) updateData.current_students = Number(current_students)
    if (is_active !== undefined) updateData.is_active = Boolean(is_active)
    if (description !== undefined) updateData.description = description ? String(description) : null

    const { data, error } = await supabaseServer
      .from('batches')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        programs:program_id (
          id,
          program_name,
          program_code
        )
      `)
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
    const { id } = await params
    const { error } = await supabaseServer.from('batches').delete().eq('id', id)
    
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
