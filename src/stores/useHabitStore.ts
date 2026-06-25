/**
 * useHabitStore
 *
 * Manages the daily active habit_instances and streaks.
 * Maintains a local cache of templates and today's instances so the UI
 * can render checkboxes / progress immediately while syncing to SQLite.
 */

import { create } from "zustand";
import { db } from "../db/db";
import { HabitRepository, HabitTemplateRow, HabitWithInstance } from "../db/repositories";
import { UUID } from "../models/models";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HabitState {
  // ---- Data ----
  /** All habit templates (the catalogue). */
  templates: HabitTemplateRow[];

  /** Today's active instances (template + instance joined). */
  dailyInstances: HabitWithInstance[];

  /** Streak counter per template id. */
  streaks: Record<UUID, number>;

  /** Loading / error */
  loading: boolean;
  error: string | null;

  // ---- Actions ----

  /** Load all templates from the DB. */
  loadTemplates: () => Promise<void>;

  /** Load today's instances (or for a specific date). */
  loadDailyInstances: (date?: number) => Promise<void>;

  /** Create a new habit template. */
  createTemplate: (template: Omit<HabitTemplateRow, "id"> & { id?: UUID }) => Promise<HabitTemplateRow>;

  /** Update an existing template. */
  updateTemplate: (id: UUID, updates: Partial<Omit<HabitTemplateRow, "id">>) => Promise<void>;

  /** Delete a template and its instances. */
  deleteTemplate: (id: UUID) => Promise<void>;

  /** Ensure an instance exists for today, then mark it complete. */
  completeHabit: (templateId: UUID) => Promise<void>;

  /** Un-mark a habit instance. */
  uncompleteHabit: (instanceId: UUID) => Promise<void>;

  /** Toggle completion: complete if incomplete, uncomplete if complete. */
  toggleHabit: (templateId: UUID) => Promise<void>;

  /** Refresh streak values for all templates. */
  refreshStreaks: () => Promise<void>;

  /** Reset the store. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Start of today in ms (local). */
function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  templates: [] as HabitTemplateRow[],
  dailyInstances: [] as HabitWithInstance[],
  streaks: {} as Record<UUID, number>,
  loading: false,
  error: null as string | null,
};

export const useHabitStore = create<HabitState>((set, get) => {
  const repo = () => new HabitRepository(db);

  return {
    ...initialState,

    // ==================================================================
    // LOAD
    // ==================================================================

    async loadTemplates() {
      set({ loading: true, error: null });
      try {
        const templates = await repo().listTemplates();

        // Also compute streaks
        const streaks: Record<UUID, number> = {};
        const today = startOfToday();
        for (const t of templates) {
          streaks[t.id] = await repo().calculateStreak(t.id, today);
        }

        set({ templates, streaks, loading: false });
      } catch (err) {
        set({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load templates",
        });
      }
    },

    async loadDailyInstances(date) {
      try {
        const target = date ?? startOfToday();
        const instances = await repo().getDailyHabits(target);
        set({ dailyInstances: instances });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Failed to load daily instances",
        });
      }
    },

    // ==================================================================
    // TEMPLATES
    // ==================================================================

    async createTemplate(template) {
      const created = await repo().createTemplate(template);
      set((s) => ({ templates: [...s.templates, created] }));
      return created;
    },

    async updateTemplate(id, updates) {
      await repo().updateTemplate(id, updates);
      set((s) => ({
        templates: s.templates.map((t) =>
          t.id === id ? { ...t, ...updates } : t,
        ),
      }));
    },

    async deleteTemplate(id) {
      await repo().deleteTemplate(id);
      set((s) => ({
        templates: s.templates.filter((t) => t.id !== id),
        dailyInstances: s.dailyInstances.filter(
          (d) => d.template.id !== id,
        ),
        streaks: (() => {
          const { [id]: _, ...rest } = s.streaks;
          return rest;
        })(),
      }));
    },

    // ==================================================================
    // INSTANCES
    // ==================================================================

    async completeHabit(templateId) {
      const today = startOfToday();

      // Create the instance if it doesn't exist yet
      const instance = await repo().createInstance({
        template_id: templateId,
        scheduled_date: today,
      });

      // Determine previous streak
      const { streaks } = get();
      const prevStreak = streaks[templateId] ?? 0;

      await repo().completeInstance(instance.id, prevStreak);

      // Update local state
      set((s) => {
        const newStreaks = { ...s.streaks, [templateId]: prevStreak + 1 };

        const updatedInstances = s.dailyInstances.map((d) => {
          if (d.instance.id === instance.id || d.instance.template_id === templateId) {
            return {
              ...d,
              instance: {
                ...d.instance,
                id: instance.id,
                completed: 1,
                streak: prevStreak + 1,
              },
            };
          }
          return d;
        });

        // If the instance wasn't in dailyInstances, add it
        const exists = updatedInstances.some(
          (d) => d.instance.template_id === templateId,
        );
        if (!exists) {
          const template = s.templates.find((t) => t.id === templateId);
          if (template) {
            updatedInstances.push({
              template,
              instance: { ...instance, completed: 1, streak: prevStreak + 1 },
            });
          }
        }

        return {
          dailyInstances: updatedInstances,
          streaks: newStreaks,
        };
      });
    },

    async uncompleteHabit(instanceId) {
      await repo().uncompleteInstance(instanceId);

      set((s) => {
        const updatedInstances = s.dailyInstances.map((d) => {
          if (d.instance.id === instanceId) {
            return {
              ...d,
              instance: { ...d.instance, completed: 0, streak: 0 },
            };
          }
          return d;
        });

        return { dailyInstances: updatedInstances };
      });

      // Recalculate streaks
      await get().refreshStreaks();
    },

    async toggleHabit(templateId) {
      const { dailyInstances } = get();
      const existing = dailyInstances.find(
        (d) => d.instance.template_id === templateId,
      );

      if (existing && existing.instance.completed === 1) {
        await get().uncompleteHabit(existing.instance.id);
      } else {
        await get().completeHabit(templateId);
      }
    },

    // ==================================================================
    // STREAKS
    // ==================================================================

    async refreshStreaks() {
      const { templates } = get();
      const today = startOfToday();
      const streaks: Record<UUID, number> = {};

      for (const t of templates) {
        streaks[t.id] = await repo().calculateStreak(t.id, today);
      }

      set({ streaks });
    },

    // ==================================================================
    // RESET
    // ==================================================================

    reset() {
      set(initialState);
    },
  };
});
