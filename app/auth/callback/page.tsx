'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { isAuthenticated, error: authError } = useAuth();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [message, setMessage] = useState<string>('Processing authentication...');

  useEffect(() => {
    console.log('OAuth Callback - Auth state:', { isAuthenticated, authError });
    
    const err = readCookie('auth_error');

    // 1) If we have a known error cookie, show message and redirect immediately
    if (err) {
      console.log('OAuth Callback - Error cookie found:', err);
      setStatus('error');
      setMessage(
        err === 'inactive'
          ? 'Your account is inactive. Please contact JKKN COE Admin for assistance.'
          : "Your account wasn't found in our system. Contact JKKN COE Admin for access."
      );
      clearCookie('auth_error');
      router.replace('/login');
      return;
    }

    // 2) If already authenticated, go straight to dashboard
    if (isAuthenticated) {
      console.log('OAuth Callback - User authenticated, redirecting to dashboard');
      setStatus('success');
      setMessage('Signed in successfully. Redirecting...');
      router.replace('/dashboard');
      return;
    }

    // 3) Otherwise, fallback to login if auth state hasn't resolved after a reasonable time
    console.log('OAuth Callback - Waiting for authentication...');
    const timer = setTimeout(() => {
      console.log('OAuth Callback - Timeout reached, redirecting to login');
      setStatus('error');
      setMessage('Authentication could not be completed. Please sign in again.');
      router.replace('/login');
    }, 10000); // Increased to 10 seconds to allow more time for OAuth processing

    return () => clearTimeout(timer);
  }, [isAuthenticated, authError, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Authentication</CardTitle>
          <CardDescription>Processing your authentication request</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          {status === 'loading' && (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button variant="ghost" onClick={() => router.replace('/login')}>Go to Login</Button>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-destructive text-center px-4">{message}</p>
              <Button onClick={() => router.replace('/login')}>Back to Login</Button>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button onClick={() => router.replace('/dashboard')}>Continue</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}