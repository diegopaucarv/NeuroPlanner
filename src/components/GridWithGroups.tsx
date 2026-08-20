import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  DimensionValue,
} from "react-native";
import Svg, { Line } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import * as Crypto from "expo-crypto";
import {
  createCalendarGrid,
  detectOverlaps,
  findTimeForGridRow,
  getTailwindColor,
} from "../lib/calendario";
import {
  calculateEventStyle,
  getEventBounds,
  getGroupBounds,
} from "../lib/geometry";
import { theme, fonts } from "../lib/theme";
import type { Task } from "../lib/types";
import type { ObjectiveEntity } from "../db/repositories";
import { useObjectiveStore } from "../stores";
import type { RewardRow } from "../db/repositories";
import { EventCard, ResizeEdge } from "./EventCard";
import { DroppablePremio } from "./DroppablePremio";

const HOUR_HEIGHT = 40;
const GRID_HEIGHT = 24 * HOUR_HEIGHT;

/**
 * Map a Google colorId to a hex color for RN. `getTailwindColor` returns a
 * Tailwind class name (a web leftover); translate those classes to hex so the
 * cards get real colors in React Native.
 */
const TAILWIND_HEX: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-green-500": "#22c55e",
  "bg-red-500": "#ef4444",
  "bg-yellow-500": "#eab308",
  "bg-purple-500": "#a855f7",
  "bg-pink-500": "#ec4899",
  "bg-indigo-500": "#6366f1",
  "bg-teal-500": "#14b8a6",
  "bg-cyan-500": "#06b6d4",
  "bg-amber-500": "#f59e0b",
  "bg-lime-500": "#84cc16",
  "bg-blue-200": "#bfdbfe",
  "bg-green-200": "#bbf7d0",
};

/** Resolve an event's background color, falling back to the theme accent. */
const eventColor = (colorId?: string): string =>
  TAILWIND_HEX[getTailwindColor(colorId)] ?? theme.accent;

/**
 * Cast an `ObjectiveEntity` to the `Task` shape used by `detectOverlaps` /
 * `getEventBounds` / `calculateEventStyle`. The task fields live in
 * `entity.data` (JSON) as `summary`, `start`, `end`, `colorId`.
 */
const toTask = (entity: ObjectiveEntity): Task => {
  const data = entity.data as unknown as Task & { rewardId?: string };
  return {
    id: entity.id,
    summary: data.summary ?? "Untitled",
    start: data.start,
    end: data.end,
    colorId: data.colorId,
    isEvent: data.isEvent ?? false,
    reminders: data.reminders ?? { useDefault: true },
    type: data.type ?? "task",
    rewardId: data.rewardId,
  } as Task;
};

interface GhostState {
  id: string | null;
  summary: string;
  color: string;
  width: string;
  right: string;
  isNew: boolean;
}

interface GridWithGroupsProps {
  /** Tasks for the day. */
  tasks: ObjectiveEntity[];
  /** The day being displayed. */
  day: Date;
  /** Catalogue of rewards available to assign to event groups. */
  rewards: RewardRow[];
  /** Ref to the parent ScrollView, so gestures coordinate with scrolling. */
  scrollRef: React.RefObject<any>;
}

/**
 * Day grid: 24 hour lines (via react-native-svg), hour labels (00–23) in a
 * left gutter, an accent divider line, and event cards. Events are draggable
 * (move) and resizable (top/bottom 2px strips) with 10px snap; a tap/drag on
 * empty grid space creates a new event. Positions live in shared values during
 * a drag (no re-render per frame) and are persisted on release.
 */
