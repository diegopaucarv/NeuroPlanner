import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Vista } from "../lib/types";
import { navigationItems } from "../NavBar";
import { theme, fonts } from "../lib/theme";
import Chevrons from "./Chevrons";

interface HeaderProps {
  currentActiveView?: Vista;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  dateLabel?: string;
  /** Overrides the title derived from the active nav item (e.g. "This Week"). */
  title?: string;
  /** Called when the title/subtitle block is pressed (cycles the view mode). */
  onTitlePress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentActiveView,
  onPrevDay,
  onNextDay,
  dateLabel,
  title,
  onTitlePress,
}) => {
  const activeItem = navigationItems.find(
    (item) => item.view === currentActiveView,
  );
  const resolvedTitle = title ?? activeItem?.label ?? "Tasks";
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onTitlePress}
        accessibilityRole="button"
        accessibilityLabel={`${resolvedTitle} — switch view`}
        style={({ pressed }) => [styles.titleBlock, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.title}>{resolvedTitle}</Text>
        {dateLabel ? <Text style={styles.date}>{dateLabel}</Text> : null}
      </Pressable>
      {onPrevDay && onNextDay ? (
        <Chevrons onPrev={onPrevDay} onNext={onNextDay} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.background,
  },
  titleBlock: {
    flexDirection: "column",
  },
  title: {
    fontSize: 30,
    fontWeight: "300",
    fontFamily: fonts.heading,
    color: theme.text,
  },
  date: {
    fontSize: 15,
    fontWeight: "300",
    fontFamily: fonts.heading,
    color: theme.accent,
  },
});

export default Header;
