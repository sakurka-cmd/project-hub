'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ProjectNode } from '@/types';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUSES,
  PRESET_COLORS,
} from '@/lib/constants';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NodeRow } from '@/components/tree/node-row';
import { NodeDetailPane } from '@/components/tree/node-detail-pane';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  FolderKanban,
  FolderOpen,
  Trash2,
  CirclePlus,
  Search,
  FileText,
  X,
  Palette,
} from 'lucide-react';

// Count all nodes recursively
function countNodes(nodes: ProjectNode[]): number {
  let count = 0;
  for (const n of nodes) {
    count += 1;
    if (n.children?.length) {
      count += countNodes(n.children);
    }
  }
  return count;
}

// Get root nodes for a project
function getRootNodes(allNodes: ProjectNode[], projectId: string): ProjectNode[] {
  return allNodes
    .filter((n) => n.projectId === projectId && n.parentId === null)
    .sort((a, b) => a.order - b.order);
}

export function ProjectTreeView() {
  const { toast } = useToast();

  const projects = useAppStore((s) => s.projects);
  const nodes = useAppStore((s) => s.nodes);
  const expandedProjects = useAppStore((s) => s.expandedProjects);
  const loading = useAppStore((s) => s.loading);
  const toggleProject = useAppStore((s) => s.toggleProject);
  const createProject = useAppStore((s) => s.createProject);
  const updateProject = useAppStore((s) => s.updateProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const deleteNode = useAppStore((s) => s.deleteNode);
  const createNode = useAppStore((s) => s.createNode);
  const updateNode = useAppStore((s) => s.updateNode);
  const loadAllData = useAppStore((s) => s.loadAllData);

  // Expanded nodes within the tree
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<ProjectNode | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create project dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // Color picker state
  const [colorPickerProjectId, setColorPickerProjectId] = useState<string | null>(null);

  // Status picker state
  const [statusPickerProjectId, setStatusPickerProjectId] = useState<string | null>(null);

  // Delete project confirmation
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const projectToDelete = projects.find((p) => p.id === deleteProjectId);

  // Delete node confirmation
  const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Inline root-node creation
  const [addingToProject, setAddingToProject] = useState<string | null>(null);
  const [addRootType, setAddRootType] = useState<'branch' | 'item'>('branch');
  const [newRootName, setNewRootName] = useState('');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const toggleNodeExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectNode = (node: ProjectNode) => {
    setSelectedNode(node);
    setDetailOpen(true);
  };

  const handleEditNode = (node: ProjectNode) => {
    setSelectedNode(node);
    setDetailOpen(true);
  };

  const handleDeleteNode = (node: ProjectNode) => {
    setDeleteNodeId(node.id);
  };

  const handleConfirmDeleteNode = async () => {
    if (!deleteNodeId) return;
    try {
      await deleteNode(deleteNodeId);
      if (selectedNode?.id === deleteNodeId) {
        setSelectedNode(null);
        setDetailOpen(false);
      }
      toast({ title: 'Узел удалён' });
    } catch (err: any) {
      console.error('handleConfirmDeleteNode error:', err);
      toast({ title: 'Ошибка удаления', description: err?.message || 'Не удалось удалить узел', variant: 'destructive' });
    }
    setDeleteNodeId(null);
  };

  const handleCreateProject = async () => {
    const name = newName.trim();
    if (!name) {
      toast({ title: 'Ошибка', description: 'Введите название проекта', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await createProject({
        name,
        description: newDescription.trim() || null,
        color: newColor,
        status: 'active',
      });
      setNewName('');
      setNewDescription('');
      setNewColor(PRESET_COLORS[0]);
      setCreateDialogOpen(false);
      toast({ title: 'Проект создан' });
    } catch {
      toast({ title: 'Ошибка создания', description: 'Не удалось создать проект', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDeleteProject = async () => {
    if (!deleteProjectId) return;
    try {
      await deleteProject(deleteProjectId);
      toast({ title: 'Проект удалён' });
    } catch (err: any) {
      console.error('handleConfirmDeleteProject error:', err);
      toast({ title: 'Ошибка удаления', description: err?.message || 'Не удалось удалить проект', variant: 'destructive' });
    }
    setDeleteProjectId(null);
  };

  const handleStartAddRoot = (projectId: string, type: 'branch' | 'item') => {
    setAddingToProject(projectId);
    setAddRootType(type);
    setNewRootName('');
    if (!expandedProjects.has(projectId)) toggleProject(projectId);
  };

  const handleSubmitRootNode = async (projectId: string) => {
    const name = newRootName.trim();
    if (!name) return;
    try {
      await createNode({ projectId, name, nodeType: addRootType, fields: {} });
      setNewRootName('');
      setAddingToProject(null);
      toast({ title: addRootType === 'branch' ? 'Ветка создана' : 'Элемент создан' });
    } catch (err: any) {
      console.error('handleSubmitRootNode error:', err);
      toast({
        title: 'Ошибка создания',
        description: err?.message || 'Не удалось создать узел',
        variant: 'destructive',
      });
    }
  };

  // Helper: find a node by ID in a tree structure
  const findNodeInTree = useCallback((id: string, treeNodes: ProjectNode[]): ProjectNode | null => {
    for (const n of treeNodes) {
      if (n.id === id) return n;
      if (n.children?.length) {
        const found = findNodeInTree(id, n.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Helper: check if checkId is a descendant of parentId in a tree
  const isDescendantInTree = useCallback((parentId: string, checkId: string, treeNodes: ProjectNode[]): boolean => {
    const parent = findNodeInTree(parentId, treeNodes);
    if (!parent || !parent.children?.length) return false;
    for (const child of parent.children) {
      if (child.id === checkId) return true;
      if (isDescendantInTree(child.id, checkId, treeNodes)) return true;
    }
    return false;
  }, [findNodeInTree]);

  // DnD: Drag end handler
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const targetNode = findNodeInTree(overId, nodes);
    const draggedNode = findNodeInTree(activeId, nodes);

    if (!targetNode || !draggedNode) return;

    // Only allow dropping onto branches
    if (targetNode.nodeType !== 'branch') return;

    // Prevent dropping a parent onto its own descendant
    if (isDescendantInTree(activeId, overId, nodes)) return;

    // Don't move if already a child of the target
    if (draggedNode.parentId === overId) return;

    try {
      await updateNode(activeId, { parentId: overId });
      await loadAllData();
      toast({ title: 'Узел перемещён' });
    } catch {
      toast({
        title: 'Ошибка перемещения',
        description: 'Не удалось переместить узел',
        variant: 'destructive',
      });
    }
  }, [nodes, updateNode, loadAllData, toast, findNodeInTree, isDescendantInTree]);

  // Filter and sort projects: by status priority, then alphabetically
  const filteredProjects = useMemo(() => {
    const STATUS_ORDER: Record<string, number> = {
      active: 0,
      paused: 1,
      completed: 2,
      archived: 3,
    };
    let result = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const orderA = STATUS_ORDER[a.status] ?? 99;
      const orderB = STATUS_ORDER[b.status] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, 'ru');
    });
  }, [projects, searchQuery]);

  // Reload handler for child components
  const handleReload = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Loading state
  if (loading && projects.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Проекты</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Все проекты в едином дереве
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Создать проект
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск проектов..."
          className="pl-9"
        />
      </div>

      <Separator />

      {/* Empty state */}
      {filteredProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {searchQuery ? 'Ничего не найдено' : 'Нет проектов'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            {searchQuery
              ? 'Попробуйте изменить поисковый запрос'
              : 'Создайте свой первый проект для управления задачами и артефактами'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <CirclePlus className="h-4 w-4" />
              Создать проект
            </Button>
          )}
        </div>
      )}

      {/* Project list with DnD */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-2">
          {filteredProjects.map((project) => {
            const isExpanded = expandedProjects.has(project.id);
            const rootNodes = getRootNodes(nodes, project.id);
            const nodeCount = countNodes(rootNodes);

            return (
              <div
                key={project.id}
                className="rounded-lg border bg-card"
              >
                {/* Project header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors rounded-t-lg"
                  onClick={() => toggleProject(project.id)}
                >
                  {/* Chevron */}
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Color indicator — clickable to change */}
                  <Popover
                    open={colorPickerProjectId === project.id}
                    onOpenChange={(open) => {
                      if (!open) setColorPickerProjectId(null);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className="h-3 w-3 rounded-full shrink-0 hover:ring-2 hover:ring-foreground/30 transition-all cursor-pointer"
                        style={{ backgroundColor: project.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setColorPickerProjectId(project.id);
                        }}
                        title="Изменить цвет"
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start" side="bottom">
                      <div className="flex items-center gap-2 mb-2">
                        <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground">Цвет проекта</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            className={`h-6 w-6 rounded-full border-2 transition-all ${
                              project.color === color
                                ? 'border-foreground scale-110'
                                : 'border-transparent hover:border-muted-foreground/50'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateProject(project.id, { color });
                              setColorPickerProjectId(null);
                            }}
                            aria-label={`Цвет ${color}`}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Icon */}
                  {isExpanded ? (
                    <FolderOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <FolderKanban className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}

                  {/* Name */}
                  <span className="font-semibold text-sm flex-1 min-w-0 truncate">
                    {project.name}
                  </span>

                  {/* Status badge — clickable to change */}
                  <Popover
                    open={statusPickerProjectId === project.id}
                    onOpenChange={(open) => {
                      if (!open) setStatusPickerProjectId(null);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-all hover:ring-2 hover:ring-foreground/20 cursor-pointer shrink-0',
                          PROJECT_STATUS_COLORS[project.status]
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusPickerProjectId(project.id);
                        }}
                      >
                        {PROJECT_STATUS_LABELS[project.status] || project.status}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="end" side="bottom">
                      <div className="flex flex-col gap-0.5">
                        {PROJECT_STATUSES.map((status) => (
                          <button
                            key={status}
                            className={cn(
                              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-left',
                              project.status === status
                                ? 'bg-accent font-medium'
                                : 'hover:bg-accent/50'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateProject(project.id, { status });
                              setStatusPickerProjectId(null);
                            }}
                          >
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{
                                backgroundColor: status === 'active' ? '#10b981'
                                  : status === 'paused' ? '#f59e0b'
                                  : status === 'completed' ? '#0ea5e9'
                                  : '#6b7280'
                              }}
                            />
                            {PROJECT_STATUS_LABELS[status]}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Node count */}
                  {nodeCount > 0 && (
                    <Badge variant="outline" className="text-xs tabular-nums">
                      {nodeCount}
                    </Badge>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartAddRoot(project.id, 'branch');
                      }}
                      title="Добавить ветку"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteProjectId(project.id);
                      }}
                      title="Удалить проект"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded: node tree */}
                {isExpanded && (
                  <div className="border-t px-1 py-1">
                    {rootNodes.length === 0 && addingToProject !== project.id ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                        <p className="flex-1">Нет узлов. Добавьте ветку или элемент.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleStartAddRoot(project.id, 'branch')}
                        >
                          <FolderKanban className="h-3 w-3" />
                          Ветка
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleStartAddRoot(project.id, 'item')}
                        >
                          <FileText className="h-3 w-3" />
                          Элемент
                        </Button>
                      </div>
                    ) : null}
                    {/* Inline add root node */}
                    {addingToProject === project.id && (
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        {addRootType === 'branch' ? (
                          <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <Input
                          autoFocus
                          value={newRootName}
                          onChange={(e) => setNewRootName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmitRootNode(project.id);
                            if (e.key === 'Escape') setAddingToProject(null);
                          }}
                          placeholder={addRootType === 'branch' ? 'Название ветки...' : 'Название элемента...'}
                          className="h-7 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleSubmitRootNode(project.id)}
                          disabled={!newRootName.trim()}
                        >
                          <CirclePlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setAddingToProject(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {rootNodes.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {rootNodes.map((rootNode) => (
                          <NodeRow
                            key={rootNode.id}
                            node={rootNode}
                            depth={0}
                            projectId={project.id}
                            expanded={expandedNodes}
                            toggleExpand={toggleNodeExpand}
                            selectedNodeId={selectedNode?.id ?? null}
                            onSelectNode={handleSelectNode}
                            onEditNode={handleEditNode}
                            onDeleteNode={handleDeleteNode}
                            onReload={handleReload}
                          />
                        ))}
                      </div>
                    ) : null}
                    {/* Add root buttons at the bottom of node list */}
                    {rootNodes.length > 0 && addingToProject !== project.id && (
                      <div className="flex items-center gap-1 px-2 py-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartAddRoot(project.id, 'branch')}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Добавить ветку
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartAddRoot(project.id, 'item')}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Добавить элемент
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DndContext>

      {/* Create project dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать проект</DialogTitle>
            <DialogDescription>
              Заполните данные нового проекта
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Название</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Мой проект"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) handleCreateProject();
                }}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Описание</label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Краткое описание проекта..."
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Цвет</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      newColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:border-muted-foreground/50'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)}
                    aria-label={`Цвет ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={creating || !newName.trim()}
            >
              {creating ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete project confirmation */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={(v) => !v && setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Проект «{projectToDelete?.name}» и все его узлы будут удалены безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteProject}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete node confirmation */}
      <AlertDialog open={!!deleteNodeId} onOpenChange={(v) => !v && setDeleteNodeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить узел?</AlertDialogTitle>
            <AlertDialogDescription>
              {findNodeInTree(deleteNodeId ?? '', nodes)?.nodeType === 'branch'
                ? 'Ветка и все её дочерние элементы будут удалены безвозвратно.'
                : 'Элемент будет удалён безвозвратно.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteNode}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Node detail pane */}
      <NodeDetailPane
        node={selectedNode}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedNode(null);
        }}
      />
    </div>
  );
}
