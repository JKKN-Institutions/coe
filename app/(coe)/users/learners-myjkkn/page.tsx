'use client'

/**
 * Learners Page - MyJKKN Data Source
 *
 * This page displays learner profiles sourced from MyJKKN API.
 * This is a READ-ONLY view - all CRUD operations are managed in MyJKKN.
 *
 * Migration Note: This page replaces the old /users/learners-list page
 * that used local COE database tables.
 *
 * Performance: Uses server-side pagination to avoid fetching all records at once.
 * - Debounced search (300ms) to reduce API calls
 * - Cached lookup data on API side (5 min TTL)
 * - Server-side pagination with configurable page size
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import XLSX from '@/lib/utils/excel-compat'
import { AppFooter } from '@/components/layout/app-footer'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/common/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	Download,
	Search,
	ChevronLeft,
	ChevronRight,
	GraduationCap,
	TrendingUp,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	RefreshCw,
	ExternalLink,
	AlertCircle,
	Info,
	Clock,
	Users,
	User,
} from 'lucide-react'
import { useInstitutionFilter } from '@/hooks/use-institution-filter'
import type { COELearner } from '@/services/myjkkn/myjkkn-adapter-service'

// Items per page options
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100, 500]

export default function LearnersMyJKKNPage() {
	const { toast } = useToast()

	// Institution filter (skill-based hook)
	const {
		filter,
		shouldFilter,
		isReady,
		isLoading: institutionFilterLoading,
		appendToUrl,
	} = useInstitutionFilter()

	const institutionLoading = !isReady || institutionFilterLoading

	// Learners data from MyJKKN (fetched with institution filter)
	const [learners, setLearners] = useState<COELearner[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [totalCount, setTotalCount] = useState(0)
	const [totalPages, setTotalPages] = useState(1)

	// Local state for filtering and pagination
	const [searchTerm, setSearchTerm] = useState("")
	const [debouncedSearch, setDebouncedSearch] = useState("")
	const [statusFilter, setStatusFilter] = useState("all")
	const [programFilter, setProgramFilter] = useState("all")
	const [semesterFilter, setSemesterFilter] = useState("all")
	const [sortColumn, setSortColumn] = useState<string | null>(null)
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState(50)

	// Debounce search input (300ms delay)
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	useEffect(() => {
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current)
		}
		searchTimeoutRef.current = setTimeout(() => {
			setDebouncedSearch(searchTerm)
			setCurrentPage(1) // Reset to page 1 on search
		}, 300)
		return () => {
			if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
		}
	}, [searchTerm])

	// Fetch with server-side pagination
	const refetch = useCallback(async () => {
		if (!isReady) return

		try {
			setLoading(true)
			setError(null)

			// Build URL with server-side pagination params
			const params = new URLSearchParams()
			params.set('page', String(currentPage))
			params.set('limit', String(itemsPerPage))

			// Add search if present
			if (debouncedSearch.trim()) {
				params.set('search', debouncedSearch.trim())
			}

			const baseUrl = `/api/myjkkn/learner-profiles?${params.toString()}`
			const url = appendToUrl(baseUrl)

			const response = await fetch(url)
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.error || 'Failed to load learners from MyJKKN')
			}

			const result = await response.json()
			const rawData = Array.isArray(result) ? result : (result.data || [])
			const metadata = result.metadata || {}

			// Extra safety: client-side filter by institution_code when active
			const filteredData: COELearner[] =
				shouldFilter && filter.institution_code
					? (rawData as COELearner[]).filter(
						learner => learner.institution_code === filter.institution_code
					)
					: (rawData as COELearner[])

			setLearners(filteredData)
			setTotalCount(metadata.total || filteredData.length)
			setTotalPages(metadata.totalPages || Math.ceil((metadata.total || filteredData.length) / itemsPerPage))
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load learners from MyJKKN'
			setError(message)
			setLearners([])
			setTotalCount(0)
			setTotalPages(1)
		} finally {
			setLoading(false)
		}
	}, [appendToUrl, currentPage, debouncedSearch, filter.institution_code, isReady, itemsPerPage, shouldFilter])

	// Refetch when pagination, search, or institution changes
	useEffect(() => {
		if (!isReady) return
		refetch()
	}, [isReady, filter, currentPage, itemsPerPage, debouncedSearch, refetch])

	// Handle sorting
	const handleSort = (column: string) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortColumn(column)
			setSortDirection('asc')
		}
	}

	// Filter and sort learners (client-side for dropdown filters only)
	// Search is handled server-side for performance
	const filteredLearners = useMemo(() => {
		return learners
			.filter((learner) => {
				// Status, program, semester filters applied client-side on current page
				const matchesStatus = statusFilter === "all" ||
					(statusFilter === "active" && learner.is_active) ||
					(statusFilter === "inactive" && !learner.is_active)
				const matchesProgram = programFilter === "all" || learner.program_code === programFilter
				const matchesSemester = semesterFilter === "all" || String(learner.current_semester) === semesterFilter
				return matchesStatus && matchesProgram && matchesSemester
			})
			.sort((a, b) => {
				if (!sortColumn) return 0

				let aValue: string | number
				let bValue: string | number

				switch (sortColumn) {
					case 'register_number':
						aValue = a.register_number?.toLowerCase() || ''
						bValue = b.register_number?.toLowerCase() || ''
						break
					case 'learner_name':
						aValue = a.learner_name?.toLowerCase() || ''
						bValue = b.learner_name?.toLowerCase() || ''
						break
					case 'program_code':
						aValue = a.program_code?.toLowerCase() || ''
						bValue = b.program_code?.toLowerCase() || ''
						break
					case 'current_semester':
						aValue = a.current_semester || 0
						bValue = b.current_semester || 0
						break
					case 'admission_year':
						aValue = a.admission_year || 0
						bValue = b.admission_year || 0
						break
					case 'status':
						aValue = a.is_active ? 1 : 0
						bValue = b.is_active ? 1 : 0
						break
					default:
						return 0
				}

				if (sortDirection === 'asc') {
					return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
				} else {
					return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
				}
			})
	}, [learners, statusFilter, programFilter, semesterFilter, sortColumn, sortDirection])

	// Get unique values for filters from current page data
	const uniquePrograms = useMemo(() => {
		return [...new Set(learners.map(l => l.program_code).filter(Boolean))].sort()
	}, [learners])

	const uniqueSemesters = useMemo(() => {
		return [...new Set(learners.map(l => l.current_semester).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0))
	}, [learners])

	// Server-side pagination - use totalPages from API response
	const startIndex = (currentPage - 1) * itemsPerPage + 1
	const endIndex = Math.min(currentPage * itemsPerPage, totalCount)
	// For display, use the client-filtered data (filters applied to current page)
	const paginatedLearners = filteredLearners

	// Helper functions
	const getSortIcon = (column: string) => {
		if (sortColumn !== column) {
			return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
		}
		return sortDirection === 'asc'
			? <ArrowUp className="h-3 w-3" />
			: <ArrowDown className="h-3 w-3" />
	}

	// Helper function to format date
	const formatDate = (dateStr?: string) => {
		if (!dateStr) return ''
		try {
			const date = new Date(dateStr)
			return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
		} catch {
			return dateStr
		}
	}

	// Helper function to get initials for avatar
	const getInitials = (name: string) => {
		const parts = name.split(' ')
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
		}
		return name.substring(0, 2).toUpperCase()
	}

	// Handle items per page change
	const handleItemsPerPageChange = (value: string) => {
		setItemsPerPage(Number(value))
		setCurrentPage(1) // Reset to first page when changing items per page
	}

	// Export current page data
	const handleExport = () => {
		const excelData = paginatedLearners.map((learner, index) => ({
			'S.No': startIndex + index,
			'Register Number': learner.register_number || '',
			'Roll Number': learner.roll_number || '',
			'Learner Name': learner.learner_name || '',
			'First Name': learner.first_name || '',
			'Middle Name': learner.middle_name || '',
			'Last Name': learner.last_name || '',
			'Email': learner.email || '',
			'Phone': learner.phone || '',
			'Date of Birth': formatDate(learner.date_of_birth),
			'Gender': learner.gender || '',
			'Institution Code': learner.institution_code || '',
			'Program Code': learner.program_code || '',
			'Department Code': learner.department_code || '',
			'Current Semester': learner.current_semester || '',
			'Admission Year': learner.admission_year || '',
			'Batch': learner.batch_name || '',
			'Father Name': learner.father_name || '',
			'Mother Name': learner.mother_name || '',
			'Guardian Name': learner.guardian_name || '',
			'Address': learner.address || '',
			'City': learner.city || '',
			'State': learner.state || '',
			'Country': learner.country || '',
			'Pincode': learner.pincode || '',
			'Aadhar Number': learner.aadhar_number || '',
			'ABC ID': learner.abc_id || '',
			'Status': learner.is_active ? 'Active' : 'Inactive',
		}))

		const ws = XLSX.utils.json_to_sheet(excelData)

		// Auto-adjust column widths
		const colWidths = Object.keys(excelData[0] || {}).map(key => ({
			wch: Math.max(key.length, 15)
		}))
		ws['!cols'] = colWidths

		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Learners')
		XLSX.writeFile(wb, `learners_myjkkn_page${currentPage}_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: "Export Successful",
			description: `Exported ${excelData.length} learners (Page ${currentPage}).`,
			className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
		})
	}

	// Loading state
	const isLoading = loading || institutionLoading

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex flex-col min-h-screen">
				<AppHeader />

				<div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
					{/* Breadcrumb Navigation */}
					<div className="flex items-center gap-2 flex-shrink-0 px-0 py-0">
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbLink asChild>
										<Link href="/" className="hover:text-primary">Dashboard</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage>Learners (MyJKKN)</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					{/* Header Section */}
					<div className="flex items-center justify-between flex-shrink-0">
						<div>
							<h1 className="text-xl font-bold tracking-tight">Learner Directory</h1>
							<p className="text-xs text-muted-foreground">
								View learner profiles from MyJKKN master data
							</p>
						</div>
					</div>

					{/* MyJKKN Data Source Notice */}
					<Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
						<Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
						<AlertTitle className="text-blue-800 dark:text-blue-200">Data Source: MyJKKN</AlertTitle>
						<AlertDescription className="text-blue-700 dark:text-blue-300">
							This data is sourced from the MyJKKN platform. To manage learner profiles,
							please use the MyJKKN administration portal.
							<Button variant="link" className="h-auto p-0 ml-2 text-blue-600 dark:text-blue-400" asChild>
								<a href="https://jkkn.ai" target="_blank" rel="noopener noreferrer">
									Open MyJKKN <ExternalLink className="h-3 w-3 ml-1" />
								</a>
							</Button>
						</AlertDescription>
					</Alert>

					{/* Error Alert */}
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Error Loading Data</AlertTitle>
							<AlertDescription>
								{error}
								<Button variant="link" className="h-auto p-0 ml-2" onClick={refetch}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					)}

					{/* Scorecard Section */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Total Learners</p>
										<p className="text-xl font-bold">{totalCount.toLocaleString()}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
										<Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Active (This Page)</p>
										<p className="text-xl font-bold text-green-600">
											{paginatedLearners.filter(l => l.is_active).length}
										</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
										<GraduationCap className="h-3 w-3 text-green-600 dark:text-green-400" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Inactive (This Page)</p>
										<p className="text-xl font-bold text-red-600">
											{paginatedLearners.filter(l => !l.is_active).length}
										</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
										<Clock className="h-3 w-3 text-red-600 dark:text-red-400" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Page {currentPage} of {totalPages}</p>
										<p className="text-xl font-bold text-purple-600">
											{paginatedLearners.length} shown
										</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
										<TrendingUp className="h-3 w-3 text-purple-600 dark:text-purple-400" />
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Data Table Card */}
					<Card className="flex-1 flex flex-col min-h-0">
						<CardHeader className="flex-shrink-0 p-3">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
										<GraduationCap className="h-3 w-3 text-primary" />
									</div>
									<div>
										<h2 className="text-sm font-semibold">Learners</h2>
										<p className="text-[11px] text-muted-foreground">Browse and filter learner records from MyJKKN</p>
									</div>
								</div>
							</div>
							<div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
								<div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto flex-wrap">
									<Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
										<SelectTrigger className="w-[120px] h-8">
											<SelectValue placeholder="Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Status</SelectItem>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="inactive">Inactive</SelectItem>
										</SelectContent>
									</Select>

									<Select value={programFilter} onValueChange={(v) => { setProgramFilter(v); setCurrentPage(1); }}>
										<SelectTrigger className="w-[150px] h-8">
											<SelectValue placeholder="Program" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Programs</SelectItem>
											{uniquePrograms.map(program => (
												<SelectItem key={program} value={program!}>{program}</SelectItem>
											))}
										</SelectContent>
									</Select>

									<Select value={semesterFilter} onValueChange={(v) => { setSemesterFilter(v); setCurrentPage(1); }}>
										<SelectTrigger className="w-[130px] h-8">
											<SelectValue placeholder="Semester" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Semesters</SelectItem>
											{uniqueSemesters.map(sem => (
												<SelectItem key={sem} value={String(sem)}>Semester {sem}</SelectItem>
											))}
										</SelectContent>
									</Select>

									<div className="relative w-full sm:w-[220px]">
										<Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
										<Input
											placeholder="Search by name, reg no, email..."
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className="pl-8 h-8 text-xs"
										/>
										{searchTerm && searchTerm !== debouncedSearch && (
											<span className="absolute right-2 top-1/2 -translate-y-1/2">
												<RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
											</span>
										)}
									</div>
								</div>

								<div className="flex gap-1 flex-wrap items-center">
									<Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
										<SelectTrigger className="w-[90px] h-8">
											<SelectValue placeholder="Per page" />
										</SelectTrigger>
										<SelectContent>
											{ITEMS_PER_PAGE_OPTIONS.map(option => (
												<SelectItem key={option} value={String(option)}>{option} rows</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button
										variant="outline"
										size="sm"
										className="text-xs px-2 h-8"
										onClick={refetch}
										disabled={isLoading}
									>
										<RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="text-xs px-2 h-8"
										onClick={handleExport}
										disabled={paginatedLearners.length === 0}
									>
										<Download className="h-3 w-3 mr-1" />
										Export Page
									</Button>
								</div>
							</div>
						</CardHeader>

						<CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">
							<div className="rounded-md border overflow-hidden flex-1">
								<div className="h-full overflow-auto">
									<Table>
										<TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
											<TableRow>
												<TableHead className="w-[50px] text-[11px]">Photo</TableHead>
												<TableHead className="w-[120px] text-[11px]">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSort('register_number')}
														className="h-auto p-0 font-medium hover:bg-transparent"
													>
														Reg. No.
														<span className="ml-1">
															{getSortIcon('register_number')}
														</span>
													</Button>
												</TableHead>
												<TableHead className="min-w-[150px] text-[11px]">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSort('learner_name')}
														className="h-auto p-0 font-medium hover:bg-transparent"
													>
														Learner Name
														<span className="ml-1">
															{getSortIcon('learner_name')}
														</span>
													</Button>
												</TableHead>
												<TableHead className="w-[180px] text-[11px]">Email</TableHead>
												<TableHead className="w-[100px] text-[11px]">DOB</TableHead>
												<TableHead className="w-[80px] text-[11px]">Institution</TableHead>
												<TableHead className="w-[100px] text-[11px]">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSort('program_code')}
														className="h-auto p-0 font-medium hover:bg-transparent"
													>
														Program
														<span className="ml-1">
															{getSortIcon('program_code')}
														</span>
													</Button>
												</TableHead>
												<TableHead className="w-[60px] text-[11px]">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSort('current_semester')}
														className="h-auto p-0 font-medium hover:bg-transparent"
													>
														Sem
														<span className="ml-1">
															{getSortIcon('current_semester')}
														</span>
													</Button>
												</TableHead>
												<TableHead className="w-[70px] text-[11px]">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSort('admission_year')}
														className="h-auto p-0 font-medium hover:bg-transparent"
													>
														Year
														<span className="ml-1">
															{getSortIcon('admission_year')}
														</span>
													</Button>
												</TableHead>
												<TableHead className="w-[80px] text-[11px]">Batch</TableHead>
												<TableHead className="w-[70px] text-[11px]">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSort('status')}
														className="h-auto p-0 font-medium hover:bg-transparent"
													>
														Status
														<span className="ml-1">
															{getSortIcon('status')}
														</span>
													</Button>
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{isLoading ? (
												<TableRow>
													<TableCell colSpan={11} className="h-24 text-center text-[11px]">
														<RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
														Loading learners from MyJKKN...
													</TableCell>
												</TableRow>
											) : paginatedLearners.length > 0 ? (
												<>
													{paginatedLearners.map((learner) => (
														<TableRow key={learner.id}>
															<TableCell className="p-2">
																<Avatar className="h-8 w-8">
																	<AvatarFallback className="bg-primary/10 text-primary text-[10px]">
																		{getInitials(learner.learner_name || 'NA')}
																	</AvatarFallback>
																</Avatar>
															</TableCell>
															<TableCell className="font-medium text-[11px]">
																{learner.register_number || '-'}
															</TableCell>
															<TableCell className="text-[11px]">
																<div>
																	<div className="font-medium">{learner.learner_name || '-'}</div>
																	{learner.phone && (
																		<div className="text-[10px] text-muted-foreground">{learner.phone}</div>
																	)}
																</div>
															</TableCell>
															<TableCell className="text-[11px] text-muted-foreground">
																{learner.email || '-'}
															</TableCell>
															<TableCell className="text-[11px]">
																{formatDate(learner.date_of_birth) || '-'}
															</TableCell>
															<TableCell className="text-[11px]">
																{learner.institution_code || '-'}
															</TableCell>
															<TableCell className="text-[11px]">
																{learner.program_code || '-'}
															</TableCell>
															<TableCell className="text-[11px] text-center">
																{learner.current_semester || '-'}
															</TableCell>
															<TableCell className="text-[11px] text-center">
																{learner.admission_year || '-'}
															</TableCell>
															<TableCell className="text-[11px] text-muted-foreground">
																{learner.batch_name || '-'}
															</TableCell>
															<TableCell>
																<Badge variant={learner.is_active ? "default" : "secondary"} className="text-[10px]">
																	{learner.is_active ? "Active" : "Inactive"}
																</Badge>
															</TableCell>
														</TableRow>
													))}
												</>
											) : (
												<TableRow>
													<TableCell colSpan={11} className="h-24 text-center text-xs">
														No learners found.
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</div>
							</div>

							{/* Pagination Controls */}
							<div className="flex items-center justify-between space-x-2 py-2 mt-2 flex-shrink-0">
								<div className="text-xs text-muted-foreground">
									Showing {totalCount === 0 ? 0 : startIndex}-{endIndex} of {totalCount.toLocaleString()} learners
									{debouncedSearch && (
										<span className="ml-1">(searching: "{debouncedSearch}")</span>
									)}
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage(1)}
										disabled={currentPage === 1}
										className="h-7 px-2 text-xs"
									>
										First
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
										disabled={currentPage === 1}
										className="h-7 px-2 text-xs"
									>
										<ChevronLeft className="h-3 w-3 mr-1" />
										Prev
									</Button>
									<div className="text-xs text-muted-foreground px-2">
										Page {currentPage} of {totalPages || 1}
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
										disabled={currentPage >= totalPages}
										className="h-7 px-2 text-xs"
									>
										Next
										<ChevronRight className="h-3 w-3 ml-1" />
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage(totalPages)}
										disabled={currentPage >= totalPages}
										className="h-7 px-2 text-xs"
									>
										Last
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
				<AppFooter />
			</SidebarInset>
		</SidebarProvider>
	)
}
