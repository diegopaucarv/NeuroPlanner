import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme, fonts } from "../lib/theme";
import { formatTime } from "../lib/calendario";
import type { ObjectiveEntity } from "../db/repositories";

// ---------------------------------------------------------------------------
// Task data shape (lives in `ObjectiveEntity.data` as JSON)
// ---------------------------------------------------------------------------

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TaskData {
  summary?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  colorId?: string;
  isEvent?: boolean;
  completed?: boolean;
  tags?: Tag[];
  rewardId?: string;
  description?: string;
}

/** Cast an objective's JSON `data` to the Task shape. */
export const getTaskData = (task: ObjectiveEntity): TaskData =>
  (task.data ?? {}) as TaskData;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TaskItemProps {
  task: ObjectiveEntity;
  onToggle: (task: ObjectiveEntity) => void;
  onDelete: (task: ObjectiveEntity) => void;
  onEdit: (task: ObjectiveEntity) => void;
}

/**
 * A single task row: title + status circle + time.
 * Mirrors the mockup's TASK_ROW → TASK_TITLE (accent border-bottom)
 * → TASK_META (circle + time) → TASK_ICON.
 */
export function TaskItem({ task, onToggle, onDelete, onEdit }: TaskItemProps) {
  const data = getTaskData(task);
  const completed = !!data.completed;
  const time = data.start?.dateTime ? formatTime(data.start.dateTime) : "";

  return (
    <View style={styles.row}>
      <Pressable style={styles.titleRow} onPress={() => onEdit(task)}>
        <Text
          style={[styles.title, completed && styles.titleCompleted]}
          numberOfLines={1}
        >
          {data.summary || "Untitled"}
        </Text>
        <View style={styles.meta}>
          <Pressable
            style={[styles.circle, completed && styles.circleCompleted]}
            onPress={() => onToggle(task)}
            hitSlop={10}
          />
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>
      </Pressable>
      <Pressable style={styles.icon} onPress={() => onDelete(task)} hitSlop={10}>
        <Text style={styles.iconText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: theme.accent,
    paddingBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.body,
    fontWeight: "300",
    color: theme.text,
    marginRight: 12,
  },
  titleCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.5,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
  },
  circle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.accent,
    marginRight: 8,
  },
  circleCompleted: {
    backgroundColor: theme.accent,
  },
  time: {
    fontSize: 13,
    fontFamily: fonts.body,
    fontWeight: "300",
    color: theme.text,
    opacity: 0.8,
  },
  icon: {
    marginLeft: 12,
    paddingHorizontal: 4,
  },
  iconText: {
    fontSize: 20,
    color: theme.text,
    opacity: 0.6,
  },
});
