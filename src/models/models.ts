// models.ts

// ========== Primitives ==========
export type UUID = string;
export type Timestamp = number; // Aligned to SQLite INTEGER (ms)
export type DateTime = number; // Aligned to SQLite INTEGER (ms)
export type TimeRange = { start: DateTime; end: DateTime };
export type CronExpression = string;
export type Context = Record<string, unknown>;
export type TimeSeries = Array<{
  timestamp: Timestamp;
  value: unknown;
  context?: Context;
}>;
export type Map<K extends string | number | symbol, V> = Record<K, V>;
export type List<T> = T[];

// Enums
export type Chronotype = "morning" | "evening" | "moderate";
export type StressLevel = "low" | "medium" | "high";
export type BlockType = "rest" | "therapy" | "exercise" | "social";
export type Vibration = "short" | "long" | "double" | "none";
export type ContentType = "transcript" | "journal" | "crisis" | "medication";
export type Escalation = "low" | "medium" | "high" | "critical";
export type RewardType = "badge" | "points" | "custom" | "break";
export type MetricType =
  | "stress"
  | "anxiety"
  | "socialAnxiety"
  | "recovery"
  | "initiative";
export type NotificationMode = "silent" | "vibrate" | "sound";
export type SensoryModality =
  | "visual"
  | "auditory"
  | "tactile"
  | "olfactory"
  | "gustatory";
export type InteractionType = "smallTalk" | "conflict" | "group" | "authority";
export type ContextTag = "home" | "work" | "public" | "online";
export type Role = "user" | "therapist" | "caregiver";
export type ReportType = "weekly" | "monthly" | "therapy";

export type EntityType =
  | "User"
  | "UserProfile"
  | "DataGovernance"
  | "Assessment"
  | "Goal"
  | "Project"
  | "Task"
  | "Habit"
  | "SmartCalendar"
  | "Reflection"
  | "Reward"
  | "Report";

// ========== Interface contracts (pure types) ==========
export interface Ownable {
  ownerId: UUID;
}

export interface Temporal {
  start: DateTime;
  end: DateTime;
}

export interface Configurable {
  settings: Record<string, unknown>;
}

export interface Scorable {
  score: number;
  normalizedScore: number;
}

export interface Trackable {
  history: TimeSeries;
}

export interface AnalyticSubject {
  getTimeSeries(metric: MetricType): TimeSeries;
  insights: Insight[];
}

