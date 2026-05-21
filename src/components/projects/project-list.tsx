'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, truncate } from '@/lib/constants';
import { Plus, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';

export function ProjectList() {
  const projects = useAppStore(s => s.projects);
  const loading = useAppStore(s => s.loading);
  const selectProject = useAppStore(s => s.selectProject);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Проекты</h1>
          <p className="text-muted-foreground">
            Управление вашими проектами
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новый проект
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FolderKanban className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Проектов пока нет</p>
              <p className="text-sm text-muted-foreground mt-1">
                Создайте первый проект для начала работы
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Создать проект
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow py-0"
              onClick={() => selectProject(project.id)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: project.color }}
                    />
                    <h3 className="font-semibold truncate">{project.name}</h3>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 shrink-0 ${PROJECT_STATUS_COLORS[project.status] || ''}`}
                  >
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description || 'Без описания'}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {project._count?.tasks ?? 0}{' '}
                    {project._count?.tasks === 1
                      ? 'задача'
                      : project._count?.tasks !== undefined &&
                          project._count.tasks >= 2 &&
                          project._count.tasks <= 4
                        ? 'задачи'
                        : 'задач'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
