'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { ProjectTab } from '@/types';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUSES,
} from '@/lib/constants';
import { ArrowLeft, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { TaskBoard } from '@/components/tasks/task-board';
import { ArtifactList } from '@/components/artifacts/artifact-list';
import { CredentialList } from '@/components/credentials/credential-list';
import { InfrastructureList } from '@/components/infrastructure/infrastructure-list';
import { useToast } from '@/hooks/use-toast';

export function ProjectDetail() {
  const project = useAppStore(s => s.currentProject);
  const loading = useAppStore(s => s.loading);
  const setView = useAppStore(s => s.setView);
  const projectTab = useAppStore(s => s.projectTab);
  const setProjectTab = useAppStore(s => s.setProjectTab);
  const updateProject = useAppStore(s => s.updateProject);
  const deleteProject = useAppStore(s => s.deleteProject);
  const selectedProjectId = useAppStore(s => s.selectedProjectId);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { toast } = useToast();

  if (loading || !project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateProject(project.id, { status: newStatus as project['status'] });
      toast({ title: 'Статус обновлён' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(project.id);
      toast({ title: 'Проект удалён' });
      setDeleteOpen(false);
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить проект', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const tabs: { value: ProjectTab; label: string }[] = [
    { value: 'tasks', label: 'Задачи' },
    { value: 'artifacts', label: 'Артефакты' },
    { value: 'credentials', label: 'Учётные записи' },
    { value: 'infrastructure', label: 'Инфраструктура' },
  ];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('projects')} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          К проектам
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="h-4 w-4 rounded-full shrink-0 mt-1"
              style={{ backgroundColor: project.color }}
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select value={project.status} onValueChange={handleStatusChange}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setEditOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={projectTab} onValueChange={(v) => setProjectTab(v as ProjectTab)}>
        <TabsList className="w-full sm:w-auto">
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <TaskBoard />
        </TabsContent>
        <TabsContent value="artifacts" className="mt-4">
          <ArtifactList />
        </TabsContent>
        <TabsContent value="credentials" className="mt-4">
          <CredentialList />
        </TabsContent>
        <TabsContent value="infrastructure" className="mt-4">
          <InfrastructureList />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      {selectedProjectId && (
        <CreateProjectDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          initialData={{
            id: project.id,
            name: project.name,
            description: project.description,
            color: project.color,
            status: project.status,
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Проект «{project.name}» и все связанные данные будут удалены без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
