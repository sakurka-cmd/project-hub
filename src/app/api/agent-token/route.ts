import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/options';
import {
  AGENT_TOKEN_KEY,
  getAgentToken,
  generateAgentToken,
} from '@/lib/agent';
import { db } from '@/lib/db';

// GET /api/agent-token — посмотреть текущий токен агентов (только admin)
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user?.name
    ? await db.user.findUnique({ where: { username: session.user.name } })
    : null;
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступно только администратору' }, { status: 403 });
  }

  const { token, source } = await getAgentToken();
  return NextResponse.json({ configured: !!token, token, source });
}

// POST /api/agent-token — сгенерировать новый токен (только admin)
export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user?.name
    ? await db.user.findUnique({ where: { username: session.user.name } })
    : null;
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступно только администратору' }, { status: 403 });
  }

  const token = generateAgentToken();
  await db.systemSetting.upsert({
    where: { key: AGENT_TOKEN_KEY },
    update: { value: token },
    create: { key: AGENT_TOKEN_KEY, value: token },
  });

  return NextResponse.json({ configured: true, token, source: 'setting' });
}
