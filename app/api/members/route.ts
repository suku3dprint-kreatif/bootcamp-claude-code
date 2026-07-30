import { getMembers, initializeDatabase } from '@/lib/db'

export async function GET() {
  try {
    await initializeDatabase()
    const members = await getMembers()
    return Response.json(members)
  } catch (error) {
    console.error('API error:', error)
    return Response.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
