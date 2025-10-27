"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"

export interface SearchableSelectOption {
	value: string
	label: string
}

interface SearchableSelectProps {
	value: string
	onValueChange: (value: string) => void
	options: SearchableSelectOption[]
	placeholder?: string
	emptyText?: string
	searchPlaceholder?: string
	className?: string
	loading?: boolean
	onSearchChange?: (search: string) => void
	disabled?: boolean
}

export function SearchableSelect({
	value,
	onValueChange,
	options,
	placeholder = "Select option...",
	emptyText = "No results found.",
	searchPlaceholder = "Search...",
	className,
	loading = false,
	onSearchChange,
	disabled = false,
}: SearchableSelectProps) {
	const [open, setOpen] = React.useState(false)
	const [searchValue, setSearchValue] = React.useState("")

	// Find the selected option label
	const selectedOption = options.find((option) => option.value === value)

	// Handle search change with debouncing
	React.useEffect(() => {
		// Only trigger search if there's actual search text or component is open
		if (onSearchChange && searchValue.trim() && open) {
			const timer = setTimeout(() => {
				onSearchChange(searchValue)
			}, 300)

			return () => clearTimeout(timer)
		}
	}, [searchValue, onSearchChange, open])

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn("w-full justify-between", className)}
					disabled={disabled || loading}
				>
					<span className="truncate">
						{loading ? (
							<span className="flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								Loading...
							</span>
						) : selectedOption ? (
							selectedOption.label
						) : (
							placeholder
						)}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
				<Command shouldFilter={!onSearchChange}>
					<CommandInput
						placeholder={searchPlaceholder}
						value={searchValue}
						onValueChange={setSearchValue}
					/>
					<CommandList>
						{loading ? (
							<div className="flex items-center justify-center p-4">
								<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
							</div>
						) : (
							<>
								<CommandEmpty>{emptyText}</CommandEmpty>
								<CommandGroup>
									{options.map((option) => (
										<CommandItem
											key={option.value}
											value={option.value}
											onSelect={(currentValue) => {
												onValueChange(currentValue === value ? "" : currentValue)
												setOpen(false)
												setSearchValue("")
											}}
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													value === option.value ? "opacity-100" : "opacity-0"
												)}
											/>
											{option.label}
										</CommandItem>
									))}
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
