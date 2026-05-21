'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { Task, Project, Artifact, Credential, InfrastructureItem } from '@/types';
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
  ARTIFACT_TYPE_LABELS,
  INFRA_TYPE_LABELS,
  INFRA_TYPE_COLORS,
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
  FolderKanban,
  KeyRound,
  Server,
  FolderOpen,
  Shield,
  Database,
  HardDrive,
  Globe,
  Archive,
  Mail,
  FileSignature,
  ClipboardList,
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
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { ArtifactDialog } from '@/components/artifacts/artifact-list';
import { CredentialDialog } from '@/components/credentials/credential-list';
import { InfraDialog } from '@/components/infrastructure/infrastructure-list';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ==================== Tree row helpers ====================

function TreeRow({
  depth,
  hasChildren,
  isExpanded,
  onToggle,
  isSelected,
  onClick,
  icon,
  iconColor,
  idBadge,
  title,
  badges,
  children: rowChildren,
  actions,
  className,
}: {
  depth: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  isSelected?: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  iconColor?: string;
  idBadge?: React.ReactNode;
  title: React.ReactNode;
  badges?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer transition-colors hover:bg-muted/60',
          isSelected && 'bg-primary/5 ring-1 ring-primary/20',
          className,
        )}
        style={{ paddingLeft: `${depth * 28 + 8}px` }}
        onClick={onClick}
      >
        {/* Expand/Collapse toggle */}
        {hasChildren !== undefined ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
            className={cn(
              'h-5 w-5 flex items-center justify-center rounded hover:bg-muted shrink-0 transition-transform',
              !hasChildren && 'invisible',
            )}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <span className="w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Icon */}
        <span className={cn('shrink-0', iconColor)}>{icon}</span>

        {/* ID badge */}
        {idBadge && <span className="text-[11px] font-mono text-muted-foreground shrink-0 min-w-[3.5rem]">{idBadge}</span>}

        {/* Title */}
        <span className="text-sm truncate flex-1 min-w-0">{title}</span>

        {/* Badges */}
        {badges}

        {/* Actions */}
        {actions && (
          <div className="shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Children */}
      {rowChildren}
    </div>
  );
}

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

function getInfraIcon(type: string) {
  const props = { className: 'h-3.5 w-3.5 shrink-0' };
  switch (type) {
    case 'server': return <Server {...props} />;
    case 'database': return <Database {...props} />;
    case 'service': return <Shield {...props} />;
    case 'api': return <Globe {...props} />;
    case 'storage': return <HardDrive {...props} />;
    default: return <Server {...props} />;
  }
}

function getArtifactIcon(type: string) {
  const props = { className: 'h-3.5 w-3.5 shrink-0' };
  switch (type) {
    case 'letter': return <Mail {...props} />;
    case 'contract': return <FileSignature {...props} />;
    case 'report': return <ClipboardList {...props} />;
    default: return <Archive {...props} />;
  }
}

// ==================== Section Node (virtual folder) ====================

type SectionType = 'backlog' | 'credentials' | 'infrastructure' | 'artifacts';

interface SectionNodeProps {
  type: SectionType;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  depth: number;
  children: React.ReactNode;
}

const SECTION_CONFIG: Record<SectionType, { label: string; icon: React.ReactNode; iconColor: string; borderColor: string }> = {
  backlog: {
    label: 'Задачи',
    icon: <FolderOpen className="h-4 w-4 shrink-0" />,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    borderColor: 'border-l-indigo-500',
  },
  credentials: {
    label: 'Учётные записи',
    icon: <KeyRound className="h-4 w-4 shrink-0" />,
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-l-amber-500',
  },
  infrastructure: {
    label: 'Инфраструктура',
    icon: <Server className="h-4 w-4 shrink-0" />,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-l-emerald-500',
  },
  artifacts: {
    label: 'Артефакты',
    icon: <FileText className="h-4 w-4 shrink-0" />,
    iconColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-l-rose-500',
  },
};

function SectionNode({ type, count, isExpanded, onToggle, depth, children }: SectionNodeProps) {
  const config = SECTION_CONFIG[type];
  return (
    <TreeRow
      depth={depth}
      hasChildren={count > 0}
      isExpanded={isExpanded}
      onToggle={onToggle}
      icon={config.icon}
      iconColor={config.iconColor}
      title={
        <span className="font-medium text-sm">{config.label}</span>
      }
      badges={
        count > 0 ? (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
            {count}
          </Badge>
        ) : undefined
      }
      className="bg-muted/10"
    >
      {isExpanded && (
        <div className={cn('border-l border-border/50', config.borderColor)}>
          {count === 0 && (
            <div className="flex items-center justify-center py-4 text-center" style={{ paddingLeft: `${(depth + 1) * 28 + 8}px` }}>
              <p className="text-xs text-muted-foreground">Пусто</p>
            </div>
          )}
          {children}
        </div>
      )}
    </TreeRow>
  );
}

// ==================== Task Tree Node ====================

interface TaskNodeProps {
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

function TaskNode({
  task,
  depth,
  expanded,
  toggleExpand,
  onSelect,
  selectedId,
  onDelete,
  onAddChild,
  projectId,
}: TaskNodeProps) {
  const hasChildren = task.children && task.children.length > 0;
  const isExpanded = expanded.has(task.id);
  const isSelected = selectedId === task.id;
  const prefix = WORK_ITEM_TYPE_PREFIX[task.workItemType] || 'TK';

  return (
    <TreeRow
      depth={depth}
      hasChildren={hasChildren}
      isExpanded={isExpanded}
      onToggle={() => toggleExpand(task.id)}
      isSelected={isSelected}
      onClick={() => onSelect(task)}
      icon={getTypeIcon(task.workItemType)}
      iconColor={getTypeIconColor(task.workItemType)}
      idBadge={`${prefix}-${getShortId(task.id)}`}
      title={task.title}
      badges={
        <>
          {hasChildren && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
              {task.children!.length}
            </Badge>
          )}
          <Badge
            variant="secondary"
            className={cn('text-[10px] px-1.5 py-0 shrink-0 hidden sm:inline-flex', TASK_STATUS_COLORS[task.status] || '')}
          >
            {TASK_STATUS_LABELS[task.status]}
          </Badge>
          <Badge
            variant="secondary"
            className={cn('text-[10px] px-1.5 py-0 shrink-0 hidden md:inline-flex', PRIORITY_COLORS[task.priority] || '')}
          >
            {PRIORITY_LABELS[task.priority]}
          </Badge>
        </>
      }
      actions={
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
      }
    >
      {hasChildren && isExpanded && (
        <>
          {task.children!.map(child => (
            <TaskNode
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
          <div style={{ paddingLeft: `${(depth + 1) * 28 + 8}px` }}>
            <CreateTaskInline
              projectId={projectId}
              parentId={task.id}
              workItemType={CHILD_TYPE_FOR_PARENT[task.workItemType] || 'task'}
              placeholder={`Новый ${WORK_ITEM_TYPE_LABELS[CHILD_TYPE_FOR_PARENT[task.workItemType]] || 'элемент'}...`}
            />
          </div>
        </>
      )}
    </TreeRow>
  );
}

// ==================== Credential Tree Node ====================

interface CredentialNodeProps {
  credential: Credential;
  depth: number;
  onEdit: (c: Credential) => void;
  onDelete: (c: Credential) => void;
}

function CredentialNode({ credential, depth, onEdit, onDelete }: CredentialNodeProps) {
  return (
    <TreeRow
      depth={depth}
      hasChildren={false}
      onClick={() => onEdit(credential)}
      icon={<KeyRound className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />}
      title={
        <div className="flex items-center gap-2">
          <span className="truncate">{credential.service}</span>
          {credential.url && (
            <a
              href={credential.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="h-3 w-3" />
            </a>
          )}
        </div>
      }
      badges={
        <>
          <span className="text-[11px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
            {credential.username}
          </span>
        </>
      }
      actions={
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(credential); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(credential); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}

// ==================== Infrastructure Tree Node ====================

interface InfraNodeProps {
  item: InfrastructureItem;
  depth: number;
  onEdit: (item: InfrastructureItem) => void;
  onDelete: (item: InfrastructureItem) => void;
}

function InfraNode({ item, depth, onEdit, onDelete }: InfraNodeProps) {
  return (
    <TreeRow
      depth={depth}
      hasChildren={false}
      onClick={() => onEdit(item)}
      icon={<span className="text-emerald-500 dark:text-emerald-400">{getInfraIcon(item.type)}</span>}
      title={
        <div className="flex flex-col min-w-0">
          <span className="truncate">{item.name}</span>
          {item.host && (
            <span className="text-[11px] font-mono text-muted-foreground truncate">
              {item.host}{item.port ? `:${item.port}` : ''}
            </span>
          )}
        </div>
      }
      badges={
        <Badge
          variant="secondary"
          className={cn('text-[10px] px-1.5 py-0 shrink-0', INFRA_TYPE_COLORS[item.type] || '')}
        >
          {INFRA_TYPE_LABELS[item.type]}
        </Badge>
      }
      actions={
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(item); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}

// ==================== Artifact Tree Node ====================

interface ArtifactNodeProps {
  artifact: Artifact;
  depth: number;
  onEdit: (a: Artifact) => void;
  onDelete: (a: Artifact) => void;
}

function ArtifactNode({ artifact, depth, onEdit, onDelete }: ArtifactNodeProps) {
  return (
    <TreeRow
      depth={depth}
      hasChildren={false}
      onClick={() => onEdit(artifact)}
      icon={<span className="text-rose-500 dark:text-rose-400">{getArtifactIcon(artifact.type)}</span>}
      title={
        <div className="flex flex-col min-w-0">
          <span className="truncate">{artifact.title}</span>
          {artifact.description && (
            <span className="text-[11px] text-muted-foreground truncate">{artifact.description}</span>
          )}
        </div>
      }
      badges={
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
          {ARTIFACT_TYPE_LABELS[artifact.type]}
        </Badge>
      }
      actions={
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(artifact); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(artifact); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}

// ==================== Project Node ====================

interface ProjectNodeProps {
  project: Project;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  // Backlog
  tasks: Task[];
  taskExpanded: Set<string>;
  toggleTaskExpand: (id: string) => void;
  onSelectTask: (task: Task) => void;
  selectedTaskId: string | null;
  onDeleteTask: (task: Task) => void;
  onAddChild: (parentId: string, type: Task['workItemType']) => void;
  typeFilter: string | null;
  statusFilter: string | null;
  // Credentials
  credentials: Credential[];
  onEditCredential: (c: Credential) => void;
  onDeleteCredential: (c: Credential) => void;
  onAddCredential: () => void;
  // Infrastructure
  infrastructure: InfrastructureItem[];
  onEditInfra: (item: InfrastructureItem) => void;
  onDeleteInfra: (item: InfrastructureItem) => void;
  onAddInfra: () => void;
  // Artifacts
  artifacts: Artifact[];
  onEditArtifact: (a: Artifact) => void;
  onDeleteArtifact: (a: Artifact) => void;
  onAddArtifact: () => void;
}

function ProjectNode({
  project,
  depth,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  tasks,
  taskExpanded,
  toggleTaskExpand,
  onSelectTask,
  selectedTaskId,
  onDeleteTask,
  onAddChild,
  typeFilter,
  statusFilter,
  credentials,
  onEditCredential,
  onDeleteCredential,
  onAddCredential,
  infrastructure,
  onEditInfra,
  onDeleteInfra,
  onAddInfra,
  artifacts,
  onEditArtifact,
  onDeleteArtifact,
  onAddArtifact,
}: ProjectNodeProps) {
  const [expandedSections, setExpandedSections] = useState<Set<SectionType>>(new Set(['backlog']));

  // Apply filters to root tasks
  const filteredRootTasks = useMemo(() => {
    let filtered = tasks;
    if (typeFilter) filtered = filtered.filter(t => t.workItemType === typeFilter);
    if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);
    return filtered;
  }, [tasks, typeFilter, statusFilter]);

  const toggleSection = (section: SectionType) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const totalCount = filteredRootTasks.length + credentials.length + infrastructure.length + artifacts.length;

  return (
    <div>
      <TreeRow
        depth={depth}
        hasChildren={totalCount > 0}
        isExpanded={isExpanded}
        onToggle={onToggle}
        icon={<FolderKanban className="h-4 w-4 shrink-0" />}
        iconColor={undefined}
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{project.name}</span>
            <Badge
              variant="secondary"
              className={cn('text-[10px] px-1.5 py-0', PROJECT_STATUS_COLORS[project.status] || '')}
            >
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
          </div>
        }
        badges={
          totalCount > 0 ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
              {totalCount}
            </Badge>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
        className={cn('rounded-md', isExpanded && 'bg-card border')}
      >
        {isExpanded && (
          <div className="pt-1">
            {/* Backlog section */}
            <SectionNode
              type="backlog"
              count={filteredRootTasks.length}
              isExpanded={expandedSections.has('backlog')}
              onToggle={() => toggleSection('backlog')}
              depth={depth + 1}
            >
              {filteredRootTasks.map(task => (
                <TaskNode
                  key={task.id}
                  task={task}
                  depth={depth + 2}
                  expanded={taskExpanded}
                  toggleExpand={toggleTaskExpand}
                  onSelect={onSelectTask}
                  selectedId={selectedTaskId}
                  onDelete={onDeleteTask}
                  onAddChild={onAddChild}
                  projectId={project.id}
                />
              ))}
              <div style={{ paddingLeft: `${(depth + 2) * 28 + 8}px` }}>
                <CreateTaskInline
                  projectId={project.id}
                  placeholder="Добавить элемент в бэклог..."
                />
              </div>
            </SectionNode>

            {/* Credentials section */}
            <SectionNode
              type="credentials"
              count={credentials.length}
              isExpanded={expandedSections.has('credentials')}
              onToggle={() => toggleSection('credentials')}
              depth={depth + 1}
            >
              {credentials.map(c => (
                <CredentialNode
                  key={c.id}
                  credential={c}
                  depth={depth + 2}
                  onEdit={onEditCredential}
                  onDelete={onDeleteCredential}
                />
              ))}
              <div style={{ paddingLeft: `${(depth + 2) * 28 + 8}px` }}>
                <button
                  onClick={onAddCredential}
                  className="flex items-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Добавить учётную запись
                </button>
              </div>
            </SectionNode>

            {/* Infrastructure section */}
            <SectionNode
              type="infrastructure"
              count={infrastructure.length}
              isExpanded={expandedSections.has('infrastructure')}
              onToggle={() => toggleSection('infrastructure')}
              depth={depth + 1}
            >
              {infrastructure.map(item => (
                <InfraNode
                  key={item.id}
                  item={item}
                  depth={depth + 2}
                  onEdit={onEditInfra}
                  onDelete={onDeleteInfra}
                />
              ))}
              <div style={{ paddingLeft: `${(depth + 2) * 28 + 8}px` }}>
                <button
                  onClick={onAddInfra}
                  className="flex items-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Добавить элемент инфраструктуры
                </button>
              </div>
            </SectionNode>

            {/* Artifacts section */}
            <SectionNode
              type="artifacts"
              count={artifacts.length}
              isExpanded={expandedSections.has('artifacts')}
              onToggle={() => toggleSection('artifacts')}
              depth={depth + 1}
            >
              {artifacts.map(a => (
                <ArtifactNode
                  key={a.id}
                  artifact={a}
                  depth={depth + 2}
                  onEdit={onEditArtifact}
                  onDelete={onDeleteArtifact}
                />
              ))}
              <div style={{ paddingLeft: `${(depth + 2) * 28 + 8}px` }}>
                <button
                  onClick={onAddArtifact}
                  className="flex items-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Добавить артефакт
                </button>
              </div>
            </SectionNode>
          </div>
        )}
      </TreeRow>
    </div>
  );
}

// ==================== Unified Backlog ====================

export function UnifiedBacklog() {
  const projects = useAppStore(s => s.projects);
  const tasks = useAppStore(s => s.tasks);
  const artifacts = useAppStore(s => s.artifacts);
  const credentials = useAppStore(s => s.credentials);
  const infrastructure = useAppStore(s => s.infrastructure);
  const expandedProjects = useAppStore(s => s.expandedProjects);
  const toggleProject = useAppStore(s => s.toggleProject);
  const deleteProject = useAppStore(s => s.deleteProject);
  const selectProjectContext = useAppStore(s => s.selectProjectContext);
  const deleteTask = useAppStore(s => s.deleteTask);
  const deleteCredential = useAppStore(s => s.deleteCredential);
  const deleteArtifact = useAppStore(s => s.deleteArtifact);
  const deleteInfrastructure = useAppStore(s => s.deleteInfrastructure);
  const loading = useAppStore(s => s.loading);
  const { toast } = useToast();

  const [typeFilter, setTypeFilter] = useState<string | null>(null);
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

  // Credential dialog state
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [createCredentialOpen, setCreateCredentialOpen] = useState(false);
  const [createCredProjectId, setCreateCredProjectId] = useState<string | null>(null);

  // Infra dialog state
  const [editingInfra, setEditingInfra] = useState<InfrastructureItem | null>(null);
  const [createInfraOpen, setCreateInfraOpen] = useState(false);
  const [createInfraProjectId, setCreateInfraProjectId] = useState<string | null>(null);

  // Artifact dialog state
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [createArtifactOpen, setCreateArtifactOpen] = useState(false);
  const [createArtifactProjectId, setCreateArtifactProjectId] = useState<string | null>(null);

  // Delete confirmation for non-task items
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'credential' | 'infra' | 'artifact'; id: string } | null>(null);
  const [deletingTarget, setDeletingTarget] = useState(false);

  // Group tasks by project (root tasks only)
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

  // Group credentials by project
  const credentialsByProject = useMemo(() => {
    const map: Record<string, Credential[]> = {};
    for (const c of credentials) {
      if (!map[c.projectId]) map[c.projectId] = [];
      map[c.projectId].push(c);
    }
    return map;
  }, [credentials]);

  // Group infrastructure by project
  const infraByProject = useMemo(() => {
    const map: Record<string, InfrastructureItem[]> = {};
    for (const i of infrastructure) {
      if (!map[i.projectId]) map[i.projectId] = [];
      map[i.projectId].push(i);
    }
    return map;
  }, [infrastructure]);

  // Group artifacts by project
  const artifactsByProject = useMemo(() => {
    const map: Record<string, Artifact[]> = {};
    for (const a of artifacts) {
      if (!map[a.projectId]) map[a.projectId] = [];
      map[a.projectId].push(a);
    }
    return map;
  }, [artifacts]);

  const toggleTaskExpand = (id: string) => {
    setTaskExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectTask = async (task: Task) => {
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
    toggleTaskExpand(parentId);
  };

  const handleDeleteTarget = async () => {
    if (!deleteTarget) return;
    setDeletingTarget(true);
    try {
      if (deleteTarget.type === 'credential') {
        await deleteCredential(deleteTarget.id);
        toast({ title: 'Запись удалена' });
      } else if (deleteTarget.type === 'infra') {
        await deleteInfrastructure(deleteTarget.id);
        toast({ title: 'Элемент удалён' });
      } else if (deleteTarget.type === 'artifact') {
        await deleteArtifact(deleteTarget.id);
        toast({ title: 'Артефакт удалён' });
      }
      setDeleteTarget(null);
    } catch {
      toast({ title: 'Ошибка', variant: 'destructive' });
    } finally {
      setDeletingTarget(false);
    }
  };

  // Credential handlers
  const handleEditCredential = async (c: Credential) => {
    await selectProjectContext(c.projectId);
    setEditingCredential(c);
  };
  const handleAddCredential = async (projectId: string) => {
    await selectProjectContext(projectId);
    setCreateCredProjectId(projectId);
    setCreateCredentialOpen(true);
  };

  // Infra handlers
  const handleEditInfra = async (item: InfrastructureItem) => {
    await selectProjectContext(item.projectId);
    setEditingInfra(item);
  };
  const handleAddInfra = async (projectId: string) => {
    await selectProjectContext(projectId);
    setCreateInfraProjectId(projectId);
    setCreateInfraOpen(true);
  };

  // Artifact handlers
  const handleEditArtifact = async (a: Artifact) => {
    await selectProjectContext(a.projectId);
    setEditingArtifact(a);
  };
  const handleAddArtifact = async (projectId: string) => {
    await selectProjectContext(projectId);
    setCreateArtifactProjectId(projectId);
    setCreateArtifactOpen(true);
  };

  // Filter projects if filters are active (only check task data)
  const visibleProjectIds = useMemo(() => {
    if (!typeFilter && !statusFilter) {
      return new Set(projects.map(p => p.id));
    }
    const ids = new Set<string>();
    for (const t of tasks) {
      if (!t.parentId) {
        let match = true;
        if (typeFilter && t.workItemType !== typeFilter) match = false;
        if (statusFilter && t.status !== statusFilter) match = false;
        if (match) ids.add(t.projectId);
      }
    }
    // Always show projects that have other data even if no matching tasks
    for (const c of credentials) ids.add(c.projectId);
    for (const i of infrastructure) ids.add(i.projectId);
    for (const a of artifacts) ids.add(a.projectId);
    return ids;
  }, [projects, tasks, typeFilter, statusFilter, credentials, infrastructure, artifacts]);

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
        <h1 className="text-2xl font-bold tracking-tight">Проекты</h1>
        <p className="text-muted-foreground">
          Все проекты и связанные данные в едином дереве
        </p>
      </div>

      {/* Filter bar — only for task filtering */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-muted/20 p-3">
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant={typeFilter === null ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setTypeFilter(null)}
          >
            Все типы
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
      <div className="space-y-2">
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
            return (
              <ProjectNode
                key={project.id}
                project={project}
                depth={0}
                isExpanded={expandedProjects.has(project.id)}
                onToggle={() => toggleProject(project.id)}
                onEdit={() => setEditProject(project)}
                onDelete={() => setDeleteProjectId(project.id)}
                tasks={tasksByProject[project.id] || []}
                taskExpanded={taskExpanded}
                toggleTaskExpand={toggleTaskExpand}
                onSelectTask={handleSelectTask}
                selectedTaskId={selectedTask?.id || null}
                onDeleteTask={(t) => { setDeletingTask(t); setDeleteOpen(true); }}
                onAddChild={handleAddChild}
                typeFilter={typeFilter}
                statusFilter={statusFilter}
                credentials={credentialsByProject[project.id] || []}
                onEditCredential={handleEditCredential}
                onDeleteCredential={(c) => setDeleteTarget({ type: 'credential', id: c.id })}
                onAddCredential={() => handleAddCredential(project.id)}
                infrastructure={infraByProject[project.id] || []}
                onEditInfra={handleEditInfra}
                onDeleteInfra={(item) => setDeleteTarget({ type: 'infra', id: item.id })}
                onAddInfra={() => handleAddInfra(project.id)}
                artifacts={artifactsByProject[project.id] || []}
                onEditArtifact={handleEditArtifact}
                onDeleteArtifact={(a) => setDeleteTarget({ type: 'artifact', id: a.id })}
                onAddArtifact={() => handleAddArtifact(project.id)}
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

      {/* Credential dialogs */}
      <CredentialDialog
        open={createCredentialOpen}
        onOpenChange={(v) => { setCreateCredentialOpen(v); if (!v) setCreateCredProjectId(null); }}
        mode="create"
      />
      {editingCredential && (
        <CredentialDialog
          open={!!editingCredential}
          onOpenChange={(v) => { if (!v) setEditingCredential(null); }}
          mode="edit"
          credential={editingCredential}
        />
      )}

      {/* Infrastructure dialogs */}
      <InfraDialog
        open={createInfraOpen}
        onOpenChange={(v) => { setCreateInfraOpen(v); if (!v) setCreateInfraProjectId(null); }}
        mode="create"
      />
      {editingInfra && (
        <InfraDialog
          open={!!editingInfra}
          onOpenChange={(v) => { if (!v) setEditingInfra(null); }}
          mode="edit"
          item={editingInfra}
        />
      )}

      {/* Artifact dialogs */}
      <ArtifactDialog
        open={createArtifactOpen}
        onOpenChange={(v) => { setCreateArtifactOpen(v); if (!v) setCreateArtifactProjectId(null); }}
        mode="create"
      />
      {editingArtifact && (
        <ArtifactDialog
          open={!!editingArtifact}
          onOpenChange={(v) => { if (!v) setEditingArtifact(null); }}
          mode="edit"
          artifact={editingArtifact}
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

      {/* Delete non-task item dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteTarget(null)}>
          <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Удалить?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Элемент будет удалён без возможности восстановления.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Отмена</Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteTarget} disabled={deletingTarget}>
                {deletingTarget ? 'Удаление...' : 'Удалить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
