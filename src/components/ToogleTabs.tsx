import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { TabDefinition } from "../lib/viewRegistry";
import { theme, fonts } from "../lib/theme";

interface ToggleTabsProps {
  tabs: TabDefinition[];
  activeView: string; // currently active viewMode
  onPress: (target: string) => void;
  backgroundColor?: string;
}

export const ToggleTabs: React.FC<ToggleTabsProps> = ({
  tabs,
  activeView,
  onPress,
  backgroundColor = theme.background,
}) => {
  if (tabs.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {tabs.map((tab) => {
        const isActive = activeView === tab.target;
        return (
          <Pressable
            key={tab.label}
            onPress={() => onPress(tab.target)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            {tab.icon ? <Text style={styles.icon}>{tab.icon}</Text> : null}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    borderRadius: 999,
    height: 40,
    paddingHorizontal: 4,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
  },
  tabActive: {
    backgroundColor: theme.accent,
  },
  label: {
    fontSize: 14,
    color: theme.text,
    fontWeight: "300",
    fontFamily: fonts.body,
  },
  labelActive: {
    fontWeight: "600",
    fontFamily: fonts.bodySemiBold,
    color: theme.background,
  },
  icon: {
    fontSize: 14,
  },
});
