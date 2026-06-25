/**
 * HabitRepository
 *
 * Dedicated logic for `habit_templates` and `habit_instances`,
 * linking back to images via image_id.
 *
 * HabitTemplates define reusable habits; HabitInstances capture each
 * daily occurrence (with completion and streak tracking).
 */

import { Kysely, Transaction } from "kysely";
import { DB } from "../schema";
import { UUID, Timestamp } from "../../models/models";

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface HabitTemplateRow {
  id: UUID;
  name: string;
  description: string | null;
  default_duration_minutes: number | null;
  default_priority: number | null;
  tags: string | null; // JSON array
  image_id: UUID | null;
}

export interface HabitInstanceRow {
  id: UUID;
  template_id: UUID;
  scheduled_date: Timestamp;
  completed: number; // 0 | 1
  streak: number;
}

/** Denormalised view combining template + instance */
export interface HabitWithInstance {
  template: HabitTemplateRow;
  instance: HabitInstanceRow;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class HabitRepository {
  constructor(protected readonly db: Kysely<DB> | Transaction<DB>) {}

  // =====================================================================
  // Templates
  // =====================================================================

  async createTemplate(
    template: Omit<HabitTemplateRow, "id"> & { id?: UUID },
  ): Promise<HabitTemplateRow> {
    const id =
      template.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const row: HabitTemplateRow = { id, ...template };

    await this.db.insertInto("habit_templates").values(row).execute();
    return row;
  }

  async getTemplate(templateId: UUID): Promise<HabitTemplateRow | undefined> {
    return this.db
      .selectFrom("habit_templates")
      .selectAll()
      .where("id", "=", templateId)
      .executeTakeFirst() as Promise<HabitTemplateRow | undefined>;
  }

  async listTemplates(): Promise<HabitTemplateRow[]> {
    return this.db
      .selectFrom("habit_templates")
      .selectAll()
      .orderBy("name", "asc")
      .execute() as Promise<HabitTemplateRow[]>;
  }

  async updateTemplate(
    templateId: UUID,
    updates: Partial<Omit<HabitTemplateRow, "id">>,
  ): Promise<void> {
    await this.db
      .updateTable("habit_templates")
      .set(updates)
      .where("id", "=", templateId)
      .execute();
  }

  async deleteTemplate(templateId: UUID): Promise<void> {
    await this.db
      .deleteFrom("habit_templates")
      .where("id", "=", templateId)
      .execute();
  }

  // =====================================================================
  // Instances
  // =====================================================================

  /**
   * Create a habit instance for a given date.
   * If one already exists for that template + date, it's returned as-is
   * (no duplicate).
   */
  async createInstance(
    instance: Omit<HabitInstanceRow, "id" | "completed" | "streak"> & {
      id?: UUID;
    },
  ): Promise<HabitInstanceRow> {
    // Check for duplicate
    const existing = await this.db
      .selectFrom("habit_instances")
      .selectAll()
      .where("template_id", "=", instance.template_id)
      .where("scheduled_date", "=", instance.scheduled_date)
      .executeTakeFirst();

    if (existing) return existing as HabitInstanceRow;

    const id =
      instance.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const row: HabitInstanceRow = {
      id,
      template_id: instance.template_id,
      scheduled_date: instance.scheduled_date,
      completed: 0,
      streak: 0,
    };

    await this.db.insertInto("habit_instances").values(row).execute();
    return row;
  }

  /** Mark an instance as completed and update its streak. */
  async completeInstance(instanceId: UUID, prevStreak: number): Promise<void> {
    await this.db
      .updateTable("habit_instances")
      .set({ completed: 1, streak: prevStreak + 1 })
      .where("id", "=", instanceId)
      .execute();
  }

  /** Un-mark an instance (useful if user taps by mistake). */
  async uncompleteInstance(instanceId: UUID): Promise<void> {
    await this.db
      .updateTable("habit_instances")
      .set({ completed: 0, streak: 0 })
      .where("id", "=", instanceId)
      .execute();
  }

  /**
   * Get all instances for a date with explicit column selection
   * (avoids ambiguous column name issues from the join).
   */
  async getDailyHabits(date: Timestamp): Promise<HabitWithInstance[]> {
    const rows = await this.db
      .selectFrom("habit_instances")
      .innerJoin(
        "habit_templates",
        "habit_instances.template_id",
        "habit_templates.id",
      )
      .select([
        "habit_templates.id as t_id",
        "habit_templates.name as t_name",
        "habit_templates.description as t_description",
        "habit_templates.default_duration_minutes as t_duration",
        "habit_templates.default_priority as t_priority",
        "habit_templates.tags as t_tags",
        "habit_templates.image_id as t_image_id",
        "habit_instances.id as i_id",
        "habit_instances.template_id as i_template_id",
        "habit_instances.scheduled_date as i_scheduled_date",
        "habit_instances.completed as i_completed",
        "habit_instances.streak as i_streak",
      ])
      .where("habit_instances.scheduled_date", "=", date)
      .execute();

    return rows.map((r: Record<string, unknown>) => ({
      template: {
        id: r.t_id as UUID,
        name: r.t_name as string,
        description: r.t_description as string | null,
        default_duration_minutes: r.t_duration as number | null,
        default_priority: r.t_priority as number | null,
        tags: r.t_tags as string | null,
        image_id: r.t_image_id as UUID | null,
      },
      instance: {
        id: r.i_id as UUID,
        template_id: r.i_template_id as UUID,
        scheduled_date: r.i_scheduled_date as Timestamp,
        completed: r.i_completed as number,
        streak: r.i_streak as number,
      },
    }));
  }

  /**
   * Get the current streak for a template by looking at consecutive
   * completed instances going backwards from today.
   */
  async calculateStreak(
    templateId: UUID,
    fromDate: Timestamp,
  ): Promise<number> {
    const rows = await this.db
      .selectFrom("habit_instances")
      .select(["scheduled_date", "completed"])
      .where("template_id", "=", templateId)
      .where("scheduled_date", "<=", fromDate)
      .orderBy("scheduled_date", "desc")
      .execute();

    let streak = 0;
    // Simple approach: count consecutive completed days going backwards.
    // A more sophisticated version would check day-by-day continuity.
    for (const row of rows) {
      if (row.completed === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /** Delete an instance. */
  async deleteInstance(instanceId: UUID): Promise<void> {
    await this.db
      .deleteFrom("habit_instances")
      .where("id", "=", instanceId)
      .execute();
  }
}
