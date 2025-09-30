import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const is_active = searchParams.get('is_active')

    const supabase = getSupabaseServer()
    let query = supabase
      .from('program')
      .select('*')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`program_code.ilike.%${search}%,program_name.ilike.%${search}%,degree_code.ilike.%${search}%,institution_code.ilike.%${search}%`)
    }
    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }

    const { data, error } = await query
    if (error) {
      // Fallback table creation hint
      if (error.message.includes('relation "program" does not exist') || error.message.includes('relation "public.program" does not exist')) {
        return NextResponse.json({
          error: 'Program table not found',
          message: 'The program table needs to be created in your Supabase database',
          instructions: {
            sql: `
create table if not exists public.program (
  id uuid primary key default gen_random_uuid(),
  institution_code varchar(50) not null,
  degree_code varchar(50) not null,
  offering_department_code varchar(50),
  program_code varchar(50) not null,
  program_name varchar(200) not null,
  display_name varchar(200),
  program_duration_yrs integer not null default 3,
  pattern_type varchar(20) not null default 'Semester',
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_program_code unique (institution_code, program_code)
);
            `
          }
        }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('Program GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // RBAC: require programs.create
    const supa = createRouteHandlerClient({ cookies })
    const { data: userData } = await supa.auth.getUser()
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/auth/permissions/current`, { headers: { cookie: req.headers.get('cookie') || '' } })
    const perms = permsRes.ok ? await permsRes.json() : { permissions: [] }
    if (!perms.permissions?.includes('programs.create')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const {
      institution_code,
      degree_code,
      offering_department_code,
      program_code,
      program_name,
      display_name,
      program_duration_yrs,
      pattern_type,
      is_active = true,
    } = body as Record<string, unknown>

    if (!institution_code || !degree_code || !program_code || !program_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('program')
      .insert({
        institution_code: String(institution_code),
        degree_code: String(degree_code),
        offering_department_code: offering_department_code ? String(offering_department_code) : null,
        program_code: String(program_code),
        program_name: String(program_name),
        display_name: display_name ? String(display_name) : null,
        program_duration_yrs: program_duration_yrs ? Number(program_duration_yrs) : 3,
        pattern_type: pattern_type ? String(pattern_type) : 'Semester',
        is_active: Boolean(is_active),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Program POST error:', err)
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
  }
}


