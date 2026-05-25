import { NextRequest, NextResponse } from 'next/server';
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

// GET /api/nodes?projectId=xxx
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  try {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });

    if (user.role !== 'admin' && project.userId !== user.id) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const nodes = await db.node.findMany({
      where: { projectId, parentId: null },
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
                  include: { children: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(nodes.map(parseNodeFields));
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 });
  }
}

// POST /api/nodes
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { projectId, parentId, name, nodeType, branchType, elementTypeId, fields, order } = body;

    if (!projectId || !name) {
      return NextResponse.json({ error: 'projectId and name are required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });

    if (user.role !== 'admin' && project.userId !== user.id) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    let nodeOrder = order ?? 0;
    if (order === undefined || order === null) {
      const siblings = await db.node.findMany({
        where: { projectId, parentId: parentId || null },
        orderBy: { order: 'desc' },
        take: 1,
      });
      nodeOrder = siblings.length > 0 ? (siblings[0].order + 1) : 0;
    }

    const node = await db.node.create({
      data: {
        projectId,
        parentId: parentId || null,
        name,
        nodeType: nodeType || 'item',
        branchType: branchType || null,
        elementTypeId: elementTypeId || null,
        fields: fields ? JSON.stringify(fields) : '{}',
        order: nodeOrder,
      },
    });

    return NextResponse.json(parseNodeFields(node));
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json({ error: 'Failed to create node' }, { status: 500 });
  }
}
