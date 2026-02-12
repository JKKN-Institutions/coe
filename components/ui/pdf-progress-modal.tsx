"use client"

import { useEffect, useState } from 'react'
import { Loader2, FileText, CheckCircle2, Clock, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PDFProgressModalProps {
	isOpen: boolean
	currentStep: number
	totalSteps: number
	currentOperation?: string
	operationType?: 'single' | 'batch'
	currentStudentInfo?: string // e.g., "John Doe (24JUGENG004)"
}

export function PDFProgressModal({
	isOpen,
	currentStep,
	totalSteps,
	currentOperation = 'Generating PDF...',
	operationType = 'single',
	currentStudentInfo
}: PDFProgressModalProps) {
	const [displayPercentage, setDisplayPercentage] = useState(0)
	const [elapsedTime, setElapsedTime] = useState(0)
	const [startTime, setStartTime] = useState<number | null>(null)

	// Calculate percentage
	const percentage = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0

	// Start timer when modal opens
	useEffect(() => {
		if (isOpen && !startTime) {
			setStartTime(Date.now())
		}
		if (!isOpen) {
			setStartTime(null)
			setElapsedTime(0)
		}
	}, [isOpen])

	// Update elapsed time every second
	useEffect(() => {
		if (!isOpen || !startTime) return

		const interval = setInterval(() => {
			setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
		}, 1000)

		return () => clearInterval(interval)
	}, [isOpen, startTime])

	// Smooth percentage animation
	useEffect(() => {
		if (percentage > displayPercentage) {
			const timer = setTimeout(() => {
				setDisplayPercentage(prev => Math.min(prev + 1, percentage))
			}, 10)
			return () => clearTimeout(timer)
		}
	}, [percentage, displayPercentage])

	// Reset display percentage when modal closes
	useEffect(() => {
		if (!isOpen) {
			setDisplayPercentage(0)
		}
	}, [isOpen])

	if (!isOpen) return null

	const isComplete = currentStep >= totalSteps && totalSteps > 0

	// Format elapsed time as MM:SS
	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-200">
			{/* Enhanced Backdrop with Blur */}
			<div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md" />

			{/* Modal Content */}
			<div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 max-w-lg w-full mx-4 border-2 border-gray-200/50 dark:border-gray-800/50 animate-in zoom-in-95 duration-300">
				{/* Animated Gradient Border */}
				<div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-3xl animate-pulse" />

				{/* Icon and Title */}
				<div className="flex flex-col items-center mb-6">
					{isComplete ? (
						<div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-4 shadow-lg animate-in zoom-in duration-500">
							<CheckCircle2 className="w-10 h-10 text-white animate-in zoom-in duration-700" />
						</div>
					) : (
						<div className="relative w-20 h-20 mb-4">
							{/* Rotating background */}
							<div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-spin opacity-75" style={{ animationDuration: '3s' }} />
							<div className="absolute inset-1 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
								<Download className="w-8 h-8 text-purple-600 animate-bounce" />
							</div>
						</div>
					)}

					<h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
						{isComplete ? '🎉 Complete!' : '📄 Generating PDF'}
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
						{isComplete ? 'Your PDF has been generated successfully!' : 'Please wait while we prepare your document'}
					</p>
				</div>

				{/* Circular Progress */}
				<div className="flex flex-col items-center mb-6">
					<div className="relative w-40 h-40">
						{/* Background Circle */}
						<svg className="w-40 h-40 transform -rotate-90">
							<circle
								cx="80"
								cy="80"
								r="70"
								stroke="currentColor"
								strokeWidth="10"
								fill="none"
								className="text-gray-200 dark:text-gray-800"
							/>
							{/* Progress Circle with Animation */}
							<circle
								cx="80"
								cy="80"
								r="70"
								stroke="url(#gradient)"
								strokeWidth="10"
								fill="none"
								strokeLinecap="round"
								strokeDasharray={`${2 * Math.PI * 70}`}
								strokeDashoffset={`${2 * Math.PI * 70 * (1 - displayPercentage / 100)}`}
								className="transition-all duration-500 ease-out"
								style={{ filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))' }}
							/>
							<defs>
								<linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
									<stop offset="0%" stopColor="#3b82f6" />
									<stop offset="50%" stopColor="#8b5cf6" />
									<stop offset="100%" stopColor="#ec4899" />
								</linearGradient>
							</defs>
						</svg>

						{/* Percentage Text */}
						<div className="absolute inset-0 flex flex-col items-center justify-center">
							<span className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-in zoom-in duration-300">
								{displayPercentage}%
							</span>
							{operationType === 'batch' && totalSteps > 0 && (
								<span className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">
									{currentStep} of {totalSteps}
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Progress Bar */}
				<div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 mb-5 overflow-hidden shadow-inner">
					<div
						className="h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
						style={{ width: `${displayPercentage}%` }}
					>
						{/* Shimmer effect using animate-pulse as fallback */}
						<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
					</div>
				</div>

				{/* Current Operation with Student Info */}
				<div className="space-y-3">
					{/* Student Info (for batch) */}
					{currentStudentInfo && operationType === 'batch' && (
						<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
							<div className="flex items-center gap-2">
								<FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
								<p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
									{currentStudentInfo}
								</p>
							</div>
						</div>
					)}

					{/* Current Operation */}
					<div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
						<div className="flex items-center gap-3">
							{!isComplete && <Loader2 className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400 flex-shrink-0" />}
							<p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
								{currentOperation}
							</p>
							{/* Elapsed Time */}
							{!isComplete && elapsedTime > 0 && (
								<div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
									<Clock className="w-3 h-3" />
									<span>{formatTime(elapsedTime)}</span>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Warning Message */}
				{!isComplete && (
					<div className="mt-6 text-center bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
						<p className="text-xs font-medium text-amber-800 dark:text-amber-200">
							⚠️ Please do not close this window or navigate away
						</p>
					</div>
				)}

				{/* Success Message */}
				{isComplete && (
					<div className="mt-6 text-center bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800 animate-in slide-in-from-bottom duration-500">
						<p className="text-sm font-medium text-green-800 dark:text-green-200">
							✓ Your download will begin automatically
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
