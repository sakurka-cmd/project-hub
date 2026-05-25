import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

function parseTypeFields(type: any): any {
  let fields = [];
  try {
    fields = typeof type.fields === 'string' ? JSON.parse(type.fields) : (type.fields || []);
  } catch {
    fields = [];
  }
  return { ...type, fields };
}

// PUT /api/element-types/[id] — только админ
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const existing = await db.elementType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Тип не найден' }, { status: 404 });
    }

    const { name, description, color, fields } = body;

    const type = await db.elementType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color !== undefined && { color }),
        ...(fields !== undefined && { fields: JSON.stringify(Array.isArray(fields) ? fields : []) }),
      },
    });

    return NextResponse.json(parseTypeFields(type));
  } catch (error) {
    console.error('Error updating element type:', error);
    return NextResponse.json({ error: 'Failed to update element type' }, { status: 500 });
  }
}

// DELETE /api/element-types/[id] — только админ
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await db.elementType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Тип не найден' }, { status: 404 });
    }

    // onDelete: SetNull — узлы не удаляются, просто теряют ссылку на тип
    await db.elementType.delete({ where: { id } });
    return NextResponse.json({ message: 'Тип удалён' });
  } catch (error) {
    console.error('Error deleting element type:', error);
    return NextResponse.json({ error: 'Failed to delete element type' }, { status: 500 });
  }
}
