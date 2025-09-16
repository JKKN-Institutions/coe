import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await supabaseServer.from('users').select('*').eq('id', id).single()
    if (error && error.code !== 'PGRST116') throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { full_name, email, role, is_active, phone, username, bio, website, location, date_of_birth, is_verified } = body as Record<string, unknown>

    const data: Record<string, unknown> = {
      ...(full_name !== undefined && { full_name: String(full_name) }),
      ...(email !== undefined && { email: String(email) }),
      ...(role !== undefined && { role: String(role) }),
      ...(is_active !== undefined && { is_active: Boolean(is_active) }),
      ...(phone !== undefined && { phone: phone ? String(phone) : null }),
      ...(username !== undefined && { username: username ? String(username) : null }),
      ...(bio !== undefined && { bio: bio ? String(bio) : null }),
      ...(website !== undefined && { website: website ? String(website) : null }),
      ...(location !== undefined && { location: location ? String(location) : null }),
      ...(date_of_birth !== undefined && { date_of_birth: date_of_birth ? String(date_of_birth) : null }),
      ...(is_verified !== undefined && { is_verified: Boolean(is_verified) }),
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await supabaseServer.from('users').update(data).eq('id', id).select('*').single()
    if (error) throw error
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await supabaseServer.from('users').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}


