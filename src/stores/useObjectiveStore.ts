/**
 * useObjectiveStore
 *
 * Holds the loaded hierarchy of Goal, Project, and Task objects.
 * Handles local progress calculations before syncing to SQLite.
 *
 * The store maintains a flat map keyed by id + a tree structure
 * derived from `objective_links` relationships.
 */

import { create } from "zustand";
import { db } from "../db/db";
import { ObjectiveRepository, ObjectiveEntity } from "../db/repositories";
import { UUID, Timestamp } from "../models/models";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ObjectiveTreeNode extends ObjectiveEntity {
  children: ObjectiveTreeNode[];
}

export interface ObjectiveState {
  // ---- Data ----
  /** Flat lookup map: id → ObjectiveEntity */
  flatMap: Record<UUID, ObjectiveEntity>;

  /** Root nodes (objectives with no parent). */
  roots: ObjectiveTreeNode[];

  /** Tree representation of all objectives. */
  tree: ObjectiveTreeNode[];

  /** IDs of objectives currently being edited locally. */
  dirtyIds: Set<UUID>;

  /** Loading / error flags */
  loading: boolean;
  error: string | null;

  // ---- Actions ----

  /** Load all objectives of the given types (Goal, Project, Task). */
  loadAll: () => Promise<void>;

  /** Load only the tree rooted at a specific objective. */
  loadTree: (rootId: UUID) => Promise<ObjectiveTreeNode | null>;

  /** Create a new Goal / Project / Task. */
  create: (params: {
    id: UUID;
    type: "Goal" | "Project" | "Task";
    data: Record<string, unknown>;
    parentId?: UUID;
    dueDate?: Timestamp;
  }) => Promise<ObjectiveEntity>;

  /** Update an objective's JSON data and/or relational fields. */
  update: (
    id: UUID,
    data: Record<string, unknown>,
    objectiveFields?: {
      progress?: number;
      isActive?: boolean;
      parentId?: UUID | null;
      dueDate?: Timestamp | null;
    },
  ) => Promise<void>;

  /** Move an objective under a different parent. */
  reparent: (id: UUID, newParentId: UUID | null) => Promise<void>;

  /** Set progress (0..1).  Syncs to DB immediately. */
  setProgress: (id: UUID, progress: number) => Promise<void>;

  /** Toggle active/inactive. */
  toggleActive: (id: UUID) => Promise<void>;

  /** Delete an objective (cascades to children via FK). */
  remove: (id: UUID) => Promise<void>;

  /** Retrieve the full tree for a given root. */
  getTree: (rootId: UUID) => ObjectiveTreeNode | null;

  /** Rebuild the tree from flatMap. */
  rebuildTree: () => void;

  /** Mark an id as dirty (local-only change not yet synced). */
  markDirty: (id: UUID) => void;

  /** Clear dirty flag after sync. */
  clearDirty: (id: UUID) => void;

