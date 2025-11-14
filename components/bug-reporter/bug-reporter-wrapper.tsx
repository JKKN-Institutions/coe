'use client'

import { BugReporterProvider } from '@boobalan_jkkn/bug-reporter-sdk'
import { useAuth } from '@/context/auth-context'
import { ReactNode, useEffect, useMemo } from 'react'

export function BugReporterWrapper({
	children
}: {
	children: ReactNode
}) {
	const { user, isAuthenticated, hasRole } = useAuth()

	// Determine if bug reporter should be enabled
	const isBugReporterEnabled = useMemo(() => {
		// Always enable in development mode
		if (process.env.NODE_ENV === 'development') {
			return true
		}

		// In production, only enable for authenticated users
		if (!isAuthenticated || !user) {
			return false
		}

		// Enable for specific roles
		// You can customize this list based on your needs
		const allowedRoles = ['admin', 'super_admin', 'beta-tester', 'developer']
		const hasAllowedRole = allowedRoles.some((role) => hasRole(role))

		// Enable if user has an allowed role OR if explicitly enabled via env variable
		return hasAllowedRole || process.env.NEXT_PUBLIC_BUG_REPORTER_FORCE_ENABLE === 'true'
	}, [isAuthenticated, user, hasRole])

	useEffect(() => {
		// Add custom CSS to reposition the bug report button to bottom-left
		const style = document.createElement('style')
		style.innerHTML = `
			/* Reposition bug report button to bottom-left corner */
			[data-bug-reporter-button],
			.bug-reporter-button,
			.bug-reporter-floating-btn,
			.bug-reporter-widget,
			button[aria-label*="bug"],
			button[aria-label*="report"],
			div[class*="bug-reporter"] button:last-child {
				bottom: 1.5rem !important;
				left: 1.5rem !important;
				right: auto !important;
				z-index: 9999 !important;
			}
		`
		document.head.appendChild(style)

		return () => {
			document.head.removeChild(style)
		}
	}, [])

	return (
		<BugReporterProvider
			apiKey={process.env.NEXT_PUBLIC_BUG_REPORTER_API_KEY!}
			apiUrl={process.env.NEXT_PUBLIC_BUG_REPORTER_API_URL!}
			enabled={isBugReporterEnabled}
			debug={process.env.NODE_ENV === 'development'}
			userContext={
				isAuthenticated && user
					? {
							userId: user.id,
							name: user.user_metadata?.full_name || user.email?.split('@')[0],
							email: user.email || undefined
						}
					: undefined
			}
		>
			{children}
		</BugReporterProvider>
	)
}
