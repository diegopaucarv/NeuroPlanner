/**
 * ViewContext
 *
 * Extracted from App.tsx into its own file to break the circular
 * dependency between App.tsx → Main.tsx → App.tsx.
 */

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Vista } from "./types";

// ── Types ────────────────────────────────────
export interface ViewContextType {
  currentView: Vista;
  changeView: (view: Vista) => void;
}

// ── Context ──────────────────────────────────
const ViewContext = createContext<ViewContextType | undefined>(undefined);

// ── Provider ─────────────────────────────────
export const ViewProvider: React.FC<{
  children: ReactNode;
  defaultView?: Vista;
}> = ({ children, defaultView = Vista.Tareas }) => {
  const [currentView, setCurrentView] = useState<Vista>(defaultView);
  return (
    <ViewContext.Provider value={{ currentView, changeView: setCurrentView }}>
      {children}
    </ViewContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────
export const useView = () => {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error("useView must be used within ViewProvider");
  return ctx;
};
