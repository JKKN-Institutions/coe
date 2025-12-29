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
import * as XLSX from 'xlsx'
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
export function exportToExcel(items: Entity[]): void {
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
  XLSX.writeFile(wb, `[entity]s_export_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// Export Template with Reference Sheet
export function exportTemplate(referenceData?: { institutions?: any[] }): void {
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

  // Style mandatory field headers (red)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  const mandatoryFields = ['Institution Code *', 'Entity Code *', 'Entity Name *']

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!ws[cellAddress]) continue

    const cell = ws[cellAddress]
    const isMandatory = mandatoryFields.includes(cell.v as string)

    if (isMandatory) {
      cell.s = {
        font: { color: { rgb: 'FF0000' }, bold: true },
        fill: { fgColor: { rgb: 'FFE6E6' } }
      }
    } else {
      cell.s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'F0F0F0' } }
      }
    }
  }

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

  XLSX.writeFile(wb, `[entity]s_template_${new Date().toISOString().split('T')[0]}.xlsx`)
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
        const wb = XLSX.read(data, { type: 'array' })
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
import * as XLSX from 'xlsx'
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

Add to package.json if not present:
```json
{
  "dependencies": {
    "xlsx": "^0.18.5"
  }
}
```

## Resources

- `references/error-dialog-pattern.md` - Complete error dialog implementation
- `references/template-formatting.md` - Excel template styling patterns

## Testing Checklist

- [ ] JSON export works for filtered data
- [ ] Excel export includes all visible columns
- [ ] Template has sample data and reference sheets
- [ ] JSON import parses correctly
- [ ] CSV import handles quoted values
- [ ] Excel import reads first sheet
- [ ] Validation errors show row numbers
- [ ] API errors are captured and displayed
- [ ] Upload summary shows correct counts
- [ ] Toast notifications appear for all cases
- [ ] Error dialog is scrollable for many errors
