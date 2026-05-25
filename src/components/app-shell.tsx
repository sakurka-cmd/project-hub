'use client';

import { SessionProvider, useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';
import Link from 'next/link';
import { Layers, Settings, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';
import { UserMenu } from '@/components/auth/user-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectTreeView } from '@/components/tree/project-tree-view';

function LoadingSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 border-b" />
        <div className="flex-1 overflow-auto p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-64 mb-8" />
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>
      </main>
    </div>
  );
}

function TopBar() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Layers className="h-3.5 w-3.5" />
        </div>
        <span className="font-semibold text-sm">ProjectHub</span>
      </div>

      <div className="flex-1" />

      {/* Settings link (admin only) */}
      {isAdmin && (
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Настройки</span>
          </Link>
        </Button>
      )}

      {/* User menu */}
      <UserMenu />
    </div>
  );
}

function AuthenticatedApp() {
  const { data: session, status } = useSession();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const loadAllData = useAppStore((s) => s.loadAllData);

  useEffect(() => {
    if (!session?.user) return;

    // Fetch real user data from API (Turbopack standalone loses session custom fields)
    api.getMe()
      .then((user) => {
        setCurrentUser({
          id: user.id,
          username: user.username,
          role: user.role,
        });
      })
      .catch(() => {
        // Fallback: use session data (may lack role in Turbopack)
        setCurrentUser({
          id: (session.user as any).id || '',
          username: (session.user as any).username || session.user.name || '',
          role: (session.user as any).role || 'user',
        });
      });

    loadAllData();
  }, [session, setCurrentUser, loadAllData]);

  if (status === 'loading') {
    return <LoadingSkeleton />;
  }

  if (!session) {
    signIn();
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8">
            <ProjectTreeView />
          </div>
        </div>
      </main>
    </div>
  );
}

export function AppShell() {
  return (
    <SessionProvider>
      <AuthenticatedApp />
    </SessionProvider>
  );
}
