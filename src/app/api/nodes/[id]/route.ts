import { NextRequest, NextResponse } from 'next/server';
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

// GET /api/nodes/[id] — get single node with tree
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const node = await db.node.findUnique({
      where: { id },
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

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json(parseNodeFields(node));
  } catch (error) {
    console.error('Error fetching node:', error);
    return NextResponse.json({ error: 'Failed to fetch node' }, { status: 500 });
  }
}

// PUT /api/nodes/[id] — update node
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.nodeType !== undefined) updateData.nodeType = body.nodeType;
    if (body.branchType !== undefined) updateData.branchType = body.branchType;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.parentId !== undefined) updateData.parentId = body.parentId;
    if (body.fields !== undefined) updateData.fields = JSON.stringify(body.fields);

    const node = await db.node.update({
      where: { id },
      data: updateData,
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return NextResponse.json(parseNodeFields(node));
  } catch (error) {
    console.error('Error updating node:', error);
    return NextResponse.json({ error: 'Failed to update node' }, { status: 500 });
  }
}

// DELETE /api/nodes/[id] — delete node (cascade deletes children)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await db.node.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 });
  }
}
