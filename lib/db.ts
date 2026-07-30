import { sql } from '@vercel/postgres'
import { TEAM_MEMBERS, type TeamMember } from './teamMembers'

export async function getMembers(): Promise<TeamMember[]> {
  try {
    if (!process.env.POSTGRES_URLPWD) {
      // Development fallback: return mock data
      return TEAM_MEMBERS.map((name, idx) => ({
        id: `member-${idx}`,
        name,
        status: 'belum_mulai' as const,
        task: '',
        updatedAt: Date.now(),
      }))
    }

    const result = await sql`
      SELECT id, name, status, task, updated_at as "updatedAt"
      FROM team_members
      ORDER BY id
    `

    return result.rows as TeamMember[]
  } catch (error) {
    console.error('Failed to fetch members:', error)
    return TEAM_MEMBERS.map((name, idx) => ({
      id: `member-${idx}`,
      name,
      status: 'belum_mulai' as const,
      task: '',
      updatedAt: Date.now(),
    }))
  }
}

export async function updateMember(
  id: string,
  status: 'belum_mulai' | 'dikerjakan' | 'selesai',
  task: string
): Promise<TeamMember | null> {
  try {
    if (!process.env.POSTGRES_URLPWD) {
      // Development fallback
      return { id, name: '', status, task, updatedAt: Date.now() }
    }

    const result = await sql`
      UPDATE team_members
      SET status = ${status}, task = ${task}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, status, task, updated_at as "updatedAt"
    `

    return result.rows[0] as TeamMember
  } catch (error) {
    console.error('Failed to update member:', error)
    return null
  }
}

export async function initializeDatabase() {
  try {
    if (!process.env.POSTGRES_URLPWD) return

    // Create table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'belum_mulai',
        task TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Seed data if empty
    const count = await sql`SELECT COUNT(*) as count FROM team_members`
    if ((count.rows[0] as any).count === 0) {
      for (let i = 0; i < TEAM_MEMBERS.length; i++) {
        await sql`
          INSERT INTO team_members (id, name)
          VALUES (${`member-${i}`}, ${TEAM_MEMBERS[i]})
        `
      }
    }
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }
}
