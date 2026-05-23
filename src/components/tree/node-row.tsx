'use client';

import { useState, useCallback } from 'react';
import type { ProjectNode } from '@/types';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { openExportTable } from '@/lib/export-table';
import {
  BRANCH_TYPE_LABELS,
  BRANCH_TYPE_COLORS,
} from '@/lib/constants';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FolderKanban,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  CirclePlus,
  Download,
  CheckSquare,
  KeyRound,
  Server,
  X,
  GripVertical,
  Copy,
} from 'lucide-react';

const BRANCH_BORDER_COLORS: Record<string, string> = {
  tasks: 'border-l-indigo-400',
  infrastructure: 'border-l-emerald-400',
  credentials: 'border-l-amber-400',
  artifacts: 'border-l-rose-400',
};

const BRANCH_TYPE_ICON_MAP: Record<string, React.ReactNode> = {
  tasks: <CheckSquare className="h-3.5 w-3.5" />,
  infrastructure: <Server className="h-3.5 w-3.5" />,
  credentials: <KeyRound className="h-3.5 w-3.5" />,
  artifacts: <FileText className="h-3.5 w-3.5" />,
};

interface NodeRowProps {
  node: ProjectNode;
  depth: number;
  projectId: string;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  selectedNodeId: string | null;
  onSelectNode: (node: ProjectNode) => void;
  onEditNode: (node: ProjectNode) => void;
  onDeleteNode: (node: ProjectNode) => void;
  onReload: () => Promise<void>;
}

