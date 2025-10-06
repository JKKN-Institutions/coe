# Fix for "Generation Expression is Not Immutable" Error

## Problem
The original schema had a GENERATED column for `age` that used `CURRENT_DATE`:

```sql
age integer GENERATED ALWAYS AS (
    EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth))::integer
) STORED,
```

**Error:** PostgreSQL requires GENERATED columns to use only immutable functions. `CURRENT_DATE` is not immutable because it returns different values on different days.

## Solution
Changed the `age` column from a GENERATED column to a regular column with an automatic trigger:

### 1. Modified Column Definition
```sql
age integer, -- Calculated via trigger or application logic
```

### 2. Added Trigger Function
```sql
CREATE OR REPLACE FUNCTION calculate_student_age()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate age based on date of birth
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.age := EXTRACT(YEAR FROM age(CURRENT_DATE, NEW.date_of_birth))::integer;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Added Trigger
```sql
CREATE TRIGGER trg_students_age
  BEFORE INSERT OR UPDATE OF date_of_birth ON students 
  FOR EACH ROW EXECUTE FUNCTION calculate_student_age();
```

## Benefits of This Approach

1. ✅ **Automatic Calculation** - Age is still calculated automatically
2. ✅ **No Immutability Issues** - Triggers can use non-immutable functions
3. ✅ **Efficient** - Only recalculates when date_of_birth changes
4. ✅ **Flexible** - Can be updated manually if needed
5. ✅ **Compatible** - Works with all PostgreSQL versions

## How It Works

- **On INSERT**: Age is automatically calculated from date_of_birth
- **On UPDATE**: Age is recalculated only when date_of_birth changes
- **Current Value**: Always reflects age as of the last insert/update

## Alternative: Calculate Age in Queries

If you prefer not to store age at all, you can calculate it in queries:

```sql
-- In SELECT statements
SELECT 
  roll_number,
  full_name,
  date_of_birth,
  EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth))::integer as age
FROM students;

-- Or create a view
CREATE OR REPLACE VIEW vw_students_with_age AS
SELECT 
  *,
  EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth))::integer as calculated_age
FROM students;
```

## Migration Note

If you already have the table created with the old GENERATED column:

```sql
-- Drop the generated column
ALTER TABLE students DROP COLUMN age;

-- Add it back as regular column
ALTER TABLE students ADD COLUMN age integer;

-- Create the trigger function and trigger (as shown above)

-- Populate existing ages
UPDATE students 
SET date_of_birth = date_of_birth; -- This will trigger age calculation
```

## Testing

```sql
-- Test 1: Insert new student
INSERT INTO students (
  roll_number, first_name, date_of_birth, 
  gender, institution_id, department_id, 
  program_id, semester_id, academic_year_id
) VALUES (
  '24CS001', 'Test', '2003-05-15', 
  'Male', '...', '...', '...', '...', '...'
);

-- Check age was calculated
SELECT roll_number, date_of_birth, age FROM students WHERE roll_number = '24CS001';

-- Test 2: Update date of birth
UPDATE students 
SET date_of_birth = '2004-08-20' 
WHERE roll_number = '24CS001';

-- Verify age was recalculated
SELECT roll_number, date_of_birth, age FROM students WHERE roll_number = '24CS001';
```

## Summary

The schema is now fixed and ready to use. The age column will work exactly as intended, automatically calculating student ages without causing any immutability errors.
