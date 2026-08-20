import React, { useEffect, useMemo, useRef } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { theme } from "../lib/theme";
import { useObjectiveStore, useRewardStore } from "../stores";
import { TimeDivider } from "./TimeDivider";
import { GridWithGroups } from "./GridWithGroups";

const HOUR_HEIGHT = 40;
const GRID_HEIGHT = 24 * HOUR_HEIGHT;

/**
 * Top-level day view. Loads tasks from the objective store, then renders the
 * moment-divider column (TimeDivider) alongside the static day-grid shell
 * (GridWithGroups). Events are not rendered yet in this phase.
 */
export function DiaCalendario() {
  const flatMap = useObjectiveStore((s) => s.flatMap);
  const loadAll = useObjectiveStore((s) => s.loadAll);

  const rewards = useRewardStore((s) => s.rewards);
  const loadRewards = useRewardStore((s) => s.loadAll);

  useEffect(() => {
    loadAll();
    loadRewards();
  }, [loadAll, loadRewards]);

  const tasks = useMemo(
    () => Object.values(flatMap).filter((e) => e.type === "Task"),
    [flatMap],
  );

  const day = useMemo(() => new Date(), []);

  // Ref to the ScrollView, passed to the grid gestures so they can coordinate
  // with scrolling (swipe scrolls; long-press creates/moves/resizes).
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.row}>
          <TimeDivider hourHeight={HOUR_HEIGHT} gridHeight={GRID_HEIGHT} />
          <GridWithGroups
            tasks={tasks}
            day={day}
            rewards={rewards}
            scrollRef={scrollRef}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  row: {
    flexDirection: "row",
  },
  scrollContent: {
    flexGrow: 1,
  },
});
