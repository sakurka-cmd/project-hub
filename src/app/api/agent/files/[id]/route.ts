import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { authorizeAgent, agentUnauthorized } from '@/lib/agent';
import { db } from '@/lib/db';

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
}

// GET /api/agent/files/[id] — скачать вложение (для агентов, Bearer-токен)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAgent(request))) return agentUnauthorized();

  const { id } = await params;

  try {
    const attachment = await db.fileAttachment.findUnique({ where: { id } });
    if (!attachment) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    const filePath = join(getUploadDir(), attachment.fileName);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Файл на диске не найден' }, { status: 404 });
    }

    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
        'Content-Length': String(attachment.size),
      },
    });
  } catch (error) {
    console.error('Agent file get error:', error);
    return NextResponse.json({ error: 'Ошибка получения файла' }, { status: 500 });
  }
}
