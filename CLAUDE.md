# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JKKN COE (Controller of Examination) is a Next.js 15 application for managing examination systems with role-based access control (RBAC), built with TypeScript, Supabase, and Tailwind CSS.

## Development Commands

### Essential Commands
```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint
```

### TypeScript
- Strict mode enabled (`strict: true` in tsconfig.json)
- Path alias: `@/*` maps to root directory
- Target: ES2017

## Architecture Overview

### Authentication & Authorization

**Auth Flow:**
1. Google OAuth via Supabase Auth (`@supabase/supabase-js`)
2. Middleware validates session and checks `is_active` status ([middleware.ts](middleware.ts))
3. Client-side auth context provides user state ([lib/auth/auth-context.tsx](lib/auth/auth-context.tsx))
4. Protected routes use `<ProtectedRoute>` component ([components/protected-route.tsx](components/protected-route.tsx))

**RBAC System:**
- Database schema: `users`, `roles`, `permissions`, `role_permissions`, `user_roles` tables
- User activation check: `is_active` field in users table
- Permission checking: Via auth context hooks (`hasPermission`, `hasRole`, `hasAnyRole`)
- Route protection: Supports required permissions and roles with flexible authorization logic

**Key Auth Files:**
- [lib/supabase-server.ts](lib/supabase-server.ts) - Server-side Supabase client (uses service role key)
- [lib/auth/supabase-auth-service.ts](lib/auth/supabase-auth-service.ts) - Auth service wrapper
- [middleware.ts](middleware.ts) - Session validation, inactive user handling, public route configuration
- [components/protected-route.tsx](components/protected-route.tsx) - Client-side route guards

**Public Routes:** `/login`, `/auth/callback`, `/contact-admin`, `/verify-email`, `/`

### Email Verification System

**Implementation:**
- Verification codes stored in `verification_codes` table with email, code, expiry, and usage tracking
- Race condition protection: Atomic updates with `.is('used_at', null)` check ([app/api/auth/verify-email/route.ts](app/api/auth/verify-email/route.ts))
- Database constraint: Partial unique index on `(email, code) WHERE used_at IS NULL` prevents duplicate unused codes
- Security: Service role bypasses RLS policies for server-side verification

### Database Layer

**Supabase Configuration:**
- PostgreSQL database with Row Level Security (RLS)
- Service role key bypasses RLS for server operations
- Migrations in [supabase/migrations/](supabase/migrations/)
- Key tables: users, roles, permissions, role_permissions, user_roles, verification_codes, institutions, departments, programs, courses, regulations, semesters

### UI Architecture

**Component Structure:**
- App Router ([app/](app/)) with route groups: `(authenticated)/` for protected pages
- Shadcn UI + Radix UI primitives for accessible components
- Tailwind CSS with dark mode support via `next-themes`
- Mobile-responsive layouts using utility-first CSS

**Layout Pattern:**
- [app/(authenticated)/layout.tsx](app/(authenticated)/layout.tsx) - Wraps authenticated pages with `<ProtectedRoute>`
- [app/layout.tsx](app/layout.tsx) - Root layout with theme provider and auth context

## Development Standards

**Critical conventions from [.cursor/rules/DEVELOPMENT_STANDARDS.md](.cursor/rules/DEVELOPMENT_STANDARDS.md):**

### Naming Conventions
- **PascalCase**: Components, Types, Interfaces
- **kebab-case**: Directory names, file names
- **camelCase**: Variables, functions, methods, hooks, props
- **UPPERCASE**: Environment variables, constants
- Event handlers: `handleClick`, `handleSubmit`
- Boolean variables: `isLoading`, `hasError`, `canSubmit`
- Custom hooks: `useAuth`, `useForm`

### Code Style
- Use tabs for indentation
- Single quotes for strings
- Omit semicolons (unless required)
- Strict equality (`===`)
- Functional components with TypeScript interfaces
- Prefer `interface` over `type` for object structures

### Next.js Best Practices
- Use App Router for routing
- Default to Server Components, use `'use client'` only when needed (event listeners, browser APIs, state, client-only libraries)
- Use Next.js built-in components: `Image`, `Link`, `Script`
- URL query parameters for data fetching and server state management

### Form Design Standards

**Form Container Pattern:**
```typescript
<Sheet open={sheetOpen} onOpenChange={(o) => {
  if (!o) resetForm()
  setSheetOpen(o)
}}>
  <SheetContent className="sm:max-w-[800px] overflow-y-auto">
    {/* Form sections with space-y-8 */}
  </SheetContent>
</Sheet>
```

