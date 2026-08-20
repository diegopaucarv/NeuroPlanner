/**
 * BaseEntityRepository
 *
 * Core CRUD class for the `entities` polymorphic table.
 * All domain repositories extend or compose this to ensure
 * consistent JSON serialization, timestamp management, and
 * transactional integrity.
 */

import { Kysely, Transaction } from "kysely";
import { DB } from "../schema";
import { UUID, Timestamp, EntityType } from "../../models/models";
import { validateEntityData } from "../schemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape stored in `entities.data` (JSON text) */
export type EntityData = Record<string, unknown>;

/** A row as it lives in the `entities` table */
export interface EntityRow {
  id: UUID;
  type: EntityType;
  created_at: Timestamp;
  updated_at: Timestamp;
  data: string; // JSON
}

/** Convenience: deserialized entity */
export interface DeserializedEntity {
  id: UUID;
  type: EntityType;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  data: EntityData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): Timestamp {
  return Date.now();
}

function serialize(data: EntityData): string {
  return JSON.stringify(data);
}

function deserialize(raw: string): EntityData {
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class BaseEntityRepository {
  constructor(
    protected readonly db: Kysely<DB> | Transaction<DB>,
  ) {}

  // -----------------------------------------------------------------------
  // Row → domain helpers
  // -----------------------------------------------------------------------

  protected rowToEntity(row: EntityRow): DeserializedEntity {
    return {
      id: row.id,
      type: row.type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Validate on read so corrupt rows fail fast instead of surfacing
      // later as confusing runtime errors.
      data: validateEntityData(row.id, row.type, deserialize(row.data)),
    };
  }

  protected rowsToEntities(rows: EntityRow[]): DeserializedEntity[] {
    return rows.map((r) => this.rowToEntity(r));
  }

  // -----------------------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------------------

  /**
   * Insert a new polymorphic entity.
   * Automatically sets `created_at` and `updated_at`.
   */
  async create(
    id: UUID,
    type: EntityType,
    data: EntityData,
  ): Promise<DeserializedEntity> {
    // Validate before persisting so bad data never reaches the DB.
    const validated = validateEntityData(id, type, data);
    const ts = now();
    const row: EntityRow = {
      id,
      type,
      created_at: ts,
      updated_at: ts,
      data: serialize(validated),
    };

    await this.db.insertInto("entities").values(row).execute();

    return this.rowToEntity(row);
  }

  // -----------------------------------------------------------------------
  // READ
  // -----------------------------------------------------------------------

  /** Find a single entity by id. Returns `undefined` when not found. */
  async findById(id: UUID): Promise<DeserializedEntity | undefined> {
    const row = await this.db
      .selectFrom("entities")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return row ? this.rowToEntity(row as EntityRow) : undefined;
  }

  /** List all entities of a given type. */
  async findByType(type: EntityType): Promise<DeserializedEntity[]> {
    const rows = await this.db
      .selectFrom("entities")
      .selectAll()
      .where("type", "=", type)
      .orderBy("created_at", "desc")
      .execute();

    return this.rowsToEntities(rows as EntityRow[]);
  }

  /** List all entities matching one of several types. */
  async findByTypes(types: EntityType[]): Promise<DeserializedEntity[]> {
    const rows = await this.db
      .selectFrom("entities")
      .selectAll()
      .where("type", "in", types)
      .orderBy("created_at", "desc")
      .execute();

    return this.rowsToEntities(rows as EntityRow[]);
  }

  /** List all entities, newest first. */
  async listAll(limit = 100, offset = 0): Promise<DeserializedEntity[]> {
    const rows = await this.db
      .selectFrom("entities")
      .selectAll()
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    return this.rowsToEntities(rows as EntityRow[]);
  }

  // -----------------------------------------------------------------------
  // UPDATE
  // -----------------------------------------------------------------------

  /**
   * Replace the entire `data` payload and bump `updated_at`.
   * Returns the updated entity or `undefined` if the row didn't exist.
   */
  async update(
    id: UUID,
    data: EntityData,
  ): Promise<DeserializedEntity | undefined> {
    const current = await this.findById(id);
    if (!current) return undefined;

    // Validate against the entity's actual type before persisting.
    const validated = validateEntityData(id, current.type, data);
    const ts = now();

    await this.db
      .updateTable("entities")
      .set({ data: serialize(validated), updated_at: ts })
      .where("id", "=", id)
      .execute();

    return { ...current, data: validated, updatedAt: ts };
  }

  /**
   * Merge partial data into the existing JSON payload.
   * Reads current row, deep-merges, then writes back.
   */
  async patch(
    id: UUID,
    partial: EntityData,
  ): Promise<DeserializedEntity | undefined> {
    const current = await this.findById(id);
    if (!current) return undefined;

    const merged: EntityData = { ...current.data, ...partial };
    // Validate the merged payload against the entity's actual type.
    const validated = validateEntityData(id, current.type, merged);
    const ts = now();

    await this.db
      .updateTable("entities")
      .set({ data: serialize(validated), updated_at: ts })
      .where("id", "=", id)
      .execute();

    return { ...current, data: validated, updatedAt: ts };
  }

  // -----------------------------------------------------------------------
  // DELETE
  // -----------------------------------------------------------------------

  async delete(id: UUID): Promise<boolean> {
    const result = await this.db
      .deleteFrom("entities")
      .where("id", "=", id)
      .executeTakeFirst();

    return result.numDeletedRows > 0n;
  }

  /** Delete all entities of the given type. */
  async deleteByType(type: EntityType): Promise<number> {
    const result = await this.db
      .deleteFrom("entities")
      .where("type", "=", type)
      .executeTakeFirst();

    return Number(result.numDeletedRows);
  }
}
