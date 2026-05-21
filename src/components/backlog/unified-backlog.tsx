'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { Task, Project } from '@/types';
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
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
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
  FolderOpen,
  FolderClosed,
  FileText as FileTextIcon,
  KeyRound,
  Server,
  FolderKanban,
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
// Collapsible removed — using conditional render instead
import { TaskDetailPane } from '@/components/tasks/task-detail-pane';
import { CreateTaskInline } from '@/components/tasks/create-task-inline';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { ArtifactList } from '@/components/artifacts/artifact-list';
import { CredentialList } from '@/components/credentials/credential-list';
import { InfrastructureList } from '@/components/infrastructure/infrastructure-list';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ==================== Task type icon helpers ====================

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

// ==================== Task Tree Node ====================

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

// ==================== Project Node ====================

interface ProjectNodeProps {
  project: Project;
  tasks: Task[];
  artifactCount: number;
  credentialCount: number;
  infraCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  taskExpanded: Set<string>;
  toggleTaskExpand: (id: string) => void;
  onSelectTask: (task: Task) => void;
  selectedTaskId: string | null;
  onDeleteTask: (task: Task) => void;
  onAddChild: (parentId: string, type: Task['workItemType']) => void;
  showSecondary: string | null;
  onToggleSecondary: (key: string | null) => void;
  typeFilter: string | null;
  sprintFilter: string | null;
  statusFilter: string | null;
}

