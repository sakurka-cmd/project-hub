'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { Task } from '@/types';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  WORK_ITEM_TYPE_LABELS,
  WORK_ITEM_TYPE_COLORS,
  WORK_ITEM_TYPE_PREFIX,
  TASK_STATUSES,
  SPRINT_STATUS_LABELS,
  SPRINT_STATUS_COLORS,
  getShortId,
} from '@/lib/constants';
import {
  Diamond,
  Hexagon,
  FileText,
  Bug,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskDetailPane } from '@/components/tasks/task-detail-pane';
import { CreateTaskInline } from '@/components/tasks/create-task-inline';
import { cn } from '@/lib/utils';

function getTypeIcon(type: string) {
  const props = { className: 'h-3.5 w-3.5 shrink-0' };
  switch (type) {
    case 'epic': return <Diamond {...props} />;
    case 'feature': return <Hexagon {...props} />;
    case 'userStory': return <FileText {...props} />;
    case 'bug': return <Bug {...props} />;
    default: return <CheckSquare {...props} />;
  }
}

function getTypeIconColor(type: string): string {
  switch (type) {
    case 'epic': return 'text-violet-600 dark:text-violet-400';
    case 'feature': return 'text-blue-600 dark:text-blue-400';
    case 'userStory': return 'text-teal-600 dark:text-teal-400';
    case 'bug': return 'text-red-600 dark:text-red-400';
    default: return 'text-gray-500 dark:text-gray-400';
  }
}

const AZURE_STATUSES = [
  { key: 'todo', label: 'Новые' },
  { key: 'in_progress', label: 'Активные' },
  { key: 'review', label: 'Решены' },
  { key: 'done', label: 'Закрыты' },
] as const;

export function BoardView() {
  const tasks = useAppStore(s => s.tasks);
  const sprints = useAppStore(s => s.sprints);
  const selectedProjectId = useAppStore(s => s.selectedProjectId);
  const updateTask = useAppStore(s => s.updateTask);
  const loading = useAppStore(s => s.loading);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [paneOpen, setPaneOpen] = useState(false);

  // Only leaf-level tasks (no children) are shown on the board
  const leafTasks = useMemo(() => {
    const parentIds = new Set(tasks.filter(t => t.children && t.children.length > 0).map(t => t.id));
    return tasks.filter(t => !parentIds.has(t.id));
  }, [tasks]);

  const statusFlow: Record<string, string | null> = {
    todo: 'in_progress',
    in_progress: 'review',
    review: 'done',
    done: null,
  };

  const statusReverse: Record<string, string | null> = {
    todo: null,
    in_progress: 'todo',
    review: 'in_progress',
    done: 'review',
  };

  const handleMoveTask = async (task: Task, direction: 'forward' | 'back') => {
    const nextStatus = direction === 'forward'
      ? statusFlow[task.status]
      : statusReverse[task.status];
    if (nextStatus) {
      await updateTask(task.id, { status: nextStatus as Task['status'] });
    }
  };

  const handleSelect = (task: Task) => {
    setSelectedTask(task);
    setPaneOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const renderSprintSection = (sprintId: string | null, sprintName: string) => {
    const sprintTasks = sprintId
      ? leafTasks.filter(t => t.sprintId === sprintId)
      : leafTasks.filter(t => !t.sprintId);

    if (sprintTasks.length === 0) return null;

    return (
      <div key={sprintId || 'none'} className="space-y-3">
        {/* Sprint header */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <Badge variant="outline" className="text-xs font-medium shrink-0">
            {sprintName}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
            {sprintTasks.length}
          </Badge>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Kanban columns */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {AZURE_STATUSES.map(status => {
            const columnTasks = sprintTasks.filter(t => t.status === status.key);
            const prefix = '';

            return (
              <div key={status.key} className="flex flex-col rounded-lg border bg-muted/20 min-h-[120px]">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold">{status.label}</h3>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                      {columnTasks.length}
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="max-h-[40vh]">
                  <div className="p-1.5 space-y-1.5">
                    {columnTasks.length === 0 && (
                      <p className="text-[10px] text-muted-foreground text-center py-4">
                        —
                      </p>
                    )}
                    {columnTasks.map(task => {
                      const typePrefix = WORK_ITEM_TYPE_PREFIX[task.workItemType] || 'TK';
                      return (
                        <Card
                          key={task.id}
                          className="cursor-pointer hover:shadow-sm transition-shadow py-0 border-l-2"
                          style={{
                            borderLeftColor:
                              task.workItemType === 'epic' ? '#8b5cf6' :
                              task.workItemType === 'feature' ? '#3b82f6' :
                              task.workItemType === 'userStory' ? '#14b8a6' :
                              task.workItemType === 'bug' ? '#ef4444' : '#9ca3af',
                          }}
                          onClick={() => handleSelect(task)}
                        >
                          <CardContent className="p-2.5 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={cn('shrink-0', getTypeIconColor(task.workItemType))}>
                                {getTypeIcon(task.workItemType)}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                {typePrefix}-{getShortId(task.id)}
                              </span>
                            </div>
                            <p className="text-xs font-medium leading-snug">{task.title}</p>
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge
                                variant="secondary"
                                className={`text-[9px] px-1 py-0 ${PRIORITY_COLORS[task.priority] || ''}`}
                              >
                                {PRIORITY_LABELS[task.priority]}
                              </Badge>
                            </div>
                            {/* Status navigation */}
                            <div className="flex items-center gap-0.5 pt-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                disabled={!statusReverse[task.status]}
                                onClick={(e) => { e.stopPropagation(); handleMoveTask(task, 'back'); }}
                              >
                                <ChevronLeft className="h-3 w-3" />
                              </Button>
                              <div className="flex-1" />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                disabled={!statusFlow[task.status]}
                                onClick={(e) => { e.stopPropagation(); handleMoveTask(task, 'forward'); }}
                              >
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const activeSprints = sprints.filter(s => s.status === 'active');
  const otherSprints = sprints.filter(s => s.status !== 'active' && s.status !== 'completed');

  return (
    <div className="space-y-6">
      {/* Kanban board with sprint swimlanes */}
      {activeSprints.length > 0 && activeSprints.map(s => renderSprintSection(s.id, s.name))}

      {/* Other non-completed sprints */}
      {otherSprints.length > 0 && otherSprints.map(s => renderSprintSection(s.id, s.name))}

      {/* No sprint */}
      {renderSprintSection(null, 'Без спринта')}

      {/* Completed sprints */}
      {sprints.filter(s => s.status === 'completed').map(s => renderSprintSection(s.id, s.name))}

      {/* Empty state */}
      {leafTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <CheckSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Нет элементов для отображения на доске
          </p>
        </div>
      )}

      {/* Bottom add */}
      {selectedProjectId && (
        <div className="rounded-lg border bg-card p-2">
          <CreateTaskInline
            projectId={selectedProjectId}
            placeholder="Быстрое добавление задачи..."
          />
        </div>
      )}

      {/* Task detail pane */}
      <TaskDetailPane
        open={paneOpen}
        onOpenChange={(v) => { setPaneOpen(v); if (!v) setSelectedTask(null); }}
        task={selectedTask}
      />
    </div>
  );
}
