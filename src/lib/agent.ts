import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';

// ==================== АВТОРИЗАЦИЯ АГЕНТОВ ====================

export const AGENT_TOKEN_KEY = 'agentApiToken';

/** Получить действующий токен агентов: SystemSetting → env AGENT_API_TOKEN */
export async function getAgentToken(): Promise<{ token: string | null; source: 'setting' | 'env' | 'none' }> {
  const setting = await db.systemSetting.findUnique({ where: { key: AGENT_TOKEN_KEY } });
  if (setting?.value) {
    return { token: setting.value, source: 'setting' };
  }
  if (process.env.AGENT_API_TOKEN) {
    return { token: process.env.AGENT_API_TOKEN, source: 'env' };
  }
  return { token: null, source: 'none' };
}

/** Сгенерировать новый токен (URL-safe) */
export function generateAgentToken(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Проверить Bearer-токен запроса агента.
 * Поддерживаются: заголовок `Authorization: Bearer <token>` и `?token=<token>`.
 */
export async function authorizeAgent(request: NextRequest): Promise<boolean> {
  const { token } = await getAgentToken();
  if (!token) return false;

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const queryToken = request.nextUrl.searchParams.get('token') || '';

  return bearer === token || queryToken === token;
}

/** Стандартный 401-ответ для агентских роутов */
export function agentUnauthorized() {
  return NextResponse.json(
    {
      error: 'Не авторизован: передайте действующий токен агента',
      hint: 'Authorization: Bearer <token> (токен задаётся в Настройках администратором)',
    },
    { status: 401 },
  );
}

// ==================== СЕРИАЛИЗАЦИЯ ====================

export function parseNodeFields(fields: unknown): Record<string, unknown> {
  if (fields && typeof fields === 'object') return fields as Record<string, unknown>;
  if (typeof fields === 'string') {
    try {
      const parsed = JSON.parse(fields);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Описание задачи хранится в fields.taskDescription */
export function taskDescriptionOf(fields: Record<string, unknown>): string {
  const d = fields.taskDescription;
  return typeof d === 'string' ? d : '';
}

export interface AgentProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string;
  portfolio: { id: string; name: string } | null;
  nodeCount: number;
  openTasks: number;
  totalTasks: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTaskDto {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  nodeType: string;
  projectId: string;
  projectName: string;
  taskTypeId: string | null;
  path: string[];
  fields: Record<string, unknown>;
  attachments: Array<{ id: string; fileName: string; originalName: string; size: number; url: string }>;
  createdAt: string;
  updatedAt: string;
}

/** Загрузить видимые проекты (агент с валидным токеном видит все) */
export async function agentProjects() {
  return db.project.findMany({
    include: { portfolio: true, _count: { select: { nodes: true } } },
    orderBy: { name: 'asc' },
  });
}

/**
 * Плоский список задач с путями и описаниями.
 * Задача = Node с nodeType='task'; описание — fields.taskDescription.
 */
export async function agentTasksFlat(options: {
  projectId?: string;
  status?: 'open' | 'done' | 'all';
  q?: string;
}): Promise<AgentTaskDto[]> {
  const { projectId, status = 'open', q } = options;

  const projects = await db.project.findMany({ include: { portfolio: true } });
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const scopeIds = projectId
    ? projects.filter((p) => p.id === projectId || p.name === projectId).map((p) => p.id)
    : projects.map((p) => p.id);

  if (scopeIds.length === 0) return [];

  const nodes = await db.node.findMany({
    where: { projectId: { in: scopeIds } },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const pathOf = (node: (typeof nodes)[number]): string[] => {
    const path: string[] = [];
    let cur = node.parentId ? nodeById.get(node.parentId) : undefined;
    let guard = 0;
    while (cur && guard++ < 50) {
      path.unshift(cur.name);
      cur = cur.parentId ? nodeById.get(cur.parentId) : undefined;
    }
    return path;
  };

  const attachments = await db.fileAttachment.findMany({
    where: { node: { projectId: { in: scopeIds }, nodeType: 'task' } },
    select: { id: true, nodeId: true, fileName: true, originalName: true, size: true },
  });
  const attachmentsByNode = new Map<string, typeof attachments>();
  for (const a of attachments) {
    const list = attachmentsByNode.get(a.nodeId) || [];
    list.push(a);
    attachmentsByNode.set(a.nodeId, list);
  }

  const needle = q ? q.toLowerCase() : null;

  const out: AgentTaskDto[] = [];
  for (const node of nodes) {
    if (node.nodeType !== 'task') continue;
    if (status === 'open' && node.completed) continue;
    if (status === 'done' && !node.completed) continue;

    const fields = parseNodeFields(node.fields);
    const description = taskDescriptionOf(fields);

    if (needle) {
      const haystack = `${node.name}\n${description}`.toLowerCase();
      if (!haystack.includes(needle)) continue;
    }

    const project = projectById.get(node.projectId);
    out.push({
      id: node.id,
      name: node.name,
      description,
      completed: node.completed,
      nodeType: node.nodeType,
      projectId: node.projectId,
      projectName: project?.name || '',
      taskTypeId: node.taskTypeId,
      path: pathOf(node),
      fields,
      attachments: (attachmentsByNode.get(node.id) || []).map((a) => ({
        id: a.id,
        fileName: a.fileName,
        originalName: a.originalName,
        size: a.size,
        url: `/api/agent/files/${a.id}`,
      })),
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    });
  }
  return out;
}

/** Сериализация одного узла (для GET /api/agent/tasks/[id] и nodes/[id]) */
export async function agentNodeDto(node: {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  nodeType: string;
  branchType: string | null;
  elementTypeId: string | null;
  taskTypeId: string | null;
  completed: boolean;
  fields: unknown;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  const project = await db.project.findUnique({ where: { id: node.projectId } });

  // Путь: поднимаемся по предкам
  const path: string[] = [];
  let curId = node.parentId;
  let guard = 0;
  while (curId && guard++ < 50) {
    const parent = await db.node.findUnique({ where: { id: curId } });
    if (!parent) break;
    path.unshift(parent.name);
    curId = parent.parentId;
  }

  const attachments = await db.fileAttachment.findMany({
    where: { nodeId: node.id },
    select: { id: true, fileName: true, originalName: true, mimeType: true, size: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const fields = parseNodeFields(node.fields);

  return {
    id: node.id,
    name: node.name,
    nodeType: node.nodeType,
    branchType: node.branchType,
    completed: node.completed,
    projectId: node.projectId,
    projectName: project?.name || '',
    taskTypeId: node.taskTypeId,
    elementTypeId: node.elementTypeId,
    order: node.order,
    path,
    fields,
    description: node.nodeType === 'task' ? taskDescriptionOf(fields) : undefined,
    attachments: attachments.map((a) => ({ ...a, url: `/api/agent/files/${a.id}` })),
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
  };
}
