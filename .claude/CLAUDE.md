# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build production bundle
npm run lint         # Run ESLint
```

**Key Paths:**
- Auth: `lib/auth/`, `middleware.ts`, `components/protected-route.tsx`
- API Routes: `app/api/`
- Pages: `app/(coe)/`
- Services: `services/`
- Types: `types/`
- Migrations: `supabase/migrations/`

## Project Overview

JKKN COE (Controller of Examination) - Next.js 15 app with TypeScript, Supabase, and Tailwind CSS for managing examination systems.

**Complete PRD:** See `.claude/COE PRD.txt` for requirements and roadmap.

**Tech Stack:** Next.js 15, React 19, Supabase (PostgreSQL), Shadcn UI, Tailwind CSS, Zod

## JKKN Terminology Standards

**CRITICAL:** Always use JKKN terminology:

| Standard Term | JKKN Term | Example |
|---------------|-----------|---------|
| Student | **Learner** | `types/learners.ts`, not `types/students.ts` |
| student_id | learner_id | Database fields, API parameters |
| /students | /learners | API routes |

**Positive Language:** "Needs improvement" not "Failed", "Learning opportunity" not "Backlog"

## Architecture

### Authentication & RBAC

**Flow:** Google OAuth → Supabase Auth → Middleware validation → Auth Context → Protected Routes

**Key Files:**
- `lib/supabase-server.ts` - Server-side client (service role key)
- `middleware.ts` - Session validation, `is_active` check
- `lib/auth/auth-context.tsx` - Client auth state
- `components/protected-route.tsx` - Route guards

**Usage:**
```typescript
// Auth context
const { user, hasPermission, hasRole } = useAuth()

// Protected route
<ProtectedRoute requiredPermissions={['courses:read']} requiredRoles={['admin']}>
  {children}
</ProtectedRoute>

// Server-side
import { getSupabaseServer } from '@/lib/supabase-server'
const supabase = getSupabaseServer()
```

**Public Routes:** `/login`, `/auth/callback`, `/contact-admin`, `/verify-email`, `/`

### Multi-Tenant Institution Context

Users see only their institution's data unless super_admin.

**Key Files:** `context/institution-context.tsx`, `components/layout/institution-selector.tsx`

```typescript
// In pages
const { filter, shouldFilter, isLoading } = useInstitutionFilter()

useEffect(() => {
  if (!isLoading) {
    const data = await fetchService(shouldFilter ? filter : undefined)
  }
}, [filter, shouldFilter, isLoading])
```

**Role Behavior:**
- `super_admin` - Switch institutions or view all
- `coe/deputy_coe/coe_office` - Only their institution's data

### MyJKKN API Integration

COE integrates with MyJKKN for shared data (regulations, learners, batches).

**Critical Constraints:**
1. MyJKKN uses `counselling_code` (not `institution_code`) for institution lookup
2. Server-side filtering often ignored - **always filter client-side by `institution_id`**
3. Deduplicate by CODE field (e.g., `regulation_code`), NOT by `id`

**Use the hook:** `useMyJKKNInstitutionFilter` from `hooks/use-myjkkn-institution-filter.ts`

```typescript
const { fetchRegulations } = useMyJKKNInstitutionFilter()
const regs = await fetchRegulations(counsellingCode) // Handles two-step lookup + dedup
```

## Development Standards

**See:** `.cursor/rules/DEVELOPMENT_STANDARDS.md` for full standards.

**Key Conventions:**
- **PascalCase**: Components, Types, Interfaces
- **kebab-case**: Directories, files
- **camelCase**: Variables, functions, hooks
- **UPPERCASE**: Environment variables, constants

**Code Style:** Tabs, single quotes, no semicolons, strict equality (`===`)

**Next.js:** Default Server Components, use `'use client'` only when needed

## Key Patterns

### Form Validation

```typescript
const [errors, setErrors] = useState<Record<string, string>>({})

const validate = () => {
  const e: Record<string, string> = {}
  if (!formData.field.trim()) e.field = 'Required'
  // Pattern: !/^regex$/.test(value)
  // Range: Number(value) < min || Number(value) > max
  setErrors(e)
  return Object.keys(e).length === 0
}
```

### API Error Handling

```typescript
// Server-side (API routes)
if (error) {
  if (error.code === '23505') return NextResponse.json({ error: 'Already exists' }, { status: 400 })
  if (error.code === '23503') return NextResponse.json({ error: 'Invalid reference' }, { status: 400 })
  return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
}
```

**PostgreSQL Error Codes:** 23505 (duplicate), 23503 (FK violation), 23514 (check constraint), 23502 (not-null)

### Foreign Key Auto-Mapping

Always resolve codes to UUIDs before insert:

```typescript
// 1. Lookup institution_code → institutions_id
const { data: inst } = await supabase.from('institutions').select('id').eq('institution_code', code).single()
if (!inst) return NextResponse.json({ error: `Institution "${code}" not found` }, { status: 400 })

// 2. Insert with both ID and code
.insert({ institutions_id: inst.id, institution_code: code, ... })
```

### Toast Patterns

```typescript
// Success
toast({ title: '✅ Created', description: '...', className: 'bg-green-50 border-green-200 text-green-800' })
// Error
toast({ title: '❌ Failed', description: '...', variant: 'destructive' })
```

### Form Sheet Pattern

Reference: `app/(coe)/master/degrees/page.tsx`

```typescript
<Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) resetForm(); setSheetOpen(o) }}>
  <SheetContent className="sm:max-w-[800px] overflow-y-auto">
    {/* Form sections with space-y-8 */}
  </SheetContent>
</Sheet>
```

## Important Notes

- **Race Conditions:** Use atomic updates with conditional checks (`.is('used_at', null)`)
- **RLS Bypass:** Service role key bypasses RLS - use in server API routes only
- **Session Handling:** Middleware validates sessions and handles inactive users
- **MyJKKN Responses:** Always handle both `response.data` and direct array: `const data = response.data || response || []`
