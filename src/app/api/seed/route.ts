import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// One-time seed: create admin/admin if no users exist
export async function POST() {
  try {
    const userCount = await db.user.count();
    if (userCount > 0) {
      return NextResponse.json({ message: 'Пользователи уже существуют' });
    }

    const admin = await db.user.create({
      data: {
        username: 'admin',
        password: hashPassword('admin'),
        role: 'admin',
      },
    });

    // Default settings
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

    // Assign orphaned projects
    await db.project.updateMany({
      where: { userId: null },
      data: { userId: admin.id },
    });

    return NextResponse.json({
      message: 'Админ создан (admin/admin)',
      username: 'admin',
      password: 'admin',
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Ошибка seed' }, { status: 500 });
  }
}

export async function GET() {
  const userCount = await db.user.count();
  return NextResponse.json({ userCount });
}
