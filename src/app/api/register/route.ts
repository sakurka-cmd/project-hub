import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Имя пользователя и пароль обязательны' }, { status: 400 });
    }

    if (username.length < 2) {
      return NextResponse.json({ error: 'Имя пользователя должно быть не менее 2 символов' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Пароль должен быть не менее 4 символов' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Пользователь уже существует' }, { status: 409 });
    }

    const userCount = await db.user.count();

    // Check if registration is allowed (unless it's the first user / admin)
    if (userCount > 0) {
      const regSetting = await db.systemSetting.findUnique({ where: { key: 'allow_registration' } });
      if (regSetting && regSetting.value === 'false') {
        return NextResponse.json({ error: 'Регистрация закрыта администратором' }, { status: 403 });
      }
    }

    const user = await db.user.create({
      data: {
        username: username.trim(),
        password: hashPassword(password),
        role: userCount === 0 ? 'admin' : 'user',
      },
    });

    // Create default system settings if admin
    if (userCount === 0) {
      await db.systemSetting.upsert({
        where: { key: 'max_file_size_mb' },
        update: {},
        create: { key: 'max_file_size_mb', value: '10' },
      });
      await db.systemSetting.upsert({
        where: { key: 'allow_registration' },
        update: {},
        create: { key: 'allow_registration', value: 'true' },
      });

      // Assign orphaned projects to the admin
      await db.project.updateMany({
        where: { userId: null },
        data: { userId: user.id },
      });
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Ошибка регистрации' }, { status: 500 });
  }
}
