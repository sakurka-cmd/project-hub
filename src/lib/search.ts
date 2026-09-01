import type { Project, ProjectNode } from '@/types';

// ==================== НОРМАЛИЗАЦИЯ ====================

/** Нормализация строки для поиска: нижний регистр + ё→е */
export function normQuery(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е');
}

/** Совпадает ли хотя бы один текст с запросом (подстрока, без учёта регистра) */
export function matchesAny(query: string, ...texts: Array<string | null | undefined>): boolean {
  if (!query) return false;
  return texts.some((t) => t != null && normQuery(t).includes(query));
}

// ==================== ПЛОСКИЙ ИНДЕКС УЗЛОВ ====================

export interface FlatNode {
  node: ProjectNode;
  projectId: string;
  /** Имена предков от корня (без самого узла) */
  ancestorNames: string[];
  /** Поле fields, распарсенное в объект */
  fields: Record<string, unknown>;
}

/** Расплющить дерево узлов в плоский список с путями */
export function flattenNodes(roots: ProjectNode[]): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (list: ProjectNode[], projectId: string, ancestors: string[]) => {
    for (const n of list) {
      let fields: Record<string, unknown> = {};
      if (n.fields && typeof n.fields === 'object') fields = n.fields;
      out.push({ node: n, projectId, ancestorNames: ancestors, fields });
      if (n.children?.length) {
        walk(n.children, projectId, [...ancestors, n.name]);
      }
    }
  };
  for (const root of roots) {
    // Разные проекты могут иметь корни в общем массиве store
    walk([root], root.projectId, []);
  }
  return out;
}

/** Текст узла для поиска: имя + ключи и строковые значения полей */
export function nodeSearchText(fn: FlatNode): { name: string; fieldsText: string } {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(fn.fields)) {
    if (value == null) continue;
    parts.push(key);
    if (typeof value === 'string') parts.push(value);
    else if (typeof value === 'number' || typeof value === 'boolean') parts.push(String(value));
    else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') parts.push(item);
        else if (item && typeof item === 'object') {
          for (const v of Object.values(item as Record<string, unknown>)) {
            if (typeof v === 'string') parts.push(v);
          }
        }
      }
    }
  }
  return { name: fn.node.name, fieldsText: parts.join(' ') };
}

// ==================== ФИЛЬТР ДЕРЕВА ====================

export interface FilteredSubtree {
  /** Отфильтрованное поддерево (совпадения + их предки) */
  roots: ProjectNode[];
  /** id узлов, которые нужно принудительно раскрыть */
  forcedExpand: Set<string>;
  /** Всего совпавших узлов */
  matchCount: number;
}

function keepMatches(list: ProjectNode[], q: string, forced: Set<string>): { kept: ProjectNode[]; count: number } {
  const kept: ProjectNode[] = [];
  let count = 0;
  for (const n of list) {
    const selfMatch = matchesAny(q, n.name);
    let filteredChildren: ProjectNode[] = [];
    let childCount = 0;
    if (n.children?.length) {
      const res = keepMatches(n.children, q, forced);
      filteredChildren = res.kept;
      childCount = res.count;
    }
    if (selfMatch || childCount > 0) {
      count += (selfMatch ? 1 : 0) + childCount;
      if (childCount > 0) forced.add(n.id);
      kept.push({
        ...n,
        children: selfMatch ? n.children : filteredChildren,
      });
    }
  }
  return { kept, count };
}

/**
 * Отфильтровать корневые узлы по запросу: остаются совпадения и их предки.
 * Поля не участвуют в фильтре дерева — только имена (чтобы не разваливать структуру).
 */
export function filterTree(roots: ProjectNode[], q: string): FilteredSubtree {
  const forcedExpand = new Set<string>();
  if (!q) return { roots, forcedExpand, matchCount: 0 };
  const { kept, count } = keepMatches(roots, q, forcedExpand);
  return { roots: kept, forcedExpand, matchCount: count };
}

/** Совпадает ли проект целиком (по названию/описанию) */
export function projectMatches(project: Project, q: string): boolean {
  return matchesAny(q, project.name, project.description);
}

// ==================== ПОДСВЕТКА ====================

export interface HighlightPart {
  text: string;
  match: boolean;
}

/**
 * Разбить текст на части для подсветки совпадений.
 * Нормализация не меняет длину (lowercase + ё→е), поэтому индексы валины для исходника.
 */
export function splitHighlight(text: string, query: string): HighlightPart[] {
  if (!query) return [{ text, match: false }];
  const normText = normQuery(text);
  const q = normQuery(query);
  const parts: HighlightPart[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = normText.indexOf(q, i);
    if (idx === -1) {
      parts.push({ text: text.slice(i), match: false });
      break;
    }
    if (idx > i) parts.push({ text: text.slice(i, idx), match: false });
    parts.push({ text: text.slice(idx, idx + q.length), match: true });
    i = idx + q.length;
  }
  return parts.length ? parts : [{ text, match: false }];
}
