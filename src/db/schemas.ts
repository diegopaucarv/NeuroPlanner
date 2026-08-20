/**
 * schemas.ts
 *
 * Runtime validation for the polymorphic `entities.data` JSON column (and the
 * `reflections.data` column).
 *
 * The `entities` table stores every domain object with its domain-specific
 * fields serialized into a single `data` JSON column. Historically that JSON
 * was untyped (`Record<string, unknown>`) and never validated, so a typo or a
 * wrong type could be written to disk silently and only surface later as a
 * confusing runtime error.
 *
 * This module is the single source of truth for the shape of each entity
 * type's `data` payload. The repository layer uses it to:
 *   - validate data BEFORE it is persisted (fail fast on bad writes), and
 *   - validate data AFTER it is read back (fail fast on corrupt rows).
 *
 * Schemas use `.passthrough()` so unknown keys are preserved rather than
 * stripped. This keeps the layer non-breaking while still enforcing the types
 * and required fields we know about today.
 */

import { z } from "zod";
import { EntityType } from "../models/models";

// ---------------------------------------------------------------------------
// Per-entity data schemas
// ---------------------------------------------------------------------------

/** User entity (`entities.type = 'User'`) */
export const userDataSchema = z
  .object({
    name: z.string(),
    chronotype: z.enum(["morning", "evening", "moderate"]),
    routineFlexibility: z.number(),
    googleId: z.string().optional(),
    picture: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
  })
  .passthrough();

/** UserProfile entity (`entities.type = 'UserProfile'`) */
export const userProfileDataSchema = z
  .object({
    sensoryPreferences: z.unknown().optional(),
    socialDifficulties: z.unknown().optional(),
    frustrationTolerance: z.unknown().optional(),
    breakStrategy: z.unknown().optional(),
    notificationStrategy: z.unknown().optional(),
    personalization: z.unknown().optional(),
  })
  .passthrough();

/** Base objective data shared by Goal / Project / Task / Habit */
export const objectiveDataSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough();

/** Reward entity (`entities.type = 'Reward'`) */
export const rewardDataSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
    isFavorite: z.boolean().optional(),
    effortRequired: z.number().optional(),
    tags: z.array(z.string()).optional(),
    color: z.string().optional(),
  })
  .passthrough();

/** Assessment entity (`entities.type = 'Assessment'`) */
export const assessmentDataSchema = z
  .object({
    takenAt: z.number().optional(),
    answers: z.record(z.string(), z.number()).optional(),
    score: z.number().optional(),
    normalizedScore: z.number().optional(),
  })
  .passthrough();

/** Report entity (`entities.type = 'Report'`) */
export const reportDataSchema = z
  .object({
    type: z.enum(["weekly", "monthly", "therapy"]).optional(),
    anonymized: z.boolean().optional(),
  })
  .passthrough();

/** SmartCalendar entity (`entities.type = 'SmartCalendar'`) */
export const smartCalendarDataSchema = z
  .object({
    externalSources: z.array(z.string()).optional(),
  })
  .passthrough();

/** DataGovernance entity (`entities.type = 'DataGovernance'`) */
export const dataGovernanceDataSchema = z
  .object({
    consentGiven: z.boolean().optional(),
    retentionDays: z.number().optional(),
  })
  .passthrough();

/** Reflection entity (`entities.type = 'Reflection'`) */
export const reflectionDataSchema = z
  .object({
    contentType: z
      .enum(["transcript", "journal", "crisis", "medication"])
      .optional(),
    timestamp: z.number().optional(),
  })
  .passthrough();

/** Fallback for entity types without a dedicated schema. */
export const fallbackDataSchema = z.record(z.string(), z.unknown());

// ---------------------------------------------------------------------------
// Registry: EntityType -> schema
// ---------------------------------------------------------------------------

export const entityDataSchemas: Record<EntityType, z.ZodType<unknown>> = {
  User: userDataSchema,
  UserProfile: userProfileDataSchema,
  DataGovernance: dataGovernanceDataSchema,
  Assessment: assessmentDataSchema,
  Goal: objectiveDataSchema,
  Project: objectiveDataSchema,
  Task: objectiveDataSchema,
  Habit: objectiveDataSchema,
  SmartCalendar: smartCalendarDataSchema,
  Reflection: reflectionDataSchema,
  Reward: rewardDataSchema,
  Report: reportDataSchema,
};

export function getDataSchema(type: EntityType): z.ZodType<unknown> {
  return entityDataSchemas[type] ?? fallbackDataSchema;
}

// ---------------------------------------------------------------------------
// Typed data accessors
// ---------------------------------------------------------------------------

