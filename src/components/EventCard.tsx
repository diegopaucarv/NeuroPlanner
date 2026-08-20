import React from "react";
import { View, Text, StyleSheet, DimensionValue } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, SharedValue } from "react-native-reanimated";
import { formatTime } from "../lib/calendario";
import { theme, fonts } from "../lib/theme";
import type { Task } from "../lib/types";

const HOUR_HEIGHT = 40;
const GRID_HEIGHT = 24 * HOUR_HEIGHT;

export type ResizeEdge = "top" | "bottom";

interface EventCardProps {
  /** The task/event data being rendered. */
  event: Task;
  /** Top offset in px within the grid. */
  top: number;
  /** Card height in px. */
  height: number;
  /** Card width as a percentage string (e.g. "50%"). */
  width: string;
  /** Right offset as a percentage string (e.g. "25%"). */
  right: string;
  /** Background color (hex). Falls back to the theme accent. */
  color: string;
  /** Absolute top of the card within the grid (used as the drag anchor). */
  gridTop: number;

  // Shared values driving the active drag (from GridWithGroups). Positions
  // live on the UI thread so the worklets never re-render per frame.
  dragTop: SharedValue<number>;
  dragHeight: SharedValue<number>;
  startTop: SharedValue<number>;
  startHeight: SharedValue<number>;
  activeId: SharedValue<string | null>;
  isNew: SharedValue<boolean>;
  summary: SharedValue<string>;
  colorSV: SharedValue<string>;
  widthSV: SharedValue<string>;
  rightSV: SharedValue<string>;

  /** Called (via runOnJS) when a resize strip begins. */
  onStartResize: (edge: ResizeEdge) => void;
  /** Called (via runOnJS) when the card body begins a move. */
  onStartMove: () => void;
  /** Called (via runOnJS) when a drag ends — commit or discard. */
  onCommit: () => void;
  /** Ref to the parent ScrollView, so gestures coordinate with scrolling. */
  scrollRef: React.RefObject<any>;
  /** Hide the original card while it is being dragged (ghost takes over). */
  hidden?: boolean;
}

/**
 * A single positioned event card on the day grid. Rounded, absolutely
 * positioned, showing the task title and (when present) its start time.
 *
 * The card body is draggable (move) and the top/bottom 2px strips resize the
 * event. Anchors are copied into shared values in `onBegin`; `onUpdate` snaps
 * to 10px and writes only to shared values (no re-render per frame); the
 * commit/discard decision is delegated to `GridWithGroups` via `onCommit`.
 */
export function EventCard({
  event,
  top,
  height,
  width,
  right,
  color,
  gridTop,
  dragTop,
  dragHeight,
  startTop,
  startHeight,
  activeId,
  isNew,
  summary,
  colorSV,
  widthSV,
  rightSV,
  onStartResize,
  onStartMove,
  onCommit,
  scrollRef,
  hidden,
}: EventCardProps) {
  const backgroundColor = color || theme.accent;
  const start = event.start?.dateTime;

  // Copy the current anchors + card content into shared values so the worklets
  // never close over React state. Runs on the UI thread in `onBegin`.
  const anchor = () => {
    "worklet";
    startTop.value = gridTop;
    startHeight.value = height;
    dragTop.value = gridTop;
    dragHeight.value = height;
    activeId.value = event.id;
    isNew.value = false;
    summary.value = event.summary || "Untitled";
    colorSV.value = backgroundColor;
    widthSV.value = width;
    rightSV.value = right;
  };

  // Move the whole card (body pan). Long-press to pick up, then drag. This lets
  // the ScrollView handle normal swipes so scrolling stays reliable.
  const movePan = Gesture.Pan()
    .activateAfterLongPress(200)
    .simultaneousWithExternalGesture(scrollRef)
    .onBegin(() => {
      anchor();
      runOnJS(onStartMove)();
    })
    .onUpdate((e) => {
      const deltaY = Math.round(e.translationY / 10) * 10;
      const newTop = Math.max(
        0,
        Math.min(startTop.value + deltaY, GRID_HEIGHT - startHeight.value),
      );
      dragTop.value = newTop;
      dragHeight.value = startHeight.value;
    })
    .onFinalize(() => {
      runOnJS(onCommit)();
    });

  // Resize from the top edge. Long-press the edge, then drag.
  const resizeTopPan = Gesture.Pan()
    .activateAfterLongPress(200)
    .simultaneousWithExternalGesture(scrollRef)
    .onBegin(() => {
      anchor();
      runOnJS(onStartResize)("top");
    })
    .onUpdate((e) => {
      const currentY = gridTop + e.translationY;
      const deltaY = Math.round((currentY - startTop.value) / 10) * 10;
      const newTop = Math.max(
        0,
        Math.min(
          startTop.value + deltaY,
          startTop.value + startHeight.value - 10,
        ),
      );
      const newHeight = startHeight.value - (newTop - startTop.value);
      dragTop.value = newTop;
      dragHeight.value = Math.min(newHeight, GRID_HEIGHT - newTop);
    })
    .onFinalize(() => {
      runOnJS(onCommit)();
    });

  // Resize from the bottom edge. Long-press the edge, then drag.
  const resizeBottomPan = Gesture.Pan()
    .activateAfterLongPress(200)
    .simultaneousWithExternalGesture(scrollRef)
    .onBegin(() => {
      anchor();
      runOnJS(onStartResize)("bottom");
    })
    .onUpdate((e) => {
      const currentY = gridTop + e.translationY;
      const newHeight = Math.max(
        10,
        Math.round((currentY - startTop.value) / 10) * 10,
      );
      dragHeight.value = Math.min(newHeight, GRID_HEIGHT - startTop.value);
    })
    .onFinalize(() => {
      runOnJS(onCommit)();
    });

  return (
    <View
      style={[
        styles.card,
        {
          top,
          height,
          width: width as DimensionValue,
          right: right as DimensionValue,
          backgroundColor,
          opacity: hidden ? 0 : 1,
        },
      ]}
    >
      <GestureDetector gesture={movePan}>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {event.summary || "Untitled"}
          </Text>
          {start ? (
            <Text style={styles.time} numberOfLines={1}>
              {formatTime(start)}
            </Text>
          ) : null}
        </View>
      </GestureDetector>
      <GestureDetector gesture={resizeTopPan}>
        <View
          style={[styles.resizeStrip, styles.resizeTop]}
          hitSlop={{ top: 8, bottom: 8 }}
        />
      </GestureDetector>
      <GestureDetector gesture={resizeBottomPan}>
        <View
          style={[styles.resizeStrip, styles.resizeBottom]}
          hitSlop={{ top: 8, bottom: 8 }}
        />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: "hidden",
  },
  body: {
    flex: 1,
  },
  title: {
    color: theme.background,
    fontSize: 11,
    fontWeight: "600",
    fontFamily: fonts.bodySemiBold,
  },
  time: {
    color: theme.background,
    fontSize: 9,
    fontWeight: "400",
    fontFamily: fonts.body,
    opacity: 0.8,
    marginTop: 2,
  },
  resizeStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    zIndex: 1,
  },
  resizeTop: {
    top: 0,
  },
  resizeBottom: {
    bottom: 0,
  },
});
