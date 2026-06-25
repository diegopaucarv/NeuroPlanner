import React, { useState } from "react";

import {
  Event,
  CalendarEvent,
  DroppableEvent,
  GoogleColorsResponse,
  CalendarGrid,
  GridRow,
  Vista,
  Task,
  ViewContextType,
  DroppedItem,
  DraggableItem,
  TagType,
  TaskBlock,
} from "./types";
import { addHours, parseISO } from "date-fns";
import { format } from "date-fns-tz";
import axios from "axios";
//import ProjectsPage from "~/routes/listaproyectos";
//import { Premios } from "~/routes/Premios";
//import DiaCalendario from "~/routes/Dia";
//import { IndependentArcTimeline } from "~/routes/circulol";
//import { Dias } from "~/routes/Dias";
//import { AnimatedTaskManager } from "~/routes/TaskList";

export const TranspBoolean = (str: string) => {
  const transparency = str;
  if (transparency == "opaque") {
    return 0;
  } else {
    return 1;
  }
};

const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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

// utils/dateRanges.ts

export function getDateRangesFrom(date: Date) {
  const hoy = new Date(date);
  hoy.setHours(0, 0, 0, 0); // Normalize

  const mañana = new Date(hoy);
  mañana.setDate(hoy.getDate() + 1);
  const today = hoy.toISOString();
  const tomorrow = mañana.toISOString();

  // First day of the month two months ago
  const monthmin = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
  monthmin.setHours(0, 0, 0, 0); // normalize to midnight

  // Last day of the current month
  const monthmax = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  monthmax.setHours(23, 59, 59, 999); // end of day
  const lastMonth = monthmin.toISOString();
  const nextMonth = monthmax.toISOString();

  // Convertir a formato ISO 8601 (RFC3339 con zona horaria 'Z' si UTC)

  return {
    today,
    tomorrow,
    lastMonth,
    nextMonth,
  };
}

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
): { top: number; startTime: string; startDateTime: string } | null => {
  if (!grid.length) return null;

  const validRows = grid.filter((row) => row.top <= px);
  if (!validRows.length) return null;

  const closestRow = validRows.reduce(
    (closest, row) => (row.top > closest.top ? row : closest),
    validRows[0],
  );

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;
  const startDateTime = `${dateStr}T${closestRow.startTime}:00`; // YYYY-MM-DDTHH:MM:00

  return {
    top: closestRow.top,
    startTime: closestRow.startTime,
    startDateTime: startDateTime,
  };
};

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

// Format: YYYY-MM-DD

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

/**
 * Time conversion utilities for calendar operations
 */
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

/**
 * Convert time string to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  if (time.includes("T")) {
    // Handle ISO format
    const date = new Date(time);
    return date.getHours() * 60 + date.getMinutes();
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Generate unique week identifier
 */
export const generateWeekId = (date: Date = new Date()): string =>
  `${date.getFullYear()}-W${Math.floor(date.getTime() / 604800000)}`;

/**
 * Detect overlapping events and group them for layout
 */

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

