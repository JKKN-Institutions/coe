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

### Validation Pattern
```typescript
const validate = () => {
  const e: Record<string, string> = {}
  if (!formData.field.trim()) e.field = "Required"
  setErrors(e)
  return Object.keys(e).length === 0
}
```

## Important Notes

- **Race Conditions:** Always use atomic updates with conditional checks when marking records as used/processed
- **RLS Bypass:** Service role key bypasses Row Level Security - use carefully in server-side API routes
- **Session Timeout:** Handled via middleware and client-side session timeout provider
- **Inactive Users:** Automatically signed out and redirected to login with error cookie
- **Page Refresh Issues:** Middleware includes delays to prevent race conditions during auth state hydration
