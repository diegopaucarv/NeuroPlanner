import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useView } from "./lib/ViewContext";
import { viewRegistry } from "./lib/viewRegistry";
import Header from "./components/Header";
import { theme } from "./lib/theme";
import { format, addDays, subDays, addWeeks, subWeeks } from "date-fns";
import { getWeekRangeLabel } from "./components/WeekTaskList";

interface MainProps {
  accessToken?: string;
}

/** Order the title button cycles through: day → schedule → week → day. */
const VIEW_CYCLE = ["day", "schedule", "week"] as const;

const Main: React.FC<MainProps> = ({ accessToken }) => {
  const { currentView, changeView } = useView();
  const viewConfig = viewRegistry[currentView];
  const RenderComponent = viewConfig?.component;
  const [viewMode, setViewMode] = useState<string>(
    viewConfig?.tabs[0]?.viewMode ?? "day",
  );
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const isWeek = viewMode === "week";
  const dateLabel = isWeek
    ? getWeekRangeLabel(currentDate)
    : format(currentDate, "EEE, MMM d");
  const title =
    viewMode === "week"
      ? "Week"
      : viewMode === "schedule"
        ? "Schedule"
        : undefined;

  const handleTitlePress = () => {
    setViewMode((m) => {
      const idx = VIEW_CYCLE.indexOf(m as (typeof VIEW_CYCLE)[number]);
      return VIEW_CYCLE[(idx + 1) % VIEW_CYCLE.length];
    });
  };

  return (
    <View style={styles.root}>
      <Header
        currentActiveView={currentView}
        title={title}
        dateLabel={dateLabel}
        onTitlePress={handleTitlePress}
        onPrevDay={() =>
          setCurrentDate((d) => (isWeek ? subWeeks(d, 1) : subDays(d, 1)))
        }
        onNextDay={() =>
          setCurrentDate((d) => (isWeek ? addWeeks(d, 1) : addDays(d, 1)))
        }
      />
      <View style={styles.content}>
        {RenderComponent?.({
          accessToken,
          changeView,
          viewMode,
          setViewMode,
          currentDate,
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.black },
  content: { flex: 1, overflow: "hidden" },
});

export default Main;
