"use client"

/**
 * Regulations Page - MyJKKN Data Source
 *
 * This page displays regulations data sourced from MyJKKN API.
 * This is a READ-ONLY view - all CRUD operations are managed in MyJKKN.
 *
 * Migration Note: This page replaces the old /master/regulations page
 * that used local COE database tables.
 */

import { useState, useMemo } from "react"
import Link from "next/link"
import XLSX from "@/lib/utils/excel-compat"
import { AppFooter } from "@/components/layout/app-footer"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/common/use-toast"
import {
	Download,
	Search,
	ChevronLeft,
	ChevronRight,
	LibraryBig,
	FileText,
	Clock,
	TrendingUp,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	RefreshCw,
	ExternalLink,
	AlertCircle,
	Info,
} from "lucide-react"
import { useMyJKKNRegulations } from "@/hooks/myjkkn/use-myjkkn-data"
import { useInstitutionFilter } from "@/context/institution-context"
import type { COERegulation } from "@/services/myjkkn/myjkkn-adapter-service"

export default function RegulationsMyJKKNPage() {
	const { toast } = useToast()

	// Institution filter
	const { filter, shouldFilter, isLoading: institutionLoading } = useInstitutionFilter()

	// Fetch regulations from MyJKKN
	const {
		data: regulations,
		loading,
		error,
		refetch,
	} = useMyJKKNRegulations({
		institution_code: shouldFilter ? filter.institution_code : undefined,
	})

	// Local state for filtering and pagination
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState("all")
	const [yearFilter, setYearFilter] = useState("all")
	const [sortColumn, setSortColumn] = useState<string | null>(null)
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

	// Handle sorting
	const handleSort = (column: string) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortColumn(column)
			setSortDirection('asc')
		}
	}

	// Filter and sort regulations
	const filteredRegulations = useMemo(() => {
		return regulations
			.filter((regulation) => {
				const matchesSearch = regulation.regulation_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
					regulation.regulation_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					regulation.regulation_year?.toString().includes(searchTerm)
				const matchesStatus = statusFilter === "all" ||
					(statusFilter === "active" && regulation.is_active) ||
					(statusFilter === "inactive" && !regulation.is_active)
				const matchesYear = yearFilter === "all" || regulation.regulation_year?.toString() === yearFilter
				return matchesSearch && matchesStatus && matchesYear
			})
			.sort((a, b) => {
				if (!sortColumn) return 0

				let aValue: string | number
				let bValue: string | number

				switch (sortColumn) {
					case 'regulation_code':
						aValue = a.regulation_code.toLowerCase()
						bValue = b.regulation_code.toLowerCase()
						break
					case 'regulation_year':
						aValue = a.regulation_year || 0
						bValue = b.regulation_year || 0
						break
					case 'status':
						aValue = a.is_active ? 1 : 0
						bValue = b.is_active ? 1 : 0
						break
					case 'created_at':
						aValue = new Date(a.created_at).getTime()
						bValue = new Date(b.created_at).getTime()
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
	}, [regulations, searchTerm, statusFilter, yearFilter, sortColumn, sortDirection])

	// Get unique years for year filter
	const uniqueYears = useMemo(() => {
		return [...new Set(regulations.map(r => r.regulation_year).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0))
	}, [regulations])

	// Calculate pagination
	const totalPages = Math.ceil(filteredRegulations.length / itemsPerPage)
	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const paginatedRegulations = filteredRegulations.slice(startIndex, endIndex)

	// Helper functions
	const getSortIcon = (column: string) => {
		if (sortColumn !== column) {
			return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
		}
		return sortDirection === 'asc'
			? <ArrowUp className="h-3 w-3" />
			: <ArrowDown className="h-3 w-3" />
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}

	// Export function
	const handleExport = () => {
		const excelData = filteredRegulations.map((reg, index) => ({
			'S.No': index + 1,
			'Regulation Code': reg.regulation_code,
			'Regulation Name': reg.regulation_name,
			'Year': reg.regulation_year,
			'Institution Code': reg.institution_code || '',
			'Status': reg.is_active ? 'Active' : 'Inactive',
			'Description': reg.description || '',
		}))

		const ws = XLSX.utils.json_to_sheet(excelData)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Regulations')
		XLSX.writeFile(wb, `regulations_myjkkn_export_${new Date().toISOString().split('T')[0]}.xlsx`)

		toast({
			title: "✅ Export Successful",
			description: `Exported ${excelData.length} regulations.`,
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
									<BreadcrumbPage>Regulations (MyJKKN)</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					{/* Header Section */}
					<div className="flex items-center justify-between flex-shrink-0">
						<div>
							<h1 className="text-xl font-bold tracking-tight">Regulations</h1>
							<p className="text-xs text-muted-foreground">
								View regulations from MyJKKN master data
							</p>
						</div>
					</div>

					{/* MyJKKN Data Source Notice */}
					<Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
						<Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
						<AlertTitle className="text-blue-800 dark:text-blue-200">Data Source: MyJKKN</AlertTitle>
						<AlertDescription className="text-blue-700 dark:text-blue-300">
							This data is sourced from the MyJKKN platform. To add, edit, or delete regulations,
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
										<p className="text-xs font-medium text-muted-foreground">Total Regulations</p>
										<p className="text-xl font-bold">{regulations.length}</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
										<FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Active Regulations</p>
										<p className="text-xl font-bold text-green-600">
											{regulations.filter(r => r.is_active).length}
										</p>
									</div>
									<div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
										<LibraryBig className="h-3 w-3 text-green-600 dark:text-green-400" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Inactive Regulations</p>
										<p className="text-xl font-bold text-red-600">
											{regulations.filter(r => !r.is_active).length}
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
										<p className="text-xs font-medium text-muted-foreground">Unique Years</p>
										<p className="text-xl font-bold text-blue-600">
											{uniqueYears.length}
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
										<LibraryBig className="h-3 w-3 text-primary" />
									</div>
									<div>
										<h2 className="text-sm font-semibold">Regulations</h2>
										<p className="text-[11px] text-muted-foreground">Browse and filter regulation records from MyJKKN</p>
									</div>
								</div>
							</div>
							<div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
								<div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
									<Select value={statusFilter} onValueChange={setStatusFilter}>
										<SelectTrigger className="w-[140px] h-8">
											<SelectValue placeholder="All Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Status</SelectItem>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="inactive">Inactive</SelectItem>
										</SelectContent>
									</Select>

									<Select value={yearFilter} onValueChange={setYearFilter}>
										<SelectTrigger className="w-[140px] h-8">
											<SelectValue placeholder="All Years" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Years</SelectItem>
											{uniqueYears.map(year => (
												<SelectItem key={year} value={String(year)}>{year}</SelectItem>
											))}
										</SelectContent>
									</Select>

									<div className="relative w-full sm:w-[220px]">
										<Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
										<Input
											placeholder="Search regulations…"
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className="pl-8 h-8 text-xs"
										/>
									</div>
								</div>

								<div className="flex gap-1 flex-wrap">
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
										disabled={filteredRegulations.length === 0}
									>
										<Download className="h-3 w-3 mr-1" />
										Export
									</Button>
								</div>
							</div>
						</CardHeader>

						<CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">
							<div className="rounded-md border overflow-hidden" style={{ height: '440px' }}>
								<div className="h-full overflow-auto">
									<Table>
										<TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
											<TableRow>
												<TableHead className="w-[150px] text-[11px]">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSort('regulation_code')}
														className="h-auto p-0 font-medium hover:bg-transparent"
													>
														Regulation Code
														<span className="ml-1">
															{getSortIcon('regulation_code')}
														</span>
													</Button>
												</TableHead>
												<TableHead className="text-[11px]">Regulation Name</TableHead>
												<TableHead className="w-[100px] text-[11px]">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSort('regulation_year')}
														className="h-auto p-0 font-medium hover:bg-transparent"
													>
														Year
														<span className="ml-1">
															{getSortIcon('regulation_year')}
														</span>
													</Button>
												</TableHead>
												<TableHead className="w-[120px] text-[11px]">Institution</TableHead>
												<TableHead className="w-[100px] text-[11px]">
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
												<TableHead className="w-[120px] text-[11px]">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSort('created_at')}
														className="h-auto p-0 font-medium hover:bg-transparent"
													>
														Created
														<span className="ml-1">
															{getSortIcon('created_at')}
														</span>
													</Button>
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{isLoading ? (
												<TableRow>
													<TableCell colSpan={6} className="h-24 text-center text-[11px]">
														<RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
														Loading regulations from MyJKKN...
													</TableCell>
												</TableRow>
											) : paginatedRegulations.length > 0 ? (
												<>
													{paginatedRegulations.map((regulation) => (
														<TableRow key={regulation.id}>
															<TableCell className="font-medium text-[11px]">
																{regulation.regulation_code}
															</TableCell>
															<TableCell className="text-[11px]">
																{regulation.regulation_name}
															</TableCell>
															<TableCell className="text-[11px]">
																{regulation.regulation_year}
															</TableCell>
															<TableCell className="text-[11px] text-muted-foreground">
																{regulation.institution_code || '-'}
															</TableCell>
															<TableCell>
																<Badge variant={regulation.is_active ? "default" : "secondary"} className="text-[11px]">
																	{regulation.is_active ? "Active" : "Inactive"}
																</Badge>
															</TableCell>
															<TableCell className="text-[11px] text-muted-foreground">
																{formatDate(regulation.created_at)}
															</TableCell>
														</TableRow>
													))}
													{Array.from({ length: Math.max(0, itemsPerPage - paginatedRegulations.length) }).map((_, index) => (
														<TableRow key={`empty-${index}`}>
															<TableCell>&nbsp;</TableCell>
															<TableCell>&nbsp;</TableCell>
															<TableCell>&nbsp;</TableCell>
															<TableCell>&nbsp;</TableCell>
															<TableCell>&nbsp;</TableCell>
															<TableCell>&nbsp;</TableCell>
														</TableRow>
													))}
												</>
											) : (
												<>
													<TableRow>
														<TableCell colSpan={6} className="text-center text-xs">
															No regulations found.
														</TableCell>
													</TableRow>
													{Array.from({ length: itemsPerPage - 1 }).map((_, index) => (
														<TableRow key={`empty-no-data-${index}`}>
															<TableCell>&nbsp;</TableCell>
															<TableCell>&nbsp;</TableCell>
															<TableCell>&nbsp;</TableCell>
															<TableCell>&nbsp;</TableCell>
															<TableCell>&nbsp;</TableCell>
															<TableCell>&nbsp;</TableCell>
														</TableRow>
													))}
												</>
											)}
										</TableBody>
									</Table>
								</div>
							</div>

							{/* Pagination Controls */}
							<div className="flex items-center justify-between space-x-2 py-2 mt-2">
								<div className="text-xs text-muted-foreground">
									Showing {filteredRegulations.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredRegulations.length)} of {filteredRegulations.length} regulations
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
										disabled={currentPage === 1}
										className="h-7 px-2 text-xs"
									>
										<ChevronLeft className="h-3 w-3 mr-1" />
										Previous
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
