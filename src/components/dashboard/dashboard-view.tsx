'use client';

import { useAppStore } from '@/lib/store';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  truncate,
  formatDate,
} from '@/lib/constants';
import {
  FolderKanban,
  FolderOpen,
  ListTodo,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export function DashboardView() {
  const dashboard = useAppStore(s => s.dashboard);
  const selectProject = useAppStore(s => s.selectProject);
  const setView = useAppStore(s => s.setView);

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const stats = [
    {
      label: 'Всего проектов',
      value: dashboard.totalProjects,
      icon: FolderKanban,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Активные проекты',
      value: dashboard.activeProjectsCount,
      icon: FolderOpen,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-100 dark:bg-sky-900/30',
    },
    {
      label: 'Всего задач',
      value: dashboard.totalTasks,
      icon: ListTodo,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Критические задачи',
      value: dashboard.criticalTasks,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
  ];

  const tasksByStatus = [
    { key: 'todo', label: TASK_STATUS_LABELS.todo, color: 'bg-gray-400 dark:bg-gray-500' },
    { key: 'in_progress', label: TASK_STATUS_LABELS.in_progress, color: 'bg-amber-500' },
    { key: 'review', label: TASK_STATUS_LABELS.review, color: 'bg-purple-500' },
    { key: 'done', label: TASK_STATUS_LABELS.done, color: 'bg-emerald-500' },
  ];

  const totalForBar = tasksByStatus.reduce(
    (sum, s) => sum + (dashboard.tasksByStatus[s.key] || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Обзор</h1>
        <p className="text-muted-foreground">
          Сводная информация по проектам и задачам
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="py-4">
              <CardContent className="flex items-center gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground truncate">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Последние задачи</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {dashboard.recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Задач пока нет
              </p>
            ) : (
              dashboard.recentTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => selectProject(task.projectId)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.project && (
                        <span className="text-xs text-muted-foreground truncate">
                          {task.project.name}
                        </span>
                      )}
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${TASK_STATUS_COLORS[task.status] || ''}`}
                      >
                        {TASK_STATUS_LABELS[task.status]}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority] || ''}`}
                      >
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              ))
            )}
            {dashboard.recentTasks.length > 0 && (
              <>
                <Separator className="my-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setView('projects')}
                >
                  Все проекты
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tasks by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Задачи по статусам</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {tasksByStatus.map(status => {
              const count = dashboard.tasksByStatus[status.key] || 0;
              const pct = totalForBar > 0 ? (count / totalForBar) * 100 : 0;
              return (
                <div key={status.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{status.label}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${status.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {dashboard.criticalTasksList.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Критические задачи
                  </p>
                  {dashboard.criticalTasksList.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded p-1.5"
                      onClick={() => selectProject(task.projectId)}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <span className="truncate">{task.title}</span>
                      {task.project && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          — {task.project.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {totalForBar === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Нет данных для отображения
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
