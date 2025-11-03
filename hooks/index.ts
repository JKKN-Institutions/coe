/**
 * Custom Hooks Index
 * Export all custom hooks for easy importing
 */

// Data Fetching Hooks
export { useAPI } from './use-api'
export { useCRUD } from './use-crud'
export { useDropdownData, useMultipleDropdowns } from './use-dropdown-data'

// Table Management Hooks
export { useDataTable } from './use-data-table'

// Form & UI Hooks
export { useSheet } from './use-sheet'
export { useConfirmDialog } from './use-confirm-dialog'

// Excel Hooks
export { useExcelImport } from './use-excel-import'
export { useExcelExport } from './use-excel-export'

// Utility Hooks
export { useDebounce } from './use-debounce'

// Existing Hooks
export { useFormValidation } from './use-form-validation'
export { useToast } from './use-toast'
export { useAuthGuard } from './use-auth-guard'
export { useMobile } from './use-mobile'
export { usePermissionSync } from './use-permission-sync'
export { useSessionTimeout } from './use-session-timeout'

// Type exports
export type { ImportError, ImportSummary } from './use-excel-import'
