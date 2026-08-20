import React from "react";
import { TaskList } from "../components/TaskList";

/**
 * Thin wrapper around the real Tasks view. The previous implementation was
 * dead code (web drag-and-drop); the actual UI now lives in
 * `src/components/TaskList.tsx`.
 */
export default function TaskListRoute() {
  return <TaskList />;
}
