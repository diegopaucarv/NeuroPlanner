import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, Text, StyleSheet } from "react-native";
import { addDays, startOfWeek, format, isSameDay } from "date-fns";
import { theme, fonts } from "../lib/theme";
import { useObjectiveStore } from "../stores";
import type { ObjectiveEntity } from "../db/repositories";
import { TaskItem, getTaskData } from "./TaskItem";
import { TaskEditor } from "./TaskEditor";
import { FloatingButton } from "./FloatingButton";

/** Only the first two tasks of each day are shown (per the week mockup). */
const MAX_TASKS_PER_DAY = 2;

/** Ordinal suffix for a day-of-month (1 → "1st", 2 → "2nd", …). */
const ordinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/** The 7 days (Mon–Sun) of the week containing `anchor`. */
export const getWeekDays = (anchor: Date): Date[] => {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

/** "Mon, Jan 24th - Sun, Feb 1st" style label for the week containing `anchor`. */
export const getWeekRangeLabel = (anchor: Date): string => {
  const days = getWeekDays(anchor);
  const fmt = (d: Date) => `${format(d, "EEE, MMM")} ${ordinal(d.getDate())}`;
  return `${fmt(days[0])} - ${fmt(days[6])}`;
};

interface WeekTaskListProps {
  /** Anchor date; the week (Mon–Sun) containing it is displayed. */
  currentDate?: Date;
}

/**
 * Week view: lists up to two tasks per day for all seven days of the week.
 * Mirrors the week_view.html mockup — a day header (date + weekday) followed
 * by the day's task rows. Reuses TaskItem for each row.
 */
export function WeekTaskList({ currentDate = new Date() }: WeekTaskListProps) {
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

  const days = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const daysWithTasks = useMemo(
    () =>
      days.map((day) => ({
        day,
        tasks: tasks
          .filter((t) => {
            const start = getTaskData(t).start?.dateTime;
            return start ? isSameDay(new Date(start), day) : false;
          })
          .slice(0, MAX_TASKS_PER_DAY),
      })),
    [days, tasks],
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
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : (
          daysWithTasks.map(({ day, tasks: dayTasks }) => (
            <View key={day.toISOString()} style={styles.daySection}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayDate}>{format(day, "MMM d")}</Text>
                <Text style={styles.dayName}>{format(day, "EEE")}</Text>
              </View>
              {dayTasks.length === 0 ? (
                <Text style={styles.empty}>No tasks</Text>
              ) : (
                dayTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                ))
              )}
            </View>
          ))
        )}
      </ScrollView>
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
  daySection: {
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  dayDate: {
    fontSize: 20,
    fontFamily: fonts.headingRegular,
    color: theme.text,
  },
  dayName: {
    fontSize: 20,
    fontFamily: fonts.headingRegular,
    color: theme.text,
    textAlign: "right",
  },
  empty: {
    color: theme.text,
    fontFamily: fonts.body,
    fontWeight: "300",
    opacity: 0.6,
    textAlign: "center",
    marginTop: 8,
  },
});
