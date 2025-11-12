import { useCallback } from 'react'
import * as XLSX from 'xlsx'
import { useToast } from '@/hooks/common/use-toast'

interface UseExcelExportOptions<T> {
  filename?: string
  sheetName?: string
  columns?: {
    key: keyof T
    header: string
  }[]
  formatData?: (item: T) => Record<string, any>
}

interface ExcelExportState<T> {
  exportToExcel: (data: T[]) => void
  downloadTemplate: (columns: string[]) => void
}

/**
 * Custom hook for exporting data to Excel files
 *
 * @example
 * const { exportToExcel, downloadTemplate } = useExcelExport<Course>({
 *   filename: 'courses',
 *   sheetName: 'Courses',
 *   columns: [
 *     { key: 'course_code', header: 'Course Code' },
 *     { key: 'course_title', header: 'Course Title' },
 *     { key: 'credits', header: 'Credits' }
 *   ]
 * })
 *
 * // Export data
 * exportToExcel(courses)
 *
 * // Download template
 * downloadTemplate(['Course Code', 'Course Title', 'Credits'])
 */
export function useExcelExport<T>(
  options: UseExcelExportOptions<T> = {}
): ExcelExportState<T> {
  const {
    filename = 'export',
    sheetName = 'Sheet1',
    columns,
    formatData
  } = options

  const { toast } = useToast()

  const exportToExcel = useCallback((data: T[]) => {
    try {
      if (data.length === 0) {
        toast({
          title: '⚠️ No Data',
          description: 'There is no data to export.',
          variant: 'destructive',
          className: 'bg-yellow-50 border-yellow-200 text-yellow-800'
        })
        return
      }

      let exportData: any[] = data

      // Format data if formatter provided
      if (formatData) {
        exportData = data.map(formatData)
      }
      // Filter by columns if specified
      else if (columns && columns.length > 0) {
        exportData = data.map(item => {
          const row: Record<string, any> = {}
          columns.forEach(col => {
            row[col.header] = item[col.key]
          })
          return row
        })
      }

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData)

      // Auto-size columns
      const maxWidth = 50
      const colWidths = Object.keys(exportData[0] || {}).map(key => {
        const headerWidth = key.length
        const maxCellWidth = exportData.reduce((max, row) => {
          const cellValue = String(row[key] || '')
          return Math.max(max, cellValue.length)
        }, headerWidth)
        return { wch: Math.min(maxCellWidth + 2, maxWidth) }
      })
      worksheet['!cols'] = colWidths

      // Create workbook
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const finalFilename = `${filename}_${timestamp}.xlsx`

      // Download file
      XLSX.writeFile(workbook, finalFilename)

      toast({
        title: '✅ Export Successful',
        description: `Exported ${data.length} record${data.length > 1 ? 's' : ''} to ${finalFilename}`,
        className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export file'

      toast({
        title: '❌ Export Failed',
        description: errorMessage,
        variant: 'destructive',
        className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
      })
    }
  }, [filename, sheetName, columns, formatData, toast])

  const downloadTemplate = useCallback((templateColumns: string[]) => {
    try {
      // Create empty worksheet with headers
      const worksheet = XLSX.utils.aoa_to_sheet([templateColumns])

      // Auto-size columns based on header length
      worksheet['!cols'] = templateColumns.map(header => ({
        wch: Math.max(header.length + 2, 15)
      }))

      // Create workbook
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

      // Generate filename
      const finalFilename = `${filename}_template.xlsx`

      // Download file
      XLSX.writeFile(workbook, finalFilename)

      toast({
        title: '✅ Template Downloaded',
        description: `Downloaded template: ${finalFilename}`,
        className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download template'

      toast({
        title: '❌ Download Failed',
        description: errorMessage,
        variant: 'destructive',
        className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
      })
    }
  }, [filename, sheetName, toast])

  return {
    exportToExcel,
    downloadTemplate
  }
}
