# JKKN COE - Controller of Examination

## Overview

**JKKN COE (Controller of Examination)** is a comprehensive Next.js 15 application for managing examination systems at JKKN Arts Colleges. Built with TypeScript, Supabase, and Tailwind CSS, it features role-based access control (RBAC), secure authentication, and an intuitive interface for exam management.

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth with Google OAuth
- **UI Components**: Shadcn UI, Radix UI, Tailwind CSS
- **State Management**: React Context API
- **Forms**: React Hook Form
- **Excel/CSV**: XLSX library
- **Icons**: Lucide React

## Key Features

### 🔐 Authentication & Authorization
- Google OAuth integration via Supabase Auth
- Role-Based Access Control (RBAC) with permissions system
- User activation/deactivation management
- Session timeout handling
- Protected routes with flexible authorization logic
- Email verification system with race condition protection

### 📊 Core Modules

#### 1. **Institution Management**
- Create, read, update, and delete institutions
- Excel/JSON import and export
- Template-based data upload with reference sheets
- Bulk upload with row-by-row validation

#### 2. **Academic Structure**
- **Departments**: Manage academic departments
- **Degrees**: Configure degree programs
- **Programs**: Define program offerings with multi-FK relationships
- **Regulations**: Manage academic regulations and rules
- **Semesters**: Configure semester details
- **Sections**: Organize student sections

#### 3. **Course Management**
- **Courses**: Comprehensive course catalog with split credits
- **Course Mapping**: Map courses to programs and semesters
- **Course Offering**: Schedule course offerings with enrollment tracking
- Excel template with single combined reference sheet
- Foreign key auto-resolution and validation

#### 4. **Student Management**
- Student record management (CRUD operations)
- **MyJKKN API Integration**:
  - Fetch student data from MyJKKN platform
  - List view with search, sort, and pagination
  - Detailed student information view
  - Real-time profile completion tracking
  - Comprehensive student details (academic, family, address, transport)

#### 5. **Examination Management**
- **Exam Registrations**: Student course registration for exams
  - Student register number integration
  - Multi-step foreign key validation
  - Upload tracking with detailed error reporting
  - Template with institutional reference data
- **Exam Rooms**: Configure examination halls and rooms
- **Boards**: Manage examination boards and authorities

### 📥 Import/Export Features

All modules support standardized import/export patterns:

#### Export Options
- **JSON Export**: Raw data in JSON format
- **Excel Export**: Formatted spreadsheet with all fields
  - Separate columns for codes and names
  - Optimized column widths
  - Human-readable format

#### Template Download
- **Styled Headers**: Mandatory fields marked with red background and asterisk (*)
- **Sample Data**: Pre-filled example row with realistic data
- **Reference Sheets**: Combined reference data in organized sections
  - Institution codes with names
  - Course codes
  - Session codes with names
  - Program codes with names
- **Visual Indicators**: Clear distinction between required and optional fields

#### Import Support
- **Multiple Formats**: JSON, CSV, Excel (.xlsx, .xls)
- **Flexible Field Mapping**: Supports header variations (with/without asterisk, lowercase)
- **Smart Data Conversion**: Automatic type conversion and null handling
- **Validation**: Pre-upload validation with specific error messages
- **Row Tracking**: Accurate Excel row numbers in error reports

#### Upload Error Handling
- **Visual Summary Cards**: 3-column grid showing total/success/failed counts
- **Detailed Error List**: Row-by-row error details with readable codes
- **Helpful Tips Section**: Common fixes and data format guidance
- **Toast Notifications**: Color-coded feedback (green/yellow/red)
- **Display Codes Pattern**: Shows human-readable codes instead of UUIDs in errors

### 🎨 UI/UX Features

- **Responsive Design**: Mobile-friendly layouts
- **Dark Mode Support**: System-wide theme switching
- **Searchable Tables**: Real-time client-side search
- **Sortable Columns**: Click-to-sort on any column
- **Pagination**: Server-side pagination for large datasets
- **Loading States**: Smooth loading indicators
- **Toast Notifications**: User-friendly feedback messages
- **Error Dialogs**: Comprehensive error reporting with actionable information
- **Modal Forms**: Side-sheet forms with validation
- **Color-Coded Sections**: Gradient headers for visual organization

### 🔒 Security Features

