/**
 * RewardRepository
 *
 * Manages `rewards` and `reward_redemptions`.
 * Rewards are the catalogue of available reinforcers; redemptions track
 * when a user claims a reward.
 */

import { Kysely, Transaction } from "kysely";
import { DB } from "../schema";
import { UUID, Timestamp } from "../../models/models";

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface RewardRow {
  id: UUID;
  name: string;
  description: string | null;
  url: string | null;
  is_favorite: number; // 0 | 1
  effort_required: number | null;
  tags: string | null; // JSON array
  color: string | null;
  image_id: UUID | null;
}

export interface RewardRedemptionRow {
  id: UUID;
  user_id: UUID;
  reward_id: UUID;
  redeemed_at: Timestamp;
  points_spent: number | null;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class RewardRepository {
  constructor(
    protected readonly db: Kysely<DB> | Transaction<DB>,
  ) {}

  // =====================================================================
  // Rewards catalogue
  // =====================================================================

  async createReward(
    reward: Omit<RewardRow, "id" | "is_favorite"> & {
      id?: UUID;
      is_favorite?: number;
    },
  ): Promise<RewardRow> {
    const id =
      reward.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const row: RewardRow = {
      id,
      name: reward.name,
      description: reward.description ?? null,
      url: reward.url ?? null,
      is_favorite: reward.is_favorite ?? 0,
      effort_required: reward.effort_required ?? null,
      tags: reward.tags ?? null,
      color: reward.color ?? null,
      image_id: reward.image_id ?? null,
    };

    await this.db.insertInto("rewards").values(row).execute();
    return row;
  }

  async getReward(id: UUID): Promise<RewardRow | undefined> {
    return this.db
      .selectFrom("rewards")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst() as Promise<RewardRow | undefined>;
  }

  async listRewards(includeFavoritesOnly = false): Promise<RewardRow[]> {
    let query = this.db
      .selectFrom("rewards")
      .selectAll()
      .orderBy("name", "asc");

    if (includeFavoritesOnly) {
      query = query.where("is_favorite", "=", 1);
    }

    return query.execute() as Promise<RewardRow[]>;
  }

  async updateReward(
    rewardId: UUID,
    updates: Partial<Omit<RewardRow, "id">>,
  ): Promise<void> {
    await this.db
      .updateTable("rewards")
      .set(updates)
      .where("id", "=", rewardId)
      .execute();
  }

  async toggleFavorite(rewardId: UUID): Promise<void> {
    const reward = await this.getReward(rewardId);
    if (!reward) return;

    await this.db
      .updateTable("rewards")
      .set({ is_favorite: reward.is_favorite === 1 ? 0 : 1 })
      .where("id", "=", rewardId)
      .execute();
  }

  async deleteReward(rewardId: UUID): Promise<void> {
    await this.db.deleteFrom("rewards").where("id", "=", rewardId).execute();
  }

  // =====================================================================
  // Redemptions
  // =====================================================================

  /**
   * Record a reward redemption.  Typically called after a user spends
   * points or completes an effort threshold.
   */
  async redeem(params: {
    userId: UUID;
    rewardId: UUID;
    pointsSpent?: number;
  }): Promise<RewardRedemptionRow> {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const row: RewardRedemptionRow = {
      id,
      user_id: params.userId,
      reward_id: params.rewardId,
      redeemed_at: Date.now(),
      points_spent: params.pointsSpent ?? null,
    };

    await this.db.insertInto("reward_redemptions").values(row).execute();
    return row;
  }

  /** Get the redemption history for a user, newest first. */
  async getRedemptions(
    userId: UUID,
    limit = 50,
  ): Promise<RewardRedemptionRow[]> {
    return this.db
      .selectFrom("reward_redemptions")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("redeemed_at", "desc")
      .limit(limit)
      .execute() as Promise<RewardRedemptionRow[]>;
  }

  /** Get redemptions for a specific reward. */
  async getRedemptionsForReward(
    rewardId: UUID,
  ): Promise<RewardRedemptionRow[]> {
    return this.db
      .selectFrom("reward_redemptions")
      .selectAll()
      .where("reward_id", "=", rewardId)
      .orderBy("redeemed_at", "desc")
      .execute() as Promise<RewardRedemptionRow[]>;
  }

  /** Total points a user has spent. */
  async totalPointsSpent(userId: UUID): Promise<number> {
    const row = await this.db
      .selectFrom("reward_redemptions")
      .select((eb) => eb.fn.sum("points_spent").as("total"))
      .where("user_id", "=", userId)
      .executeTakeFirst();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (row as any)?.total ?? 0;
  }
}
