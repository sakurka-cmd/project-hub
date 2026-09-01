import { NextRequest, NextResponse } from 'next/server';
import { authorizeAgent, agentUnauthorized, agentTasksFlat } from '@/lib/agent';

// GET /api/agent/tasks?project=<id|name>&status=open|done|all&q=<поиск>
// Плоский список задач с описаниями и путями (для агентов)
export async function GET(request: NextRequest) {
  if (!(await authorizeAgent(request))) return agentUnauthorized();

  try {
    const sp = request.nextUrl.searchParams;
    const project = sp.get('project') || undefined;
    const statusParam = sp.get('status') || 'open';
    const status: 'open' | 'done' | 'all' =
      statusParam === 'done' || statusParam === 'all' ? statusParam : 'open';
    const q = sp.get('q') || undefined;

    const tasks = await agentTasksFlat({ projectId: project, status, q });

    return NextResponse.json({ count: tasks.length, tasks });
  } catch (error) {
    console.error('Agent tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}
