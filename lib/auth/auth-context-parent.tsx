'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { parentAuthService } from './parent-auth-service'
import { ParentAppUser } from './config'

interface AuthContextType {
	user: ParentAppUser | null
	loading: boolean
	isLoading: boolean // Alias for loading (backwards compatibility)
	error: string | null
	isAuthenticated: boolean
	login: (redirectUrl?: string) => void
	loginWithGoogle: (redirectUrl?: string) => void
	logout: (redirectToParent?: boolean) => Promise<void>
	refreshSession: () => Promise<boolean>
	refreshPermissions: () => Promise<void>
	getAccessToken: () => string | null
	hasPermission: (permission: string) => boolean
	hasRole: (role: string) => boolean
	hasAnyRole: (roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
	children: ReactNode
	autoValidate?: boolean
}

// Inner component that uses useSearchParams - must be wrapped in Suspense
interface AuthProviderInnerProps extends AuthProviderProps {
	setUser: (user: ParentAppUser | null) => void
	setLoading: (loading: boolean) => void
	setError: (error: string | null) => void
	user: ParentAppUser | null
}

function AuthProviderInner({
	children,
	autoValidate = false,
	setUser,
	setLoading,
	setError,
	user
}: AuthProviderInnerProps) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const pathname = usePathname()

	// Sync session with local database (updates last_login, sessions, user_sessions, and fetches permissions)
	// Returns the local avatar_url and permissions if available
	const syncSession = useCallback(async (userData: ParentAppUser, accessToken?: string, refreshToken?: string, expiresIn?: number): Promise<{ avatar_url: string | null; permissions: string[]; roles: string[] }> => {
		try {
			const response = await fetch('/api/auth/sync-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: userData.email,
					user_id: userData.id,
					full_name: userData.full_name,
					avatar_url: userData.avatar_url,
					role: userData.role,
					access_token: accessToken,
					refresh_token: refreshToken,
					expires_in: expiresIn || 3600, // Use actual expiry from parent app, default 1 hour
				}),
			})

