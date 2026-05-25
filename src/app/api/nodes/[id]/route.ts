import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
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

// GET
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

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
                  include: { children: true },
                },
              },
            },
          },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
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

// PUT
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

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
    if (body.completed !== undefined) updateData.completed = body.completed;
    if (body.taskTypeId !== undefined) updateData.taskTypeId = body.taskTypeId || null;

    const node = await db.node.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(parseNodeFields(node));
  } catch (error) {
    console.error('Error updating node:', error);
    return NextResponse.json({ error: 'Failed to update node' }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Delete file attachments from disk
    const attachments = await db.fileAttachment.findMany({ where: { nodeId: id } });
    const { readdir, rm } = await import('fs/promises');
    const path = await import('path');

    for (const att of attachments) {
      try {
        const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
        await rm(path.join(dir, att.nodeId, att.fileName), { force: true });
      } catch {}
    }

    await db.node.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 });
  }
}
