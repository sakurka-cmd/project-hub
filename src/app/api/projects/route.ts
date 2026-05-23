import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/options';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === 'admin';

  try {
    const projects = await db.project.findMany({
      where: isAdmin ? {} : { userId },
      include: { _count: { select: { nodes: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const projectsWithCount = projects.map((p) => ({
      ...p,
      nodeCount: p._count.nodes,
      _count: undefined,
    }));

    return NextResponse.json(projectsWithCount);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6366f1',
        userId: (session.user as any).id,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
