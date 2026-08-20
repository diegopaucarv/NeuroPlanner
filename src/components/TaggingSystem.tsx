import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import * as Crypto from "expo-crypto";
import { theme, fonts } from "../lib/theme";
import type { Tag } from "./TaskItem";

const TAG_COLORS = [
  "#D9B5FF",
  "#7FD1AE",
  "#7FB3D1",
  "#F2C879",
  "#E58A8A",
  "#8A9BE5",
];

interface TaggingSystemProps {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
}

/**
 * Tag chips stored in `task.data.tags` (array of `{id, name, color}`).
 * Add a tag via the inline input; remove by tapping a chip.
 */
export function TaggingSystem({ tags, onChange }: TaggingSystemProps) {
  const [text, setText] = useState("");

  const addTag = () => {
    const name = text.trim();
    if (!name) return;
    const color = TAG_COLORS[tags.length % TAG_COLORS.length];
    onChange([...tags, { id: Crypto.randomUUID(), name, color }]);
    setText("");
  };

  const removeTag = (id: string) => {
    onChange(tags.filter((t) => t.id !== id));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tags</Text>
      <View style={styles.chips}>
        {tags.map((tag) => (
          <Pressable
            key={tag.id}
            style={[styles.chip, { borderColor: tag.color }]}
            onPress={() => removeTag(tag.id)}
          >
            <Text style={[styles.chipText, { color: tag.color }]}>
              {tag.name} ×
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add tag"
          placeholderTextColor={theme.text}
          value={text}
          onChangeText={setText}
          onSubmitEditing={addTag}
          returnKeyType="done"
        />
        <Pressable style={styles.addBtn} onPress={addTag} hitSlop={8}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    color: theme.text,
    fontFamily: fonts.body,
    opacity: 0.7,
    marginBottom: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 13,
    fontFamily: fonts.body,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.body,
    color: theme.text,
    borderBottomWidth: 1,
    borderBottomColor: "#cccaca",
    paddingVertical: 4,
  },
  addBtn: {
    marginLeft: 8,
  },
  addBtnText: {
    fontSize: 20,
    color: theme.accent,
  },
});
