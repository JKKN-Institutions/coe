'use client'

import { useMemo, useState, useEffect } from 'react'
import XLSX from '@/lib/utils/excel-compat'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context-parent'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { AppFooter } from '@/components/layout/app-footer'
import { PageTransition } from '@/components/common/page-transition'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/common/use-toast'
import {
	PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
	Users, FileSpreadsheet, RefreshCw, XCircle, AlertTriangle, Download, Upload, FileJson, Eye,
	Mail, Phone, Building2, GraduationCap, CheckCircle2, Clock, Ban, Send, Loader2, MailCheck,
} from 'lucide-react'
import type { Examiner, ExaminerStatus, ExaminerType, ExaminerFormData, ExaminerImportError } from '@/types/examiner'
import { EXAMINER_STATUS_OPTIONS, EXAMINER_TYPE_OPTIONS, DEFAULT_EXAMINER_FORM } from '@/types/examiner'
import { useInstitutionFilter } from '@/hooks/use-institution-filter'

interface Board {
	id: string
	board_code: string
	board_name: string
	board_type?: string
}

export default function ExaminersPage() {
	const { toast } = useToast()
	const { hasPermission } = useAuth()

	// Institution filter hook
	const {
		filter,
		isReady,
		appendToUrl,
		getInstitutionIdForCreate,
		mustSelectInstitution,
		shouldFilter,
		institutionId
	} = useInstitutionFilter()

	// Permissions
	const canEdit = true // hasPermission('examiners.edit')
	const canDelete = true // hasPermission('examiners.delete')
	const canCreate = true // hasPermission('examiners.create')

	// Data state
	const [items, setItems] = useState<Examiner[]>([])
	const [boards, setBoards] = useState<Board[]>([])
	const [loading, setLoading] = useState(true)

	// Filter state
	const [searchTerm, setSearchTerm] = useState('')
	const [statusFilter, setStatusFilter] = useState('all')
	const [typeFilter, setTypeFilter] = useState('all')
	const [boardFilter, setBoardFilter] = useState('all')

	// Sort & Pagination
	const [sortColumn, setSortColumn] = useState<string | null>(null)
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10)

	// Form state
	const [sheetOpen, setSheetOpen] = useState(false)
	const [editing, setEditing] = useState<Examiner | null>(null)
	const [formData, setFormData] = useState<ExaminerFormData>(DEFAULT_EXAMINER_FORM)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [saving, setSaving] = useState(false)

	// Import state
	const [errorPopupOpen, setErrorPopupOpen] = useState(false)
	const [importErrors, setImportErrors] = useState<ExaminerImportError[]>([])
	const [uploadSummary, setUploadSummary] = useState({ total: 0, success: 0, failed: 0 })

	// Fetch data when institution filter is ready
	useEffect(() => {
		if (!isReady) return
		fetchExaminers()
		fetchBoards()
	}, [isReady, filter])

	const fetchExaminers = async () => {
		try {
			setLoading(true)
			const url = appendToUrl('/api/examiners')
			const res = await fetch(url)
			if (res.ok) {
				let data = await res.json()

				// Client-side filter for safety
				if (shouldFilter && institutionId) {
					data = data.filter((examiner: Examiner) => examiner.institutions_id === institutionId)
				}

				setItems(data)
			}
		} catch (error) {
			console.error('Error fetching examiners:', error)
		} finally {
			setLoading(false)
		}
	}

	const fetchBoards = async () => {
		try {
			const res = await fetch('/api/master/boards')
			if (res.ok) {
				const data = await res.json()
				setBoards(data)
			}
		} catch (error) {
			console.error('Error fetching boards:', error)
		}
	}

	// Filtering & Sorting
	const filtered = useMemo(() => {
		const q = searchTerm.toLowerCase()
		let data = items.filter((i) =>
			[i.full_name, i.email, i.mobile, i.department, i.institution_name]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		)

		if (statusFilter !== 'all') {
			data = data.filter((i) => i.status === statusFilter)
		}

		if (typeFilter !== 'all') {
			data = data.filter((i) => i.examiner_type === typeFilter)
		}

		if (boardFilter !== 'all') {
			data = data.filter((i) =>
				i.boards?.some((b) => b.board_id === boardFilter && b.is_active)
			)
		}

		if (sortColumn) {
			data = [...data].sort((a, b) => {
				const av = (a as any)[sortColumn]
				const bv = (b as any)[sortColumn]
				if (av === bv) return 0
				if (sortDirection === 'asc') return av > bv ? 1 : -1
				return av < bv ? 1 : -1
			})
		}

		return data
	}, [items, searchTerm, statusFilter, typeFilter, boardFilter, sortColumn, sortDirection])

	const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filtered.length / itemsPerPage) || 1
	const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage
	const endIndex = itemsPerPage === 'all' ? filtered.length : startIndex + itemsPerPage
	const pageItems = filtered.slice(startIndex, endIndex)

	useEffect(() => setCurrentPage(1), [searchTerm, statusFilter, typeFilter, boardFilter, itemsPerPage])

	const handleSort = (column: string) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortColumn(column)
			setSortDirection('asc')
		}
	}

	const getSortIcon = (column: string) => {
		if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
		return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
	}

	// Form handling
	const resetForm = () => {
		// Auto-fill institution code from context
		const autoInstitutionId = getInstitutionIdForCreate()
		// The DEFAULT_EXAMINER_FORM has institution_code field, find the code
		let autoInstitutionCode = ''
		if (autoInstitutionId) {
			// We don't have institutions list in this page, but we can leave it blank for auto-fill via institutionId
			autoInstitutionCode = ''
		}

		setFormData({
			...DEFAULT_EXAMINER_FORM,
			institution_code: autoInstitutionCode,
		})
		setEditing(null)
		setErrors({})
	}

	const openAddForm = () => {
		resetForm()
		setSheetOpen(true)
	}

	const openEditForm = (examiner: Examiner) => {
		setEditing(examiner)
		setFormData({
			full_name: examiner.full_name,
			email: examiner.email,
			mobile: examiner.mobile || '',
			designation: examiner.designation || '',
			department: examiner.department || '',
			institution_name: examiner.institution_name || '',
			institution_address: examiner.institution_address || '',
			ug_experience_years: examiner.ug_experience_years,
			pg_experience_years: examiner.pg_experience_years,
			examiner_type: examiner.examiner_type,
			is_internal: examiner.is_internal,
			address: examiner.address || '',
			city: examiner.city || '',
			state: examiner.state || '',
			pincode: examiner.pincode || '',
			status: examiner.status,
			status_remarks: examiner.status_remarks || '',
			institution_code: examiner.institution_code || '',
			notes: examiner.notes || '',
			ug_board_codes: examiner.boards?.filter(b => b.board?.board_type === 'UG').map(b => b.board_code || '') || [],
			pg_board_codes: examiner.boards?.filter(b => b.board?.board_type === 'PG').map(b => b.board_code || '') || [],
			willing_for_valuation: examiner.boards?.[0]?.willing_for_valuation ?? true,
			willing_for_practical: examiner.boards?.[0]?.willing_for_practical ?? false,
			willing_for_scrutiny: examiner.boards?.[0]?.willing_for_scrutiny ?? false,
		})
		setSheetOpen(true)
	}

	const validate = () => {
		const e: Record<string, string> = {}
		if (!formData.full_name.trim()) e.full_name = 'Full name is required'
		if (!formData.email.trim()) e.email = 'Email is required'
		if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			e.email = 'Invalid email format'
		}
		setErrors(e)
		return Object.keys(e).length === 0
	}

	const handleSave = async () => {
		if (!validate()) {
			toast({ title: '⚠️ Validation Error', description: 'Please fix all errors.', variant: 'destructive' })
			return
		}

		try {
			setSaving(true)
			const url = '/api/examiners'
			const method = editing ? 'PUT' : 'POST'
			const body = editing ? { ...formData, id: editing.id } : formData

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})

			if (!res.ok) {
				const errorData = await res.json()
				throw new Error(errorData.error || 'Save failed')
			}

			const saved = await res.json()

			if (editing) {
				setItems((prev) => prev.map((i) => (i.id === saved.id ? saved : i)))
			} else {
				setItems((prev) => [saved, ...prev])
			}

			toast({
				title: editing ? '✅ Examiner Updated' : '✅ Examiner Created',
				description: `${saved.full_name} has been ${editing ? 'updated' : 'created'} successfully.`,
				className: 'bg-green-50 border-green-200 text-green-800',
			})

			setSheetOpen(false)
			resetForm()
		} catch (error) {
			toast({
				title: '❌ Save Failed',
				description: error instanceof Error ? error.message : 'Please try again.',
				variant: 'destructive',
			})
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async (id: string) => {
		try {
			setLoading(true)
			const examiner = items.find((i) => i.id === id)

			const res = await fetch(`/api/examiners?id=${id}`, { method: 'DELETE' })
			if (!res.ok) throw new Error('Delete failed')

			setItems((prev) => prev.filter((i) => i.id !== id))
			toast({
				title: '✅ Examiner Deleted',
				description: `${examiner?.full_name} has been deleted.`,
				className: 'bg-orange-50 border-orange-200 text-orange-800',
			})
		} catch (error) {
			toast({ title: '❌ Delete Failed', description: 'Please try again.', variant: 'destructive' })
		} finally {
			setLoading(false)
		}
	}

	const handleStatusToggle = async (examiner: Examiner) => {
		const newStatus = examiner.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
		try {
			const res = await fetch(`/api/examiners/${examiner.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			})

			if (!res.ok) throw new Error('Status update failed')

			setItems((prev) =>
				prev.map((i) => (i.id === examiner.id ? { ...i, status: newStatus } : i))
			)

			toast({
				title: '✅ Status Updated',
				description: `${examiner.full_name} is now ${newStatus.toLowerCase()}.`,
				className: 'bg-green-50 border-green-200 text-green-800',
			})
		} catch (error) {
			toast({ title: '❌ Update Failed', description: 'Please try again.', variant: 'destructive' })
		}
	}

	const getStatusBadge = (status: ExaminerStatus) => {
		const config = EXAMINER_STATUS_OPTIONS.find((s) => s.value === status)
		return (
			<Badge className={`${config?.color || 'bg-gray-100 text-gray-700'} border-0`}>
				{config?.label || status}
			</Badge>
		)
	}

	// Stats
	const stats = useMemo(() => ({
		total: items.length,
		active: items.filter((i) => i.status === 'ACTIVE').length,
		pending: items.filter((i) => i.status === 'PENDING').length,
		verified: items.filter((i) => i.email_verified).length,
	}), [items])

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex flex-col min-h-screen">
				<AppHeader />
				<PageTransition>
					<div className="flex flex-1 flex-col gap-3 p-4 pt-0 overflow-y-auto">
						{/* Breadcrumb */}
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
										<BreadcrumbPage>Examiners</BreadcrumbPage>
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
						</div>

						{/* Stats Cards */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<Card className="border-slate-200">
								<CardContent className="p-4">
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
											<Users className="h-5 w-5 text-blue-600" />
										</div>
										<div>
											<p className="text-sm text-slate-600">Total</p>
											<p className="text-2xl font-bold text-slate-900">{stats.total}</p>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card className="border-slate-200">
								<CardContent className="p-4">
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
											<CheckCircle2 className="h-5 w-5 text-green-600" />
										</div>
										<div>
											<p className="text-sm text-slate-600">Active</p>
											<p className="text-2xl font-bold text-green-700">{stats.active}</p>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card className="border-slate-200">
								<CardContent className="p-4">
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 rounded-lg bg-yellow-50 flex items-center justify-center">
											<Clock className="h-5 w-5 text-yellow-600" />
										</div>
										<div>
											<p className="text-sm text-slate-600">Pending</p>
											<p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card className="border-slate-200">
								<CardContent className="p-4">
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
											<MailCheck className="h-5 w-5 text-emerald-600" />
										</div>
										<div>
											<p className="text-sm text-slate-600">Verified</p>
											<p className="text-2xl font-bold text-emerald-700">{stats.verified}</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Main Table Card */}
						<Card className="flex-1 flex flex-col min-h-0 border-slate-200 shadow-sm rounded-2xl">
							<CardHeader className="flex-shrink-0 px-8 py-6 border-b border-slate-200">
								<div className="space-y-4">
									{/* Title & Actions */}
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
												<Users className="h-6 w-6 text-emerald-600" />
											</div>
											<div>
												<h2 className="text-xl font-bold text-slate-900">Examiner Management</h2>
												<p className="text-sm text-slate-600">Manage examiner panel for valuations & practicals</p>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<Button variant="outline" size="sm" onClick={fetchExaminers} disabled={loading} className="h-9 w-9 p-0" title="Refresh">
												<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
											</Button>
											<Button size="sm" onClick={openAddForm} disabled={!canCreate} className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
												<PlusCircle className="h-4 w-4 mr-2" />
												Add Examiner
											</Button>
										</div>
									</div>

									{/* Filters */}
									<div className="flex flex-wrap items-center gap-2">
										<Select value={statusFilter} onValueChange={setStatusFilter}>
											<SelectTrigger className="h-9 rounded-lg w-[140px]">
												<SelectValue placeholder="Status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Status</SelectItem>
												{EXAMINER_STATUS_OPTIONS.map((opt) => (
													<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
												))}
											</SelectContent>
										</Select>

										<Select value={typeFilter} onValueChange={setTypeFilter}>
											<SelectTrigger className="h-9 rounded-lg w-[140px]">
												<SelectValue placeholder="Type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Types</SelectItem>
												{EXAMINER_TYPE_OPTIONS.map((opt) => (
													<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
												))}
											</SelectContent>
										</Select>

										<Select value={boardFilter} onValueChange={setBoardFilter}>
											<SelectTrigger className="h-9 rounded-lg w-[160px]">
												<SelectValue placeholder="Board" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Boards</SelectItem>
												{boards.map((board) => (
													<SelectItem key={board.id} value={board.id}>{board.board_name}</SelectItem>
												))}
											</SelectContent>
										</Select>

										<div className="relative flex-1 max-w-sm">
											<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
											<Input
												value={searchTerm}
												onChange={(e) => setSearchTerm(e.target.value)}
												placeholder="Search examiners..."
												className="pl-8 h-9 rounded-lg"
											/>
										</div>
									</div>
								</div>
							</CardHeader>

							<CardContent className="flex-1 overflow-auto px-8 py-6 bg-slate-50/50">
								<div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
									<Table>
										<TableHeader className="bg-slate-50 border-b border-slate-200">
											<TableRow>
												<TableHead className="text-sm font-semibold text-slate-700">
													<Button variant="ghost" size="sm" onClick={() => handleSort('full_name')} className="px-2">
														Name {getSortIcon('full_name')}
													</Button>
												</TableHead>
												<TableHead className="text-sm font-semibold text-slate-700">Contact</TableHead>
												<TableHead className="text-sm font-semibold text-slate-700">Institution</TableHead>
												<TableHead className="text-sm font-semibold text-slate-700">Type</TableHead>
												<TableHead className="text-sm font-semibold text-slate-700">Status</TableHead>
												<TableHead className="text-sm font-semibold text-slate-700">Verified</TableHead>
												<TableHead className="text-center text-sm font-semibold text-slate-700">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{loading || !isReady ? (
												<TableRow>
													<TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
														Loading...
													</TableCell>
												</TableRow>
											) : pageItems.length ? (
												pageItems.map((row) => (
													<TableRow key={row.id} className="border-b border-slate-200 hover:bg-slate-50">
														<TableCell>
															<div>
																<p className="font-medium text-slate-900">{row.full_name}</p>
																<p className="text-xs text-slate-500">{row.designation}</p>
															</div>
														</TableCell>
														<TableCell>
															<div className="space-y-1">
																<div className="flex items-center gap-1 text-sm text-slate-600">
																	<Mail className="h-3 w-3" />
																	{row.email}
																</div>
																{row.mobile && (
																	<div className="flex items-center gap-1 text-sm text-slate-500">
																		<Phone className="h-3 w-3" />
																		{row.mobile}
																	</div>
																)}
															</div>
														</TableCell>
														<TableCell>
															<div className="max-w-[200px]">
																<p className="text-sm text-slate-900 truncate">{row.institution_name || '-'}</p>
																<p className="text-xs text-slate-500">{row.department}</p>
															</div>
														</TableCell>
														<TableCell>
															<Badge variant="outline" className="text-xs">
																{row.examiner_type}
															</Badge>
														</TableCell>
														<TableCell>{getStatusBadge(row.status)}</TableCell>
														<TableCell>
															{row.email_verified ? (
																<CheckCircle2 className="h-4 w-4 text-green-500" />
															) : (
																<XCircle className="h-4 w-4 text-gray-300" />
															)}
														</TableCell>
														<TableCell className="text-center">
															<div className="flex items-center justify-center gap-1">
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-8 w-8 p-0 hover:bg-emerald-100 text-emerald-600"
																	onClick={() => openEditForm(row)}
																	disabled={!canEdit}
																>
																	<Edit className="h-4 w-4" />
																</Button>
																<Switch
																	checked={row.status === 'ACTIVE'}
																	onCheckedChange={() => handleStatusToggle(row)}
																	disabled={!canEdit}
																/>
																<AlertDialog>
																	<AlertDialogTrigger asChild>
																		<Button
																			variant="ghost"
																			size="sm"
																			className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
																			disabled={!canDelete}
																		>
																			<Trash2 className="h-4 w-4" />
																		</Button>
																	</AlertDialogTrigger>
																	<AlertDialogContent>
																		<AlertDialogHeader>
																			<AlertDialogTitle>Delete Examiner</AlertDialogTitle>
																			<AlertDialogDescription>
																				Are you sure you want to delete {row.full_name}?
																			</AlertDialogDescription>
																		</AlertDialogHeader>
																		<AlertDialogFooter>
																			<AlertDialogCancel>Cancel</AlertDialogCancel>
																			<AlertDialogAction onClick={() => handleDelete(row.id)} className="bg-red-600 hover:bg-red-700">
																				Delete
																			</AlertDialogAction>
																		</AlertDialogFooter>
																	</AlertDialogContent>
																</AlertDialog>
															</div>
														</TableCell>
													</TableRow>
												))
											) : (
												<TableRow>
													<TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
														No examiners found
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</div>

								{/* Pagination */}
								<div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
									<div className="flex items-center gap-4">
										<div className="text-sm text-slate-600">
											Showing {filtered.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length}
										</div>
										<Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(v === 'all' ? 'all' : Number(v))}>
											<SelectTrigger className="h-9 w-[100px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="10">10</SelectItem>
												<SelectItem value="20">20</SelectItem>
												<SelectItem value="50">50</SelectItem>
												<SelectItem value="all">All</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
											disabled={currentPage === 1 || itemsPerPage === 'all'}
										>
											<ChevronLeft className="h-4 w-4 mr-1" /> Previous
										</Button>
										<div className="text-sm text-slate-600 px-2">
											Page {currentPage} of {totalPages}
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
											disabled={currentPage >= totalPages || itemsPerPage === 'all'}
										>
											Next <ChevronRight className="h-4 w-4 ml-1" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</PageTransition>
				<AppFooter />

				{/* Add/Edit Sheet */}
				<Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) resetForm(); setSheetOpen(o) }}>
					<SheetContent className="sm:max-w-[800px] overflow-y-auto">
						<SheetHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 -mx-6 -mt-6 px-6 py-4 mb-6">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
									<Users className="h-5 w-5 text-white" />
								</div>
								<div>
									<SheetTitle className="text-white">{editing ? 'Edit Examiner' : 'Add New Examiner'}</SheetTitle>
									<SheetDescription className="text-emerald-100">
										{editing ? 'Update examiner details' : 'Register a new examiner'}
									</SheetDescription>
								</div>
							</div>
						</SheetHeader>

						<div className="space-y-6">
							{/* Personal Info */}
							<div className="space-y-4">
								<h3 className="font-semibold text-emerald-700 flex items-center gap-2 border-b pb-2">
									<Users className="h-4 w-4" /> Personal Information
								</h3>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Full Name <span className="text-red-500">*</span></Label>
										<Input
											value={formData.full_name}
											onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
											className={errors.full_name ? 'border-red-500' : ''}
										/>
										{errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
									</div>
									<div className="space-y-2">
										<Label>Email <span className="text-red-500">*</span></Label>
										<Input
											type="email"
											value={formData.email}
											onChange={(e) => setFormData({ ...formData, email: e.target.value })}
											className={errors.email ? 'border-red-500' : ''}
										/>
										{errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
									</div>
									<div className="space-y-2">
										<Label>Mobile</Label>
										<Input
											value={formData.mobile}
											onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
										/>
									</div>
									<div className="space-y-2">
										<Label>Designation</Label>
										<Input
											value={formData.designation}
											onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
										/>
									</div>
								</div>
							</div>

							{/* Institution Info */}
							<div className="space-y-4">
								<h3 className="font-semibold text-emerald-700 flex items-center gap-2 border-b pb-2">
									<Building2 className="h-4 w-4" /> Institution Details
								</h3>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Institution Name</Label>
										<Input
											value={formData.institution_name}
											onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
										/>
									</div>
									<div className="space-y-2">
										<Label>Department</Label>
										<Input
											value={formData.department}
											onChange={(e) => setFormData({ ...formData, department: e.target.value })}
										/>
									</div>
									<div className="col-span-2 space-y-2">
										<Label>Institution Address</Label>
										<Textarea
											value={formData.institution_address}
											onChange={(e) => setFormData({ ...formData, institution_address: e.target.value })}
											rows={2}
										/>
									</div>
								</div>
							</div>

							{/* Experience & Type */}
							<div className="space-y-4">
								<h3 className="font-semibold text-emerald-700 flex items-center gap-2 border-b pb-2">
									<GraduationCap className="h-4 w-4" /> Experience & Classification
								</h3>
								<div className="grid grid-cols-3 gap-4">
									<div className="space-y-2">
										<Label>UG Experience (Years)</Label>
										<Input
											type="number"
											min="0"
											value={formData.ug_experience_years}
											onChange={(e) => setFormData({ ...formData, ug_experience_years: parseInt(e.target.value) || 0 })}
										/>
									</div>
									<div className="space-y-2">
										<Label>PG Experience (Years)</Label>
										<Input
											type="number"
											min="0"
											value={formData.pg_experience_years}
											onChange={(e) => setFormData({ ...formData, pg_experience_years: parseInt(e.target.value) || 0 })}
										/>
									</div>
									<div className="space-y-2">
										<Label>Examiner Type</Label>
										<Select value={formData.examiner_type} onValueChange={(v) => setFormData({ ...formData, examiner_type: v as ExaminerType })}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{EXAMINER_TYPE_OPTIONS.map((opt) => (
													<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>

							{/* Status */}
							<div className="space-y-4">
								<h3 className="font-semibold text-emerald-700 flex items-center gap-2 border-b pb-2">
									<CheckCircle2 className="h-4 w-4" /> Status
								</h3>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Status</Label>
										<Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as ExaminerStatus })}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{EXAMINER_STATUS_OPTIONS.map((opt) => (
													<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>Status Remarks</Label>
										<Input
											value={formData.status_remarks}
											onChange={(e) => setFormData({ ...formData, status_remarks: e.target.value })}
											placeholder="Optional remarks"
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label>Notes</Label>
									<Textarea
										value={formData.notes}
										onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
										rows={2}
										placeholder="Internal notes about this examiner"
									/>
								</div>
							</div>

							{/* Actions */}
							<div className="flex justify-end gap-3 pt-4 border-t">
								<Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
								<Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
									{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : editing ? 'Update' : 'Create'}
								</Button>
							</div>
						</div>
					</SheetContent>
				</Sheet>
			</SidebarInset>
		</SidebarProvider>
	)
}
