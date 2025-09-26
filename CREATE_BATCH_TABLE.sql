-- Create batch table for JKKN COE
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop existing table if it exists
DROP TABLE IF EXISTS batch CASCADE;

-- Step 2: Create the batch table
CREATE TABLE IF NOT EXISTS batch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id VARCHAR(255),
  batch_name VARCHAR(255) NOT NULL,
  batch_code VARCHAR(50) NOT NULL UNIQUE,
  academic_year VARCHAR(9) NOT NULL,
  start_date DATE,
  end_date DATE,
  max_students INTEGER DEFAULT 60,
  current_students INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batch_program_id ON batch(program_id);
CREATE INDEX IF NOT EXISTS idx_batch_academic_year ON batch(academic_year);
CREATE INDEX IF NOT EXISTS idx_batch_is_active ON batch(is_active);
CREATE INDEX IF NOT EXISTS idx_batch_batch_code ON batch(batch_code);
CREATE INDEX IF NOT EXISTS idx_batch_created_at ON batch(created_at);

-- Step 4: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_batch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger for updated_at
CREATE TRIGGER update_batch_updated_at_trigger
  BEFORE UPDATE ON batch
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_updated_at();

-- Step 6: Enable Row Level Security (optional)
-- Uncomment if you want to enable RLS
-- ALTER TABLE batch ENABLE ROW LEVEL SECURITY;

-- Step 7: Create sample data
INSERT INTO batch (
  batch_name,
  batch_code,
  academic_year,
  program_id,
  max_students,
  current_students,
  is_active,
  description,
  start_date,
  end_date
) VALUES
(
  'Computer Science 2024',
  'CSE2024A',
  '2024-2025',
  '1',
  60,
  45,
  true,
  'Bachelor of Technology in Computer Science and Engineering - Batch A',
  '2024-06-01',
  '2028-05-31'
),
(
  'Electronics 2024',
  'ECE2024A',
  '2024-2025',
  '2',
  50,
  38,
  true,
  'Bachelor of Technology in Electronics and Communication Engineering - Batch A',
  '2024-06-01',
  '2028-05-31'
),
(
  'Mechanical 2023',
  'MECH2023A',
  '2023-2024',
  '3',
  55,
  52,
  true,
  'Bachelor of Technology in Mechanical Engineering - Batch A',
  '2023-06-01',
  '2027-05-31'
)
ON CONFLICT (batch_code) DO NOTHING;

-- Verify the table was created
SELECT 'Batch table created successfully!' as status, COUNT(*) as batch_count FROM batch;