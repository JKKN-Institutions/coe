import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    const supabase = getSupabaseServer()
    let query = supabase
      .from('batch')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`batch_code.ilike.%${search}%,batch_year::text.ilike.%${search}%`)
    }
    if (status !== null) {
      query = query.eq('status', status === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      
      // Check if batch table doesn't exist
      if (error.message.includes('relation "batch" does not exist') || error.message.includes('relation "public.batch" does not exist')) {
        return NextResponse.json({
          error: 'Batch table not found',
          message: 'The batch table needs to be created in your Supabase database',
          instructions: {
            step1: 'Go to your Supabase dashboard',
            step2: 'Navigate to SQL Editor',
            step3: 'Run the provided SQL script to create the batch table',
            sql: `
-- Create batch table
CREATE TABLE IF NOT EXISTS batch (
  id BIGSERIAL PRIMARY KEY,
  batch_year INTEGER NOT NULL,
  batch_code VARCHAR(50) NOT NULL UNIQUE,
  status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batch_batch_year ON batch(batch_year);
CREATE INDEX IF NOT EXISTS idx_batch_status ON batch(status);
CREATE INDEX IF NOT EXISTS idx_batch_created_at ON batch(created_at);
            `
          }
        }, { status: 404 })
      }
      
      throw error
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('API Error:', err)
    return NextResponse.json({
      error: 'Failed to fetch batch', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      batch_code,
      batch_year,
      status = true
    } = body as Record<string, unknown>

    if (!batch_code || !batch_year) {
      return NextResponse.json({
        error: 'Missing required fields: batch_code and batch_year are required'
      }, { status: 400 })
    }

    const supabase2 = getSupabaseServer()
    const { data, error } = await supabase2.from('batch').insert({
      batch_code: String(batch_code),
      batch_year: Number(batch_year),
      status: Boolean(status),
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
      error: 'Failed to create batch', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}
