'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { AppFooter } from '@/components/app-footer';

function LoginContent() {
  const { loginWithGoogle, isAuthenticated, isLoading, error } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Check for error cookie instead of URL parameter
    const cookies = document.cookie.split('; ');
    const errorCookie = cookies.find(row => row.startsWith('auth_error='));

    if (errorCookie) {
      const errorValue = errorCookie.split('=')[1];
      if (errorValue === 'not_found') {
        setFormError('Your account wasn\'t found in our system. Double-check your login details, or contact support if you need help.');
        // Clear the cookie
        document.cookie = 'auth_error=; path=/; max-age=0';
      }
    }

    // Also check URL params for backward compatibility but don't show in URL
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setFormError('Your account wasn\'t found in our system. Double-check your login details, or contact support if you need help.');
      // Clean the URL
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router]);

  const handleGoogleLogin = async () => {
    setFormError(null);
    const result = await loginWithGoogle();

    if (!result.success) {
      setFormError(result.error || 'Google login failed');
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-background'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/20 p-4'>
      <div className='mb-12 text-center animate-fade-in'>
        <div className='mb-6 flex justify-center'>
          <div className='h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg'>
            <span className='text-primary-foreground font-bold text-2xl'>J</span>
          </div>
        </div>
        <h1 className='text-display mb-2'>JKKN COE</h1>
        <p className='text-subheading'>Controller of Examination</p>
      </div>

      <Card className='w-full max-w-md shadow-xl hover:shadow-2xl transition-all duration-300 animate-scale-in'>
        <CardHeader className='text-center pb-6'>
          <CardTitle className='text-heading'>Welcome to JKKN COE Portal</CardTitle>
          <CardDescription className='text-body'>
            Sign in with your Google account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {(error || formError) && (
            <div className='rounded-md bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800'>
              <div className='flex items-start gap-3'>
                <Info className='h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
                <p className='text-sm text-red-600 dark:text-red-400 font-medium'>
                  {error || formError}
                </p>
              </div>
            </div>
          )}

          {/* Google Sign-In Button */}
          <Button
            type='button'
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className='w-full hover-lift bg-[#16a34a] hover:bg-[#15803d] text-white border-0'
            size='lg'
          >
            <svg className='mr-2 h-5 w-5' viewBox='0 0 24 24'>
              <path
                fill='currentColor'
                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
              />
              <path
                fill='currentColor'
                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
              />
              <path
                fill='currentColor'
                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
              />
              <path
                fill='currentColor'
                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
              />
            </svg>
            Sign in with Google
          </Button>

          <div className='text-center'>
            <p className='text-xs text-muted-foreground'>
              Secure authentication powered by JKKN
            </p>
          </div>
        </CardContent>
      </Card>

      <AppFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className='flex items-center justify-center min-h-screen bg-background'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}