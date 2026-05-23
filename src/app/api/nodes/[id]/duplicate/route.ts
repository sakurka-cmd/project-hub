import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { db } from '@/lib/db';

// POST /api/nodes/[id]/duplicate — deep clone a node
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const original = await db.node.findUnique({ where: { id } });
    if (!original) {
      return NextResponse.json({ error: 'Узел не найден' }, { status: 404 });
    }

    // Recursively clone node and all children
    async function cloneNode(originalId: string, newParentId: string | null): Promise<string> {
      const node = await db.node.findUnique({
        where: { id: originalId },
        include: { children: { orderBy: { order: 'asc' } } },
      });
      if (!node) throw new Error(`Node ${originalId} not found`);

      const cloned = await db.node.create({
        data: {
          projectId: node.projectId,
          parentId: newParentId,
          name: `${node.name} (копия)`,
          nodeType: node.nodeType,
          branchType: node.branchType,
          fields: node.fields, // Copy JSON fields as-is
          order: node.order,
        },
      });

      // Clone children
      for (const child of node.children) {
        await cloneNode(child.id, cloned.id);
      }

      return cloned.id;
    }

    const newId = await cloneNode(id, original.parentId);

    const clonedNode = await db.node.findUnique({
      where: { id: newId },
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            children: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
              include: { children: true },
            },
          },
        },
      },
    });

    return NextResponse.json(clonedNode);
  } catch (error) {
    console.error('Duplicate error:', error);
    return NextResponse.json({ error: 'Ошибка дублирования' }, { status: 500 });
  }
}
