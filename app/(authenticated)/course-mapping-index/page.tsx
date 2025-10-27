"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { FileText, Search, BookOpen, Edit2, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { generateCourseMappingPDF } from "@/lib/utils/generate-course-mapping-pdf"

type CourseMappingGroup = {
	institution_code: string
	program_code: string
	regulation_code: string
	institution_name?: string
	program_name?: string
	regulation_name?: string
	total_courses: number
	created_at?: string
}

export default function CourseMappingIndexPage() {
	const [loading, setLoading] = useState(false)
	const [groups, setGroups] = useState<CourseMappingGroup[]>([])
	const [searchTerm, setSearchTerm] = useState("")
	const [entriesPerPage, setEntriesPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const { toast } = useToast()

	useEffect(() => {
		fetchCourseMappingGroups()
	}, [])

	const fetchCourseMappingGroups = async () => {
		try {
			setLoading(true)
			const res = await fetch('/api/course-mapping/groups')
			if (res.ok) {
				const data = await res.json()
				setGroups(data)
			} else {
				const error = await res.json()
				toast({
					title: '❌ Error',
					description: error.error || 'Failed to fetch course mapping groups',
					variant: 'destructive'
				})
			}
		} catch (err) {
			console.error('Error fetching course mapping groups:', err)
			toast({
				title: '❌ Error',
				description: 'Failed to load course mapping groups. Please try again.',
				variant: 'destructive'
			})
		} finally {
			setLoading(false)
		}
	}

	// Filter groups based on search term
	const filteredGroups = groups.filter(group => {
		const searchLower = searchTerm.toLowerCase()
		return (
			group.institution_code?.toLowerCase().includes(searchLower) ||
			group.institution_name?.toLowerCase().includes(searchLower) ||
			group.program_code?.toLowerCase().includes(searchLower) ||
			group.program_name?.toLowerCase().includes(searchLower) ||
			group.regulation_code?.toLowerCase().includes(searchLower) ||
			group.regulation_name?.toLowerCase().includes(searchLower)
		)
	})

	// Pagination
	const totalPages = Math.ceil(filteredGroups.length / entriesPerPage)
	const startIndex = (currentPage - 1) * entriesPerPage
	const endIndex = startIndex + entriesPerPage
	const currentGroups = filteredGroups.slice(startIndex, endIndex)

	const handlePageChange = (page: number) => {
		setCurrentPage(page)
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex flex-col min-h-screen">
				<AppHeader />
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
					<div className="flex items-center gap-2">
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbLink asChild>
										<Link href="/dashboard">Dashboard</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage>Course Mapping</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					<Card>
						<CardHeader className="p-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
										<BookOpen className="h-5 w-5 text-white" />
									</div>
									<div>
										<h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
										Course Mapping
										</h1>
										<p className="text-xs text-muted-foreground">
											View and manage course mappings by program and regulation
										</p>
									</div>
								</div>
								<div className="flex gap-2">
									<Button variant="outline" size="sm" className="h-8" asChild>
										<Link href="/course-mapping/add">
											<Edit2 className="h-3 w-3 mr-2" />
											Add New Mapping
										</Link>
									</Button>
								</div>
							</div>
						</CardHeader>

						<CardContent className="p-3 pt-0">
							{/* Search and Entries Control */}
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">Show</span>
									<select
										value={entriesPerPage}
										onChange={(e) => {
											setEntriesPerPage(Number(e.target.value))
											setCurrentPage(1)
										}}
										className="h-7 rounded-md border border-input bg-background px-2 py-1 text-[11px]"
									>
										<option value={10}>10</option>
										<option value={25}>25</option>
										<option value={50}>50</option>
										<option value={100}>100</option>
									</select>
									<span className="text-xs text-muted-foreground">entries</span>
								</div>

								<div className="relative w-64">
									<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
									<Input
										type="text"
										placeholder="Search..."
										value={searchTerm}
										onChange={(e) => {
											setSearchTerm(e.target.value)
											setCurrentPage(1)
										}}
										className="pl-7 h-7 text-[11px]"
									/>
								</div>
							</div>

							{/* Table */}
							<div className="border rounded-lg overflow-hidden">
								<div className="overflow-auto" style={{ height: "440px" }}>
									<Table>
										<TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
											<TableRow className="bg-muted/50">
												<TableHead className="w-[200px] font-semibold text-[11px] h-8">Institution</TableHead>
												<TableHead className="w-[150px] font-semibold text-[11px] h-8">Program Code</TableHead>
												<TableHead className="w-[250px] font-semibold text-[11px] h-8">Program Name</TableHead>
												<TableHead className="font-semibold text-[11px] h-8">Regulation</TableHead>
												<TableHead className="text-center font-semibold text-[11px] h-8">Total Courses</TableHead>
												<TableHead className="text-center font-semibold text-[11px] h-8">Action</TableHead>
											</TableRow>
										</TableHeader>
									<TableBody>
										{loading ? (
											<TableRow>
												<TableCell colSpan={6} className="text-center py-8">
													<div className="flex items-center justify-center gap-2">
														<div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
														<span className="text-[11px] text-muted-foreground">Loading...</span>
													</div>
												</TableCell>
											</TableRow>
										) : currentGroups.length === 0 ? (
											<TableRow>
												<TableCell colSpan={6} className="text-center py-8 text-[11px] text-muted-foreground">
													{searchTerm ? 'No matching records found' : 'No course mappings found. Create your first mapping!'}
												</TableCell>
											</TableRow>
										) : (
											currentGroups.map((group, index) => (
												<TableRow key={`${group.institution_code}-${group.program_code}-${group.regulation_code}`} className="hover:bg-muted/50">
													<TableCell className="py-2">
														<div className="flex flex-col">
															<span className="font-medium text-[11px]">
																{group.institution_name || group.institution_code}
															</span>
															<span className="text-[10px] text-muted-foreground">
																{group.institution_code}
															</span>
														</div>
													</TableCell>
													<TableCell className="py-2">
														<span className="font-mono text-[11px]">{group.program_code}</span>
													</TableCell>
													<TableCell className="py-2">
														<span className="text-[11px]">{group.program_name || '-'}</span>
													</TableCell>
													<TableCell className="py-2">
														<div className="flex flex-col">
															<span className="text-[11px]">{group.regulation_code}</span>
															{group.regulation_name && (
																<span className="text-[10px] text-muted-foreground">{group.regulation_name}</span>
															)}
														</div>
													</TableCell>
													<TableCell className="text-center py-2">
														<Badge variant="secondary" className="font-semibold text-[10px] h-5">
															{group.total_courses}
														</Badge>
													</TableCell>
													<TableCell className="text-center py-2">
														<div className="flex items-center justify-center gap-1">
															<Button
																variant="ghost"
																size="sm"
																asChild
																className="h-7 text-[11px] px-2"
															>
																<Link href={`/course-mapping/edit?institution=${group.institution_code}&program=${group.program_code}&regulation=${group.regulation_code}`}>
																	<Edit2 className="h-3 w-3 mr-1" />
																	Edit
																</Link>
															</Button>
															<Button
																variant="outline"
																size="sm"
																className="h-7 text-[11px] px-2"
																onClick={async () => {
																	try {
																		// Fetch report data from API (without batch)
																		const response = await fetch(`/api/course-mapping/report?institution_code=${group.institution_code}&program_code=${group.program_code}&regulation_code=${group.regulation_code}`)

																		if (!response.ok) {
																			throw new Error('Failed to fetch report data')
																		}

																		const reportData = await response.json()

																		if (!reportData.mappings || reportData.mappings.length === 0) {
																			toast({
																				title: '⚠️ No Data',
																				description: 'No course mappings found.',
																				variant: 'destructive'
																			})
																			return
																		}

																		// Generate PDF client-side
																		generateCourseMappingPDF(reportData)

																		toast({
																			title: '✅ PDF Generated',
																			description: 'Course mapping report has been downloaded',
																			className: 'bg-green-50 border-green-200 text-green-800'
																		})
																	} catch (error) {
																		toast({
																			title: '❌ Error',
																			description: 'Failed to generate PDF',
																			variant: 'destructive'
																		})
																	}
																}}
															>
																<FileText className="h-3 w-3 mr-1" />
																Export PDF
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
								</div>
							</div>

							{/* Pagination */}
							{filteredGroups.length > 0 && (
								<div className="flex items-center justify-between mt-3">
									<div className="text-xs text-muted-foreground">
										Showing {startIndex + 1} to {Math.min(endIndex, filteredGroups.length)} of {filteredGroups.length} entries
									</div>
									<div className="flex items-center gap-1">
										<Button
											variant="outline"
											size="sm"
											className="h-7 text-[11px] px-2"
											onClick={() => handlePageChange(1)}
											disabled={currentPage === 1}
										>
											First
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="h-7 text-[11px] px-2"
											onClick={() => handlePageChange(currentPage - 1)}
											disabled={currentPage === 1}
										>
											Previous
										</Button>

										{/* Page numbers */}
										{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
											let pageNum
											if (totalPages <= 5) {
												pageNum = i + 1
											} else if (currentPage <= 3) {
												pageNum = i + 1
											} else if (currentPage >= totalPages - 2) {
												pageNum = totalPages - 4 + i
											} else {
												pageNum = currentPage - 2 + i
											}

											return (
												<Button
													key={pageNum}
													variant={currentPage === pageNum ? "default" : "outline"}
													size="sm"
													onClick={() => handlePageChange(pageNum)}
													className="h-7 w-7 p-0 text-[11px]"
												>
													{pageNum}
												</Button>
											)
										})}

										<Button
											variant="outline"
											size="sm"
											className="h-7 text-[11px] px-2"
											onClick={() => handlePageChange(currentPage + 1)}
											disabled={currentPage === totalPages}
										>
											Next
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="h-7 text-[11px] px-2"
											onClick={() => handlePageChange(totalPages)}
											disabled={currentPage === totalPages}
										>
											Last
										</Button>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
				<AppFooter />
			</SidebarInset>
		</SidebarProvider>
	)
}
