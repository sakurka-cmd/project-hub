import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    const items = await db.infrastructureItem.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching infrastructure items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch infrastructure items' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, host, port, credentials, description, projectId } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Infrastructure item name is required' },
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

    const item = await db.infrastructureItem.create({
      data: {
        name: name.trim(),
        type: type || 'server',
        host: host?.trim() || null,
        port: port?.toString().trim() || null,
        credentials: credentials?.trim() || null,
        description: description?.trim() || null,
        projectId,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error creating infrastructure item:', error)
    return NextResponse.json(
      { error: 'Failed to create infrastructure item' },
      { status: 500 }
    )
  }
}
