import { NextRequest, NextResponse } from 'next/server';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
}

// GET /api/files/[id] — скачать файл
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Ошибка получения файла' }, { status: 500 });
  }
}

// DELETE /api/files/[id] — удалить файл
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const attachment = await db.fileAttachment.findUnique({ where: { id } });
    if (!attachment) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    const node = await db.node.findUnique({ where: { id: attachment.nodeId } });
    if (node) {
      const project = await db.project.findUnique({ where: { id: node.projectId } });
      if (project && user.role !== 'admin' && project.userId !== user.id) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
    }

    const filePath = join(getUploadDir(), attachment.fileName);
    if (existsSync(filePath)) {
      await unlink(filePath).catch(() => {});
    }

    await db.fileAttachment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Ошибка удаления файла' }, { status: 500 });
  }
}
