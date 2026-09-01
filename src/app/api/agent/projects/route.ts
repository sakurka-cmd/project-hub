import { NextRequest, NextResponse } from 'next/server';
import { authorizeAgent, agentUnauthorized, agentProjects } from '@/lib/agent';
import { db } from '@/lib/db';

// GET /api/agent/projects — список проектов (для агентов, Bearer-токен)
export async function GET(request: NextRequest) {
  if (!(await authorizeAgent(request))) return agentUnauthorized();

  try {
    const projects = await agentProjects();

    // Счётчики задач по статусам одним запросом
    const tasks = await db.node.findMany({
      where: { nodeType: 'task', project: { id: { in: projects.map((p) => p.id) } } },
      select: { projectId: true, completed: true },
    });

    const counts = new Map<string, { open: number; total: number }>();
    for (const t of tasks) {
      const c = counts.get(t.projectId) || { open: 0, total: 0 };
      c.total += 1;
      if (!t.completed) c.open += 1;
      counts.set(t.projectId, c);
    }

    const result = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      color: p.color,
      portfolio: p.portfolio ? { id: p.portfolio.id, name: p.portfolio.name } : null,
      nodeCount: p._count.nodes,
      openTasks: counts.get(p.id)?.open || 0,
      totalTasks: counts.get(p.id)?.total || 0,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({ projects: result });
  } catch (error) {
    console.error('Agent projects error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
