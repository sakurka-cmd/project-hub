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
  WORK_ITEM_TYPE_BORDER_COLORS,
  WORK_ITEM_TYPES,
  WORK_ITEM_TYPE_PREFIX,
  CHILD_TYPE_FOR_PARENT,
  getShortId,
} from '@/lib/constants';
import {
  ChevronRight,
  ChevronDown,
  Diamond,
  Hexagon,
  FileText,
  Bug,
  CheckSquare,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  CirclePlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TaskDetailPane } from '@/components/tasks/task-detail-pane';
import { CreateTaskInline } from '@/components/tasks/create-task-inline';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function getTypeIcon(type: string) {
  const props = { className: 'h-4 w-4 shrink-0' };
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

interface TreeNodeProps {
  task: Task;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  onSelect: (task: Task) => void;
  selectedId: string | null;
  onDelete: (task: Task) => void;
  onAddChild: (parentId: string, type: Task['workItemType']) => void;
  projectId: string;
}

function TreeNode({
  task,
  depth,
  expanded,
  toggleExpand,
  onSelect,
  selectedId,
  onDelete,
  onAddChild,
  projectId,
}: TreeNodeProps) {
  const hasChildren = task.children && task.children.length > 0;
  const isExpanded = expanded.has(task.id);
  const isSelected = selectedId === task.id;
  const prefix = WORK_ITEM_TYPE_PREFIX[task.workItemType] || 'TK';

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer transition-colors hover:bg-muted/60',
          isSelected && 'bg-primary/5 ring-1 ring-primary/20',
        )}
        style={{ paddingLeft: `${depth * 28 + 8}px` }}
        onClick={() => onSelect(task)}
      >
        {/* Expand/Collapse */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}
          className={cn(
            'h-5 w-5 flex items-center justify-center rounded hover:bg-muted shrink-0 transition-transform',
            !hasChildren && 'invisible'
          )}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        {/* Type icon */}
        <span className={cn('shrink-0', getTypeIconColor(task.workItemType))}>
          {getTypeIcon(task.workItemType)}
        </span>

        {/* ID badge */}
        <span className="text-[11px] font-mono text-muted-foreground shrink-0 min-w-[3.5rem]">
          {prefix}-{getShortId(task.id)}
        </span>

        {/* Title */}
        <span className="text-sm truncate flex-1 min-w-0">
          {task.title}
        </span>

        {/* Children count */}
        {hasChildren && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
            {task.children!.length}
          </Badge>
        )}

        {/* Status */}
        <Badge
          variant="secondary"
          className={cn('text-[10px] px-1.5 py-0 shrink-0 hidden sm:inline-flex', TASK_STATUS_COLORS[task.status] || '')}
        >
          {TASK_STATUS_LABELS[task.status]}
        </Badge>

        {/* Priority */}
        <Badge
          variant="secondary"
          className={cn('text-[10px] px-1.5 py-0 shrink-0 hidden md:inline-flex', PRIORITY_COLORS[task.priority] || '')}
        >
          {PRIORITY_LABELS[task.priority]}
        </Badge>

        {/* Sprint name */}
        {task.sprint && (
          <span className="text-[10px] text-muted-foreground shrink-0 hidden lg:inline">
            {task.sprint.name}
          </span>
        )}

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(task); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddChild(task.id, CHILD_TYPE_FOR_PARENT[task.workItemType] || 'task'); }}>
              <CirclePlus className="h-4 w-4 mr-2" />
              Добавить дочерний
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(task); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className={cn('border-l border-border/50', WORK_ITEM_TYPE_BORDER_COLORS[task.workItemType])}>
          {task.children!.map(child => (
            <TreeNode
              key={child.id}
              task={child}
              depth={depth + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              selectedId={selectedId}
              onDelete={onDelete}
              onAddChild={onAddChild}
              projectId={projectId}
            />
          ))}
          {/* Inline add under parent */}
          <div style={{ paddingLeft: `${(depth + 1) * 28 + 8}px` }}>
            <CreateTaskInline
              projectId={projectId}
              parentId={task.id}
              workItemType={CHILD_TYPE_FOR_PARENT[task.workItemType] || 'task'}
              placeholder={`Новый ${WORK_ITEM_TYPE_LABELS[CHILD_TYPE_FOR_PARENT[task.workItemType]] || 'элемент'}...`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function BacklogView() {
  const tasks = useAppStore(s => s.tasks);
  const sprints = useAppStore(s => s.sprints);
  const selectedProjectId = useAppStore(s => s.selectedProjectId);
  const deleteTask = useAppStore(s => s.deleteTask);
  const loading = useAppStore(s => s.loading);

  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sprintFilter, setSprintFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [paneOpen, setPaneOpen] = useState(false);
  const [addingChild, setAddingChild] = useState<{ parentId: string; type: Task['workItemType'] } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Build tree: filter out tasks that have parents (they'll appear as children)
  const rootTasks = useMemo(() => {
    let filtered = tasks.filter(t => !t.parentId);

    if (typeFilter) {
      filtered = filtered.filter(t => t.workItemType === typeFilter);
    }
    if (sprintFilter) {
      filtered = filtered.filter(t => t.sprintId === sprintFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    return filtered;
  }, [tasks, typeFilter, sprintFilter, statusFilter]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (task: Task) => {
    setSelectedTask(task);
    setPaneOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTask) return;
    setDeleting(true);
    try {
      await deleteTask(deletingTask.id);
      toast({ title: 'Элемент удалён' });
      setDeleteOpen(false);
      setDeletingTask(null);
    } catch {
      toast({ title: 'Ошибка', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddChild = (parentId: string, type: Task['workItemType']) => {
    setAddingChild({ parentId, type });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-muted/20 p-3">
        {/* Work item type tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant={typeFilter === null ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setTypeFilter(null)}
          >
            Все
          </Button>
          {WORK_ITEM_TYPES.map(type => (
            <Button
              key={type}
              variant={typeFilter === type ? 'secondary' : 'ghost'}
              size="sm"
              className={cn('h-7 text-xs gap-1.5', typeFilter === type && WORK_ITEM_TYPE_COLORS[type])}
              onClick={() => setTypeFilter(typeFilter === type ? null : type)}
            >
              {getTypeIcon(type)}
              {WORK_ITEM_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Sprint filter */}
          {sprints.length > 0 && (
            <select
              value={sprintFilter || ''}
              onChange={e => setSprintFilter(e.target.value || null)}
              className="h-7 rounded-md border bg-background px-2 text-xs"
            >
              <option value="">Все спринты</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            value={statusFilter || ''}
            onChange={e => setStatusFilter(e.target.value || null)}
            className="h-7 rounded-md border bg-background px-2 text-xs"
          >
            <option value="">Все статусы</option>
            <option value="todo">К выполнению</option>
            <option value="in_progress">В работе</option>
            <option value="review">На проверке</option>
            <option value="done">Готово</option>
          </select>
        </div>
      </div>

      {/* Backlog tree */}
      <div className="rounded-lg border bg-card">
        {rootTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Бэклог пуст. Создайте первый рабочий элемент.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {rootTasks.map(task => (
              <TreeNode
                key={task.id}
                task={task}
                depth={0}
                expanded={expanded}
                toggleExpand={toggleExpand}
                onSelect={handleSelect}
                selectedId={selectedTask?.id || null}
                onDelete={(t) => { setDeletingTask(t); setDeleteOpen(true); }}
                onAddChild={handleAddChild}
                projectId={selectedProjectId || ''}
              />
            ))}
          </div>
        )}

        {/* Bottom inline add for root-level items */}
        {selectedProjectId && (
          <div className="border-t p-2">
            <CreateTaskInline
              projectId={selectedProjectId}
              placeholder="Добавить элемент в бэклог..."
            />
          </div>
        )}
      </div>

      {/* Task detail pane */}
      <TaskDetailPane
        open={paneOpen}
        onOpenChange={(v) => { setPaneOpen(v); if (!v) setSelectedTask(null); }}
        task={selectedTask}
      />

      {/* Delete dialog */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteOpen(false)}>
          <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Удалить элемент?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              «{deletingTask?.title}» и все дочерние элементы будут удалены.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>Отмена</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Удаление...' : 'Удалить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
