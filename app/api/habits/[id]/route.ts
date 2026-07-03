import { db } from '@/lib/db'
import { entities } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const PUT = async (
  req: Request,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params
    const body = await req.json()
    const { name, description, frequency, streak } = body

    const now = new Date()

    // Get current data
    const existing = await db
      .select({ data: entities.data })
      .from(entities)
      .where(eq(entities.id, id))
      .limit(1)

    const currentData = typeof existing[0]?.data === 'object' ? existing[0].data : {}

    // Update entities table
    await db
      .update(entities)
      .set({
        data: {
          ...currentData,
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(frequency !== undefined && { frequency }),
          ...(streak !== undefined && { streak }),
        },
        updatedAt: now,
      })
      .where(eq(entities.id, id))

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[v0] Habit PUT error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to update habit' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const DELETE = async (
  req: Request,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params

    await db.delete(entities).where(eq(entities.id, id))

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[v0] Habit DELETE error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to delete habit' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
