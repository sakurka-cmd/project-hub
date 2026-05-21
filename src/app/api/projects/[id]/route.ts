import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: { category: true },
          orderBy: { updatedAt: 'desc' },
        },
        categories: { orderBy: { createdAt: 'asc' } },
        artifacts: { orderBy: { updatedAt: 'desc' } },
        credentials: { orderBy: { updatedAt: 'desc' } },
        infrastructure: { orderBy: { updatedAt: 'desc' } },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
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
    const { name, description, status, color } = body

    const existing = await db.project.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const project = await db.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(color !== undefined && { color }),
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
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

    const existing = await db.project.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    await db.project.delete({ where: { id } })

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
