import { updateMember } from '@/lib/db'

type Params = Promise<{ id: string }>

export async function PUT(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, task } = body

    if (!status || !['belum_mulai', 'dikerjakan', 'selesai'].includes(status)) {
      return Response.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    if (!task || task.length > 60) {
      return Response.json(
        { error: 'Task must be 1-60 characters' },
        { status: 400 }
      )
    }

    const updated = await updateMember(id, status, task)
    if (!updated) {
      return Response.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    return Response.json(updated)
  } catch (error) {
    console.error('API error:', error)
    return Response.json(
      { error: 'Failed to update member' },
      { status: 500 }
    )
  }
}