export function createSquare(
  square: TaskBlock,
  activeSquare: { id: string; top: number; height: number },
  resizeEdge: "top" | "bottom" | "both" | null,
  initialYRef: any,
  currentY: number,
  grid: CalendarGrid, // pass your grid object here so we can convert y positions to times
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
  const newStartTime = findTimeForGridRow(grid, newTop || 0);
  const newEndTime = findTimeForGridRow(grid, newTop || 0 + newHeight);

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;
  const startTime = newStartTime
    ? newStartTime.startTime
    : today.toTimeString().slice(0, 5); // HH:MM
  const endTime = newEndTime
    ? newEndTime.startTime
    : today.toTimeString().slice(0, 5); // HH:MM

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

/**
 * Create calendar grid structure
 */
export const createCalendarGrid = (hourHeight: number = 40) => {
  const grid = [];

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

export const convertGoogleEventToEvent = (googleEvent: Task): Event => ({
  id: googleEvent.id,
  summary: googleEvent.summary,
  start: googleEvent.start?.dateTime || googleEvent.start?.date || "",
  end: googleEvent.end?.dateTime || googleEvent.end?.date || "",
  colorId: googleEvent.colorId || "",
  type: googleEvent.eventType as string,
});

export const convertEventToGoogleEvent = (event: CalendarEvent): Task => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    id: event.id,
    summary: event.summary,
    // Use rawStart if available; otherwise, wrap event.start into an object with a timeZone.
    start:
      event.rawStart && event.rawStart.dateTime
        ? { dateTime: event.rawStart.dateTime, timeZone }
        : { dateTime: event.start, timeZone },
    end:
      event.rawEnd && event.rawEnd.dateTime
        ? { dateTime: event.rawEnd.dateTime, timeZone }
        : { dateTime: event.end, timeZone },
    type: event.type as string,
    // You might want to map the HEX color to a colorId if needed
    colorId: event.color,
  };
};

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
): Task {
  const today = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; // Obtiene la zona horaria del usuario
  const dateStr = today.toLocaleDateString("en-CA", { timeZone });
  // Find the closest start and end times from the grid
  if (!activeSquare.top || !activeSquare.height) {
    throw new Error("Active square must have top and height defined.");
  }
  const startRow = findTimeForGridRow(grid, activeSquare.top || 0);
  const endRow = findTimeForGridRow(
    grid,
    activeSquare.top || 0 + activeSquare.height || 0,
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
  type: "task",   // or "event" or "both"
    start: { dateTime: startDateTime, timeZone: userTimeZone },
    end: { dateTime: endDateTime, timeZone: userTimeZone },}

  };
}

/**
 * Convert Google API event to CalendarEvent format
 */
export const convertGoogleEvent = (apiEvent: Task): DroppableEvent => {
  const parseTime = (dateString?: string) => {
    if (!dateString) return "00:00";
    const date = new Date(dateString);
    return date.toTimeString().slice(0, 5);
  };

  return {
    ...apiEvent,
    summary: apiEvent.summary,
    start: parseTime(apiEvent.start?.dateTime || apiEvent.start?.date),
    end: parseTime(apiEvent.end?.dateTime || apiEvent.end?.date),
    color: getTailwindColor(apiEvent.colorId),
    // Ensure all DroppableEvent required properties are set
    weekId: `${new Date().getFullYear()}-W${Math.ceil((new Date().getDate() + new Date().getDay()) / 7)}`,
    dropTime: new Date().toISOString().slice(0, 19),
    hierarchyLevel: 0,
    isComponent: false,
    subBlocks: [],
    // Map raw dates for calculations
    rawStart: apiEvent.start,
    rawEnd: apiEvent.end,
  };
};

/**
 * Map Google Calendar colors to Tailwind classes
 */
export const getTailwindColor = (
  colorId?: string,
  eventType: "event" | "task" = "event",
): string => {
  return colorId
    ? googleColors[colorId] || typeFallback(eventType)
    : typeFallback(eventType);
};

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

export function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
// Format date for display
export const formatDateTime = (dateTimeStr: string) => {
  try {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
};

export const formatTime = (tiempo: string): string => {
  return format(parseISO(tiempo), "HH:mm");
};

export function formatDate(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  return format(date, "MMM d, yyyy");
}

export function formatDateShort(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short", // Ej: "jue"
    day: "numeric",
    month: "long",
    year: "numeric",
  };

  const formatted = capitalizeFirst(date.toLocaleDateString("es-ES", options));

  // Capitaliza la primera letra del día (e.g., "jue" -> "Jue")
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export const getRandomColor = (): string => {
  const colorIds = Object.keys(googleColors);
  const randomId = colorIds[Math.floor(Math.random() * colorIds.length)];
  return googleColors[randomId];
};

export const ViewContext = React.createContext<ViewContextType | undefined>(
  undefined,
);

export const upsertEvent = async (
  eventDetails: Partial<Task>,
  accessToken: string,
  isUpdate = false,
): Promise<Task | null> => {
  const method = isUpdate ? "PATCH" : "POST";
  const endpoint = isUpdate
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventDetails.id}`
    : "https://www.googleapis.com/calendar/v3/calendars/primary/events";

  const payload = isUpdate
    ? eventDetails
    : (({ id, ...rest }) => rest)(eventDetails);

  try {
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! status: ${response.status}, ${JSON.stringify(errorData)}`,
      );
    }

    const resultEvent: Task = await response.json();
    return resultEvent;
  } catch (error) {
    console.error(`Error ${isUpdate ? "updating" : "creating"} event:`, error);
    throw error;
  }
};

