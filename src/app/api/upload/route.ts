import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/options';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const nodeId = formData.get('nodeId') as string | null;

    if (!file || !nodeId) {
      return NextResponse.json({ error: 'Файл и nodeId обязательны' }, { status: 400 });
    }

    // Check node exists
    const node = await db.node.findUnique({ where: { id: nodeId } });
    if (!node) {
      return NextResponse.json({ error: 'Узел не найден' }, { status: 404 });
    }

    // Check file size limit
    const maxSizeSetting = await db.systemSetting.findUnique({ where: { key: 'max_file_size_mb' } });
    const maxMB = maxSizeSetting ? parseInt(maxSizeSetting.value) : 10;
    const maxBytes = maxMB * 1024 * 1024;

    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `Файл превышает лимит ${maxMB} МБ` },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = path.extname(file.name) || '';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    // Save to disk
    const uploadDir = path.join(getUploadDir(), nodeId);
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    // Create DB record
    const attachment = await db.fileAttachment.create({
      data: {
        nodeId,
        fileName: uniqueName,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 });
  }
}
