/**
 * Pure geometry helpers for the day grid and the circular arc views.
 *
 * Ported from:
 * - `assets/calendario_antiguo/app/routes/Dia.tsx` (`GridWithGroups`):
 *   `getEventBounds`, `getGroupBounds`, `calculateEventStyle`.
 * - `assets/calendario_antiguo/app/routes/circulol.tsx`
 *   (`IndependentArcTimeline` / `InteractiveDonut`):
 *   `polarToCartesian`, `createArc`, `createTaskArcPath`, `angleToCoords`,
 *   `detectParallelTasks`, `adjustRadiiForParallelTasks`.
 *
 * ZERO React / React Native / DOM imports — pure math only.
 */

import { CalendarGrid, Task, TaskBlock } from "./types";
import { findGridRowForTime } from "./calendario";

// ---------------------------------------------------------------------------
// Day grid geometry (from Dia.tsx / GridWithGroups)
// ---------------------------------------------------------------------------

/**
 * Bounds of a single event in pixels, derived from the grid.
 * Returns `{ top, end, height }` where `top`/`end` are the grid row tops.
 */
export const getEventBounds = (
  event: Partial<Task>,
  grid: CalendarGrid,
): { top: number; end: number; height: number } => {
  // Avoid recursion by checking if the grid lookup is valid
  if (!event.start?.dateTime || !event.end?.dateTime) {
    return { top: 0, end: 0, height: 0 };
  }

  try {
    const startRow = findGridRowForTime(grid, event.start.dateTime);
    const endRow = findGridRowForTime(grid, event.end.dateTime);

    if (!startRow || !endRow) {
      return { top: 0, end: 0, height: 0 };
    }

    return {
      top: startRow.top,
      end: endRow.top,
      height: endRow.top - startRow.top,
    };
  } catch (error) {
    return { top: 0, end: 0, height: 0 };
  }
};

/**
 * Bounding rectangle of a group of overlapping events.
 * `top = min(tops) + 5`, `height = max(bottoms) - min(tops)`.
 */
export const getGroupBounds = (
  group: TaskBlock,
  grid: CalendarGrid,
): { top: number; height: number } => {
  const tops = group.tareas?.map((e) => getEventBounds(e, grid).top) || [];
  const bottoms = group.tareas?.map((e) => getEventBounds(e, grid).end) || [];
  return {
    top: Math.min(...tops) + 5,
    height: Math.max(...bottoms) - Math.min(...tops),
  };
};

/**
 * Divide the width among overlapping events ("columns" logic).
 * Returns percentage strings for `width` and `right`.
 */
export const calculateEventStyle = (
  event: Task,
  groupEvents: TaskBlock,
): { width: string; right: string } => {
  const index = groupEvents.tareas?.indexOf(event) || 0;
  const totalOverlapping = groupEvents.tareas?.length || 1;

  const width = `${100 / totalOverlapping}%`;
  const right = `${(totalOverlapping - index - 1) * (100 / totalOverlapping)}%`;

  return { width, right };
};

// ---------------------------------------------------------------------------
// Circular arc geometry (from circulol.tsx)
// ---------------------------------------------------------------------------

/**
 * Polar → Cartesian for the InteractiveDonut (center 100,100).
 */
export const polarToCartesian = (
  angle: number,
  radius: number,
): { x: number; y: number } => {
  const angleInRadians = ((angle - 90) * Math.PI) / 180.0;
  return {
    x: 100 + radius * Math.cos(angleInRadians),
    y: 100 + radius * Math.sin(angleInRadians),
  };
};

/**
 * SVG arc path string for the InteractiveDonut.
 */
export const createArc = (
  startAngle: number,
  endAngle: number,
  radius: number,
): string => {
  const start = polarToCartesian(startAngle, radius);
  const end = polarToCartesian(endAngle, radius);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

/**
 * Polar → Cartesian for the IndependentArcTimeline (center 250,250).
 */
export const angleToCoords = (
  angle: number,
  radius: number,
): { x: number; y: number } => {
  const radians = (angle - 90) * (Math.PI / 180);
  return {
    x: 250 + radius * Math.cos(radians),
    y: 250 + radius * Math.sin(radians),
  };
};

/**
 * SVG arc path string for a task in the IndependentArcTimeline.
 */
export const createTaskArcPath = (task: {
  startAngle: number;
  radius: number;
  endAngle: number;
}): string => {
  const start = angleToCoords(task.startAngle, task.radius);
  const end = angleToCoords(task.endAngle, task.radius);

  const arcLength = (task.endAngle - task.startAngle + 360) % 360;
  const largeArcFlag = arcLength > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${task.radius} ${task.radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

// ---------------------------------------------------------------------------
// Parallel task detection / radius adjustment (from circulol.tsx)
// ---------------------------------------------------------------------------

export interface ArcTask {
  id: number;
  startAngle: number;
  endAngle: number;
  color: string;
  radius: number;
}

/**
 * Group tasks that overlap angularly (`start < other.end && end > other.start`).
 */
export const detectParallelTasks = (
  tasks: ArcTask[],
): ArcTask[][] => {
  const parallelGroups: ArcTask[][] = [];

  tasks.forEach((task, index) => {
    const group = [task];

    tasks.forEach((otherTask, otherIndex) => {
      if (index !== otherIndex) {
        // Check for overlap
        const overlap =
          task.startAngle < otherTask.endAngle &&
          task.endAngle > otherTask.startAngle;

        if (overlap) {
          group.push(otherTask);
        }
      }
    });

    // Only add unique groups
    if (
      group.length > 1 &&
      !parallelGroups.some((existingGroup) =>
        existingGroup.every((t) => group.includes(t)),
      )
    ) {
      parallelGroups.push(group);
    }
  });

  return parallelGroups;
};

/**
 * Shift the radius of parallel tasks into concentric rings so they don't
 * overlap visually. `baseRadius`/`radiusVariation` default to the values used
 * by the IndependentArcTimeline (200 / 20).
 */
export const adjustRadiiForParallelTasks = (
  tasks: ArcTask[],
  baseRadius: number = 200,
  radiusVariation: number = 20,
): ArcTask[] => {
  const parallelGroups = detectParallelTasks(tasks);

  return tasks.map((task) => {
    // Find the group this task belongs to
    const taskGroup = parallelGroups.find((group) =>
      group.some((t) => t.id === task.id),
    );

    // If task is in a parallel group, adjust its radius
    if (taskGroup && taskGroup.length > 1) {
      const groupIndex = taskGroup.findIndex((t) => t.id === task.id);
      const radiusOffset =
        (groupIndex - (taskGroup.length - 1) / 2) *
        (radiusVariation / (taskGroup.length - 1));

      return {
        ...task,
        radius: baseRadius + radiusOffset,
      };
    }

    // If task is independent, keep original radius
    return {
      ...task,
      radius: baseRadius,
    };
  });
};
