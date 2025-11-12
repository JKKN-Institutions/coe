import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('institutions')
      .select(`
        id,
        institution_code,
        name,
        phone,
        email,
        website,
        created_by,
        counselling_code,
        accredited_by,
        address_line1,
        address_line2,
        address_line3,
        city,
        state,
        country,
        logo_url,
        transportation_dept,
        administration_dept,
        accounts_dept,
        admission_dept,
        placement_dept,
        anti_ragging_dept,
        institution_type,
        pin_code,
        timetable_type,
        is_active,
        created_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, 9999) // Increase limit from default 1000 to 10000 rows

    if (error) {
      console.error('Institutions table error:', error)
      return NextResponse.json({ error: 'Failed to fetch institutions' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e) {
    console.error('Institutions API error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()
    
    const { data, error } = await supabase
      .from('institutions')
      .insert([{
        institution_code: body.institution_code,
        name: body.name,
        phone: body.phone,
        email: body.email,
        website: body.website,
        counselling_code: body.counselling_code,
        accredited_by: body.accredited_by,
        address_line1: body.address_line1,
        address_line2: body.address_line2,
        address_line3: body.address_line3,
        city: body.city,
        state: body.state,
        country: body.country,
        logo_url: body.logo_url,
        transportation_dept: body.transportation_dept,
        administration_dept: body.administration_dept,
        accounts_dept: body.accounts_dept,
        admission_dept: body.admission_dept,
        placement_dept: body.placement_dept,
        anti_ragging_dept: body.anti_ragging_dept,
        institution_type: body.institution_type,
        pin_code: body.pin_code,
        timetable_type: body.timetable_type,
        is_active: body.is_active ?? true
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating institution:', error)
      return NextResponse.json({ error: 'Failed to create institution' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error('Institution creation error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseServer()
    
    const { data, error } = await supabase
      .from('institutions')
      .update({
        institution_code: body.institution_code,
        name: body.name,
        phone: body.phone,
        email: body.email,
        website: body.website,
        counselling_code: body.counselling_code,
        accredited_by: body.accredited_by,
        address_line1: body.address_line1,
        address_line2: body.address_line2,
        address_line3: body.address_line3,
        city: body.city,
        state: body.state,
        country: body.country,
        logo_url: body.logo_url,
        transportation_dept: body.transportation_dept,
        administration_dept: body.administration_dept,
        accounts_dept: body.accounts_dept,
        admission_dept: body.admission_dept,
        placement_dept: body.placement_dept,
        anti_ragging_dept: body.anti_ragging_dept,
        institution_type: body.institution_type,
        pin_code: body.pin_code,
        timetable_type: body.timetable_type,
        is_active: body.is_active
      })
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating institution:', error)
      return NextResponse.json({ error: 'Failed to update institution' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('Institution update error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseServer()
    
    const { error } = await supabase
      .from('institutions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting institution:', error)
      return NextResponse.json({ error: 'Failed to delete institution' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Institution deletion error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


