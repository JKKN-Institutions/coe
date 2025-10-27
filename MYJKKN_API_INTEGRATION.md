# MyJKKN API Integration

This document describes the integration with the MyJKKN API system for fetching student data.

## Overview

The MyJKKN API integration allows the JKKN COE application to fetch student information from the central MyJKKN platform. This provides a unified view of student data across the JKKN ecosystem.

## Architecture

### Components

1. **API Client Library** ([lib/myjkkn-api.ts](lib/myjkkn-api.ts))
   - Handles authentication with MyJKKN API using Bearer token
   - Provides type-safe functions for fetching student data
   - Implements error handling and retry logic
   - Validates API key format

2. **Server-Side API Route** ([app/api/myjkkn/students/route.ts](app/api/myjkkn/students/route.ts))
   - Next.js API route that proxies requests to MyJKKN API
   - Validates pagination parameters
   - Returns standardized error responses
   - Protects API key from client-side exposure

3. **Client UI Component** ([app/(authenticated)/myjkkn-students/page.tsx](app/(authenticated)/myjkkn-students/page.tsx))
   - Displays student data in a searchable, sortable table
   - Implements client-side pagination
   - Shows statistics and profile completion status
   - Provides real-time search and filtering
   - "View" action button to see detailed student information

4. **Student Details Component** ([app/(authenticated)/myjkkn-students/student-details.tsx](app/(authenticated)/myjkkn-students/student-details.tsx))
   - Displays comprehensive student information
   - Organized into sections: Basic, Academic, Family, Address & Transport
   - Color-coded information cards with gradient headers
   - Back navigation to student list

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```bash
# MyJKKN API Configuration
MYJKKN_API_KEY=jk_xxxxx_xxxxx
```

**API Key Format:** `jk_[32-character hex]_[8-character alphanumeric]`

**How to obtain API key:**
1. Contact your MyJKKN administrator
2. Request an API key for the COE application
3. Ensure the key has permissions for `api-management/students` endpoint

### Security Considerations

- **Never expose the API key in client-side code**
- The API key is stored in environment variables and only accessed server-side
- All MyJKKN API calls go through the Next.js API route proxy
- API key validation happens before making external requests

## API Endpoints

### MyJKKN API

**Base URL:** `https://www.jkkn.ai/api`

**Authentication:** Bearer token in `Authorization` header

#### GET /api-management/students

Fetches paginated student data.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page

**Response:**
```typescript
{
  "data": [
    {
      "id": "string",
      "first_name": "string",
      "last_name": "string",
      "roll_number": "string",
      "institution": "string",
      "department": "string",
      "program": "string",
      "is_profile_complete": boolean
    }
  ],
  "metadata": {
    "page": number,
    "totalPages": number,
    "total": number
  }
}
```

#### GET /api-management/students/[id]

Fetches detailed information for a single student.

**Path Parameters:**
- `id` (string, required) - Student ID (UUID)

**Response:**
```typescript
{
  "data": {
    "id": "string",
    "first_name": "string",
    "last_name": "string | null",
    "roll_number": "string",
    "student_email": "string",
    "college_email": "string",
    "student_mobile": "string",
    "father_name": "string",
    "father_mobile": "string",
    "mother_name": "string",
    "mother_mobile": "string",
    "date_of_birth": "string",
    "gender": "string",
    "religion": "string",
    "community": "string",
    "institution": { "id": "string", "name": "string" },
    "department": { "id": "string", "department_name": "string" },
    "program": { "id": "string", "program_name": "string" },
    "degree": { "id": "string", "degree_name": "string" },
    "is_profile_complete": boolean,
    "permanent_address_street": "string",
    "permanent_address_district": "string",
    "permanent_address_state": "string",
    "permanent_address_pin_code": "string",
    "entry_type": "string",
    "accommodation_type": "string",
    "bus_required": boolean,
    "bus_route": "string",
    "bus_pickup_location": "string"
  }
}
```

