import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      totalProjects,
      activeProjectsCount,
      tasksByStatus,
      recentTasks,
      criticalTasks,
    ] = await Promise.all([
      // Total projects
      db.project.count(),

      // Active projects count
      db.project.count({ where: { status: 'active' } }),

      // Tasks grouped by status
      db.task.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // 10 most recent tasks
      db.task.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: {
          category: true,
          project: {
            select: { id: true, name: true, color: true },
          },
        },
      }),

      // Critical tasks (high priority, not done/cancelled)
      db.task.findMany({
        where: {
          priority: 'critical',
          status: { notIn: ['done', 'cancelled'] },
        },
        include: {
          category: true,
          project: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    // Format tasksByStatus into a clean object
    const tasksByStatusMap: Record<string, number> = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
      cancelled: 0,
    }

    for (const group of tasksByStatus) {
      tasksByStatusMap[group.status] = group._count.id
    }

    // Compute total tasks
    const totalTasks = Object.values(tasksByStatusMap).reduce((sum, count) => sum + count, 0)

    return NextResponse.json({
      totalProjects,
      activeProjectsCount,
      totalTasks,
      tasksByStatus: tasksByStatusMap,
      recentTasks,
      criticalTasks: criticalTasks.length,
      criticalTasksList: criticalTasks,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
