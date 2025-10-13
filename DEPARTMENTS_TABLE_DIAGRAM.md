# 📊 Departments Table - Visual Diagram

## Table Structure Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEPARTMENTS TABLE                          │
├─────────────────────────────────────────────────────────────────┤
│ 🔑 PRIMARY KEY                                                  │
│   • id (UUID) - Auto-generated                                  │
├─────────────────────────────────────────────────────────────────┤
│ 🔗 FOREIGN KEYS                                                 │
│   • institutions_id → institutions.id                           │
│   • institution_code → institutions.institution_code            │
│   • created_by → auth.users.id                                  │
│   • updated_by → auth.users.id                                  │
├─────────────────────────────────────────────────────────────────┤
│ 📝 REQUIRED FIELDS                                              │
│   • department_code (VARCHAR 50) - e.g., "CSE"                  │
│   • department_name (VARCHAR 255) - Full name                   │
│   • status (BOOLEAN) - Active/Inactive                          │
├─────────────────────────────────────────────────────────────────┤
│ 📄 OPTIONAL FIELDS                                              │
│   • display_name (VARCHAR 100) - Short name                     │
│   • description (TEXT) - Details                                │
│   • stream (VARCHAR 50) - Arts/Science/Engineering/etc.         │
├─────────────────────────────────────────────────────────────────┤
│ ⏰ AUDIT FIELDS                                                 │
│   • created_at (TIMESTAMPTZ) - Auto-set on insert               │
│   • updated_at (TIMESTAMPTZ) - Auto-updated via trigger         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Relationship Diagram

```
                    ┌─────────────────┐
                    │  INSTITUTIONS   │
                    │  (Parent)       │
                    ├─────────────────┤
                    │ • id (PK)       │
                    │ • inst_code (UK)│
                    └────────┬────────┘
                             │
                             │ 1
                             │
                             │ N
                    ┌────────▼────────┐
                    │  DEPARTMENTS    │
                    │  (Current)      │
                    ├─────────────────┤
                    │ • id (PK)       │
                    │ • inst_id (FK)  │◄────┐
                    │ • inst_code (FK)│     │ Both reference
                    │ • dept_code     │     │ institutions!
                    │ • dept_name     │─────┘
                    │ • stream        │
                    │ • status        │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │ 1          │ 1          │ 1
                │            │            │
                │ N          │ N          │ N
         ┌──────▼──────┐ ┌──▼──────┐ ┌──▼──────┐
         │  STUDENTS   │ │PROGRAMS │ │ COURSES │
         │  (Child)    │ │(Child)  │ │(Child)  │
         ├─────────────┤ ├─────────┤ ├─────────┤
         │ • dept_id   │ │ • dept_ │ │ • dept_ │
         │   (FK)      │ │   id(FK)│ │   id(FK)│
         └─────────────┘ └─────────┘ └─────────┘
```

---

## Data Flow Diagram

```
┌──────────────┐
│   Frontend   │
│  (Next.js)   │
└──────┬───────┘
       │ HTTP Request
       │
       ▼
┌──────────────┐
│  API Route   │
│/api/depts    │
└──────┬───────┘
       │ Validates & Maps
       │ institution_code → institutions_id
       │
       ▼
┌──────────────┐
│  Supabase    │
│  Service     │
└──────┬───────┘
       │ SQL Query
       │
       ▼
┌──────────────┐
│ PostgreSQL   │
│ departments  │
│   table      │
└──────────────┘
```

---

## Constraint Diagram

```
UNIQUE CONSTRAINT:
  (institution_code, department_code)
  
  Example:
  ✅ ALLOWED:
     JKKN + CSE  → Valid
     JKKN + ECE  → Valid
     ANBU + CSE  → Valid
  
  ❌ BLOCKED:
     JKKN + CSE  → Duplicate!
     JKKN + CSE  → Duplicate!

CHECK CONSTRAINT:
  stream IN ('Arts', 'Science', 'Management', 
             'Commerce', 'Engineering', 'Medical', 'Law')
  
  Example:
  ✅ ALLOWED: 'Engineering', 'Science', NULL
  ❌ BLOCKED: 'Technology', 'Business'
```

---

## RLS Policy Diagram

```
┌────────────────────────────────────────────┐
│           USER AUTHENTICATION              │
└───────────────┬────────────────────────────┘
                │
       ┌────────┴────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│   SELECT    │   │INSERT/UPDATE│
│   (Read)    │   │   DELETE    │
└─────┬───────┘   └──────┬──────┘
      │                  │
      │ ✅ All           │ 🔒 Admins
      │ Authenticated   │    Only
      │ Users           │
      ▼                  ▼
┌─────────────────────────────────┐
│      DEPARTMENTS TABLE          │
│  (Row Level Security Enabled)   │
└─────────────────────────────────┘

Policy Logic:
• Read: auth.role() = 'authenticated'
• Write: user has role in ['super_admin', 'admin', 'coe_admin']
```

