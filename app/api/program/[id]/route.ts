import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getSupabaseServer()
    const { data, error } = await supabase.from('programs').select('*').eq('id', id).single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch program' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // RBAC: require programs.edit
    const supa = createRouteHandlerClient({ cookies })
    const { data: userData } = await supa.auth.getUser()
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/auth/permissions/current`, { headers: { cookie: req.headers.get('cookie') || '' } })
    const perms = permsRes.ok ? await permsRes.json() : { permissions: [] }
    if (!perms.permissions?.includes('programs.edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params
    const body = await req.json()
    const supabase = getSupabaseServer()

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const allowed = ['institution_code','degree_code','offering_department_code','program_code','program_name','display_name','program_duration_yrs','pattern_type','is_active']
    for (const key of allowed) if (key in body) updateData[key] = (body as any)[key]

    // If institution_code is being updated, validate and fetch institutions_id
    if (body.institution_code) {
      const { data: institutionData, error: institutionError } = await supabase
        .from('institutions')
        .select('id')
        .eq('institution_code', String(body.institution_code))
        .single()

      if (institutionError || !institutionData) {
        return NextResponse.json({
          error: `Institution with code "${body.institution_code}" not found. Please ensure the institution exists.`
        }, { status: 400 })
      }
      updateData.institutions_id = institutionData.id
    }

    // If degree_code is being updated, validate and fetch degree_id
    if (body.degree_code) {
      const { data: degreeData, error: degreeError } = await supabase
        .from('degrees')
        .select('id')
        .eq('degree_code', String(body.degree_code))
        .single()

      if (degreeError || !degreeData) {
        return NextResponse.json({
          error: `Degree with code "${body.degree_code}" not found. Please ensure the degree exists.`
        }, { status: 400 })
      }
      updateData.degree_id = degreeData.id
    }

    // If offering_department_code is being updated, validate and fetch offering_department_id
    if (body.offering_department_code) {
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('department_code', String(body.offering_department_code))
        .single()

      if (deptError || !deptData) {
        return NextResponse.json({
          error: `Department with code "${body.offering_department_code}" not found. Please ensure the department exists.`
        }, { status: 400 })
      }
      updateData.offering_department_id = deptData.id
    }

    const { data, error } = await supabase.from('programs').update(updateData).eq('id', id).select('*').single()
    if (error) {
      console.error('Program update error:', error)
      // Handle foreign key constraint errors
      if (error.code === '23503') {
        return NextResponse.json({
          error: 'Foreign key constraint failed. Ensure institution and degree exist.'
        }, { status: 400 })
      }
      throw error
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getSupabaseServer()
    const { error } = await supabase.from('programs').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: 'Program deleted' })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 })
  }
}