export const deleteEvent = async (
  eventId: string,
  accessToken: string,
): Promise<boolean> => {
  const endpoint = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

  try {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      // For DELETE, a 204 No Content is expected
      if (response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `HTTP error! status: ${response.status}, ${JSON.stringify(errorData)}`,
        );
      }
    }

    return true;
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
};

export function saveTags(tags: TagType[]): void {
  localStorage.setItem("savedTags", JSON.stringify(tags));
}

export function loadTags(): TagType[] {
  const savedTags = localStorage.getItem("savedTags");
  return savedTags ? JSON.parse(savedTags) : [];
}

export const getBackgroundColor = (index: number) => {
  const colors = [
    "#ffc5a7",
    "#cff5f1",
    "#82d6e8",
    "#beb0dd",
    "#ffe07d",
    "#d3cfff",
    "#e2afcf",
    "#f3eed9",
    "#edc2e0",
    "#86e5ff",
  ];
  return colors[index % colors.length];
};

interface ColoresUI {
  [key: string]: string;
}

export const coloresui: ColoresUI[] = [
  {
    Tareas: "#c5e1a4",
    Metas: "#b45dc3",
    Premios: "#3fccde",
    Monitor: "#ff9fc0",
    Settings: "#fbf39b",
  },
];

interface ViewDefinition {
  tabs: { label: string; icon: string; target: string; viewMode: string }[];
  color: string;
  component: (props: any) => JSX.Element | null;
}

// export const viewRegistry: Record<Vista, ViewDefinition> = {
//   [Vista.Tareas]: {
//     tabs: [
//       { label: "Tasks", icon: "", target: "day", viewMode: "day" },
//       { label: "Week", icon: "", target: "week", viewMode: "week" },
//       { label: "Calendar", icon: "", target: "schedule", viewMode: "schedule" },
//     ],
//     color: coloresui[0].Tareas,
//     component: ({ accessToken, changeView, viewMode, setViewMode }) =>
//       accessToken ? (
//         <AnimatedTaskManager
//           accessToken={accessToken}
//           setCurrentView={changeView}
//           viewMode={viewMode}
//           setViewMode={setViewMode}
//         />
//       ) : null,
//   },
//   [Vista.Proyectos]: {
//     tabs: [
//       { label: "List", icon: "", target: "list", viewMode: "list" },
//       { label: "Sunburst", icon: "", target: "sunburst", viewMode: "sunburst" },
//       { label: "Schedule", icon: "", target: "schedule", viewMode: "schedule" },
//     ],
//     color: coloresui[0].Metas,
//     component: ({ viewMode, setViewMode }) => (
//       <ProjectsPage viewMode={viewMode} setViewMode={setViewMode} />
//     ),
//   },
//   [Vista.Premios]: {
//     tabs: [],
//     color: coloresui[0].Premios,
//     component: ({ accessToken, changeView }) => (
//       <Premios
//         ayverga={false}
//         accessToken={accessToken}
//         setCurrentView={changeView}
//       />
//     ),
//   },
//   [Vista.Dia_1]: {
//     tabs: [],
//     color: "#a1c4fd",
//     component: ({ accessToken, events }) =>
//       accessToken ? (
//         <DiaCalendario
//           accessToken={accessToken}
//           celular={false}
//           eventos={events}
//         />
//       ) : null,
//   },
//   [Vista.Dia_2]: {
//     tabs: [],
//     color: "#ff9fc0",
//     component: ({ accessToken }) =>
//       accessToken ? <IndependentArcTimeline /> : null,
//   },
//   [Vista.Semanas]: {
//     tabs: [],
//     color: "#dcedc8",
//     component: ({ accessToken, events }) => (
//       <Dias accessToken={accessToken || ""} celular={false} eventos={events} />
//     ),
//   },
//   [Vista.Meses]: {
//     tabs: [],
//     color: "#dcedc8",
//     component: ({ accessToken, events }) => (
//       <Dias accessToken={accessToken || ""} celular={false} eventos={events} />
//     ),
//   },
//   [Vista.Dias]: {
//     tabs: [],
//     color: "#dcedc8",
//     component: ({ accessToken, events }) => (
//       <Dias accessToken={accessToken || ""} celular={false} eventos={events} />
//     ),
//   },
//   [Vista.Settings]: {
//     tabs: [],
//     color: "#dcedc8",
//     component: ({ accessToken, events }) => (
//       <Dias accessToken={accessToken || ""} celular={false} eventos={events} />
//     ),
//   },
// };

