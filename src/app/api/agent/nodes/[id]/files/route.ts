import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { authorizeAgent, agentUnauthorized } from '@/lib/agent';
import { db } from '@/lib/db';

// Максимальный размер файла: 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
}

// POST /api/agent/nodes/[id]/files — прикрепить файл к узлу (multipart, поле file)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAgent(request))) return agentUnauthorized();

  const { id } = await params;

  try {
    const node = await db.node.findUnique({ where: { id } });
    if (!node) {
      return NextResponse.json({ error: 'Узел не найден' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Файл не передан (поле file)' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Размер файла превышает лимит (${Math.round(MAX_FILE_SIZE / 1024 / 1024)} МБ)` },
        { status: 400 },
      );
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
        nodeId: id,
        fileName: diskFileName,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      },
    });

    return NextResponse.json(
      {
        id: attachment.id,
        nodeId: attachment.nodeId,
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        url: `/api/agent/files/${attachment.id}`,
        createdAt: attachment.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Agent file upload error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 });
  }
}
