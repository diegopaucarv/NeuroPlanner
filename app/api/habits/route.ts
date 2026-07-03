import { db } from '@/lib/db'
import { entities, user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

// Get a test user or create one for demo purposes
async function getDemoUserId() {
  const testUser = await db.select().from(user).limit(1)
  if (testUser.length > 0) {
    return testUser[0].id
  }
  const demoUserId = crypto.randomUUID()
  await db.insert(user).values({
    id: demoUserId,
    email: 'demo@neuroplanner.local',
    name: 'Demo User',
    emailVerified: true,
  })
  return demoUserId
}

export const GET = async (req: Request) => {
  try {
    const userId = await getDemoUserId()
    const { and } = await import('drizzle-orm')
    const habitEntities = await db
      .select()
      .from(entities)
      .where(and(eq(entities.userId, userId), eq(entities.type, 'Habit')))

    const formatted = habitEntities.map(entity => ({
      id: entity.id,
      name: typeof entity.data === 'object' ? (entity.data as any).name || '' : '',
      description: typeof entity.data === 'object' ? (entity.data as any).description : '',
      frequency: typeof entity.data === 'object' ? (entity.data as any).frequency || 'daily' : 'daily',
      streak: typeof entity.data === 'object' ? (entity.data as any).streak || 0 : 0,
      isActive: true,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }))

    return new Response(JSON.stringify({ habits: formatted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[v0] Habits GET error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch habits' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const POST = async (req: Request) => {
  try {
    const body = await req.json()
    const { name, description = '', frequency = 'daily' } = body

    if (!name) {
      return new Response(JSON.stringify({ error: 'Name required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userId = await getDemoUserId()
    const id = crypto.randomUUID()
    const now = Date.now()

    await db.insert(entities).values({
      id,
      type: 'Habit',
      userId,
      createdAt: now,
      updatedAt: now,
      data: { name, description, frequency, streak: 0 },
    })

    return new Response(
      JSON.stringify({
        habit: {
          id,
          name,
          description,
          frequency,
          streak: 0,
          isActive: true,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[v0] Habits POST error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create habit' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
