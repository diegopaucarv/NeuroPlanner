"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import { mainIA } from "~/lib/ia";
import {
  Block,
  Image,
  Premio,
  ProjectContextType,
  SubBlock,
  TagType,
  Task,
  TaskBlock,
  Reminders,
} from "~/lib/types";
import axios from "axios";
import { formatDateForSQL } from "~/lib/calendario";
import { Calendar, Target, Briefcase, Circle } from "lucide-react";

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
const timeZone = "America/Lima"; // <- Use this instead of dynamic resolution

export async function maxid(table: string): Promise<number | null> {
  try {
    const { data } = await axios.get<{ maxId: number | null }>(
      `http://localhost:5000/${table}/maxid`,
    );
    console.log("maxid result:", table, data);
    return data.maxId;
  } catch (error) {
    console.error("Error fetching max ID:", error);
    throw new Response("Failed to load max ID", { status: 500 });
  }
}

export const ProjectProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [subBlocks, setSubBlock] = useState<SubBlock[]>([]);
  const [taskBlocks, setTaskBlock] = useState<TaskBlock[]>([]);
  const [premios, setPremio] = useState<Premio[]>([]);
  const [imagenes, setImagen] = useState<Image[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<number | null>(null);
  const [currentSelectedBlockId, setCurrentSelectedBlockId] = useState<
    number | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [skipNextSync, setSkipNextSync] = useState(false);

  // Image handlers

  const deleteImage = async (
    tableName: Image["table_name"],
    externalId: string | number,
  ) => {
    try {
      await axios.delete(
        `http://localhost:5000/api/images/?table_name=${tableName}&external_id=${externalId}`,
      );
      setImagen((prev) =>
        prev.filter(
          (img) =>
            !(img.table_name === tableName && img.external_id === externalId),
        ),
      );
    } catch (error) {
      console.error("Error deleting images by table and id:", error);
      throw error;
    }
  };

  // Task handlers

  const createTask = async (
    evento: string,
    summary: string,
    options?: {
      id?: string;
      description?: string;
      start?: string | Date;
      end?: string | Date;
      colorId?: string;
      eventType?: string;
      transparency?: "opaque" | "transparent";
      recurrence?: string[];
      tags?: TagType[];
      htmlLink?: string;
      proyecto?: number;
      subproyecto?: string;
      bloque_tareas?: string;
      premio?: number;
      image?: number;
      reminders?: Reminders;
    },
  ): Promise<Task | undefined> => {
    if (!summary.trim()) return;
    let uuid = options?.id ?? crypto.randomUUID();

    const now = new Date();
    const isEvent = evento === "crear_evento";

    const start = options?.start ?? now.toISOString();
    let end = options?.end ?? new Date(start);
    if (!options?.end) {
      if (end instanceof Date) {
        isEvent
          ? end.setHours(end.getHours() + 1)
          : end.setDate(end.getDate() + 1);
      }
    }

    // Inherit color from block if not passed
    let colorId = options?.colorId ?? "";
    if (!colorId && options?.proyecto !== undefined) {
      const block = blocks.find((b) => b.id === options.proyecto);
      if (block?.color) {
        colorId = block.color;
      }
    }

    const newTask: Task = {
      id: uuid,
      summary,
      description: options?.description ?? null,
      isEvent,
      colorId,
      imagen: options?.image ?? undefined,
      eventType: options?.eventType ?? "",
      transparency: options?.transparency ?? "opaque",
      proyecto: options?.proyecto ?? undefined,
      subproyecto: options?.subproyecto?.toString() ?? undefined,
      bloque_tareas: options?.bloque_tareas?.toString() ?? undefined,
      premio: options?.premio ?? undefined,
      htmlLink: options?.htmlLink ?? undefined,
      tags: options?.tags ?? [],
      start: isEvent
        ? { dateTime: start.toString(), timeZone: timeZone }
        : {
            date:
              start instanceof Date
                ? start.toISOString().split("T")[0]
                : end.toString(),
          },
      end: isEvent
        ? {
            dateTime: end instanceof Date ? end.toISOString() : end,
            timeZone: timeZone,
          }
        : { date: end instanceof Date ? end.toISOString().split("T")[0] : end },
      recurrence: options?.recurrence ?? undefined,
      reminders: options?.reminders ?? { useDefault: true },
    };

    try {
      const response = await axios.post<Task>(
        "http://localhost:5000/api/tareas",
        newTask,
      );

      // ✅ FIX: Update local state after successful creation
      const createdTask = response.data;
      // setTasks((prev) => [...prev, createdTask]);

      // ✅ FIX: Also update blocks state if task belongs to a project
      if (createdTask.proyecto) {
        setBlocks((prevBlocks) =>
          prevBlocks.map((block) => {
            if (block.id === createdTask.proyecto) {
              if (!createdTask.subproyecto) {
                // Task goes to main block
                return {
                  ...block,
                  tareas: [...(block.tareas ?? []), createdTask],
                };
              } else {
                // Task goes to subblock
                return {
                  ...block,
                  subBlocks: addTaskToSubBlocks(
                    block.subBlocks ?? [],
                    createdTask.subproyecto,
                    createdTask,
                  ),
                };
              }
            }
            return block;
          }),
        );
      }

      return createdTask;
    } catch (error) {
      console.error("Error creating task:", error);
      // ✅ FIX: Better error handling - could show user notification
      throw error; // Re-throw to let caller handle
    }
  };

  const createTasks = async (
    taskInputs: {
      summary: string;
      description?: string;
      blockId?: number;
      colorId?: string;
    }[],
  ) => {
    if (!taskInputs || taskInputs.length === 0) return;

    try {
      setSkipNextSync(true);
      const createdTasks: Task[] = [];

      for (const input of taskInputs) {
        const task = await createTask("crear_tarea", input.summary, {
          proyecto: input.blockId,
          description: input.description ?? undefined,
          colorId: input.colorId, // se heredará si es undefined dentro de createTask
        });

        if (task) createdTasks.push(task);
      }

      // Actualizar tareas globales
      setTasks((prev) => [...prev, ...createdTasks]);

      // Actualizar bloques
      setBlocks((prevBlocks) =>
        prevBlocks.map((block) => {
          const matching = createdTasks.filter(
            (task) => task.proyecto && task.proyecto === block.id,
          );
          if (matching.length > 0) {
            return {
              ...block,
              tareas: [...(block.tareas ?? []), ...matching],
            };
          }

          if (block.subBlocks) {
            return {
              ...block,
              subBlocks: block.subBlocks.map((subBlock) => {
                const matching = createdTasks.filter(
                  (task) =>
                    task.subproyecto &&
                    String(task.subproyecto) === String(subBlock.id),
                );
                if (matching.length > 0) {
                  return {
                    ...subBlock,
                    tareas: [...(subBlock.tareas ?? []), ...matching],
                  };
                }
                return subBlock;
              }),
            };
          }

          return block;
        }),
      );

      console.log("Tareas creadas:", createdTasks);
    } catch (error) {
      console.error("Error al crear tareas:", error);
    }
  };

  // Updated main updateTask function
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await axios.patch<Task>(
        `http://localhost:5000/api/tareas/${taskId}`,
        updates,
      );

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task,
        ),
      );

      setBlocks((prevBlocks) => {
        let oldBlockId: number | undefined;
        let oldSubBlockId: string | undefined;
        let updatedTask: Task | undefined;

        // Find old location
        outer: for (const block of prevBlocks) {
          // Check main block tasks
          for (const t of block.tareas ?? []) {
            if (t.id === taskId) {
              oldBlockId = t.proyecto; // number
              oldSubBlockId = undefined; // task is in main block, not subblock
              updatedTask = { ...t, ...updates };
              break outer;
            }
          }
          // Check subblock tasks recursively
          const findInSubBlocks = (subBlocks: SubBlock[]): boolean => {
            for (const sub of subBlocks) {
              for (const t of sub.tareas ?? []) {
                if (t.id === taskId) {
                  oldBlockId = t.proyecto; // number
                  oldSubBlockId = sub.id; // string - the subblock where task currently lives
                  updatedTask = { ...t, ...updates };
                  return true;
                }
              }
              // Check nested subblocks
              if (sub.subBlocks && findInSubBlocks(sub.subBlocks)) {
                return true;
              }
            }
            return false;
          };

          if (block.subBlocks && findInSubBlocks(block.subBlocks)) {
            break outer;
          }
        }

        if (!updatedTask) return prevBlocks;

        const newBlockId = updatedTask.proyecto; // number
        const newSubBlockId = updatedTask.subproyecto; // string

        // If location didn't change, just update in-place
        if (oldBlockId === newBlockId && oldSubBlockId === newSubBlockId) {
          return prevBlocks.map((block) =>
            updateTaskInBlockOrSubBlock(block, taskId, updates),
          );
        }

        // Otherwise remove from old & insert into new
        return prevBlocks.map((block) => {
          let copy = { ...block };

          // Remove from old location
          if (block.id === oldBlockId) {
            if (!oldSubBlockId) {
              // Task was in main block
              copy.tareas = block.tareas?.filter((t) => t.id !== taskId);
            } else {
              // Remove from old subblock (including nested ones)
              copy.subBlocks = removeTaskFromSubBlocks(
                block.subBlocks ?? [],
                taskId,
              );
            }
          }

          // Add to new location
          if (block.id === newBlockId) {
            if (!newSubBlockId) {
              // Task goes to main block
              copy.tareas = [...(copy.tareas ?? []), updatedTask!];
            } else {
              // Add to new subblock
              copy.subBlocks = addTaskToSubBlocks(
                copy.subBlocks ?? [],
                newSubBlockId,
                updatedTask!,
              );
            }
          }

          return copy;
        });
      });

      console.log(`Task ${taskId} updated successfully.`);
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  // Fixed function for Block type
  const updateTaskInBlockOrSubBlock = (
    block: Block,
    taskId: string,
    updates: Partial<Task>,
  ): Block => {
    let updated = false;

    // Update in main block
    const updatedTareas = block.tareas?.map((t) => {
      if (t.id === taskId) {
        updated = true;
        return { ...t, ...updates };
      }
      return t;
    });

    // Update in subBlocks if not found in main block
    const updatedSubBlocks = block.subBlocks?.map((sub) => {
      const result = updateTaskInSubBlock(sub, taskId, updates);
      if (result.updated) updated = true;
      return result.subBlock;
    });

    return updated
      ? {
          ...block,
          tareas: updatedTareas,
          subBlocks: updatedSubBlocks,
        }
      : block;
  };

  // Separate function for SubBlock to handle type correctly
  const updateTaskInSubBlock = (
    subBlock: SubBlock,
    taskId: string,
    updates: Partial<Task>,
  ): { subBlock: SubBlock; updated: boolean } => {
    let updated = false;

    // Update in current subBlock
    const updatedTareas = subBlock.tareas?.map((t) => {
      if (t.id === taskId) {
        updated = true;
        return { ...t, ...updates };
      }
      return t;
    });

    // Update in nested subBlocks recursively
    const updatedSubBlocks = subBlock.subBlocks?.map((sub) => {
      const result = updateTaskInSubBlock(sub, taskId, updates);
      if (result.updated) updated = true;
      return result.subBlock;
    });

    return {
      subBlock: updated
        ? {
            ...subBlock,
            tareas: updatedTareas,
            subBlocks: updatedSubBlocks,
          }
        : subBlock,
      updated,
    };
  };

  // Helper function to remove task from subblocks recursively
  const removeTaskFromSubBlocks = (
    subBlocks: SubBlock[],
    taskId: string,
  ): SubBlock[] => {
    return subBlocks.map((sub) => ({
      ...sub,
      tareas: sub.tareas?.filter((t) => t.id !== taskId),
      subBlocks: sub.subBlocks
        ? removeTaskFromSubBlocks(sub.subBlocks, taskId)
        : undefined,
    }));
  };

  // Helper function to add task to specific subblock recursively
  const addTaskToSubBlocks = (
    subBlocks: SubBlock[],
    targetSubBlockId: string,
    task: Task,
  ): SubBlock[] => {
    return subBlocks.map((sub) => {
      if (sub.id === targetSubBlockId) {
        return {
          ...sub,
          tareas: [...(sub.tareas ?? []), task],
        };
      }
      if (sub.subBlocks) {
        return {
          ...sub,
          subBlocks: addTaskToSubBlocks(sub.subBlocks, targetSubBlockId, task),
        };
      }
      return sub;
    });
  };

  const deleteTask = async (taskId: string) => {
    try {
      // 1️⃣ Eliminar del backend
      await axios.delete(`http://localhost:5000/api/tareas/${taskId}`);

      // 2️⃣ Eliminar del estado global de tareas
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      await deleteImage("tareas", taskId);
      // 3️⃣ Eliminar del estado de bloques (Block + SubBlock)
      const removeTaskFromSubBlocks = (
        subBlocks: SubBlock[],
        taskId: string,
      ): SubBlock[] => {
        return subBlocks.map((subBlock) => {
          const updatedSub: SubBlock = {
            ...subBlock,
            tareas: subBlock.tareas?.filter((t) => t.id !== taskId),
            subBlocks: subBlock.subBlocks
              ? removeTaskFromSubBlocks(subBlock.subBlocks, taskId)
              : subBlock.subBlocks,
          };
          return updatedSub;
        });
      };

      setBlocks((prevBlocks) =>
        prevBlocks.map((block) => {
          const updatedBlock: Block = {
            ...block,
            tareas: block.tareas?.filter((t) => t.id !== taskId),
            subBlocks: block.subBlocks
              ? removeTaskFromSubBlocks(block.subBlocks, taskId)
              : block.subBlocks,
          };
          return updatedBlock;
        }),
      );

      console.log(`Task ${taskId} deleted successfully.`);
    } catch (error) {
      console.error(`Error deleting task ${taskId}:`, error);
    }
  };

  // TaskBlock
  const createTaskBlock = async (taskBlockInput: Partial<TaskBlock>) => {
    const uuid = taskBlockInput.id ?? crypto.randomUUID();

    const newTaskBlock: TaskBlock = {
      id: uuid,
      title: taskBlockInput.title ?? "New Task Block",
      expanded: taskBlockInput.expanded ?? false,
      type: taskBlockInput.type ?? "task",
      color: taskBlockInput.color ?? "#3B82F6",
      image: taskBlockInput?.image ?? 0,
      tareas: taskBlockInput.tareas ?? [],
    };

    try {
      await axios.post("http://localhost:5000/api/task_block/", {
        id: newTaskBlock.id,
        title: newTaskBlock.title,
        expanded: newTaskBlock.expanded,
        type: newTaskBlock.type,
        image: newTaskBlock.image,
        color: newTaskBlock.color,
      });

      setTaskBlock((prev) => [...prev, newTaskBlock]);
      console.log("TaskBlock created:", newTaskBlock);
    } catch (error) {
      console.error("Error creating TaskBlock:", error);
    }
  };

  const updateTaskBlock = async (
    taskBlockId: string,
    updates: Partial<TaskBlock>,
  ) => {
    try {
      // ── 1️⃣ Persist to backend ──────────────────────────────
      await axios.patch(
        `http://localhost:5000/api/task_block/${taskBlockId}`,
        updates,
      );

      // ── 2️⃣ Update local state ──────────────────────────────
      setTaskBlock((prev) =>
        prev.map((taskBlock) =>
          taskBlock.id === taskBlockId
            ? { ...taskBlock, ...updates }
            : taskBlock,
        ),
      );

      console.log(`TaskBlock ${taskBlockId} updated successfully.`);
    } catch (error) {
      console.error("Error updating TaskBlock:", error);
    }
  };

  const deleteTaskBlock = async (taskBlockId: string) => {
    try {
      // ── 1️⃣ Delete from backend ─────────────────────────────
      await axios.delete(`http://localhost:5000/api/task_block/${taskBlockId}`);

      // ── 2️⃣ Remove from local state ─────────────────────────
      setTaskBlock((prev) =>
        prev.filter((taskBlock) => taskBlock.id !== taskBlockId),
      );

      await deleteImage("task_block", taskBlockId);
      console.log(`TaskBlock ${taskBlockId} deleted successfully.`);
    } catch (error) {
      console.error(`Error deleting TaskBlock ${taskBlockId}:`, error);
    }
  };

  // Block handlers
  const createBlock = async (blockInput: Partial<Omit<Block, "id">>) => {
    const maybeId = await maxid("proyectos");
    const nextId = typeof maybeId === "number" ? maybeId + 1 : 0;

    const newBlock: Block = {
      id: nextId,
      name: blockInput.name ?? "Nuevo Proyecto",
      color: blockInput.color ?? "#3B82F6",
      startdate: blockInput.startdate ?? new Date().toISOString().split("T")[0],
      enddate: blockInput.enddate ?? new Date().toISOString().split("T")[0],
      tareas: blockInput.tareas ?? [],
      subBlocks: blockInput.subBlocks ?? [],
      image: blockInput?.image ?? 0,
      isExpanded: blockInput.isExpanded ?? true,
    };

    await axios.post("http://localhost:5000/api/proyectos", {
      id: newBlock.id,
      name: newBlock.name,
      color: newBlock.color,
      startdate: newBlock.startdate,
      enddate: newBlock.enddate,
    });

    setBlocks((prev) => [...prev, newBlock]);
    console.log("Proyecto creado:", newBlock);
  };

  // Subblock handlers: cambiar lógica porque ES UNA RED (2 SQLS: DETALLES Y RELACIONES)

  const createSubBlock = async (subInput: Partial<SubBlock>) => {
    const uuid = subInput.id ?? crypto.randomUUID(); // Siempre un string único
    const now = new Date();

    const start = subInput.startdate ?? now.toISOString();
    const end =
      subInput.enddate ??
      new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(); // +1 día

    const newSubBlock: SubBlock = {
      id: uuid,
      name: subInput.name ?? "Nuevo Subproyecto",
      color: subInput.color ?? "#10B981",
      startdate: start,
      enddate: end,
      image: subInput.image ?? undefined,
      tareas: subInput.tareas ?? [],
      parentId: subInput.parentId,
      parent_sub_id: subInput.parent_sub_id,
      subBlocks: subInput.subBlocks ?? [],
      isExpanded: subInput.isExpanded ?? false,
    };

    // Persistir en base de datos
    await axios.post("http://localhost:5000/api/sub_proyecto", {
      id: uuid,
      name: newSubBlock.name,
      proyecto: newSubBlock.parentId,
      startdate: start.slice(0, 19).replace("T", " "),
      enddate: end.slice(0, 19).replace("T", " "),
      image: newSubBlock.image,
      parent_sub_id: newSubBlock.parent_sub_id ?? null,
    });

    // Actualiza el estado local (React) según el tipo de anidación
    setBlocks((prev) =>
      prev.map((block) => {
        // 1. Si el subbloque pertenece directamente al bloque (proyecto)
        if (block.id === newSubBlock.parentId) {
          return {
            ...block,
            subBlocks: [...(block.subBlocks ?? []), newSubBlock],
          };
        }

        // 2. Si el subbloque es sub-subbloque (anidado dentro de otro subbloque)
        const updatedSubBlocks = (block.subBlocks ?? []).map((sub) => {
          if (sub.id === newSubBlock.parent_sub_id) {
            return {
              ...sub,
              subBlocks: [...(sub.subBlocks ?? []), newSubBlock],
            };
          }
          return sub;
        });

        return {
          ...block,
          subBlocks: updatedSubBlocks,
        };
      }),
    );

    console.log("Subproyecto o sub-subproyecto creado:", newSubBlock.id);
  };

  const updateBlock = async (
    input: { id: number | string } & Partial<
      Omit<Block, "id"> & Omit<SubBlock, "id">
    >,
  ) => {
    // Send to backend first
    if (typeof input.id === "number") {
      // Update Block in DB
      await axios.put(`http://localhost:5000/api/proyectos/${input.id}`, input);
    } else if (typeof input.id === "string") {
      // Update SubBlock in DB
      await axios.put(`http://localhost:5000/api/sub_proyecto/${input.id}`, {
        ...input,
        startdate: input.startdate?.slice(0, 19).replace("T", " "),
        enddate: input.enddate?.slice(0, 19).replace("T", " "),
      });
    }

    // Update frontend state
    setBlocks((prev) =>
      prev.map((block) => {
        if (typeof input.id === "number" && block.id === input.id) {
          return { ...block, ...input, id: block.id };
        }

        if (typeof input.id === "string") {
          const updatedSubBlocks = updateSubBlocksRecursive(
            block.subBlocks ?? [],
            input as { id: string } & Partial<Omit<SubBlock, "id">>,
          );

          return {
            ...block,
            subBlocks: updatedSubBlocks,
          };
        }

        return block;
      }),
    );
  };

  const updateSubBlocksRecursive = (
    subBlocks: SubBlock[],
    input: { id: string } & Partial<Omit<SubBlock, "id">>,
  ): SubBlock[] => {
    return subBlocks.map((sub) => {
      if (sub.id === input.id) {
        const updatedSub = { ...sub, ...input, id: sub.id };

        // If this block has subBlocks, adjust dates based on subBlocks
        if (updatedSub.subBlocks && updatedSub.subBlocks.length > 0) {
          return adjustDatesFromSubBlocks(updatedSub);
        }

        return updatedSub;
      }

      if (sub.subBlocks) {
        const updatedSub = {
          ...sub,
          subBlocks: updateSubBlocksRecursive(sub.subBlocks, input),
        };

        // After updating subBlocks, adjust this block's dates if needed
        return adjustDatesFromSubBlocks(updatedSub);
      }

      return sub;
    });
  };

  const adjustDatesFromSubBlocks = (block: SubBlock): SubBlock => {
    if (!block.subBlocks || block.subBlocks.length === 0) {
      return block;
    }

    // Get all start and end dates from subBlocks (filter out undefined/null)
    const subStartDates = block.subBlocks
      .map((sub) => sub.startdate)
      .filter((date) => date != null);

    const subEndDates = block.subBlocks
      .map((sub) => sub.enddate)
      .filter((date) => date != null);

    if (subStartDates.length === 0 && subEndDates.length === 0) {
      return block;
    }

    let needsUpdate = false;
    let newStartDate = block.startdate;
    let newEndDate = block.enddate;

    // Check if we need to update start date (earliest subBlock start is earlier than block start)
    if (subStartDates.length > 0) {
      const earliestSubStart = new Date(
        Math.min(...subStartDates.map((d) => new Date(d).getTime())),
      );
      if (!block.startdate || earliestSubStart < new Date(block.startdate)) {
        newStartDate = earliestSubStart.toISOString().split("T")[0]; // Keep as date string (YYYY-MM-DD)
        needsUpdate = true;
      }
    }

    // Check if we need to update end date (latest subBlock end is later than block end)
    if (subEndDates.length > 0) {
      const latestSubEnd = new Date(
        Math.max(...subEndDates.map((d) => new Date(d).getTime())),
      );
      if (!block.enddate || latestSubEnd > new Date(block.enddate)) {
        newEndDate = latestSubEnd.toISOString().split("T")[0]; // Keep as date string (YYYY-MM-DD)
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      return {
        ...block,
        startdate: newStartDate,
        enddate: newEndDate,
      };
    }

    return block;
  };

  const deleteBlock = async (blockId: number) => {
    try {
      // 1️⃣ Find the block to be deleted (and all its subblock IDs)
      const blockToDelete = blocks.find((b) => b.id === blockId);
      if (!blockToDelete) return;

      // Collect all affected subblock IDs (including sub-subblocks)
      const collectSubBlockIds = (subs: SubBlock[]): string[] =>
        subs.flatMap((sub) => [
          sub.id,
          ...(sub.subBlocks ? collectSubBlockIds(sub.subBlocks) : []),
        ]);
      const subBlockIds = collectSubBlockIds(blockToDelete.subBlocks ?? []);
      await deleteImage("proyectos", blockId);
      for (const subBlockId of subBlockIds) {
        await deleteImage("sub_proyecto", subBlockId);
      }
      // 2️⃣ Find all tasks that need to be disassociated
      const affectedTaskIds = new Set<string>();
      blockToDelete.tareas?.forEach((t) => affectedTaskIds.add(t.id));
      blockToDelete.subBlocks?.forEach((sub) => {
        const collectTasks = (s: SubBlock) => {
          s.tareas?.forEach((t) => affectedTaskIds.add(t.id));
          s.subBlocks?.forEach(collectTasks);
        };
        collectTasks(sub);
      });

      // 3️⃣ Disassociate all tasks
      for (const taskId of affectedTaskIds) {
        await updateTask(taskId, { proyecto: undefined, subproyecto: "" });
      }

      // 4️⃣ Update local blocks state
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));

      // 5️⃣ Call backend to delete the block (and cascade subblocks)
      await axios.delete(`http://localhost:5000/api/proyectos/${blockId}`);
      console.log(`Block ${blockId} and its subblocks deleted successfully.`);
    } catch (err) {
      console.error("Error deleting block:", err);
    }
  };

  const buildBlockHierarchy = async (
    projects: Block[],
    subProjects: SubBlock[],
  ) => {
    const subBlockMap = new Map<string, SubBlock>(); // Map by subBlock.id
    const rootProjects = projects.map((p) => ({
      ...p,
      subBlocks: [] as SubBlock[],
    }));

    // Inicializar todos los subproyectos como vacíos
    subProjects.forEach((sub) => {
      sub.subBlocks = [];
      subBlockMap.set(String(sub.id), sub);
    });

    // Enlazar sub-subbloques dentro de su subbloque padre
    subProjects.forEach((sub) => {
      if (sub.parent_sub_id) {
        const parent = subBlockMap.get(String(sub.parent_sub_id));
        if (parent) {
          parent.subBlocks!.push(sub);
        }
      }
    });

    // Enlazar subbloques de primer nivel dentro de los proyectos raíz
    rootProjects.forEach((project) => {
      const subs = subProjects.filter(
        (sub) => sub.parentId === project.id && !sub.parent_sub_id,
      );
      project.subBlocks = subs;
    });

    return rootProjects;
  };

  // Premio handlers
  const createPremio = async (premioInput: Partial<Omit<Premio, "id">>) => {
    const maybeId = await maxid("premios");
    const nextId = typeof maybeId === "number" ? maybeId + 1 : 0;

    const newPremio: Premio = {
      id: nextId,
      nombre: premioInput.nombre || "",
      descripcion: premioInput.descripcion || "",
      fecha_creado: new Date().toISOString(),
      url: premioInput.url || "",
      fav: premioInput.fav || 0,
      esfuerzo: premioInput.esfuerzo || 0,
      tags: premioInput.tags || [],
      color: premioInput.color,
      image: premioInput.image || 0,
      ...premioInput,
    };

    await axios.post("http://localhost:5000/api/premios/", newPremio);
    setPremio((premios_p) => [...premios_p, newPremio]);
  };

  const updatePremio = async (premioId: number, updates: Partial<Premio>) => {
    try {
      await axios.put(`http://localhost:5000/api/premios/${premioId}`, updates);

      // ✅ FIX: Update local state after successful update
      setPremio((prev) =>
        prev.map((p) => (p.id === premioId ? { ...p, ...updates } : p)),
      );
    } catch (error) {
      console.error("Error updating premio:", error);
      throw error;
    }
  };

  const deletePremio = async (premioId: number) => {
    try {
      await axios.delete(`http://localhost:5000/api/premios/${premioId}`);

      // ✅ FIX: Update local state after successful deletion
      setPremio((prev) => prev.filter((p) => p.id !== premioId));

      // ✅ FIX: Also remove premio references from tasks
      setTasks((prev) =>
        prev.map((task) =>
          task.premio === premioId ? { ...task, premio: undefined } : task,
        ),
      );
    } catch (error) {
      console.error("Error deleting premio:", error);
      throw error;
    }
  };

  //Image handler
  const createImage = async (imageInput: Partial<Omit<Image, "id">>) => {
    const maybeId = await maxid("images");
    const nextId = typeof maybeId === "number" ? maybeId + 1 : 0;
    try {
      const newImage: Image = {
        id: nextId,
        table_name: imageInput.table_name || "premios",
        external_id: imageInput.external_id || "",
        image_url: imageInput.image_url || "",
        ...imageInput,
      };

      const response = await axios.post(
        "http://localhost:5000/api/images/",
        newImage,
      );
      setImagen((images_p) => [...images_p, newImage]);
    } catch (error) {
      console.error("Error creating image:", error);
      throw error;
    }
  };

  const updateImage = async (
    tableName: Image["table_name"],
    externalId: string | number,
    updates: Partial<Image>,
  ) => {
    try {
      const imageId = updates.id;
      const normalizedId = String(externalId);
      await axios.put(`http://localhost:5000/api/images/${imageId}`, updates);
      setImagen((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, ...updates } : img)),
      );

      switch (tableName) {
        case "premios":
          await updatePremio(parseInt(normalizedId), { image: imageId });
          break;

        case "task_block":
          await updateTaskBlock(normalizedId, { image: imageId });
          break;

        case "proyectos":
          await updateBlock({ id: parseInt(normalizedId), image: imageId });
          break;

        case "sub_proyecto":
          await updateBlock({ id: normalizedId, image: imageId });
          break;

        case "tareas":
          await updateTask(normalizedId, { imagen: imageId });
          break;

        default:
          console.warn(`Unknown table name: ${tableName}`);
      }
    } catch (error) {
      console.error("Error deleting images by table and id:", error);
      throw error;
    }
  };

  // const uploadImage = async (file: File, tableName: Image['table_name'], externalId: string) => {
  //   try {
  //     const formData = new FormData();
  //     formData.append('file', file);
  //     formData.append('table_name', tableName);
  //     formData.append('external_id', externalId);

  //     const response = await axios.post('http://localhost:5000/api/images/upload', formData, {
  //       headers: {
  //         'Content-Type': 'multipart/form-data'
  //       }
  //     });

  //     // ✅ FIX: Update local state after successful upload
  //     if (response.data) {
  //       setImagen((prev) => [...prev, response.data]);
  //     }

  //     return response.data;
  //   } catch (error) {
  //     console.error("Error uploading image:", error);
  //     throw error;
  //   }
  // };

  function groupByDate(items: { startdate?: string; type?: string }[]) {
    const today = new Date();

    // Start of week (Sunday)
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    // End of week (Saturday)
    const thisWeekEnd = new Date(today);
    thisWeekEnd.setDate(today.getDate() + (6 - today.getDay()));
    thisWeekEnd.setHours(23, 59, 59, 999);

    // Start of month
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    thisMonthStart.setHours(0, 0, 0, 0);

    // End of month
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    thisMonthEnd.setHours(23, 59, 59, 999);

    return {
      thisWeek: items.filter((item) => {
        const startDate = item.startdate ? new Date(item.startdate) : null;
        return (
          startDate && startDate >= thisWeekStart && startDate <= thisWeekEnd
        );
      }),
      thisMonth: items.filter((item) => {
        const startDate = item.startdate ? new Date(item.startdate) : null;
        return (
          startDate &&
          startDate >= thisMonthStart &&
          startDate <= thisMonthEnd &&
          !(startDate >= thisWeekStart && startDate <= thisWeekEnd)
        );
      }),
      other: items.filter((item) => {
        const startDate = item.startdate ? new Date(item.startdate) : null;
        if (item.type === "component") return true;
        return (
          !startDate || startDate < thisMonthStart || startDate > thisMonthEnd
        );
      }),
    };
  }

  function getTypeIcon(type: string, isDarkMode: boolean) {
    const iconClass = isDarkMode
      ? "w-3 h-3 text-gray-400"
      : "w-3 h-3 text-gray-600";
    switch (type) {
      case "weekly":
        return <Calendar className={iconClass} />;
      case "monthly":
        return <Target className={iconClass} />;
      case "project":
      case "component":
        return <Briefcase className={iconClass} />;
      default:
        return <Circle className={iconClass} />;
    }
  }

  function getTabLabel(tabType: string) {
    switch (tabType) {
      case "thisWeek":
        return "Esta Semana";
      case "thisMonth":
        return "Este Mes";
      case "other":
        return "Otros Proyectos";
      default:
        return tabType;
    }
  }

  // Integration handlers
  const selectEvent = (event: Task) => {
    setSelectedEvent(event);

    // If a block is currently selected, associate the event with that block
    if (currentSelectedBlockId) {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === currentSelectedBlockId
            ? { ...block, eventId: event.id }
            : block,
        ),
      );
    }
  };

  const requestAIOperation = async (
    type: "splitTask" | "generateSubBlocks",
    sourceData: any,
    targetId: string,
    setBlocks: any,
  ) => {
    const input =
      type === "splitTask"
        ? `Separate this process into tasks: ${sourceData.summary || "task"}`
        : `Separate this process into tasks: ${sourceData.content || "block"}`;

    // Call AI service
    const responses = await mainIA(input);
    console.log("AI responses:", responses);
    if (!Array.isArray(responses) || responses.length === 0) {
      throw new Error("AI returned no valid results.");
    }

    if (type === "splitTask") {
      await createTasks(responses);
    } else if (type === "generateSubBlocks") {
      setBlocks((prev: any[]) => {
        const maxExistingBlockId =
          prev.length > 0 ? Math.max(...prev.map((block) => block.id)) : 0;

        // Convert AI response into sub-blocks with sequential numeric IDs
        const subBlocks: Block[] = responses.map((response, index) => ({
          id: maxExistingBlockId + index + 1, // Generate sequential numeric IDs
          name: response.summary,
          isExpanded: false,
          tareas: [],
          type: "subcomponent",
          startdate: new Date().toISOString(),
          enddate: new Date().toISOString(),
        }));

        return prev.map((block) =>
          block.id === targetId
            ? {
                ...block,
                subBlocks: [...(block.subBlocks || []), ...subBlocks],
              }
            : block.subBlocks
              ? {
                  ...block,
                  subBlocks: addSubBlocksToParentInSubBlocks(
                    block.subBlocks,
                    parseInt(targetId),
                    subBlocks,
                  ),
                }
              : block,
        );
      });
    }
  };

  const addTasksToBlockInSubBlocks = (
    subBlocks: Block[],
    blockId: s,
    tasks: Task[],
  ): Block[] => {
    return subBlocks.map((block) => {
      if (block.id === blockId) {
        return {
          ...block,
          tasks: [...(block.tareas || []), ...tasks],
        };
      }

      if (block.subBlocks) {
        return {
          ...block,
          subBlocks: addTasksToBlockInSubBlocks(
            block.subBlocks.map((sb) => ({
              ...sb,
              isExpanded: false,
              type: "subcomponent",
              startdate: sb.startdate || new Date().toISOString(),
              enddate: sb.enddate || new Date().toISOString(),
            })),
            blockId,
            tasks,
          ),
        };
      }

      return block;
    });
  };

  const addSubBlocksToParentInSubBlocks = (
    subBlocks: Block[],
    parentId: number,
    newSubBlocks: Block[],
  ): Block[] => {
    return subBlocks.map((block) => {
      if (block.id === parentId) {
        return {
          ...block,
          subBlocks: [...(block.subBlocks || []), ...newSubBlocks],
        };
      }

      if (block.subBlocks) {
        return {
          ...block,
          subBlocks: addSubBlocksToParentInSubBlocks(
            block.subBlocks.map((sb) => ({
              ...sb,
              isExpanded: false,
              type: "subcomponent",
              startdate: sb.startdate || new Date().toISOString(),
              enddate: sb.enddate || new Date().toISOString(),
            })),
            parentId,
            newSubBlocks,
          ),
        };
      }

      return block;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    id: string,
    type: "task" | "block",
  ) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id, type }));

    if (type === "task") {
      setDraggedTaskId(id);
    } else {
      setDraggedBlockId(parseInt(id));
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDraggedBlockId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (
    e: React.DragEvent,
    targetId: string,
    targetType: "task" | "block",
  ) => {
    e.preventDefault();

    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const { id: draggedId, type: draggedType } = data;

      if (draggedType === "task" && targetType === "block") {
        // Handle dropping a task onto a block
        syncTasksWithBlock(draggedId, parseInt(targetId), "add");
      } else if (draggedType === "task" && targetType === "task") {
        // Handle task reordering
        reorderTasks(draggedId, targetId);
      } else if (draggedType === "block" && targetType === "block") {
        // Handle block reordering or nesting
        reorderBlocks(draggedId, targetId);
      }
    } catch (error) {
      console.error("Error parsing drag data:", error);
    }

    setDraggedTaskId(null);
    setDraggedBlockId(null);
  };

  const reorderTasks = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    setTasks((prev) => {
      const draggedIndex = prev.findIndex((t) => t.id === draggedId);
      const targetIndex = prev.findIndex((t) => t.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newTasks = [...prev];
      const [draggedTask] = newTasks.splice(draggedIndex, 1);
      newTasks.splice(targetIndex, 0, draggedTask);

      return newTasks;
    });

    // Also reorder tasks in blocks
    setBlocks((prev) =>
      prev.map((block) => {
        if (
          block.tareas?.some((t) => t.id === draggedId) &&
          block.tareas?.some((t) => t.id === targetId)
        ) {
          const draggedIndex = block.tareas.findIndex(
            (t) => t.id === draggedId,
          );
          const targetIndex = block.tareas.findIndex((t) => t.id === targetId);

          const newTasks = [...block.tareas];
          const [draggedTask] = newTasks.splice(draggedIndex, 1);
          newTasks.splice(targetIndex, 0, draggedTask);

          return { ...block, tasks: newTasks };
        }

        if (block.subBlocks) {
          return {
            ...block,
            subBlocks: reorderTasksInSubBlocks(
              block.subBlocks.map((sb) => ({
                ...sb,
                isExpanded: false,
                type: "subcomponent",
                startdate: sb.startdate || new Date().toISOString(),
                enddate: sb.enddate || new Date().toISOString(),
              })),
              draggedId,
              targetId,
            ),
          };
        }

        return block;
      }),
    );
  };

  const reorderTasksInSubBlocks = (
    subBlocks: Block[],
    draggedId: string,
    targetId: string,
  ): Block[] => {
    return subBlocks.map((block) => {
      if (
        block.tareas?.some((t) => t.id === draggedId) &&
        block.tareas?.some((t) => t.id === targetId)
      ) {
        const draggedIndex = block.tareas.findIndex((t) => t.id === draggedId);
        const targetIndex = block.tareas.findIndex((t) => t.id === targetId);

        const newTasks = [...block.tareas];
        const [draggedTask] = newTasks.splice(draggedIndex, 1);
        newTasks.splice(targetIndex, 0, draggedTask);

        return { ...block, tasks: newTasks };
      }

      if (block.subBlocks) {
        return {
          ...block,
          subBlocks: reorderTasksInSubBlocks(
            block.subBlocks.map((sb) => ({
              ...sb,
              isExpanded: false,
              type: "subcomponent",
              startdate: sb.startdate || new Date().toISOString(),
              enddate: sb.enddate || new Date().toISOString(),
            })),
            draggedId,
            targetId,
          ),
        };
      }

      return block;
    });
  };

  const reorderBlocks = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    // Check if both blocks are at the top level
    const draggedBlockIndex = blocks.findIndex(
      (b) => String(b.id) === draggedId,
    );
    const targetBlockIndex = blocks.findIndex((b) => String(b.id) === targetId);

    if (draggedBlockIndex !== -1 && targetBlockIndex !== -1) {
      // Both blocks are at the top level, reorder them
      setBlocks((prev) => {
        const newBlocks = [...prev];
        const [draggedBlock] = newBlocks.splice(draggedBlockIndex, 1);
        newBlocks.splice(targetBlockIndex, 0, draggedBlock);
        return newBlocks;
      });
      return;
    }

    // Handle nested blocks
    setBlocks((prev) =>
      reorderNestedBlocks(prev, parseInt(draggedId), parseInt(targetId)),
    );
  };

  const reorderNestedBlocks = (
    blocks: Block[],
    draggedId: number,
    targetId: number,
  ): Block[] => {
    // Find the parent block containing the dragged block
    let draggedBlock: Block | null = null;
    let draggedBlockParent: Block | null = null;

    const findDraggedBlock = (
      blocks: Block[],
      parentBlock: Block | null = null,
    ): boolean => {
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === draggedId) {
          draggedBlock = blocks[i];
          draggedBlockParent = parentBlock;
          return true;
        }

        if (
          blocks[i].subBlocks?.length &&
          findDraggedBlock(
            (blocks[i].subBlocks ?? []).map((sb) => ({
              ...sb,
              isExpanded: false,
              type: "subcomponent",
              startdate: sb.startdate || new Date().toISOString(),
              enddate: sb.enddate || new Date().toISOString(),
            })),
            blocks[i],
          )
        ) {
          return true;
        }
      }

      return false;
    };

    findDraggedBlock(blocks);

    if (!draggedBlock) return blocks;

    // Find the target block
    let targetBlock: Block | null = null;
    let targetBlockParent: Block | null = null;

    const findTargetBlock = (
      blocks: Block[],
      parentBlock: Block | null = null,
    ): boolean => {
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === targetId) {
          targetBlock = blocks[i];
          targetBlockParent = parentBlock;
          return true;
        }
        if (
          blocks[i].subBlocks?.length &&
          findDraggedBlock(
            (blocks[i].subBlocks ?? []).map((sb) => ({
              ...sb,
              isExpanded: false,
              type: "subcomponent",
              startdate: sb.startdate || new Date().toISOString(),
              enddate: sb.enddate || new Date().toISOString(),
            })),
            blocks[i],
          )
        ) {
          return true;
        }
      }

      return false;
    };

    findTargetBlock(blocks);

    if (!targetBlock) return blocks;

    // Remove the dragged block from its current position
    const removeBlock = (blocks: Block[], blockId: number): Block[] => {
      return blocks.filter((block) => {
        if (block.id === blockId) {
          return false;
        }

        if (block.subBlocks) {
          block.subBlocks = removeBlock(
            block.subBlocks.map((sb) => ({
              ...sb,
              isExpanded: false,
              type: "subcomponent",
              startdate: sb.startdate || new Date().toISOString(),
              enddate: sb.enddate || new Date().toISOString(),
            })),
            blockId,
          );
        }

        return true;
      });
    };

    let updatedBlocks = [...blocks];
    updatedBlocks = removeBlock(updatedBlocks, draggedId);

    // Add the dragged block to its new position
    const addBlockToTarget = (
      blocks: Block[],
      targetId: number,
      blockToAdd: Block,
    ): Block[] => {
      return blocks.map((block) => {
        if (block.id === targetId) {
          return {
            ...block,
            subBlocks: [...(block.subBlocks || []), blockToAdd],
          };
        }

        if (block.subBlocks) {
          return {
            ...block,
            subBlocks: addBlockToTarget(
              block.subBlocks.map((sb) => ({
                ...sb,
                isExpanded: false,
                type: "subcomponent",
                startdate: sb.startdate || new Date().toISOString(),
                enddate: sb.enddate || new Date().toISOString(),
              })),
              targetId,
              blockToAdd,
            ),
          };
        }

        return block;
      });
    };

    return addBlockToTarget(updatedBlocks, targetId, draggedBlock);
  };

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          tasksRes,
          blocksRes,
          taskBlockRes,
          subBlockRes,
          premioRes,
          imagenRes,
        ] = await Promise.all([
          axios.get<Task[]>(`http://localhost:5000/api/tareas`),
          axios.get<Block[]>(`http://localhost:5000/api/proyectos`),
          axios.get<TaskBlock[]>(`http://localhost:5000/api/task_block`),
          axios.get<SubBlock[]>(`http://localhost:5000/api/sub_proyecto`),
          axios.get<Premio[]>(`http://localhost:5000/api/premios`),
          axios.get<Image[]>(`http://localhost:5000/api/images`),
        ]);

        setTasks(tasksRes.data);
        setBlocks(blocksRes.data);
        setTaskBlock(taskBlockRes.data);
        setSubBlock(subBlockRes.data);
        setPremio(premioRes.data);
        setImagen(imagenRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const syncData = async () => {
      try {
        if (skipNextSync) {
          setSkipNextSync(false);
          return;
        }

        const sync = async (endpoint: string, data: unknown, label: string) => {
          if (Array.isArray(data) && data.length > 0) {
            await axios.put(`http://localhost:5000/api/${endpoint}`, data);
            console.log(`${label} synced successfully`);
          }
        };

        await Promise.all([
          sync("tareas", tasks, "Tareas"),
          sync("proyectos", blocks, "Projects"),
          sync("task_block", taskBlocks, "TaskBlocks"),
          sync("sub_proyecto", subBlocks, "SubProjects"),
          sync("premios", premios, "Premios"),
          sync("images", imagenes, "Images"),
        ]);
      } catch (error) {
        console.error("Error syncing data:", error);
      }
    };

    syncData();
  }, [tasks, blocks, subBlocks, taskBlocks, premios, imagenes, skipNextSync]);

  return (
    <ProjectContext.Provider
      value={{
        tasks,
        taskBlocks,
        blocks,
        subBlocks,
        premios,
        imagenes,

        setTasks,
        setTaskBlock,
        setBlocks,
        setSubBlock,
        setPremio,
        setImagen,

        createTask,
        createTasks,
        updateTask,
        deleteTask,
        createTaskBlock,
        updateTaskBlock,
        deleteTaskBlock,
        createBlock,
        createSubBlock,
        updateBlock,
        deleteBlock,
        buildBlockHierarchy,
        createPremio,
        updatePremio,
        deletePremio,
        createImage,
        updateImage,
        deleteImage,

        selectedEvent,
        draggedTaskId,
        draggedBlockId,
        currentSelectedBlockId,
        isLoading,

        groupByDate,
        getTabLabel,
        getTypeIcon,
        selectEvent,
        requestAIOperation,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDrop,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

// Custom hook to use the proyecto context
export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};