- **Server-Side API Keys**: Sensitive credentials stored server-side only
- **Row Level Security (RLS)**: Supabase RLS policies
- **Input Sanitization**: XSS prevention
- **Atomic Operations**: Race condition protection
- **Unique Constraints**: Data integrity enforcement
- **Foreign Key Validation**: Referential integrity checks
- **Environment Variables**: Secure configuration management

### 📈 Data Validation

- **Client-Side Validation**: Immediate feedback with inline error messages
- **Server-Side Validation**: API-level validation with specific error codes
- **Foreign Key Auto-Mapping**: Automatic ID resolution from codes
- **Pre-Insert Validation**: Ensures referenced entities exist
- **Conditional Validation**: Context-aware validation rules
- **Format Validation**: Regex-based pattern matching
- **Numeric Range Validation**: Min/max constraints

## Claude Code Skills (⭐ NEW)

**Date:** October 27, 2025

A comprehensive collection of Claude Code skills to accelerate development:

### Available Skills

1. **generate-crud-page** - Complete full-stack CRUD page generator
   - Frontend React/TypeScript components (~1200 lines)
   - Backend API routes with Supabase (~220 lines)
   - Search, filter, sort, pagination
   - Import/Export with validation
   - Foreign key auto-mapping

2. **generate-migration** - Database migration SQL generator
   - Table creation with proper schema
   - Foreign keys with CASCADE
   - Indexes and RLS policies
   - Audit columns and triggers

3. **test-api-endpoints** - API endpoint testing generator
   - Comprehensive Jest/Vitest tests
   - All HTTP methods (GET/POST/PUT/DELETE)
   - Error scenarios and edge cases
   - Response validation

4. **generate-docs** - Documentation generator
   - API documentation (OpenAPI style)
   - User guides with workflows
   - Developer documentation
   - Architecture documentation

5. **fix-common-issues** - Troubleshooting assistant
   - Auth errors diagnosis and fixes
   - Database error solutions
   - Foreign key issue resolution
   - UI, performance, and build fixes

6. **generate-component** - React component generator
   - Form inputs with validation
   - Data tables with sorting
   - Modal dialogs
   - Cards and layouts

### Quick Start

See [.claude/skills/QUICKSTART.md](.claude/skills/QUICKSTART.md) for detailed usage guide.

**Time Savings:**
- CRUD Page: 90%+ (30 min vs. 6 hours)
- Migration: 85%+ (5 min vs. 45 min)
- API Tests: 90%+ (10 min vs. 3 hours)
- Documentation: 90%+ (10 min vs. 4 hours)
- Components: 85%+ (10 min vs. 2 hours)

**Documentation:**
- [Skills README](.claude/skills/README.md) - Complete skills documentation
- [Quick Start Guide](.claude/skills/QUICKSTART.md) - Get started in minutes

## Recent Features (October 2025)

### 🆕 MyJKKN API Integration
**Date:** October 24, 2025
- Complete integration with MyJKKN platform for student data
- Type-safe TypeScript API client library
- Paginated student list (20 items per page)
- Detailed student information view with 4 color-coded sections
- Real-time search and sortable columns
- Dashboard statistics (total, complete, incomplete profiles)
- Secure Bearer token authentication
- Comprehensive error handling and retry options

**Files:**
- `lib/myjkkn-api.ts` - API client library
- `app/api/myjkkn/students/route.ts` - Students list endpoint
- `app/api/myjkkn/students/[id]/route.ts` - Student details endpoint
- `app/coe/myjkkn-students/page.tsx` - Main UI
- `app/coe/myjkkn-students/student-details.tsx` - Details component

### 🆕 Exam Registrations Module
**Date:** October 27, 2025
- Complete CRUD operations for exam registrations
- Student register number integration (e.g., 24JUGEN6001)
- Multi-step foreign key validation flow
- Enhanced upload summary with row count tracking
- Display codes pattern (readable codes in errors, not UUIDs)
- Excel template with institutional reference data
- Foreign key constraint migration for data integrity

**Key Features:**
- Institution, student, session, and course validation
- Cross-institution data corruption prevention
- Row-by-row error tracking with specific messages
- Visual upload summary cards (blue/green/red)
- Toast notifications with proper pluralization

**Files:**
- `app/coe/exam-registrations/page.tsx`
- `app/api/exam-registrations/route.ts`
- `supabase/migrations/20251027_add_missing_fk_constraints.sql`

