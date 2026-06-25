/**
 * useSkillStore
 *
 * Manages skills, the SkillTree, and active drill_sessions.
 * Skills are stored in the `skills` table; drills and drill_sessions
 * track practice activities linked to a specific skill.
 */

import { create } from "zustand";
import { db } from "../db/db";
import { UUID, Timestamp } from "../models/models";

// ---------------------------------------------------------------------------
// Types (mirror the DB rows)
// ---------------------------------------------------------------------------

export interface SkillRow {
  id: UUID;
  name: string;
  mastery: number;
  anxiety_required: number | null;
  type: "social" | "emotional" | null;
}

export interface DrillRow {
  id: UUID;
  skill_id: UUID;
  duration_seconds: number | null;
}

export interface DrillSessionRow {
  id: UUID;
  drill_id: UUID;
  user_id: UUID;
  started_at: Timestamp;
  completed_at: Timestamp | null;
  success: number; // 0 | 1 (SQLite default 0)
  feedback: string | null; // JSON
}

/** Enriched view: a drill joined with its skill */
export interface DrillWithSkill {
  drill: DrillRow;
  skill: SkillRow;
}

/** Enriched view: a session joined with its drill + skill */
export interface SessionWithDetails {
  session: DrillSessionRow;
  drill: DrillRow;
  skill: SkillRow;
}

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

export interface SkillState {
  // ---- Data ----
  /** All skills */
  skills: SkillRow[];

  /** All drills */
  drills: DrillRow[];

  /** Currently active drill session (if any) */
  activeSession: SessionWithDetails | null;

  /** Session history for the current user */
  sessionHistory: SessionWithDetails[];

  /** Loading / error */
  loading: boolean;
  error: string | null;

  // ---- Actions ----

  /** Load all skills. */
  loadSkills: () => Promise<void>;

  /** Load all drills (optionally filtered by skill). */
  loadDrills: (skillId?: UUID) => Promise<void>;

  /** Create a new skill. */
  createSkill: (skill: Omit<SkillRow, "id" | "mastery"> & { id?: UUID }) => Promise<SkillRow>;

  /** Update a skill (name, anxiety_required, etc.). */
  updateSkill: (id: UUID, updates: Partial<Omit<SkillRow, "id">>) => Promise<void>;

  /** Update mastery level. */
  setMastery: (id: UUID, mastery: number) => Promise<void>;

  /** Delete a skill (cascades to drills). */
  deleteSkill: (id: UUID) => Promise<void>;

  /** Create a drill for a skill. */
  createDrill: (drill: Omit<DrillRow, "id"> & { id?: UUID }) => Promise<DrillRow>;

  /** Delete a drill. */
  deleteDrill: (id: UUID) => Promise<void>;

  /** Start a drill session. */
  startSession: (drillId: UUID, userId: UUID) => Promise<SessionWithDetails>;

  /** Complete the active drill session. */
  completeSession: (success: boolean, feedback?: Record<string, unknown>) => Promise<void>;

  /** Load session history for a user. */
  loadSessionHistory: (userId: UUID, limit?: number) => Promise<void>;

