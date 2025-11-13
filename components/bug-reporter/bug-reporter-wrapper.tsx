'use client'

import { BugReporterProvider } from '@boobalan_jkkn/bug-reporter-sdk'
import { useAuth } from '@/context/auth-context'
import { ReactNode, useEffect } from 'react'

export function BugReporterWrapper({
	children
}: {
	children: ReactNode
}) {
	const { user, isAuthenticated } = useAuth()

	useEffect(() => {
		// Add custom CSS to reposition the bug report button to bottom-left
		const style = document.createElement('style')
		style.innerHTML = `
			/* Reposition bug report button to bottom-left corner */
			[data-bug-reporter-button],
			.bug-reporter-button,
			button[aria-label*="bug"],
			button[aria-label*="report"],
			div[class*="bug-reporter"] button:last-child {
				bottom: 24px !important;
				left: 24px !important;
				right: auto !important;
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
			enabled={true}
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
