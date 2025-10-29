# Exam Attendance Table Schema Reference

## Table: `exam_attendance`

### Key Fields

| Field | Type | Description | Usage |
|-------|------|-------------|-------|
| `attendance_status` | VARCHAR(50) | Text status | "Present" or "Absent" |
| `status` | BOOLEAN | Is absent flag | `true` = Absent, `false` = Present |
| `register_number` | VARCHAR | Student register number | Used in students table (NOT `stu_register_no`) |

## Important Relationships

### Boolean Status Logic
```typescript
// When marking attendance:
status: true              → Student is ABSENT
status: false             → Student is PRESENT

// When updating:
if (attendance_status === 'Absent') {
    status = true  // Set boolean flag to true for absent
}
if (attendance_status === 'Present') {
    status = false  // Set boolean flag to false for present
}
```

### Field Mapping

**Frontend Display ↔ Database:**
```typescript
// Frontend shows:
attendance_status: "Present" | "Absent"

// Database stores BOTH:
attendance_status: "Present" | "Absent"  (VARCHAR)
status: true | false                      (BOOLEAN - is_absent flag)
```

## Foreign Keys

```sql
institutions_id          → institutions(id)
exam_registration_id     → exam_registrations(id)
exam_timetable_id        → exam_timetables(id)
examination_session_id   → examination_sessions(id)
course_id                → courses(id)
program_id               → programs(id)
```

## Constraints

### Unique Constraint
```sql
unique_attendance unique (institutions_id, exam_registration_id)
```
**Meaning:** A student can have only ONE attendance record per exam registration within an institution.

## Trigger

### `set_is_regular_before_insert_update`
- Automatically sets `is_regular` field before INSERT/UPDATE
- Calls function: `update_attendance_is_regular()`

## Indexes

```sql
idx_exam_attendance_institution  ON institutions_id
idx_exam_attendance_registration ON exam_registration_id
idx_exam_attendance_status       ON attendance_status
```

## API Implementation Notes

### Attendance Correction API

**When updating attendance:**
```typescript
// Frontend sends:
{
    id: "uuid",
    attendance_status: "Present" | "Absent",
    status: attendance_status === 'Absent',  // boolean
    remarks: "Optional text"
}

// API updates:
await supabase
    .from('exam_attendance')
    .update({
        attendance_status: record.attendance_status,
        status: record.status,  // boolean is_absent flag
        remarks: record.remarks,
        updated_at: new Date().toISOString()
    })
    .eq('id', record.id)
```

### Student Lookup

**IMPORTANT:** Use `register_number` NOT `stu_register_no`

```typescript
// ❌ WRONG:
.select('id, stu_register_no, student_name')
.eq('stu_register_no', registerNo)

// ✅ CORRECT:
.select('id, register_number, student_name')
.ilike('register_number', registerNo.trim())  // case-insensitive
```

## Example Queries

### Create Attendance Record
```typescript
await supabase
    .from('exam_attendance')
    .insert({
        institutions_id: 'uuid',
        exam_registration_id: 'uuid',
        attendance_status: 'Present',
        status: false,  // false = Present, true = Absent
        remarks: null,
        // ... other fields
    })
```

### Update Attendance Record
```typescript
await supabase
    .from('exam_attendance')
    .update({
        attendance_status: 'Absent',
        status: true,  // true = Absent
        remarks: 'Late arrival',
        updated_at: new Date().toISOString()
    })
    .eq('id', recordId)
```

### Search with Joins
```typescript
const { data } = await supabase
    .from('exam_attendance')
    .select(`
        *,
        exam_registrations!inner (
            id,
            students!inner (
                register_number,
                student_name
            )
        ),
        programs!inner (program_code, program_name),
        courses!inner (course_code, course_title),
        exam_timetables!inner (exam_date, session)
    `)
    .eq('institutions_id', institutionId)
```

## Common Issues & Solutions

### Issue: "column stu_register_no does not exist"
**Solution:** Use `register_number` instead of `stu_register_no`

### Issue: Duplicate attendance records
**Cause:** Violating unique constraint `(institutions_id, exam_registration_id)`
**Solution:** Check if attendance already exists before inserting

### Issue: Boolean status confusion
**Remember:**
- `status: true` = Absent (student is absent)
- `status: false` = Present (student is present)

### Issue: Case sensitivity in search
**Solution:** Use `.ilike()` for case-insensitive search
```typescript
.ilike('register_number', searchTerm.trim())
```

## Best Practices

1. **Always update both fields together:**
   ```typescript
   attendance_status: "Present"
   status: false
   ```

2. **Use case-insensitive search:**
   ```typescript
   .ilike('register_number', registerNo.trim())
   ```

3. **Check for existing attendance:**
   ```typescript
   const existing = await supabase
       .from('exam_attendance')
       .select('id')
       .eq('institutions_id', institutionId)
       .eq('exam_registration_id', registrationId)
       .single()

   if (existing) {
       // Update instead of insert
   }
   ```

4. **Handle the trigger:**
   - The `is_regular` field is set automatically by trigger
   - Don't manually set it in your INSERT/UPDATE

5. **Always include updated_at:**
   ```typescript
   updated_at: new Date().toISOString()
   ```

## Testing Queries

### Count total attendance records
```sql
SELECT COUNT(*) FROM exam_attendance;
```

### Check duplicate prevention
```sql
SELECT institutions_id, exam_registration_id, COUNT(*)
FROM exam_attendance
GROUP BY institutions_id, exam_registration_id
HAVING COUNT(*) > 1;
```

### Find students with attendance
```sql
SELECT DISTINCT s.register_number, s.student_name
FROM exam_attendance ea
JOIN exam_registrations er ON ea.exam_registration_id = er.id
JOIN students s ON er.student_id = s.id
ORDER BY s.register_number;
```

### Attendance statistics
```sql
SELECT
    attendance_status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM exam_attendance
GROUP BY attendance_status;
```