export type UserData = z.infer<typeof userDataSchema>;
export type UserProfileData = z.infer<typeof userProfileDataSchema>;
export type ObjectiveData = z.infer<typeof objectiveDataSchema>;
export type RewardData = z.infer<typeof rewardDataSchema>;
export type AssessmentData = z.infer<typeof assessmentDataSchema>;
export type ReportData = z.infer<typeof reportDataSchema>;
export type SmartCalendarData = z.infer<typeof smartCalendarDataSchema>;
export type DataGovernanceData = z.infer<typeof dataGovernanceDataSchema>;
export type ReflectionData = z.infer<typeof reflectionDataSchema>;

/** Map of EntityType -> its typed data payload. */
export interface EntityDataMap {
  User: UserData;
  UserProfile: UserProfileData;
  DataGovernance: DataGovernanceData;
  Assessment: AssessmentData;
  Goal: ObjectiveData;
  Project: ObjectiveData;
  Task: ObjectiveData;
  Habit: ObjectiveData;
  SmartCalendar: SmartCalendarData;
  Reflection: ReflectionData;
  Reward: RewardData;
  Report: ReportData;
}

/**
 * Read the validated `data` payload of an entity as a typed domain object.
 * Safe because the repository layer validates the JSON on read before it is
 * exposed here.
 */
export function getData<T>(entity: { data: Record<string, unknown> }): T {
  return entity.data as T;
}

// ---------------------------------------------------------------------------
// Validation error
// ---------------------------------------------------------------------------

export class EntityValidationError extends Error {
  readonly entityId: string;
  readonly entityType: EntityType;
  readonly issues: z.ZodIssue[];

  constructor(entityId: string, entityType: EntityType, issues: z.ZodIssue[]) {
    super(
      `Invalid data for ${entityType} entity "${entityId}": ` +
        issues
          .map((i) => `${i.path.join(".") || "(root)"} ${i.message}`)
          .join("; "),
    );
    this.name = "EntityValidationError";
    this.entityId = entityId;
    this.entityType = entityType;
    this.issues = issues;
  }
}

/**
 * Validate `data` for a given entity type. Throws `EntityValidationError` on
 * failure and returns the (possibly normalized) data on success.
 */
export function validateEntityData(
  entityId: string,
  type: EntityType,
  data: unknown,
): Record<string, unknown> {
  const result = getDataSchema(type).safeParse(data);
  if (!result.success) {
    throw new EntityValidationError(entityId, type, result.error.issues);
  }
  return result.data as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Reflection payload validation (`reflections.data`)
// ---------------------------------------------------------------------------

export type ReflectionPayloadType =
  | "journal"
  | "conversation"
  | "crisis"
  | "medication";

export const reflectionPayloadSchemas: Record<
  ReflectionPayloadType,
  z.ZodType<unknown>
> = {
  journal: z
    .object({
      text: z.string(),
      moodBefore: z.number().nullable().optional(),
      moodAfter: z.number().nullable().optional(),
    })
    .passthrough(),
  conversation: z
    .object({
      transcript: z.string(),
      piiRedacted: z.boolean(),
    })
    .passthrough(),
  crisis: z
    .object({
      escalationLevel: z.enum(["low", "medium", "high", "critical"]),
      toolsUsed: z.array(z.string()),
      notes: z.string().optional(),
    })
    .passthrough(),
  medication: z
    .object({
      name: z.string(),
      dose: z.string(),
      effectRating: z.number().optional(),
    })
    .passthrough(),
};

export class ReflectionValidationError extends Error {
  readonly reflectionId: string;
  readonly reflectionType: ReflectionPayloadType;
  readonly issues: z.ZodIssue[];

  constructor(
    reflectionId: string,
    reflectionType: ReflectionPayloadType,
    issues: z.ZodIssue[],
  ) {
    super(
      `Invalid data for ${reflectionType} reflection "${reflectionId}": ` +
        issues
          .map((i) => `${i.path.join(".") || "(root)"} ${i.message}`)
          .join("; "),
    );
    this.name = "ReflectionValidationError";
    this.reflectionId = reflectionId;
    this.reflectionType = reflectionType;
    this.issues = issues;
  }
}

export function validateReflectionData(
  reflectionId: string,
  type: ReflectionPayloadType,
  data: unknown,
): Record<string, unknown> {
  const schema = reflectionPayloadSchemas[type] ?? fallbackDataSchema;
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ReflectionValidationError(reflectionId, type, result.error.issues);
  }
  return result.data as Record<string, unknown>;
}