---

## Index Strategy

```
PRIMARY QUERIES:
┌────────────────────────────────┐
│ 1. List all by institution     │ → idx_departments_institution_code
├────────────────────────────────┤
│ 2. Find by dept code           │ → idx_departments_department_code
├────────────────────────────────┤
│ 3. Filter by status            │ → idx_departments_status
├────────────────────────────────┤
│ 4. Filter by stream            │ → idx_departments_stream
├────────────────────────────────┤
│ 5. Join with institutions      │ → idx_departments_institutions_id
├────────────────────────────────┤
│ 6. Order by creation           │ → idx_departments_created_at
└────────────────────────────────┘
```

---

## Trigger Flow

```
UPDATE departments
      │
      ▼
  BEFORE UPDATE
      │
      ▼
┌─────────────────┐
│ update_updated_ │
│  at() function  │
└────────┬────────┘
         │ Sets: NEW.updated_at = NOW()
         ▼
   Save to DB
```

---

## CRUD Operation Flow

### CREATE (POST)
```
1. User submits form
   ↓
2. Frontend sends POST /api/departments
   ↓
3. API validates data
   ↓
4. API maps institution_code → institutions_id
   ↓
5. API inserts into departments table
   ↓
6. Supabase checks:
   • RLS policy (admin?)
   • FK constraints (institution exists?)
   • Unique constraint (no duplicate?)
   • Check constraint (valid stream?)
   ↓
7. Return created department
   ↓
8. Frontend updates UI
```

### READ (GET)
```
1. User opens departments page
   ↓
2. Frontend sends GET /api/departments
   ↓
3. API queries: SELECT * FROM departments
   ↓
4. Supabase applies RLS policy
   ↓
5. Return filtered results
   ↓
6. Frontend displays table
```

### UPDATE (PUT)
```
1. User edits department
   ↓
2. Frontend sends PUT /api/departments
   ↓
3. API validates changes
   ↓
4. API runs UPDATE query
   ↓
5. Trigger updates 'updated_at'
   ↓
6. Return updated department
   ↓
7. Frontend updates UI
```

### DELETE (DELETE)
```
1. User confirms deletion
   ↓
2. Frontend sends DELETE /api/departments?id=uuid
   ↓
3. API runs DELETE query
   ↓
4. Cascade deletes (if any children)
   ↓
5. Return success
   ↓
6. Frontend removes from UI
```

---

## Sample Record Journey

```
START: User creates department
│
├─ INPUT:
│  {
│    institution_code: "JKKN",
│    department_code: "CSE",
│    department_name: "Computer Science",
│    stream: "Engineering",
│    is_active: true
│  }
│
├─ TRANSFORMATION:
│  • Map institution_code → institutions_id (via DB lookup)
│  • Rename is_active → status
│  • Add created_at = NOW()
│  • Add updated_at = NOW()
│  • Generate id = UUID
│
├─ STORED IN DB:
│  {
│    id: "123e4567-...",
│    institutions_id: "789abc...",
│    institution_code: "JKKN",
│    department_code: "CSE",
│    department_name: "Computer Science",
│    stream: "Engineering",
│    status: true,
│    created_at: "2025-01-10T10:00:00Z"
│  }
│
└─ RETURNED TO CLIENT:
   {
     id: "123e4567-...",
     institution_code: "JKKN",
     department_code: "CSE",
     department_name: "Computer Science",
     stream: "Engineering",
     is_active: true,  ← normalized from 'status'
     created_at: "2025-01-10T10:00:00Z"
   }
```

---

## Common Use Cases

### 1. Department Dropdown
```typescript
// Query
SELECT department_code, department_name 
FROM departments 
WHERE institution_code = 'JKKN' 
  AND status = true
ORDER BY department_name;

// Result
[
  { code: "CSE", name: "Computer Science" },
  { code: "ECE", name: "Electronics" },
  { code: "MECH", name: "Mechanical" }
]
```

### 2. Department Stats
```sql
-- Count by stream
SELECT 
  stream,
  COUNT(*) as count
FROM departments
GROUP BY stream;
```

### 3. Department with Institution
```sql
-- Join with parent
SELECT 
  d.department_name,
  i.name as institution_name
FROM departments d
JOIN institutions i ON d.institutions_id = i.id;
```

---

## Quick Tips

✅ **DO:**
- Always provide valid institution_code
- Use unique department_code per institution
- Validate stream from allowed list
- Keep department_code short and meaningful

❌ **DON'T:**
- Don't use same dept_code in same institution
- Don't use arbitrary stream values
- Don't skip institution_code validation
- Don't exceed character limits

---

**Legend:**
- PK = Primary Key
- FK = Foreign Key  
- UK = Unique Key
- → = References
- ◄ = Referenced by











