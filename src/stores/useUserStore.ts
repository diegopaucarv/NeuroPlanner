/**
 * useUserStore
 *
 * Holds User, UserProfile, SocialBattery, and HealthMetrics (daily snapshot).
 *
 * This store is the single source of truth for the currently active user's
 * identity, preferences, energy budget, and daily wellness readings.
 */

import { create } from "zustand";
import { digestStringAsync, CryptoDigestAlgorithm } from "expo-crypto";
import { db } from "../db/db";
import {
  UserRepository,
  SupportContactRow,
  HealthMetricsDailyRow,
} from "../db/repositories";
import { UUID } from "../models/models";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserState {
  // ---- Data ----
  userId: UUID | null;
  userName: string;
  chronotype: "morning" | "evening" | "moderate";
  routineFlexibility: number;

  /** Raw JSON profile data (sensory, social, frustration, etc.) */
  profileData: Record<string, unknown> | null;

  /** Social battery */
  socialBattery: {
    currentLevel: number;
    recoveryRate: number | null;
    lastUpdated: number;
  } | null;

  /** Support contacts */
  supportContacts: SupportContactRow[];

  /** Today's health metrics snapshot */
  todayMetrics: HealthMetricsDailyRow | null;

  /** Recent daily metrics (last 7 days) */
  recentMetrics: HealthMetricsDailyRow[];

  /** Loading / error flags */
  loading: boolean;
  error: string | null;

  // ---- Actions ----
  /** Bootstrap the store by loading a user by id. */
  loadUser: (userId: UUID) => Promise<void>;

  /** Create a brand-new user (entity + social battery). */
  createUser: (params: {
    id: UUID;
    name: string;
    chronotype?: "morning" | "evening" | "moderate";
    routineFlexibility?: number;
    initialBattery?: number;
    recoveryRate?: number;
    googleId?: string;
    picture?: string;
  }) => Promise<void>;

  /** Create or update the UserProfile. */
  upsertProfile: (
    profileId: UUID,
    data: Record<string, unknown>,
  ) => Promise<void>;

  /** Refresh just the social battery reading. */
  refreshSocialBattery: () => Promise<void>;

  /** Apply a delta to the social battery level. */
  adjustBattery: (delta: number) => Promise<void>;

  /** Refresh today's health metrics. */
  refreshTodayMetrics: (date?: string) => Promise<void>;

  /** Refresh the last 7 days of metrics. */
  refreshRecentMetrics: () => Promise<void>;

  /** CRUD for support contacts */
  addContact: (contact: Omit<SupportContactRow, "id">) => Promise<void>;
  updateContact: (
    contactId: UUID,
    updates: Partial<Omit<SupportContactRow, "id" | "user_id">>,
  ) => Promise<void>;
  removeContact: (contactId: UUID) => Promise<void>;

  /** Register with email + password (hashes locally). */
  registerWithEmail: (params: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;

  /** Login with email + password.  Throws if credentials are wrong. */
  loginWithEmail: (email: string, password: string) => Promise<void>;

  /** Change password (requires old password verification). */
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;

  /** Reset the store (logout / switch user). */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  userId: null as UUID | null,
  userName: "",
  chronotype: "moderate" as const,
  routineFlexibility: 50,
  profileData: null,
  socialBattery: null,
  supportContacts: [] as SupportContactRow[],
  todayMetrics: null,
  recentMetrics: [] as HealthMetricsDailyRow[],
  loading: false,
  error: null as string | null,
};

export const useUserStore = create<UserState>((set, get) => {
  const repo = () => new UserRepository(db);

  return {
    ...initialState,

    // ==================================================================
    // LOAD
    // ==================================================================

    async loadUser(userId) {
      set({ loading: true, error: null });
      try {
        const userEntity = await repo().findById(userId);
        if (!userEntity) {
          set({ loading: false, error: `User ${userId} not found` });
          return;
        }

        const data = userEntity.data as Record<string, unknown>;

        // Parallel fetch of related data
        const [battery, contacts, metrics] = await Promise.all([
          repo().getSocialBattery(userId),
          repo().getSupportContacts(userId),
          repo().getDailyMetrics(userId, todayStr()),
        ]);

        set({
          userId,
          userName: (data.name as string) ?? "",
          chronotype:
            (data.chronotype as UserState["chronotype"]) ?? "moderate",
          routineFlexibility: (data.routineFlexibility as number) ?? 50,
          profileData: data,
          socialBattery: battery
            ? {
                currentLevel: battery.current_level,
                recoveryRate: battery.recovery_rate,
                lastUpdated: battery.last_updated,
              }
            : null,
          supportContacts: contacts,
          todayMetrics: metrics ?? null,
          loading: false,
        });
      } catch (err) {
        set({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load user",
        });
      }
    },

    // ==================================================================
    // CREATE
    // ==================================================================

    async createUser({
      id,
      name,
      chronotype,
      routineFlexibility,
      initialBattery,
      recoveryRate,
      googleId,
      picture,
    }) {
      set({ loading: true, error: null });
      try {
        const data: Record<string, unknown> = {
          name,
          chronotype: chronotype ?? "moderate",
          routineFlexibility: routineFlexibility ?? 50,
        };
        if (googleId) data.googleId = googleId;
        if (picture) data.picture = picture;

        await repo().createUser(id, data, initialBattery, recoveryRate);

        set({
          userId: id,
          userName: name,
          chronotype: chronotype ?? "moderate",
          routineFlexibility: routineFlexibility ?? 50,
          profileData: data,
          socialBattery: {
            currentLevel: initialBattery ?? 100,
            recoveryRate: recoveryRate ?? 5,
            lastUpdated: Date.now(),
          },
          loading: false,
        });
      } catch (err) {
        set({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to create user",
        });
      }
    },

    // ==================================================================
    // PROFILE
    // ==================================================================

    async upsertProfile(profileId, data) {
      try {
        await repo().createProfile(profileId, data);
        set({ profileData: data });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Failed to save profile",
        });
      }
    },

    // ==================================================================
    // SOCIAL BATTERY
    // ==================================================================

    async refreshSocialBattery() {
      const { userId } = get();
      if (!userId) return;

      const battery = await repo().getSocialBattery(userId);
      if (battery) {
        set({
          socialBattery: {
            currentLevel: battery.current_level,
            recoveryRate: battery.recovery_rate,
            lastUpdated: battery.last_updated,
          },
        });
      }
    },

    async adjustBattery(delta) {
      const { userId, socialBattery } = get();
      if (!userId || !socialBattery) return;

      await repo().adjustSocialBattery(userId, delta);
      set({
        socialBattery: {
          ...socialBattery,
          currentLevel: Math.max(
            0,
            Math.min(100, socialBattery.currentLevel + delta),
          ),
          lastUpdated: Date.now(),
        },
      });
    },

    // ==================================================================
    // HEALTH METRICS
    // ==================================================================

    async refreshTodayMetrics(date) {
      const { userId } = get();
      if (!userId) return;

      const metrics = await repo().getDailyMetrics(userId, date ?? todayStr());
      set({ todayMetrics: metrics ?? null });
    },

    async refreshRecentMetrics() {
      const { userId } = get();
      if (!userId) return;

      const from = daysAgo(7);
      const to = todayStr();
      const metrics = await repo().getMetricsInRange(userId, from, to);
      set({ recentMetrics: metrics });
    },

    // ==================================================================
    // SUPPORT CONTACTS
    // ==================================================================

    async addContact(contact) {
      try {
        const created = await repo().addSupportContact(contact);
        set((s) => ({ supportContacts: [...s.supportContacts, created] }));
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Failed to add contact",
        });
      }
    },

    async updateContact(contactId, updates) {
      try {
        await repo().updateSupportContact(contactId, updates);
        set((s) => ({
          supportContacts: s.supportContacts.map((c) =>
            c.id === contactId ? { ...c, ...updates } : c,
          ),
        }));
      } catch (err) {
        set({
          error:
            err instanceof Error ? err.message : "Failed to update contact",
        });
      }
    },

    async removeContact(contactId) {
      try {
        await repo().removeSupportContact(contactId);
        set((s) => ({
          supportContacts: s.supportContacts.filter((c) => c.id !== contactId),
        }));
      } catch (err) {
        set({
          error:
            err instanceof Error ? err.message : "Failed to remove contact",
        });
      }
    },

    // ==================================================================
    // EMAIL / PASSWORD AUTH
    // ==================================================================

    async registerWithEmail({ email, password, name }) {
      set({ loading: true, error: null });
      try {
        const id = `email-${email.toLowerCase().trim()}`;
        const existing = await repo().findByEmail(email);
        if (existing) {
          set({ loading: false, error: "Este email ya existe." });
          return;
        }
        const salt = `neuroplanner-${id}`;
        const hashed = await digestStringAsync(
          CryptoDigestAlgorithm.SHA256,
          `${password}:${salt}`,
        );
        await repo().createWithPassword({
          id,
          email,
          hashedPassword: hashed,
          name,
          initialBattery: 100,
          recoveryRate: 5,
        });
        await get().loadUser(id);
        set({ loading: false });
      } catch (err) {
        set({
          loading: false,
          error: err instanceof Error ? err.message : "Error al registrar.",
        });
      }
    },

    async loginWithEmail(email, password) {
      set({ loading: true, error: null });
      try {
        const user = await repo().findByEmail(email);
        if (!user) {
          set({ loading: false, error: "Email no encontrado." });
          return;
        }
        const salt = `neuroplanner-${user.id}`;
        const hashed = await digestStringAsync(
          CryptoDigestAlgorithm.SHA256,
          `${password}:${salt}`,
        );
        const stored = (user.data as Record<string, unknown>)
          .password as string;
        if (hashed !== stored) {
          set({ loading: false, error: "Contraseña incorrecta." });
          return;
        }
        await get().loadUser(user.id);
        set({ loading: false });
      } catch (err) {
        set({
          loading: false,
          error:
            err instanceof Error ? err.message : "Error al iniciar sesión.",
        });
      }
    },

    async changePassword(oldPassword, newPassword) {
      set({ loading: true, error: null });
      try {
        const { userId, profileData } = get();
        if (!userId || !profileData) {
          set({ loading: false, error: "No hay sesión activa." });
          return;
        }

        const data = profileData as Record<string, unknown>;
        const storedHash = data.password as string | undefined;
        if (!storedHash) {
          set({
            loading: false,
            error: "Esta cuenta no tiene contraseña (es de Google).",
          });
          return;
        }

        // Verify old password
        const salt = `neuroplanner-${userId}`;
        const oldHash = await digestStringAsync(
          CryptoDigestAlgorithm.SHA256,
          `${oldPassword}:${salt}`,
        );
        if (oldHash !== storedHash) {
          set({ loading: false, error: "Contraseña actual incorrecta." });
          return;
        }

        // Hash and save new password
        const newHash = await digestStringAsync(
          CryptoDigestAlgorithm.SHA256,
          `${newPassword}:${salt}`,
        );
        const repo = new UserRepository(db);
        await repo.patch(userId, { ...data, password: newHash });

        // Reload to sync store
        await get().loadUser(userId);
        set({ loading: false });
      } catch (err) {
        set({
          loading: false,
          error:
            err instanceof Error ? err.message : "Error al cambiar contraseña.",
        });
      }
    },

    // ==================================================================
    // RESET
    // ==================================================================

    reset() {
      set(initialState);
    },
  };
});