// ========== Domain Entities (all as types) ==========
export type Entity = {
  id: UUID;
  entityType: EntityType; // Maps to `entities.type`
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type User = Entity &
  Ownable & {
    entityType: "User";
    name: string;
    chronotype: Chronotype;
    routineFlexibility: number;
  };

export type UserProfile = Entity &
  Configurable & {
    entityType: "UserProfile";
    sensoryPreferences: SensoryProfile;
    socialDifficulties: SocialDifficultyMapping;
    frustrationTolerance: FrustrationToleranceScale;
    breakStrategy: BreakManagement;
    notificationStrategy: NotificationPreference;
    personalization: Personalization;
  };

export type NotificationPreference = {
  mode: NotificationMode;
  quietHours: TimeRange;
  vibrationEnabled: boolean;
  channel: string;
};

export type SettingsAnalysis = {
  computedPatterns: Pattern[];
  lastAnalysis: Timestamp;
};

export type AI_Core = {
  generateInsight(context: Context): Insight;
  detectAnomaly(series: TimeSeries): Alert;
  redactPII(raw: string): string;
};

export type DataGovernance = Entity & {
  entityType: "DataGovernance";
  consentGiven: boolean;
  retentionDays: number;
};

// Assessments
export type Assessment = Entity &
  Scorable &
  Trackable & {
    entityType: "Assessment";
    takenAt: DateTime;
    answers: Map<string, number>;
  };

export type WellbeingAssessment = Assessment & {
  k10: number;
  core10: number;
  sisq: number;
  promis: number;
};

export type FrustrationToleranceScale = Assessment & {
  changeReaction: number;
  ambiguousDiscomfort: number;
};

export type SensoryProfile = Assessment & {
  thresholds: Map<SensoryModality, number>;
  regulationStrategies: string[];
};

export type SocialDifficultyMapping = Assessment & {
  challengingInteractions: InteractionType[];
  anxiousContexts: ContextTag[];
};

// Goal & Task hierarchy (Mapped to both `entities` and `objectives` DB tables)
export type Objective = Entity &
  Temporal &
  Trackable & {
    title: string;
    progress: number; // 0..1
    isActive: boolean;
    parentId?: UUID; // Maps to objectives.parent_id
  };

export type Goal = Objective & {
  entityType: "Goal";
  estimatedEffortDays: number;
  dueDate: DateTime;
  subgoals: Goal[]; // In-memory tree representation
};

export type Project = Objective & {
  entityType: "Project";
  relatedGoals: Goal[];
};

export type Task = Objective &
  Scorable & {
    entityType: "Task";
    durationMinutes: number;
    stressMark: StressLevel;
    rewardTrigger: Reward | null;
  };

export type Habit = Objective & {
  entityType: "Habit";
  frequency: CronExpression;
  streak: number;
};

// Calendar
export type SmartCalendar = Entity & {
  entityType: "SmartCalendar";
  externalSources: string[];
};

export type RecoveryBlock = Temporal & {
  id: UUID;
  type: BlockType;
  mandatory: boolean;
};

export type Nudge = Temporal & {
  id: UUID;
  message: string;
  vibrationPattern: Vibration;
  isContextual: boolean;
};

export type SocialBattery = Trackable & {
  id: UUID; // Shared with User ID
  currentLevel: number;
  recoveryRate: number;
  lastUpdated: Timestamp;
};

// Skills
export type Skill = {
  id: UUID;
  name: string;
  mastery: number;
  anxietyRequired: number;
  type: "social" | "emotional";
};

export type SocialSkill = Skill & {
  contextGeneralization: Record<string, number>;
};

export type EmotionalRegulationSkill = Skill & {
  techniques: string[];
};

export type Drill = Temporal & {
  id: UUID;
  durationSeconds: number;
  skillId: UUID;
  feedback: Feedback[];
};

export type SkillTree = {
  id: UUID;
  dependencies: Map<UUID, List<UUID>>;
};

export type FeedbackSession = {
  id: UUID;
  errorlessMode: boolean;
  celebrationAnimation: string;
};

// Reflection & support
export type ReflectionRecord = Entity &
  Ownable & {
    entityType: "Reflection";
    timestamp: Timestamp;
    contentType: ContentType;
  };

export type Conversation = ReflectionRecord & {
  transcript: string;
  piiRedacted: boolean;
  linguisticFeatures: LinguisticAnalysis;
};

export type JournalEntry = ReflectionRecord & {
  moodBefore: number;
  moodAfter: number;
  text: string;
};

export type CrisisInteraction = ReflectionRecord & {
  escalationLevel: Escalation;
  toolsUsed: string[];
};

export type MedicationLog = ReflectionRecord & {
  name: string;
  dose: string;
  effectRating: number;
};

export type SupportNetwork = {
  contacts: SupportContact[];
  escalationProtocol: Map<Escalation, Action>;
};

// Rewards
export type Reinforcer = Entity &
  Scorable & {
    entityType: "Reward";
    name: string;
    effectiveness: number;
  };

export type Reward = Reinforcer & {
  type: RewardType;
  stressReduction: number;
};

export type CulturalProduct = Reinforcer & {
  sourceUrl: string;
  isFavorite: boolean;
};

export type FavoriteCollection = {
  id: UUID;
  items: CulturalProduct[];
};

// Metrics
export type HealthMetricsDaily = AnalyticSubject &
  Trackable & {
    id: UUID;
    userId: UUID;
    date: string; // YYYY-MM-DD
    stress: number;
    anxiety: number;
    socialAnxiety: number;
    recoveryPct: number;
    socialInitiative: number;
  };

export type PatternDetector = {
  detectWeeklyPattern(metric: TimeSeries): Pattern;
  suggestAutomation(pattern: Pattern): AutomationSuggestion;
};

export type RegressionDetector = {
  detectDrop(metric: TimeSeries, threshold: number): RegressionAlert;
  correlateWithLifeEvent(alert: RegressionAlert): Event[];
};

export type Report = Entity &
  Ownable & {
    entityType: "Report";
    type: ReportType;
    anonymized: boolean;
  };

// ========== Supporting types ==========
export type Insight = {
  message: string;
  severity: "info" | "warning" | "critical";
};
export type Alert = { id: UUID; message: string; timestamp: Timestamp };
export type Pattern = { name: string; confidence: number };
export type AutomationSuggestion = { action: string; condition: string };
export type RegressionAlert = Alert & { metric: MetricType; dropValue: number };
export type Event = { title: string; date: DateTime };
export type File = { uri: string; size: number };
export type DateRange = { from: DateTime; to: DateTime };
export type Question = { id: string; text: string };
export type Strategy = string;
export type BreakManagement = { durationMinutes: number; activities: string[] };
export type Personalization = { theme: "light" | "dark"; fontSize: number };
export type TimeSlot = { start: DateTime; end: DateTime };
export type Technique = string;
export type Feedback = { rating: 1 | 2 | 3 | 4 | 5; comment?: string };
export type LinguisticAnalysis = { sentiment: number; complexity: number };
export type SupportContact = {
  id: UUID;
  name: string;
  relation: string;
  phone: string;
  email?: string;
  escalationLevel: number;
};
export type Action = { type: string; payload?: unknown };
