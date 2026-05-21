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
  WORK_ITEM_TYPE_PREFIX,
  WORK_ITEM_TYPES,
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
  Plus,
  FolderKanban,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const BOARD_STATUSES = [
  { key: 'todo', label: 'Новые' },
  { key: 'in_progress', label: 'Активные' },
  { key: 'review', label: 'Решены' },
  { key: 'done', label: 'Закрытые' },
] as const;

export function UnifiedBoard() {
  const tasks = useAppStore(s => s.tasks);
  const sprints = useAppStore(s => s.sprints);
  const projects = useAppStore(s => s.projects);
  const updateTask = useAppStore(s => s.updateTask);
  const selectProjectContext = useAppStore(s => s.selectProjectContext);
  const loading = useAppStore(s => s.loading);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [paneOpen, setPaneOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sprintFilter, setSprintFilter] = useState<string | null>(null);
  const [addTaskProjectId, setAddTaskProjectId] = useState<string | null>(null);

  // Flatten all tasks (root + children) to get leaf tasks for the board
  const allLeafTasks = useMemo(() => {
    const parentIds = new Set<string>();
    // Collect all IDs that have children
    const collectParentIds = (taskList: Task[]) => {
      for (const t of taskList) {
        if (t.children && t.children.length > 0) {
          parentIds.add(t.id);
          collectParentIds(t.children);
        }
      }
    };
    collectParentIds(tasks);
    // Return only leaf tasks
    const leaves: Task[] = [];
    const collectLeaves = (taskList: Task[]) => {
      for (const t of taskList) {
        if (!parentIds.has(t.id)) {
          leaves.push(t);
        }
        if (t.children) collectLeaves(t.children);
      }
    };
    collectLeaves(tasks);
    return leaves;
  }, [tasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    let result = allLeafTasks;
    if (projectFilter) result = result.filter(t => t.projectId === projectFilter);
    if (typeFilter) result = result.filter(t => t.workItemType === typeFilter);
    if (sprintFilter) result = result.filter(t => t.sprintId === sprintFilter);
    return result;
  }, [allLeafTasks, projectFilter, typeFilter, sprintFilter]);

  // Group filtered tasks by project for section headers
  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of filteredTasks) {
      if (!map.has(t.projectId)) map.set(t.projectId, []);
      map.get(t.projectId)!.push(t);
    }
    return map;
  }, [filteredTasks]);

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

  const handleSelect = async (task: Task) => {
    await selectProjectContext(task.projectId);
    setSelectedTask(task);
    setPaneOpen(true);
  };

  if (loading && projects.length === 0) {
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

  const renderProjectSection = (projectId: string, projectTasks: Task[]) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || projectTasks.length === 0) return null;

    return (
      <div key={projectId} className="space-y-3">
        {/* Project header */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <span className="text-sm font-semibold">{project.name}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {projectTasks.length}
            </Badge>
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Kanban columns */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {BOARD_STATUSES.map(status => {
            const columnTasks = projectTasks.filter(t => t.status === status.key);

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
                              {task.sprint && (
                                <span className="text-[9px] text-muted-foreground truncate">
                                  {task.sprint.name}
                                </span>
                              )}
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Доска</h1>
        <p className="text-muted-foreground">
          Канбан-доска по всем проектам
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-muted/20 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Project filter */}
          <select
            value={projectFilter || ''}
            onChange={e => setProjectFilter(e.target.value || null)}
            className="h-7 rounded-md border bg-background px-2 text-xs"
          >
            <option value="">Все проекты</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={typeFilter || ''}
            onChange={e => setTypeFilter(e.target.value || null)}
            className="h-7 rounded-md border bg-background px-2 text-xs"
          >
            <option value="">Все типы</option>
            {WORK_ITEM_TYPES.map(t => (
              <option key={t} value={t}>{WORK_ITEM_TYPE_LABELS[t]}</option>
            ))}
          </select>

          {/* Sprint filter */}
          {sprints.length > 0 && (
            <select
              value={sprintFilter || ''}
              onChange={e => setSprintFilter(e.target.value || null)}
              className="h-7 rounded-md border bg-background px-2 text-xs"
            >
              <option value="">Все спринты</option>
              {sprints.map(s => {
                const proj = projects.find(p => p.id === s.projectId);
                return (
                  <option key={s.id} value={s.id}>
                    {proj ? `${proj.name} — ` : ''}{s.name}
                  </option>
                );
              })}
            </select>
          )}
        </div>
      </div>

      {/* Board sections grouped by project */}
      <div className="space-y-6">
        {/* When no project filter, show sections grouped by project */}
        {!projectFilter ? (
          <>
            {/* Sort projects: active first */}
            {[...projects]
              .sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (a.status !== 'active' && b.status === 'active') return 1;
                return 0;
              })
              .map(p => renderProjectSection(p.id, tasksByProject.get(p.id) || []))
            }
          </>
        ) : (
          renderProjectSection(projectFilter, tasksByProject.get(projectFilter) || [])
        )}
      </div>

      {/* Empty state */}
      {filteredTasks.length === 0 && projects.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <CheckSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Нет элементов для отображения
          </p>
        </div>
      )}

      {/* Quick add */}
      {projects.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Быстрое добавление в проект:</span>
            <Select value={addTaskProjectId || ''} onValueChange={setAddTaskProjectId}>
              <SelectTrigger className="h-7 w-48 text-xs">
                <SelectValue placeholder="Выберите проект" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {addTaskProjectId && (
            <CreateTaskInline
              projectId={addTaskProjectId}
              placeholder="Быстрое добавление задачи..."
            />
          )}
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
