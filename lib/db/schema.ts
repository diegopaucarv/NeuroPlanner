import {
  pgTable,
  text,
  timestamp,
  boolean,
  real,
  integer,
  jsonb,
  bigint,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core'

// ============ Better Auth Tables ============

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: boolean('emailverified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdat').notNull().defaultNow(),
  updatedAt: timestamp('updatedat').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expiresat').notNull(),
  createdAt: timestamp('createdat').notNull().defaultNow(),
  updatedAt: timestamp('updatedat').notNull().defaultNow(),
})

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('userid')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('accountid').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provideraccountid').notNull(),
    refreshToken: text('refreshtoken'),
    accessToken: text('accesstoken'),
    expiresAt: timestamp('expiresat'),
    password: text('password'),
    createdAt: timestamp('createdat').notNull().defaultNow(),
    updatedAt: timestamp('updatedat').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('account_provider_idx').on(table.provider, table.providerAccountId),
  ]
)

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresat').notNull(),
  createdAt: timestamp('createdat').notNull().defaultNow(),
  updatedAt: timestamp('updatedat').notNull().defaultNow(),
})

// ============ NeuroPlanner Tables ============

export const entities = pgTable(
  'entities',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
    data: jsonb('data').notNull(),
  },
  (table) => [
    index('idx_entities_type').on(table.type),
    index('idx_entities_created').on(table.createdAt),
    index('idx_entities_user').on(table.userId),
  ]
)

export const timeSeries = pgTable(
  'time_series',
  {
    entityId: text('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
    metricName: text('metric_name').notNull(),
    value: real('value').notNull(),
    context: jsonb('context'),
  },
  (table) => [
    index('idx_ts_entity').on(table.entityId, table.metricName, table.timestamp),
    primaryKey({ columns: [table.entityId, table.timestamp, table.metricName] }),
  ]
)

export const objectives = pgTable(
  'objectives',
  {
    id: text('id')
      .primaryKey()
      .references(() => entities.id, { onDelete: 'cascade' }),
    parentId: text('parent_id').references(() => objectives.id, { onDelete: 'cascade' }),
    progress: real('progress').default(0),
    isActive: integer('is_active').default(1),
    dueDate: bigint('due_date', { mode: 'number' }),
  },
  (table) => [
    index('idx_objectives_parent').on(table.parentId),
    index('idx_objectives_due').on(table.dueDate),
    index('idx_objectives_active').on(table.isActive),
  ]
)
