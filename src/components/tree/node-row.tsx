'use client';

import { useState, useCallback } from 'react';
import type { ProjectNode } from '@/types';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { openExportTable } from '@/lib/export-table';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import {
  BRANCH_TYPE_LABELS,
  BRANCH_TYPE_COLORS,
} from '@/lib/constants';
import type { ElementType } from '@/types';
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
  CircleDot,
  ListTodo,
  ClipboardList,
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
  const updateNode = useAppStore((s) => s.updateNode);
  const elementTypes = useAppStore((s) => s.elementTypes);
  const taskTypes = useAppStore((s) => s.taskTypes);

  const isBranch = node.nodeType === 'branch';
  const isTask = node.nodeType === 'task';
  const isProtocol = node.nodeType === 'protocol';
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const children = node.children ?? [];
  const childCount = children.length;

  const [isAddingChild, setIsAddingChild] = useState(false);
  const [addChildType, setAddChildType] = useState<'branch' | 'item' | 'task' | 'protocol'>('item');
  const [selectedElementTypeId, setSelectedElementTypeId] = useState<string | null>(null);
  const [selectedTaskTypeId, setSelectedTaskTypeId] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [togglingComplete, setTogglingComplete] = useState(false);

  const borderColor = isBranch && node.branchType
    ? BRANCH_BORDER_COLORS[node.branchType]
    : undefined;

  // Task type color
  const taskType = isTask && node.taskTypeId
    ? taskTypes.find((t) => t.id === node.taskTypeId)
    : null;

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

  const handleToggleComplete = async () => {
    if (!isTask) return;
    setTogglingComplete(true);
    try {
      await updateNode(node.id, { completed: !node.completed });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось обновить задачу', variant: 'destructive' });
    } finally {
      setTogglingComplete(false);
    }
  };

  const handleConfirmDelete = () => {
    onDeleteNode(node);
  };

  const handleExportProtocol = () => {
    if (!isProtocol) return;
    const f = node.fields;
    const text = typeof f.protocolText === 'string' ? f.protocolText : '';
    const decs = Array.isArray(f.decisions) ? f.decisions : [];

    const decisionsRows = decs.map((d: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${String(d.task || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          <td>${String(d.deadline || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          <td>${String(d.responsible || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          <td>${String(d.comment || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${node.name.replace(/</g, '&lt;')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a2e; background: #f8f9fa; }
    .container { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); padding: 48px; }
    h1 { font-size: 24px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; border-bottom: 3px solid #3b82f6; padding-bottom: 12px; }
    .date { font-size: 13px; color: #64748b; margin-bottom: 32px; }
    .section-title { font-size: 16px; font-weight: 600; color: #334155; margin: 28px 0 12px 0; }
    .description { font-size: 14px; line-height: 1.7; color: #475569; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
    thead th { background: #f1f5f9; color: #334155; font-weight: 600; text-align: left; padding: 10px 14px; border-bottom: 2px solid #e2e8f0; }
    thead th:first-child { text-align: center; width: 40px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #475569; vertical-align: top; }
    tbody td:first-child { text-align: center; color: #94a3b8; font-weight: 500; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #f8fafc; }
    .no-decisions { color: #94a3b8; font-style: italic; font-size: 14px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: right; }
    @media print { body { padding: 0; background: #fff; } .container { box-shadow: none; padding: 20px; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>${node.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
    <div class="date">${node.createdAt ? new Date(node.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}</div>

    ${text ? `<div class="section-title">Описание</div>
    <div class="description">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}

    <div class="section-title">Решения</div>
    ${decs.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Задача / Решение</th>
          <th>Срок</th>
          <th>Ответственный</th>
          <th>Комментарий</th>
        </tr>
      </thead>
      <tbody>${decisionsRows}
      </tbody>
    </table>` : '<p class="no-decisions">Нет решений</p>'}

    <div class="footer">ProjectHub</div>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=960,height=700,scrollbars=yes');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handleStartAddChild = (type: 'branch' | 'item' | 'task' | 'protocol') => {
    setAddChildType(type);
    setSelectedElementTypeId(null);
    setSelectedTaskTypeId(null);
    if (!isExpanded) toggleExpand(node.id);
    if (type === 'protocol') {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      setNewChildName(`Протокол от ${dd}.${mm}.${yyyy}`);
    } else {
      setNewChildName('');
    }
    setIsAddingChild(true);
  };

  const handleSubmitNewChild = async () => {
    const name = newChildName.trim();
    if (!name) return;
    try {
      let fields: Record<string, unknown> = {};
      let elementTypeId: string | null = null;
      let taskTypeId: string | null = null;

      if (addChildType === 'item' && selectedElementTypeId) {
        const et = elementTypes.find((t) => t.id === selectedElementTypeId);
        if (et) {
          elementTypeId = et.id;
          for (const f of et.fields) {
            fields[f.key] = f.defaultValue;
          }
        }
      }
      if (addChildType === 'task' && selectedTaskTypeId) {
        taskTypeId = selectedTaskTypeId;
      }
      if (addChildType === 'protocol') {
        fields = { protocolText: '', decisions: [] };
      }

      await createNode({
        projectId,
        parentId: node.id,
        name,
        nodeType: addChildType,
        elementTypeId,
        taskTypeId,
        fields,
      });
      setNewChildName('');
      setSelectedElementTypeId(null);
      setSelectedTaskTypeId(null);
      setIsAddingChild(false);
      const labels: Record<string, string> = { branch: 'Ветка создана', item: 'Элемент создан', task: 'Задача создана', protocol: 'Протокол создан' };
      toast({ title: labels[addChildType] || 'Создано' });
    } catch {
      toast({ title: 'Ошибка создания', description: 'Не удалось создать узел', variant: 'destructive' });
    }
  };

  const handleCancelAddChild = () => {
    setIsAddingChild(false);
    setNewChildName('');
    setSelectedElementTypeId(null);
    setSelectedTaskTypeId(null);
  };

  const fieldEntries = Object.entries(node.fields).slice(0, 3);

  // Sort children: completed tasks to bottom
  const sortedChildren = [...children].sort((a, b) => {
    if (a.nodeType === 'task' && b.nodeType === 'task') {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
    }
    if (a.nodeType === 'task' && a.completed) return 1;
    if (b.nodeType === 'task' && b.completed) return -1;
    return a.order - b.order;
  });

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
          isTask && node.completed && 'opacity-60',
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
        ) : isTask ? (
          <button
            type="button"
            disabled={togglingComplete}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleComplete();
            }}
            className="shrink-0 h-[18px] w-[18px] rounded border-2 flex items-center justify-center transition-colors"
            style={{
              borderColor: node.completed ? 'var(--color-primary)' : 'var(--color-muted-foreground, #999)',
              backgroundColor: node.completed ? 'var(--color-primary)' : 'transparent',
            }}
          >
            {node.completed && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
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
        ) : isTask ? (
          <CircleDot
            className="h-4 w-4 shrink-0"
            style={{ color: taskType?.color || undefined }}
          />
        ) : isProtocol ? (
          <ClipboardList className="h-4 w-4 shrink-0 text-blue-500" />
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        {/* Name */}
        <span className={cn(
          'truncate font-medium flex-1 min-w-0',
          isTask && node.completed && 'line-through text-muted-foreground',
        )}>
          {node.name}
        </span>

        {/* Branch type badge */}
        {isBranch && node.branchType && BRANCH_TYPE_LABELS[node.branchType] && (
          <Badge variant="secondary" className="text-xs shrink-0 hidden sm:inline-flex">
            {BRANCH_TYPE_LABELS[node.branchType]}
          </Badge>
        )}

        {/* Protocol badge */}
        {isProtocol && (
          <Badge
            variant="outline"
            className="text-xs shrink-0 hidden sm:inline-flex border-blue-300 text-blue-600"
          >
            Протокол
          </Badge>
        )}

        {/* Task type badge */}
        {isTask && taskType && (
          <Badge
            variant="outline"
            className="text-xs shrink-0 hidden sm:inline-flex"
            style={{ borderColor: taskType.color, color: taskType.color }}
          >
            {taskType.name}
          </Badge>
        )}

        {/* Field value badges for items */}
        {!isBranch && !isTask && !isProtocol && fieldEntries.length > 0 && (
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
                  handleStartAddChild('branch');
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
                  handleStartAddChild('item');
                }}
                title="Добавить элемент"
              >
                <FileText className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartAddChild('task');
                }}
                title="Добавить задачу"
              >
                <ListTodo className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartAddChild('protocol');
                }}
                title="Добавить протокол"
              >
                <ClipboardList className="h-3.5 w-3.5" />
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
                      handleStartAddChild('branch');
                    }}
                  >
                    <FolderKanban className="h-4 w-4" />
                    Добавить ветку
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartAddChild('item');
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Добавить элемент
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartAddChild('task');
                    }}
                  >
                    <ListTodo className="h-4 w-4" />
                    Добавить задачу
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartAddChild('protocol');
                    }}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Добавить протокол
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
              {isTask && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleComplete();
                  }}
                  disabled={togglingComplete}
                >
                  <CheckSquare className="h-4 w-4" />
                  {node.completed ? 'Отменить выполнение' : 'Отметить выполненной'}
                </DropdownMenuItem>
              )}
              {isProtocol && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportProtocol();
                  }}
                >
                  <Download className="h-4 w-4" />
                  Экспорт протокола
                </DropdownMenuItem>
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
          {sortedChildren.map((child) => (
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
              ) : addChildType === 'task' ? (
                <ListTodo className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : addChildType === 'protocol' ? (
                <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              {addChildType === 'item' && elementTypes.length > 0 && (
                <select
                  value={selectedElementTypeId || ''}
                  onChange={(e) => setSelectedElementTypeId(e.target.value || null)}
                  className="h-7 text-xs rounded-md border bg-background px-1.5 shrink-0 max-w-[120px]"
                >
                  <option value="">Произвольный</option>
                  {elementTypes.map((et) => (
                    <option key={et.id} value={et.id}>{et.name}</option>
                  ))}
                </select>
              )}
              {addChildType === 'task' && taskTypes.length > 0 && (
                <select
                  value={selectedTaskTypeId || ''}
                  onChange={(e) => setSelectedTaskTypeId(e.target.value || null)}
                  className="h-7 text-xs rounded-md border bg-background px-1.5 shrink-0 max-w-[120px]"
                >
                  <option value="">Без типа</option>
                  {taskTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>{tt.name}</option>
                  ))}
                </select>
              )}
              <Input
                autoFocus
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitNewChild();
                  if (e.key === 'Escape') handleCancelAddChild();
                }}
                placeholder={
                  addChildType === 'protocol'
                    ? 'Название протокола...'
                    : addChildType === 'task'
                      ? 'Название задачи...'
                      : addChildType === 'branch'
                        ? 'Название ветки...'
                        : 'Название элемента...'
                }
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

          {/* Subtle + buttons for adding child at the end */}
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
                onClick={() => handleStartAddChild('item')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Элемент
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleStartAddChild('task')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Задачу
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleStartAddChild('protocol')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Протокол
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleStartAddChild('branch')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Ветку
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