### 🆕 Course Offering Improvements
**Date:** October 26, 2025
- Enhanced Excel export with code and name columns
- Improved template with styled headers (red = required)
- Single combined reference sheet (instead of 5 separate sheets)
- CSV import support
- Flexible field mapping (supports header variations)
- Better error messages with row tracking
- Active-only reference data filtering

**Benefits:**
- Easier data entry with single reference sheet
- Cleaner display (course codes without titles)
- Better organization with section separators
- Fewer errors with visual indicators
- Less clutter (2 sheets instead of 5)

### 🆕 New Modules Added
- **Board Management**: Examination boards and authorities
- **Exam Rooms**: Examination hall configuration
- **Student Module**: Enhanced student management interface

## Project Structure

```
jkkncoe/
├── app/
│   ├── coe/          # Protected routes
│   │   ├── board/                # Board management
│   │   ├── course-mapping/       # Course mapping
│   │   ├── course-mapping-index/ # Course mapping index
│   │   ├── course-offering/      # Course offerings
│   │   ├── courses/              # Course catalog
│   │   ├── degree/               # Degree management
│   │   ├── department/           # Department management
│   │   ├── exam-registrations/   # Exam registrations ⭐ NEW
│   │   ├── exam-rooms/           # Exam rooms ⭐ NEW
│   │   ├── institutions/         # Institution management
│   │   ├── myjkkn-students/      # MyJKKN student data ⭐ NEW
│   │   ├── program/              # Program management
│   │   ├── regulations/          # Regulation management
│   │   ├── section/              # Section management
│   │   ├── semester/             # Semester management
│   │   ├── student/              # Student management ⭐ NEW
│   │   └── students/             # Student records
│   ├── api/                      # API routes
│   │   ├── api-management/       # API key management
│   │   ├── boards/               # Board API
│   │   ├── course-mapping/       # Course mapping API
│   │   ├── course-offering/      # Course offering API
│   │   ├── courses/              # Courses API
│   │   ├── exam-registrations/   # Exam registrations API ⭐ NEW
│   │   ├── exam-rooms/           # Exam rooms API
│   │   ├── myjkkn/               # MyJKKN proxy API ⭐ NEW
│   │   ├── program/              # Program API
│   │   └── students/             # Students API
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # Shadcn UI components
│   │   └── searchable-select.tsx # Searchable dropdown ⭐ NEW
│   └── protected-route.tsx       # Route guard component
├── lib/
│   ├── auth/                     # Authentication utilities
│   ├── utils/                    # Utility functions
│   ├── myjkkn-api.ts            # MyJKKN API client ⭐ NEW
│   ├── supabase-server.ts       # Server-side Supabase client
│   └── supabase-client.ts       # Client-side Supabase client
├── supabase/
│   └── migrations/               # Database migrations
│       └── 20251027_add_missing_fk_constraints.sql ⭐ NEW
├── .claude/                      # Claude Code configuration
│   └── skills/                   # Claude Code Skills ⭐ NEW
│       ├── generate-crud-page.yaml      # Complete CRUD generator
│       ├── generate-migration.yaml      # Database migration generator
│       ├── test-api-endpoints.yaml      # API testing generator
│       ├── generate-docs.yaml           # Documentation generator
│       ├── fix-common-issues.yaml       # Troubleshooting assistant
│       ├── generate-component.yaml      # React component generator
│       ├── README.md                    # Skills documentation
│       └── QUICKSTART.md                # Quick start guide
├── CLAUDE.md                     # Development guidelines
├── CoE PRD.txt                   # Product requirements
└── README.md                     # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Google OAuth credentials (for authentication)
- MyJKKN API key (for student data integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jkkncoe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your credentials:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # MyJKKN API Integration
   MYJKKN_API_KEY=your_myjkkn_api_key
   MYJKKN_API_BASE_URL=https://www.jkkn.ai/api
   ```

