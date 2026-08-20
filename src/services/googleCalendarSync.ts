/**
 * googleCalendarSync
 *
 * Two-way sync between the local SQLite store and Google Calendar.
 *
 * Strategy:
 *  - SQLite is the source of truth for domain data; Google is the source
 *    of truth for events.
 *  - Writes are queued in an outbox and flushed when connectivity allows.
 *  - Conflicts are resolved by comparing `updated_at` (newest wins).
 *  - Per-entity sync state is tracked in `entities.data.syncStatus`
 *    (`local | synced | conflict`) and the external id in
 *    `entities.data.googleEventId`.
 */

import { Task } from "../lib/types";

/** Push a task/event to Google Calendar (or enqueue it in the outbox). */
export async function pushEvent(task: Task): Promise<void> {
  // TODO(phase 2): implement outbox enqueue + Google Calendar API push.
  void task;
}

/** Pull events from Google Calendar into the local store. */
export async function pullEvents(): Promise<Task[]> {
  // TODO(phase 2): implement Google Calendar API pull + local upsert.
  return [];
}

/** Reconcile local and remote state, resolving conflicts by `updated_at`. */
export async function reconcile(): Promise<void> {
  // TODO(phase 2): implement conflict resolution + syncStatus updates.
}
