import { db } from '@/lib/db'
import { objectives, entities, user } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'
import type { and as AndType } from 'drizzle-orm'

// Get a test user or create one for demo purposes
async function getDemoUserId() {
  const testUser = await db.select().from(user).limit(1)
  if (testUser.length > 0) {
    return testUser[0].id
  }
  // Create a demo user if none exists
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
    const allObjectives = await db
      .select({
        id: entities.id,
        type: entities.type,
        progress: objectives.progress,
        isActive: objectives.isActive,
        parentId: objectives.parentId,
        dueDate: objectives.dueDate,
        createdAt: entities.createdAt,
        updatedAt: entities.updatedAt,
        data: entities.data,
      })
      .from(entities)
      .innerJoin(objectives, eq(entities.id, objectives.id))
      .where(eq(entities.userId, userId))

    const formatted = allObjectives.map(obj => ({
      id: obj.id,
      type: obj.type,
      title: typeof obj.data === 'object' ? (obj.data as any).title || '' : '',
      description: typeof obj.data === 'object' ? (obj.data as any).description : '',
      progress: obj.progress || 0,
      isActive: obj.isActive === 1,
      parentId: obj.parentId,
      dueDate: obj.dueDate,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    }))

    return new Response(JSON.stringify({ objectives: formatted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[v0] Objectives GET error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch objectives' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const POST = async (req: Request) => {
  try {
    const body = await req.json()
    const { title, type, description, progress = 0, isActive = true } = body

    if (!title || !type) {
      return new Response(JSON.stringify({ error: 'Title and type required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userId = await getDemoUserId()
    const id = crypto.randomUUID()
    const now = Date.now()

    // Insert into entities table
    await db.insert(entities).values({
      id,
      type,
      userId,
      createdAt: now,
      updatedAt: now,
      data: { title, description },
    })

    // Insert into objectives table
    await db.insert(objectives).values({
      id,
      parentId: null,
      progress: progress || 0,
      isActive: isActive ? 1 : 0,
      dueDate: null,
    })

    return new Response(
      JSON.stringify({
        objective: {
          id,
          type,
          title,
          description,
          progress: progress || 0,
          isActive,
          parentId: null,
          dueDate: null,
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
    console.error('[v0] Objectives POST error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create objective' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
