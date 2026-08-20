import React, { useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { theme } from "../lib/theme";
import { TaskEditor } from "./TaskEditor";

/**
 * Sticky FAB (accent `#D9B5FF`), absolutely positioned bottom-right.
 * On press it opens the TaskEditor for a new task.
 */
export function FloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        style={styles.fab}
        onPress={() => setOpen(true)}
        hitSlop={8}
      >
        <Text style={styles.icon}>+</Text>
      </Pressable>
      <TaskEditor
        task={null}
        visible={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  icon: {
    fontSize: 30,
    lineHeight: 34,
    color: theme.background,
    fontWeight: "600",
  },
});
