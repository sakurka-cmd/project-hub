import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

// GET — settings (admin sees all, users see public_* only)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const isAdmin = user.role === 'admin';
    const settings = isAdmin
      ? await db.systemSetting.findMany()
      : await db.systemSetting.findMany({ where: { key: { startsWith: 'public_' } } });

    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return NextResponse.json(map);
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}

// PUT — update settings (admin only)
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const settings: Record<string, string> = body;

    for (const [key, value] of Object.entries(settings)) {
      await db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}
