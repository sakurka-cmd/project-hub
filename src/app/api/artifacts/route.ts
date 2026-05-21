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

    const artifacts = await db.artifact.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(artifacts)
  } catch (error) {
    console.error('Error fetching artifacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artifacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, type, projectId } = body

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Artifact title is required' },
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

    const artifact = await db.artifact.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        type: type || 'document',
        projectId,
      },
    })

    return NextResponse.json(artifact, { status: 201 })
  } catch (error) {
    console.error('Error creating artifact:', error)
    return NextResponse.json(
      { error: 'Failed to create artifact' },
      { status: 500 }
    )
  }
}
