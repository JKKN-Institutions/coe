-- Test migration for adding regulation_code to course_mapping table
-- Run this in Supabase SQL Editor

-- Step 1: Add regulation_code column
ALTER TABLE public.course_mapping
ADD COLUMN IF NOT EXISTS regulation_code text NULL;

-- Step 2: Add regulation_id column for foreign key relationship
ALTER TABLE public.course_mapping
ADD COLUMN IF NOT EXISTS regulation_id uuid NULL;

-- Step 3: Add foreign key constraint
ALTER TABLE public.course_mapping
DROP CONSTRAINT IF EXISTS course_mapping_regulation_id_fkey;

ALTER TABLE public.course_mapping
ADD CONSTRAINT course_mapping_regulation_id_fkey
FOREIGN KEY (regulation_id)
REFERENCES public.regulations (id)
ON DELETE SET NULL;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_mapping_regulation_code
ON public.course_mapping USING btree (regulation_code);

CREATE INDEX IF NOT EXISTS idx_course_mapping_program_regulation
ON public.course_mapping USING btree (program_code, regulation_code);

-- Step 5: Update unique constraint to include regulation_code
DROP INDEX IF EXISTS idx_course_mapping_unique_mapping;

CREATE UNIQUE INDEX idx_course_mapping_unique_mapping
ON public.course_mapping (course_id, institution_code, program_code, batch_code, regulation_code, semester_code)
WHERE is_active = true;

-- Step 6: Add comments
COMMENT ON COLUMN public.course_mapping.regulation_code IS 'Regulation code for the course mapping';
COMMENT ON COLUMN public.course_mapping.regulation_id IS 'Foreign key reference to regulations.id';

-- Step 7: Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'course_mapping'
  AND column_name IN ('regulation_code', 'regulation_id')
ORDER BY column_name;
