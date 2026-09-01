import { NextRequest, NextResponse } from 'next/server';
import { authorizeAgent, agentUnauthorized, agentNodeDto, parseNodeFields } from '@/lib/agent';
import { db } from '@/lib/db';

const NODE_TYPES = ['branch', 'item', 'task', 'protocol'];

// POST /api/agent/projects/[id]/nodes — создать узел любого типа
// body: { name, nodeType: branch|item|task|protocol, parentId?, branchType?, description?, fields? }
// Удобно для документации (branch/item с описанием) и инфраструктуры
// (branchType: tasks|infrastructure|credentials|artifacts).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAgent(request))) return agentUnauthorized();

  const { id } = await params;

  try {
    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, nodeType, parentId, branchType, description, fields: extraFields } = body as {
      name?: unknown;
      nodeType?: unknown;
      parentId?: unknown;
      branchType?: unknown;
      description?: unknown;
      fields?: unknown;
    };

    if (typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Обязательно название узла (name)' }, { status: 400 });
    }
    if (typeof nodeType !== 'string' || !NODE_TYPES.includes(nodeType)) {
      return NextResponse.json(
        { error: `nodeType должен быть одним из: ${NODE_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    let parent: { id: string } | null = null;
    if (typeof parentId === 'string' && parentId !== '') {
      parent = await db.node.findFirst({ where: { id: parentId, projectId: id } });
      if (!parent) {
        return NextResponse.json(
          { error: 'parentId не найден в этом проекте' },
          { status: 400 },
        );
      }
    }

    const fields = parseNodeFields(null);
    if (typeof description === 'string' && description.trim() !== '') {
      fields.taskDescription = description;
    }
    if (extraFields && typeof extraFields === 'object' && !Array.isArray(extraFields)) {
      for (const [k, v] of Object.entries(extraFields as Record<string, unknown>)) {
        if (k === 'taskDescription') continue;
        fields[k] = v;
      }
    }

    const node = await db.node.create({
      data: {
        projectId: id,
        parentId: parent?.id || null,
        name: name.trim(),
        nodeType,
        branchType: nodeType === 'branch' && typeof branchType === 'string' ? branchType : null,
        fields: JSON.stringify(fields),
      },
    });

    return NextResponse.json(await agentNodeDto(node), { status: 201 });
  } catch (error) {
    console.error('Agent node create error:', error);
    return NextResponse.json({ error: 'Failed to create node' }, { status: 500 });
  }
}
