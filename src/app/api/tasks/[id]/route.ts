import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const task = await db.task.findUnique({
      where: { id },
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
        },
        sprint: {
          select: { id: true, name: true, status: true },
        },
      },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      categoryId,
      dueDate,
    } = body

    const existing = await db.task.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const task = await db.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(workItemType !== undefined && { workItemType }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(sprintId !== undefined && { sprintId: sprintId || null }),
        ...(order !== undefined && { order }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
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

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.task.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    await db.task.delete({ where: { id } })

    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
