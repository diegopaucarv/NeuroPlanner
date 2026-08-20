import React, { useState, cloneElement } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  AimsIcon,
  CalendarIcon,
  MonitorIcon,
  RewardsIcon,
  SettingsIcon,
} from "./lib/iconos";
import { Vista } from "./lib/types";
import { theme, fonts } from "./lib/theme";

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
}) => {
  // Active item: lavender pill with black icon + text (mockup's "Hoy" tab).
  // Inactive: transparent pill with light-gray icon + text.
  const color = isActive ? theme.background : theme.text;
  const coloredIcon = cloneElement(
    icon as React.ReactElement<{ fill?: string; stroke?: string }>,
    { fill: color, stroke: color },
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.item,
        isActive && styles.itemActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.iconWrap}>{coloredIcon}</View>
      <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
};

export interface NavItemData {
  label: string;
  view: Vista;
  icon: React.ReactElement;
  highlightColor?: string;
}

export const navigationItems: NavItemData[] = [
  {
    label: "Tasks",
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
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    backgroundColor: theme.background,
  },
  item: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: 61,
    height: 61,
    gap: 5,
    borderRadius: 12,
  },
  itemActive: {
    backgroundColor: "rgba(217, 181, 255, 0.85)",
  },
  iconWrap: {
    width: 23,
    height: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.body,
    fontWeight: "300",
    color: theme.text,
    marginTop: 2,
  },
  labelActive: {
    color: theme.background,
    fontFamily: fonts.bodySemiBold,
    fontWeight: "600",
    fontSize: 14,
  },
});

export default NavBar;
