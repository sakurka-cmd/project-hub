import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

function parseNodeFields(node: any): any {
  let fields = {};
  try {
    fields = typeof node.fields === 'string' ? JSON.parse(node.fields) : (node.fields || {});
  } catch {
    fields = {};
  }
  const result = { ...node, fields };
  if (result.children) {
    result.children = result.children.map(parseNodeFields);
  }
  return result;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const projects = await db.project.findMany({
      where: user.role === 'admin' ? {} : { userId: user.id },
      include: { _count: { select: { nodes: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const projectIds = projects.map((p) => p.id);

    const rootNodes = await db.node.findMany({
      where: { projectId: { in: projectIds }, parentId: null },
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
                    children: {
                      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const projectsWithCount = projects.map((p) => ({
      ...p,
      nodeCount: p._count.nodes,
      _count: undefined,
    }));

    // Element types
    const elementTypes = await db.elementType.findMany({
      orderBy: { createdAt: 'asc' },
    }).map((t) => {
      let fields = [];
      try { fields = JSON.parse(t.fields); } catch { fields = []; }
      return { ...t, fields };
    });

    return NextResponse.json({
      projects: projectsWithCount,
      nodes: rootNodes.map(parseNodeFields),
      elementTypes,
    });
  } catch (error) {
    console.error('Error fetching all data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
