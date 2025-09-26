import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET: list departments
export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('department')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Departments table error:', error)
      return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
    }

    const normalized = (data || []).map((row: any) => ({
      ...row,
      is_active: row.status ?? row.is_active ?? true,
    }))
    return NextResponse.json(normalized)
  } catch (e) {
    console.error('Departments API error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: create department
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()

    const insertPayload: any = {
      institution_code: body.institution_code,
      department_code: body.department_code,
      department_name: body.department_name,
      display_name: body.display_name ?? null,
      description: body.description ?? null,
      stream: body.stream ?? null,
      status: body.is_active ?? true,
    }

    const { data, error } = await supabase
      .from('department')
      .insert([insertPayload])
      .select()
      .single()

    if (error) {
      console.error('Error creating department:', error)
      return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
    }

    const normalized = data ? { ...data, is_active: (data as any).status ?? (data as any).is_active ?? true } : data
    return NextResponse.json(normalized, { status: 201 })
  } catch (e) {
    console.error('Department creation error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: update department
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()

    const updatePayload: any = {
      institution_code: body.institution_code,
      department_code: body.department_code,
      department_name: body.department_name,
      display_name: body.display_name ?? null,
      description: body.description ?? null,
      stream: body.stream ?? null,
      status: body.is_active,
    }

    const { data, error } = await supabase
      .from('department')
      .update(updatePayload)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating department:', error)
      return NextResponse.json({ error: 'Failed to update department' }, { status: 500 })
    }

    const normalized = data ? { ...data, is_active: (data as any).status ?? (data as any).is_active ?? true } : data
    return NextResponse.json(normalized)
  } catch (e) {
    console.error('Department update error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: delete department by id
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseServer()
    const { error } = await supabase
      .from('department')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting department:', error)
      return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Department deletion error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


