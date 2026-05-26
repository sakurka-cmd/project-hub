import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

// Максимальный размер файла: 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const nodeId = formData.get('nodeId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
    }
    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId не передан' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Размер файла превышает лимит (${Math.round(MAX_FILE_SIZE / 1024 / 1024)} МБ)` },
        { status: 400 }
      );
    }

    const node = await db.node.findUnique({ where: { id: nodeId } });
    if (!node) {
      return NextResponse.json({ error: 'Узел не найден' }, { status: 404 });
    }

    const project = await db.project.findUnique({ where: { id: node.projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }
    if (user.role !== 'admin' && project.userId !== user.id) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
    const diskFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;

    const uploadDir = getUploadDir();
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, diskFileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const attachment = await db.fileAttachment.create({
      data: {
        nodeId,
        fileName: diskFileName,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      },
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 });
  }
}
