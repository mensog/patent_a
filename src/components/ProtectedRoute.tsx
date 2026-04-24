import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { getDefaultRouteForRole } from '@/lib/app-utils';
import type { AppRole } from '@/types/app';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requireCompany?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireCompany = true,
}: ProtectedRouteProps) {
  const { session, profile, profileError, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Не удалось загрузить профиль</h1>
          <p className="mt-2 text-sm text-muted-foreground">{profileError}</p>
          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Повторить
            </Button>
            <Button
              onClick={async () => {
                await signOut();
              }}
            >
              Выйти
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/setup" replace />;
  }

  if (requireCompany && !profile.company_id) {
    return <Navigate to="/setup" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(profile.role)) {
    return <Navigate to={getDefaultRouteForRole(profile.role)} replace />;
  }

  return <>{children}</>;
}
