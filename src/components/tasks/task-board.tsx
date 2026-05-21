'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Task } from '@/types';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  TASK_STATUSES,
} from '@/lib/constants';
import { Plus, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateTaskDialog, EditTaskDialog } from '@/components/tasks/task-dialogs';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/constants';

export function TaskBoard() {
  const tasks = useAppStore(s => s.tasks);
  const categories = useAppStore(s => s.categories);
  const selectedProjectId = useAppStore(s => s.selectedProjectId);
  const updateTask = useAppStore(s => s.updateTask);
  const loading = useAppStore(s => s.loading);

  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<string>('todo');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-80 rounded-xl" />
        ))}
      </div>
    );
  }

  const filteredTasks = filterCategory
    ? tasks.filter(t => t.categoryId === filterCategory)
    : tasks;

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

  return (
    <div className="space-y-4">
      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filterCategory === null ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterCategory(null)}
          >
            Все
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={filterCategory === cat.id ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
            </Button>
          ))}
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TASK_STATUSES.map(status => {
          const columnTasks = filteredTasks.filter(t => t.status === status);
          const canMoveForward = status !== 'done';

          return (
            <div key={status} className="flex flex-col rounded-xl border bg-muted/30">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                    {columnTasks.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { setCreateStatus(status); setCreateOpen(true); }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="max-h-[60vh]">
                <div className="p-2 space-y-2">
                  {columnTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Нет задач
                    </p>
                  )}
                  {columnTasks.map(task => (
                    <Card
                      key={task.id}
                      className="cursor-pointer hover:shadow-sm transition-shadow py-0"
                      onClick={() => setEditingTask(task)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm font-medium leading-snug">{task.title}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority] || ''}`}
                          >
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                          {task.category && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full mr-1"
                                style={{ backgroundColor: task.category.color }}
                              />
                              {task.category.name}
                            </Badge>
                          )}
                          {task.dueDate && (
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                        {/* Status navigation buttons */}
                        <div className="flex items-center gap-1 pt-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={!statusReverse[task.status]}
                            onClick={(e) => { e.stopPropagation(); handleMoveTask(task, 'back'); }}
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                          <div className="flex-1" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={!statusFlow[task.status]}
                            onClick={(e) => { e.stopPropagation(); handleMoveTask(task, 'forward'); }}
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Create task dialog */}
      {selectedProjectId && (
        <CreateTaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultStatus={createStatus}
          projectId={selectedProjectId}
        />
      )}

      {/* Edit task dialog */}
      {editingTask && (
        <EditTaskDialog
          open={!!editingTask}
          onOpenChange={(v) => { if (!v) setEditingTask(null); }}
          task={editingTask}
        />
      )}
    </div>
  );
}
