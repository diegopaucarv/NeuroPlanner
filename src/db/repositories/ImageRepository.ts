/**
 * ImageRepository
 *
 * Manages the `images` table.  Images are keyed by `entity_id` (a UUID)
 * so that any domain entity (task, reward, block, ...) can have at most
 * one associated image.
 */

import { Kysely, Transaction } from "kysely";
import { DB } from "../schema";
import { UUID, Timestamp } from "../../models/models";

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface ImageRow {
  id: UUID;
  entity_id: UUID;
  image_url: string;
  created_at: Timestamp;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ImageRepository {
  constructor(
    protected readonly db: Kysely<DB> | Transaction<DB>,
  ) {}

  /** Insert a new image for an entity. */
  async createImage(
    entityId: UUID,
    imageUrl: string,
  ): Promise<ImageRow> {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const row: ImageRow = {
      id,
      entity_id: entityId,
      image_url: imageUrl,
      created_at: Date.now(),
    };

    await this.db.insertInto("images").values(row).execute();
    return row;
  }

  /** Get the image associated with an entity, if any. */
  async getImageByEntity(entityId: UUID): Promise<ImageRow | undefined> {
    return this.db
      .selectFrom("images")
      .selectAll()
      .where("entity_id", "=", entityId)
      .executeTakeFirst() as Promise<ImageRow | undefined>;
  }

  /** List all images. */
  async listImages(): Promise<ImageRow[]> {
    return this.db
      .selectFrom("images")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute() as Promise<ImageRow[]>;
  }

  /** Update the image URL for an entity. */
  async updateImage(entityId: UUID, imageUrl: string): Promise<void> {
    await this.db
      .updateTable("images")
      .set({ image_url: imageUrl })
      .where("entity_id", "=", entityId)
      .execute();
  }

  /** Delete the image associated with an entity. */
  async deleteImage(entityId: UUID): Promise<void> {
    await this.db
      .deleteFrom("images")
      .where("entity_id", "=", entityId)
      .execute();
  }
}
