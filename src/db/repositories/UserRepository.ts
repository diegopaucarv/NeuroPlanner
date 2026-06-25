/**
 * UserRepository
 *
 * Manages User, UserProfile, SocialBattery, SupportContacts, and
 * HealthMetricsDaily.  All user‑facing data is anchored to an `entities`
 * row (type = 'User' | 'UserProfile').
 *
 * Transactional helpers ensure that creating a User also initialises its
 * SocialBattery row atomically.
 */

import { Kysely, Transaction } from "kysely";
import { DB } from "../schema";
import { BaseEntityRepository, EntityData } from "./BaseEntityRepository";
import { UUID, Timestamp } from "../../models/models";

// ---------------------------------------------------------------------------
// Row shapes (mirroring the generated schema)
// ---------------------------------------------------------------------------

export interface SocialBatteryRow {
  id: UUID;
  current_level: number;
  recovery_rate: number | null;
  last_updated: Timestamp;
}

export interface SupportContactRow {
  id: UUID;
  user_id: UUID;
  name: string;
  relation: string | null;
  phone: string | null;
  email: string | null;
  escalation_level: number | null;
}

export interface HealthMetricsDailyRow {
  id: UUID;
  user_id: UUID;
  date: string; // YYYY-MM-DD
  stress: number | null;
  anxiety: number | null;
  social_anxiety: number | null;
  recovery_pct: number | null;
  social_initiative: number | null;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class UserRepository extends BaseEntityRepository {
  constructor(db: Kysely<DB> | Transaction<DB>) {
    super(db);
  }

  // =====================================================================
  // Social Battery
  // =====================================================================

  /** Create (or replace) the SocialBattery row for a user. */
  async upsertSocialBattery(
    userId: UUID,
    currentLevel: number,
    recoveryRate?: number,
  ): Promise<SocialBatteryRow> {
    const ts = Date.now();
    const row: SocialBatteryRow = {
      id: userId,
      current_level: Math.max(0, Math.min(100, currentLevel)),
      recovery_rate: recoveryRate ?? null,
      last_updated: ts,
    };

    await this.db
      .insertInto("social_battery")
      .values(row)
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          current_level: row.current_level,
          recovery_rate: row.recovery_rate,
          last_updated: row.last_updated,
        }),
      )
      .execute();

    return row;
  }

  /** Read the SocialBattery row. */
  async getSocialBattery(userId: UUID): Promise<SocialBatteryRow | undefined> {
    return this.db
      .selectFrom("social_battery")
      .selectAll()
      .where("id", "=", userId)
      .executeTakeFirst() as Promise<SocialBatteryRow | undefined>;
  }

  /** Increment / decrement current_level atomically. */
  async adjustSocialBattery(userId: UUID, delta: number): Promise<void> {
    const current = await this.getSocialBattery(userId);
    if (!current) return;

    const newLevel = Math.max(0, Math.min(100, current.current_level + delta));
    await this.db
      .updateTable("social_battery")
      .set({ current_level: newLevel, last_updated: Date.now() })
      .where("id", "=", userId)
      .execute();
  }

  // =====================================================================
  // Support Contacts
  // =====================================================================

  async addSupportContact(
    contact: Omit<SupportContactRow, "id">,
  ): Promise<SupportContactRow> {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const row: SupportContactRow = { id, ...contact };

    await this.db.insertInto("support_contacts").values(row).execute();
    return row;
  }

  async getSupportContacts(userId: UUID): Promise<SupportContactRow[]> {
    return this.db
      .selectFrom("support_contacts")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("escalation_level", "asc")
      .execute() as Promise<SupportContactRow[]>;
  }

  async updateSupportContact(
    contactId: UUID,
    updates: Partial<Omit<SupportContactRow, "id" | "user_id">>,
  ): Promise<void> {
    await this.db
      .updateTable("support_contacts")
      .set(updates)
      .where("id", "=", contactId)
      .execute();
  }

  async removeSupportContact(contactId: UUID): Promise<void> {
    await this.db
      .deleteFrom("support_contacts")
      .where("id", "=", contactId)
      .execute();
  }

  // =====================================================================
  // Health Metrics Daily
  // =====================================================================

  async upsertDailyMetrics(
    metrics: Omit<HealthMetricsDailyRow, "id"> & { id?: UUID },
  ): Promise<HealthMetricsDailyRow> {
    const id =
      metrics.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const row: HealthMetricsDailyRow = { id, ...metrics };

    await this.db
      .insertInto("health_metrics_daily")
      .values(row)
      .onConflict((oc) =>
        oc.columns(["user_id", "date"]).doUpdateSet({
          stress: row.stress,
          anxiety: row.anxiety,
          social_anxiety: row.social_anxiety,
          recovery_pct: row.recovery_pct,
          social_initiative: row.social_initiative,
        }),
      )
      .execute();

    return row;
  }

  async getDailyMetrics(
    userId: UUID,
    date: string,
  ): Promise<HealthMetricsDailyRow | undefined> {
    return this.db
      .selectFrom("health_metrics_daily")
      .selectAll()
      .where("user_id", "=", userId)
      .where("date", "=", date)
      .executeTakeFirst() as Promise<HealthMetricsDailyRow | undefined>;
  }

  async getMetricsInRange(
    userId: UUID,
    from: string, // YYYY-MM-DD
    to: string,
  ): Promise<HealthMetricsDailyRow[]> {
    return this.db
      .selectFrom("health_metrics_daily")
      .selectAll()
      .where("user_id", "=", userId)
      .where("date", ">=", from)
      .where("date", "<=", to)
      .orderBy("date", "asc")
      .execute() as Promise<HealthMetricsDailyRow[]>;
  }

  // =====================================================================
  // Transactional: create User + SocialBattery + Profile
  // =====================================================================

  /**
   * Create a fully‑initialised user (entity row + social_battery row)
   * inside a transaction.
   */
  async createUser(
    userId: UUID,
    profileData: EntityData,
    initialBattery?: number,
    recoveryRate?: number,
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      const userRepo = new UserRepository(trx);

      // 1. Insert the User entity
      await userRepo.create(userId, "User", profileData);

      // 2. Insert SocialBattery
      await userRepo.upsertSocialBattery(
        userId,
        initialBattery ?? 100,
        recoveryRate ?? 5,
      );
    });
  }

  /**
   * Create a UserProfile entity (separate row, type = 'UserProfile')
   * typically linked to a User row via an ownerId field inside `data`.
   */
  async createProfile(profileId: UUID, profileData: EntityData): Promise<void> {
    await this.create(profileId, "UserProfile", profileData);
  }

  // =====================================================================
  // Google ID lookup
  // =====================================================================

  /**
   * Find the first User entity whose `data` JSON contains the given
   * Google `sub` id.  Returns `undefined` if no match is found.
   *
   * Because this is a single‑user app we can safely load all User rows
   * and filter in JS.  At scale you would add a generated column or a
   * dedicated `google_id` column with an index.
   */
  async findByGoogleId(
    googleId: string,
  ): Promise<{ id: UUID; data: EntityData } | undefined> {
    const rows = await this.findByType("User");
    for (const entity of rows) {
      if ((entity.data as Record<string, unknown>).googleId === googleId) {
        return { id: entity.id, data: entity.data };
      }
    }
    return undefined;
  }

  // =====================================================================
  // Email / Password auth
  // =====================================================================

  /** Find a User by email (stored in data.email). */
  async findByEmail(
    email: string,
  ): Promise<{ id: UUID; data: EntityData } | undefined> {
    const rows = await this.findByType("User");
    for (const entity of rows) {
      if (
        (entity.data as Record<string, unknown>).email ===
        email.toLowerCase().trim()
      ) {
        return { id: entity.id, data: entity.data };
      }
    }
    return undefined;
  }

  /** Create a User with email + hashed password. */
  async createWithPassword(params: {
    id: UUID;
    email: string;
    hashedPassword: string;
    name: string;
    initialBattery?: number;
    recoveryRate?: number;
  }): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      const repo = new UserRepository(trx);
      await repo.create(params.id, "User", {
        name: params.name,
        email: params.email.toLowerCase().trim(),
        password: params.hashedPassword,
        chronotype: "moderate",
        routineFlexibility: 50,
      });
      await repo.upsertSocialBattery(
        params.id,
        params.initialBattery ?? 100,
        params.recoveryRate ?? 5,
      );
    });
  }
}