  /** Reset the store. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  skills: [] as SkillRow[],
  drills: [] as DrillRow[],
  activeSession: null as SessionWithDetails | null,
  sessionHistory: [] as SessionWithDetails[],
  loading: false,
  error: null as string | null,
};

export const useSkillStore = create<SkillState>((set, get) => {
  // -------------------------------------------------------------------
  // Helpers: raw Kysely queries
  // -------------------------------------------------------------------

  async function querySkills(): Promise<SkillRow[]> {
    return (await db
      .selectFrom("skills")
      .selectAll()
      .orderBy("name", "asc")
      .execute()) as SkillRow[];
  }

  async function queryDrills(skillId?: UUID): Promise<DrillRow[]> {
    let q = db.selectFrom("drills").selectAll();
    if (skillId) q = q.where("skill_id", "=", skillId);
    return q.orderBy("id", "asc").execute() as Promise<DrillRow[]>;
  }

  async function queryDrillWithSkill(drillId: UUID): Promise<DrillWithSkill | undefined> {
    const row = await db
      .selectFrom("drills")
      .innerJoin("skills", "drills.skill_id", "skills.id")
      .select([
        "drills.id as d_id",
        "drills.skill_id as d_skill_id",
        "drills.duration_seconds as d_duration_seconds",
        "skills.id as s_id",
        "skills.name as s_name",
        "skills.mastery as s_mastery",
        "skills.anxiety_required as s_anxiety_required",
        "skills.type as s_type",
      ])
      .where("drills.id", "=", drillId)
      .executeTakeFirst();

    if (!row) return undefined;

    const r = row as Record<string, unknown>;
    return {
      drill: {
        id: r.d_id as UUID,
        skill_id: r.d_skill_id as UUID,
        duration_seconds: r.d_duration_seconds as number | null,
      },
      skill: {
        id: r.s_id as UUID,
        name: r.s_name as string,
        mastery: r.s_mastery as number,
        anxiety_required: r.s_anxiety_required as number | null,
        type: r.s_type as SkillRow["type"],
      },
    };
  }

  async function querySessionWithDetails(
    sessionId: UUID,
  ): Promise<SessionWithDetails | undefined> {
    const row = await db
      .selectFrom("drill_sessions")
      .innerJoin("drills", "drill_sessions.drill_id", "drills.id")
      .innerJoin("skills", "drills.skill_id", "skills.id")
      .select([
        "drill_sessions.id as ses_id",
        "drill_sessions.drill_id as ses_drill_id",
        "drill_sessions.user_id as ses_user_id",
        "drill_sessions.started_at as ses_started_at",
        "drill_sessions.completed_at as ses_completed_at",
        "drill_sessions.success as ses_success",
        "drill_sessions.feedback as ses_feedback",
        "drills.id as d_id",
        "drills.skill_id as d_skill_id",
        "drills.duration_seconds as d_duration_seconds",
        "skills.id as s_id",
        "skills.name as s_name",
        "skills.mastery as s_mastery",
        "skills.anxiety_required as s_anxiety_required",
        "skills.type as s_type",
      ])
      .where("drill_sessions.id", "=", sessionId)
      .executeTakeFirst();

    if (!row) return undefined;

    const r = row as Record<string, unknown>;
    return {
      session: {
        id: r.ses_id as UUID,
        drill_id: r.ses_drill_id as UUID,
        user_id: r.ses_user_id as UUID,
        started_at: r.ses_started_at as Timestamp,
        completed_at: r.ses_completed_at as Timestamp | null,
        success: r.ses_success as number,
        feedback: r.ses_feedback as string | null,
      },
      drill: {
        id: r.d_id as UUID,
        skill_id: r.d_skill_id as UUID,
        duration_seconds: r.d_duration_seconds as number | null,
      },
      skill: {
        id: r.s_id as UUID,
        name: r.s_name as string,
        mastery: r.s_mastery as number,
        anxiety_required: r.s_anxiety_required as number | null,
        type: r.s_type as SkillRow["type"],
      },
    };
  }

  // -------------------------------------------------------------------
  // Store
  // -------------------------------------------------------------------

  return {
    ...initialState,

    // ================================================================
    // SKILLS
    // ================================================================

    async loadSkills() {
      set({ loading: true, error: null });
      try {
        const skills = await querySkills();
        set({ skills, loading: false });
      } catch (err) {
        set({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load skills",
        });
      }
    },

    async createSkill(skill) {
      const id =
        skill.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const row: SkillRow = {
        id,
        name: skill.name,
        mastery: 0,
        anxiety_required: skill.anxiety_required ?? null,
        type: skill.type ?? null,
      };

      await db.insertInto("skills").values(row).execute();

      set((s) => ({ skills: [...s.skills, row] }));
      return row;
    },

    async updateSkill(id, updates) {
      await db
        .updateTable("skills")
        .set(updates)
        .where("id", "=", id)
        .execute();

      set((s) => ({
        skills: s.skills.map((sk) =>
          sk.id === id ? { ...sk, ...updates } : sk,
        ),
      }));
    },

    async setMastery(id, mastery) {
      const clamped = Math.max(0, Math.min(1, mastery));
      await db
        .updateTable("skills")
        .set({ mastery: clamped })
        .where("id", "=", id)
        .execute();

      set((s) => ({
        skills: s.skills.map((sk) =>
          sk.id === id ? { ...sk, mastery: clamped } : sk,
        ),
      }));
    },

    async deleteSkill(id) {
      await db.deleteFrom("skills").where("id", "=", id).execute();
      set((s) => ({
        skills: s.skills.filter((sk) => sk.id !== id),
        drills: s.drills.filter((d) => d.skill_id !== id),
      }));
    },

    // ================================================================
    // DRILLS
    // ================================================================

    async loadDrills(skillId) {
      try {
        const drills = await queryDrills(skillId);
        set({ drills });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Failed to load drills",
        });
      }
    },

    async createDrill(drill) {
      const id =
        drill.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const row: DrillRow = {
        id,
        skill_id: drill.skill_id,
        duration_seconds: drill.duration_seconds ?? null,
      };

      await db.insertInto("drills").values(row).execute();

      set((s) => ({ drills: [...s.drills, row] }));
      return row;
    },

    async deleteDrill(id) {
      await db.deleteFrom("drills").where("id", "=", id).execute();
      set((s) => ({ drills: s.drills.filter((d) => d.id !== id) }));
    },

    // ================================================================
    // SESSIONS
    // ================================================================

    async startSession(drillId, userId) {
      const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const sessionRow: DrillSessionRow = {
        id,
        drill_id: drillId,
        user_id: userId,
        started_at: Date.now(),
        completed_at: null,
        success: 0,
        feedback: null,
      };

      await db.insertInto("drill_sessions").values(sessionRow).execute();

      const details = await querySessionWithDetails(id);
      if (details) {
        set({ activeSession: details });
      }
      return details!;
    },

    async completeSession(success, feedback) {
      const { activeSession } = get();
      if (!activeSession) return;

      const ts = Date.now();
      await db
        .updateTable("drill_sessions")
        .set({
          completed_at: ts,
          success: success ? 1 : 0,
          feedback: feedback ? JSON.stringify(feedback) : null,
        })
        .where("id", "=", activeSession.session.id)
        .execute();

      // Update the local state
      const updated: SessionWithDetails = {
        ...activeSession,
        session: {
          ...activeSession.session,
          completed_at: ts,
          success: success ? 1 : 0,
          feedback: feedback ? JSON.stringify(feedback) : null,
        },
      };

      set((s) => ({
        activeSession: null,
        sessionHistory: [updated, ...s.sessionHistory].slice(0, 100),
      }));
    },

    async loadSessionHistory(userId, limit = 50) {
      try {
        const rows = await db
          .selectFrom("drill_sessions")
          .innerJoin("drills", "drill_sessions.drill_id", "drills.id")
          .innerJoin("skills", "drills.skill_id", "skills.id")
          .select([
            "drill_sessions.id as ses_id",
            "drill_sessions.drill_id as ses_drill_id",
            "drill_sessions.user_id as ses_user_id",
            "drill_sessions.started_at as ses_started_at",
            "drill_sessions.completed_at as ses_completed_at",
            "drill_sessions.success as ses_success",
            "drill_sessions.feedback as ses_feedback",
            "drills.id as d_id",
            "drills.skill_id as d_skill_id",
            "drills.duration_seconds as d_duration_seconds",
            "skills.id as s_id",
            "skills.name as s_name",
            "skills.mastery as s_mastery",
            "skills.anxiety_required as s_anxiety_required",
            "skills.type as s_type",
          ])
          .where("drill_sessions.user_id", "=", userId)
          .orderBy("drill_sessions.started_at", "desc")
          .limit(limit)
          .execute();

        const history: SessionWithDetails[] = (rows as Record<string, unknown>[]).map(
          (r) => ({
            session: {
              id: r.ses_id as UUID,
              drill_id: r.ses_drill_id as UUID,
              user_id: r.ses_user_id as UUID,
              started_at: r.ses_started_at as Timestamp,
              completed_at: r.ses_completed_at as Timestamp | null,
              success: r.ses_success as number,
              feedback: r.ses_feedback as string | null,
            },
            drill: {
              id: r.d_id as UUID,
              skill_id: r.d_skill_id as UUID,
              duration_seconds: r.d_duration_seconds as number | null,
            },
            skill: {
              id: r.s_id as UUID,
              name: r.s_name as string,
              mastery: r.s_mastery as number,
              anxiety_required: r.s_anxiety_required as number | null,
              type: r.s_type as SkillRow["type"],
            },
          }),
        );

        set({ sessionHistory: history });
      } catch (err) {
        set({
          error:
            err instanceof Error ? err.message : "Failed to load session history",
        });
      }
    },

    // ================================================================
    // RESET
    // ================================================================

    reset() {
      set(initialState);
    },
  };
});
