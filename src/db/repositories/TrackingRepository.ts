/**
 * TrackingRepository
 *
 * Manages the `time_series` and `health_metrics_daily` tables.
 * Implements methods to fetch Trackable histories and record new
 * metric data points.
 */

import { Kysely, Transaction } from "kysely";
import { DB } from "../schema";
import { UUID, Timestamp } from "../../models/models";

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface TimeSeriesRow {
  entity_id: UUID;
  timestamp: Timestamp;
  metric_name: string;
  value: number;
  context: string | null; // JSON
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

export class TrackingRepository {
  constructor(protected readonly db: Kysely<DB> | Transaction<DB>) {}

  // =====================================================================
  // Time Series
  // =====================================================================

  /**
   * Record a single metric data point.
   */
  async recordMetric(params: {
    entityId: UUID;
    metricName: string;
    value: number;
    timestamp?: Timestamp;
    context?: Record<string, unknown>;
  }): Promise<TimeSeriesRow> {
    const row: TimeSeriesRow = {
      entity_id: params.entityId,
      timestamp: params.timestamp ?? Date.now(),
      metric_name: params.metricName,
      value: params.value,
      context: params.context ? JSON.stringify(params.context) : null,
    };

    await this.db.insertInto("time_series").values(row).execute();
    return row;
  }

  /**
   * Batch-insert multiple data points efficiently.
   */
  async recordMetrics(
    points: (Omit<TimeSeriesRow, "context"> & {
      context?: Record<string, unknown>;
    })[],
  ): Promise<void> {
    if (points.length === 0) return;

    const rows: TimeSeriesRow[] = points.map((p) => ({
      entity_id: p.entity_id,
      timestamp: p.timestamp,
      metric_name: p.metric_name,
      value: p.value,
      context: p.context ? JSON.stringify(p.context) : null,
    }));

    await this.db.insertInto("time_series").values(rows).execute();
  }

  /**
   * Retrieve the full history for an entity, optionally filtered by
   * metric name(s) and date range.
   */
  async getHistory(params: {
    entityId: UUID;
    metricNames?: string[];
    from?: Timestamp;
    to?: Timestamp;
    limit?: number;
  }): Promise<TimeSeriesRow[]> {
    let query = this.db
      .selectFrom("time_series")
      .selectAll()
      .where("entity_id", "=", params.entityId);

    if (params.metricNames && params.metricNames.length > 0) {
      query = query.where("metric_name", "in", params.metricNames);
    }
    if (params.from) {
      query = query.where("timestamp", ">=", params.from);
    }
    if (params.to) {
      query = query.where("timestamp", "<=", params.to);
    }

    return query
      .orderBy("timestamp", "asc")
      .$if(!!params.limit, (qb) => qb.limit(params.limit!))
      .execute() as Promise<TimeSeriesRow[]>;
  }

  /**
   * Get the latest value for a specific metric on an entity.
   */
  async getLatest(
    entityId: UUID,
    metricName: string,
  ): Promise<TimeSeriesRow | undefined> {
    return this.db
      .selectFrom("time_series")
      .selectAll()
      .where("entity_id", "=", entityId)
      .where("metric_name", "=", metricName)
      .orderBy("timestamp", "desc")
      .limit(1)
      .executeTakeFirst() as Promise<TimeSeriesRow | undefined>;
  }

  /**
   * Compute a simple aggregate over a metric for an entity.
   */
  async aggregate(params: {
    entityId: UUID;
    metricName: string;
    from?: Timestamp;
    to?: Timestamp;
    fn: "avg" | "sum" | "min" | "max" | "count";
  }): Promise<number | null> {
    let query = this.db
      .selectFrom("time_series")
      .select((eb) => {
        switch (params.fn) {
          case "avg":
            return eb.fn.avg<number>("value").as("result");
          case "sum":
            return eb.fn.sum<number>("value").as("result");
          case "min":
            return eb.fn.min<number>("value").as("result");
          case "max":
            return eb.fn.max<number>("value").as("result");
          case "count":
            return eb.fn.count<number>("value").as("result");
        }
      })
      .where("entity_id", "=", params.entityId)
      .where("metric_name", "=", params.metricName);

    if (params.from) query = query.where("timestamp", ">=", params.from);
    if (params.to) query = query.where("timestamp", "<=", params.to);

    const row = await query.executeTakeFirst();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (row as any)?.result ?? null;
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
    from: string,
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
}
