import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Vista } from "../lib/types";
import { navigationItems } from "../NavBar";
import { theme } from "../lib/theme";

interface HeaderProps {
  currentActiveView: Vista;
}

const Header: React.FC<HeaderProps> = ({ currentActiveView }) => {
  const activeItem = navigationItems.find(
    (item) => item.view === currentActiveView,
  );
  const accentColor = activeItem?.highlightColor ?? "#2563eb";
  return (
    <View style={styles.header}>
      <View style={[styles.bar, { backgroundColor: accentColor }]} />
      <Text style={styles.label}>{activeItem?.label ?? "App"}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    backgroundColor: theme.black,
  },
  bar: { width: 6, height: 35, borderRadius: 3 },
  label: { fontSize: 28, fontWeight: "700", color: "#f0f0f0" },
});

export default Header;
