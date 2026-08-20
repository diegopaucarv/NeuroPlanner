import React, { useMemo } from "react";
import { Text, Image, Pressable, StyleSheet } from "react-native";
import { theme, fonts } from "../lib/theme";
import type { Task, TaskBlock } from "../lib/types";
import type { RewardRow } from "../db/repositories";

interface DroppablePremioProps {
  /** The event group this drop zone is attached to. */
  group: TaskBlock;
  /** Catalogue of rewards that can be assigned. */
  rewards: RewardRow[];
  /** Assign a reward to every task in the group. */
  onAssignReward: (groupId: string, rewardId: string) => void;
  /** Remove the reward from every task in the group. */
  onClearReward: (groupId: string) => void;
}

const BADGE_SIZE = 22;

/**
 * Drop zone rendered over each event group. Associates a reward with the
 * events in the group and shows it as a small circular badge.
 *
 * The legacy `react-dnd` `useDrop` is replaced with a simple, robust
 * interaction: a single tap cycles to the next reward in the catalogue, and a
 * long-press clears the assigned reward. This keeps the interaction working
 * without the fragility of a full drag-and-drop pipeline.
 */
export function DroppablePremio({
  group,
  rewards,
  onAssignReward,
  onClearReward,
}: DroppablePremioProps) {
  // The group's reward id is read from the first task's persisted data.
  const currentRewardId = useMemo(() => {
    const first = group.tareas?.[0] as
      | (Task & { rewardId?: string })
      | undefined;
    return first?.rewardId ?? null;
  }, [group]);

  const currentReward = useMemo(
    () => rewards.find((r) => r.id === currentRewardId) ?? null,
    [rewards, currentRewardId],
  );

  const handlePress = () => {
    if (rewards.length === 0) return;
    const idx = currentReward
      ? rewards.findIndex((r) => r.id === currentReward.id)
      : -1;
    const next = rewards[(idx + 1) % rewards.length];
    onAssignReward(group.id, next.id);
  };

  const handleLongPress = () => {
    if (currentReward) onClearReward(group.id);
  };

  const backgroundColor = currentReward?.color ?? "rgba(217,181,255,0.25)";

  return (
    <Pressable
      style={[styles.badge, { backgroundColor }]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      hitSlop={8}
      accessibilityLabel={
        currentReward ? `Premio: ${currentReward.name}` : "Asignar premio"
      }
    >
      {currentReward && currentReward.url ? (
        <Image source={{ uri: currentReward.url }} style={styles.image} />
      ) : currentReward ? (
        <Text style={styles.initial} numberOfLines={1}>
          {currentReward.name.charAt(0).toUpperCase()}
        </Text>
      ) : (
        <Text style={styles.plus}>+</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.accent,
    overflow: "hidden",
    zIndex: 10,
  },
  image: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
  },
  initial: {
    color: theme.background,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: fonts.bodySemiBold,
  },
  plus: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
});
