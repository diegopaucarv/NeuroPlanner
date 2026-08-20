import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TIME_DIVIDERS } from "../lib/types";
import { theme, fonts } from "../lib/theme";

interface TimeDividerProps {
  /** Pixel height of one hour slot. Defaults to 40. */
  hourHeight?: number;
  /** Total height of the day grid (24 * hourHeight). */
  gridHeight: number;
}

/**
 * Renders the moment dividers (Morning / Noon / Evening / Night) as a
 * vertical column of accent labels, each positioned at its hour slot.
 */
export function TimeDivider({ hourHeight = 40, gridHeight }: TimeDividerProps) {
  return (
    <View style={[styles.container, { height: gridHeight }]}>
      {TIME_DIVIDERS.map((divider) => (
        <Text
          key={divider.label}
          style={[styles.label, { top: divider.hour * hourHeight }]}
        >
          {divider.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 96,
    position: "relative",
  },
  label: {
    position: "absolute",
    right: 12,
    color: theme.accent,
    fontSize: 13,
    fontWeight: "300",
    fontFamily: fonts.body,
    textAlign: "right",
  },
});
