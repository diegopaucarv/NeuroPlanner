import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme } from "../lib/theme";

interface ChevronsProps {
  onPrev: () => void;
  onNext: () => void;
}

const Chevrons: React.FC<ChevronsProps> = ({ onPrev, onNext }) => (
  <View style={styles.container}>
    <Pressable
      onPress={onPrev}
      accessibilityRole="button"
      accessibilityLabel="Previous day"
      style={styles.chevron}
    >
      <Text style={styles.arrow}>‹</Text>
    </Pressable>
    <Pressable
      onPress={onNext}
      accessibilityRole="button"
      accessibilityLabel="Next day"
      style={styles.chevron}
    >
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    fontSize: 24,
    lineHeight: 28,
    color: theme.accent,
  },
});

export default Chevrons;
