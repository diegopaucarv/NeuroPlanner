import { db } from '@/lib/db'
import { objectives, entities } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const PUT = async (
  req: Request,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params
    const body = await req.json()
    const { progress, isActive, parentId, dueDate, title, description } = body

    const now = new Date()

    // Update entities table if title/description changed
    if (title !== undefined || description !== undefined) {
      const existing = await db
        .select({ data: entities.data })
        .from(entities)
        .where(eq(entities.id, id))
        .limit(1)

      const currentData = typeof existing[0]?.data === 'object' ? existing[0].data : {}

      await db
        .update(entities)
        .set({
          data: {
            ...currentData,
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
          },
          updatedAt: now,
        })
        .where(eq(entities.id, id))
    }

    // Update objectives table
    const updateData: any = { updatedAt: now }
    if (progress !== undefined) updateData.progress = progress
    if (isActive !== undefined) updateData.isActive = isActive ? 1 : 0
    if (parentId !== undefined) updateData.parentId = parentId
    if (dueDate !== undefined) updateData.dueDate = dueDate

    await db.update(objectives).set(updateData).where(eq(objectives.id, id))

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[v0] Objective PUT error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to update objective' }),
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

    await db.delete(objectives).where(eq(objectives.id, id))
    await db.delete(entities).where(eq(entities.id, id))

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[v0] Objective DELETE error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to delete objective' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
