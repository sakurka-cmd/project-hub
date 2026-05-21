import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // 1. All projects with task counts
    const projects = await db.project.findMany({
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const projectIds = projects.map((p) => p.id)

    // 2. All tasks — root tasks with 3 levels of children
    const tasks = await db.task.findMany({
      where: { parentId: null },
      include: {
        category: true,
        project: {
          select: { id: true, name: true, color: true },
        },
        parent: {
          select: { id: true, title: true, workItemType: true },
        },
        children: {
          orderBy: { order: 'asc' },
          include: {
            category: true,
            project: {
              select: { id: true, name: true, color: true },
            },
            parent: {
              select: { id: true, title: true, workItemType: true },
            },
            children: {
              orderBy: { order: 'asc' },
              include: {
                category: true,
                project: {
                  select: { id: true, name: true, color: true },
                },
                parent: {
                  select: { id: true, title: true, workItemType: true },
                },
                children: {
                  orderBy: { order: 'asc' },
                  include: {
                    category: true,
                    project: {
                      select: { id: true, name: true, color: true },
                    },
                    parent: {
                      select: { id: true, title: true, workItemType: true },
                    },
                    sprint: {
                      select: { id: true, name: true, status: true },
                    },
                  },
                },
              },
            },
          },
        },
        sprint: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
    })

    // 3. All sprints
    const sprints = await db.sprint.findMany({
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 4. All categories
    const categories = await db.taskCategory.findMany({
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // 5. All artifacts, credentials, infrastructure
    const artifacts = await db.artifact.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    const credentials = await db.credential.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    const infrastructure = await db.infrastructureItem.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    const projectsWithCount = projects.map((project) => ({
      ...project,
      taskCount: project._count.tasks,
      _count: undefined,
    }))

    return NextResponse.json({
      projects: projectsWithCount,
      tasks,
      sprints,
      categories,
      artifacts,
      credentials,
      infrastructure,
    })
  } catch (error) {
    console.error('Error fetching all data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}