4. **Run database migrations**
   ```bash
   npx supabase migration up
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Database Schema

### Core Tables

- **users**: User accounts with RBAC
- **roles**: System roles (admin, teacher, student, etc.)
- **permissions**: Granular permissions
- **role_permissions**: Role-permission mappings
- **user_roles**: User-role assignments
- **institutions**: Educational institutions
- **departments**: Academic departments
- **degrees**: Degree programs
- **programs**: Program offerings
- **regulations**: Academic regulations
- **semesters**: Semester configuration
- **sections**: Student sections
- **courses**: Course catalog
- **course_mapping**: Course-to-program mappings
- **course_offering**: Course offerings with enrollment
- **students**: Student records
- **exam_registrations**: Exam registrations (⭐ NEW)
- **examination_sessions**: Exam sessions
- **exam_rooms**: Examination rooms (⭐ NEW)
- **boards**: Examination boards (⭐ NEW)

### Foreign Key Relationships

The application uses comprehensive foreign key constraints for data integrity:
- Students → Institutions, Degrees, Departments, Programs, Semesters, Sections
- Programs → Institutions, Degrees, Departments
- Course Offerings → Institutions, Courses, Sessions, Programs
- Exam Registrations → Institutions, Students, Sessions, Courses

See [DEPARTMENTS_TABLE_REFERENCE.md](DEPARTMENTS_TABLE_REFERENCE.md) for detailed schema documentation.

## API Documentation

### Internal API Endpoints

#### MyJKKN Integration (⭐ NEW)
```
GET /api/myjkkn/students
  Query: page, limit
  Returns: Paginated student list from MyJKKN

GET /api/myjkkn/students/:id
  Path: student UUID
  Returns: Detailed student information
```

#### Exam Registrations (⭐ NEW)
```
GET /api/exam-registrations
  Returns: All exam registrations with joins

POST /api/exam-registrations
  Body: Registration data with FKs
  Returns: Created registration

PUT /api/exam-registrations
  Body: Registration update with ID
  Returns: Updated registration

DELETE /api/exam-registrations/:id
  Path: Registration ID
  Returns: Success/failure
```

#### Standard CRUD Endpoints

All entity modules follow RESTful conventions:
- `GET /api/[entity]` - List all records
- `POST /api/[entity]` - Create new record
- `PUT /api/[entity]` - Update existing record
- `DELETE /api/[entity]/[id]` - Delete record

Entities: `institutions`, `departments`, `degrees`, `programs`, `regulations`, `semesters`, `sections`, `courses`, `course-mapping`, `course-offering`, `students`, `boards`, `exam-rooms`

## Development Standards

### Code Conventions

- **PascalCase**: Components, Types, Interfaces
- **kebab-case**: Directory names, file names
- **camelCase**: Variables, functions, methods
- **UPPERCASE**: Environment variables, constants
- **Tabs**: Indentation
- **Single quotes**: Strings
- **Strict TypeScript**: Enabled

### Form Design

- **Form Width**: Default 800px, adjustable (600px/1000px)
- **Header Structure**: Gradient background with icon, title, description
- **Section Structure**: Icon + gradient title + border separator
- **Field Structure**: Label (with asterisk for required) + Input + error message
- **Validation**: Inline validation with error state styling
- **Toast Notifications**: Color-coded feedback (green/yellow/red)

### Import/Export Pattern

All entity pages must implement:
1. **Upload Summary Tracking**: Total, success, failed counts
2. **Visual Summary Cards**: 3-column grid (blue/green/red)
3. **Detailed Error List**: Row numbers with specific errors
4. **Foreign Key Validation**: Pre-insert validation with clear messages
5. **Display Codes Pattern**: Readable codes in errors, not UUIDs
6. **Template with Reference**: Combined reference sheet for all FKs
7. **Enhanced Toast Messages**: Proper pluralization and counts

See [CLAUDE.md](CLAUDE.md) for comprehensive development standards.

## Documentation

### Project Documentation Files

- **[CLAUDE.md](CLAUDE.md)** - Complete development guidelines and patterns
- **[CoE PRD.txt](CoE PRD.txt)** - Product requirements document
- **[MYJKKN_IMPLEMENTATION_SUMMARY.md](MYJKKN_IMPLEMENTATION_SUMMARY.md)** - MyJKKN API integration details
- **[EXAM_REGISTRATIONS_IMPLEMENTATION_SUMMARY.md](EXAM_REGISTRATIONS_IMPLEMENTATION_SUMMARY.md)** - Exam registrations module details
- **[COURSE_OFFERING_IMPORT_EXPORT_IMPROVEMENTS.md](COURSE_OFFERING_IMPORT_EXPORT_IMPROVEMENTS.md)** - Course offering enhancements
- **[DEPARTMENTS_TABLE_REFERENCE.md](DEPARTMENTS_TABLE_REFERENCE.md)** - Database schema reference
- **[UNIVERSAL_CRUD_PROMPT_TEMPLATE.md](UNIVERSAL_CRUD_PROMPT_TEMPLATE.md)** - CRUD template standards

### Authentication & Security Documentation

- **[GOOGLE_AUTHENTICATION_COMPLETE.md](GOOGLE_AUTHENTICATION_COMPLETE.md)** - Google OAuth setup
- **[USER_ACTIVE_STATUS_GUIDE.md](USER_ACTIVE_STATUS_GUIDE.md)** - User activation system
- **[SESSION_TIMEOUT_GUIDE.md](SESSION_TIMEOUT_GUIDE.md)** - Session management

## Troubleshooting

### Common Issues

1. **MyJKKN API Authentication Error (401)**
   - Verify API key in `.env.local`
   - Test connection: `curl -H "Authorization: Bearer YOUR_KEY" https://www.jkkn.ai/api/api-management/students?page=1&limit=1`
   - Contact MyJKKN administrator for valid API key
   - See [MYJKKN_API_KEY_ISSUE.md](MYJKKN_API_KEY_ISSUE.md)

