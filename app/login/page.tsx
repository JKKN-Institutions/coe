'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLogin = () => {
    console.log('Login button clicked');
    login();
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
        <CardHeader className='text-center pb-4'>
          <CardTitle className='text-heading'>Welcome Back</CardTitle>
          <CardDescription className='text-body'>
            Click the button below to sign in via MyJKKN authentication system.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <Button 
            onClick={handleLogin} 
            className='w-full hover-lift' 
            size='lg'
          >
            <LogIn className='mr-2 h-5 w-5' /> 
            Sign in with MyJKKN
          </Button>
          
          <div className='text-center'>
            <p className='text-xs text-muted-foreground'>
              Secure authentication powered by MyJKKN
            </p>
          </div>
        </CardContent>
      </Card>
      
      <footer className='mt-12 text-center animate-fade-in' style={{ animationDelay: '0.3s' }}>
        <div className='max-w-md'>
          <p className='text-caption'>
            This is the Controller of Examination application integrated with the MyJKKN parent authentication
            system for secure and seamless access.
          </p>
        </div>
      </footer>
    </div>
  );
}
