import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const taskTypes = await db.taskType.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(taskTypes);
  } catch (error) {
    console.error('Error fetching task types:', error);
    return NextResponse.json({ error: 'Failed to fetch task types' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Название обязательно' }, { status: 400 });
    }

    const taskType = await db.taskType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6366f1',
      },
    });

    return NextResponse.json(taskType, { status: 201 });
  } catch (error) {
    console.error('Error creating task type:', error);
    return NextResponse.json({ error: 'Failed to create task type' }, { status: 500 });
  }
}
