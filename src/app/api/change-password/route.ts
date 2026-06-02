import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Укажите текущий и новый пароль' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Пароль должен быть не менее 4 символов' }, { status: 400 });
    }

    const account = await db.user.findUnique({ where: { id: user.id } });
    if (!account) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const valid = verifyPassword(currentPassword, account.password);
    if (!valid) {
      return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 403 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { password: hashPassword(newPassword) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Ошибка смены пароля' }, { status: 500 });
  }
}
