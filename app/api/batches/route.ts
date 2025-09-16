import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const program_id = searchParams.get('program_id')
    const academic_year = searchParams.get('academic_year')

    let query = supabaseServer
      .from('batches')
      .select(`
        *,
        programs:program_id (
          id,
          program_name,
          program_code
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`batch_name.ilike.%${search}%,batch_code.ilike.%${search}%,academic_year::text.ilike.%${search}%`)
    }
    if (status !== null) {
      query = query.eq('is_active', status === 'true')
    }
    if (program_id) {
      query = query.eq('program_id', program_id)
    }
    if (academic_year) {
      query = query.eq('academic_year', academic_year)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      
      // Check if batches table doesn't exist
      if (error.message.includes('relation "batches" does not exist')) {
        return NextResponse.json({ 
          error: 'Batches table not found',
          message: 'The batches table needs to be created in your Supabase database',
          instructions: {
            step1: 'Go to your Supabase dashboard',
            step2: 'Navigate to SQL Editor',
            step3: 'Run the provided SQL script to create the batches table',
            sql: `
-- Create batches table
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  batch_name VARCHAR(255) NOT NULL,
  batch_code VARCHAR(50) NOT NULL,
  academic_year VARCHAR(9) NOT NULL, -- e.g., "2024-2025"
  start_date DATE,
  end_date DATE,
  max_students INTEGER DEFAULT 0,
  current_students INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_batch_code UNIQUE (program_id, batch_code),
  CONSTRAINT unique_batch_name UNIQUE (program_id, batch_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batches_program_id ON batches(program_id);
CREATE INDEX IF NOT EXISTS idx_batches_academic_year ON batches(academic_year);
CREATE INDEX IF NOT EXISTS idx_batches_is_active ON batches(is_active);
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at);
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
      error: 'Failed to fetch batches', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      program_id,
      batch_name, 
      batch_code, 
      academic_year,
      start_date,
      end_date,
      max_students = 0,
      current_students = 0,
      is_active = true,
      description
    } = body as Record<string, unknown>

    if (!program_id || !batch_name || !batch_code || !academic_year) {
      return NextResponse.json({ 
        error: 'Missing required fields: program_id, batch_name, batch_code, and academic_year are required' 
      }, { status: 400 })
    }

    const { data, error } = await supabaseServer.from('batches').insert({
      program_id: String(program_id),
      batch_name: String(batch_name),
      batch_code: String(batch_code),
      academic_year: String(academic_year),
      start_date: start_date ? new Date(String(start_date)).toISOString().split('T')[0] : null,
      end_date: end_date ? new Date(String(end_date)).toISOString().split('T')[0] : null,
      max_students: Number(max_students),
      current_students: Number(current_students),
      is_active: Boolean(is_active),
      description: description ? String(description) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select(`
      *,
      programs:program_id (
        id,
        program_name,
        program_code
      )
    `).single()

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
