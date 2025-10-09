# 📋 Departments Table Reference

## Table Overview

**Table Name:** `public.departments`  
**Purpose:** Stores department information for different institutions  
**Schema:** PostgreSQL with Row Level Security (RLS) enabled

---

## 📊 Table Structure

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | UUID | No | `gen_random_uuid()` | Primary key (auto-generated) |
| **institutions_id** | UUID | No | - | Foreign key to `institutions.id` |
| **institution_code** | VARCHAR(50) | No | - | Foreign key to `institutions.institution_code` |
| **department_code** | VARCHAR(50) | No | - | Unique department code (e.g., "CSE", "ECE") |
| **department_name** | VARCHAR(255) | No | - | Full department name |
| **display_name** | VARCHAR(100) | Yes | `NULL` | Short display name (optional) |
| **description** | TEXT | Yes | `NULL` | Department description (optional) |
| **stream** | VARCHAR(50) | Yes | `NULL` | Academic stream (see allowed values below) |
| **status** | BOOLEAN | No | `true` | Active (true) or Inactive (false) |
| **created_at** | TIMESTAMPTZ | No | `NOW()` | Record creation timestamp |
| **updated_at** | TIMESTAMPTZ | No | `NOW()` | Last update timestamp (auto-updated) |
| **created_by** | UUID | Yes | `NULL` | FK to `auth.users(id)` - creator |
| **updated_by** | UUID | Yes | `NULL` | FK to `auth.users(id)` - last updater |

---

## 🔑 Constraints

### Primary Key
```sql
PRIMARY KEY (id)
```

### Unique Constraints
```sql
-- Ensures no duplicate department codes within same institution
CONSTRAINT departments_institution_code_dept_code_unique 
  UNIQUE (institution_code, department_code)
```

### Foreign Keys
```sql
-- FK to institutions table (UUID reference)
FOREIGN KEY (institutions_id) 
  REFERENCES institutions(id)
  ON DELETE CASCADE 
  ON UPDATE CASCADE

-- FK to institutions table (code reference)
FOREIGN KEY (institution_code) 
  REFERENCES institutions(institution_code)
  ON DELETE CASCADE 
  ON UPDATE CASCADE

-- FK to auth users (created_by)
FOREIGN KEY (created_by) 
  REFERENCES auth.users(id)

-- FK to auth users (updated_by)
FOREIGN KEY (updated_by) 
  REFERENCES auth.users(id)
```

### Check Constraints
```sql
-- Stream must be one of the allowed values or NULL
CHECK (stream IN (
  'Arts', 
  'Science', 
  'Management', 
  'Commerce', 
  'Engineering', 
  'Medical', 
  'Law'
) OR stream IS NULL)
```

---

## 📇 Indexes

Performance indexes created on:

```sql
-- 1. Foreign key to institutions (UUID)
idx_departments_institutions_id ON (institutions_id)

-- 2. Foreign key to institutions (code)
idx_departments_institution_code ON (institution_code)

-- 3. Department code lookup
idx_departments_department_code ON (department_code)

-- 4. Status filtering
idx_departments_status ON (status)

-- 5. Stream filtering (partial index)
idx_departments_stream ON (stream) WHERE stream IS NOT NULL

-- 6. Ordering by creation date
idx_departments_created_at ON (created_at)
```

---

## 🔒 Row Level Security (RLS)

RLS is **ENABLED** on this table.

### Policies

#### 1. Read Policy (SELECT)
```sql
"Authenticated users can read departments"
-- All authenticated users can read all departments
USING (auth.role() = 'authenticated')
```

#### 2. Manage Policy (INSERT, UPDATE, DELETE)
```sql
"Admins can manage departments"
-- Only users with admin roles can modify departments
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'coe_admin')
      AND ur.is_active = true
  )
)
```

---

## 🔄 Triggers

### Auto-Update Timestamp
```sql
-- Automatically updates 'updated_at' on every UPDATE
TRIGGER: departments_updated_at
FUNCTION: update_departments_updated_at()
FIRES: BEFORE UPDATE ON departments
```