**Form Widths:** Default `sm:max-w-[800px]`, narrow `[600px]`, wide `[1000px]`

**Header Structure:** Gradient background with icon, title, description
**Section Structure:** Icon + gradient title + border separator
**Field Structure:** Label (with required asterisk) + Input + error message
**Validation:** Inline validation with error state styling
**Toast Notifications:** Success (green) with emoji, errors (destructive red)

### State Management
- Local: `useState`, `useReducer`, `useContext`
- Global: Redux Toolkit (if needed)
- Use selectors to encapsulate state access

### Security
- Input sanitization for XSS prevention
- DOMPurify for HTML sanitization
- Atomic database operations to prevent race conditions
- Unique constraints for data integrity

## Key Patterns

### Protected Route Usage
```typescript
<ProtectedRoute
  requiredPermissions={['courses:read']}
  requiredRoles={['admin', 'teacher']}
  requireAnyRole={true}
  redirectTo="/login"
>
  {children}
</ProtectedRoute>
```

### Auth Context Hooks
```typescript
const { user, isAuthenticated, hasPermission, hasRole } = useAuth()
```

### Server-Side Supabase Client
```typescript
import { getSupabaseServer } from '@/lib/supabase-server'
const supabase = getSupabaseServer() // Uses service role key
```

### Comprehensive Form Validation Pattern

Reference implementation: [app/(authenticated)/courses/page.tsx](app/(authenticated)/courses/page.tsx)

**Validation Function Structure:**
```typescript
const validate = () => {
  const e: Record<string, string> = {}

  // Required field validation
  if (!formData.institution_code.trim()) e.institution_code = 'Institution code is required'
  if (!formData.regulation_code.trim()) e.regulation_code = 'Regulation code is required'
  if (!formData.course_code.trim()) e.course_code = 'Course code is required'
  if (!formData.course_title.trim()) e.course_title = 'Course title is required'

  // Format validation with regex
  if (formData.course_code && !/^[A-Za-z0-9\-_]+$/.test(formData.course_code)) {
    e.course_code = 'Course code can only contain letters, numbers, hyphens, and underscores'
  }

  // Numeric range validation
  if (formData.credits && (Number(formData.credits) < 0 || Number(formData.credits) > 10)) {
    e.credits = 'Credits must be between 0 and 10'
  }

  // Conditional validation based on other fields
  if (formData.split_credit) {
    if (!formData.theory_credit || Number(formData.theory_credit) === 0) {
      e.theory_credit = 'Theory credit is required when split credit is enabled'
    }
    if (!formData.practical_credit || Number(formData.practical_credit) === 0) {
      e.practical_credit = 'Practical credit is required when split credit is enabled'
    }
  }

  // URL validation
  if (formData.syllabus_pdf_url && formData.syllabus_pdf_url.trim()) {
    try {
      new URL(formData.syllabus_pdf_url)
    } catch {
      e.syllabus_pdf_url = 'Please enter a valid URL (e.g., https://example.com/syllabus.pdf)'
    }
  }

  setErrors(e)
  return Object.keys(e).length === 0
}
```

**Error State Management:**
```typescript
const [errors, setErrors] = useState<Record<string, string>>({})
```

**Inline Error Display:**
```typescript
<div className="space-y-2">
  <Label htmlFor="course_code">
    Course Code <span className="text-red-500">*</span>
  </Label>
  <Input
    id="course_code"
    value={formData.course_code}
    onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
    className={errors.course_code ? 'border-red-500' : ''}
  />
  {errors.course_code && (
    <p className="text-sm text-red-500">{errors.course_code}</p>
  )}
</div>
```

**Form Submission with Validation:**
```typescript
const handleSubmit = async () => {
  if (!validate()) {
    toast({
      title: '⚠️ Validation Error',
      description: 'Please fix all validation errors before submitting.',
      variant: 'destructive'
    })
    return
  }
  // Proceed with API call
}
```

### Import/Upload Error Handling Pattern

Reference implementation: [app/(authenticated)/courses/page.tsx](app/(authenticated)/courses/page.tsx)

**Error Tracking State:**
```typescript
const [uploadErrors, setUploadErrors] = useState<string[]>([])
const [showErrorDialog, setShowErrorDialog] = useState(false)
```

