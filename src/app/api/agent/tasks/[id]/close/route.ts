import { NextRequest, NextResponse } from 'next/server';
import { authorizeAgent, agentUnauthorized, agentNodeDto } from '@/lib/agent';
import { db } from '@/lib/db';

// POST /api/agent/tasks/[id]/close — закрыть задачу (completed=true)
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

    const updated = await db.node.update({ where: { id }, data: { completed: true } });
    return NextResponse.json(await agentNodeDto(updated));
  } catch (error) {
    console.error('Agent task close error:', error);
    return NextResponse.json({ error: 'Failed to close task' }, { status: 500 });
  }
}
