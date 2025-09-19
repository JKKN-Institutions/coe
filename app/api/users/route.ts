import { NextRequest, NextResponse } from 'next/server'
import { randomUUID, createHash } from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || undefined

    const supabase = getSupabaseServer()

    // First, get users
    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        full_name,
        email,
        role,
        is_active,
        created_at,
        updated_at,
        phone,
        username,
        bio,
        website,
        location,
        date_of_birth,
        avatar_url,
        is_verified
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (q) {
      usersQuery = usersQuery.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const { data: users, error: usersError } = await usersQuery
    if (usersError) {
      console.error('Users fetch error:', usersError)
      throw usersError
    }

    if (!users || users.length === 0) {
      return NextResponse.json([])
    }

    // Since the users table has role as a string field, not a foreign key to roles table,
    // we'll match by role_name instead
    const roleNames = [...new Set(users.filter(user => user.role).map(user => user.role))]

    let roles: any[] = []
    if (roleNames.length > 0) {
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id, role_name, role_description, is_active')
        .in('role_name', roleNames)

      if (rolesError) {
        console.error('Roles fetch error:', rolesError)
      } else {
        roles = rolesData || []
      }
    }

    // Combine users with their roles
    const usersWithRoles = users.map(user => {
      const userRole = roles.find(role => role.role_name === user.role)
      return {
        ...user,
        role_id: userRole?.id || null, // Map to role_id for frontend compatibility
        roles: userRole || null
      }
    })

    return NextResponse.json(usersWithRoles)
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
    const { full_name, email, role, is_active = true, phone, username, bio, website, location, date_of_birth } = body as Record<string, unknown>

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Missing required fields: full_name and email are required' }, { status: 400 })
    }

    const id = randomUUID()

    const supabase2 = getSupabaseServer()
    const { data, error } = await supabase2.from('users').insert({
      id,
      full_name: String(full_name),
      email: String(email),
      username: username ? String(username) : null,
      role: String(role || 'user'),
      is_active: Boolean(is_active),
      is_verified: false,
      phone: phone ? String(phone) : null,
      bio: bio ? String(bio) : null,
      website: website ? String(website) : null,
      location: location ? String(location) : null,
      date_of_birth: date_of_birth ? String(date_of_birth) : null,
      avatar_url: null,
      preferences: {},
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('*').single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
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


