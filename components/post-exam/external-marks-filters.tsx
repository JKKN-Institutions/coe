'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown, Search, RefreshCw, Download, Upload, FileSpreadsheet, Trash2 } from 'lucide-react'
import type { Institution, ExamSession, Program, Course } from '@/types/external-marks'

interface ExternalMarksFiltersProps {
	// Data
	institutions: Institution[]
	sessions: ExamSession[]
	programs: Program[]
	courses: Course[]

	// Selected Values
	selectedInstitution: string
	selectedSession: string
	selectedProgram: string
	selectedCourse: string
	statusFilter: string
	searchTerm: string

	// Handlers
	onInstitutionChange: (id: string) => void
	onSessionChange: (id: string) => void
	onProgramChange: (id: string) => void
	onCourseChange: (id: string) => void
	onStatusChange: (status: string) => void
	onSearchChange: (term: string) => void

	// Actions
	onRefresh: () => void
	onDownloadTemplate: () => void
	onExportData: () => void
	onImportFile: () => void
	onDeleteSelected: () => void

	// State
	loading: boolean
	itemsCount: number
	selectedCount: number
}

export function ExternalMarksFilters({
	institutions,
	sessions,
	programs,
	courses,
	selectedInstitution,
	selectedSession,
	selectedProgram,
	selectedCourse,
	statusFilter,
	searchTerm,
	onInstitutionChange,
	onSessionChange,
	onProgramChange,
	onCourseChange,
	onStatusChange,
	onSearchChange,
	onRefresh,
	onDownloadTemplate,
	onExportData,
	onImportFile,
	onDeleteSelected,
	loading,
	itemsCount,
	selectedCount
}: ExternalMarksFiltersProps) {
	// Popover states
	const [institutionOpen, setInstitutionOpen] = useState(false)
	const [sessionOpen, setSessionOpen] = useState(false)
	const [programOpen, setProgramOpen] = useState(false)
	const [courseOpen, setCourseOpen] = useState(false)

	return (
		<>
			{/* Filters Row 1 - Searchable Dropdowns */}
			<div className="flex flex-wrap gap-2 mb-2">
				{/* Institution Dropdown */}
				<Popover open={institutionOpen} onOpenChange={setInstitutionOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={institutionOpen}
							className="w-[180px] h-8 justify-between text-xs font-normal"
						>
							<span className="truncate">
								{selectedInstitution
									? institutions.find(inst => inst.id === selectedInstitution)?.name ||
									  institutions.find(inst => inst.id === selectedInstitution)?.institution_code
									: "Select Institution"}
							</span>
							<ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[250px] p-0">
						<Command>
							<CommandInput placeholder="Search institution..." className="h-9" />
							<CommandList>
								<CommandEmpty>No institution found.</CommandEmpty>
								<CommandGroup>
									{institutions.map(inst => (
										<CommandItem
											key={inst.id}
											value={`${inst.name} ${inst.institution_code}`}
											onSelect={() => {
												onInstitutionChange(inst.id)
												setInstitutionOpen(false)
											}}
										>
											<Check className={`mr-2 h-4 w-4 ${selectedInstitution === inst.id ? "opacity-100" : "opacity-0"}`} />
											{inst.name || inst.institution_code}
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>

				{/* Session Dropdown */}
				<Popover open={sessionOpen} onOpenChange={setSessionOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={sessionOpen}
							disabled={!selectedInstitution}
							className="w-[180px] h-8 justify-between text-xs font-normal"
						>
							<span className="truncate">
								{selectedSession
									? sessions.find(s => s.id === selectedSession)?.session_name
									: "All Sessions"}
							</span>
							<ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[280px] p-0">
						<Command>
							<CommandInput placeholder="Search session..." className="h-9" />
							<CommandList>
								<CommandEmpty>No session found.</CommandEmpty>
								<CommandGroup>
									<CommandItem
										value="all-sessions"
										onSelect={() => {
											onSessionChange("")
											setSessionOpen(false)
										}}
									>
										<Check className={`mr-2 h-4 w-4 ${!selectedSession ? "opacity-100" : "opacity-0"}`} />
										All Sessions
									</CommandItem>
									{sessions.map(session => (
										<CommandItem
											key={session.id}
											value={`${session.session_name} ${session.session_code}`}
											onSelect={() => {
												onSessionChange(session.id)
												setSessionOpen(false)
											}}
										>
											<Check className={`mr-2 h-4 w-4 ${selectedSession === session.id ? "opacity-100" : "opacity-0"}`} />
											{session.session_name}
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>

				{/* Program Dropdown */}
				<Popover open={programOpen} onOpenChange={setProgramOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={programOpen}
							disabled={!selectedInstitution}
							className="w-[180px] h-8 justify-between text-xs font-normal"
						>
							<span className="truncate">
								{selectedProgram
									? programs.find(p => p.id === selectedProgram)?.program_name
									: "All Programs"}
							</span>
							<ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[280px] p-0">
						<Command>
							<CommandInput placeholder="Search program..." className="h-9" />
							<CommandList>
								<CommandEmpty>No program found.</CommandEmpty>
								<CommandGroup>
									<CommandItem
										value="all-programs"
										onSelect={() => {
											onProgramChange("")
											setProgramOpen(false)
										}}
									>
										<Check className={`mr-2 h-4 w-4 ${!selectedProgram ? "opacity-100" : "opacity-0"}`} />
										All Programs
									</CommandItem>
									{programs.map(prog => (
										<CommandItem
											key={prog.id}
											value={`${prog.program_name} ${prog.program_code}`}
											onSelect={() => {
												onProgramChange(prog.id)
												setProgramOpen(false)
											}}
										>
											<Check className={`mr-2 h-4 w-4 ${selectedProgram === prog.id ? "opacity-100" : "opacity-0"}`} />
											{prog.program_name}
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>

				{/* Course Dropdown */}
				<Popover open={courseOpen} onOpenChange={setCourseOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={courseOpen}
							disabled={!selectedInstitution}
							className="w-[180px] h-8 justify-between text-xs font-normal"
						>
							<span className="truncate">
								{selectedCourse
									? `${courses.find(c => c.id === selectedCourse)?.course_code}`
									: "All Courses"}
							</span>
							<ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[350px] p-0">
						<Command>
							<CommandInput placeholder="Search course code or name..." className="h-9" />
							<CommandList>
								<CommandEmpty>No course found.</CommandEmpty>
								<CommandGroup>
									<CommandItem
										value="all-courses"
										onSelect={() => {
											onCourseChange("")
											setCourseOpen(false)
										}}
									>
										<Check className={`mr-2 h-4 w-4 ${!selectedCourse ? "opacity-100" : "opacity-0"}`} />
										All Courses
									</CommandItem>
									{courses.map(course => (
										<CommandItem
											key={course.id}
											value={`${course.course_code} ${course.course_name}`}
											onSelect={() => {
												onCourseChange(course.id)
												setCourseOpen(false)
											}}
										>
											<Check className={`mr-2 h-4 w-4 ${selectedCourse === course.id ? "opacity-100" : "opacity-0"}`} />
											<span className="truncate">{course.course_code} - {course.course_name}</span>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>

			{/* Filters Row 2 & Actions */}
			<div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
				<div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
					<Select value={statusFilter} onValueChange={onStatusChange}>
						<SelectTrigger className="w-[140px] h-8">
							<SelectValue placeholder="All Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="draft">Draft</SelectItem>
							<SelectItem value="submitted">Submitted</SelectItem>
							<SelectItem value="verified">Verified</SelectItem>
							<SelectItem value="locked">Locked</SelectItem>
						</SelectContent>
					</Select>

					<div className="relative w-full sm:w-[220px]">
						<Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={searchTerm}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder="Search..."
							className="pl-8 h-8 text-xs"
						/>
					</div>
				</div>

				<div className="flex gap-1 flex-wrap">
					<Button
						variant="outline"
						size="sm"
						className="text-xs px-2 h-8"
						onClick={onRefresh}
						disabled={loading || !selectedInstitution}
					>
						<RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
						Refresh
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="text-xs px-2 h-8"
						onClick={onDownloadTemplate}
					>
						<Download className="h-3 w-3 mr-1" />
						Template
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="text-xs px-2 h-8 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
						onClick={onExportData}
						disabled={!itemsCount}
					>
						<FileSpreadsheet className="h-3 w-3 mr-1" />
						Export
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="text-xs px-2 h-8"
						onClick={onImportFile}
						disabled={!selectedInstitution}
					>
						<Upload className="h-3 w-3 mr-1" />
						Import
					</Button>
					<Button
						variant="destructive"
						size="sm"
						className="text-xs px-2 h-8"
						onClick={onDeleteSelected}
						disabled={selectedCount === 0}
					>
						<Trash2 className="h-3 w-3 mr-1" />
						Delete ({selectedCount})
					</Button>
				</div>
			</div>
		</>
	)
}
