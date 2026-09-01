'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Project, ProjectNode, Portfolio } from '@/types';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import {
  normQuery,
  filterTree,
  projectMatches,
  matchesAny,
} from '@/lib/search';
import { HighlightText } from '@/components/search/highlight-text';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUSES,
  PRESET_COLORS,
} from '@/lib/constants';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  FileText,
  X,
  ListTodo,
  ClipboardList,
  Search,
  SearchX,
  Briefcase,
  FolderInput,
  Check,
  Pencil,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// Данные проекта после применения фильтра
interface ProjectViewData {
  project: Project;
  /** Что рендерить (отфильтрованные корни или все) */
  roots: ProjectNode[];
  /** Узлы, которые нужно принудительно раскрыть */
  forcedExpand: Set<string>;
  /** Сколько узлов совпало (0 — совпал сам проект либо фильтр пуст) */
  matchCount: number;
  /** Совпал сам проект — показываем целиком */
  selfMatched: boolean;
}

// Группы верхнего уровня в дереве: портфель или проекты без портфеля
type TreeGroup =
  | { type: 'portfolio'; key: string; portfolio: Portfolio; views: ProjectViewData[] }
  | { type: 'loose'; key: string; views: ProjectViewData[]; showHeader: boolean };

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
  const elementTypes = useAppStore((s) => s.elementTypes);
  const taskTypes = useAppStore((s) => s.taskTypes);
  const expandedProjects = useAppStore((s) => s.expandedProjects);
  const loading = useAppStore((s) => s.loading);
  const toggleProject = useAppStore((s) => s.toggleProject);
  const createProject = useAppStore((s) => s.createProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const deleteNode = useAppStore((s) => s.deleteNode);
  const createNode = useAppStore((s) => s.createNode);
  const updateNode = useAppStore((s) => s.updateNode);
  const updateProject = useAppStore((s) => s.updateProject);
  const portfolios = useAppStore((s) => s.portfolios);
  const createPortfolio = useAppStore((s) => s.createPortfolio);
  const updatePortfolio = useAppStore((s) => s.updatePortfolio);
  const deletePortfolio = useAppStore((s) => s.deletePortfolio);
  const moveProjectToPortfolio = useAppStore((s) => s.moveProjectToPortfolio);
  const loadAllData = useAppStore((s) => s.loadAllData);
  const selectProject = useAppStore((s) => s.selectProject);
  const pendingNavigation = useAppStore((s) => s.pendingNavigation);
  const consumeNavigation = useAppStore((s) => s.consumeNavigation);
  const pendingCreateProject = useAppStore((s) => s.pendingCreateProject);
  const consumeCreateProjectRequest = useAppStore((s) => s.consumeCreateProjectRequest);

  // Expanded nodes within the tree
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<ProjectNode | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Быстрый фильтр дерева
  const [filterRaw, setFilterRaw] = useState('');
  const filterInputRef = useRef<HTMLInputElement>(null);
  const filterQuery = normQuery(filterRaw.trim());
  const filterActive = filterQuery.length > 0;

  // Create project dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // Delete project confirmation
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const projectToDelete = projects.find((p) => p.id === deleteProjectId);

  // Delete node confirmation
  const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);

  // Inline root-node creation
  const [addingToProject, setAddingToProject] = useState<string | null>(null);
  const [addRootType, setAddRootType] = useState<'branch' | 'item' | 'task' | 'protocol'>('branch');
  const [newRootName, setNewRootName] = useState('');
  const [selectedElementTypeId, setSelectedElementTypeId] = useState<string | null>(null);
  const [selectedTaskTypeId, setSelectedTaskTypeId] = useState<string | null>(null);

  // Inline project rename
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [colorPickerProjectId, setColorPickerProjectId] = useState<string | null>(null);

  // Status picker state
  const [statusPickerProjectId, setStatusPickerProjectId] = useState<string | null>(null);

  // Портфели: создание / переименование / удаление / перенос проектов
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);
  const [renamingPortfolioId, setRenamingPortfolioId] = useState<string | null>(null);
  const [renamePortfolioValue, setRenamePortfolioValue] = useState('');
  const [deletePortfolioId, setDeletePortfolioId] = useState<string | null>(null);
  const portfolioToDelete = portfolios.find((p) => p.id === deletePortfolioId);
  const [collapsedPortfolios, setCollapsedPortfolios] = useState<Set<string>>(new Set());
  const [moveProjectId, setMoveProjectId] = useState<string | null>(null);

  // Редактирование портфеля (название + описание) и сортировка
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [editPortfolioName, setEditPortfolioName] = useState('');
  const [editPortfolioDescription, setEditPortfolioDescription] = useState('');
  const [savingPortfolioEdit, setSavingPortfolioEdit] = useState(false);

  // Портфель, выбранный в диалоге создания проекта ('' — без портфеля)
  const [newPortfolioId, setNewPortfolioId] = useState('');

  const handleProjectColorChange = async (projectId: string, color: string) => {
    try {
      await updateProject(projectId, { color });
      toast({ title: 'Цвет обновлён' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось обновить цвет', variant: 'destructive' });
    }
    setColorPickerProjectId(null);
  };

  // ===== Портфели: обработчики =====
  const togglePortfolioCollapsed = (id: string) => {
    setCollapsedPortfolios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreatePortfolio = async () => {
    const name = newPortfolioName.trim();
    if (!name) {
      toast({ title: 'Ошибка', description: 'Введите название портфеля', variant: 'destructive' });
      return;
    }
    setCreatingPortfolio(true);
    try {
      await createPortfolio({ name, description: newPortfolioDescription.trim() || null });
      setNewPortfolioName('');
      setNewPortfolioDescription('');
      setPortfolioDialogOpen(false);
      toast({ title: 'Портфель создан' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось создать портфель', variant: 'destructive' });
    } finally {
      setCreatingPortfolio(false);
    }
  };

  const commitRenamePortfolio = async (portfolio: Portfolio) => {
    const trimmed = renamePortfolioValue.trim();
    if (trimmed && trimmed !== portfolio.name) {
      try {
        await updatePortfolio(portfolio.id, { name: trimmed });
        toast({ title: 'Портфель переименован' });
      } catch (err: any) {
        toast({ title: 'Ошибка', description: err?.message || 'Не удалось переименовать', variant: 'destructive' });
      }
    }
    setRenamingPortfolioId(null);
  };

  const openEditPortfolio = (portfolio: Portfolio) => {
    setEditingPortfolioId(portfolio.id);
    setEditPortfolioName(portfolio.name);
    setEditPortfolioDescription(portfolio.description || '');
  };

  const handleSavePortfolioEdit = async () => {
    if (!editingPortfolioId) return;
    const name = editPortfolioName.trim();
    if (!name) {
      toast({ title: 'Ошибка', description: 'Введите название портфеля', variant: 'destructive' });
      return;
    }
    setSavingPortfolioEdit(true);
    try {
      await updatePortfolio(editingPortfolioId, {
        name,
        description: editPortfolioDescription.trim() || null,
      });
      setEditingPortfolioId(null);
      toast({ title: 'Портфель обновлён' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось сохранить портфель', variant: 'destructive' });
    } finally {
      setSavingPortfolioEdit(false);
    }
  };

  // Порядок портфелей (order asc, затем по алфавиту) — для сортировки стрелками
  const sortedPortfolioIds = useMemo(
    () =>
      [...portfolios]
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ru'))
        .map((p) => p.id),
    [portfolios],
  );

  // Сдвиг портфеля вверх/вниз с нормализацией order (0..n-1)
  const handleMovePortfolio = async (id: string, dir: -1 | 1) => {
    const sorted = [...portfolios].sort(
      (a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ru'),
    );
    const idx = sorted.findIndex((p) => p.id === id);
    const neighbor = sorted[idx + dir];
    if (idx < 0 || !neighbor) return;

    const next = [...sorted];
    next[idx] = neighbor;
    next[idx + dir] = sorted[idx];

    try {
      // Отправляем только те портфели, чей порядковый индекс изменился
      for (let i = 0; i < next.length; i++) {
        if (next[i].order !== i) {
          await updatePortfolio(next[i].id, { order: i });
        }
      }
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось изменить порядок', variant: 'destructive' });
    }
  };

  const handleConfirmDeletePortfolio = async () => {
    if (!deletePortfolioId) return;
    try {
      await deletePortfolio(deletePortfolioId);
      toast({ title: 'Портфель удалён', description: 'Проекты остались, но без группировки' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось удалить портфель', variant: 'destructive' });
    }
    setDeletePortfolioId(null);
  };

  const handleMoveProject = async (projectId: string, portfolioId: string | null) => {
    try {
      await moveProjectToPortfolio(projectId, portfolioId);
      setMoveProjectId(null);
      toast({ title: portfolioId ? 'Проект перемещён в портфель' : 'Проект убран из портфеля' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось переместить проект', variant: 'destructive' });
    }
  };

  // Listen for create project request from TopBar
  useEffect(() => {
    if (pendingCreateProject) {
      consumeCreateProjectRequest();
      setNewPortfolioId('');
      setCreateDialogOpen(true);
    }
  }, [pendingCreateProject, consumeCreateProjectRequest]);

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
        portfolioId: newPortfolioId || null,
      });
      setNewName('');
      setNewDescription('');
      setNewColor(PRESET_COLORS[0]);
      setNewPortfolioId('');
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

  const handleStartAddRoot = (projectId: string, type: 'branch' | 'item' | 'task' | 'protocol') => {
    setAddingToProject(projectId);
    setAddRootType(type);
    setSelectedElementTypeId(null);
    setSelectedTaskTypeId(null);
    if (!expandedProjects.has(projectId)) toggleProject(projectId);
    // Auto-fill date for protocols
    if (type === 'protocol') {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      setNewRootName(`Протокол от ${dd}.${mm}.${yyyy}`);
    } else {
      setNewRootName('');
    }
  };

  const handleSubmitRootNode = async (projectId: string) => {
    const name = newRootName.trim();
    if (!name) return;
    try {
      let fields: Record<string, unknown> = {};
      let elementTypeId: string | null = null;
      if (selectedElementTypeId) {
        const et = elementTypes.find((t) => t.id === selectedElementTypeId);
        if (et) {
          elementTypeId = et.id;
          for (const f of et.fields) {
            fields[f.key] = f.defaultValue;
          }
        }
      }
      let taskTypeId: string | null = null;
      if (addRootType === 'task' && selectedTaskTypeId) {
        taskTypeId = selectedTaskTypeId;
      }
      if (addRootType === 'protocol') {
        fields = { protocolText: '', decisions: [] };
      }
      await createNode({ projectId, name, nodeType: addRootType, elementTypeId, taskTypeId, fields });
      setNewRootName('');
      setSelectedElementTypeId(null);
      setSelectedTaskTypeId(null);
      setAddingToProject(null);
      const labels: Record<string, string> = { branch: 'Ветка создана', item: 'Элемент создан', task: 'Задача создана', protocol: 'Протокол создан' };
      toast({ title: labels[addRootType] });
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

  // Helper: цепочка id предков от корня до узла (не включая сам узел); null если не найден
  const findAncestorIds = useCallback((targetId: string, treeNodes: ProjectNode[]): string[] | null => {
    const walk = (list: ProjectNode[], acc: string[]): string[] | null => {
      for (const n of list) {
        if (n.id === targetId) return acc;
        if (n.children?.length) {
          const found = walk(n.children, [...acc, n.id]);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(treeNodes, []);
  }, []);

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

  // Sort projects: by status priority, then alphabetically
  const filteredProjects = useMemo(() => {
    const STATUS_ORDER: Record<string, number> = {
      active: 0,
      paused: 1,
      completed: 2,
      archived: 3,
    };
    return [...projects].sort((a, b) => {
      const orderA = STATUS_ORDER[a.status] ?? 99;
      const orderB = STATUS_ORDER[b.status] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, 'ru');
    });
  }, [projects]);

  // ===== Фильтр дерева: что рендерить по каждому проекту =====
  const projectViews = useMemo<ProjectViewData[]>(() => {
    if (!filterQuery) {
      return filteredProjects.map((p) => ({
        project: p,
        roots: getRootNodes(nodes, p.id),
        forcedExpand: new Set<string>(),
        matchCount: 0,
        selfMatched: false,
      }));
    }
    const out: ProjectViewData[] = [];
    for (const p of filteredProjects) {
      const roots = getRootNodes(nodes, p.id);
      if (projectMatches(p, filterQuery)) {
        // Проект совпал по названию/описанию — показываем целиком
        out.push({ project: p, roots, forcedExpand: new Set<string>(), matchCount: 0, selfMatched: true });
      } else {
        const ft = filterTree(roots, filterQuery);
        if (ft.matchCount > 0) {
          out.push({ project: p, roots: ft.roots, forcedExpand: ft.forcedExpand, matchCount: ft.matchCount, selfMatched: false });
        }
      }
    }
    return out;
  }, [filteredProjects, nodes, filterQuery]);

  const totalFilterMatches = useMemo(
    () => projectViews.reduce((sum, v) => sum + v.matchCount, 0),
    [projectViews],
  );

  // При активном фильтре — объединённый набор раскрытых узлов (пользовательские + принудительные)
  const mergedExpanded = useMemo(() => {
    if (!filterActive) return expandedNodes;
    const merged = new Set(expandedNodes);
    for (const v of projectViews) {
      for (const id of v.forcedExpand) merged.add(id);
    }
    return merged;
  }, [filterActive, expandedNodes, projectViews]);

  // ===== Группы верхнего уровня: портфели + проекты без портфеля =====
  const treeGroups = useMemo<TreeGroup[]>(() => {
    const viewById = new Map(projectViews.map((v) => [v.project.id, v]));

    // Проекты в порядке статуса → алфавита
    const ordered = filteredProjects
      .map((p) => viewById.get(p.id))
      .filter((v): v is ProjectViewData => !!v);

    if (portfolios.length === 0) {
      return [{ type: 'loose', key: '__loose', views: ordered, showHeader: false }];
    }

    const sortedPortfolios = [...portfolios].sort(
      (a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ru'),
    );
    const portfolioIds = new Set(sortedPortfolios.map((pf) => pf.id));

    const byPortfolio = new Map<string, ProjectViewData[]>();
    const loose: ProjectViewData[] = [];
    for (const v of ordered) {
      const pid = v.project.portfolioId;
      if (pid && portfolioIds.has(pid)) {
        const list = byPortfolio.get(pid) || [];
        list.push(v);
        byPortfolio.set(pid, list);
      } else {
        loose.push(v);
      }
    }

    // Совпадение по имени портфеля → показываем все его проекты целиком
    if (filterActive) {
      for (const pf of sortedPortfolios) {
        if (!matchesAny(filterQuery, pf.name)) continue;
        const all = filteredProjects
          .filter((p) => p.portfolioId === pf.id)
          .map((p) => ({
            project: p,
            roots: getRootNodes(nodes, p.id),
            forcedExpand: new Set<string>(),
            matchCount: 0,
            selfMatched: true,
          }));
        byPortfolio.set(pf.id, all);
      }
    }

    const out: TreeGroup[] = sortedPortfolios.map((pf) => ({
      type: 'portfolio',
      key: pf.id,
      portfolio: pf,
      views: byPortfolio.get(pf.id) || [],
    }));

    out.push({
      type: 'loose',
      key: '__loose',
      views: loose,
      showHeader: loose.length > 0,
    });

    // Под фильтром скрываем пустые группы
    if (filterActive) {
      return out.filter((g) => g.views.length > 0);
    }
    return out;
  }, [portfolios, filteredProjects, projectViews, nodes, filterActive, filterQuery]);

  // Reload handler for child components
  const handleReload = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Sync selectedNode with fresh tree data after loadAllData
  useEffect(() => {
    if (!selectedNode || nodes.length === 0) return;
    const fresh = findNodeInTree(selectedNode.id, nodes);
    if (fresh) {
      setSelectedNode(fresh);
    }
  }, [nodes, selectedNode, findNodeInTree]);

  // Навигация из палетки (Ctrl+K): раскрыть проект и цепочку предков, выбрать узел, проскроллить
  useEffect(() => {
    if (!pendingNavigation) return;
    const nav = consumeNavigation();
    if (!nav) return;
    const { projectId, nodeId } = nav;
    selectProject(projectId);
    if (!nodeId || nodes.length === 0) return;

    const chain = findAncestorIds(nodeId, nodes);
    if (chain && chain.length > 0) {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        for (const id of chain) next.add(id);
        return next;
      });
    }
    const target = findNodeInTree(nodeId, nodes);
    if (target) {
      setSelectedNode(target);
      setDetailOpen(true);
    }
    // Скролл после отрисовки раскрытых веток
    const t = setTimeout(() => {
      document.getElementById(`node-row-${nodeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => clearTimeout(t);
  }, [pendingNavigation, nodes, consumeNavigation, selectProject, findAncestorIds, findNodeInTree]);

  // Хоткей "/" — фокус в фильтр дерева (если пользователь не в поле ввода)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (t && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable)) return;
      e.preventDefault();
      filterInputRef.current?.focus();
      filterInputRef.current?.select();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ===== Рендер одного проекта (строка + раскрытое поддерево) =====
  const renderProjectView = (view: ProjectViewData) => {
    const { project, roots, matchCount, selfMatched } = view;
    const isExpanded = filterActive ? true : expandedProjects.has(project.id);
    const rootNodes = roots;
    const nodeCount = countNodes(rootNodes);
    const displayCount = filterActive ? (selfMatched ? nodeCount : matchCount) : nodeCount;

    return (
      <div key={project.id} className="group">
                {/* Project row — compact, no card wrapper */}
                <div
                  id={`project-row-${project.id}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleProject(project.id)}
                >
                  {/* Chevron */}
                  <div className="shrink-0 w-4">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Color indicator (clickable) */}
                  <Popover
                    open={colorPickerProjectId === project.id}
                    onOpenChange={(open) => setColorPickerProjectId(open ? project.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className="h-2.5 w-2.5 rounded-full shrink-0 hover:scale-125 transition-transform cursor-pointer"
                        style={{ backgroundColor: project.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setColorPickerProjectId(project.id);
                        }}
                        title="Изменить цвет"
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            className={`h-6 w-6 rounded-full border-2 transition-all ${
                              project.color === color
                                ? 'border-foreground scale-110'
                                : 'border-transparent hover:border-muted-foreground/50'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleProjectColorChange(project.id, color)}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Icon */}
                  {isExpanded ? (
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}

                  {/* Name (inline edit) */}
                  {renamingProjectId === project.id ? (
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const trimmed = renameValue.trim();
                          if (trimmed && trimmed !== project.name) {
                            try {
                              await updateProject(project.id, { name: trimmed });
                              toast({ title: 'Проект переименован' });
                            } catch (err: any) {
                              toast({ title: 'Ошибка', description: err?.message || 'Не удалось переименовать', variant: 'destructive' });
                            }
                          }
                          setRenamingProjectId(null);
                        }
                        if (e.key === 'Escape') setRenamingProjectId(null);
                      }}
                      onBlur={async () => {
                        const trimmed = renameValue.trim();
                        if (trimmed && trimmed !== project.name) {
                          try {
                            await updateProject(project.id, { name: trimmed });
                            toast({ title: 'Проект переименован' });
                          } catch (err: any) {
                            toast({ title: 'Ошибка', description: err?.message || 'Не удалось переименовать', variant: 'destructive' });
                          }
                        }
                        setRenamingProjectId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 text-sm font-semibold"
                    />
                  ) : (
                    <span
                      className="font-semibold text-sm flex-1 min-w-0 truncate cursor-text select-none"
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingProjectId(project.id);
                        setRenameValue(project.name);
                      }}
                      title="Двойной клик для переименования"
                    >
                      <HighlightText text={project.name} query={filterActive ? filterRaw.trim() : ''} />
                    </span>
                  )}

                  {/* Status badge — clickable to change */}
                  <Popover
                    open={statusPickerProjectId === project.id}
                    onOpenChange={(open) => setStatusPickerProjectId(open ? project.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className={`${PROJECT_STATUS_COLORS[project.status]} text-[10px] px-1.5 py-0 h-4 rounded-full shrink-0 hover:ring-2 hover:ring-foreground/20 transition-all cursor-pointer`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusPickerProjectId(project.id);
                        }}
                      >
                        {PROJECT_STATUS_LABELS[project.status] || project.status}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="end">
                      <div className="flex flex-col gap-0.5">
                        {PROJECT_STATUSES.map((status) => (
                          <button
                            key={status}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-left ${
                              project.status === status
                                ? 'bg-accent font-medium'
                                : 'hover:bg-accent/50'
                            }`}
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
                  {displayCount > 0 && (
                    <span className={cn(
                      'text-[10px] tabular-nums',
                      filterActive ? 'font-semibold text-primary' : 'text-muted-foreground',
                    )}>
                      {displayCount}
                    </span>
                  )}

                  {/* Actions — show on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartAddRoot(project.id, 'branch');
                      }}
                      title="Добавить ветку"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>

                    {/* Move to portfolio */}
                    <Popover
                      open={moveProjectId === project.id}
                      onOpenChange={(open) => setMoveProjectId(open ? project.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => e.stopPropagation()}
                          title="Переместить в портфель"
                        >
                          <FolderInput className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-1" align="end">
                        <div className="flex flex-col">
                          {portfolios.length === 0 && (
                            <span className="px-2 py-1.5 text-xs text-muted-foreground">
                              Сначала создайте портфель
                            </span>
                          )}
                          {portfolios.map((pf) => (
                            <button
                              key={pf.id}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                                project.portfolioId === pf.id ? 'bg-accent font-medium' : 'hover:bg-accent/50'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveProject(project.id, pf.id);
                              }}
                            >
                              <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="flex-1 min-w-0 truncate">{pf.name}</span>
                              {project.portfolioId === pf.id && (
                                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                              )}
                            </button>
                          ))}
                          {portfolios.length > 0 && (
                            <>
                              <div className="my-1 h-px bg-border" />
                              <button
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                                  !project.portfolioId ? 'bg-accent font-medium' : 'hover:bg-accent/50'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveProject(project.id, null);
                                }}
                              >
                                <FolderKanban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="flex-1">Без портфеля</span>
                                {!project.portfolioId && (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteProjectId(project.id);
                      }}
                      title="Удалить проект"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Expanded: child nodes indented inline */}
                {isExpanded && (
                  <div className="ml-6">
                    {rootNodes.length === 0 && addingToProject !== project.id ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                        <span>Пусто</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartAddRoot(project.id, 'branch')}
                        >
                          <FolderKanban className="h-3 w-3 mr-1" />
                          Ветка
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartAddRoot(project.id, 'item')}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Элемент
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartAddRoot(project.id, 'task')}
                        >
                          <ListTodo className="h-3 w-3 mr-1" />
                          Задача
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartAddRoot(project.id, 'protocol')}
                        >
                          <ClipboardList className="h-3 w-3 mr-1" />
                          Протокол
                        </Button>
                      </div>
                    ) : null}
                    {/* Inline add root node */}
                    {addingToProject === project.id && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5">
                        {addRootType === 'task' ? (
                          <ListTodo className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : addRootType === 'protocol' ? (
                          <ClipboardList className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : addRootType === 'branch' ? (
                          <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        {addRootType === 'item' && elementTypes.length > 0 && (
                          <select
                            value={selectedElementTypeId || ''}
                            onChange={(e) => setSelectedElementTypeId(e.target.value || null)}
                            className="h-6 text-xs rounded-md border bg-background px-1.5 shrink-0 max-w-[120px]"
                          >
                            <option value="">Произвольный</option>
                            {elementTypes.map((et) => (
                              <option key={et.id} value={et.id}>{et.name}</option>
                            ))}
                          </select>
                        )}
                        {addRootType === 'task' && taskTypes.length > 0 && (
                          <select
                            value={selectedTaskTypeId || ''}
                            onChange={(e) => setSelectedTaskTypeId(e.target.value || null)}
                            className="h-6 text-xs rounded-md border bg-background px-1.5 shrink-0 max-w-[120px]"
                          >
                            <option value="">Без типа</option>
                            {taskTypes.map((tt) => (
                              <option key={tt.id} value={tt.id}>{tt.name}</option>
                            ))}
                          </select>
                        )}
                        <Input
                          autoFocus
                          value={newRootName}
                          onChange={(e) => setNewRootName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmitRootNode(project.id);
                            if (e.key === 'Escape') { setAddingToProject(null); setSelectedElementTypeId(null); setSelectedTaskTypeId(null); }
                          }}
                          placeholder={
                            addRootType === 'protocol' ? 'Название протокола...'
                              : addRootType === 'branch' ? 'Название ветки...'
                              : 'Название элемента...'
                          }
                          className="h-6 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleSubmitRootNode(project.id)}
                          disabled={!newRootName.trim()}
                        >
                          <CirclePlus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => { setAddingToProject(null); setSelectedElementTypeId(null); setSelectedTaskTypeId(null); }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {rootNodes.length > 0 ? (
                      <div className="flex flex-col">
                        {rootNodes.map((rootNode) => (
                          <NodeRow
                            key={rootNode.id}
                            node={rootNode}
                            depth={0}
                            projectId={project.id}
                            expanded={filterActive ? mergedExpanded : expandedNodes}
                            toggleExpand={toggleNodeExpand}
                            selectedNodeId={selectedNode?.id ?? null}
                            onSelectNode={handleSelectNode}
                            onEditNode={handleEditNode}
                            onDeleteNode={handleDeleteNode}
                            onReload={handleReload}
                            highlight={filterActive ? filterRaw.trim() : undefined}
                          />
                        ))}
                      </div>
                    ) : null}
                    {/* Add root buttons at the bottom of node list */}
                    {rootNodes.length > 0 && addingToProject !== project.id && (
                      <div className="flex items-center gap-0.5 px-2 py-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartAddRoot(project.id, 'branch')}
                        >
                          <Plus className="h-3 w-3 mr-0.5" />
                          Ветка
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartAddRoot(project.id, 'item')}
                        >
                          <Plus className="h-3 w-3 mr-0.5" />
                          Элемент
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartAddRoot(project.id, 'task')}
                        >
                          <Plus className="h-3 w-3 mr-0.5" />
                          Задачу
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartAddRoot(project.id, 'protocol')}
                        >
                          <Plus className="h-3 w-3 mr-0.5" />
                          Протокол
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
    );
  };

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
    <div>
      {/* Фильтр дерева */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={filterInputRef}
            value={filterRaw}
            onChange={(e) => setFilterRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (filterRaw) {
                  setFilterRaw('');
                } else {
                  filterInputRef.current?.blur();
                }
              }
            }}
            placeholder="Фильтр по дереву…"
            className="h-9 pl-8 pr-8"
            aria-label="Фильтр по дереву"
          />
          {filterRaw && (
            <button
              type="button"
              onClick={() => {
                setFilterRaw('');
                filterInputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Очистить фильтр"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {filterActive && (
          <span className="text-xs text-muted-foreground shrink-0">
            {totalFilterMatches > 0 ? (
              <>найдено: <b className="text-foreground tabular-nums">{totalFilterMatches}</b></>
            ) : (
              'совпадений нет'
            )}
          </span>
        )}

        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-9 gap-1 text-xs shrink-0 text-muted-foreground"
          onClick={() => setPortfolioDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Портфель
        </Button>
      </div>

      {/* Empty state: нет проектов */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Нет проектов</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            Создайте свой первый проект для управления задачами и артефактами
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <CirclePlus className="h-4 w-4" />
            Создать проект
          </Button>
        </div>
      )}

      {/* Empty state: фильтр ничего не нашёл */}
      {filterActive && projects.length > 0 && projectViews.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <SearchX className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Ничего не найдено</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            По фильтру «{filterRaw.trim()}» нет совпадений в названиях проектов и узлов
          </p>
          <Button variant="outline" onClick={() => setFilterRaw('')} className="gap-2">
            <X className="h-4 w-4" />
            Сбросить фильтр
          </Button>
        </div>
      )}

      {/* Unified tree: портфели как группы + проекты без портфеля */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-col">
          {treeGroups.map((group) =>
            group.type === 'portfolio' ? (
              <div key={group.key}>
                {/* Portfolio header */}
                <div
                  className="group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => togglePortfolioCollapsed(group.portfolio.id)}
                >
                  <div className="shrink-0 w-4">
                    {collapsedPortfolios.has(group.portfolio.id) ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>

                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />

                  {renamingPortfolioId === group.portfolio.id ? (
                    <Input
                      autoFocus
                      value={renamePortfolioValue}
                      onChange={(e) => setRenamePortfolioValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRenamePortfolio(group.portfolio);
                        if (e.key === 'Escape') setRenamingPortfolioId(null);
                      }}
                      onBlur={() => commitRenamePortfolio(group.portfolio)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 text-sm font-semibold"
                    />
                  ) : (
                    <span
                      className="font-semibold text-sm flex-1 min-w-0 truncate cursor-text select-none"
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingPortfolioId(group.portfolio.id);
                        setRenamePortfolioValue(group.portfolio.name);
                      }}
                      title="Двойной клик для переименования"
                    >
                      <HighlightText text={group.portfolio.name} query={filterActive ? filterRaw.trim() : ''} />
                    </span>
                  )}

                  {group.portfolio.description && (
                    <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[240px]">
                      {group.portfolio.description}
                    </span>
                  )}

                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {group.views.length}
                  </span>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground"
                      disabled={sortedPortfolioIds[0] === group.portfolio.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePortfolio(group.portfolio.id, -1);
                      }}
                      title="Переместить портфель выше"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground"
                      disabled={sortedPortfolioIds[sortedPortfolioIds.length - 1] === group.portfolio.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePortfolio(group.portfolio.id, 1);
                      }}
                      title="Переместить портфель ниже"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewPortfolioId(group.portfolio.id);
                        setCreateDialogOpen(true);
                      }}
                      title="Добавить проект в портфель"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPortfolio(group.portfolio);
                      }}
                      title="Редактировать портфель"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePortfolioId(group.portfolio.id);
                      }}
                      title="Удалить портфель"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Portfolio projects */}
                {!collapsedPortfolios.has(group.portfolio.id) && (
                  <div className="ml-3 border-l border-border/60 pl-1">
                    {group.views.length === 0 ? (
                      <div className="px-3 py-1.5 text-xs text-muted-foreground">
                        Нет проектов — наведите на портфель и нажмите «+»
                      </div>
                    ) : (
                      group.views.map((v) => renderProjectView(v))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div key={group.key} className="flex flex-col">
                {group.showHeader && (
                  <div className="flex items-center gap-2 px-2 pt-3 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    <FolderKanban className="h-3 w-3" />
                    Проекты без портфеля
                  </div>
                )}
                {group.views.map((v) => renderProjectView(v))}
              </div>
            ),
          )}
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

            {portfolios.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Портфель</label>
                <select
                  value={newPortfolioId}
                  onChange={(e) => setNewPortfolioId(e.target.value)}
                  className="h-9 text-sm rounded-md border bg-background px-2"
                >
                  <option value="">Без портфеля</option>
                  {portfolios.map((pf) => (
                    <option key={pf.id} value={pf.id}>{pf.name}</option>
                  ))}
                </select>
              </div>
            )}

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

      {/* Create portfolio dialog */}
      <Dialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать портфель</DialogTitle>
            <DialogDescription>
              Портфель группирует несколько проектов (например, по клиенту или направлению)
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Название</label>
              <Input
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                placeholder="Например: Клиент ABC"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPortfolioName.trim()) handleCreatePortfolio();
                }}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Описание</label>
              <Textarea
                value={newPortfolioDescription}
                onChange={(e) => setNewPortfolioDescription(e.target.value)}
                placeholder="Необязательно..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPortfolioDialogOpen(false)} disabled={creatingPortfolio}>
              Отмена
            </Button>
            <Button onClick={handleCreatePortfolio} disabled={creatingPortfolio || !newPortfolioName.trim()}>
              {creatingPortfolio ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit portfolio dialog */}
      <Dialog open={!!editingPortfolioId} onOpenChange={(v) => !v && setEditingPortfolioId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать портфель</DialogTitle>
            <DialogDescription>
              Измените название и описание портфеля
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Название</label>
              <Input
                value={editPortfolioName}
                onChange={(e) => setEditPortfolioName(e.target.value)}
                placeholder="Например: Клиент ABC"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editPortfolioName.trim()) handleSavePortfolioEdit();
                }}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Описание</label>
              <Textarea
                value={editPortfolioDescription}
                onChange={(e) => setEditPortfolioDescription(e.target.value)}
                placeholder="Необязательно..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPortfolioId(null)} disabled={savingPortfolioEdit}>
              Отмена
            </Button>
            <Button onClick={handleSavePortfolioEdit} disabled={savingPortfolioEdit || !editPortfolioName.trim()}>
              {savingPortfolioEdit ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete portfolio confirmation */}
      <AlertDialog open={!!deletePortfolioId} onOpenChange={(v) => !v && setDeletePortfolioId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить портфель?</AlertDialogTitle>
            <AlertDialogDescription>
              Портфель «{portfolioToDelete?.name}» будет удалён. Проекты внутри него сохранятся,
              но перестанут быть сгруппированы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeletePortfolio}>
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
