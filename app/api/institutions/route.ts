import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase.from('institutions').select('id,name').order('name')
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json([], { status: 200 })
  }
}


