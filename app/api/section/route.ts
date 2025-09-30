import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('section')
      .select(`
        id,
        institutions_id,
        institution_code,
        section_name,
        section_id,
        section_description,
        arrear_section,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Section table error:', error)
      return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e) {
    console.error('Section API error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()
    
    const { data, error } = await supabase
      .from('section')
      .insert([{
        institutions_id: body.institutions_id,
        institution_code: body.institution_code,
        section_name: body.section_name,
        section_id: body.section_id,
        section_description: body.section_description,
        arrear_section: body.arrear_section ?? false,
        status: body.status ?? true
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating section:', error)
      return NextResponse.json({ error: 'Failed to create section' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error('Section creation error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()
    
    const { data, error } = await supabase
      .from('section')
      .update({
        institutions_id: body.institutions_id,
        institution_code: body.institution_code,
        section_name: body.section_name,
        section_id: body.section_id,
        section_description: body.section_description,
        arrear_section: body.arrear_section,
        status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating section:', error)
      return NextResponse.json({ error: 'Failed to update section' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('Section update error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Section ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseServer()
    
    const { error } = await supabase
      .from('section')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting section:', error)
      return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Section deletion error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
