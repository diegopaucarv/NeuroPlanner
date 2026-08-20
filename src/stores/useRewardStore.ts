/**
 * useRewardStore
 *
 * Holds the catalogue of rewards (premios) and their redemption state.
 * Backed by `RewardRepository`; keeps an in-memory copy of the rows so
 * the UI can render without re-querying on every render.
 */

import { create } from "zustand";
import { db } from "../db/db";
import { RewardRepository, RewardRow } from "../db/repositories";
import { UUID } from "../models/models";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RewardState {
  // ---- Data ----
  /** All rewards in the catalogue. */
  rewards: RewardRow[];

  /** Loading / error flags */
  loading: boolean;
  error: string | null;

  // ---- Actions ----

  /** Load all rewards from the DB. */
  loadAll: () => Promise<void>;

  /** Create a new reward. */
  create: (reward: Omit<RewardRow, "id" | "is_favorite"> & {
    id?: UUID;
    is_favorite?: number;
  }) => Promise<RewardRow>;

  /** Update an existing reward. */
  update: (id: UUID, updates: Partial<Omit<RewardRow, "id">>) => Promise<void>;

  /** Delete a reward. */
  remove: (id: UUID) => Promise<void>;

  /** Toggle a reward's favorite flag. */
  toggleFavorite: (id: UUID) => Promise<void>;

  /** Reset the store. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  rewards: [] as RewardRow[],
  loading: false,
  error: null as string | null,
};

export const useRewardStore = create<RewardState>((set) => {
  const repo = () => new RewardRepository(db);

  return {
    ...initialState,

    // ==================================================================
    // LOAD
    // ==================================================================

    async loadAll() {
      set({ loading: true, error: null });
      try {
        const rewards = await repo().listRewards();
        set({ rewards, loading: false });
      } catch (err) {
        set({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load rewards",
        });
      }
    },

    // ==================================================================
    // CREATE
    // ==================================================================

    async create(reward) {
      const row = await repo().createReward(reward);
      set((s) => ({ rewards: [...s.rewards, row] }));
      return row;
    },

    // ==================================================================
    // UPDATE
    // ==================================================================

    async update(id, updates) {
      await repo().updateReward(id, updates);
      set((s) => ({
        rewards: s.rewards.map((r) =>
          r.id === id ? { ...r, ...updates } : r,
        ),
      }));
    },

    // ==================================================================
    // DELETE
    // ==================================================================

    async remove(id) {
      await repo().deleteReward(id);
      set((s) => ({ rewards: s.rewards.filter((r) => r.id !== id) }));
    },

    // ==================================================================
    // TOGGLE FAVORITE
    // ==================================================================

    async toggleFavorite(id) {
      await repo().toggleFavorite(id);
      set((s) => ({
        rewards: s.rewards.map((r) =>
          r.id === id ? { ...r, is_favorite: r.is_favorite === 1 ? 0 : 1 } : r,
        ),
      }));
    },

    // ==================================================================
    // RESET
    // ==================================================================

    reset() {
      set(initialState);
    },
  };
});
