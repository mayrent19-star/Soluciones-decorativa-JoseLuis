import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function ProtectedRoute({ children, ownerOnly = false }: { children: React.ReactNode; ownerOnly?: boolean }) {
  const { user, role, loading } = useAuth();
  
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  
  if (!user) return <Navigate to="/auth" replace />;
  if (ownerOnly && role !== 'owner') return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
}
