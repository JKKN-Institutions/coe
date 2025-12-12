/**
 * ExcelJS Compatibility Layer
 *
 * Provides xlsx-like API using ExcelJS under the hood.
 * This allows easy migration from xlsx package to ExcelJS.
 */

import ExcelJS from 'exceljs'

export interface SheetData {
  [key: string]: any
}

export interface ColumnWidth {
  wch: number
}

export interface WorksheetCompat {
  '!cols'?: ColumnWidth[]
  '!ref'?: string
  [key: string]: any
}

export interface WorkbookCompat {
  SheetNames: string[]
  Sheets: { [name: string]: WorksheetCompat }
  _workbook: ExcelJS.Workbook
}

/**
 * Converts JSON data to worksheet format
 */
export function json_to_sheet(data: Record<string, any>[]): WorksheetCompat {
  if (data.length === 0) {
    return { '!ref': 'A1', '!cols': [] }
  }

  const headers = Object.keys(data[0])
  const ws: WorksheetCompat = {
    '!ref': `A1:${String.fromCharCode(64 + headers.length)}${data.length + 1}`
  }

  // Add header cells
  headers.forEach((header, colIndex) => {
    const cellRef = `${String.fromCharCode(65 + colIndex)}1`
    ws[cellRef] = { v: header, t: 's' }
  })

  // Add data cells
  data.forEach((row, rowIndex) => {
    headers.forEach((header, colIndex) => {
      const cellRef = `${String.fromCharCode(65 + colIndex)}${rowIndex + 2}`
      const value = row[header]
      ws[cellRef] = {
        v: value,
        t: typeof value === 'number' ? 'n' : 's'
      }
    })
  })

  return ws
}

/**
 * Converts array of arrays to worksheet format
 */
export function aoa_to_sheet(data: any[][]): WorksheetCompat {
  if (data.length === 0) {
    return { '!ref': 'A1', '!cols': [] }
  }

  const maxCols = Math.max(...data.map(row => row.length))
  const ws: WorksheetCompat = {
    '!ref': `A1:${String.fromCharCode(64 + maxCols)}${data.length}`
  }

  data.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const cellRef = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`
      ws[cellRef] = {
        v: value,
        t: typeof value === 'number' ? 'n' : 's'
      }
    })
  })

  return ws
}

/**
 * Creates a new workbook
 */
export function book_new(): WorkbookCompat {
  return {
    SheetNames: [],
    Sheets: {},
    _workbook: new ExcelJS.Workbook()
  }
}

/**
 * Appends a sheet to the workbook
 */
export function book_append_sheet(wb: WorkbookCompat, ws: WorksheetCompat, name: string): void {
  wb.SheetNames.push(name)
  wb.Sheets[name] = ws
}

/**
 * Converts worksheet to JSON
 */
export function sheet_to_json<T = Record<string, any>>(ws: WorksheetCompat): T[] {
  const result: T[] = []
  const ref = ws['!ref']
  if (!ref) return result

  // Parse ref to get range
  const match = ref.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/)
  if (!match) return result

  const startCol = match[1].charCodeAt(0) - 65
  const startRow = parseInt(match[2])
  const endCol = match[3].charCodeAt(0) - 65
  const endRow = parseInt(match[4])

  // Get headers from first row
  const headers: string[] = []
  for (let col = startCol; col <= endCol; col++) {
    const cellRef = `${String.fromCharCode(65 + col)}${startRow}`
    const cell = ws[cellRef]
    headers.push(cell?.v?.toString() || '')
  }

  // Get data rows
  for (let row = startRow + 1; row <= endRow; row++) {
    const rowData: Record<string, any> = {}
    for (let col = startCol; col <= endCol; col++) {
      const cellRef = `${String.fromCharCode(65 + col)}${row}`
      const cell = ws[cellRef]
      const header = headers[col - startCol]
      if (header) {
        rowData[header] = cell?.v
      }
    }
    result.push(rowData as T)
  }

  return result
}

/**
 * Decodes range string to object
 */
export function decode_range(ref: string): { s: { r: number; c: number }; e: { r: number; c: number } } {
  const match = ref.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/)
  if (!match) {
    return { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }
  }

  return {
    s: {
      r: parseInt(match[2]) - 1,
      c: match[1].charCodeAt(0) - 65
    },
    e: {
      r: parseInt(match[4]) - 1,
      c: match[3].charCodeAt(0) - 65
    }
  }
}

/**
 * Encodes cell address from row/col
 */
export function encode_cell(cell: { r: number; c: number }): string {
  return `${String.fromCharCode(65 + cell.c)}${cell.r + 1}`
}

/**
 * Writes workbook to file (downloads in browser)
 */
export async function writeFile(wb: WorkbookCompat, filename: string): Promise<void> {
  const workbook = new ExcelJS.Workbook()

  // Convert each sheet
  for (const sheetName of wb.SheetNames) {
    const wsCompat = wb.Sheets[sheetName]
    const worksheet = workbook.addWorksheet(sheetName)

    const ref = wsCompat['!ref']
    if (!ref) continue

    const range = decode_range(ref)

    // Get headers
    const headers: string[] = []
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = encode_cell({ r: 0, c: col })
      const cell = wsCompat[cellRef]
      headers.push(cell?.v?.toString() || '')
    }

    // Add header row
    worksheet.addRow(headers)

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Add data rows
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const rowData: any[] = []
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = encode_cell({ r: row, c: col })
        const cell = wsCompat[cellRef]
        rowData.push(cell?.v)
      }
      worksheet.addRow(rowData)
    }

    // Apply column widths
    if (wsCompat['!cols']) {
      wsCompat['!cols'].forEach((colWidth, index) => {
        if (worksheet.columns[index]) {
          worksheet.columns[index].width = colWidth.wch
        }
      })
    }
  }

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Reads Excel file from ArrayBuffer
 */
export async function read(data: ArrayBuffer): Promise<WorkbookCompat> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(data)

  const wb: WorkbookCompat = {
    SheetNames: [],
    Sheets: {},
    _workbook: workbook
  }

  workbook.worksheets.forEach(worksheet => {
    const sheetName = worksheet.name
    wb.SheetNames.push(sheetName)

    const ws: WorksheetCompat = {}
    const headers: string[] = []
    let maxRow = 0
    let maxCol = 0

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const colIndex = colNumber - 1
        const rowIndex = rowNumber - 1

        if (rowNumber === 1) {
          headers[colIndex] = String(cell.value || '')
        }

        const cellRef = encode_cell({ r: rowIndex, c: colIndex })

        // Handle different cell value types
        let value = cell.value
        if (value && typeof value === 'object') {
          if ('result' in value) {
            value = value.result
          } else if ('text' in value) {
            value = value.text
          } else if ('richText' in value) {
            value = (value as ExcelJS.CellRichTextValue).richText
              .map(rt => rt.text)
              .join('')
          }
        }

        ws[cellRef] = {
          v: value,
          t: typeof value === 'number' ? 'n' : 's'
        }

        maxRow = Math.max(maxRow, rowNumber)
        maxCol = Math.max(maxCol, colNumber)
      })
    })

    ws['!ref'] = `A1:${String.fromCharCode(64 + maxCol)}${maxRow}`
    wb.Sheets[sheetName] = ws
  })

  return wb
}

// Export utils namespace for compatibility
export const utils = {
  json_to_sheet,
  aoa_to_sheet,
  book_new,
  book_append_sheet,
  sheet_to_json,
  decode_range,
  encode_cell
}

// Default export for drop-in replacement
export default {
  utils,
  writeFile,
  read
}
