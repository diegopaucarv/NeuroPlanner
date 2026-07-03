import { db } from './index'
import { user, account, objectives, timeSeries, entities } from './schema'
import { eq, and, desc } from 'drizzle-orm'
import crypto from 'crypto'

// Types for repositories
export interface ObjectiveEntity {
  id: string
  userId: string
  type: 'Goal' | 'Project' | 'Task'
  title: string
  description?: string
  progress: number
  isActive: boolean
  parentId?: string
  dueDate?: number
  createdAt: Date
  updatedAt: Date
}

export interface HabitTemplate {
  id: string
  userId: string
  name: string
  description?: string
  frequency: string
  createdAt: Date
  updatedAt: Date
}

export interface HabitInstance {
  id: string
  templateId: string
  date: number
  completed: boolean
  createdAt: Date
  updatedAt: Date
}

// Objective Repository
export class ObjectiveRepository {
  async getAll(userId: string): Promise<ObjectiveEntity[]> {
    const objectiveRows = await db
      .select({
        id: objectives.id,
        userId: entities.id,
        type: entities.type,
        title: entities.data,
        progress: objectives.progress,
        isActive: objectives.isActive,
        parentId: objectives.parentId,
        dueDate: objectives.dueDate,
        createdAt: entities.createdAt,
        updatedAt: entities.updatedAt,
      })
      .from(entities)
      .innerJoin(objectives, eq(entities.id, objectives.id))
      .where(eq(entities.id, userId))

    return objectiveRows.map(row => ({
      id: row.id,
      userId: row.userId,
      type: row.type as 'Goal' | 'Project' | 'Task',
      title: typeof row.title === 'object' ? (row.title as any).title || '' : '',
      description: typeof row.title === 'object' ? (row.title as any).description : '',
      progress: row.progress || 0,
      isActive: row.isActive === 1,
      parentId: row.parentId || undefined,
      dueDate: row.dueDate || undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }))
  }

  async create(data: Omit<ObjectiveEntity, 'createdAt' | 'updatedAt'>): Promise<ObjectiveEntity> {
    const now = new Date()
    const entityData = {
      title: data.title,
      description: data.description,
    }

    // Insert into entities table
    await db.insert(entities).values({
      id: data.id,
      type: data.type,
      createdAt: now,
      updatedAt: now,
      data: entityData,
    })

    // Insert into objectives table
    await db.insert(objectives).values({
      id: data.id,
      parentId: data.parentId,
      progress: data.progress || 0,
      isActive: data.isActive ? 1 : 0,
      dueDate: data.dueDate,
    })

    return {
      ...data,
      createdAt: now,
      updatedAt: now,
    }
  }

  async update(
    id: string,
    data: Partial<Omit<ObjectiveEntity, 'id' | 'userId' | 'type' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    const now = new Date()

    // Update objectives table
    await db
      .update(objectives)
      .set({
        progress: data.progress,
        isActive: data.isActive ? 1 : 0,
        parentId: data.parentId,
        dueDate: data.dueDate,
      })
      .where(eq(objectives.id, id))

    // Update entities table
    await db
      .update(entities)
      .set({
        updatedAt: now,
        data: data.title ? { title: data.title, description: data.description } : undefined,
      })
      .where(eq(entities.id, id))
  }

  async delete(id: string): Promise<void> {
    await db.delete(objectives).where(eq(objectives.id, id))
    await db.delete(entities).where(eq(entities.id, id))
  }
}

// Habit Repository
export class HabitRepository {
  async getTemplates(userId: string): Promise<HabitTemplate[]> {
    // For now, return empty array - would need habit tables in schema
    return []
  }

  async createTemplate(data: Omit<HabitTemplate, 'createdAt' | 'updatedAt'>): Promise<HabitTemplate> {
    const now = new Date()
    return {
      ...data,
      createdAt: now,
      updatedAt: now,
    }
  }
}

// User Repository
export class UserRepository {
  async getById(id: string) {
    return await db.select().from(user).where(eq(user.id, id)).limit(1)
  }

  async getByEmail(email: string) {
    return await db.select().from(user).where(eq(user.email, email)).limit(1)
  }

  async create(data: { id: string; email: string; name?: string }) {
    return await db.insert(user).values(data)
  }
}
