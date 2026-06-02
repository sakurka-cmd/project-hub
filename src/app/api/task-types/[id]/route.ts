import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await db.taskType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Тип задачи не найден' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Название обязательно' }, { status: 400 });
    }

    const taskType = await db.taskType.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || existing.color,
      },
    });

    return NextResponse.json(taskType);
  } catch (error) {
    console.error('Error updating task type:', error);
    return NextResponse.json({ error: 'Failed to update task type' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await db.taskType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Тип задачи не найден' }, { status: 404 });
    }

    await db.taskType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task type:', error);
    return NextResponse.json({ error: 'Failed to delete task type' }, { status: 500 });
  }
}
