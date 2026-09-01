'use client';

import { SessionProvider, useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, Menu, Settings, Loader2, Plus, Search } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { UserMenu } from '@/components/auth/user-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchPalette } from '@/components/search/search-palette';
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

function TopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
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

      {/* Global search trigger (Ctrl+K) */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-9 min-w-0 max-w-xs flex-1 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:flex-none sm:w-56 md:w-64"
        aria-label="Открыть поиск (Ctrl+K)"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Поиск…</span>
        <kbd className="pointer-events-none ml-auto hidden shrink-0 select-none items-center gap-0.5 rounded border bg-background px-1 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          Ctrl K
        </kbd>
      </button>

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
  const [searchOpen, setSearchOpen] = useState(false);

  // Глобальный хоткей Ctrl+K / ⌘K → палетка поиска
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (session?.user) {
      // Use API to get actual user data (Turbopack standalone loses custom JWT fields)
      api.getMe()
        .then((user) => {
          setCurrentUser({ id: user.id, username: user.username, role: user.role });
        })
        .catch(() => {
          setCurrentUser({
            id: (session.user as any).id || '',
            username: (session.user as any).username || session.user.name || '',
            role: 'user',
          });
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
        <TopBar onOpenSearch={() => setSearchOpen(true)} />
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8">
            <ProjectTreeView />
          </div>
        </div>
      </main>

      {/* Глобальный поиск */}
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
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
