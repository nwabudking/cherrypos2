import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { UserMenu } from '@/components/layout/UserMenu';
import { Loader2, Cherry } from 'lucide-react';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export const DashboardLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { staffUser, isStaffAuthenticated, isLoading: staffLoading } = useStaffAuth();
  const navigate = useNavigate();
  
  // Enable global realtime sync for all pages
  useRealtimeSync();

  const isLoading = authLoading || staffLoading;
  const isAuthenticated = !!user || isStaffAuthenticated;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/staff-login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 gradient-cherry rounded-2xl flex items-center justify-center glow-cherry animate-pulse">
            <Cherry className="w-8 h-8 text-primary-foreground" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </div>
            
            <UserMenu />
          </header>

          {/* Main content */}
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
