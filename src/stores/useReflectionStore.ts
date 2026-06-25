/**
 * useReflectionStore
 *
 * Temporary state for active conversations, drafts of journal entries,
 * and crisis escalation protocols.  This store is inherently ephemeral—
 * the canonical data lives in the `reflections` table—but the store
 * provides optimistic UI and draft management.
 */

import { create } from "zustand";
import { db } from "../db/db";
import {
  ReflectionRepository,
  Reflection,
  ReflectionType,
} from "../db/repositories";
import { UUID, Timestamp } from "../models/models";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JournalDraft {
  id?: UUID;
  text: string;
  moodBefore?: number;
  moodAfter?: number;
  lastSaved: Timestamp | null;
}

export interface ConversationDraft {
  id?: UUID;
  transcript: string;
  piiRedacted: boolean;
  lastSaved: Timestamp | null;
}

export interface CrisisDraft {
  id?: UUID;
  escalationLevel: "low" | "medium" | "high" | "critical";
  toolsUsed: string[];
  notes: string;
  lastSaved: Timestamp | null;
}

export interface ReflectionState {
  // ---- Data ----
  /** User id these reflections belong to. */
  userId: UUID | null;

  /** Recent reflections (last 50, newest first). */
  recent: Reflection[];

  /** Draft journal entry (not yet persisted). */
  journalDraft: JournalDraft | null;

  /** Draft conversation transcript. */
  conversationDraft: ConversationDraft | null;

  /** Active crisis escalation draft. */
  crisisDraft: CrisisDraft | null;

  /** Loading / error */
  loading: boolean;
  error: string | null;

  // ---- Actions ----

  /** Set the active user context. */
  setUser: (userId: UUID) => void;

  /** Load recent reflections for the current user. */
  loadRecent: (type?: ReflectionType) => Promise<void>;

  /** Load reflections in a date range. */
  loadRange: (from: Timestamp, to: Timestamp, type?: ReflectionType) => Promise<Reflection[]>;

  // -- Journal --
  startJournalDraft: (initial?: string) => void;
  updateJournalDraft: (partial: Partial<JournalDraft>) => void;
  saveJournalDraft: () => Promise<Reflection>;

  // -- Conversation --
  startConversationDraft: () => void;
  updateConversationDraft: (partial: Partial<ConversationDraft>) => void;
  saveConversationDraft: () => Promise<Reflection>;

  // -- Crisis --
  startCrisisDraft: (level?: CrisisDraft["escalationLevel"]) => void;
  updateCrisisDraft: (partial: Partial<CrisisDraft>) => void;
  saveCrisisDraft: () => Promise<Reflection>;
  escalateCrisis: (level: CrisisDraft["escalationLevel"]) => void;

  /** Get the latest crisis log (for escalation review). */
  getLatestCrisis: () => Promise<Reflection | undefined>;

  /** Delete a reflection. */
  remove: (id: UUID) => Promise<void>;

  /** Clear all drafts. */
  clearDrafts: () => void;

