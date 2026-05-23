import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/options';
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === 'admin';

  try {
    const projects = await db.project.findMany({
      where: isAdmin ? {} : { userId },
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

    return NextResponse.json({
      projects: projectsWithCount,
      nodes: rootNodes.map(parseNodeFields),
    });
  } catch (error) {
    console.error('Error fetching all data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
