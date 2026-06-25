/**
 * ObjectiveRepository
 *
 * The most complex repository.  When saving a Goal, Project, or Task it
 * must write the JSON payload to `entities` AND simultaneously write the
 * relational fields (progress, is_active, parent_id, due_date) to the
 * `objectives` table — all within a single transaction.
 */

import { Kysely, Transaction } from "kysely";
import { DB } from "../schema";
import { BaseEntityRepository, EntityData } from "./BaseEntityRepository";
import { UUID, Timestamp, EntityType } from "../../models/models";

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface ObjectiveRow {
  id: UUID;
  parent_id: UUID | null;
  progress: number; // 0..1
  is_active: number; // 0 | 1 (SQLite boolean)
  due_date: Timestamp | null;
}

export interface ObjectiveLinkRow {
  parent_id: UUID;
  child_id: UUID;
}

/** The domain type returned for callers */
export interface ObjectiveEntity {
  // From entities
  id: UUID;
  type: EntityType;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  data: EntityData;
  // From objectives
  parentId: UUID | null;
  progress: number;
  isActive: boolean;
  dueDate: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shape produced by the entities+objectives join query */
interface ObjectiveJoinRow {
  id: UUID;
  type: EntityType;
  created_at: Timestamp;
  updated_at: Timestamp;
  data: string; // JSON text
  parent_id: UUID | null;
  progress: number;
  is_active: number;
  due_date: Timestamp | null;
}

function rowToObjective(row: ObjectiveJoinRow): ObjectiveEntity {
  return {
    id: row.id,
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    data: JSON.parse(row.data) as EntityData,
    parentId: row.parent_id,
    progress: row.progress,
    isActive: row.is_active === 1,
    dueDate: row.due_date,
  };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ObjectiveRepository extends BaseEntityRepository {
  constructor(db: Kysely<DB> | Transaction<DB>) {
    super(db);
  }

  // =====================================================================
  // CREATE (transactional: entities + objectives)
  // =====================================================================

  /**
   * Create a Goal, Project, or Task.  Writes to both `entities` and
   * `objectives` atomically.
   */
  async createObjective(params: {
    id: UUID;
    type: "Goal" | "Project" | "Task";
    data: EntityData;
    parentId?: UUID;
    progress?: number;
    isActive?: boolean;
    dueDate?: Timestamp;
  }): Promise<ObjectiveEntity> {
    const ts = Date.now();
    const progress = params.progress ?? 0;
    const isActive = params.isActive ?? true;

    await this.db.transaction().execute(async (trx) => {
      // 1. Insert the polymorphic entity
      await trx
        .insertInto("entities")
        .values({
          id: params.id,
          type: params.type,
          created_at: ts,
          updated_at: ts,
          data: JSON.stringify(params.data),
        })
        .execute();

      // 2. Insert the objectives relational row
      await trx
        .insertInto("objectives")
        .values({
          id: params.id,
          parent_id: params.parentId ?? null,
          progress,
          is_active: isActive ? 1 : 0,
          due_date: params.dueDate ?? null,
        })
        .execute();

      // 3. If a parent is specified, also create an objective_link
      if (params.parentId) {
        await trx
          .insertInto("objective_links")
          .values({ parent_id: params.parentId, child_id: params.id })
          .onConflict((oc) => oc.doNothing())
          .execute();
      }
    });

    return this.findById(params.id) as Promise<ObjectiveEntity>;
  }

  // =====================================================================
  // READ
  // =====================================================================

  async findById(id: UUID): Promise<ObjectiveEntity | undefined> {
    const row = await this.db
      .selectFrom("entities")
      .innerJoin("objectives", "entities.id", "objectives.id")
      .select([
        "entities.id",
        "entities.type",
        "entities.created_at",
        "entities.updated_at",
        "entities.data",
        "objectives.parent_id",
        "objectives.progress",
        "objectives.is_active",
        "objectives.due_date",
      ])
      .where("entities.id", "=", id)
      .executeTakeFirst();

    if (!row) return undefined;

    return rowToObjective(row as ObjectiveJoinRow);
  }

  /** List all objectives of the given types (e.g. ['Goal','Project','Task']). */
  async findByTypes(types: EntityType[]): Promise<ObjectiveEntity[]> {
    const rows = await this.db
      .selectFrom("entities")
      .innerJoin("objectives", "entities.id", "objectives.id")
      .select([
        "entities.id",
        "entities.type",
        "entities.created_at",
        "entities.updated_at",
        "entities.data",
        "objectives.parent_id",
        "objectives.progress",
        "objectives.is_active",
        "objectives.due_date",
      ])
      .where("entities.type", "in", types)
      .orderBy("entities.created_at", "desc")
      .execute();

    return rows.map((r) => rowToObjective(r as ObjectiveJoinRow));
  }

  /** Get direct children of a parent objective. */
  async findByParent(parentId: UUID): Promise<ObjectiveEntity[]> {
    const links = await this.db
      .selectFrom("objective_links")
      .select("child_id")
      .where("parent_id", "=", parentId)
      .execute();

    if (links.length === 0) return [];

    const childIds = links.map((l) => l.child_id);

    const rows = await this.db
      .selectFrom("entities")
      .innerJoin("objectives", "entities.id", "objectives.id")
      .select([
        "entities.id",
        "entities.type",
        "entities.created_at",
        "entities.updated_at",
        "entities.data",
        "objectives.parent_id",
        "objectives.progress",
        "objectives.is_active",
        "objectives.due_date",
      ])
      .where("entities.id", "in", childIds)
      .execute();

    return rows.map((r) => rowToObjective(r as ObjectiveJoinRow));
  }

  /** Return the full hierarchy tree rooted at a given objective. */
  async getTree(rootId: UUID): Promise<ObjectiveEntity[]> {
    const result: ObjectiveEntity[] = [];
    const queue = [rootId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = await this.findByParent(current);
      result.push(...children);
      queue.push(...children.map((c) => c.id));
    }

    return result;
  }

  // =====================================================================
  // UPDATE
  // =====================================================================

  /** Update progress (0..1). */
  async setProgress(id: UUID, progress: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1, progress));
    await this.db
      .updateTable("objectives")
      .set({ progress: clamped })
      .where("id", "=", id)
      .execute();
  }

