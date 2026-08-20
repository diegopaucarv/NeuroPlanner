/**
 * Pure, framework-agnostic calendar algorithmia.
 *
 * Ported from `src/lib/calendario.tsx` (and the legacy `calendario_antiguo`
 * sources) into a `.ts` module with ZERO React / React Native / DOM imports.
 * These functions are testable with Jest and reusable on both web and RN.
 *
 * Guardrails honored:
 * - No `react`, `react-native`, `document`, or `window` imports.
 * - px↔time conversions are parametrized with a `day: Date` argument
 *   (default `new Date()`) instead of assuming "today".
 * - Dates are built with an explicit user-timezone offset instead of relying
 *   on `toISOString()` (which is UTC-based).
 * - `crypto.randomUUID()` is NOT used (it does not exist in RN); the ported
 *   functions here generate ids via `Math.random()` exactly as the source did.
 */

import { parseISO } from "date-fns";
import { format } from "date-fns-tz";
import {
  CalendarGrid,
  GridRow,
  Task,
  TaskBlock,
  GoogleColorsResponse,
} from "./types";

// ---------------------------------------------------------------------------
// Contracts (symbols owned by other modules — not ported here)
// ---------------------------------------------------------------------------

/**
 * Contract: `fetchGoogleColors(accessToken: string): Promise<GoogleColorsResponse>`
 * Owned by `src/lib/calendario.tsx` (uses `fetch`). Not ported here.
 */
declare function fetchGoogleColors(
  accessToken: string,
): Promise<GoogleColorsResponse>;

// ---------------------------------------------------------------------------
// Timezone + local date helpers (avoid UTC-based toISOString())
// ---------------------------------------------------------------------------

const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Format a Date as a local ISO datetime string with the user's UTC offset. */
const toLocalISOString = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
};