export function GridWithGroups({
  tasks,
  day,
  rewards,
  scrollRef,
}: GridWithGroupsProps) {
  const grid = useMemo(() => createCalendarGrid(HOUR_HEIGHT), []);
  const create = useObjectiveStore((s) => s.create);
  const update = useObjectiveStore((s) => s.update);

  // Hour lines sit at the top of each hour (the grid rows at minute 00).
  const hourLines = useMemo(
    () => grid.filter((row) => row.startTime.endsWith(":00")),
    [grid],
  );

  const [containerHeight, setContainerHeight] = useState(GRID_HEIGHT);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerHeight(e.nativeEvent.layout.height);
  };

  const nowTop =
    day.getHours() * HOUR_HEIGHT + (day.getMinutes() / 60) * HOUR_HEIGHT;

  // Only tasks with valid start/end dateTimes can be positioned on the grid.
  const validTasks = useMemo(
    () =>
      tasks
        .map(toTask)
        .filter((t) => t.start?.dateTime && t.end?.dateTime),
    [tasks],
  );

  // Group overlapping events so side-by-side cards share the width.
  const eventGroups = useMemo(
    () => detectOverlaps(validTasks),
    [validTasks],
  );

  // -------------------------------------------------------------------------
  // Drag state — positions live on the UI thread in shared values.
  // -------------------------------------------------------------------------
  const dragTop = useSharedValue(0);
  const dragHeight = useSharedValue(0);
  const dragEdge = useSharedValue<ResizeEdge | null>(null);
  const startTop = useSharedValue(0);
  const startHeight = useSharedValue(0);
  const startY = useSharedValue(0);
  const activeId = useSharedValue<string | null>(null);
  const isNew = useSharedValue(false);
  const dragging = useSharedValue(false);
  const summary = useSharedValue("");
  const color = useSharedValue("");
  const width = useSharedValue("100%");
  const right = useSharedValue("0%");

  // Ghost card content. Set once when a drag begins (via runOnJS) so the ghost
  // renders with the right text/color; its position is driven by shared values.
  const [ghost, setGhost] = useState<GhostState | null>(null);

  const userTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  // Append the user's UTC offset to a `YYYY-MM-DDTHH:MM:00` string. Avoids
  // `toISOString()` (UTC) so the persisted times keep the local wall-clock.
  const toLocalISO = (dateTime: string): string => {
    const offset = -day.getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const abs = Math.abs(offset);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dateTime}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  };

  // Commit (or discard) the active drag. Runs on the JS thread via runOnJS.
  const commitDrag = () => {
    const top = dragTop.value;
    const height = dragHeight.value;
    const id = activeId.value;
    const isCreating = isNew.value;
    const eventSummary = summary.value;

    // Discard if the event is smaller than 2 rows (20px).
    if (height < 20) {
      setGhost(null);
      dragging.value = false;
      return;
    }

    const startRow = findTimeForGridRow(grid, top, day);
    const endRow = findTimeForGridRow(grid, top + height, day);
    if (!startRow || !endRow) {
      setGhost(null);
      dragging.value = false;
      return;
    }

    const startDateTime = toLocalISO(startRow.startDateTime);
    const endDateTime = toLocalISO(endRow.startDateTime);

    if (isCreating) {
      create({
        id: Crypto.randomUUID(),
        type: "Task",
        data: {
          summary: eventSummary,
          isEvent: true,
          type: "event",
          reminders: { useDefault: true },
          start: { dateTime: startDateTime, timeZone: userTimeZone },
          end: { dateTime: endDateTime, timeZone: userTimeZone },
        },
      });
    } else if (id) {
      update(id, {
        start: { dateTime: startDateTime, timeZone: userTimeZone },
        end: { dateTime: endDateTime, timeZone: userTimeZone },
      });
    }

    setGhost(null);
    dragging.value = false;
  };

  // Called (via runOnJS) when an existing card's resize strip begins.
  const onStartResize = (edge: ResizeEdge) => {
    dragEdge.value = edge;
    dragging.value = true;
    setGhost({
      id: activeId.value,
      summary: summary.value,
      color: color.value,
      width: width.value,
      right: right.value,
      isNew: isNew.value,
    });
  };

  // Called (via runOnJS) when an existing card's body begins a move.
  const onStartMove = () => {
    dragEdge.value = null;
    dragging.value = true;
    setGhost({
      id: activeId.value,
      summary: summary.value,
      color: color.value,
      width: width.value,
      right: right.value,
      isNew: isNew.value,
    });
  };

  // Create gesture on the empty grid layer: long-press then drag to make a new
  // event. `activateAfterLongPress` lets the ScrollView handle normal swipes,
  // so scrolling stays reliable and only a deliberate long-press starts a drag.
  const createPan = Gesture.Pan()
    .activateAfterLongPress(200)
    .simultaneousWithExternalGesture(scrollRef)
    .onBegin((e) => {
      const y = e.y;
      const snappedY = Math.floor(y / 10) * 10;
      startTop.value = snappedY;
      startHeight.value = 10;
      startY.value = snappedY;
      dragTop.value = snappedY;
      dragHeight.value = 10;
      dragEdge.value = null;
      isNew.value = true;
      activeId.value = null;
      dragging.value = true;
      summary.value = "Nuevo evento";
      color.value = theme.accent;
      width.value = "100%";
      right.value = "0%";
      runOnJS(setGhost)({
        id: null,
        summary: "Nuevo evento",
        color: theme.accent,
        width: "100%",
        right: "0%",
        isNew: true,
      });
    })
    .onUpdate((e) => {
      const currentY = e.y;
      const snappedY = Math.round(currentY / 10) * 10;
      // The first move decides the resize direction (top/bottom).
      if (dragEdge.value === null) {
        if (snappedY < startY.value - 10) dragEdge.value = "top";
        else if (snappedY > startY.value + 10) dragEdge.value = "bottom";
        else return;
      }
      let newTop = dragTop.value;
      let newHeight = dragHeight.value;
      if (dragEdge.value === "top") {
        const deltaY = Math.round((currentY - startTop.value) / 10) * 10;
        newTop = Math.max(
          0,
          Math.min(
            startTop.value + deltaY,
            startTop.value + startHeight.value - 10,
          ),
        );
        newHeight = startHeight.value - (newTop - startTop.value);
      } else if (dragEdge.value === "bottom") {
        newHeight = Math.max(
          10,
          Math.round((currentY - startTop.value) / 10) * 10,
        );
      }
      newHeight = Math.min(newHeight, GRID_HEIGHT - newTop);
      dragTop.value = newTop;
      dragHeight.value = newHeight;
    })
    .onFinalize(() => {
      runOnJS(commitDrag)();
    });

  const ghostStyle = useAnimatedStyle(() => ({
    top: dragTop.value,
    height: dragHeight.value,
    opacity: dragging.value ? 1 : 0,
  }));

  // Persist a reward onto every task in the group so the whole block shares it.
  const handleAssignReward = (groupId: string, rewardId: string) => {
    const group = eventGroups.find((g) => g.id === groupId);
    group?.tareas?.forEach((t) => update(t.id, { rewardId }));
  };

  const handleClearReward = (groupId: string) => {
    const group = eventGroups.find((g) => g.id === groupId);
    group?.tareas?.forEach((t) => update(t.id, { rewardId: null }));
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.gutter}>
        {hourLines.map((row) => (
          <Text key={row.startTime} style={[styles.hourLabel, { top: row.top }]}>
            {row.startTime.slice(0, 2)}
          </Text>
        ))}
      </View>
      <View style={styles.gridArea}>
        <Svg height={containerHeight} width="100%" pointerEvents="none">
          {hourLines.map((row) => (
            <Line
              key={row.startTime}
              x1={0}
              y1={row.top}
              x2="100%"
              y2={row.top}
              stroke="rgba(204,202,202,0.15)"
              strokeWidth={1}
            />
          ))}
        </Svg>
        {/* Empty layer behind the cards: tap/drag here to create an event. */}
        <GestureDetector gesture={createPan}>
          <View style={StyleSheet.absoluteFill} />
        </GestureDetector>
        <View style={[styles.nowLine, { top: nowTop }]} pointerEvents="none" />
        {eventGroups.map((group) => {
          const groupBounds = getGroupBounds(group, grid);
          return (
            <View
              key={group.id}
              style={[
                styles.eventGroup,
                { top: groupBounds.top, height: groupBounds.height },
              ]}
            >
              {(group.tareas ?? []).map((event) => {
                const bounds = getEventBounds(event, grid);
                const style = calculateEventStyle(event, group);
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    top={bounds.top - groupBounds.top}
                    gridTop={bounds.top}
                    height={bounds.height}
                    width={style.width}
                    right={style.right}
                    color={eventColor(event.colorId)}
                    dragTop={dragTop}
                    dragHeight={dragHeight}
                    startTop={startTop}
                    startHeight={startHeight}
                    activeId={activeId}
                    isNew={isNew}
                    summary={summary}
                    colorSV={color}
                    widthSV={width}
                    rightSV={right}
                    onStartResize={onStartResize}
                    onStartMove={onStartMove}
                    onCommit={commitDrag}
                    scrollRef={scrollRef}
                    hidden={ghost?.id === event.id}
                  />
                );
              })}
              <DroppablePremio
                group={group}
                rewards={rewards}
                onAssignReward={handleAssignReward}
                onClearReward={handleClearReward}
              />
            </View>
          );
        })}
        {ghost && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ghost,
              ghostStyle,
              {
                width: ghost.width as DimensionValue,
                right: ghost.right as DimensionValue,
                backgroundColor: ghost.color,
              },
            ]}
          >
            <Text style={styles.ghostTitle} numberOfLines={2}>
              {ghost.summary}
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    height: GRID_HEIGHT,
  },
  gutter: {
    width: 44,
    height: GRID_HEIGHT,
    position: "relative",
  },
  hourLabel: {
    position: "absolute",
    right: 8,
    color: "rgba(204,202,202,0.5)",
    fontSize: 8,
    fontWeight: "300",
    fontFamily: fonts.body,
    textAlign: "right",
  },
  gridArea: {
    flex: 1,
    height: GRID_HEIGHT,
    position: "relative",
  },
  nowLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.accent,
  },
  eventGroup: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  ghost: {
    position: "absolute",
    left: 0,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: "hidden",
  },
  ghostTitle: {
    color: theme.background,
    fontSize: 11,
    fontWeight: "600",
    fontFamily: fonts.bodySemiBold,
  },
});