### Internal API Routes

#### `GET /api/myjkkn/students`

Fetches paginated list of students.

**Query Parameters:**
- `page` (number, optional, default: 1) - Page number (must be >= 1)
- `limit` (number, optional, default: 20) - Items per page (1-100)

**Error Responses:**
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Invalid API key
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Endpoint not found
- `500 Internal Server Error` - Server error

#### `GET /api/myjkkn/students/[id]`

Fetches detailed information for a single student.

**Path Parameters:**
- `id` (string, required) - Student ID (UUID)

**Error Responses:**
- `401 Unauthorized` - Invalid API key
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Student not found
- `500 Internal Server Error` - Server error

## Usage

### Fetching Students in Code

```typescript
import { fetchMyJKKNStudents } from '@/lib/myjkkn-api'

// Fetch first page with default limit (20)
const response = await fetchMyJKKNStudents()

// Fetch specific page with custom limit
const response = await fetchMyJKKNStudents({ page: 2, limit: 50 })

// Access data
const students = response.data
const { page, totalPages, total } = response.metadata
```

### Testing Connection

```typescript
import { testMyJKKNConnection } from '@/lib/myjkkn-api'

const result = await testMyJKKNConnection()
if (result.success) {
  console.log('✅ MyJKKN API connection successful')
} else {
  console.error('❌ Connection failed:', result.message)
}
```

### Validating API Key

```typescript
import { validateAPIKey } from '@/lib/myjkkn-api'

const isValid = validateAPIKey('jk_xxxxx_xxxxx')
```

## Features

### Student Data Display

1. **Scorecard Statistics**
   - Total students count
   - Profile complete count
   - Profile incomplete count
   - Current page count

2. **Search & Filter**
   - Real-time search across:
     - First name
     - Last name
     - Roll number
     - Department
     - Program
     - Institution
   - Case-insensitive search

3. **Sortable Columns**
   - Sort by any column (ascending/descending)
   - Visual indicators for active sort
   - Click column headers to toggle sort

4. **Pagination**
   - Server-side pagination (controlled by MyJKKN API)
   - Shows current page, total pages, and total count
   - Previous/Next navigation

5. **Advanced Filtering**
   - Filter by Institution (dynamic dropdown populated from API data)
   - Filter by Department (dynamic dropdown populated from API data)
   - Filter by Program (dynamic dropdown populated from API data)
   - Filter by Profile Status (Complete/Incomplete/All)
   - Clear All button to reset all filters
   - Filters trigger server-side API calls with query parameters
   - Default value "all" for all filters (shows all results)

6. **Profile Status**
   - Visual badge for profile completion status
   - Green badge for complete profiles
   - Orange badge for incomplete profiles

7. **Student Details View**
   - Click "View" button to see comprehensive student information
   - Organized into color-coded sections:
     - **Basic Information** (Blue): Email, mobile, date of birth, gender, entry type
     - **Academic Information** (Green): Institution, degree, department, program
     - **Family Information** (Purple): Father/mother names and contacts, religion, community
     - **Address & Transport** (Orange): Permanent address, accommodation, bus details
   - Back button to return to student list
   - Breadcrumb navigation showing current location

8. **Error Handling**
   - Clear error messages for connection failures
   - Automatic retry on refresh
   - Detailed error descriptions
   - Nested object handling for institution/department/program data

## UI Components

### Page Layout

Following the JKKN COE standard layout pattern:
- Sidebar navigation
- Header with breadcrumb
- Main content area with cards
- Footer

### Color Scheme

- **Primary:** Blue/Indigo gradient
- **Success:** Green (profile complete)
- **Warning:** Orange (profile incomplete)
- **Error:** Red (connection errors)

### Responsive Design

- Mobile-friendly table layout
- Collapsible search bar
- Stacked cards on small screens
- Touch-friendly pagination controls

## Error Handling