  /** Toggle is_active flag. */
  async setActive(id: UUID, active: boolean): Promise<void> {
    await this.db
      .updateTable("objectives")
      .set({ is_active: active ? 1 : 0 })
      .where("id", "=", id)
      .execute();
  }

  /** Change the parent of an objective, updating both objectives.parent_id and objective_links. */
  async reparent(id: UUID, newParentId: UUID | null): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      // Remove old link
      await trx
        .deleteFrom("objective_links")
        .where("child_id", "=", id)
        .execute();

      // Update the objectives row
      await trx
        .updateTable("objectives")
        .set({ parent_id: newParentId })
        .where("id", "=", id)
        .execute();

      // Insert new link if we have a new parent
      if (newParentId) {
        await trx
          .insertInto("objective_links")
          .values({ parent_id: newParentId, child_id: id })
          .onConflict((oc) => oc.doNothing())
          .execute();
      }
    });
  }

  /** Update the due_date field. */
  async setDueDate(id: UUID, dueDate: Timestamp | null): Promise<void> {
    await this.db
      .updateTable("objectives")
      .set({ due_date: dueDate })
      .where("id", "=", id)
      .execute();
  }

  /**
   * Update both the entities.data JSON and the objectives relational columns
   * in a single transaction.
   */
  async updateObjective(
    id: UUID,
    data: EntityData,
    objectiveFields?: {
      progress?: number;
      isActive?: boolean;
      parentId?: UUID | null;
      dueDate?: Timestamp | null;
    },
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      const ts = Date.now();

      // entities
      await trx
        .updateTable("entities")
        .set({ data: JSON.stringify(data), updated_at: ts })
        .where("id", "=", id)
        .execute();

      // objectives
      if (objectiveFields) {
        const set: Record<string, unknown> = {};
        if (objectiveFields.progress !== undefined)
          set.progress = Math.max(0, Math.min(1, objectiveFields.progress));
        if (objectiveFields.isActive !== undefined)
          set.is_active = objectiveFields.isActive ? 1 : 0;
        if (objectiveFields.parentId !== undefined)
          set.parent_id = objectiveFields.parentId;
        if (objectiveFields.dueDate !== undefined)
          set.due_date = objectiveFields.dueDate;

        if (Object.keys(set).length > 0) {
          await trx
            .updateTable("objectives")
            .set(set)
            .where("id", "=", id)
            .execute();
        }
      }
    });
  }

  // =====================================================================
  // LINKS (many-to-many between objectives)
  // =====================================================================

  /** Create an arbitrary link between two objectives. */
  async link(parentId: UUID, childId: UUID): Promise<void> {
    await this.db
      .insertInto("objective_links")
      .values({ parent_id: parentId, child_id: childId })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  /** Remove a link. */
  async unlink(parentId: UUID, childId: UUID): Promise<void> {
    await this.db
      .deleteFrom("objective_links")
      .where("parent_id", "=", parentId)
      .where("child_id", "=", childId)
      .execute();
  }

  // =====================================================================
  // DELETE (cascades to objectives + links via FK)
  // =====================================================================

  async delete(id: UUID): Promise<boolean> {
    const result = await this.db
      .deleteFrom("entities")
      .where("id", "=", id)
      .executeTakeFirst();
    return result.numDeletedRows > 0n;
  }
}
