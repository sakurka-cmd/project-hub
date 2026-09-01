import { NextRequest, NextResponse } from 'next/server';
import { authorizeAgent, agentUnauthorized, parseNodeFields } from '@/lib/agent';
import { db } from '@/lib/db';

// GET /api/agent/projects/[id] — проект + полное дерево узлов (для агентов)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAgent(request))) return agentUnauthorized();

  const { id } = await params;

  try {
    const project = await db.project.findUnique({
      where: { id },
      include: { portfolio: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    const roots = await db.node.findMany({
      where: { projectId: id, parentId: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            children: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
              include: {
                children: {
                  orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                  include: {
                    children: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
                  },
                },
              },
            },
          },
        },
      },
    });

    const parseTree = (nodes: Array<Record<string, unknown>>): unknown[] =>
      nodes.map((n) => ({
        ...n,
        fields: parseNodeFields(n.fields),
        children: n.children ? parseTree(n.children as Array<Record<string, unknown>>) : [],
      }));

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        portfolio: project.portfolio
          ? { id: project.portfolio.id, name: project.portfolio.name }
          : null,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      nodes: parseTree(roots as unknown as Array<Record<string, unknown>>),
    });
  } catch (error) {
    console.error('Agent project detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}
