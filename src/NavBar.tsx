import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  AimsIcon,
  CalendarIcon,
  MonitorIcon,
  RewardsIcon,
  SettingsIcon,
} from "./lib/iconos";
import { Vista } from "./lib/types";
import { theme } from "./lib/theme";

interface NavItemProps {
  label: string;
  icon: React.ReactElement;
  isActive: boolean;
  onPress: () => void;
  highlightColor?: string;
}

const NavItem: React.FC<NavItemProps> = ({
  label,
  icon,
  isActive,
  onPress,
  highlightColor,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [
      {
        flexDirection: "column",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
      },
      isActive && { backgroundColor: highlightColor || "#3b82f6" },
      pressed && { opacity: 0.7, backgroundColor: "#333" },
    ]}
  >
    <View style={{ padding: 4, width: 40, height: 40 }}>{icon}</View>
  </Pressable>
);

export interface NavItemData {
  label: string;
  view: Vista;
  icon: React.ReactElement;
  highlightColor?: string;
}

export const navigationItems: NavItemData[] = [
  {
    label: "Today",
    view: Vista.Tareas,
    icon: <CalendarIcon />,
    highlightColor: "rgba(139,195,74,0.5)",
  },
  {
    label: "Rewards",
    view: Vista.Premios,
    icon: <RewardsIcon />,
    highlightColor: "rgba(0,188,212,0.5)",
  },
  {
    label: "Aims",
    view: Vista.Proyectos,
    icon: <AimsIcon />,
    highlightColor: "rgba(156,39,176,0.5)",
  },
  {
    label: "Monitor",
    view: Vista.Dia_2,
    icon: <MonitorIcon />,
    highlightColor: "rgba(255,127,171,0.5)",
  },
  {
    label: "Settings",
    view: Vista.Settings,
    icon: <SettingsIcon />,
    highlightColor: "rgba(255,235,59,0.5)",
  },
];

interface NavBarProps {
  initialView?: Vista;
  onViewChange: (view: Vista) => void;
}

const NavBar: React.FC<NavBarProps> = ({
  initialView = Vista.Tareas,
  onViewChange,
}) => {
  const [currentView, setCurrentView] = useState<Vista>(initialView);
  const handleViewChange = (view: Vista) => {
    setCurrentView(view);
    onViewChange(view);
  };
  return (
    <View style={styles.navbar}>
      {navigationItems.map((item) => (
        <NavItem
          key={item.view}
          label={item.label}
          icon={item.icon}
          isActive={currentView === item.view}
          onPress={() => handleViewChange(item.view)}
          highlightColor={item.highlightColor}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 50,
    justifyContent: "space-between",
    backgroundColor: theme.black,
  },
});

export default NavBar;
