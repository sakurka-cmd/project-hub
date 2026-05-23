'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import { ListTree, Menu, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ProjectTreeView } from '@/components/tree/project-tree-view';

function SidebarContent() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Layers className="h-4 w-4" />
        </div>
        <span className="text-lg font-bold tracking-tight">ProjectHub</span>
      </div>

      <Separator />

      <nav className="flex flex-col gap-1 px-3 py-4">
        <Button
          variant="secondary"
          className="justify-start gap-2"
          disabled
        >
          <ListTree className="h-4 w-4" />
          Проекты
        </Button>
      </nav>
    </div>
  );
}

export function AppShell() {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="hidden md:flex w-64 shrink-0 border-r bg-card">
          <SidebarContent />
        </aside>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        {isMobile && (
          <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4">
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
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-sm">ProjectHub</span>
            </div>
          </div>
        )}

        {/* View content */}
        <div className="p-4 md:p-6 lg:p-8">
          <ProjectTreeView />
        </div>
      </main>
    </div>
  );
}