export function NodeRow({
  node,
  depth,
  projectId,
  expanded,
  toggleExpand,
  selectedNodeId,
  onSelectNode,
  onEditNode,
  onDeleteNode,
  onReload,
}: NodeRowProps) {
  const { toast } = useToast();
  const createNode = useAppStore((s) => s.createNode);

  const isBranch = node.nodeType === 'branch';
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const children = node.children ?? [];
  const childCount = children.length;

  const [isAddingChild, setIsAddingChild] = useState(false);
  const [addChildType, setAddChildType] = useState<'branch' | 'item'>('item');
  const [newChildName, setNewChildName] = useState('');
  const [duplicating, setDuplicating] = useState(false);

  const borderColor = isBranch && node.branchType
    ? BRANCH_BORDER_COLORS[node.branchType]
    : undefined;

  // DnD: Draggable
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: node.id,
    data: { type: 'node', nodeType: node.nodeType, id: node.id },
  });

  // DnD: Droppable (for branches only)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: node.id,
    data: { type: 'branch', id: node.id },
    disabled: !isBranch,
  });

  // Merge refs for draggable + droppable
  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setDraggableRef(el);
      if (isBranch) setDroppableRef(el);
    },
    [setDraggableRef, setDroppableRef, isBranch],
  );

  const rowStyle: React.CSSProperties = {
    paddingLeft: `${depth * 28 + 8}px`,
    ...(transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          opacity: isDragging ? 0.5 : 1,
          zIndex: isDragging ? 1000 : undefined,
        }
      : {}),
  };

  const handleExport = async () => {
    try {
      const data = await api.exportBranch(node.id);
      openExportTable(data.branchName, data.columns, data.rows);
    } catch {
      toast({
        title: 'Ошибка экспорта',
        description: 'Не удалось экспортировать ветку',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      await api.duplicateNode(node.id);
      await onReload();
      toast({ title: 'Узел дублирован' });
    } catch {
      toast({
        title: 'Ошибка дублирования',
        description: 'Не удалось создать копию узла',
        variant: 'destructive',
      });
    } finally {
      setDuplicating(false);
    }
  };

  const handleConfirmDelete = () => {
    onDeleteNode(node);
  };

  const handleSubmitNewChild = async () => {
    const name = newChildName.trim();
    if (!name) return;
    try {
      await createNode({
        projectId,
        parentId: node.id,
        name,
        nodeType: addChildType,
        branchType: addChildType === 'branch' ? null : undefined,
        fields: {},
      });
      setNewChildName('');
      setIsAddingChild(false);
      toast({ title: addChildType === 'branch' ? 'Ветка создана' : 'Элемент создан' });
    } catch {
      toast({
        title: 'Ошибка создания',
        description: 'Не удалось создать узел',
        variant: 'destructive',
      });
    }
  };

  const handleCancelAddChild = () => {
    setIsAddingChild(false);
    setNewChildName('');
  };

  const fieldEntries = Object.entries(node.fields).slice(0, 3);

  return (
    <>
      <div
        ref={mergedRef}
        style={rowStyle}
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer',
          'hover:bg-accent/50',
          isSelected && 'bg-accent',
          borderColor && `border-l-2 ${borderColor}`,
          isOver && isBranch && 'ring-2 ring-primary/50 ring-offset-1',
          isDragging && 'shadow-lg',
        )}
        onClick={() => onSelectNode(node)}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Expand/collapse chevron */}
        {isBranch ? (
          <button
            className="shrink-0 flex items-center justify-center h-5 w-5 rounded hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="shrink-0 w-5" />
        )}

        {/* Icon */}
        {isBranch ? (
          node.branchType && BRANCH_TYPE_ICON_MAP[node.branchType] ? (
            <span className={cn('shrink-0', BRANCH_TYPE_COLORS[node.branchType] || 'text-muted-foreground')}>
              {BRANCH_TYPE_ICON_MAP[node.branchType]}
            </span>
          ) : isExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        {/* Name */}
        <span className="truncate font-medium flex-1 min-w-0">{node.name}</span>

        {/* Branch type badge */}
        {isBranch && node.branchType && BRANCH_TYPE_LABELS[node.branchType] && (
          <Badge variant="secondary" className="text-xs shrink-0 hidden sm:inline-flex">
            {BRANCH_TYPE_LABELS[node.branchType]}
          </Badge>
        )}

        {/* Field value badges for items */}
        {!isBranch && fieldEntries.length > 0 && (
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {fieldEntries.map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-xs max-w-[120px] truncate">
                <span className="text-muted-foreground mr-1">{key}:</span>
                {String(value ?? '').slice(0, 20)}
              </Badge>
            ))}
          </div>
        )}

        {/* Child count badge for branches */}
        {isBranch && childCount > 0 && (
          <Badge variant="outline" className="text-xs shrink-0 tabular-nums">
            {childCount}
          </Badge>
        )}

        {/* Action buttons (visible on hover) */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {isBranch && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport();
                }}
                title="Экспорт в таблицу"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddChildType('branch');
                  setIsAddingChild(true);
                  if (!isExpanded) toggleExpand(node.id);
                }}
                title="Добавить ветку"
              >
                <FolderKanban className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddChildType('item');
                  setIsAddingChild(true);
                  if (!isExpanded) toggleExpand(node.id);
                }}
                title="Добавить элемент"
              >
                <FileText className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEditNode(node);
                }}
              >
                <Pencil className="h-4 w-4" />
                Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate();
                }}
                disabled={duplicating}
              >
                <Copy className="h-4 w-4" />
                {duplicating ? 'Дублирование...' : 'Дублировать'}
              </DropdownMenuItem>
              {isBranch && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddChildType('branch');
                      setIsAddingChild(true);
                      if (!isExpanded) toggleExpand(node.id);
                    }}
                  >
                    <FolderKanban className="h-4 w-4" />
                    Добавить ветку
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddChildType('item');
                      setIsAddingChild(true);
                      if (!isExpanded) toggleExpand(node.id);
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Добавить элемент
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport();
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Экспорт
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Children */}
      {isBranch && isExpanded && (
        <div>
          {children
            .sort((a, b) => a.order - b.order)
            .map((child) => (
              <NodeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                projectId={projectId}
                expanded={expanded}
                toggleExpand={toggleExpand}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
                onEditNode={onEditNode}
                onDeleteNode={onDeleteNode}
                onReload={onReload}
              />
            ))}

          {/* Inline add child */}
          {isAddingChild && (
            <div
              className="flex items-center gap-1.5 px-2 py-1"
              style={{ paddingLeft: `${(depth + 1) * 28 + 8}px` }}
            >
              {addChildType === 'branch' ? (
                <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <Input
                autoFocus
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitNewChild();
                  if (e.key === 'Escape') handleCancelAddChild();
                }}
                placeholder={addChildType === 'branch' ? 'Название ветки...' : 'Название элемента...'}
                className="h-7 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleSubmitNewChild}
                disabled={!newChildName.trim()}
              >
                <CirclePlus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleCancelAddChild}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Subtle + button for adding child at the end */}
          {!isAddingChild && (
            <div
              className="flex items-center gap-1 px-2 py-0.5"
              style={{ paddingLeft: `${(depth + 1) * 28 + 8}px` }}
            >
              <span className="w-5 shrink-0" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setAddChildType('item');
                  setIsAddingChild(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Добавить элемент
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setAddChildType('branch');
                  setIsAddingChild(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Добавить ветку
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
