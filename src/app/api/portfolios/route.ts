import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

// GET /api/portfolios — список портфелей со счётчиком проектов
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const portfolios = await db.portfolio.findMany({
      include: { _count: { select: { projects: true } } },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    const result = portfolios.map((p) => ({
      ...p,
      projectCount: p._count.projects,
      _count: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolios' }, { status: 500 });
  }
}

// POST /api/portfolios — создать портфель
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, order } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Название портфеля обязательно' }, { status: 400 });
    }

    const portfolio = await db.portfolio.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ...(typeof order === 'number' && { order }),
      },
    });

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error) {
    console.error('Error creating portfolio:', error);
    return NextResponse.json({ error: 'Failed to create portfolio' }, { status: 500 });
  }
}
