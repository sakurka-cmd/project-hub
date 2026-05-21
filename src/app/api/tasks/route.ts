import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const parentId = searchParams.get('parentId')
    const sprintId = searchParams.get('sprintId')
    const workItemType = searchParams.get('workItemType')

    const where: Record<string, unknown> = {}

    if (projectId) where.projectId = projectId
    if (status) where.status = status
    if (categoryId) where.categoryId = categoryId
    if (parentId !== null) where.parentId = parentId || null
    if (sprintId) where.sprintId = sprintId
    if (workItemType) where.workItemType = workItemType

    const tasks = await db.task.findMany({
      where,
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
            children: {
              orderBy: { order: 'asc' },
              include: {
                children: {
                  orderBy: { order: 'asc' },
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

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      status,
      priority,
      workItemType,
      parentId,
      sprintId,
      order,
      projectId,
      categoryId,
      dueDate,
    } = body

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      )
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (categoryId) {
      const category = await db.taskCategory.findUnique({ where: { id: categoryId } })
      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        )
      }
    }

    if (parentId) {
      const parent = await db.task.findUnique({ where: { id: parentId } })
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent task not found' },
          { status: 404 }
        )
      }
    }

    if (sprintId) {
      const sprint = await db.sprint.findUnique({ where: { id: sprintId } })
      if (!sprint) {
        return NextResponse.json(
          { error: 'Sprint not found' },
          { status: 404 }
        )
      }
    }

    const task = await db.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: status || 'todo',
        priority: priority || 'medium',
        workItemType: workItemType || 'task',
        parentId: parentId || null,
        sprintId: sprintId || null,
        order: order ?? 0,
        projectId,
        categoryId: categoryId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        category: true,
        parent: {
          select: { id: true, title: true, workItemType: true },
        },
        sprint: {
          select: { id: true, name: true, status: true },
        },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
