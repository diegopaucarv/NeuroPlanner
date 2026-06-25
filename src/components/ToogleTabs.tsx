import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { TabDefinition } from "../lib/viewRegistry";

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
  backgroundColor = "rgba(200,200,200,0.4)",
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
    marginHorizontal: 20,
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
    backgroundColor: "#fff",
    // subtle shadow so the pill "lifts"
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: "rgba(0,0,0,0.7)",
    fontWeight: "300",
  },
  labelActive: {
    fontWeight: "600",
    color: "#000",
  },
  icon: {
    fontSize: 14,
  },
});
