'use client';

import { useAppStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/use-mobile';
import { LayoutDashboard, FolderKanban, Menu, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { ProjectList } from '@/components/projects/project-list';
import { ProjectDetail } from '@/components/projects/project-detail';

function SidebarContent() {
  const view = useAppStore(s => s.view);
  const setView = useAppStore(s => s.setView);
  const projects = useAppStore(s => s.projects);
  const selectProject = useAppStore(s => s.selectProject);

  const navItems = [
    { key: 'dashboard' as const, label: 'Обзор', icon: LayoutDashboard },
    { key: 'projects' as const, label: 'Проекты', icon: FolderKanban },
  ];

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
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = view === item.key || (item.key === 'projects' && view === 'project-detail');
          return (
            <Button
              key={item.key}
              variant={isActive ? 'secondary' : 'ghost'}
              className="justify-start gap-2"
              onClick={() => setView(item.key)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <Separator />

      <div className="px-3 py-3">
        <p className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Проекты
        </p>
        <ScrollArea className="max-h-[calc(100vh-320px)]">
          <div className="flex flex-col gap-0.5">
            {projects.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">Нет проектов</p>
            )}
            {projects.map(project => (
              <Button
                key={project.id}
                variant="ghost"
                size="sm"
                className="justify-start gap-2 text-sm"
                onClick={() => selectProject(project.id)}
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate">{project.name}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export function AppShell() {
  const view = useAppStore(s => s.view);
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
          {view === 'dashboard' && <DashboardView />}
          {view === 'projects' && <ProjectList />}
          {view === 'project-detail' && <ProjectDetail />}
        </div>
      </main>
    </div>
  );
}