### Client-Side Errors

```typescript
try {
  const response = await fetch('/api/myjkkn/students')
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'API Error')
  }
} catch (error) {
  // Display user-friendly error message
  toast({
    title: "❌ Connection Error",
    description: error.message,
    variant: "destructive"
  })
}
```

### Server-Side Errors

The API route handles different error types:

| HTTP Status | Error Type | User Message |
|------------|------------|--------------|
| 401 | Invalid API key | "Invalid API key. Please check your MyJKKN API credentials." |
| 403 | Access forbidden | "Access forbidden. Please check your API key permissions." |
| 404 | Not found | "API endpoint not found. Please verify the API URL." |
| 500+ | Server error | "MyJKKN API server error. Please try again later." |

## Performance Considerations

1. **Caching Strategy**
   - No caching (`cache: 'no-store'`) for fresh data
   - Consider implementing SWR or React Query for better UX

2. **Pagination**
   - Server-side pagination reduces payload size
   - Default limit of 20 items balances performance and usability
   - Maximum limit of 100 items prevents excessive data transfer

3. **Search Optimization**
   - Client-side search for current page data
   - No additional API calls for search/filter
   - Debouncing not required for small datasets

## Future Enhancements

1. **Data Synchronization**
   - Sync MyJKKN student data to local database
   - Implement differential sync for updates
   - Cache student records for offline access

2. **Advanced Features**
   - Export student list to Excel/CSV
   - Bulk import student data
   - Student profile detail view
   - Filter by department/program/institution

3. **Real-time Updates**
   - WebSocket connection for live updates
   - Automatic refresh on data changes
   - Push notifications for new students

4. **Analytics**
   - Student enrollment trends
   - Department-wise distribution
   - Profile completion rate analytics

## Troubleshooting

### Common Issues

**Problem:** "Invalid API key" error
- **Solution:** Verify API key format matches `jk_[32hex]_[8alphanum]`
- Check `.env.local` has correct `MYJKKN_API_KEY` value
- Restart development server after changing environment variables

**Problem:** "Connection timeout" error
- **Solution:** Check network connectivity to `https://www.jkkn.ai/api`
- Verify MyJKKN API service is operational
- Check firewall/proxy settings

**Problem:** No students displayed
- **Solution:** Verify API returns data using browser/Postman
- Check API key permissions include student data access
- Review browser console for detailed error messages

**Problem:** "Access forbidden" error
- **Solution:** Contact MyJKKN administrator to verify API key permissions
- Ensure API key is not expired or revoked
- Check if IP whitelisting is required

## Testing

### Manual Testing

1. Navigate to `/myjkkn-students` in the application
2. Verify student data loads successfully
3. Test search functionality with various terms
4. Test sorting by clicking column headers
5. Test pagination using Previous/Next buttons

### API Testing

Use the following curl command to test the API directly:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://www.jkkn.ai/api/api-management/students?page=1&limit=20"
```

### Unit Testing

```typescript
// Test API key validation
import { validateAPIKey } from '@/lib/myjkkn-api'

describe('MyJKKN API Key Validation', () => {
  it('should validate correct API key format', () => {
    const validKey = 'jk_2f13e1385d431c1368c69ef68780b11e_mh4h4ml7'
    expect(validateAPIKey(validKey)).toBe(true)
  })

  it('should reject invalid API key format', () => {
    expect(validateAPIKey('invalid-key')).toBe(false)
    expect(validateAPIKey('jk_short_key')).toBe(false)
  })
})
```

## Support

For issues or questions regarding MyJKKN API integration:
- **Technical Issues:** Contact JKKN AI Engineering team
- **API Access:** Contact MyJKKN administrator
- **Bug Reports:** Create issue in project repository

## References

- [MyJKKN Platform](https://jkkn.ai)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

**Last Updated:** 2025-10-24
**Version:** 1.0.0
**Maintainer:** JKKN COE Development Team
