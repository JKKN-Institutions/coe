import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { data, error } = await supabaseServer.from('institutions').select('id,name').order('name')
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json([], { status: 200 })
  }
}