  /** Reset the store. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  userId: null as UUID | null,
  recent: [] as Reflection[],
  journalDraft: null as JournalDraft | null,
  conversationDraft: null as ConversationDraft | null,
  crisisDraft: null as CrisisDraft | null,
  loading: false,
  error: null as string | null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useReflectionStore = create<ReflectionState>((set, get) => {
  const repo = () => new ReflectionRepository(db);

  return {
    ...initialState,

    // ==================================================================
    // CONTEXT
    // ==================================================================

    setUser(userId) {
      set({ userId });
    },

    // ==================================================================
    // LOAD
    // ==================================================================

    async loadRecent(type) {
      const { userId } = get();
      if (!userId) return;

      set({ loading: true, error: null });
      try {
        const reflections = await repo().findByUser(userId, type);
        set({ recent: reflections, loading: false });
      } catch (err) {
        set({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load reflections",
        });
      }
    },

    async loadRange(from, to, type) {
      const { userId } = get();
      if (!userId) return [];

      const reflections = await repo().findByDateRange(userId, from, to, type);
      return reflections;
    },

    // ==================================================================
    // JOURNAL
    // ==================================================================

    startJournalDraft(initial) {
      set({
        journalDraft: {
          text: initial ?? "",
          moodBefore: undefined,
          moodAfter: undefined,
          lastSaved: null,
        },
      });
    },

    updateJournalDraft(partial) {
      set((s) => ({
        journalDraft: s.journalDraft
          ? { ...s.journalDraft, ...partial }
          : null,
      }));
    },

    async saveJournalDraft() {
      const { userId, journalDraft } = get();
      if (!userId || !journalDraft) throw new Error("No draft to save");

      const reflection = await repo().create({
        userId,
        type: "journal",
        data: {
          text: journalDraft.text,
          moodBefore: journalDraft.moodBefore ?? null,
          moodAfter: journalDraft.moodAfter ?? null,
        },
      });

      set((s) => ({
        recent: [reflection, ...s.recent].slice(0, 50),
        journalDraft: null,
      }));

      return reflection;
    },

    // ==================================================================
    // CONVERSATION
    // ==================================================================

    startConversationDraft() {
      set({
        conversationDraft: {
          transcript: "",
          piiRedacted: false,
          lastSaved: null,
        },
      });
    },

    updateConversationDraft(partial) {
      set((s) => ({
        conversationDraft: s.conversationDraft
          ? { ...s.conversationDraft, ...partial }
          : null,
      }));
    },

    async saveConversationDraft() {
      const { userId, conversationDraft } = get();
      if (!userId || !conversationDraft) throw new Error("No draft to save");

      const reflection = await repo().create({
        userId,
        type: "conversation",
        data: {
          transcript: conversationDraft.transcript,
          piiRedacted: conversationDraft.piiRedacted,
        },
      });

      set((s) => ({
        recent: [reflection, ...s.recent].slice(0, 50),
        conversationDraft: null,
      }));

      return reflection;
    },

    // ==================================================================
    // CRISIS
    // ==================================================================

    startCrisisDraft(level) {
      set({
        crisisDraft: {
          escalationLevel: level ?? "low",
          toolsUsed: [],
          notes: "",
          lastSaved: null,
        },
      });
    },

    updateCrisisDraft(partial) {
      set((s) => ({
        crisisDraft: s.crisisDraft
          ? { ...s.crisisDraft, ...partial }
          : null,
      }));
    },

    async saveCrisisDraft() {
      const { userId, crisisDraft } = get();
      if (!userId || !crisisDraft) throw new Error("No draft to save");

      const reflection = await repo().create({
        userId,
        type: "crisis",
        data: {
          escalationLevel: crisisDraft.escalationLevel,
          toolsUsed: crisisDraft.toolsUsed,
          notes: crisisDraft.notes,
        },
      });

      set((s) => ({
        recent: [reflection, ...s.recent].slice(0, 50),
        crisisDraft: null,
      }));

      return reflection;
    },

    escalateCrisis(level) {
      set((s) => ({
        crisisDraft: s.crisisDraft
          ? { ...s.crisisDraft, escalationLevel: level, lastSaved: Date.now() }
          : null,
      }));
    },

    async getLatestCrisis() {
      const { userId } = get();
      if (!userId) return undefined;
      return repo().getLatestCrisis(userId);
    },

    // ==================================================================
    // DELETE
    // ==================================================================

    async remove(id) {
      await repo().delete(id);
      set((s) => ({
        recent: s.recent.filter((r) => r.id !== id),
      }));
    },

    // ==================================================================
    // CLEANUP
    // ==================================================================

    clearDrafts() {
      set({
        journalDraft: null,
        conversationDraft: null,
        crisisDraft: null,
      });
    },

    reset() {
      set(initialState);
    },
  };
});
