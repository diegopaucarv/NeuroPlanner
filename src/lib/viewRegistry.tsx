import React from "react";
import { View, Text } from "react-native";
import { Vista } from "./types";
import { coloresui } from "../components/Colores";
import { theme } from "./theme";

export interface ViewComponentProps {
  accessToken?: string;
  changeView: (view: Vista) => void;
  viewMode: string;
  setViewMode: (mode: string) => void;
  events?: any[];
}

export interface TabDefinition {
  label: string;
  icon: string;
  target: string;
  viewMode: string;
}

export interface ViewDefinition {
  tabs: TabDefinition[];
  color: string;
  component: (props: ViewComponentProps) => React.ReactElement | null;
}

const Soon = ({ name }: { name: string }) => (
  <View
    style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      opacity: 0.4,
    }}
  >
    <Text style={{ fontSize: 16, color: "#555", fontStyle: "italic" }}>
      {name}
    </Text>
  </View>
);

export const viewRegistry: Record<Vista, ViewDefinition> = {
  [Vista.Tareas]: {
    tabs: [
      { label: "Tasks", icon: "✅", target: "day", viewMode: "day" },
      { label: "Week", icon: "📅", target: "week", viewMode: "week" },
      {
        label: "Calendar",
        icon: "🗓",
        target: "schedule",
        viewMode: "schedule",
      },
    ],
    color: coloresui[0].Tareas,
    component: ({ accessToken }: ViewComponentProps) =>
      accessToken ? <Text>Tareas!</Text> : null,
  },
  [Vista.Proyectos]: {
    tabs: [
      { label: "List", icon: "📋", target: "list", viewMode: "list" },
      {
        label: "Sunburst",
        icon: "🌟",
        target: "sunburst",
        viewMode: "sunburst",
      },
      {
        label: "Schedule",
        icon: "📆",
        target: "schedule",
        viewMode: "schedule",
      },
    ],
    color: coloresui[0].Metas,
    component: () => <Soon name="ProjectsPage" />,
  },
  [Vista.Premios]: {
    tabs: [],
    color: coloresui[0].Premios,
    component: () => <Soon name="Premios" />,
  },
  [Vista.Dia_1]: {
    tabs: [],
    color: "#a1c4fd",
    component: ({ accessToken }: ViewComponentProps) =>
      accessToken ? <Soon name="DiaCalendario" /> : null,
  },
  [Vista.Dia_2]: {
    tabs: [],
    color: "#ff9fc0",
    component: () => <Soon name="ArcTimeline" />,
  },
  [Vista.Semanas]: {
    tabs: [],
    color: "#dcedc8",
    component: () => <Soon name="Semanas" />,
  },
  [Vista.Meses]: {
    tabs: [],
    color: "#dcedc8",
    component: () => <Soon name="Meses" />,
  },
  [Vista.Dias]: {
    tabs: [],
    color: "#dcedc8",
    component: () => <Soon name="Dias" />,
  },
  [Vista.Settings]: {
    tabs: [],
    color: "#fff9c4",
    component: () => {
      const { ProfileScreen } = require("../screens/ProfileScreen");
      return <ProfileScreen />;
    },
  },
};
