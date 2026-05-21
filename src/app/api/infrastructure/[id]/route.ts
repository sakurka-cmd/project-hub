import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, type, host, port, credentials, description } = body

    const existing = await db.infrastructureItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Infrastructure item not found' },
        { status: 404 }
      )
    }

    const item = await db.infrastructureItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
        ...(host !== undefined && { host: host?.trim() || null }),
        ...(port !== undefined && { port: port?.toString().trim() || null }),
        ...(credentials !== undefined && { credentials: credentials?.trim() || null }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating infrastructure item:', error)
    return NextResponse.json(
      { error: 'Failed to update infrastructure item' },
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

    const existing = await db.infrastructureItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Infrastructure item not found' },
        { status: 404 }
      )
    }

    await db.infrastructureItem.delete({ where: { id } })

    return NextResponse.json({ message: 'Infrastructure item deleted successfully' })
  } catch (error) {
    console.error('Error deleting infrastructure item:', error)
    return NextResponse.json(
      { error: 'Failed to delete infrastructure item' },
      { status: 500 }
    )
  }
}
