'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/common/use-toast'
import {
	CheckCircle2,
	XCircle,
	Loader2,
	Mail,
	User,
	Phone,
	Building2,
	MapPin,
	GraduationCap,
	BookOpen,
	Send,
	AlertCircle,
} from 'lucide-react'

interface Board {
	id: string
	board_code: string
	board_name: string
	board_type?: string
	display_name?: string
}

interface EmailValidation {
	valid: boolean
	exists?: boolean
	status?: string
	error?: string
	suggestion?: string
	message?: string
}

export default function ExaminerRegistrationPage() {
	const { toast } = useToast()

	// Form state
	const [formData, setFormData] = useState({
		full_name: '',
		email: '',
		mobile: '',
		designation: '',
		department: '',
		institution_name: '',
		institution_address: '',
		ug_experience_years: '',
		pg_experience_years: '',
		ug_board_code: 'None',
		pg_board_code: 'None',
		willing_for_valuation: true,
		willing_for_practical: false,
		willing_for_scrutiny: false,
	})

	// UI state
	const [boards, setBoards] = useState<Board[]>([])
	const [loading, setLoading] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [submitted, setSubmitted] = useState(false)
	const [emailValidation, setEmailValidation] = useState<EmailValidation | null>(null)
	const [validatingEmail, setValidatingEmail] = useState(false)
	const [errors, setErrors] = useState<Record<string, string>>({})

	// Fetch boards on mount
	useEffect(() => {
		fetchBoards()
	}, [])

	const fetchBoards = async () => {
		try {
			setLoading(true)
			const res = await fetch('/api/public/boards')
			if (res.ok) {
				const data = await res.json()
				setBoards(data)
			}
		} catch (error) {
			console.error('Error fetching boards:', error)
		} finally {
			setLoading(false)
		}
	}

	// Email validation with debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			if (formData.email && formData.email.includes('@')) {
				validateEmail(formData.email)
			} else {
				setEmailValidation(null)
			}
		}, 500)

		return () => clearTimeout(timer)
	}, [formData.email])

	const validateEmail = async (email: string) => {
		try {
			setValidatingEmail(true)
			const res = await fetch('/api/public/email/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			})
			const data = await res.json()
			setEmailValidation(data)
		} catch (error) {
			console.error('Email validation error:', error)
		} finally {
			setValidatingEmail(false)
		}
	}

	const validate = () => {
		const e: Record<string, string> = {}

		if (!formData.full_name.trim()) e.full_name = 'Name is required'
		if (!formData.email.trim()) e.email = 'Email is required'
		if (formData.email && !emailValidation?.valid) e.email = emailValidation?.error || 'Invalid email'
		if (!formData.mobile.trim()) e.mobile = 'Mobile number is required'
		if (formData.mobile && !/^[0-9]{10}$/.test(formData.mobile.replace(/\s/g, ''))) {
			e.mobile = 'Please enter a valid 10-digit mobile number'
		}
		if (!formData.designation.trim()) e.designation = 'Designation is required'
		if (!formData.institution_name.trim()) e.institution_name = 'Institution name is required'
		if (!formData.institution_address.trim()) e.institution_address = 'Institution address is required'

		if (formData.ug_board_code === 'None' && formData.pg_board_code === 'None') {
			e.ug_board_code = 'Please select at least one board (UG or PG)'
		}

		setErrors(e)
		return Object.keys(e).length === 0
	}

	const handleSubmit = async () => {
		if (!validate()) {
			toast({
				title: '⚠️ Validation Error',
				description: 'Please fix all errors before submitting.',
				variant: 'destructive',
			})
			return
		}

		try {
			setSubmitting(true)
			const res = await fetch('/api/public/examiner/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
			})

			const data = await res.json()

			if (!res.ok) {
				throw new Error(data.error || 'Registration failed')
			}

			setSubmitted(true)
			toast({
				title: '✅ Registration Successful',
				description: data.message,
				className: 'bg-green-50 border-green-200 text-green-800',
			})
		} catch (error) {
			toast({
				title: '❌ Registration Failed',
				description: error instanceof Error ? error.message : 'Please try again later.',
				variant: 'destructive',
			})
		} finally {
			setSubmitting(false)
		}
	}

	// Filter boards by type
	const ugBoards = boards.filter(b => b.board_type === 'UG' || b.board_code === 'None')
	const pgBoards = boards.filter(b => b.board_type === 'PG' || b.board_code === 'None')

	if (submitted) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
				<Card className="w-full max-w-lg text-center">
					<CardContent className="pt-12 pb-8">
						<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
							<CheckCircle2 className="w-10 h-10 text-green-600" />
						</div>
						<h2 className="text-2xl font-bold text-gray-900 mb-3">Registration Successful!</h2>
						<p className="text-gray-600 mb-6">
							Your registration has been submitted successfully. You will be notified via email once your registration is approved.
						</p>
						<Button onClick={() => window.location.reload()} variant="outline">
							Submit Another Registration
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
			{/* Header */}
			<div className="bg-white border-b shadow-sm">
				<div className="max-w-4xl mx-auto px-4 py-6">
					<div className="flex items-center gap-4">
						<div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center">
							<GraduationCap className="w-8 h-8 text-emerald-600" />
						</div>
						<div>
							<h1 className="text-xl font-bold text-gray-900">
								J.K.K. NATARAJA COLLEGE OF ARTS & SCIENCE
							</h1>
							<p className="text-sm text-gray-600">(AUTONOMOUS) KOMARAPALAYAM</p>
						</div>
					</div>
				</div>
			</div>

			{/* Form */}
			<div className="max-w-4xl mx-auto px-4 py-8">
				<Card className="shadow-lg border-0">
					<CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-xl">
						<CardTitle className="text-xl flex items-center gap-2">
							<BookOpen className="w-5 h-5" />
							Panel of Examiners Registration
						</CardTitle>
						<CardDescription className="text-emerald-100">
							For Practical Examinations, Theory Examinations and Valuation
						</CardDescription>
					</CardHeader>
					<CardContent className="p-6 space-y-6">
						{/* Personal Information */}
						<div className="space-y-4">
							<div className="flex items-center gap-2 text-emerald-700 font-semibold border-b pb-2">
								<User className="w-4 h-4" />
								Personal Information
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Full Name */}
								<div className="space-y-2">
									<Label htmlFor="full_name">
										Name of the Examiner <span className="text-red-500">*</span>
									</Label>
									<Input
										id="full_name"
										value={formData.full_name}
										onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
										placeholder="Enter your full name"
										className={errors.full_name ? 'border-red-500' : ''}
									/>
									{errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
								</div>

								{/* Designation */}
								<div className="space-y-2">
									<Label htmlFor="designation">
										Designation <span className="text-red-500">*</span>
									</Label>
									<Input
										id="designation"
										value={formData.designation}
										onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
										placeholder="e.g., Assistant Professor"
										className={errors.designation ? 'border-red-500' : ''}
									/>
									{errors.designation && <p className="text-sm text-red-500">{errors.designation}</p>}
								</div>
							</div>

							{/* Email with Validation */}
							<div className="space-y-2">
								<Label htmlFor="email">
									E-mail ID <span className="text-red-500">*</span>
								</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
									<Input
										id="email"
										type="email"
										value={formData.email}
										onChange={(e) => setFormData({ ...formData, email: e.target.value })}
										placeholder="your.email@example.com"
										className={`pl-10 pr-10 ${errors.email ? 'border-red-500' : emailValidation?.valid ? 'border-green-500' : ''}`}
									/>
									<div className="absolute right-3 top-1/2 -translate-y-1/2">
										{validatingEmail && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
										{!validatingEmail && emailValidation?.valid && !emailValidation.exists && (
											<CheckCircle2 className="w-4 h-4 text-green-500" />
										)}
										{!validatingEmail && emailValidation && !emailValidation.valid && (
											<XCircle className="w-4 h-4 text-red-500" />
										)}
									</div>
								</div>
								{emailValidation?.suggestion && (
									<p className="text-sm text-amber-600 flex items-center gap-1">
										<AlertCircle className="w-3 h-3" />
										{emailValidation.error}
									</p>
								)}
								{emailValidation?.exists && (
									<p className="text-sm text-amber-600">{emailValidation.message}</p>
								)}
								{errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
							</div>

							{/* Mobile */}
							<div className="space-y-2">
								<Label htmlFor="mobile">
									Contact Number <span className="text-red-500">*</span>
								</Label>
								<div className="relative">
									<Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
									<Input
										id="mobile"
										value={formData.mobile}
										onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
										placeholder="10-digit mobile number"
										className={`pl-10 ${errors.mobile ? 'border-red-500' : ''}`}
									/>
								</div>
								{errors.mobile && <p className="text-sm text-red-500">{errors.mobile}</p>}
							</div>
						</div>

						{/* Institution Information */}
						<div className="space-y-4">
							<div className="flex items-center gap-2 text-emerald-700 font-semibold border-b pb-2">
								<Building2 className="w-4 h-4" />
								Institution Information
							</div>

							<div className="space-y-2">
								<Label htmlFor="institution_name">
									Name of the Institution <span className="text-red-500">*</span>
								</Label>
								<Input
									id="institution_name"
									value={formData.institution_name}
									onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
									placeholder="Enter your institution name"
									className={errors.institution_name ? 'border-red-500' : ''}
								/>
								{errors.institution_name && <p className="text-sm text-red-500">{errors.institution_name}</p>}
							</div>

							<div className="space-y-2">
								<Label htmlFor="institution_address">
									Address of the Institution <span className="text-red-500">*</span>
								</Label>
								<Textarea
									id="institution_address"
									value={formData.institution_address}
									onChange={(e) => setFormData({ ...formData, institution_address: e.target.value })}
									placeholder="Enter complete address with city, state, and pincode"
									rows={3}
									className={errors.institution_address ? 'border-red-500' : ''}
								/>
								{errors.institution_address && <p className="text-sm text-red-500">{errors.institution_address}</p>}
							</div>

							<div className="space-y-2">
								<Label htmlFor="department">Department / Subject</Label>
								<Input
									id="department"
									value={formData.department}
									onChange={(e) => setFormData({ ...formData, department: e.target.value })}
									placeholder="e.g., Department of Computer Science"
								/>
							</div>
						</div>

						{/* Board Selection */}
						<div className="space-y-4">
							<div className="flex items-center gap-2 text-emerald-700 font-semibold border-b pb-2">
								<GraduationCap className="w-4 h-4" />
								Board Selection
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* UG Board */}
								<div className="space-y-2">
									<Label htmlFor="ug_board">
										Name the UG Board <span className="text-red-500">*</span>
									</Label>
									<Select
										value={formData.ug_board_code}
										onValueChange={(v) => setFormData({ ...formData, ug_board_code: v })}
									>
										<SelectTrigger className={errors.ug_board_code ? 'border-red-500' : ''}>
											<SelectValue placeholder="Select UG Board" />
										</SelectTrigger>
										<SelectContent>
											{ugBoards.map((board) => (
												<SelectItem key={board.id} value={board.board_code}>
													{board.display_name || board.board_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.ug_board_code && <p className="text-sm text-red-500">{errors.ug_board_code}</p>}
								</div>

								{/* PG Board */}
								<div className="space-y-2">
									<Label htmlFor="pg_board">Name the PG Board</Label>
									<Select
										value={formData.pg_board_code}
										onValueChange={(v) => setFormData({ ...formData, pg_board_code: v })}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select PG Board" />
										</SelectTrigger>
										<SelectContent>
											{pgBoards.map((board) => (
												<SelectItem key={board.id} value={board.board_code}>
													{board.display_name || board.board_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{/* Experience */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="ug_experience">Years of Experience in UG</Label>
									<Input
										id="ug_experience"
										type="number"
										min="0"
										value={formData.ug_experience_years}
										onChange={(e) => setFormData({ ...formData, ug_experience_years: e.target.value })}
										placeholder="e.g., 5"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="pg_experience">Years of Experience in PG</Label>
									<Input
										id="pg_experience"
										type="number"
										min="0"
										value={formData.pg_experience_years}
										onChange={(e) => setFormData({ ...formData, pg_experience_years: e.target.value })}
										placeholder="e.g., 3"
									/>
								</div>
							</div>
						</div>

						{/* Willingness */}
						<div className="space-y-4">
							<div className="flex items-center gap-2 text-emerald-700 font-semibold border-b pb-2">
								<CheckCircle2 className="w-4 h-4" />
								Willingness
							</div>

							<div className="space-y-3">
								<div className="flex items-center space-x-2">
									<Checkbox
										id="valuation"
										checked={formData.willing_for_valuation}
										onCheckedChange={(c) => setFormData({ ...formData, willing_for_valuation: c as boolean })}
									/>
									<Label htmlFor="valuation" className="font-normal cursor-pointer">
										Willing for Theory Valuation
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="practical"
										checked={formData.willing_for_practical}
										onCheckedChange={(c) => setFormData({ ...formData, willing_for_practical: c as boolean })}
									/>
									<Label htmlFor="practical" className="font-normal cursor-pointer">
										Willing for Practical Examination
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="scrutiny"
										checked={formData.willing_for_scrutiny}
										onCheckedChange={(c) => setFormData({ ...formData, willing_for_scrutiny: c as boolean })}
									/>
									<Label htmlFor="scrutiny" className="font-normal cursor-pointer">
										Willing for Scrutiny Work
									</Label>
								</div>
							</div>
						</div>

						{/* Submit Button */}
						<div className="pt-4">
							<Button
								onClick={handleSubmit}
								disabled={submitting || (emailValidation?.exists && emailValidation?.status === 'ACTIVE')}
								className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg"
							>
								{submitting ? (
									<>
										<Loader2 className="w-5 h-5 mr-2 animate-spin" />
										Submitting...
									</>
								) : (
									<>
										<Send className="w-5 h-5 mr-2" />
										Submit Registration
									</>
								)}
							</Button>
						</div>

						<p className="text-center text-sm text-gray-500">
							By submitting this form, you agree to be contacted for examination-related work.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