2. **Google OAuth Issues**
   - Verify OAuth credentials in Supabase dashboard
   - Check redirect URLs configuration
   - See [OAUTH_TROUBLESHOOTING.md](OAUTH_TROUBLESHOOTING.md)

3. **Excel Import Errors**
   - Ensure all required fields are filled
   - Verify foreign key codes exist (use template reference sheet)
   - Check row numbers in error dialog
   - Download template for correct format

4. **Foreign Key Constraint Violations**
   - Run migration: `npx supabase migration up --file supabase/migrations/20251027_add_missing_fk_constraints.sql`
   - Verify referenced records exist
   - Check institution ID matches across related tables

## Testing

### Manual Testing Checklist

- [ ] User authentication (Google OAuth)
- [ ] RBAC permissions and role-based access
- [ ] CRUD operations on all entity modules
- [ ] Excel/CSV import with validation
- [ ] Template download with reference sheets
- [ ] JSON/Excel export with proper formatting
- [ ] MyJKKN student data fetch and display
- [ ] Exam registration creation with FK validation
- [ ] Search and sort on table columns
- [ ] Pagination on large datasets
- [ ] Error handling and user feedback
- [ ] Dark mode switching
- [ ] Responsive design on mobile

## Success Metrics

- **60%** reduction in result processing time
- **70%** reduction in internal exam processing time
- **80%** reduction in paper consumption
- **99.9%** system uptime during critical periods
- Same-day digital certificate generation

## Contributing

### Development Workflow

1. Create feature branch from `main`
2. Implement changes following [CLAUDE.md](CLAUDE.md) standards
3. Test thoroughly (manual and automated)
4. Create pull request with detailed description
5. Wait for code review and approval
6. Merge to `main` after approval

### Code Review Checklist

- [ ] Follows naming conventions
- [ ] TypeScript strict mode compliant
- [ ] Implements standardized import/export pattern
- [ ] Includes inline validation with error messages
- [ ] Has proper error handling with user-friendly messages
- [ ] Uses foreign key auto-mapping where applicable
- [ ] Implements display codes pattern for error reporting
- [ ] Includes upload summary tracking
- [ ] Has comprehensive documentation

## Team

- **Full-Stack Developers**: 2
- **Backend Developer**: 1
- **UI/UX Designer**: 1
- **DevOps Engineer**: 1
- **QA Engineer**: 1
- **Project Manager**: 1

## License

Proprietary - JKKN Arts Colleges

## Support

For issues or questions:
- **Technical Issues**: Contact JKKN COE Development Team
- **API Key Issues**: Contact MyJKKN administrator
- **Bug Reports**: Create issue in project repository
- **Feature Requests**: Submit via project management system

---

**Version:** 1.5.0
**Last Updated:** October 27, 2025
**Framework:** Next.js 15 with TypeScript
**Database:** PostgreSQL (Supabase)
**Status:** Active Development

**Powered by AI-Assisted Development:**
Built using Cursor IDE and Claude Code for accelerated development velocity.