---

## 🌳 Relationships

### Parent Tables (Foreign Keys)
```
institutions (1) ──→ (N) departments
    ├─ institutions.id ──→ departments.institutions_id
    └─ institutions.institution_code ──→ departments.institution_code

auth.users (1) ──→ (N) departments
    ├─ auth.users.id ──→ departments.created_by
    └─ auth.users.id ──→ departments.updated_by
```

### Child Tables (Referenced By)
```
departments (1) ──→ (N) students
    └─ departments.id ──→ students.department_id

departments (1) ──→ (N) programs
    └─ departments.id ──→ programs.offering_department_id

departments (1) ──→ (N) courses (potentially)
    └─ departments.id ──→ courses.department_id
```

---

## 📝 Sample Data

### Example 1: Engineering Department
```sql
INSERT INTO departments (
  institutions_id,
  institution_code,
  department_code,
  department_name,
  display_name,
  stream,
  status
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', -- UUID of institution
  'JKKN',
  'CSE',
  'Computer Science and Engineering',
  'CSE',
  'Engineering',
  true
);
```

### Example 2: Science Department
```sql
INSERT INTO departments (
  institutions_id,
  institution_code,
  department_code,
  department_name,
  display_name,
  stream,
  status
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'JKKN',
  'CHEM',
  'Chemistry',
  'Chemistry',
  'Science',
  true
);
```

---

## 🔍 Common Queries

### 1. Get All Active Departments
```sql
SELECT * FROM departments 
WHERE status = true 
ORDER BY department_name;
```

### 2. Get Departments by Institution
```sql
SELECT * FROM departments 
WHERE institution_code = 'JKKN'
ORDER BY department_code;
```

### 3. Get Departments by Stream
```sql
SELECT * FROM departments 
WHERE stream = 'Engineering'
  AND status = true
ORDER BY department_name;
```

### 4. Get Department with Institution Details
```sql
SELECT 
  d.*,
  i.name AS institution_name,
  i.display_name AS institution_display_name
FROM departments d
JOIN institutions i ON d.institutions_id = i.id
WHERE d.status = true
ORDER BY d.department_name;
```

### 5. Count Departments by Institution
```sql
SELECT 
  institution_code,
  COUNT(*) AS total_departments,
  COUNT(*) FILTER (WHERE status = true) AS active_departments,
  COUNT(*) FILTER (WHERE status = false) AS inactive_departments
FROM departments
GROUP BY institution_code
ORDER BY institution_code;
```

### 6. Count Departments by Stream
```sql
SELECT 
  stream,
  COUNT(*) AS department_count
FROM departments
WHERE status = true
GROUP BY stream
ORDER BY department_count DESC;
```

### 7. Search Departments
```sql
SELECT * FROM departments 
WHERE 
  department_name ILIKE '%computer%' OR
  department_code ILIKE '%cse%' OR
  display_name ILIKE '%cs%'
ORDER BY department_name;
```

---

## 🛠️ API Usage

### GET - List All Departments
```typescript
// Request
GET /api/departments

// Response
[
  {
    "id": "uuid",
    "institutions_id": "uuid",
    "institution_code": "JKKN",
    "department_code": "CSE",
    "department_name": "Computer Science and Engineering",
    "display_name": "CSE",
    "description": null,
    "stream": "Engineering",
    "status": true,
    "is_active": true, // Normalized from status
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### POST - Create Department
```typescript
// Request
POST /api/departments
Content-Type: application/json

{
  "institution_code": "JKKN",
  "department_code": "ECE",
  "department_name": "Electronics and Communication Engineering",
  "display_name": "ECE",
  "description": "Department of Electronics and Communication",
  "stream": "Engineering",
  "is_active": true
}