/** Format a Date as a local `YYYY-MM-DD` string. */
const toLocalDateString = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}min`;
  }
};

export const formatTime = (tiempo: string): string => {
  return format(parseISO(tiempo), "HH:mm");
};

export function formatDate(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  return format(date, "MMM d, yyyy");
}

export const formatDateTime = (dateTimeStr: string) => {
  try {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
};

export function formatDateShort(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  };

  const formatted = capitalizeFirst(date.toLocaleDateString("es-ES", options));

  // Capitaliza la primera letra del día (e.g., "jue" -> "Jue")
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

const capitalizeFirst = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

export function formatDateForSQL(dateString: string | number | Date) {
  let date: Date;

  if (dateString instanceof Date) {
    date = dateString;
  } else if (typeof dateString === "string") {
    // Handle date-only strings by adding default time
    if (!dateString.includes("T") && !dateString.includes(" ")) {
      dateString += "T00:00:00Z";
    }
    date = new Date(dateString);
  } else {
    date = new Date(dateString);
  }

  // Return full ISO string with timezone
  return date.toISOString();
}

// ---------------------------------------------------------------------------
// Date ranges
// ---------------------------------------------------------------------------

export function getDateRangesFrom(date: Date) {
  const hoy = new Date(date);
  hoy.setHours(0, 0, 0, 0); // Normalize

  const mañana = new Date(hoy);
  mañana.setDate(hoy.getDate() + 1);
  const today = toLocalISOString(hoy);
  const tomorrow = toLocalISOString(mañana);

  // First day of the month two months ago
  const monthmin = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
  monthmin.setHours(0, 0, 0, 0); // normalize to midnight

  // Last day of the current month
  const monthmax = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  monthmax.setHours(23, 59, 59, 999); // end of day
  const lastMonth = toLocalISOString(monthmin);
  const nextMonth = toLocalISOString(monthmax);

  return {
    today,
    tomorrow,
    lastMonth,
    nextMonth,
  };
}

// ---------------------------------------------------------------------------
// Grid: px ↔ time
// ---------------------------------------------------------------------------

export const findGridRowForTime = (
  grid: CalendarGrid,
  time: string,
): GridRow => {
  const timehh = formatTime(time);

  const row = grid.find(
    (row) => row.startTime <= timehh && timehh < row.endTime,
  );
  if (!row) throw new Error(`No GridRow found for time: ${timehh}`);
  return row;
};

export const findTimeForGridRow = (
  grid: CalendarGrid,
  px: number,
  day: Date = new Date(),
): { top: number; startTime: string; startDateTime: string } | null => {
  if (!grid.length) return null;

  const validRows = grid.filter((row) => row.top <= px);
  if (!validRows.length) return null;

  const closestRow = validRows.reduce(
    (closest, row) => (row.top > closest.top ? row : closest),
    validRows[0],
  );

  const dateStr = toLocalDateString(day);
  const startDateTime = `${dateStr}T${closestRow.startTime}:00`; // YYYY-MM-DDTHH:MM:00

  return {
    top: closestRow.top,
    startTime: closestRow.startTime,
    startDateTime: startDateTime,
  };
};

export const createCalendarGrid = (hourHeight: number = 40): CalendarGrid => {
  const grid: GridRow[] = [];

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const endMinute = (minute + 15) % 60;
      const endHour = minute + 15 >= 60 ? (hour + 1) % 24 : hour;
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

      grid.push({
        startTime,
        endTime,
        top: (hour * 60 + minute) * (hourHeight / 60),
        height: hourHeight / 4,
      });
    }
  }

  return grid;
};

// ---------------------------------------------------------------------------
// Time utils
// ---------------------------------------------------------------------------

export const TimeUtils = {
  // Convert angle (0-360) to time (HH:MM)
  angleToTime: (angle: number): string => {
    const hours = Math.floor((angle / 360) * 24);
    const minutes = Math.round(((angle / 360) * 24 * 60) % 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  },

  // Convert time (HH:MM) to angle (0-360)
  timeToAngle: (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    const totalHours = hours + minutes / 60;
    return (totalHours / 24) * 360;
  },

  // Convert hour (0-23) to angle (0-360)
  hourToAngle: (hour: number): number => {
    return (hour / 24) * 360;
  },

  // Convert angle (0-360) to hour (0-23)
  angleToHour: (angle: number): number => {
    return Math.floor((angle / 360) * 24);
  },
};

export const timeToMinutes = (time: string): number => {
  if (time.includes("T")) {
    // Handle ISO format
    const date = new Date(time);
    return date.getHours() * 60 + date.getMinutes();
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const DateUtils = {
  /**
   * Safely parse ISO date strings
   */
  parseISO: (isoString: string): Date => {
    const date = new Date(isoString);
    if (isNaN(date.getTime()))
      throw new Error(`Invalid ISO date: ${isoString}`);
    return date;
  },

  /**
   * Convert Date object to HH:mm format
   */
  toTimeString: (date: Date): string =>
    date
      .toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace("24:", "00:"),

  /**
   * Check if an event is all-day
   */
  isAllDay: (start?: { dateTime?: string; date?: string }): boolean =>
    !!start?.date && !start?.dateTime,
};

export const generateWeekId = (date: Date = new Date()): string =>
  `${date.getFullYear()}-W${Math.floor(date.getTime() / 604800000)}`;

export function isSameLimaDay(datetime: string, currentDate: Date): boolean {
  const formatToLimaDate = (d: string | Date): string => {
    if (typeof d === "string") {
      return new Date(d).toLocaleDateString("en-CA", {
        timeZone: "America/Lima",
      });
    } else {
      return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    }
  };

  const date1 = formatToLimaDate(datetime);
  const date2 = formatToLimaDate(currentDate);

  return date1 === date2;
}

// ---------------------------------------------------------------------------
// Overlap detection
// ---------------------------------------------------------------------------

export const detectOverlaps = (events: Task[]): TaskBlock[] => {
  if (events.length === 0) return [];
  const colorrr = events[0].colorId;
  // Filtrar eventos sin fecha válida
  const validEvents = events.filter(
    (e) => e.start?.dateTime && e.end?.dateTime,
  );

  // Ordenar por hora de inicio
  const sortedEvents = [...validEvents].sort(
    (a, b) =>
      timeToMinutes(a.start!.dateTime!) - timeToMinutes(b.start!.dateTime!),
  );

  const groups: TaskBlock[] = [];

  sortedEvents.forEach((event) => {
    let added = false;

    for (const group of groups) {
      if (
        group.tareas?.some(
          (e) =>
            timeToMinutes(event.start?.dateTime as string) <
              timeToMinutes(e.end?.dateTime as string) &&
            timeToMinutes(event.end?.dateTime as string) >
              timeToMinutes(e.start?.dateTime as string),
        )
      ) {
        group.tareas?.push(event);
        added = true;
        break;
      }
    }
    const randomIndex = Math.floor(Math.random() * 10000);

    if (!added) {
      groups.push({
        id: randomIndex.toString(),
        title: "",
        expanded: true,
        type: "both",
        tareas: [event],
        top: timeToMinutes(event.start?.dateTime as string),
        height:
          timeToMinutes(event.end?.dateTime as string) -
          timeToMinutes(event.start?.dateTime as string),
        color: colorrr as string,
      });
    }
  });

  return groups.map((group) => ({
    ...group,
    top: Math.min(
      ...(group.tareas?.map((e) =>
        timeToMinutes(e.start?.dateTime as string),
      ) ?? []),
    ),
    height:
      Math.max(
        ...(group.tareas?.map((e) =>
          timeToMinutes(e.end?.dateTime as string),
        ) ?? []),
      ) -
      Math.min(
        ...(group.tareas?.map((e) =>
          timeToMinutes(e.start?.dateTime as string),
        ) ?? []),
      ),
  }));
};

// ---------------------------------------------------------------------------
// Resize / square logic
// ---------------------------------------------------------------------------

export function createSquare(
  square: TaskBlock,
  activeSquare: { id: string; top: number; height: number },
  resizeEdge: "top" | "bottom" | "both" | null,
  initialYRef: any,
  currentY: number,
  grid: CalendarGrid, // pass your grid object here so we can convert y positions to times
  day: Date = new Date(),
): TaskBlock {
  // Only update the active square
  if (square.id !== activeSquare.id) return square;

  let newTop = square.top || 0;
  let newHeight = square.height || 0;

  if (square.height && square.top) {
    if (resizeEdge === "both") {
      if (currentY < initialYRef) {
        // Dragging upwards
        newTop = Math.max(0, Math.min(currentY, square.top || 0));
        newHeight = square.top || 0 + square.height - newTop;
      } else {
        // Dragging downwards
        newHeight = Math.max(10, currentY - square.top);
      }
    } else if (resizeEdge === "top") {
      const deltaY = Math.round((currentY - square.top) / 10) * 10;
      newTop = Math.max(
        0,
        Math.min(
          square.top || 0 + deltaY,
          square.top || 0 + square.height - 10,
        ),
      );
      newHeight = square.height || 0 - (newTop - square.top);
    } else if (resizeEdge === "bottom") {
      newHeight = Math.max(10, Math.round((currentY - square.top) / 10) * 10);
    }
  }

  // Update the event’s start and end times based on the new top and height.
  const newStartTime = findTimeForGridRow(grid, newTop || 0, day);
  const newEndTime = findTimeForGridRow(grid, newTop || 0 + newHeight, day);

  const dateStr = toLocalDateString(day);
  const startTime = newStartTime
    ? newStartTime.startTime
    : day.toTimeString().slice(0, 5); // HH:MM
  const endTime = newEndTime
    ? newEndTime.startTime
    : day.toTimeString().slice(0, 5); // HH:MM

  const startDateTime = `${dateStr}T${startTime}:00`; // YYYY-MM-DDTHH:MM:00
  const endDateTime = `${dateStr}T${endTime}:00`;
  return {
    ...square,
    top: newTop,
    height: newHeight,
    tareas: square.tareas?.map((event: Task) => ({
      ...event,
      start: { dateTime: startDateTime, timeZone: userTimeZone },
      end: { dateTime: endDateTime, timeZone: userTimeZone },
    })),
  };
}

// ---------------------------------------------------------------------------
// Google event creation
// ---------------------------------------------------------------------------

export function createGoogleEventFromActiveSquare(
  activeSquare: { id: string; top?: number; height?: number },
  eventDetails: {
    summary: string;
    isEvent: boolean;
    color: string;
    reminders: { useDefault: boolean };
  },
  grid: CalendarGrid,
  hexToGoogleMapping: Record<string, string>,
  day: Date = new Date(),
): Task {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; // Obtiene la zona horaria del usuario
  const dateStr = day.toLocaleDateString("en-CA", { timeZone });
  // Find the closest start and end times from the grid
  if (!activeSquare.top || !activeSquare.height) {
    throw new Error("Active square must have top and height defined.");
  }
  const startRow = findTimeForGridRow(grid, activeSquare.top || 0, day);
  const endRow = findTimeForGridRow(
    grid,
    activeSquare.top || 0 + activeSquare.height || 0,
    day,
  );

  if (!startRow || !endRow) {
    throw new Error("Unable to determine event times from grid.");
  }

  // Convert "hh:mm" to Google's full datetime format
  const startDateTime = `${dateStr}T${startRow.startTime}:00`; // YYYY-MM-DDTHH:MM:00
  const endDateTime = `${dateStr}T${endRow.startTime}:00`;

  // Normalize color and map to Google Calendar color ID
  const normalizedHex = eventDetails.color.toUpperCase();
  const googleColorId = hexToGoogleMapping[normalizedHex];

  return {
    id: activeSquare.id,
    summary: eventDetails.summary,
    isEvent: eventDetails.isEvent, // Default to true if not specified
    colorId: googleColorId,
    reminders: eventDetails.reminders,
    type: "task", // or "event" or "both"
    start: { dateTime: startDateTime, timeZone: userTimeZone },
    end: { dateTime: endDateTime, timeZone: userTimeZone },
  };
}

// ---------------------------------------------------------------------------
// Color mapping
// ---------------------------------------------------------------------------

export const googleColors: Record<string, string> = {
  "1": "bg-blue-500",
  "2": "bg-green-500",
  "3": "bg-red-500",
  "4": "bg-yellow-500",
  "5": "bg-purple-500",
  "6": "bg-pink-500",
  "7": "bg-indigo-500",
  "8": "bg-teal-500",
  "9": "bg-cyan-500",
  "10": "bg-amber-500",
  "11": "bg-lime-500",
};

export const typeFallback = (type: "event" | "task") =>
  type === "event" ? "bg-blue-200" : "bg-green-200";

export const getTailwindColor = (
  colorId?: string,
  eventType: "event" | "task" = "event",
): string => {
  return colorId
    ? googleColors[colorId] || typeFallback(eventType)
    : typeFallback(eventType);
};

export const getRandomColor = (): string => {
  const colorIds = Object.keys(googleColors);
  const randomId = colorIds[Math.floor(Math.random() * colorIds.length)];
  return googleColors[randomId];
};

export async function buildHexToColorIdMapping(
  accessToken: string,
): Promise<Record<string, string>> {
  const colorsResponse = await fetchGoogleColors(accessToken);
  const mapping: Record<string, string> = {};
  Object.entries(colorsResponse.event).forEach(([id, colorData]) => {
    mapping[colorData.background.toUpperCase()] = id;
  });
  return mapping;
}

// ---------------------------------------------------------------------------
// Task ↔ event conversion
// ---------------------------------------------------------------------------

export function eventToTask(event: Task): Task {
  const task: Task = {
    ...event,
    start: {},
    end: {},
    reminders: { useDefault: false },
    transparency: "transparent",
    isEvent: false,
  };

  // If original had dateTime, convert to date string (local)
  if (event.start.dateTime) {
    const dt = new Date(event.start.dateTime);
    task.start.date = toLocalDateString(dt);
    // default end to next day
    const endDt = new Date(dt);
    endDt.setDate(endDt.getDate() + 1);
    task.end.date = toLocalDateString(endDt);
  } else if (event.start.date) {
    task.start.date = event.start.date;
    task.end.date = event.end.date;
  }

  // Preserve recurrence rules if any
  if (event.recurrence) {
    task.recurrence = [...event.recurrence];
  }

  return task;
}

export function taskToEvent(
  task: Task,
  defaultStartTime: string = "09:00",
  defaultDurationMinutes: number = 60,
): Task {
  const event: Task = {
    ...task,
    start: {},
    end: {},
    reminders: { useDefault: true },
    transparency: "opaque",
    isEvent: true,
  };

  // If task is all-day (dates only)
  if (task.start.date && task.end.date) {
    event.start.date = task.start.date;
    event.end.date = task.end.date;
  } else if (task.start.date) {
    // Promote date to dateTime at default time
    const tz =
      task.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    event.start.dateTime = `${task.start.date}T${defaultStartTime}`;
    event.start.timeZone = tz;

    // Calculate end datetime
    const [h, m] = defaultStartTime.split(":").map(Number);
    const startDt = new Date(task.start.date);
    startDt.setHours(h, m);
    const endDt = new Date(startDt);
    endDt.setMinutes(endDt.getMinutes() + defaultDurationMinutes);
    event.end.dateTime = toLocalISOString(endDt);
    event.end.timeZone = tz;
  }

  // Preserve recurrence rules
  if (task.recurrence) {
    event.recurrence = [...task.recurrence];
  }

  return event;
}