**Row-by-Row Validation with Error Collection:**
```typescript
const handleFileUpload = async (jsonData: any[]) => {
  const errorDetails: string[] = []
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i]
    const rowNumber = i + 2 // +2 accounts for header row in Excel
    const validationErrors: string[] = []

    // Validate required fields
    if (!payload.institution_code?.trim()) {
      validationErrors.push('Institution code required')
    }
    if (!payload.course_code?.trim()) {
      validationErrors.push('Course code required')
    }

    // Format validation
    if (payload.course_code && !/^[A-Za-z0-9\-_]+$/.test(payload.course_code)) {
      validationErrors.push('Invalid course code format')
    }

    // Numeric validation
    if (payload.credits && (Number(payload.credits) < 0 || Number(payload.credits) > 10)) {
      validationErrors.push('Credits must be between 0 and 10')
    }

    if (validationErrors.length > 0) {
      errorCount++
      errorDetails.push(`Row ${rowNumber}: ${validationErrors.join(', ')}`)
      continue
    }

    // API call for valid rows
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const errData = await res.json()
        errorCount++
        errorDetails.push(`Row ${rowNumber}: ${errData.error || 'Server error'}`)
      } else {
        successCount++
      }
    } catch (err) {
      errorCount++
      errorDetails.push(`Row ${rowNumber}: Network error`)
    }
  }

  // Show results
  if (errorCount > 0) {
    setUploadErrors(errorDetails)
    setShowErrorDialog(true)
  }

  if (successCount > 0) {
    toast({
      title: '✅ Upload Complete',
      description: `${successCount} courses uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      className: 'bg-green-50 border-green-200'
    })
  }
}
```

**Visual Error Dialog:**
```typescript
<AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
  <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        Upload Errors ({uploadErrors.length} rows failed)
      </AlertDialogTitle>
      <AlertDialogDescription>
        The following rows contain validation errors. Please correct them and try again.
      </AlertDialogDescription>
    </AlertDialogHeader>

    <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/30 my-4">
      <div className="space-y-2">
        {uploadErrors.map((error, index) => (
          <div key={index} className="p-3 bg-background border border-red-200 rounded-md">
            <p className="text-sm font-mono text-red-600">{error}</p>
          </div>
        ))}
      </div>
    </div>

    <AlertDialogFooter>
      <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
        Close
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Toggle Button Implementation

**Using shadcn/ui Switch Component:**
```typescript
import { Switch } from '@/components/ui/switch'

// Simple toggle
<div className="flex items-center gap-3">
  <Label htmlFor="split_credit">Split Credit</Label>
  <Switch
    id="split_credit"
    checked={formData.split_credit}
    onCheckedChange={(v) => setFormData({ ...formData, split_credit: v })}
  />
</div>
```

**Conditional Field Enabling/Disabling:**
```typescript
// Theory Credit field - enabled only when Split Credit is ON
<Input
  type="number"
  value={formData.theory_credit}
  onChange={(e) => setFormData({ ...formData, theory_credit: e.target.value })}
  disabled={!formData.split_credit}
  className={!formData.split_credit ? 'bg-muted cursor-not-allowed' : ''}
/>

// Practical Credit field - enabled only when Split Credit is ON
<Input
  type="number"
  value={formData.practical_credit}
  onChange={(e) => setFormData({ ...formData, practical_credit: e.target.value })}
  disabled={!formData.split_credit}
  className={!formData.split_credit ? 'bg-muted cursor-not-allowed' : ''}
/>
```

### Toast Notification Patterns

**Success Toast (Green):**
```typescript
toast({
  title: '✅ Success',
  description: 'Course created successfully!',
  className: 'bg-green-50 border-green-200'
})
```

**Error Toast (Red):**
```typescript
toast({
  title: '❌ Error',
  description: errorMessage,
  variant: 'destructive'
})
```

**Warning Toast (Yellow):**
```typescript
toast({
  title: '⚠️ Validation Error',
  description: 'Please fix all errors before submitting.',
  variant: 'destructive'
})
```

## Important Notes

- **Race Conditions:** Always use atomic updates with conditional checks when marking records as used/processed
- **RLS Bypass:** Service role key bypasses Row Level Security - use carefully in server-side API routes
- **Session Timeout:** Handled via middleware and client-side session timeout provider
- **Inactive Users:** Automatically signed out and redirected to login with error cookie
- **Page Refresh Issues:** Middleware includes delays to prevent race conditions during auth state hydration
