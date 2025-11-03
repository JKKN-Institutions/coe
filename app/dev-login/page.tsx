'use client'

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Rocket } from 'lucide-react';
import { DevAuthBypass } from '@/services/auth/dev-auth-bypass';

export default function DevLoginPage() {
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    // Check if we're in development
    const isLocalhost = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';
    setIsDev(isLocalhost);
  }, []);

  const handleDevLogin = () => {
    // Set dev user in localStorage
    const devUser = {
      id: 'dev-user-001',
      email: 'developer@jkkn.ac.in',
      name: 'Development User',
      avatar_url: '',
      role: 'admin',
      department: 'Computer Science',
      permissions: {
        regulations: { view: true, create: true, edit: true, delete: true },
        courses: { view: true, create: true, edit: true, delete: true },
        batches: { view: true, create: true, edit: true, delete: true },
        users: { view: true, create: true, edit: true, delete: true }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const devSession = {
      access_token: 'dev-access-token-' + Date.now(),
      refresh_token: 'dev-refresh-token-' + Date.now(),
      expires_in: 3600,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      token_type: 'Bearer'
    };

    // Store in localStorage
    localStorage.setItem('auth_token', devSession.access_token);
    localStorage.setItem('refresh_token', devSession.refresh_token);
    localStorage.setItem('user_data', JSON.stringify(devUser));
    localStorage.setItem('auth_session', JSON.stringify(devSession));

    // Redirect to dashboard
    window.location.href = '/dashboard';
  };

  const handleProductionLogin = () => {
    window.location.href = '/';
  };

  if (!isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Production Environment
            </CardTitle>
            <CardDescription>
              Dev login is not available in production
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleProductionLogin} className="w-full">
              Go to Normal Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-500" />
            Development Login
          </CardTitle>
          <CardDescription>
            Bypass authentication for local development
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <div className="text-sm">
              <strong>Warning:</strong> This is only for development purposes.
              All permissions are granted by default.
            </div>
          </div>

          <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm font-medium">Dev User Details:</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Email: developer@jkkn.ac.in</li>
              <li>• Role: Admin</li>
              <li>• Permissions: All granted</li>
              <li>• Session: 1 hour validity</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleDevLogin}
              className="w-full"
              size="lg"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Login as Developer
            </Button>

            <Button
              onClick={handleProductionLogin}
              variant="outline"
              className="w-full"
            >
              Use Normal Login
            </Button>
          </div>

          <div className="pt-4 border-t text-xs text-center text-muted-foreground">
            This bypasses parent app authentication.<br />
            Use only for local development at port 3001.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}