// Response (201 Created)
{
  "id": "new-uuid",
  "institutions_id": "mapped-uuid",
  "institution_code": "JKKN",
  "department_code": "ECE",
  // ... rest of fields
}
```

### PUT - Update Department
```typescript
// Request
PUT /api/departments
Content-Type: application/json

{
  "id": "existing-uuid",
  "institution_code": "JKKN",
  "department_code": "ECE",
  "department_name": "Electronics and Communication Engineering (Updated)",
  "display_name": "E&C",
  "is_active": true
}

// Response (200 OK)
{
  "id": "existing-uuid",
  // ... updated fields
}
```

### DELETE - Delete Department
```typescript
// Request
DELETE /api/departments?id=uuid

// Response (200 OK)
{
  "success": true
}
```

---

## ✅ Validation Rules

### Required Fields
- ✅ `institution_code` - Must match existing institution
- ✅ `department_code` - Max 50 chars, unique per institution
- ✅ `department_name` - Max 255 chars

### Optional Fields
- `display_name` - Max 100 chars
- `description` - No limit
- `stream` - Must be one of allowed values if provided
- `status` - Defaults to `true`

### Format Rules
```typescript
// Department Code: Alphanumeric with hyphens/underscores
department_code: /^[A-Za-z0-9\-_]+$/

// Stream: Must be one of:
stream: 'Arts' | 'Science' | 'Management' | 'Commerce' | 
        'Engineering' | 'Medical' | 'Law' | null
```

---

## 📤 Excel Import Format

### Required Columns
| Column Name | Example | Notes |
|-------------|---------|-------|
| Institution Code | JKKN | Must exist in institutions table |
| Department Code | CSE | Unique per institution |
| Department Name | Computer Science | Full name |

### Optional Columns
| Column Name | Example | Notes |
|-------------|---------|-------|
| Display Name | CS | Short name |
| Description | Dept of CS | Optional text |
| Stream | Engineering | One of allowed values |
| Status | Active | "Active" or "Inactive" |

### Sample Excel Template
```
Institution Code* | Department Code* | Department Name* | Display Name | Stream | Status
JKKN             | CSE              | Computer Science | CS           | Engineering | Active
JKKN             | ECE              | Electronics      | E&C          | Engineering | Active
JKKN             | MECH             | Mechanical       | Mech         | Engineering | Active
```

---

## 🚨 Common Errors

### Error 1: Duplicate Department
```
ERROR: duplicate key value violates unique constraint
DETAIL: Key (institution_code, department_code) already exists
```
**Solution:** Use a different department_code or update the existing record.

### Error 2: Invalid Institution
```
ERROR: insert or update violates foreign key constraint
DETAIL: Key (institution_code) not present in institutions table
```
**Solution:** Ensure the institution exists first.

### Error 3: Invalid Stream
```
ERROR: new row violates check constraint
DETAIL: stream must be one of: Arts, Science, Management, Commerce, Engineering, Medical, Law
```
**Solution:** Use one of the allowed stream values.

---

## 🔗 Related Tables

### Must Exist Before Creating Departments:
- ✅ `institutions` - Parent table for foreign keys

### Depend on Departments:
- `students` - Students belong to departments
- `programs` - Programs may have offering departments
- `courses` - Courses may be assigned to departments

---

## 📚 Additional Resources

- Migration File: `supabase/migrations/20250103_create_departments_table.sql`
- API Route: `app/api/departments/route.ts`
- Frontend Page: `app/(authenticated)/department/page.tsx`
- Diagnostic Test: `test-departments-setup.sql`

---

## 🎯 Quick Reference Card

```
TABLE:      departments
SCHEMA:     public
RLS:        ✅ Enabled
POLICIES:   Read (all authenticated), Write (admins only)
FK DEPS:    institutions, auth.users
CHILD OF:   institutions (many-to-one)
PARENT OF:  students, programs (one-to-many)
INDEXES:    6 indexes for performance
TRIGGERS:   Auto-update timestamp on changes
```

---

**Last Updated:** 2025-01-10  
**Version:** 1.0  
**Status:** ✅ Production Ready

