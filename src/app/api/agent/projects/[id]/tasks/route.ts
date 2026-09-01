import { NextRequest, NextResponse } from 'next/server';
import { authorizeAgent, agentUnauthorized, agentNodeDto, parseNodeFields } from '@/lib/agent';
import { db } from '@/lib/db';

const NODE_TYPES = ['branch', 'item', 'task', 'protocol'];

// POST /api/agent/projects/[id]/tasks — создать задачу
// body: { name, description?, parentId?, taskTypeId? }
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
    const { name, description, parentId, taskTypeId } = body as {
      name?: unknown;
      description?: unknown;
      parentId?: unknown;
      taskTypeId?: unknown;
    };

    if (typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Обязательно название задачи (name)' }, { status: 400 });
    }

    // Родитель должен принадлежать тому же проекту
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

    const fields: Record<string, unknown> = {};
    if (typeof description === 'string' && description.trim() !== '') {
      fields.taskDescription = description;
    }

    const node = await db.node.create({
      data: {
        projectId: id,
        parentId: parent?.id || null,
        name: name.trim(),
        nodeType: 'task',
        taskTypeId: typeof taskTypeId === 'string' && taskTypeId !== '' ? taskTypeId : null,
        fields: JSON.stringify(fields),
      },
    });

    return NextResponse.json(await agentNodeDto(node), { status: 201 });
  } catch (error) {
    console.error('Agent task create error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