export const createEvent = (eventDetails: Partial<Task>, accessToken: string) =>
  upsertEvent(eventDetails, accessToken);

export const updateEvent = (eventDetails: Partial<Task>, accessToken: string) =>
  upsertEvent(eventDetails, accessToken, true);

export async function fetchGoogleColors(
  accessToken: string,
): Promise<GoogleColorsResponse> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/colors",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!response.ok) {
    const errorMessage = await response.text();
    console.error(
      `Error fetching Google Calendar colors. Status: ${response.status}. Message: ${errorMessage}`,
    );
    throw new Error("Failed to fetch Google Calendar colors");
  }
  return response.json();
}

// export function convertGoogleEventToTask(
//   googleEvent: GoogleEvent,
//   proyecto: string,
//   sub_proyecto: string
// ): Task {
//   return {
//   id: googleEvent.id, // Or generate your own ID
//   summary: googleEvent.summary || 'Sin título',
//   description: googleEvent.type || '',
//   proyecto: proyecto, // Now comes from parameter
//   subproyecto: sub_proyecto, // Now comes from parameter
//   transparency: googleEvent.transparency,
//   startTime: googleEvent.start?.dateTime || googleEvent.start?.date || '',
//   endTime: googleEvent.end?.dateTime || googleEvent.end?.date || '',
//   color: googleEvent.colorId || '1', // Default to colorId 1 if not set
//   tag: [],
//   isEvent: false
// };
// }

// export function convertGoogleEventsToTasks(
//   events: GoogleEvent[],
//   proyecto: string,
//   sub_proyecto: number
// ): Task[] {
//   return events.map(event =>
//     convertGoogleEventToTask(event, proyecto, sub_proyecto)
//   );
// }

/**
 * Convert a timed or all-day CalendarEntry (event) into a task-like entry.
 * - Strips time components to date-only (all-day)
 * - Sets isEvent to false
 * - Marks transparency transparent, and clears reminders
 */
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
    task.start.date = dt.toISOString().slice(0, 10);
    // default end to next day
    const endDt = new Date(dt);
    endDt.setDate(endDt.getDate() + 1);
    task.end.date = endDt.toISOString().slice(0, 10);
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

/**
 * Convert a task-like CalendarEntry back into a timed all-day event or a timed event
 * - If task only has dates, preserve as all-day event
 * - Keeps timeZone and recurrence
 * - Sets isEvent to true and use default reminders
 */
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
    event.end.dateTime = endDt.toISOString();
    event.end.timeZone = tz;
  }

  // Preserve recurrence rules
  if (task.recurrence) {
    event.recurrence = [...task.recurrence];
  }

  return event;
}

export const handleDragStart = (
  e: React.DragEvent<HTMLDivElement>,
  item: DraggableItem,
) => {
  const [draggedItem, setDraggedItem] = useState<DraggableItem | null>(null);

  setDraggedItem(item);
  e.dataTransfer.setData(
    "text/plain",
    JSON.stringify({
      ...item,
      isComponent: item.type === "component",
    }),
  );
};

export const handleDelete = (
  itemId: number,
  weekId: string,
  setDroppedItems: (updateFn: (prev: DroppedItem[]) => DroppedItem[]) => void,
) => {
  setDroppedItems(
    (prev) =>
      prev
        .map((item) => {
          // If this item has sub-blocks, check them first
          if (item.subBlocks) {
            return {
              ...item,
              subBlocks: item.subBlocks.filter(
                (subBlock) =>
                  !(subBlock.id === itemId && subBlock.weekId === weekId),
              ),
            };
          }
          return item;
        })
        .filter((item) => !(item.id === itemId && item.weekId === weekId)), // Then filter top-level items
  );
};

export const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over"); // Add visual feedback
};

export const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
  e.currentTarget.classList.remove("drag-over");
};

export const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");

  const weekNum = e.currentTarget.getAttribute("data-week");
  const year = e.currentTarget.getAttribute("data-year");

  if (!weekNum || !year) {
    console.error("Week data not found");
    return;
  }
};
