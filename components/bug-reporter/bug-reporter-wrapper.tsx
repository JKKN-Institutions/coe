'use client'

import { BugReporterProvider } from '@boobalan_jkkn/bug-reporter-sdk'
import { useAuth } from '@/context/auth-context'
import { ReactNode } from 'react'

export function BugReporterWrapper({
	children
}: {
	children: ReactNode
}) {
	const { user, isAuthenticated } = useAuth()

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
