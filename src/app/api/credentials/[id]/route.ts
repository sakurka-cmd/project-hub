import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { service, username, password, url, notes } = body

    const existing = await db.credential.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      )
    }

    const credential = await db.credential.update({
      where: { id },
      data: {
        ...(service !== undefined && { service: service.trim() }),
        ...(username !== undefined && { username: username.trim() }),
        ...(password !== undefined && { password }),
        ...(url !== undefined && { url: url?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    })

    return NextResponse.json(credential)
  } catch (error) {
    console.error('Error updating credential:', error)
    return NextResponse.json(
      { error: 'Failed to update credential' },
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

    const existing = await db.credential.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      )
    }

    await db.credential.delete({ where: { id } })

    return NextResponse.json({ message: 'Credential deleted successfully' })
  } catch (error) {
    console.error('Error deleting credential:', error)
    return NextResponse.json(
      { error: 'Failed to delete credential' },
      { status: 500 }
    )
  }
}
