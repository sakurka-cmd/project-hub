import { NextRequest, NextResponse } from 'next/server';
import { authorizeAgent, agentUnauthorized, agentNodeDto, parseNodeFields, taskDescriptionOf } from '@/lib/agent';
import { db } from '@/lib/db';

// GET /api/agent/nodes/[id] — узел + дочерние + вложения
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAgent(request))) return agentUnauthorized();

  const { id } = await params;

  try {
    const node = await db.node.findUnique({ where: { id } });
    if (!node) {
      return NextResponse.json({ error: 'Узел не найден' }, { status: 404 });
    }

    const dto = await agentNodeDto(node);

    const children = await db.node.findMany({
      where: { parentId: id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({
      ...dto,
      children: await Promise.all(
        children.map(async (c) => {
          const fields = parseNodeFields(c.fields);
          return {
            id: c.id,
            name: c.name,
            nodeType: c.nodeType,
            branchType: c.branchType,
            completed: c.completed,
            description: c.nodeType === 'task' ? taskDescriptionOf(fields) : undefined,
            fields,
          };
        }),
      ),
    });
  } catch (error) {
    console.error('Agent node get error:', error);
    return NextResponse.json({ error: 'Failed to fetch node' }, { status: 500 });
  }
}

// PATCH /api/agent/nodes/[id] — обновить: { name?, completed?, parentId?, fields? }
// Для задач также description → fields.taskDescription
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAgent(request))) return agentUnauthorized();

  const { id } = await params;

  try {
    const node = await db.node.findUnique({ where: { id } });
    if (!node) {
      return NextResponse.json({ error: 'Узел не найден' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, completed, parentId, description, fields: extraFields } = body as {
      name?: unknown;
      completed?: unknown;
      parentId?: unknown;
      description?: unknown;
      fields?: unknown;
    };

    // Родитель должен быть в том же проекте
    let newParentId: string | null | undefined;
    if (parentId !== undefined) {
      if (parentId === null) {
        newParentId = null;
      } else if (typeof parentId === 'string' && parentId !== '') {
        const parent = await db.node.findFirst({
          where: { id: parentId, projectId: node.projectId },
        });
        if (!parent || parent.id === node.id) {
          return NextResponse.json({ error: 'Недопустимый parentId' }, { status: 400 });
        }
        newParentId = parent.id;
      }
    }

    const merged = parseNodeFields(node.fields);
    if ((typeof description === 'string' || description === null) && node.nodeType === 'task') {
      merged.taskDescription = description ?? '';
    }
    if (extraFields && typeof extraFields === 'object' && !Array.isArray(extraFields)) {
      for (const [k, v] of Object.entries(extraFields as Record<string, unknown>)) {
        if (k === 'taskDescription') continue;
        merged[k] = v;
      }
    }

    const updated = await db.node.update({
      where: { id },
      data: {
        ...(typeof name === 'string' && name.trim() !== '' && { name: name.trim() }),
        ...(typeof completed === 'boolean' && { completed }),
        ...(newParentId !== undefined && { parentId: newParentId }),
        fields: JSON.stringify(merged),
      },
    });

    return NextResponse.json(await agentNodeDto(updated));
  } catch (error) {
    console.error('Agent node update error:', error);
    return NextResponse.json({ error: 'Failed to update node' }, { status: 500 });
  }
}
