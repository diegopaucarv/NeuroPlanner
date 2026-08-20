import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import * as Crypto from "expo-crypto";
import { theme, fonts } from "../lib/theme";
import { useObjectiveStore } from "../stores";
import type { ObjectiveEntity } from "../db/repositories";
import { getTaskData, type Tag } from "./TaskItem";
import { TaggingSystem } from "./TaggingSystem";

// NOTE: `@react-native-community/datetimepicker` is NOT a dependency of this
// project, so time fields use a plain "HH:mm" TextInput instead of a native
// picker.

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Build an ISO dateTime for "today" at the given "HH:mm" time. */
const timeToDateTime = (time: string): string => {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toISOString();
};

/** Extract "HH:mm" from an ISO dateTime string. */
const dateTimeToTime = (dateTime?: string): string => {
  if (!dateTime) return "";
  const d = new Date(dateTime);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
};

interface TaskEditorProps {
  /** Existing task to edit, or `null` to create a new one. */
  task: ObjectiveEntity | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * Modal editor for a task: name, start/end time, type (task/event) and tags.
 * Saves via `update(id, data)` for existing tasks or `create(...)` for new.
 */
export function TaskEditor({ task, visible, onClose }: TaskEditorProps) {
  const create = useObjectiveStore((s) => s.create);
  const update = useObjectiveStore((s) => s.update);

  const [summary, setSummary] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isEvent, setIsEvent] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);

  // Sync local state whenever the editor opens for a (new) task.
  useEffect(() => {
    if (!visible) return;
    if (task) {
      const data = getTaskData(task);
      setSummary(data.summary ?? "");
      setStartTime(dateTimeToTime(data.start?.dateTime));
      setEndTime(dateTimeToTime(data.end?.dateTime));
      setIsEvent(!!data.isEvent);
      setTags(data.tags ?? []);
    } else {
      setSummary("");
      setStartTime("");
      setEndTime("");
      setIsEvent(false);
      setTags([]);
    }
  }, [task, visible]);

  const save = async () => {
    const data = {
      summary: summary.trim() || "Untitled",
      start: { dateTime: timeToDateTime(startTime), timeZone },
      end: { dateTime: timeToDateTime(endTime), timeZone },
      isEvent,
      tags,
    };

    if (task) {
      await update(task.id, data);
    } else {
      await create({
        id: Crypto.randomUUID(),
        type: "Task",
        data: { ...data, completed: false },
      });
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.heading}>
            {task ? "Edit task" : "New task"}
          </Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={summary}
            onChangeText={setSummary}
            placeholder="Task name"
            placeholderTextColor={theme.text}
          />

          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Start</Text>
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="HH:mm"
                placeholderTextColor={theme.text}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.label}>End</Text>
              <TextInput
                style={styles.input}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="HH:mm"
                placeholderTextColor={theme.text}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            <Pressable
              style={[styles.typeBtn, !isEvent && styles.typeBtnActive]}
              onPress={() => setIsEvent(false)}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  !isEvent && styles.typeBtnTextActive,
                ]}
              >
                Task
              </Text>
            </Pressable>
            <Pressable
              style={[styles.typeBtn, isEvent && styles.typeBtnActive]}
              onPress={() => setIsEvent(true)}
            >
              <Text
                style={[styles.typeBtnText, isEvent && styles.typeBtnTextActive]}
              >
                Event
              </Text>
            </Pressable>
          </View>

          <TaggingSystem tags={tags} onChange={setTags} />

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={save}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 18,
    color: theme.text,
    fontWeight: "600",
    fontFamily: fonts.bodySemiBold,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: theme.text,
    fontFamily: fonts.body,
    opacity: 0.7,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    fontSize: 15,
    color: theme.text,
    fontFamily: fonts.body,
    borderBottomWidth: 1,
    borderBottomColor: "#cccaca",
    paddingVertical: 6,
  },
  timeRow: {
    flexDirection: "row",
    gap: 16,
  },
  timeCol: {
    flex: 1,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cccaca",
    alignItems: "center",
  },
  typeBtnActive: {
    borderColor: theme.accent,
    backgroundColor: theme.accent,
  },
  typeBtnText: {
    color: theme.text,
    fontFamily: fonts.body,
  },
  typeBtnTextActive: {
    color: theme.background,
    fontWeight: "600",
    fontFamily: fonts.bodySemiBold,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelText: {
    color: theme.text,
    fontFamily: fonts.body,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: theme.accent,
  },
  saveText: {
    color: theme.background,
    fontWeight: "600",
    fontFamily: fonts.bodySemiBold,
  },
});
