import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useView } from "./lib/ViewContext";
import { viewRegistry } from "./lib/viewRegistry";
import Header from "./components/Header";
import { ToggleTabs } from "./components/ToogleTabs";
import { theme } from "./lib/theme";

interface MainProps {
  accessToken?: string;
}

const Main: React.FC<MainProps> = ({ accessToken }) => {
  const { currentView, changeView } = useView();
  const viewConfig = viewRegistry[currentView];
  const RenderComponent = viewConfig?.component;
  const [viewMode, setViewMode] = useState<string>(
    viewConfig?.tabs[0]?.viewMode ?? "day",
  );
  const handleViewModeChange = (target: string) => {
    if (viewConfig.tabs.some((t) => t.target === target)) setViewMode(target);
  };
  return (
    <View style={styles.root}>
      <Header currentActiveView={currentView} />
      <ToggleTabs
        tabs={viewConfig?.tabs ?? []}
        activeView={viewMode}
        onPress={handleViewModeChange}
        backgroundColor={viewConfig?.color}
      />
      <View style={styles.content}>
        {RenderComponent?.({ accessToken, changeView, viewMode, setViewMode })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.black },
  content: { flex: 1, overflow: "hidden" },
});

export default Main;
