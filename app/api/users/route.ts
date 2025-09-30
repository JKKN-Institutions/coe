import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { sendWelcomeEmail } from '@/lib/email-service'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || undefined

    let supabase
    try {
      supabase = getSupabaseServer()
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error)
      return NextResponse.json([])
    }

    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        username,
        avatar_url,
        bio,
        website,
        location,
        date_of_birth,
        phone,
        is_active,
        is_verified,
        role,
        preferences,
        metadata,
        institution_id,
        institutions!inner(institution_code),
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (q) {
      usersQuery = usersQuery.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const { data: users, error: usersError } = await usersQuery
    if (usersError) {
      console.error('Users fetch error:', usersError)
      return NextResponse.json([], { status: 200 })
    }

    // Flatten institution_code from nested institutions object
    const formattedUsers = (users ?? []).map(user => ({
      ...user,
      institution_code: (user as any).institutions?.institution_code || null
    }))

    return NextResponse.json(formattedUsers)
  } catch (err) {
    console.error('API Error:', err)
    return NextResponse.json({
      error: 'Failed to fetch users',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      full_name,
      email,
      role,             // varchar role name
      is_active = true,
      is_verified = true,
      phone,
      bio,
      website,
      location,
      date_of_birth,
      institution_id,
      avatar_url,
      preferences,
      metadata,
    } = body as Record<string, unknown>

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Missing required fields: full_name and email are required' }, { status: 400 })
    }
    if (!institution_id || String(institution_id).trim().length === 0) {
      return NextResponse.json({ error: 'Missing required field: institution_id' }, { status: 400 })
    }

    const id = randomUUID()

    const supabase2 = getSupabaseServer()

    const insertPayload: any = {
      id,
      full_name: String(full_name),
      email: String(email),
      username: String(email),
      role: role ? String(role) : 'user',
      is_active: Boolean(is_active),
      is_verified: Boolean(is_verified),
      phone: phone ? String(phone) : null,
      bio: bio ? String(bio) : null,
      website: website ? String(website) : null,
      location: location ? String(location) : null,
      date_of_birth: date_of_birth ? String(date_of_birth) : null,
      avatar_url: avatar_url ? String(avatar_url) : null,
      institution_id: String(institution_id),
      preferences: preferences ?? {},
      metadata: metadata ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase2.from('users').insert(insertPayload).select('*').single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Send welcome email to the new user
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
    const emailResult = await sendWelcomeEmail({
      to: String(email),
      name: String(full_name),
      loginUrl,
      temporaryPassword: body.password ? String(body.password) : undefined
    })

    if (!emailResult.success) {
      console.warn('Failed to send welcome email:', emailResult.error)
      // Don't fail the request if email fails
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('API Error:', err)
    return NextResponse.json({ 
      error: 'Failed to create user', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}


