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

// GET /api/element-types — все авторизованные пользователи могут читать
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const types = await db.elementType.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(types.map(parseTypeFields));
  } catch (error) {
    console.error('Error fetching element types:', error);
    return NextResponse.json({ error: 'Failed to fetch element types' }, { status: 500 });
  }
}

// POST /api/element-types — только админ
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, color, fields } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Название типа обязательно' }, { status: 400 });
    }

    const parsedFields = Array.isArray(fields) ? fields : [];

    const type = await db.elementType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6366f1',
        fields: JSON.stringify(parsedFields),
      },
    });

    return NextResponse.json(parseTypeFields(type), { status: 201 });
  } catch (error) {
    console.error('Error creating element type:', error);
    return NextResponse.json({ error: 'Failed to create element type' }, { status: 500 });
  }
}
