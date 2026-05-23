import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import { db } from '@/lib/db';
import { readFile, unlink } from 'fs/promises';
import path from 'path';

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
}

// GET — download file
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const attachment = await db.fileAttachment.findUnique({ where: { id } });
    if (!attachment) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    const filePath = path.join(getUploadDir(), attachment.nodeId, attachment.fileName);
    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Файл не найден на диске' }, { status: 404 });
    }
    console.error('File download error:', error);
    return NextResponse.json({ error: 'Ошибка скачивания' }, { status: 500 });
  }
}

// DELETE — delete file
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const attachment = await db.fileAttachment.findUnique({ where: { id } });
    if (!attachment) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    // Delete from disk
    try {
      const filePath = path.join(getUploadDir(), attachment.nodeId, attachment.fileName);
      await unlink(filePath);
    } catch {
      // File might already be deleted from disk
    }

    // Delete from DB
    await db.fileAttachment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json({ error: 'Ошибка удаления файла' }, { status: 500 });
  }
}
