import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist or error, return mock data
      console.warn('Roles table error, using mock data:', error)
      return NextResponse.json([
        { id: "1", name: "user", role_name: "user", role_description: "Regular user with basic permissions", is_active: true },
        { id: "2", name: "admin", role_name: "admin", role_description: "Administrator with full permissions", is_active: true },
        { id: "3", name: "moderator", role_name: "moderator", role_description: "Moderator with limited admin permissions", is_active: true },
        { id: "4", name: "faculty", role_name: "faculty", role_description: "Faculty member with teaching permissions", is_active: true },
        { id: "5", name: "student", role_name: "student", role_description: "Student with read-only permissions", is_active: true }
      ])
    }

    // If data is empty, return mock data
    if (!data || data.length === 0) {
      return NextResponse.json([
        { id: "1", name: "user", role_name: "user", role_description: "Regular user with basic permissions", is_active: true },
        { id: "2", name: "admin", role_name: "admin", role_description: "Administrator with full permissions", is_active: true },
        { id: "3", name: "moderator", role_name: "moderator", role_description: "Moderator with limited admin permissions", is_active: true },
        { id: "4", name: "faculty", role_name: "faculty", role_description: "Faculty member with teaching permissions", is_active: true },
        { id: "5", name: "student", role_name: "student", role_description: "Student with read-only permissions", is_active: true }
      ])
    }

    // Ensure compatibility with both 'name' and 'role_name' fields
    const rolesWithName = data.map(role => ({
      ...role,
      name: role.role_name || role.name // Support both field names
    }))

    return NextResponse.json(rolesWithName)
  } catch (error) {
    console.error('Roles API error:', error)
    // Return mock data on error
    return NextResponse.json([
      { id: "1", name: "user", role_name: "user", role_description: "Regular user with basic permissions", is_active: true },
      { id: "2", name: "admin", role_name: "admin", role_description: "Administrator with full permissions", is_active: true },
      { id: "3", name: "moderator", role_name: "moderator", role_description: "Moderator with limited admin permissions", is_active: true },
      { id: "4", name: "faculty", role_name: "faculty", role_description: "Faculty member with teaching permissions", is_active: true },
      { id: "5", name: "student", role_name: "student", role_description: "Student with read-only permissions", is_active: true }
    ], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()

    const { data, error } = await supabase
      .from('roles')
      .insert([body])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}