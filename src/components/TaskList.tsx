import React, { useEffect, useMemo, useState } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
import { theme, fonts } from "../lib/theme";
import { useObjectiveStore } from "../stores";
import type { ObjectiveEntity } from "../db/repositories";
import { TaskItem, getTaskData } from "./TaskItem";
import { NewTaskInput } from "./NewTaskInput";
import { TaskEditor } from "./TaskEditor";
import { FloatingButton } from "./FloatingButton";

/**
 * The real Tasks view. Loads objectives from the store, filters to
 * `type === "Task"`, and renders rows + the "New task" input.
 * Mirrors the mockup's TASK_LIST → TASK_SCROLL → rows.
 */
export function TaskList() {
  const flatMap = useObjectiveStore((s) => s.flatMap);
  const loading = useObjectiveStore((s) => s.loading);
  const error = useObjectiveStore((s) => s.error);
  const loadAll = useObjectiveStore((s) => s.loadAll);
  const update = useObjectiveStore((s) => s.update);
  const remove = useObjectiveStore((s) => s.remove);

  const [editing, setEditing] = useState<ObjectiveEntity | null>(null);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const tasks = useMemo(
    () => Object.values(flatMap).filter((e) => e.type === "Task"),
    [flatMap],
  );

  const handleToggle = (task: ObjectiveEntity) => {
    const data = getTaskData(task);
    update(task.id, { completed: !data.completed });
  };

  const handleDelete = (task: ObjectiveEntity) => {
    remove(task.id);
  };

  const handleEdit = (task: ObjectiveEntity) => {
    setEditing(task);
  };

  return (
    <View style={styles.list}>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
        ListFooterComponent={<NewTaskInput />}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.empty}>Loading…</Text>
          ) : error ? (
            <Text style={styles.empty}>{error}</Text>
          ) : (
            <Text style={styles.empty}>No tasks yet</Text>
          )
        }
        contentContainerStyle={styles.scroll}
      />
      <TaskEditor
        task={editing}
        visible={!!editing}
        onClose={() => setEditing(null)}
      />
      <FloatingButton />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  empty: {
    color: theme.text,
    fontFamily: fonts.body,
    fontWeight: "300",
    opacity: 0.6,
    textAlign: "center",
    marginTop: 24,
  },
});
