import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Cookies from 'js-cookie';

export interface SupabaseUser {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: string;
  institution_id?: string;
  is_super_admin?: boolean;
  is_active: boolean;
  permissions: Record<string, boolean>;
  profile_completed?: boolean;
  avatar_url?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  id: string;
  expires_at: string;
  created_at: string;
  last_used_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  role?: string;
  institution_id?: string;
}

class SupabaseAuthService {
  private supabase: SupabaseClient;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  /**
   * Login with Google OAuth
   */
  async loginWithGoogle(): Promise<{ user: SupabaseUser | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      // The user will be redirected to Google, so we return null for now
      // The actual user data will be handled in the callback
      return { user: null, error: null };
    } catch (error) {
      console.error('Google login error:', error);
      return { user: null, error: 'Google login failed' };
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<{ user: SupabaseUser | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Get user profile from users table by email
        const { data: profile, error: profileError } = await this.supabase
          .from('users')
          .select('*')
          .eq('email', data.user.email)
          .single();

        if (profileError) {
          // Only log error if it's not a 'not found' error
          if (profileError.code !== 'PGRST116') {
            console.error('Error fetching user profile:', profileError);
          }
          return { user: null, error: 'Failed to fetch user profile' };
        }

        // Check if user account is active
        
        // Check if is_active field exists and is true
        if (profile.is_active === false || profile.is_active === null || profile.is_active === undefined) {
          console.log('Login attempt by inactive user:', profile.email, 'is_active:', profile.is_active);
          // Clear the session since user is inactive
          await this.supabase.auth.signOut();
          return { user: null, error: 'Your account is inactive. Please contact JKKN COE Admin for assistance.' };
        }
        
        // Additional check: if is_active field doesn't exist, treat as inactive
        if (!('is_active' in profile)) {
          console.log('Login attempt by user without is_active field:', profile.email);
          // Clear the session since user is inactive
          await this.supabase.auth.signOut();
          return { user: null, error: 'Your account is inactive. Please contact JKKN COE Admin for assistance.' };
        }

        const user: SupabaseUser = {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          role: profile.role,
          institution_id: profile.institution_id,
          is_super_admin: profile.is_super_admin,
          is_active: profile.is_active,
          permissions: profile.permissions || {},
          profile_completed: profile.profile_completed,
          avatar_url: profile.avatar_url,
          last_login: profile.last_login,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };

        // Update last login
        await this.updateLastLogin(data.user.id);

        // Store user data
        this.setUser(user);
        this.setSession({
          id: data.session?.access_token || '',
          expires_at: data.session?.expires_at || '',
          created_at: new Date().toISOString(),
        });

        return { user, error: null };
      }

      return { user: null, error: 'No user data returned' };
    } catch (error) {
      console.error('Login error:', error);
      return { user: null, error: 'Login failed' };
    }
  }

  /**
   * Register new user - DISABLED
   * User registration is not allowed. Users must be created by administrators.
   */
  async register(userData: RegisterData): Promise<{ user: SupabaseUser | null; error: string | null }> {
    return { 
      user: null, 
      error: 'User registration is not available. Please contact JKKN COE Admin for account access.' 
    };
  }

  /**
   * Logout user
   * Optimized for faster logout experience
   */
  async logout(): Promise<void> {
    try {
      // Clear session immediately for better UX
      this.clearSession();
      
      // Try to sign out from Supabase with timeout
      const signOutPromise = this.supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 3000)
      );
      
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (error) {
      console.error('Logout error:', error);
      // Session already cleared, so we're good
    }
  }

  /**
   * Handle OAuth callback and create/update user profile
   */
  async handleOAuthCallback(): Promise<{ user: SupabaseUser | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.session?.user) {
        const authUser = data.session.user;

        // First, check if user exists in users table by email
        const { data: existingProfile, error: profileError } = await this.supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single();

        if (profileError || !existingProfile) {
          // User not found in database - deny access
          await this.supabase.auth.signOut();
          return {
            user: null,
            error: 'Your account wasn\'t found in our system. Double-check your login details, or contact support if you need help.'
          };
        }

        // Check if user has a valid role
        if (!existingProfile.role) {
          await this.supabase.auth.signOut();
          return {
            user: null,
            error: 'Your account wasn\'t found in our system. Double-check your login details, or contact support if you need help.'
          };
        }

        // Check if user is active
        if (!existingProfile.is_active) {
          await this.supabase.auth.signOut();
          return {
            user: null,
            error: 'Your account wasn\'t found in our system. Double-check your login details, or contact support if you need help.'
          };
        }

        // User is valid - use the existing profile
        let userProfile = existingProfile;

        // Get Google profile photo URL from user metadata
        const googleAvatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
        
        console.log('OAuth Callback Debug:', {
          googleAvatarUrl: googleAvatarUrl,
          currentAvatarUrl: userProfile.avatar_url,
          userMetadata: authUser.user_metadata
        });
        
        // Check if we need to update avatar_url
        const shouldUpdateAvatar = !userProfile.avatar_url || 
          (googleAvatarUrl && googleAvatarUrl !== userProfile.avatar_url);

        // Prepare update data
        const updateData: any = {
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Add avatar URL if it should be updated
        if (shouldUpdateAvatar && googleAvatarUrl) {
          updateData.avatar_url = googleAvatarUrl;
          console.log('Updating avatar URL from Google profile:', googleAvatarUrl);
        }

        // Update user profile in the background (non-blocking)
        this.supabase
          .from('users')
          .update(updateData)
          .eq('email', authUser.email)
          .then(({ error }) => {
            if (error) {
              console.warn('Failed to update user profile (non-critical):', error);
            } else {
              console.log('User profile updated successfully');
            }
          })
          .catch(err => {
            console.warn('Background update failed (non-critical):', err);
          });

        // Update userProfile with Google avatar URL for immediate UI update
        if (shouldUpdateAvatar && googleAvatarUrl) {
          userProfile.avatar_url = googleAvatarUrl;
        }

        const user: SupabaseUser = {
          id: userProfile.id,
          email: userProfile.email,
          full_name: userProfile.full_name,
          phone_number: userProfile.phone_number,
          role: userProfile.role,
          institution_id: userProfile.institution_id,
          is_super_admin: userProfile.is_super_admin,
          is_active: userProfile.is_active,
          permissions: userProfile.permissions || {},
          profile_completed: userProfile.profile_completed,
          // Use updated avatar_url (now includes Google avatar if needed)
          avatar_url: userProfile.avatar_url,
          last_login: userProfile.last_login,
          created_at: userProfile.created_at,
          updated_at: userProfile.updated_at,
        };

        console.log('Final User Object:', {
          avatar_url: user.avatar_url,
          shouldUpdateAvatar: shouldUpdateAvatar,
          googleAvatarUrl: googleAvatarUrl
        });

        // Store user data
        this.setUser(user);
        this.setSession({
          id: data.session.access_token,
          expires_at: data.session.expires_at || '',
          created_at: new Date().toISOString(),
        });

        return { user, error: null };
      }

      return { user: null, error: 'No user data returned' };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return { user: null, error: 'OAuth callback failed' };
    }
  }



  /**
   * Get current user
   */
  async getCurrentUser(): Promise<SupabaseUser | null> {
    try {
      const { data: { user: authUser } } = await this.supabase.auth.getUser();
      
      if (!authUser) {
        return null;
      }

      // Get user profile from users table by email
      const { data: profile, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle();

      if (error || !profile) {
        // Check for infinite recursion error specifically
        if (error && error.message?.includes('infinite recursion')) {
          console.error('RLS Policy Error: Infinite recursion detected. Please run FIX_RLS_COMPLETE.sql in Supabase SQL Editor to fix this issue.');

          // Create a minimal user object from auth data to prevent logout
          const minimalUser: SupabaseUser = {
            id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
            phone_number: '',
            role: 'user',
            institution_id: null,
            is_super_admin: false,
            is_active: true,
            permissions: {},
            profile_completed: false,
            avatar_url: authUser.user_metadata?.avatar_url || null,
            last_login: new Date().toISOString(),
            created_at: authUser.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          return minimalUser;
        }

        // Only log error if it's not a 'not found' error or table doesn't exist error
        if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
          // Check if error object has meaningful info before logging
          if (error.message || error.code) {
            console.error('Error fetching user profile:', error.message || error);
          }
        }

        // If table doesn't exist, try to create user entry
        if (error && (error.code === '42P01' || error.message?.includes('relation "public.users" does not exist'))) {
          console.warn('Users table does not exist. Please create it using the SQL in CREATE_USERS_TABLE.md');
        }

        // Fallback to cached user to avoid unexpected logouts on navigation
        const cached = this.getUser();
        return cached;
      }

      const user: SupabaseUser = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone_number: profile.phone_number ?? profile.phone,
        role: profile.role ?? profile.role1 ?? 'user',
        institution_id: profile.institution_id,
        is_super_admin: profile.is_super_admin,
        is_active: profile.is_active ?? true,
        permissions: profile.permissions || {},
        profile_completed: profile.profile_completed,
        avatar_url: profile.avatar_url,
        last_login: profile.last_login,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };

      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return this.getUser();
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('Check authentication error:', error);
      return false;
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._doRefreshSession();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async _doRefreshSession(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        return false;
      }

      if (data.session && data.user) {
        // Update stored session
        this.setSession({
          id: data.session.access_token,
          expires_at: data.session.expires_at || '',
          created_at: new Date().toISOString(),
        });

        // Get updated user profile
        const user = await this.getCurrentUser();
        if (user) {
          this.setUser(user);
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Refresh session error:', error);
      return false;
    }
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      // Get the user's email first
      const { data: authUser } = await this.supabase.auth.getUser();
      if (!authUser?.user?.email) return;

      await this.supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', authUser.user.email);
    } catch (error) {
      console.error('Update last login error:', error);
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getUser();
    return user?.permissions?.[permission] === true;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getUser();
    return user ? roles.includes(user.role) : false;
  }

  // Local storage methods
  getUser(): SupabaseUser | null {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData && userData !== 'undefined') {
        return JSON.parse(userData) as SupabaseUser;
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  private setUser(user: SupabaseUser): void {
    try {
      localStorage.setItem('user_data', JSON.stringify(user));
      localStorage.setItem('auth_timestamp', Date.now().toString());
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  getSession(): AuthSession | null {
    try {
      const sessionData = localStorage.getItem('session_data');
      if (sessionData && sessionData !== 'undefined') {
        return JSON.parse(sessionData) as AuthSession;
      }
      return null;
    } catch (error) {
      console.error('Error getting session data:', error);
      return null;
    }
  }

  private setSession(session: AuthSession): void {
    try {
      localStorage.setItem('session_data', JSON.stringify(session));
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  }

  clearSession(): void {
    localStorage.removeItem('user_data');
    localStorage.removeItem('session_data');
    localStorage.removeItem('auth_timestamp');
    sessionStorage.clear();
  }

  /**
   * Get Supabase client for direct database operations
   */
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }
}

const supabaseAuthService = new SupabaseAuthService();

export default supabaseAuthService;
