import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const projects = await db.project.findMany({
      include: { _count: { select: { nodes: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    // Get all root nodes with up to 5 levels of nesting
    const rootNodes = await db.node.findMany({
      where: { parentId: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            children: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
              include: {
                children: {
                  orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                  include: {
                    children: {
                      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Parse JSON fields
    function parseFields(node: any): any {
      let fields = {};
      try {
        fields = typeof node.fields === 'string' ? JSON.parse(node.fields) : (node.fields || {});
      } catch {
        fields = {};
      }
      const result = {
        ...node,
        fields,
        children: node.children ? node.children.map(parseFields) : undefined,
      };
      delete result._count;
      return result;
    }

    const projectsWithCount = projects.map((p) => ({
      ...p,
      nodeCount: p._count.nodes,
      _count: undefined,
    }));

    return NextResponse.json({
      projects: projectsWithCount,
      nodes: rootNodes.map(parseFields),
    });
  } catch (error) {
    console.error('Error fetching all data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
