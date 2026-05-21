import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      totalProjects,
      activeProjectsCount,
      tasksByStatus,
      tasksByType,
      recentTasks,
      criticalTasks,
      activeSprints,
      recentSprints,
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

      // Tasks grouped by work item type
      db.task.groupBy({
        by: ['workItemType'],
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

      // Active sprints count
      db.sprint.count({ where: { status: 'active' } }),

      // 5 most recent sprints
      db.sprint.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { tasks: true } },
        },
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

    // Format tasksByType
    const tasksByTypeMap: Record<string, number> = {
      epic: 0,
      feature: 0,
      userStory: 0,
      bug: 0,
      task: 0,
    }

    for (const group of tasksByType) {
      tasksByTypeMap[group.workItemType] = group._count.id
    }

    // Compute total tasks
    const totalTasks = Object.values(tasksByStatusMap).reduce((sum, count) => sum + count, 0)

    return NextResponse.json({
      totalProjects,
      activeProjectsCount,
      totalTasks,
      tasksByStatus: tasksByStatusMap,
      tasksByType: tasksByTypeMap,
      recentTasks,
      criticalTasks: criticalTasks.length,
      criticalTasksList: criticalTasks,
      activeSprints,
      recentSprints,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
