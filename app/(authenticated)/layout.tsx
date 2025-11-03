'use client';

import { ProtectedRoute } from '@/components/common/protected-route';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute
      redirectTo="/login"
      loadingComponent={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      {children}
    </ProtectedRoute>
  );
}
