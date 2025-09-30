import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getSupabaseServer()
    const { data, error } = await supabase.from('program').select('*').eq('id', id).single()
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

    const { data, error } = await supabase.from('program').update(updateData).eq('id', id).select('*').single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getSupabaseServer()
    const { error } = await supabase.from('program').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: 'Program deleted' })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 })
  }
}


