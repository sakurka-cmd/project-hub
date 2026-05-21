import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const artifact = await db.artifact.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    })

    if (!artifact) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(artifact)
  } catch (error) {
    console.error('Error fetching artifact:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artifact' },
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
    const { title, description, type, fileName, fileContent } = body

    const existing = await db.artifact.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      )
    }

    const artifact = await db.artifact.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(type !== undefined && { type }),
        ...(fileName !== undefined && { fileName }),
        ...(fileContent !== undefined && { fileContent }),
      },
    })

    return NextResponse.json(artifact)
  } catch (error) {
    console.error('Error updating artifact:', error)
    return NextResponse.json(
      { error: 'Failed to update artifact' },
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

    const existing = await db.artifact.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      )
    }

    await db.artifact.delete({ where: { id } })

    return NextResponse.json({ message: 'Artifact deleted successfully' })
  } catch (error) {
    console.error('Error deleting artifact:', error)
    return NextResponse.json(
      { error: 'Failed to delete artifact' },
      { status: 500 }
    )
  }
}
