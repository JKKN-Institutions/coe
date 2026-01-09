---
name: excel-import-export
description: Complete workflow for implementing Excel/JSON import and export functionality in JKKN COE Next.js application. This skill should be used when adding file import, export, or template generation features to entity pages. Automatically triggers when user mentions 'import', 'export', 'upload', 'download', 'template', 'Excel', 'XLSX', 'CSV', or 'JSON file handling'.
---

# Excel Import/Export Skill

This skill provides comprehensive patterns for implementing import/export functionality in the JKKN COE application, following project standards.

## When to Use This Skill

Use this skill when:
- Adding import/export functionality to entity pages
- Creating Excel/CSV/JSON file parsing logic
- Generating downloadable templates with sample data
- Implementing bulk upload with validation
- Creating export functionality for filtered data
- Building upload error tracking and display

## File Locations (Following project-structure)

When implementing import/export, create files in these locations:

```
lib/utils/
├── [entity]-validation.ts      # Validation functions
├── [entity]-export-import.ts   # Export/Import utilities
```

## Core Implementation Patterns

### 1. Export Utility Functions

Create a dedicated utility file for each entity:

**File: `lib/utils/[entity]-export-import.ts`**

```typescript
import XLSX from '@/lib/utils/excel-compat'
import type { Entity } from '@/types/[entity]'

// Export to JSON
export function exportToJSON(items: Entity[]): void {
  const exportData = items.map(item => ({
    [entity]_code: item.[entity]_code,
    [entity]_name: item.[entity]_name,
    // Map all fields
    is_active: item.is_active,
    created_at: item.created_at
  }))

  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `[entity]s_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Export to Excel