			if (response.ok) {
				const data = await response.json()
				// Return local avatar_url and permissions from database
				return {
					avatar_url: data.avatar_url || null,
					permissions: data.permissions || [],
					roles: data.roles || []
				}
			}
			return { avatar_url: null, permissions: [], roles: [] }
		} catch (err) {
			// Non-critical - just log and continue
			console.warn('Failed to sync session with local DB:', err)
			return { avatar_url: null, permissions: [], roles: [] }
		}
	}, [])

	const handleOAuthCallback = useCallback(async () => {
		const token = searchParams.get('token')
		const refreshToken = searchParams.get('refresh_token')
		const userParam = searchParams.get('user')
		const expiresIn = searchParams.get('expires_in') // Get actual token expiry from parent app
		const redirectParam = searchParams.get('redirect') // Get redirect from URL

		if (token) {
			try {
				let userData: ParentAppUser | undefined
				if (userParam) {
					try {
						// Handle double-encoded URL (parent app might encode twice)
						let decodedUser = decodeURIComponent(userParam)
						// Check if still encoded (starts with %7B which is {)
						if (decodedUser.startsWith('%7B') || decodedUser.startsWith('%257B')) {
							decodedUser = decodeURIComponent(decodedUser)
						}
						userData = JSON.parse(decodedUser)
					} catch (parseError) {
						console.error('Failed to parse user data from URL:', parseError)
					}
				}

				// Parse expires_in (in seconds) - default to 1 hour if not provided
				const tokenExpirySeconds = expiresIn ? parseInt(expiresIn, 10) : 3600

				const authenticatedUser = await parentAuthService.handleCallback(
					token,
					refreshToken || undefined,
					userData,
					tokenExpirySeconds
				)

				if (authenticatedUser) {
					// Sync session with local database and fetch permissions
					const { permissions, roles, avatar_url } = await syncSession(
						authenticatedUser,
						token,
						refreshToken || undefined,
						tokenExpirySeconds
					)

					// Merge permissions from database into the user object
					const userWithPermissions: ParentAppUser = {
						...authenticatedUser,
						permissions: permissions.length > 0 ? permissions : authenticatedUser.permissions,
						roles: roles.length > 0 ? roles : authenticatedUser.roles,
						avatar_url: avatar_url || authenticatedUser.avatar_url
					}

					setUser(userWithPermissions)
					// Update stored user with permissions
					localStorage.setItem('user_data', JSON.stringify(userWithPermissions))
				}

				// Determine redirect destination
				const targetRedirect = redirectParam || parentAuthService.getPostLoginRedirect() || '/dashboard'

				// Clean URL and redirect immediately
				window.location.replace(targetRedirect)
			} catch (err) {
				console.error('OAuth callback error:', err)
				setError('Authentication failed')
			}
		}
	}, [searchParams, syncSession])

	const initializeAuth = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			// Check for OAuth callback params first
			const token = searchParams.get('token')
			if (token) {
				await handleOAuthCallback()
				setLoading(false)
				return
			}

			// Check for OAuth error
			const oauthError = searchParams.get('error')
			if (oauthError) {
				setError(searchParams.get('error_description') || oauthError)
				setLoading(false)
				return
			}

			// Check for existing session
			const storedUser = parentAuthService.getStoredUser()
			const accessToken = parentAuthService.getAccessToken()

			if (storedUser && accessToken) {
				if (autoValidate) {
					// Validate token with server
					const validation = await parentAuthService.validateToken(accessToken)
					if (validation.valid && validation.user) {
						setUser(validation.user)
						localStorage.setItem('user_data', JSON.stringify(validation.user))
					} else {
						// Try refresh
						const refreshed = await parentAuthService.refreshToken()
						if (refreshed) {
							const newUser = parentAuthService.getStoredUser()
							setUser(newUser)
						} else {
							parentAuthService.clearSession()
							setUser(null)
						}
					}
				} else {
					// Use cached user data
					setUser(storedUser)
				}
			} else {
				setUser(null)
			}
		} catch (err) {
			console.error('Auth initialization error:', err)
			setError('Failed to initialize authentication')
			setUser(null)
		} finally {
			setLoading(false)
		}
	}, [searchParams, handleOAuthCallback, autoValidate])

	useEffect(() => {
		initializeAuth()
	}, [initializeAuth])

	const login = useCallback((redirectUrl?: string) => {
		parentAuthService.login(redirectUrl || pathname)
	}, [pathname])

	const loginWithGoogle = useCallback((redirectUrl?: string) => {
		parentAuthService.loginWithGoogle(redirectUrl || pathname)
	}, [pathname])

	const logout = useCallback(async (redirectToParent: boolean = true) => {
		setUser(null)
		await parentAuthService.logout(redirectToParent)
	}, [])

	const refreshSession = useCallback(async (): Promise<boolean> => {
		const success = await parentAuthService.refreshToken()
		if (success) {
			const newUser = parentAuthService.getStoredUser()
			setUser(newUser)
		}
		return success
	}, [])

	// Refresh permissions from the database
	const refreshPermissions = useCallback(async (): Promise<void> => {
		if (!user) return

		try {
			const response = await fetch(`/api/auth/permissions/by-role?role=${encodeURIComponent(user.role)}&email=${encodeURIComponent(user.email)}`)
			if (response.ok) {
				const data = await response.json()
				const updatedUser: ParentAppUser = {
					...user,
					permissions: data.permissions || [],
					roles: data.roles?.length > 0 ? data.roles : user.roles
				}
				setUser(updatedUser)
				localStorage.setItem('user_data', JSON.stringify(updatedUser))
			}
		} catch (err) {
			console.warn('Failed to refresh permissions:', err)
		}
	}, [user])

	const getAccessToken = useCallback(() => {
		return parentAuthService.getAccessToken()
	}, [])

	// Permission and role checking functions
	const hasPermission = useCallback((permission: string): boolean => {
		if (!user) return false
		return user.permissions?.includes(permission) ?? false
	}, [user])

	const hasRole = useCallback((role: string): boolean => {
		if (!user) return false
		// Check both single role and roles array
		if (user.role === role) return true
		return user.roles?.includes(role) ?? false
	}, [user])

	const hasAnyRole = useCallback((roles: string[]): boolean => {
		if (!user) return false
		if (!roles || roles.length === 0) return true // No roles required = allow all
		// Check if user has any of the specified roles
		if (roles.includes(user.role)) return true
		return user.roles?.some(r => roles.includes(r)) ?? false
	}, [user])

	return (
		<AuthContext.Provider
			value={{
				user,
				loading: false, // Inner component means loading is done
				isLoading: false,
				error: null,
				isAuthenticated: !!user,
				login,
				loginWithGoogle,
				logout,
				refreshSession,
				refreshPermissions,
				getAccessToken,
				hasPermission,
				hasRole,
				hasAnyRole,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

// Main AuthProvider that wraps the inner component in Suspense
export function AuthProvider({ children, autoValidate = false }: AuthProviderProps) {
	const [user, setUser] = useState<ParentAppUser | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	return (
		<Suspense fallback={
			<AuthContext.Provider
				value={{
					user: null,
					loading: true,
					isLoading: true,
					error: null,
					isAuthenticated: false,
					login: () => {},
					loginWithGoogle: () => {},
					logout: async () => {},
					refreshSession: async () => false,
					refreshPermissions: async () => {},
					getAccessToken: () => null,
					hasPermission: () => false,
					hasRole: () => false,
					hasAnyRole: () => false,
				}}
			>
				{children}
			</AuthContext.Provider>
		}>
			<AuthProviderInner
				autoValidate={autoValidate}
				setUser={setUser}
				setLoading={setLoading}
				setError={setError}
				user={user}
			>
				{children}
			</AuthProviderInner>
		</Suspense>
	)
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}

export function useIsAuthenticated(): boolean {
	const { isAuthenticated } = useAuth()
	return isAuthenticated
}

export function useCurrentUser(): ParentAppUser | null {
	const { user } = useAuth()
	return user
}