  /** Reset the store. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTree(flatMap: Record<UUID, ObjectiveEntity>): ObjectiveTreeNode[] {
  const nodeMap: Record<UUID, ObjectiveTreeNode> = {};
  const roots: ObjectiveTreeNode[] = [];

  // Create tree nodes
  for (const id of Object.keys(flatMap)) {
    const entity = flatMap[id];
    nodeMap[id] = { ...entity, children: [] };
  }

  // Wire parent → child relationships
  for (const id of Object.keys(flatMap)) {
    const node = nodeMap[id];
    if (node.parentId && nodeMap[node.parentId]) {
      nodeMap[node.parentId].children.push(node);
    } else if (!node.parentId) {
      roots.push(node);
    }
  }

  // Sort children by createdAt (oldest first) for stable ordering
  const sortChildren = (n: ObjectiveTreeNode) => {
    n.children.sort((a, b) => a.createdAt - b.createdAt);
    n.children.forEach(sortChildren);
  };
  roots.forEach(sortChildren);

  return roots;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  flatMap: {} as Record<UUID, ObjectiveEntity>,
  roots: [] as ObjectiveTreeNode[],
  tree: [] as ObjectiveTreeNode[],
  dirtyIds: new Set<UUID>(),
  loading: false,
  error: null as string | null,
};

export const useObjectiveStore = create<ObjectiveState>((set, get) => {
  const repo = () => new ObjectiveRepository(db);

  return {
    ...initialState,

    // ==================================================================
    // LOAD
    // ==================================================================

    async loadAll() {
      set({ loading: true, error: null });
      try {
        const objectives = await repo().findByTypes(["Goal", "Project", "Task"]);
        const flatMap: Record<UUID, ObjectiveEntity> = {};
        for (const o of objectives) {
          flatMap[o.id] = o;
        }

        const tree = buildTree(flatMap);
        const roots = tree; // all roots since we loaded everything

        set({ flatMap, roots, tree, loading: false });
      } catch (err) {
        set({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load objectives",
        });
      }
    },

    async loadTree(rootId) {
      const root = await repo().findById(rootId);
      if (!root) return null;

      const children = await repo().getTree(rootId);
      const flatMap: Record<UUID, ObjectiveEntity> = { [root.id]: root };

      for (const c of children) {
        flatMap[c.id] = c;
      }

      // Merge into global flatMap
      set((s) => ({
        flatMap: { ...s.flatMap, ...flatMap },
      }));

      const tree = buildTree(flatMap);
      return tree.find((n) => n.id === rootId) ?? null;
    },

    // ==================================================================
    // CREATE
    // ==================================================================

    async create({ id, type, data, parentId, dueDate }) {
      const entity = await repo().createObjective({
        id,
        type,
        data,
        parentId,
        dueDate,
      });

      set((s) => {
        const flatMap = { ...s.flatMap, [entity.id]: entity };
        const tree = buildTree(flatMap);
        const roots = tree.filter((n) => !n.parentId);
        return { flatMap, roots, tree };
      });

      return entity;
    },

    // ==================================================================
    // UPDATE
    // ==================================================================

    async update(id, data, objectiveFields) {
      await repo().updateObjective(id, data, objectiveFields);

      set((s) => {
        const existing = s.flatMap[id];
        if (!existing) return s;

        const updated: ObjectiveEntity = {
          ...existing,
          data: { ...existing.data, ...data },
          ...(objectiveFields?.progress !== undefined && {
            progress: objectiveFields.progress,
          }),
          ...(objectiveFields?.isActive !== undefined && {
            isActive: objectiveFields.isActive,
          }),
          ...(objectiveFields?.parentId !== undefined && {
            parentId: objectiveFields.parentId,
          }),
          ...(objectiveFields?.dueDate !== undefined && {
            dueDate: objectiveFields.dueDate,
          }),
          updatedAt: Date.now(),
        };

        const flatMap = { ...s.flatMap, [id]: updated };
        const tree = buildTree(flatMap);
        const roots = tree.filter((n) => !n.parentId);

        return { flatMap, roots, tree };
      });
    },

    // ==================================================================
    // REPARENT
    // ==================================================================

    async reparent(id, newParentId) {
      await repo().reparent(id, newParentId);

      set((s) => {
        const existing = s.flatMap[id];
        if (!existing) return s;

        const updated = { ...existing, parentId: newParentId };
        const flatMap = { ...s.flatMap, [id]: updated };
        const tree = buildTree(flatMap);
        const roots = tree.filter((n) => !n.parentId);

        return { flatMap, roots, tree };
      });
    },

    // ==================================================================
    // PROGRESS
    // ==================================================================

    async setProgress(id, progress) {
      const clamped = Math.max(0, Math.min(1, progress));
      await repo().setProgress(id, clamped);

      set((s) => {
        const existing = s.flatMap[id];
        if (!existing) return s;

        const updated = { ...existing, progress: clamped };
        const flatMap = { ...s.flatMap, [id]: updated };
        const tree = buildTree(flatMap);
        const roots = tree.filter((n) => !n.parentId);

        return { flatMap, roots, tree };
      });
    },

    // ==================================================================
    // TOGGLE ACTIVE
    // ==================================================================

    async toggleActive(id) {
      const current = get().flatMap[id];
      if (!current) return;

      const newActive = !current.isActive;
      await repo().setActive(id, newActive);

      set((s) => {
        const existing = s.flatMap[id];
        if (!existing) return s;

        const updated = { ...existing, isActive: newActive };
        const flatMap = { ...s.flatMap, [id]: updated };
        const tree = buildTree(flatMap);
        const roots = tree.filter((n) => !n.parentId);

        return { flatMap, roots, tree };
      });
    },

    // ==================================================================
    // DELETE
    // ==================================================================

    async remove(id) {
      await repo().delete(id);
      set((s) => {
        const flatMap = { ...s.flatMap };
        delete flatMap[id];

        // Also remove children (they cascade in DB, but clean up local too)
        const removeChildren = (parentId: UUID) => {
          for (const key of Object.keys(flatMap)) {
            if (flatMap[key]?.parentId === parentId) {
              const childId = flatMap[key].id;
              delete flatMap[childId];
              removeChildren(childId);
            }
          }
        };
        removeChildren(id);

        const tree = buildTree(flatMap);
        const roots = tree.filter((n) => !n.parentId);

        const dirtyIds = new Set(s.dirtyIds);
        dirtyIds.delete(id);

        return { flatMap, roots, tree, dirtyIds };
      });
    },

    // ==================================================================
    // TREE HELPERS
    // ==================================================================

    getTree(rootId) {
      const { flatMap } = get();
      if (!flatMap[rootId]) return null;
      const tree = buildTree(flatMap);
      return tree.find((n) => n.id === rootId) ?? null;
    },

    rebuildTree() {
      const { flatMap } = get();
      const tree = buildTree(flatMap);
      const roots = tree.filter((n) => !n.parentId);
      set({ roots, tree });
    },

    // ==================================================================
    // DIRTY TRACKING
    // ==================================================================

    markDirty(id) {
      set((s) => {
        const dirtyIds = new Set(s.dirtyIds);
        dirtyIds.add(id);
        return { dirtyIds };
      });
    },

    clearDirty(id) {
      set((s) => {
        const dirtyIds = new Set(s.dirtyIds);
        dirtyIds.delete(id);
        return { dirtyIds };
      });
    },

    // ==================================================================
    // RESET
    // ==================================================================

    reset() {
      set(initialState);
    },
  };
});
