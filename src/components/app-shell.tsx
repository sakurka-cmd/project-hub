'use client';

import { SessionProvider, useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';
import Link from 'next/link';
import { Layers, Menu, Settings, Loader2, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppStore } from '@/lib/store';
import { UserMenu } from '@/components/auth/user-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ProjectTreeView } from '@/components/tree/project-tree-view';

function PhLogo({ size = 'default' }: { size?: 'default' | 'small' }) {
  const isSmall = size === 'small';
  const squareSize = isSmall ? 'h-7 w-7' : 'h-9 w-9';
  const textP = isSmall ? 'text-sm' : 'text-base';
  const textH = isSmall ? 'text-xs' : 'text-sm';

  return (
    <div
      className={`${squareSize} rounded-md flex items-center overflow-hidden shrink-0`}
      style={{ backgroundColor: '#000000' }}
    >
      <span
        className={`${textP} font-black leading-none text-white`}
        style={{ padding: isSmall ? '2px 1px 2px 3px' : '3px 1px 3px 4px' }}
      >
        P
      </span>
      <span
        className={`${textH} font-black leading-none flex items-center justify-center`}
        style={{
          backgroundColor: '#f97316',
          color: '#000000',
          borderRadius: '0 3px 3px 0',
          padding: isSmall ? '2px 3px 2px 1px' : '3px 4px 3px 1px',
        }}
      >
        h
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </main>
    </div>
  );
}

function TopBar() {
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const currentUser = useAppStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const requestCreateProject = useAppStore((s) => s.requestCreateProject);

  return (
    <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4">
      {/* Mobile hamburger */}
      {isMobile && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Меню</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Навигация</SheetTitle>
            </SheetHeader>
            <div className="flex items-center gap-2 px-4 py-5">
              <PhLogo size="small" />
              <span className="text-lg font-bold tracking-tight">ProjectHub</span>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Mobile uses the same logo above */}

      {/* Logo */}
      <PhLogo />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Create project button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs shrink-0"
        onClick={requestCreateProject}
      >
        <Plus className="h-3.5 w-3.5" />
        Добавить проект
      </Button>

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
  const isMobile = useIsMobile();

  useEffect(() => {
    if (session?.user) {
      setCurrentUser({
        id: (session.user as any).id,
        username: (session.user as any).username || session.user.name || '',
        role: (session.user as any).role || 'user',
      });
      loadAllData();
    }
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
      {/* Main content */}
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
