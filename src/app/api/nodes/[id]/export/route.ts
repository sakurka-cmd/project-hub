import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/nodes/[id]/export — export branch subtree as table data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Get the branch node
    const branch = await db.node.findUnique({ where: { id } });
    if (!branch) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Recursively collect all descendant items
    async function collectItems(parentId: string): Promise<any[]> {
      const children = await db.node.findMany({
        where: { parentId },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });

      const items: any[] = [];
      for (const child of children) {
        if (child.nodeType === 'item') {
          let fields = {};
          try {
            fields = typeof child.fields === 'string' ? JSON.parse(child.fields) : (child.fields || {});
          } catch {
            fields = {};
          }
          items.push({ name: child.name, ...fields });
        }
        // Recurse into branches
        if (child.nodeType === 'branch') {
          const subItems = await collectItems(child.id);
          items.push(...subItems);
        }
      }
      return items;
    }

    const rows = await collectItems(id);

    // Collect all unique column keys (excluding 'name' which we always show)
    const columnSet = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (key !== 'name') columnSet.add(key);
      }
    }
    const columns = ['name', ...Array.from(columnSet)];

    return NextResponse.json({
      branchName: branch.name,
      columns,
      rows,
    });
  } catch (error) {
    console.error('Error exporting branch:', error);
    return NextResponse.json({ error: 'Failed to export branch' }, { status: 500 });
  }
}
