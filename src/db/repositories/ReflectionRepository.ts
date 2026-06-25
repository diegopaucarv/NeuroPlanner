/**
 * ReflectionRepository
 *
 * Manages the `reflections` table (journals, conversations, crisis logs,
 * medication logs).  Each reflection stores its domain‑specific payload
 * in the `data` JSON column.
 */

import { Kysely, Transaction } from "kysely";
import { DB } from "../schema";
import { UUID, Timestamp } from "../../models/models";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReflectionType =
  | "journal"
  | "conversation"
  | "crisis"
  | "medication";

export interface ReflectionRow {
  id: UUID;
  user_id: UUID;
  type: ReflectionType;
  timestamp: Timestamp;
  data: string; // JSON
}

/** Deserialised reflection for consumers */
export interface Reflection {
  id: UUID;
  userId: UUID;
  type: ReflectionType;
  timestamp: Timestamp;
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ReflectionRepository {
  constructor(
    protected readonly db: Kysely<DB> | Transaction<DB>,
  ) {}

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  private rowToReflection(row: ReflectionRow): Reflection {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      timestamp: row.timestamp,
      data: JSON.parse(row.data),
    };
  }

  // -------------------------------------------------------------------
  // CREATE
  // -------------------------------------------------------------------

  async create(params: {
    id?: UUID;
    userId: UUID;
    type: ReflectionType;
    timestamp?: Timestamp;
    data: Record<string, unknown>;
  }): Promise<Reflection> {
    const id =
      params.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const row: ReflectionRow = {
      id,
      user_id: params.userId,
      type: params.type,
      timestamp: params.timestamp ?? Date.now(),
      data: JSON.stringify(params.data),
    };

    await this.db.insertInto("reflections").values(row).execute();
    return this.rowToReflection(row);
  }

  // -------------------------------------------------------------------
  // READ
  // -------------------------------------------------------------------

  async findById(id: UUID): Promise<Reflection | undefined> {
    const row = await this.db
      .selectFrom("reflections")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return row ? this.rowToReflection(row as ReflectionRow) : undefined;
  }

  /** List reflections for a user, newest first. */
  async findByUser(
    userId: UUID,
    type?: ReflectionType,
    limit = 50,
    offset = 0,
  ): Promise<Reflection[]> {
    let query = this.db
      .selectFrom("reflections")
      .selectAll()
      .where("user_id", "=", userId);

    if (type) {
      query = query.where("type", "=", type);
    }

    const rows = await query
      .orderBy("timestamp", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    return (rows as ReflectionRow[]).map((r) => this.rowToReflection(r));
  }

  /** Get reflections in a date range. */
  async findByDateRange(
    userId: UUID,
    from: Timestamp,
    to: Timestamp,
    type?: ReflectionType,
  ): Promise<Reflection[]> {
    let query = this.db
      .selectFrom("reflections")
      .selectAll()
      .where("user_id", "=", userId)
      .where("timestamp", ">=", from)
      .where("timestamp", "<=", to);

    if (type) {
      query = query.where("type", "=", type);
    }

    const rows = await query.orderBy("timestamp", "asc").execute();
    return (rows as ReflectionRow[]).map((r) => this.rowToReflection(r));
  }

  /** Find the most recent crisis log for escalation protocol review. */
  async getLatestCrisis(
    userId: UUID,
  ): Promise<Reflection | undefined> {
    const row = await this.db
      .selectFrom("reflections")
      .selectAll()
      .where("user_id", "=", userId)
      .where("type", "=", "crisis")
      .orderBy("timestamp", "desc")
      .limit(1)
      .executeTakeFirst();

    return row ? this.rowToReflection(row as ReflectionRow) : undefined;
  }

  // -------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------

  async update(
    id: UUID,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.db
      .updateTable("reflections")
      .set({ data: JSON.stringify(data) })
      .where("id", "=", id)
      .execute();
  }

  // -------------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------------

  async delete(id: UUID): Promise<void> {
    await this.db.deleteFrom("reflections").where("id", "=", id).execute();
  }
}
