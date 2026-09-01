import { NextRequest, NextResponse } from 'next/server';
import {
  authorizeAgent,
  agentUnauthorized,
  agentNodeDto,
  parseNodeFields,
  taskDescriptionOf,
} from '@/lib/agent';
import { db } from '@/lib/db';

// GET /api/agent/tasks/[id] — задача с описанием, полями, путём и вложениями
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAgent(request))) return agentUnauthorized();

  const { id } = await params;

  try {
    const node = await db.node.findUnique({ where: { id } });
    if (!node || node.nodeType !== 'task') {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }
    return NextResponse.json(await agentNodeDto(node));
  } catch (error) {
    console.error('Agent task get error:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// PATCH /api/agent/tasks/[id] — обновить: { name?, description?, completed?, fields? }
// fields сливается с существующими; description → fields.taskDescription
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAgent(request))) return agentUnauthorized();

  const { id } = await params;

  try {
    const node = await db.node.findUnique({ where: { id } });
    if (!node || node.nodeType !== 'task') {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, description, completed, fields: extraFields } = body as {
      name?: unknown;
      description?: unknown;
      completed?: unknown;
      fields?: unknown;
    };

    const merged = parseNodeFields(node.fields);
    if (typeof description === 'string' || description === null) {
      merged.taskDescription = description ?? '';
    }
    if (extraFields && typeof extraFields === 'object' && !Array.isArray(extraFields)) {
      for (const [k, v] of Object.entries(extraFields as Record<string, unknown>)) {
        if (k === 'taskDescription') continue; // описанием управляет отдельное поле
        merged[k] = v;
      }
    }

    const updated = await db.node.update({
      where: { id },
      data: {
        ...(typeof name === 'string' && name.trim() !== '' && { name: name.trim() }),
        ...(typeof completed === 'boolean' && { completed }),
        fields: JSON.stringify(merged),
      },
    });

    const dto = await agentNodeDto(updated);
    return NextResponse.json(dto);
  } catch (error) {
    console.error('Agent task update error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// POST /api/agent/tasks/[id] — для совместимости: закрыть задачу
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAgent(request))) return agentUnauthorized();

  const { id } = await params;

  try {
    const node = await db.node.findUnique({ where: { id } });
    if (!node || node.nodeType !== 'task') {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const action = (body as { action?: string }).action;

    if (action === 'reopen') {
      const updated = await db.node.update({ where: { id }, data: { completed: false } });
      return NextResponse.json(await agentNodeDto(updated));
    }

    // По умолчанию POST = закрыть
    const updated = await db.node.update({ where: { id }, data: { completed: true } });
    return NextResponse.json(await agentNodeDto(updated));
  } catch (error) {
    console.error('Agent task action error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