function ProjectNode({
  project,
  tasks,
  artifactCount,
  credentialCount,
  infraCount,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  taskExpanded,
  toggleTaskExpand,
  onSelectTask,
  selectedTaskId,
  onDeleteTask,
  onAddChild,
  showSecondary,
  onToggleSecondary,
  typeFilter,
  sprintFilter,
  statusFilter,
}: ProjectNodeProps) {
  // Apply filters to root tasks
  const rootTasks = useMemo(() => {
    let filtered = tasks;
    if (typeFilter) filtered = filtered.filter(t => t.workItemType === typeFilter);
    if (sprintFilter) filtered = filtered.filter(t => t.sprintId === sprintFilter);
    if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);
    return filtered;
  }, [tasks, typeFilter, sprintFilter, statusFilter]);

  const hasSecondary = artifactCount > 0 || credentialCount > 0 || infraCount > 0;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Project header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        style={{ borderLeft: `4px solid ${project.color}` }}
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{project.name}</span>
            <Badge
              variant="secondary"
              className={cn('text-[10px] px-1.5 py-0', PROJECT_STATUS_COLORS[project.status] || '')}
            >
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? 'задача' : tasks.length >= 2 && tasks.length <= 4 ? 'задачи' : 'задач'}
            </span>
          </div>
        </div>

        {/* Project actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Project content */}
      {isExpanded && (
        <div className="border-t">
            {/* Task tree */}
            <div className="divide-y divide-border/50">
              {rootTasks.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {typeFilter || sprintFilter || statusFilter
                      ? 'Нет элементов, соответствующих фильтрам'
                      : 'Бэклог пуст. Создайте первый рабочий элемент.'}
                  </p>
                </div>
              ) : (
                rootTasks.map(task => (
                  <TreeNode
                    key={task.id}
                    task={task}
                    depth={0}
                    expanded={taskExpanded}
                    toggleExpand={toggleTaskExpand}
                    onSelect={onSelectTask}
                    selectedId={selectedTaskId}
                    onDelete={onDeleteTask}
                    onAddChild={onAddChild}
                    projectId={project.id}
                  />
                ))
              )}
            </div>

            {/* Bottom inline add for root-level tasks */}
            <div className="border-t p-2">
              <CreateTaskInline
                projectId={project.id}
                placeholder="Добавить элемент в бэклог..."
              />
            </div>

            {/* Secondary data sections */}
            {hasSecondary && (
              <div className="border-t">
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/20 flex-wrap">
                  {artifactCount > 0 && (
                    <button
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors',
                        showSecondary === 'artifacts' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSecondary(showSecondary === 'artifacts' ? null : 'artifacts');
                      }}
                    >
                      <FileTextIcon className="h-3.5 w-3.5" />
                      Артефакты ({artifactCount})
                    </button>
                  )}
                  {credentialCount > 0 && (
                    <button
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors',
                        showSecondary === 'credentials' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSecondary(showSecondary === 'credentials' ? null : 'credentials');
                      }}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Учётные записи ({credentialCount})
                    </button>
                  )}
                  {infraCount > 0 && (
                    <button
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors',
                        showSecondary === 'infrastructure' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSecondary(showSecondary === 'infrastructure' ? null : 'infrastructure');
                      }}
                    >
                      <Server className="h-3.5 w-3.5" />
                      Инфраструктура ({infraCount})
                    </button>
                  )}
                </div>

                {/* Inline secondary list */}
                {showSecondary && (
                  <div className="px-4 py-3 bg-muted/10 border-t">
                    {showSecondary === 'artifacts' && <ArtifactList />}
                    {showSecondary === 'credentials' && <CredentialList />}
                    {showSecondary === 'infrastructure' && <InfrastructureList />}
                  </div>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// ==================== Unified Backlog ====================

export function UnifiedBacklog() {
  const projects = useAppStore(s => s.projects);
  const tasks = useAppStore(s => s.tasks);
  const sprints = useAppStore(s => s.sprints);
  const artifacts = useAppStore(s => s.artifacts);
  const credentials = useAppStore(s => s.credentials);
  const infrastructure = useAppStore(s => s.infrastructure);
  const expandedProjects = useAppStore(s => s.expandedProjects);
  const toggleProject = useAppStore(s => s.toggleProject);
  const deleteProject = useAppStore(s => s.deleteProject);
  const selectProjectContext = useAppStore(s => s.selectProjectContext);
  const deleteTask = useAppStore(s => s.deleteTask);
  const loading = useAppStore(s => s.loading);

  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sprintFilter, setSprintFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [taskExpanded, setTaskExpanded] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [paneOpen, setPaneOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [secondarySection, setSecondarySection] = useState<{ projectId: string; key: string } | null>(null);

  const { toast } = useToast();

  // Group tasks by project (only root tasks)
  const tasksByProject = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!t.parentId) {
        if (!map[t.projectId]) map[t.projectId] = [];
        map[t.projectId].push(t);
      }
    }
    return map;
  }, [tasks]);

  // Count secondary data per project
  const artifactCounts = useMemo(() => {
    const map: Record<string, number> = {};
    // Use all artifacts from store — loadAllData puts them all there
    // For per-project counts we need to know: we load artifacts from all-data API
    // The all-data response includes artifacts from all projects
    // But the store's `artifacts` is set to ALL artifacts from loadAllData
    // Actually looking at the store, loadAllData sets artifacts from the API response
    // The API returns ALL artifacts. So store.artifacts has all.
    // We can count them by projectId.
    return map;
  }, []);

  const toggleTaskExpand = (id: string) => {
    setTaskExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectTask = async (task: Task) => {
    // Set project context so detail pane can use the right sprints/categories
    await selectProjectContext(task.projectId);
    setSelectedTask(task);
    setPaneOpen(true);
  };

  const handleDeleteTask = async () => {
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

  const handleDeleteProject = async () => {
    if (!deleteProjectId) return;
    setDeletingProject(true);
    try {
      await deleteProject(deleteProjectId);
      toast({ title: 'Проект удалён' });
      setDeleteProjectId(null);
    } catch {
      toast({ title: 'Ошибка', variant: 'destructive' });
    } finally {
      setDeletingProject(false);
    }
  };

  const handleAddChild = (parentId: string, type: Task['workItemType']) => {
    // Just expand the parent so inline form shows
    toggleTaskExpand(parentId);
  };

  const handleToggleSecondary = (projectId: string, key: string) => {
    if (secondarySection?.projectId === projectId && secondarySection?.key === key) {
      setSecondarySection(null);
    } else {
      setSecondarySection({ projectId, key });
      selectProjectContext(projectId);
    }
  };

  // Filter projects to only show those with matching tasks (if filters are active)
  const visibleProjectIds = useMemo(() => {
    if (!typeFilter && !sprintFilter && !statusFilter) {
      return new Set(projects.map(p => p.id));
    }
    // If filters are active, check if project has any matching tasks
    const ids = new Set<string>();
    for (const t of tasks) {
      if (!t.parentId) {
        let match = true;
        if (typeFilter && t.workItemType !== typeFilter) match = false;
        if (sprintFilter && t.sprintId !== sprintFilter) match = false;
        if (statusFilter && t.status !== statusFilter) match = false;
        if (match) ids.add(t.projectId);
      }
    }
    return ids;
  }, [projects, tasks, typeFilter, sprintFilter, statusFilter]);

  // Count artifacts/credentials/infra per project from the unified data
  // We need these counts - the store has all of them from loadAllData
  // But currently artifacts/credentials/infrastructure are set from loadAllData as ALL items
  // So we count them by projectId here
  const allArtifactCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of artifacts) {
      map[a.projectId] = (map[a.projectId] || 0) + 1;
    }
    return map;
  }, [artifacts]);

  const allCredentialCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of credentials) {
      map[c.projectId] = (map[c.projectId] || 0) + 1;
    }
    return map;
  }, [credentials]);

  const allInfraCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of infrastructure) {
      map[i.projectId] = (map[i.projectId] || 0) + 1;
    }
    return map;
  }, [infrastructure]);

  if (loading && projects.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const deleteTargetProject = projects.find(p => p.id === deleteProjectId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Бэклог</h1>
        <p className="text-muted-foreground">
          Все проекты и задачи в одном виде
        </p>
      </div>

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

      {/* Project tree */}
      <div className="space-y-3">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border bg-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <FolderKanban className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">Проектов пока нет</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Создайте первый проект для начала работы
            </p>
            <Button onClick={() => setCreateProjectOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Создать проект
            </Button>
          </div>
        ) : (
          projects.map(project => {
            if (!visibleProjectIds.has(project.id)) return null;
            const projectTasks = tasksByProject[project.id] || [];
            return (
              <ProjectNode
                key={project.id}
                project={project}
                tasks={projectTasks}
                artifactCount={allArtifactCount[project.id] || 0}
                credentialCount={allCredentialCount[project.id] || 0}
                infraCount={allInfraCount[project.id] || 0}
                isExpanded={expandedProjects.has(project.id)}
                onToggle={() => toggleProject(project.id)}
                onEdit={() => setEditProject(project)}
                onDelete={() => setDeleteProjectId(project.id)}
                taskExpanded={taskExpanded}
                toggleTaskExpand={toggleTaskExpand}
                onSelectTask={handleSelectTask}
                selectedTaskId={selectedTask?.id || null}
                onDeleteTask={(t) => { setDeletingTask(t); setDeleteOpen(true); }}
                onAddChild={handleAddChild}
                showSecondary={
                  secondarySection?.projectId === project.id
                    ? secondarySection.key
                    : null
                }
                onToggleSecondary={(key) => handleToggleSecondary(project.id, key || '')}
                typeFilter={typeFilter}
                sprintFilter={sprintFilter}
                statusFilter={statusFilter}
              />
            );
          })
        )}
      </div>

      {/* New project button */}
      {projects.length > 0 && (
        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={() => setCreateProjectOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Новый проект
          </Button>
        </div>
      )}

      {/* Task detail pane */}
      <TaskDetailPane
        open={paneOpen}
        onOpenChange={(v) => { setPaneOpen(v); if (!v) setSelectedTask(null); }}
        task={selectedTask}
      />

      {/* Create project dialog */}
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
      />
      {editProject && (
        <CreateProjectDialog
          open={!!editProject}
          onOpenChange={(v) => { if (!v) setEditProject(null); }}
          mode="edit"
          initialData={{
            id: editProject.id,
            name: editProject.name,
            description: editProject.description,
            color: editProject.color,
            status: editProject.status,
          }}
        />
      )}

      {/* Delete task dialog */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteOpen(false)}>
          <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Удалить элемент?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              «{deletingTask?.title}» и все дочерние элементы будут удалены.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>Отмена</Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteTask} disabled={deleting}>
                {deleting ? 'Удаление...' : 'Удалить'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete project dialog */}
      {deleteProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteProjectId(null)}>
          <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Удалить проект?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Проект «{deleteTargetProject?.name}» и все связанные данные будут удалены без возможности восстановления.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteProjectId(null)}>Отмена</Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteProject} disabled={deletingProject}>
                {deletingProject ? 'Удаление...' : 'Удалить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