export async function exportToExcel(items: Entity[]): Promise<void> {
  const excelData = items.map((r) => ({
    'Entity Code': r.[entity]_code,
    'Entity Name': r.[entity]_name,
    // Map fields to human-readable column names
    'Status': r.is_active ? 'Active' : 'Inactive',
    'Created': new Date(r.created_at).toISOString().split('T')[0],
  }))

  const ws = XLSX.utils.json_to_sheet(excelData)

  // Set column widths
  const colWidths = [
    { wch: 20 }, // Entity Code
    { wch: 30 }, // Entity Name
    { wch: 10 }, // Status
    { wch: 12 }, // Created
  ]
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  await XLSX.writeFile(wb, `[entity]s_export_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// Export Template with Reference Sheet
export async function exportTemplate(referenceData?: { institutions?: any[] }): Promise<void> {
  const wb = XLSX.utils.book_new()

  // Sample data sheet
  const sample = [{
    'Institution Code *': 'JKKN',
    'Entity Code *': 'CODE001',
    'Entity Name *': 'Sample Name',
    'Description': 'Optional description',
    'Status': 'Active'
  }]

  const ws = XLSX.utils.json_to_sheet(sample)

  // Set column widths
  const colWidths = [
    { wch: 20 },
    { wch: 20 },
    { wch: 30 },
    { wch: 40 },
    { wch: 10 }
  ]
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, 'Template')

  // Add reference sheet for foreign keys (if applicable)
  if (referenceData?.institutions && referenceData.institutions.length > 0) {
    const refData = referenceData.institutions.map(inst => ({
      'Institution Code': inst.institution_code,
      'Institution Name': inst.name
    }))
    const refWs = XLSX.utils.json_to_sheet(refData)
    refWs['!cols'] = [{ wch: 20 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, refWs, 'Institution Codes')
  }

  await XLSX.writeFile(wb, `[entity]s_template_${new Date().toISOString().split('T')[0]}.xlsx`)
}
```

### 2. Import Handler Pattern

Implement the import handler in your page component:

```typescript
const handleImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,.csv,.xlsx,.xls'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
      let rows: Partial<Entity>[] = []

      // Parse based on file type
      if (file.name.endsWith('.json')) {
        const text = await file.text()
        rows = JSON.parse(text)
      } else if (file.name.endsWith('.csv')) {
        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          toast({
            title: "Invalid CSV File",
            description: "CSV must have header row and at least one data row",
            variant: "destructive"
          })
          return
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const row: Record<string, string> = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })
          return mapRowToEntity(row)
        })
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = new Uint8Array(await file.arrayBuffer())
        const wb = await XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
        rows = json.map(mapRowToEntity)
      }

      await processImportedRows(rows)
    } catch (err) {
      console.error('Import error:', err)
      setLoading(false)
      toast({
        title: "Import Error",
        description: "Import failed. Please check your file format.",
        variant: "destructive"
      })
    }
  }
  input.click()
}

// Map Excel columns to entity fields
function mapRowToEntity(row: Record<string, unknown>): Partial<Entity> {
  return {
    institution_code: String(row['Institution Code *'] || row['Institution Code'] || ''),
    [entity]_code: String(row['Entity Code *'] || row['Entity Code'] || ''),
    [entity]_name: String(row['Entity Name *'] || row['Entity Name'] || ''),
    description: String(row['Description'] || ''),
    is_active: String(row['Status'] || '').toLowerCase() === 'active'
  }
}
```

### 3. Row Processing with Error Tracking

```typescript
async function processImportedRows(rows: Partial<Entity>[]) {
  setLoading(true)
  let successCount = 0
  let errorCount = 0
  const uploadErrors: ImportError[] = []

  for (let i = 0; i < rows.length; i++) {
    const entity = rows[i]
    const rowNumber = i + 2 // +2 for header row in Excel

    // Client-side validation
    const validationErrors = validateEntityData(entity, rowNumber)
    if (validationErrors.length > 0) {
      errorCount++
      uploadErrors.push({
        row: rowNumber,
        [entity]_code: entity.[entity]_code || 'N/A',
        [entity]_name: entity.[entity]_name || 'N/A',
        errors: validationErrors
      })
      continue
    }

    try {
      const response = await fetch('/api/[entity]', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity)
      })

      if (response.ok) {
        const saved = await response.json()
        setItems(prev => [saved, ...prev])
        successCount++
      } else {
        const errorData = await response.json()
        errorCount++
        uploadErrors.push({
          row: rowNumber,
          [entity]_code: entity.[entity]_code || 'N/A',
          [entity]_name: entity.[entity]_name || 'N/A',
          errors: [errorData.error || 'Failed to save']
        })
      }
    } catch (error) {
      errorCount++
      uploadErrors.push({
        row: rowNumber,
        [entity]_code: entity.[entity]_code || 'N/A',
        [entity]_name: entity.[entity]_name || 'N/A',
        errors: [error instanceof Error ? error.message : 'Network error']
      })
    }
  }

  setLoading(false)

  // Update summary
  setUploadSummary({
    total: rows.length,
    success: successCount,
    failed: errorCount
  })

  // Show error dialog if needed
  if (uploadErrors.length > 0) {
    setImportErrors(uploadErrors)
    setErrorPopupOpen(true)
  }

  // Show toast
  showUploadToast(rows.length, successCount, errorCount)
}
```

### 4. Toast Notification Pattern

```typescript
function showUploadToast(total: number, success: number, failed: number) {
  if (success > 0 && failed === 0) {
    toast({
      title: "Upload Complete",
      description: `Successfully uploaded all ${success} row${success > 1 ? 's' : ''}.`,
      className: "bg-green-50 border-green-200 text-green-800"
    })
  } else if (success > 0 && failed > 0) {
    toast({
      title: "Partial Upload Success",
      description: `${success} successful, ${failed} failed. View error details.`,
      className: "bg-yellow-50 border-yellow-200 text-yellow-800"
    })
  } else if (failed > 0) {
    toast({
      title: "Upload Failed",
      description: `${failed} row${failed > 1 ? 's' : ''} failed. View error details.`,
      variant: "destructive"
    })
  }
}
```

### 5. Error Dialog Component

See `references/error-dialog-pattern.md` for the complete error dialog implementation with:
- Upload summary cards (Total/Success/Failed)
- Row-by-row error details
- Common fixes section
- Close and Try Again buttons

## Action Buttons UI Pattern

```tsx
{/* Icon-only action buttons */}
<Button variant="outline" size="sm" onClick={handleRefresh}
  className="h-9 w-9 rounded-lg p-0" title="Refresh">
  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
</Button>
<Button variant="outline" size="sm" onClick={handleTemplateExport}
  className="h-9 w-9 rounded-lg p-0" title="Download Template">
  <FileSpreadsheet className="h-4 w-4" />
</Button>
<Button variant="outline" size="sm" onClick={handleDownload}
  className="h-9 w-9 rounded-lg p-0" title="Export JSON">
  <FileJson className="h-4 w-4" />
</Button>
<Button variant="outline" size="sm" onClick={handleExport}
  className="h-9 w-9 rounded-lg p-0" title="Export Excel">
  <Download className="h-4 w-4" />
</Button>
<Button variant="outline" size="sm" onClick={handleImport}
  className="h-9 w-9 rounded-lg p-0" title="Import File">
  <Upload className="h-4 w-4" />
</Button>
```

## Required Imports

```typescript
import XLSX from '@/lib/utils/excel-compat'
import { Download, Upload, FileSpreadsheet, FileJson, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/common/use-toast'
```

## State Types

```typescript
interface ImportError {
  row: number
  [entity]_code: string
  [entity]_name: string
  errors: string[]
}

interface UploadSummary {
  total: number
  success: number
  failed: number
}
```

## Dependencies

The project uses `@/lib/utils/excel-compat` which wraps ExcelJS for Excel file operations.

## Excel Conditional Formatting for Invalid Value Highlighting

**The excel-compat layer supports conditional formatting** to highlight invalid entries with color coding. When users enter wrong codes in the template, the cells turn red to indicate errors.

> **Important:** This approach is preferred over dropdown validation because:
> - Dropdown validation has XML compatibility issues with some Excel versions
> - Conditional formatting is more reliable across Excel/LibreOffice/Google Sheets
> - Users can still type any value (not restricted)
> - Invalid values are visually highlighted for easy identification

### How Conditional Formatting Works

The excel-compat layer uses the `!dataValidation` property to:
1. Create a hidden sheet `_ValidCodes` with all valid values
2. Apply conditional formatting using `COUNTIF` formula
3. Cells with invalid values get **light red background + dark red text**
4. Empty cells and valid values show normal formatting

### Implementation Pattern

```typescript
import XLSX from '@/lib/utils/excel-compat'

export async function exportTemplateWithValidation(
  institutions: Institution[],
  boardTypes: string[],
): Promise<void> {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Template with headers
  const templateData = [{
    'Institution Code *': '',
    'Board Code *': '',
    'Board Name *': '',
    'Board Type': '',
    'Status': 'Active',
  }]

  const ws = XLSX.utils.json_to_sheet(templateData)

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, { wch: 20 }, { wch: 40 },
    { wch: 20 }, { wch: 12 },
  ]

  // Prepare validation lists
  const institutionCodes = institutions.map(i => i.institution_code)
  const statusValues = ['Active', 'Inactive']

  // Create data validations array for conditional formatting
  const dataValidations: any[] = []

  // Column A (Institution Code) - highlight invalid in red
  if (institutionCodes.length > 0) {
    dataValidations.push({
      type: 'list',
      sqref: 'A2:A1000',  // Apply to column A, rows 2-1000
      formula1: `"${institutionCodes.join(',')}"`,
      showErrorMessage: true,
      errorTitle: 'Invalid Institution',
      error: 'Please enter a valid institution code',
    })
  }

  // Column D (Board Type)
  dataValidations.push({
    type: 'list',
    sqref: 'D2:D1000',
    formula1: `"${boardTypes.join(',')}"`,
    showErrorMessage: true,
    errorTitle: 'Invalid Board Type',
    error: 'Please enter a valid board type',
  })

  // Column E (Status)
  dataValidations.push({
    type: 'list',
    sqref: 'E2:E1000',
    formula1: `"${statusValues.join(',')}"`,
    showErrorMessage: true,
    errorTitle: 'Invalid Status',
    error: 'Please enter Active or Inactive',
  })

  // Attach validations to worksheet
  ws['!dataValidation'] = dataValidations

  XLSX.utils.book_append_sheet(wb, ws, 'Template')

  // Sheet 2: Reference Codes (for user documentation)
  const referenceData = buildReferenceSheet(institutions, boardTypes)
  const wsRef = XLSX.utils.json_to_sheet(referenceData)
  wsRef['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsRef, 'Reference Codes')

  await XLSX.writeFile(wb, `template_${new Date().toISOString().split('T')[0]}.xlsx`)
}
```

### How It Looks in Excel

When users enter invalid values:

| Institution Code * | Board Code * | Board Name * | Board Type | Status |
|-------------------|--------------|--------------|------------|--------|
| **AHS** (valid - normal) | CBSE | Central Board | National | Active |
| **INVALID** (red background, red text) | STATE | State Board | State | Active |
| **CAS** (valid - normal) | UNIV | University | **WRONG** (red) | Active |

### Data Validation Object Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'list'` | Validation type (list for dropdown-style validation) |
| `sqref` | `string` | Cell range (e.g., `'A2:A1000'`, `'B2:B100'`) |
| `formula1` | `string` | Valid values: `'"Value1,Value2,Value3"'` (with quotes) |
| `showErrorMessage` | `boolean` | Show error for invalid input |
| `errorTitle` | `string` | Error title |
| `error` | `string` | Error message |

### Real-World Example: Boards Page

Reference implementation: `app/(coe)/master/boards/page.tsx`

```typescript
// Template Export with Conditional Formatting for Invalid Values
const handleTemplateExport = async () => {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Template with empty row for user to fill
  const sample = [{
    'Institution Code *': '',
    'Board Code *': '',
    'Board Name *': '',
    'Display Name': '',
    'Board Type': '',
    'Board Order': '',
    'Status': 'Active'
  }]

  const ws = XLSX.utils.json_to_sheet(sample)

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, { wch: 20 }, { wch: 40 },
    { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
  ]

  // ═══════════════════════════════════════════════════════════════
  // ADD DATA VALIDATIONS (Conditional Formatting for Invalid Values)
  // ═══════════════════════════════════════════════════════════════
  const validations: any[] = []

  // Column A: Institution Code - highlight invalid in red
  const instCodes = institutions.map(i => i.institution_code)
  if (instCodes.length > 0) {
    validations.push({
      type: 'list',
      sqref: 'A2:A1000',
      formula1: `"${instCodes.join(',')}"`,
      showErrorMessage: true,
      errorTitle: 'Invalid Institution',
      error: 'Please enter a valid institution code from Reference sheet',
    })
  }

  // Column E: Board Type - highlight invalid in red
  const boardTypes = ['National', 'State', 'International', 'Private', 'University']
  validations.push({
    type: 'list',
    sqref: 'E2:E1000',
    formula1: `"${boardTypes.join(',')}"`,
    showErrorMessage: true,
    errorTitle: 'Invalid Board Type',
    error: 'Valid types: National, State, International, Private, University',
  })

  // Column G: Status - highlight invalid in red
  validations.push({
    type: 'list',
    sqref: 'G2:G1000',
    formula1: '"Active,Inactive"',
    showErrorMessage: true,
    errorTitle: 'Invalid Status',
    error: 'Please enter Active or Inactive',
  })

  // Attach validations to worksheet
  ws['!dataValidation'] = validations

  XLSX.utils.book_append_sheet(wb, ws, 'Template')

  // ═══════════════════════════════════════════════════════════════
  // Sheet 2: Combined Reference Data
  // ═══════════════════════════════════════════════════════════════
  const referenceData: any[] = []

  // Institution codes
  referenceData.push({ 'Type': '═══ INSTITUTION CODES ═══', 'Code': '', 'Name/Description': '' })
  institutions.forEach(inst => {
    referenceData.push({
      'Type': 'Institution',
      'Code': inst.institution_code,
      'Name/Description': inst.institution_name || 'N/A'
    })
  })

  // Board types
  referenceData.push({ 'Type': '═══ BOARD TYPES ═══', 'Code': '', 'Name/Description': '' })
  boardTypes.forEach(type => {
    referenceData.push({ 'Type': 'Board Type', 'Code': type, 'Name/Description': type })
  })

  // Status values
  referenceData.push({ 'Type': '═══ STATUS VALUES ═══', 'Code': '', 'Name/Description': '' })
  ;['Active', 'Inactive'].forEach(status => {
    referenceData.push({
      'Type': 'Status',
      'Code': status,
      'Name/Description': status === 'Active' ? 'Board is active' : 'Board is inactive'
    })
  })

  const wsRef = XLSX.utils.json_to_sheet(referenceData)
  wsRef['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsRef, 'Reference Codes')

  await XLSX.writeFile(wb, `boards_template_${new Date().toISOString().split('T')[0]}.xlsx`)
}
```

### Template Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Sheet 1: Template                                                │
├─────────────────────────────────────────────────────────────────┤
│ Institution Code * │ Board Code * │ Board Name * │ Board Type   │
│ ──────────────────┼──────────────┼──────────────┼──────────────│
│ [user types here] │              │              │              │
│                   │              │              │              │
│ If INVALID → RED  │              │              │ If INVALID → │
│ BACKGROUND + TEXT │              │              │ RED BG + TEXT│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Sheet 2: Reference Codes (for user documentation)                │
├─────────────────────────────────────────────────────────────────┤
│ Type              │ Code         │ Name/Description              │
│ ══════════════════│══════════════│═══════════════════════════════│
│ INSTITUTION CODES │              │                               │
│ Institution       │ AHS          │ JKKN College of Allied Health │
│ Institution       │ CAS          │ JKKN College of Arts & Science│
│ ══════════════════│══════════════│═══════════════════════════════│
│ BOARD TYPES       │              │                               │
│ Board Type        │ National     │ National                      │
│ Board Type        │ State        │ State                         │
│ ══════════════════│══════════════│═══════════════════════════════│
│ STATUS VALUES     │              │                               │
│ Status            │ Active       │ Board is active               │
│ Status            │ Inactive     │ Board is inactive             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Sheet 3: _ValidCodes (HIDDEN - created automatically)            │
├─────────────────────────────────────────────────────────────────┤
│ A         │ B        │ C          │                              │
│ AHS       │ National │ Active     │ (Column per validation)      │
│ CAS       │ State    │ Inactive   │                              │
│ COE       │ Int'l    │            │                              │
│ CET       │ Private  │            │                              │
│ CNR       │ Univ     │            │                              │
│ COP       │          │            │                              │
│ DCH       │          │            │                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Benefits

| Feature | Benefit |
|---------|---------|
| Visual feedback | Invalid values immediately highlighted in red |
| No restrictions | Users can type any value (not limited to dropdown) |
| Cross-platform | Works in Excel, LibreOffice, Google Sheets |
| Reference sheet | Users can see all valid codes in one place |
| Hidden validation | `_ValidCodes` sheet is hidden from users |

## Key Implementation Details

| Feature | Implementation |
|---------|----------------|
| Parallel fetching | `Promise.all()` for programs & semesters |
| Two-stage import | Preview -> Confirm (prevents bad data) |
| Flexible parsing | Handles JSON, CSV, and Excel formats |
| Header mapping | Supports both `Institution Code *` and `institution_code` |
| Institution context | Template respects current institution filter |
| Error aggregation | Collects all errors per row for display |
| Loading states | Shows spinner during template generation and import |
| **Conditional formatting** | Invalid values highlighted in red |
| **Hidden validation sheet** | `_ValidCodes` sheet stores valid values |

## File Organization

Create a utility file for the entity:

```
lib/utils/[entity-name]/
├── export-import.ts    # Export functions: exportToJSON, exportToExcel, exportTemplate
└── validation.ts       # Import validation functions
```

## Checklist for New Entity

1. Create utility file `lib/utils/[entity-name]/export-import.ts`
2. Add export functions: `exportToJSON`, `exportToExcel`, `exportTemplate`
3. **Identify ALL reference data sources:**
   - Entity lookups (institutions, courses, sessions, etc.)
   - MyJKKN data (programs, semesters, batches, regulations)
   - Dropdown/enum values (exam_type, status, grade_type, etc.)
   - Boolean fields (is_active, is_mandatory → Yes/No)
4. Add import preview state to page component
5. Add button group with tooltips in page header
6. Implement `handleImport` with file parsing
7. **Add data validations for conditional formatting** (invalid values → red)
8. Implement `handleConfirmImport` with API calls
9. Add Import Preview Dialog
10. Add Import Errors Dialog
11. Test with JSON, CSV, and Excel files
12. **Verify template reference sheet includes all valid codes**
13. **Use `async/await` with XLSX.writeFile()** (excel-compat uses ExcelJS which is async)

## Testing Checklist

- [ ] JSON export works for filtered data
- [ ] Excel export includes all visible columns
- [ ] Template has sample data and reference sheets
- [ ] **Invalid values are highlighted in red**
- [ ] **Hidden _ValidCodes sheet is created**
- [ ] JSON import parses correctly
- [ ] CSV import handles quoted values
- [ ] Excel import reads first sheet
- [ ] Validation errors show row numbers
- [ ] API errors are captured and displayed
- [ ] Upload summary shows correct counts
- [ ] Toast notifications appear for all cases
- [ ] Error dialog is scrollable for many errors
