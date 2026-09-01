'use client';

import { useMemo } from 'react';
import {
  FolderKanban,
  FileText,
  CircleDot,
  ClipboardList,
  Paperclip,
  Search,
  CornerDownLeft,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useAppStore } from '@/lib/store';
import { flattenNodes, nodeSearchText } from '@/lib/search';

const MAX_NODES = 500;
const MAX_FILES = 100;

function NodeIcon({ nodeType }: { nodeType: 'branch' | 'item' | 'task' | 'protocol' }) {
  if (nodeType === 'branch') return <FolderKanban className="h-4 w-4 text-muted-foreground" />;
  if (nodeType === 'task') return <CircleDot className="h-4 w-4 text-muted-foreground" />;
  if (nodeType === 'protocol') return <ClipboardList className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

/** Макс. 2 последних звена пути: "…/Ветка/Подветка" */
function pathLabel(ancestorNames: string[]): string {
  if (!ancestorNames.length) return '';
  if (ancestorNames.length <= 2) return ancestorNames.join(' / ');
  return `… / ${ancestorNames.slice(-2).join(' / ')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}

interface SearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Глобальный поиск (Ctrl+K / ⌘K).
 * Все данные уже на клиенте (all-data), поэтому поиск мгновенный и выполняется cmdk:
 * каждый айтем имеет value из названия + пути + полей; cmdk фильтрует и скрывает пустые группы.
 */
export function SearchPalette({ open, onOpenChange }: SearchPaletteProps) {
  const projects = useAppStore((s) => s.projects);
  const nodes = useAppStore((s) => s.nodes);
  const attachments = useAppStore((s) => s.attachments);
  const loading = useAppStore((s) => s.loading);
  const requestNavigate = useAppStore((s) => s.requestNavigate);

  // Плоский индекс узлов — только когда палетка открыта
  const flat = useMemo(() => (open ? flattenNodes(nodes) : []), [nodes, open]);

  const projectNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) m.set(p.id, p.name);
    return m;
  }, [projects]);

  // nodeId → projectId (для файлов)
  const projectIdByNodeId = useMemo(() => {
    const m = new Map<string, string>();
    for (const fn of flat) m.set(fn.node.id, fn.projectId);
    return m;
  }, [flat]);

  // Имя узла-владельца файла (для подзаголовка)
  const nodeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const fn of flat) m.set(fn.node.id, fn.node.name);
    return m;
  }, [flat]);

  const navigateToProject = (projectId: string) => {
    requestNavigate(projectId, null);
    onOpenChange(false);
  };

  const navigateToNode = (projectId: string, nodeId: string) => {
    if (!projectId) return;
    requestNavigate(projectId, nodeId);
    onOpenChange(false);
  };

  const hasAnyData = projects.length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Глобальный поиск"
      description="Поиск по проектам, узлам и файлам"
      className="sm:max-w-xl"
    >
      <CommandInput placeholder="Поиск по проектам, задачам, файлам…" />
      <CommandList className="max-h-[min(60vh,440px)]">
        {loading && !hasAnyData ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Загрузка данных…</div>
        ) : !hasAnyData ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Нет проектов для поиска
          </div>
        ) : (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-1 py-4 text-sm text-muted-foreground">
              <Search className="h-5 w-5 mb-1 opacity-50" />
              Ничего не найдено
            </div>
          </CommandEmpty>
        )}

        {/* Проекты */}
        {hasAnyData && (
          <CommandGroup heading="Проекты">
            {projects.map((p) => (
              <CommandItem
                key={`p-${p.id}`}
                value={['project', p.name, p.description ?? ''].join(' ')}
                onSelect={() => navigateToProject(p.id)}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="truncate">{p.name}</span>
                {p.status !== 'active' && (
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                    {p.status}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Узлы: ветки, элементы, задачи, протоколы. cmdk скрывает непопадающее. */}
        {hasAnyData && (
          <CommandGroup heading="Узлы и задачи">
            {flat.slice(0, MAX_NODES).map((fn) => {
              const { fieldsText } = nodeSearchText(fn);
              const projName = projectNameById.get(fn.projectId) ?? '';
              return (
                <CommandItem
                  key={`n-${fn.node.id}`}
                  value={[fn.node.name, fn.ancestorNames.join(' '), projName, fieldsText].join(' ')}
                  onSelect={() => navigateToNode(fn.projectId, fn.node.id)}
                >
                  <NodeIcon nodeType={fn.node.nodeType} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{fn.node.name}</span>
                    {(fn.ancestorNames.length > 0 || projName) && (
                      <span className="text-[11px] text-muted-foreground truncate">
                        {[projName, pathLabel(fn.ancestorNames)].filter(Boolean).join(' / ')}
                      </span>
                    )}
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Файлы */}
        {hasAnyData && attachments.length > 0 && (
          <CommandGroup heading="Файлы">
            {attachments.slice(0, MAX_FILES).map((a) => (
              <CommandItem
                key={`f-${a.id}`}
                value={['file', a.originalName, nodeNameById.get(a.nodeId) ?? ''].join(' ')}
                onSelect={() => navigateToNode(projectIdByNodeId.get(a.nodeId) ?? '', a.nodeId)}
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{a.originalName}</span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {[nodeNameById.get(a.nodeId), formatSize(a.size)].filter(Boolean).join(' · ')}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasAnyData && <CommandSeparator />}
        <div className="flex items-center gap-3 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border bg-muted px-1 font-mono text-[10px]">
              ↑↓
            </kbd>
            навигация
          </span>
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border bg-muted px-1 font-mono text-[10px]">
              <CornerDownLeft className="h-2.5 w-2.5" />
            </kbd>
            открыть
          </span>
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border bg-muted px-1 font-mono text-[10px]">
              Esc
            </kbd>
            закрыть
          </span>
        </div>
      </CommandList>
    </CommandDialog>
  );
}
