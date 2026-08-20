import React, { useState } from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import * as Crypto from "expo-crypto";
import { theme, fonts } from "../lib/theme";
import { useObjectiveStore } from "../stores";

/**
 * "New task" row. Uses a `#cccaca` border (distinct from normal task rows,
 * which use the accent border) per the mockup's TASK_ROW_NEW.
 */
export function NewTaskInput() {
  const create = useObjectiveStore((s) => s.create);
  const [text, setText] = useState("");

  const submit = async () => {
    const summary = text.trim();
    if (!summary) return;
    await create({
      id: Crypto.randomUUID(),
      type: "Task",
      data: {
        summary,
        completed: false,
        isEvent: false,
        tags: [],
      },
    });
    setText("");
  };

  return (
    <View style={styles.row}>
      <View style={styles.titleRow}>
        <TextInput
          style={styles.input}
          placeholder="New task"
          placeholderTextColor={theme.text}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="done"
        />
      </View>
      <Pressable style={styles.icon} onPress={submit} hitSlop={10}>
        <Text style={styles.iconText}>+</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: "#cccaca",
    paddingBottom: 10,
  },
  input: {
    fontSize: 16,
    fontFamily: fonts.body,
    fontWeight: "300",
    color: theme.text,
    padding: 0,
  },
  icon: {
    marginLeft: 12,
    paddingHorizontal: 4,
  },
  iconText: {
    fontSize: 22,
    color: theme.accent,
  },
});
