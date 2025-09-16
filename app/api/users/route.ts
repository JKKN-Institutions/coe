import { NextRequest, NextResponse } from 'next/server'
import { randomUUID, createHash } from 'crypto'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || undefined
    
    // Build the base query
    const query = supabaseServer.from('users').select('*').order('created_at', { ascending: false }).limit(100)
    
    if (q) {
      // Try name or email filter
      const { data, error } = await query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      if (error) throw error
      return NextResponse.json(data || [])
    }
    
    const { data, error } = await query
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    return NextResponse.json(data || [])
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

    const { data, error } = await supabaseServer.from('users').insert({
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


