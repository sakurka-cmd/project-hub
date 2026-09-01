import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

// PUT /api/portfolios/[id] — переименовать/обновить портфель
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await db.portfolio.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Портфель не найден' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, order } = body;

    const portfolio = await db.portfolio.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(typeof order === 'number' && { order }),
      },
    });

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json({ error: 'Failed to update portfolio' }, { status: 500 });
  }
}

// DELETE /api/portfolios/[id] — удалить портфель (проекты остаются, отвязываются)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await db.portfolio.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Портфель не найден' }, { status: 404 });
    }

    await db.portfolio.delete({ where: { id } });
    return NextResponse.json({ message: 'Портфель удалён' });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    return NextResponse.json({ error: 'Failed to delete portfolio' }, { status: 500 });
  }
}
