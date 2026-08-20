import React from "react";
import { View, Text } from "react-native";
import { Vista } from "./types";
import { coloresui } from "../components/Colores";
import { TaskList } from "../components/TaskList";
import { DiaCalendario } from "../components/DiaCalendario";
import { WeekTaskList } from "../components/WeekTaskList";

export interface ViewComponentProps {
  accessToken?: string;
  changeView: (view: Vista) => void;
  viewMode: string;
  setViewMode: (mode: string) => void;
  events?: any[];
  currentDate?: Date;
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
      { label: "T", icon: "", target: "day", viewMode: "day" },
      { label: "W", icon: "", target: "week", viewMode: "week" },
      {
        label: "S",
        icon: "",
        target: "schedule",
        viewMode: "schedule",
      },
    ],
    color: coloresui[0].Tareas,
    component: ({ accessToken, viewMode, currentDate }: ViewComponentProps) => {
      if (!accessToken) return null;
      if (viewMode === "schedule") return <DiaCalendario />;
      if (viewMode === "week") return <WeekTaskList currentDate={currentDate} />;
      return <TaskList />;
    },
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
  [Vista.Dia_2]: {
    tabs: [],
    color: "#ff9fc0",
    component: () => <Soon name="ArcTimeline" />,
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
