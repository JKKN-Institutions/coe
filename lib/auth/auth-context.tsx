'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import supabaseAuthService, {
  SupabaseUser,
  AuthSession,
  LoginCredentials,
  RegisterData
} from './supabase-auth-service';

interface AuthContextType {
  user: SupabaseUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  autoValidate?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  sessionTimeout?: number; // in minutes
  sessionWarning?: number; // in minutes
  onAuthChange?: (user: SupabaseUser | null) => void;
  onSessionExpired?: () => void;
}

export function AuthProvider({
  children,
  autoValidate = true,
  autoRefresh = true,
  refreshInterval = 10 * 60 * 1000, // 10 minutes
  sessionTimeout = 15, // 15 minutes
  sessionWarning = 2, // 2 minutes warning
  onAuthChange,
  onSessionExpired
}: AuthProviderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if user is authenticated with Supabase
        const isAuth = await supabaseAuthService.isAuthenticated();
        
        if (isAuth) {
          // Get current user from Supabase
          const currentUser = await supabaseAuthService.getCurrentUser();
          const storedSession = supabaseAuthService.getSession();
          
          if (currentUser) {
            setUser(currentUser);
            if (storedSession) {
          setSession(storedSession);
            }
          } else {
            // User not found, clear session
            setUser(null);
            setSession(null);
            supabaseAuthService.clearSession();
          }
        } else {
          // Not authenticated, clear any stored data
          setUser(null);
          setSession(null);
          supabaseAuthService.clearSession();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Failed to initialize authentication');
        setUser(null);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Auto-refresh token
  useEffect(() => {
    if (!autoRefresh || !user || !session) return;

    const refreshTimer = setInterval(async () => {
      try {
        const refreshed = await supabaseAuthService.refreshSession();
        if (refreshed) {
          const freshUser = supabaseAuthService.getUser();
          const freshSession = supabaseAuthService.getSession();
          setUser(freshUser);
          setSession(freshSession);
        } else {
          // Refresh failed, session expired
          setUser(null);
          setSession(null);
          if (onSessionExpired) {
            onSessionExpired();
          }
        }
      } catch (err) {
        console.error('Auto-refresh error:', err);
      }
    }, refreshInterval);

    return () => clearInterval(refreshTimer);
  }, [autoRefresh, user, session, refreshInterval, onSessionExpired]);

  // Notify auth changes
  useEffect(() => {
    if (onAuthChange) {
      onAuthChange(user);
    }
  }, [user, onAuthChange]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabaseAuthService.getSupabaseClient().auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          try {
            // Handle OAuth callback
            const { user: oauthUser, error: oauthError } = await supabaseAuthService.handleOAuthCallback();
            
            if (oauthError) {
              // Set error cookie instead of storing in state to avoid URL exposure
              const val = oauthError.toLowerCase().includes('inactive') ? 'inactive' : 'not_found';
              document.cookie = `auth_error=${val}; path=/; max-age=10; samesite=lax`;
              setError(oauthError);
              return;
            }

            if (oauthUser) {
              setUser(oauthUser);
              setSession({
                id: session.access_token,
                expires_at: session.expires_at?.toString() || '',
                created_at: new Date().toISOString(),
              });
            } else {
              // Fallback to regular user fetch
              const currentUser = await supabaseAuthService.getCurrentUser();
              if (currentUser) {
                setUser(currentUser);
                setSession({
                  id: session.access_token,
                  expires_at: session.expires_at?.toString() || '',
                  created_at: new Date().toISOString(),
                });
              } else {
                // User not found after OAuth callback
                document.cookie = 'auth_error=not_found; path=/; max-age=10; samesite=lax';
                setError('Your account wasn\'t found in our system. Double-check your login details, or contact support if you need help.');
            }
          }
        } catch (err) {
            // Authentication error occurred
            setError('Authentication failed - please try again');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          supabaseAuthService.clearSession();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      const { user: authUser, error: authError } = await supabaseAuthService.login(credentials);
      
      if (authError) {
        setError(authError);
        return { success: false, error: authError };
      }

      if (authUser) {
        setUser(authUser);
        const session = supabaseAuthService.getSession();
        if (session) {
          setSession(session);
        }
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      const { user: authUser, error: authError } = await supabaseAuthService.loginWithGoogle();

      if (authError) {
        setError(authError);
        return { success: false, error: authError };
      }

      // For Google OAuth, the user will be redirected, so we return success
      // The actual authentication will be handled in the callback
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Registration is disabled - users must be created by admin
  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    const errorMessage = 'User registration is not available. Please contact JKKN COE Admin for account access.';
    setError(errorMessage);
    return { success: false, error: errorMessage };
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await supabaseAuthService.logout();
      setUser(null);
      setSession(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Clear local state even if logout fails
    setUser(null);
    setSession(null);
    setError(null);
      supabaseAuthService.clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const success = await supabaseAuthService.refreshSession();
      if (success) {
        const freshUser = supabaseAuthService.getUser();
        const freshSession = supabaseAuthService.getSession();
        setUser(freshUser);
        setSession(freshSession);
      } else {
        setUser(null);
        setSession(null);
      }
      return success;
    } catch (err) {
      console.error('Refresh session error:', err);
      setUser(null);
      setSession(null);
      return false;
    }
  };

  const validateSession = async (): Promise<boolean> => {
    try {
      const isValid = await supabaseAuthService.isAuthenticated();
      if (isValid) {
        const currentUser = await supabaseAuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          const session = supabaseAuthService.getSession();
          if (session) {
            setSession(session);
          }
        } else {
          setUser(null);
          setSession(null);
        }
      } else {
        setUser(null);
        setSession(null);
      }
      return isValid;
    } catch (err) {
      console.error('Validate session error:', err);
      setUser(null);
      setSession(null);
      return false;
    }
  };

  const hasPermission = (permission: string): boolean => {
    return supabaseAuthService.hasPermission(permission);
  };

  const hasRole = (role: string): boolean => {
    return supabaseAuthService.hasRole(role);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return supabaseAuthService.hasAnyRole(roles);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        loginWithGoogle,
        logout,
        refreshSession,
        validateSession,
        hasPermission,
        hasRole,
        hasAnyRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Additional hooks for convenience
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export function useCurrentUser(): SupabaseUser | null {
  const { user } = useAuth();
  return user;
}

export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

export function useRole(role: string): boolean {
  const { hasRole } = useAuth();
  return hasRole(role);
}

export function useAnyRole(roles: string[]): boolean {
  const { hasAnyRole } = useAuth();
  return hasAnyRole(roles);
}

export function useAuthLoading(): boolean {
  const { isLoading } = useAuth();
  return isLoading;
}

export function useAuthError(): string | null {
  const { error } = useAuth();
  return error;
}

export function useSession() {
  const { session, validateSession, refreshSession } = useAuth();
  return { session, validateSession, refreshSession };
}
