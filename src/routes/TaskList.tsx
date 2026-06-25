"use client";

import React from "react";

import { useMemo } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { useState, useRef, useCallback, useEffect, useContext } from "react";
import { Button } from "~/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Target,
  Briefcase,
  Plus,
  GripVertical,
  Moon,
  Sun,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DragUpdate,
} from "@hello-pangea/dnd";
import { format, addDays, parseISO } from "date-fns";
import { WeekView } from "./week-view";
import {
  formatDate,
  getWeekDays,
  formatWeekRange,
  isSameDayCheck,
} from "./week-view";
import { TaskEditor } from "./task-editor";
import { Badge } from "~/components/ui/badge";
import { ObjectivesTab } from "./objetivos-tab";
import {
  Task,
  Block,
  Vista,
  TaskItemProps,
  TaskPosition,
  TaskBlock,
} from "~/lib/types";
import {
  formatDateForSQL,
  formatDateShort,
  isSameLimaDay,
} from "~/lib/calendario";
import { MobileTimePicker } from "~/lib/timepicker";
import { coloresui } from "~/lib/calendario";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import FloatingButton from "./FloatingButton";
import { generateImageWithComfyUI } from "./cositos/prueba";
import { useProject } from "./proyecto-utils";
import { Premios } from "./Premios";
import WeeklySchedule from "./cositos/dias";
import { useGetData, ViewMode } from "./Main";

const timeZone = "America/Lima";
// Define drag item types
const DRAG_TYPES = {
  TASK: "task",
  SUBTASK: "subtask",
  REWARD: "premio",
  AIM: "aim",
};

const TaskItem = React.memo(
  ({
    task,
    setDragOverTaskId,
    onDeleteTask,
    onToggleCompletion,
    onUpdateTask,
    editTask,
    editEvent,
    onTaskDropped,
    onCreateBlockWithTasks,
    blockColor,
  }: TaskItemProps & {
    onCreateBlockWithTasks: (draggedId: string, targetId: string) => void;
    accessToken: string;
  }) => {
    const [isDarkMode] = useState(false);
    const [inlineEditingTaskId, setInlineEditingTaskId] = useState<string>("");
    const [inlineEditText, setInlineEditText] = useState("");
    const [dropPosition, setDropPosition] = useState<"above" | "below" | null>(
      null,
    );
    const [showCreateBlock, setShowCreateBlock] = useState(false);
    const inlineInputRef = useRef<HTMLInputElement>(null);
    const dropRef = useRef<HTMLDivElement | null>(null);
    const tag = task.tags ?? [];
    const eventColor = coloresui[0].Tareas ?? task.tags?.[0]?.color;

    const handleTimeChange = (newStart: string, newEnd: string) => {
      onUpdateTask(task.id, {
        ...task,
        start: { dateTime: newStart, timeZone: timeZone },
        end: { dateTime: newEnd, timeZone: timeZone },
      });
    };

    // In the TaskItem component, update the useDrop hook:
    const [{ isOver }, drop] = useDrop(() => ({
      accept: [
        DRAG_TYPES.TASK,
        DRAG_TYPES.SUBTASK,
        DRAG_TYPES.REWARD,
        DRAG_TYPES.AIM,
      ],
      drop: (item: Task, monitor) => {
        // Only process if this is the actual drop target
        if (!monitor.didDrop() && item.id !== task.id) {
          onTaskDropped(item.id, task.id, dropPosition);
          setDropPosition(null);
          setShowCreateBlock(false);
        }
      },
      hover: (item, monitor) => {
        if (!dropRef.current || (item.isEvent != null && item.id === task.id))
          return;

        // Clear any lingering states when hover ends
        if (!monitor.isOver()) {
          setDragOverTaskId(null);
          setDropPosition(null);
          setShowCreateBlock(false);
          return;
        }

        const hoverBoundingRect = dropRef.current.getBoundingClientRect();
        const hoverMiddleY =
          (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();

        if (!clientOffset) return;

        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        const isAbove = hoverClientY < hoverMiddleY;

        setDragOverTaskId(task.id);
        setDropPosition(isAbove ? "above" : "below");

        if (!task.proyecto) {
          setShowCreateBlock(true);
        }
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver({ shallow: true }),
      }),
    }));

    // Update the drag preview setup
    const [{ isDragging }, drag, preview] = useDrag(() => ({
      type: task.proyecto ? DRAG_TYPES.SUBTASK : DRAG_TYPES.TASK,
      item: { id: task.id, blockId: task.proyecto },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
      end: (item, monitor) => {
        // Clean up any lingering states when drag ends
        setDragOverTaskId(null);
        setDropPosition(null);
        setShowCreateBlock(false);
      },
    }));

    // Add this style to prevent ghost images
    useEffect(() => {
      // Create an empty div element to use as preview
      const emptyPreview = document.createElement("div");
      emptyPreview.style.opacity = "0";

      // Set the empty preview
      preview(emptyPreview, { captureDraggingState: true });
    }, [preview]);

    // Add cleanup on component unmount
    useEffect(() => {
      return () => {
        setDragOverTaskId(null);
        setDropPosition(null);
        setShowCreateBlock(false);
      };
    }, []);

    // Create block drop zone
    const [{ isOver: isOverCreateBlock }, createBlockDrop] = useDrop(() => ({
      accept: [DRAG_TYPES.TASK, DRAG_TYPES.SUBTASK],
      drop: (item: { id: string }, monitor) => {
        if (monitor.didDrop() || item.id === task.id) return;
        onCreateBlockWithTasks(item.id, task.id);
        setShowCreateBlock(false);
      },
      hover: () => {
        setDragOverTaskId(task.id);
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }));
    // Editores -in line
    const saveInlineEdit = () => {
      if (inlineEditText.trim()) {
        onUpdateTask(task.id, { summary: inlineEditText.trim() });
        setInlineEditingTaskId("");
      }
    };

    const handleInlineKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        saveInlineEdit();
      } else if (e.key === "Escape") {
        setInlineEditingTaskId("");
      }
    };

    const startInlineEditing = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInlineEditingTaskId(task.id);
      setInlineEditText(task.summary);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = () => {
      setDragOverTaskId(null);
      setDropPosition(null);
      setShowCreateBlock(false);
    };

    return (
      <div
        ref={preview}
        className={`task-item ${isOver ? "task-item-drag-over" : ""}`}
        style={{
          opacity: isDragging ? 0.4 : 1,
          cursor: "relative",
          display: "flex",
          flexDirection: "row",
          width: "full",
        }}
      >
        {!task.proyecto && showCreateBlock && (
          <div
            style={{ background: "gray" }}
            className={`flex relative items-center justify-center w-9 h-9 mx-1  rounded-full cursor-pointer
            hover:scale-110
            transform ease-in-out transition-all duration-200
            `}
          >
            <Plus
              size={16}
              ref={createBlockDrop}
              className={`
              text-white
              ${isOverCreateBlock ? "text-white" : "text-white"}`}
            />
          </div>
        )}
        {task.isEvent !== true ? (
          <div
            ref={(node) => {
              drag(node);
              drop(node);
              if (node) dropRef.current = node;
            }}
            className={`flex relative justify-between w-full task-drop-indicator ${dropPosition === "above" ? "drop-above" : ""} ${dropPosition === "below" ? "drop-below" : ""}`}
            id={`${task.id}`}
            style={{ fontSize: task.proyecto ? "0.9em" : "1em" }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex items-center content-cente w-[85%]">
              <button
                onClick={() => onToggleCompletion(task.id)}
                className="flex-shrink-0 zIndex-0"
                aria-label={
                  task.transparency == "opaque"
                    ? "Uncomplete task"
                    : "Complete task"
                }
              >
                {task.transparency == "transparent" ? (
                  <CheckCircle2
                    className="w-6 h-6 mx-1 bg-white"
                    style={{ color: blockColor }}
                    id={`task-point-${task.id}`}
                  />
                ) : (
                  <Circle
                    className="w-6 h-6 mx-1 bg-white"
                    style={{ color: blockColor }}
                    id={`task-point-${task.id}`}
                  />
                )}
              </button>

              {task.transparency == "transparent" ? (
                <span
                  className="line-through truncate content-center"
                  style={{ color: blockColor }}
                >
                  {task.summary}
                </span>
              ) : inlineEditingTaskId === task.id ? (
                <input
                  ref={inlineInputRef}
                  value={inlineEditText}
                  onChange={(e) => setInlineEditText(e.target.value)}
                  onBlur={saveInlineEdit}
                  onKeyDown={handleInlineKeyDown}
                  className={`content-center w-full font-medium border-b-2 border-[${blockColor}] focus:outline-none ${
                    isDarkMode
                      ? "bg-gray-800 text-white"
                      : "bg-white text-gray-900"
                  }`}
                  placeholder="Nombre de la tarea"
                  autoFocus
                />
              ) : (
                <div>
                  <span
                    className={`font-medium content-center cursor-pointer hover:text-blue-600 truncate ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                    onClick={startInlineEditing}
                  >
                    {task.summary || "Nueva tarea"}
                  </span>
                  {tag.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      {tag[0].color}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-evenly items-center">
              <Edit
                className="h-5 w-5"
                stroke={blockColor}
                onClick={() => editTask(task)}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                onClick={(e) => onDeleteTask(task.id, e)}
                title="Eliminar"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`flex relative justify-between w-full p-2 rounded-lg border text-white`}
            style={{
              backgroundColor: eventColor,
              fontSize: task.proyecto ? "0.9em" : "1em",
            }}
            ref={(node) => {
              drag(node);
              drop(node);
              if (node) dropRef.current = node;
            }}
            id={`${task.id}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex items-center content-cente w-[85%] mr-1">
              <button
                onClick={() => onToggleCompletion(task.id)}
                className="flex-shrink-0 zIndex-0"
                aria-label={
                  task.transparency == "opaque"
                    ? "Uncomplete task"
                    : "Complete task"
                }
              >
                {task.transparency == "transparent" ? (
                  <CheckCircle2
                    className={`w-6 h-6 mx-1 bg-[${eventColor}]`}
                    // style={{ color: "white" }}
                    id={`task-point-${task.id}`}
                  />
                ) : (
                  <Circle
                    className={`w-6 h-6 mx-1 bg-[${eventColor}]`}
                    // style={{ color: "white" }}
                    id={`task-point-${task.id}`}
                  />
                )}
              </button>
              {task.transparency == "transparent" ? (
                <span
                  className="line-through truncate content-center"
                  style={{ color: "white" }}
                >
                  {task.summary}
                </span>
              ) : inlineEditingTaskId === task.id ? (
                <input
                  ref={inlineInputRef}
                  value={inlineEditText}
                  onChange={(e) => setInlineEditText(e.target.value)}
                  onBlur={saveInlineEdit}
                  onKeyDown={handleInlineKeyDown}
                  className={`content-center w-full font-medium border-b-2 border-[${eventColor}] focus:outline-none ${
                    isDarkMode
                      ? "bg-gray-800 text-white"
                      : "bg-white text-gray-900"
                  }`}
                  placeholder="Nombre de la tarea"
                  autoFocus
                />
              ) : (
                <div className="flex flex-col items-left">
                  <span
                    className={`font-semibold content-center cursor-pointer hover:text-blue-600 truncate text-white`}
                    onClick={startInlineEditing}
                  >
                    {task.summary || "Nuevo evento"}
                  </span>
                  <div className="flex flex-row gap-1 items-center">
                    {task.isEvent && (
                      <MobileTimePicker
                        startTime={task.start.dateTime || "09:00"}
                        endTime={task.end.dateTime || "10:00"}
                        onTimeChange={handleTimeChange}
                      />
                    )}
                    <span className="text-white text-xs">
                      Repetir
                      {task.recurrence &&
                        task.recurrence.map((rule) => (
                          <span key={rule}> {rule} </span>
                        ))}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-evenly items-center">
              <Edit
                className="h-5 w-5"
                stroke="white"
                onClick={() => editEvent(task)}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:text-red-700 hover:bg-red-100"
                onClick={(e) => onDeleteTask(task.id, e)}
                title="Eliminar"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

const TaskBlockComponent = ({
  block,
  setTaskBlocks,
  tasks,
  setTasks,
  animatingConnection,
  addConsecutiveTask,
  dragOverTaskId,
  setDragOverTaskId,
  onDeleteTask,
  onToggleCompletion,
  onBlockToggleCompletion,
  onCreateBlockWithTasks,
  onUpdateTask,
  editTask,
  editEvent,
  onTaskDropped,
}: {
  block: TaskBlock;
  setTaskBlocks: React.Dispatch<React.SetStateAction<TaskBlock[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  animatingConnection: string | null;
  addConsecutiveTask: (blockId: string, text?: string) => void;
  dragOverTaskId: string | null;
  setDragOverTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  onDeleteTask: (taskId: string, e: React.MouseEvent) => void;
  onToggleCompletion: (taskId: string) => void;
  onBlockToggleCompletion: (blockId: string) => void;
  onCreateBlockWithTasks: (draggedId: string, targetId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  editTask: (task: Task) => void;
  editEvent: (task: Task) => void;
  onTaskDropped: (
    draggedId: string,
    targetId: string,
    dropPosition: any,
  ) => void;
}) => {
  const [inlineEditingBlockId, setInlineEditingBlockId] = useState<string>("");
  const [inlineEditText, setInlineEditText] = useState("");
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [blockColor, setBlockColor] = useState(coloresui[0].Tareas);

  useEffect(() => {
    const blockTasks =
      block.tareas
        ?.map((tid) => tasks.find((task) => task.id === tid.id))
        .filter((task): task is Task => Boolean(task)) || [];
    const tasksWithTags = blockTasks.filter(
      (task) => task.tags && task.tags.length > 0,
    );
    let newColor = coloresui[0].Tareas; // default color

    // Case A: Only one task has a tag
    if (
      tasksWithTags.length === 1 &&
      tasksWithTags[0].tags &&
      tasksWithTags[0].tags.length > 0
    ) {
      newColor = tasksWithTags[0].tags[0].color;
    }
    // Case B: More than 50% share same tag color
    else if (tasksWithTags.length > 0) {
      const tagColorCounts: { [key: string]: number } = {};
      tasksWithTags.forEach((task) => {
        if (task.tags && task.tags.length > 0) {
          const color = task.tags[0].color;
          tagColorCounts[color] = (tagColorCounts[color] || 0) + 1;
        }
      });

      const [mostCommonColor, count] = Object.entries(tagColorCounts).reduce(
        (max, current) => (current[1] > max[1] ? current : max),
        ["", 0],
      );

      if (count > tasksWithTags.length / 2) {
        newColor = mostCommonColor;
      }
    }

    // Update both local state and block color in taskBlocks
    setBlockColor(newColor);
    setTaskBlocks((prev) =>
      prev.map((b) => (b.id === block.id ? { ...b, color: newColor } : b)),
    );
  }, [block.tareas, tasks]);

  const startInlineEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEditingBlockId(block.id);
    setInlineEditText(block.title);
  };

  const blockTasks = useMemo(() => {
    if (!block.tareas) return [];

    return block.tareas
      .map((tid) => tasks.find((task) => task.id === tid.id))
      .filter((task): task is Task => Boolean(task)); // Type guard to remove undefined
  }, [tasks, block]);

  const toggleBlockExpanded = () => {
    setTaskBlocks((prev) =>
      prev.map((b) =>
        b.id === block.id ? { ...b, expanded: !b.expanded } : b,
      ),
    );
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveInlineEdit();
    } else if (e.key === "Escape") {
      setInlineEditingBlockId("");
    }
  };

  const handleDeleteBlock = () => {
    const tareaIds = new Set(
      block.tareas?.map((t) => t.id).filter((id): id is string => Boolean(id)),
    );
    if (allCompleted) {
      // Delete all tasks in the block
      setTasks((prev) => prev.filter((task) => !tareaIds.has(task.id)));
    } else {
      // Convert tasks to standalone (remove blockId)
      setTasks((prev) =>
        prev.map((task) =>
          tareaIds.has(task.id) ? { ...task, blockId: undefined } : task,
        ),
      );
    }

    // Remove the block itself
    setTaskBlocks((prev) => prev.filter((b) => b.id !== block.id));
  };

  // Editores -in line
  const saveInlineEdit = () => {
    if (inlineEditingBlockId && inlineEditText.trim()) {
      onUpdateTask(block.id, { summary: inlineEditText.trim() });
      setInlineEditingBlockId("");
    }
  };

  // Drop handler for adding tasks to block
  const [{ isOver: isHeaderOver }, dropHeader] = useDrop(() => ({
    accept: [DRAG_TYPES.TASK],
    drop: (item: { id: string }) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === item.id ? { ...task, bloque_tareas: block.id } : task,
        ),
      );
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const allCompleted = useMemo(() => {
    return (
      blockTasks.length > 0 &&
      blockTasks.every((task) => task.transparency === "transparent")
    );
  }, [blockTasks]);

  return (
    <div
      ref={dropHeader}
      className={`flex flex-col p-2  ${isHeaderOver ? "ring-2 ring-blue-500" : ""}`}
      style={{
        borderColor: blockColor,
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "8px",
      }}
    >
      <div className="font-bold flex justify-between items-center mb-2">
        <div className="flex items-center w-full">
          <button
            onClick={() => onBlockToggleCompletion(block.id)}
            aria-label={
              allCompleted ? "Uncomplete routine" : "Complete routine"
            }
          >
            {allCompleted ? (
              <CheckCircle2
                className="w-6 h-6 mx-1"
                style={{ color: blockColor }}
                id={`task-point-${block.id}`}
              />
            ) : (
              <Circle
                className="w-6 h-6 mx-1 bg-white"
                style={{ color: blockColor }}
                id={`task-point-${block.id}`}
              />
            )}
          </button>

          {allCompleted ? (
            <span
              style={{ color: blockColor }}
              className={allCompleted ? `font-semibold` : ""}
            >
              {block.title}
            </span>
          ) : inlineEditingBlockId === block.id ? (
            <input
              ref={inlineInputRef}
              value={inlineEditText}
              onChange={(e) => setInlineEditText(e.target.value)}
              onBlur={saveInlineEdit}
              onKeyDown={handleInlineKeyDown}
              className={`w-full font-semibold border-b-2 border-[${blockColor}] focus:outline-none ${
                isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
              }`}
              autoFocus
            />
          ) : (
            <span
              className={`font-semibold cursor-pointer hover:text-blue-600 truncate ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
              onClick={startInlineEditing}
            >
              {block.title || "Nueva tarea"}
            </span>
          )}
        </div>
        <div className="flex items-center">
          <button
            onClick={handleDeleteBlock}
            className="text-red-500 hover:text-red-700 ml-2"
            title="Delete block"
          >
            <Trash2 size={18} />
          </button>
          <button onClick={toggleBlockExpanded} className="ml-2">
            <ChevronDown
              className={`transition-transform ${
                block.expanded ? "" : "rotate-180"
              }`}
            />
          </button>
        </div>
      </div>

      {block.expanded && (
        <div className="space-y-2">
          {blockTasks.map((task) => (
            <TaskItem
              key={task.id + String(task.isEvent)}
              task={task}
              tasks={tasks}
              setTasks={setTasks}
              animatingConnection={animatingConnection}
              dragOverTaskId={dragOverTaskId}
              setDragOverTaskId={setDragOverTaskId}
              onDeleteTask={onDeleteTask}
              onToggleCompletion={onToggleCompletion}
              onUpdateTask={onUpdateTask}
              editTask={editTask}
              editEvent={editEvent}
              onTaskDropped={onTaskDropped}
              onCreateBlockWithTasks={onCreateBlockWithTasks}
              accessToken={""} // Pass the access token if needed
              blockColor={blockColor}
            />
          ))}

          <button
            onClick={() => addConsecutiveTask(block.id)}
            className={`flex items-center text-sm text-[${blockColor}] mt-2`}
          >
            <Plus size={14} className="mr-1" />
            Añadir a rutina
          </button>
        </div>
      )}
    </div>
  );
};

interface AnimatedTaskManagerProps {
  accessToken: string;
  setCurrentView: (view: Vista) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const AnimatedTaskManager: React.FC<AnimatedTaskManagerProps> = ({
  accessToken,
  setCurrentView,
  onDragStateChange,
  viewMode,
  setViewMode,
}) => {
  const [taskPositions, setTaskPositions] = useState<TaskPosition>({});
  const [nextId, setNextId] = useState(1);
  const [animatingConnection, setAnimatingConnection] = useState<string | null>(
    null,
  );
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(
    {},
  );
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const [taskBlocks, setTaskBlocks] = useState<TaskBlock[]>([]);
  const {
    tasks,
    blocks,
    setTasks,
    createTask,
    updateTask,
    handleDragStart,
    deleteTask,
  } = useProject();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPremiosDrawer, setShowPremiosDrawer] = useState(false);
  const [showAimsDrawer, setShowAimsDrawer] = useState(false);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(
    "crear_tarea",
  );
  const [newTaskText, setNewTaskText] = useState<string>("");
  const [newStartTime, setNewStartTime] = useState<Date | null>();
  const [newEndTime, setNewEndTime] = useState<Date | null>();
  const [abrirRelojito, setAbrirRelojito] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [googleTasks, setGoogleTasks] = useState<any[]>([]);

  const { getEventsAndTasks } = useGetData(accessToken);

  function hasChanges(event: any, dbTask: Task): boolean {
    const diffs: string[] = [];

    const checkDiff = (key: string, a: any, b: any) => {
      const aStr = JSON.stringify(a ?? null);
      const bStr = JSON.stringify(b ?? null);
      if (aStr !== bStr) {
        diffs.push(`→ ${key} changed:\n   DB    → ${aStr}\n   EVENT → ${bStr}`);
        return true;
      }
      return false;
    };

    let changed = false;

    changed ||= checkDiff("summary", event.summary, dbTask.summary);
    changed ||= checkDiff("description", event.description, dbTask.description);
    changed ||= checkDiff("htmlLink", event.htmlLink, dbTask.htmlLink);
    changed ||= checkDiff("start", event.start, dbTask.start);
    changed ||= checkDiff("end", event.end, dbTask.end);
    changed ||= checkDiff("recurrence", event.recurrence, dbTask.recurrence);
    changed ||= checkDiff("reminders", event.reminders, dbTask.reminders);
    changed ||= checkDiff("eventType", event.eventType, dbTask.eventType);
    changed ||= checkDiff(
      "transparency",
      event.transparency,
      dbTask.transparency,
    );
    changed ||= checkDiff("colorId", event.colorId, dbTask.colorId);

    // if (dbTask.isEvent !== true) {
    //   diffs.push(`→ isEvent changed:\n   DB    → ${dbTask.isEvent}\n   EVENT → true`);
    //   changed = true;
    // }

    if (changed) {
      console.log(
        `🔄 Differences found for task with google_id "${event.id}":`,
      );
      console.log(diffs.join("\n"));
    }

    return changed;
  }

  const loadData = useCallback(async () => {
    const data = await getEventsAndTasks();

    if (!data) return;
    const { todayData, weekData } = data;
    setGoogleTasks(weekData);
  }, [getEventsAndTasks]);

  useEffect(() => {
    if (!accessToken) return;

    loadData(); // initial fetch

    const interval = setInterval(() => {
      loadData(); // periodic refresh
    }, 60 * 1000); // every 60 seconds

    return () => clearInterval(interval); // cleanup on unmount or dependency change
  }, [accessToken, loadData]);

  const dbTaskMap = new Map(tasks.map((task) => [task.id, task]));

  for (const googleEvent of googleTasks) {
    const {
      id,
      summary,
      description,
      htmlLink,
      start,
      end,
      recurrence,
      reminders,
      eventType,
      transparency,
      colorId,
    } = googleEvent;
    const dbTask = dbTaskMap.get(id);
    const isevent = start.date ? false : true;
    const evento = isevent ? "crear_evento" : "crear_tarea";
    const inicio = !isevent ? start.date : start.dateTime;
    const fin = !isevent ? start.date : end.dateTime;

    if (dbTask && hasChanges(googleEvent, dbTask)) {
      tasks.find((task) => task.id === id)
        ? null
        : updateTask(dbTask.id, {
            summary,
            description,
            htmlLink,
            start: inicio,
            end: fin,
            recurrence,
            reminders,
            eventType,
            transparency,
            colorId,
            isEvent: isevent,
          });
    } else {
      createTask(evento, summary, {
        id,
        description,
        htmlLink,
        start: inicio,
        end: fin,
        recurrence,
        reminders,
        eventType,
        transparency,
        colorId,
      });
    }
    // else: skip (already up-to-date)
  }

  const handleCreateBlockWithTasks = useCallback(
    (draggedId: string, targetId: string) => {
      setTasks((prevTasks: Task[]) => {
        const draggedTask = prevTasks.find((task) => task.id === draggedId);
        const targetTask = prevTasks.find((task) => task.id === targetId);

        if (!draggedTask || !targetTask) {
          return prevTasks;
        }

        let tipo: "task" | "event" | "both" = "both";
        if (draggedTask.isEvent && targetTask.isEvent) {
          tipo = "event";
        } else if (!draggedTask.isEvent && !targetTask.isEvent) {
          tipo = "task";
        }

        // Get the color from either task's tag if available
        let blockColor = coloresui[0].Tareas; // default color
        if (draggedTask?.tags?.[0]?.color || targetTask?.tags?.[0]?.color) {
          blockColor =
            draggedTask?.tags?.[0]?.color ||
            targetTask?.tags?.[0]?.color ||
            coloresui[0].Tareas;
        }

        const newBlockId = `block-${Date.now()}`;
        const blockCount = taskBlocks.length;

        // Create new block with the determined color
        const newBlock: TaskBlock = {
          id: newBlockId,
          title: `Routine ${blockCount + 1}`,
          tareas: [draggedTask, targetTask],
          type: tipo,
          expanded: true,
          color: blockColor, // Set the block color here
        };

        setTaskBlocks((prev) => [...prev, newBlock]);

        return prevTasks.map((task: Task) => {
          if (task.id === draggedId || task.id === targetId) {
            return {
              ...task,
              blockId: newBlockId,
            } as Task;
          }
          return task;
        });
      });
    },
    [taskBlocks, setTaskBlocks],
  );

  const addTask = useCallback(
    async (status: string, title: string, start?: Date, end?: Date) => {
      try {
        if (status === "crear_tarea") {
          const createdTask = await createTask(status, title);
          setTasks((prev) => [...prev, createdTask as Task]);
          // You may or may not want to setSelectedTask here depending on use case
        } else if (status === "crear_evento") {
          const options = {
            start: start,
            end: end,
          };
          // If start and end are provided, create an event
          const createdTask = await createTask(status, title, options);
          if (createdTask) {
            setSelectedTask(createdTask);
            setTasks((prev) => [...prev, createdTask as Task]);
            setAbrirRelojito(true);
          }
        }

        setNextId((prev) => prev + 1);
        setNewTaskText("");
        setNewEndTime(null);
        setNewStartTime(null);
      } catch (error) {
        console.error("Failed to create task:", error);
      }
    },
    [createTask],
  );

  const handleNewTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTaskText?.trim()) {
      if (selectedStatus === "crear_tarea") {
        addTask(selectedStatus, newTaskText);
      } else if (selectedStatus === "crear_evento") {
        addTask(
          selectedStatus,
          newTaskText,
          newStartTime as Date,
          newEndTime as Date,
        );
      }
    }
  };

  // Add these handlers:
  const handleDeleteTask = useCallback(
    (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      deleteTask(taskId);
      // Update blocks if needed
      setTaskBlocks((prevBlocks) =>
        prevBlocks.map((block) => ({
          ...block,
          taskIds: block.tareas?.filter((t) => t.id !== taskId),
        })),
      );
    },
    [],
  );

  const handleToggleCompletion = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, cumplido: task.transparency !== "opaque" }
          : task,
      ),
    );
  }, []);

  const handleBlockToggleCompletion = useCallback(
    (blockId: string) => {
      setTasks((prevTasks) => {
        // Find the block
        const block = taskBlocks.find((b) => b.id === blockId);
        if (!block) return prevTasks;

        // Get all tasks in this block
        const blockTaskIds = block.tareas?.map((t) => t.id);
        const blockTasks = prevTasks.filter((task) =>
          blockTaskIds?.includes(task.id),
        );

        // Determine if we should mark all as complete or incomplete
        const shouldMarkComplete = !blockTasks.every(
          (task) => task.transparency === "transparent",
        );

        return prevTasks.map((task) => {
          if (blockTaskIds?.includes(task.id)) {
            return {
              ...task,
              cumplido: shouldMarkComplete,
            };
          }
          return task;
        });
      });
    },
    [taskBlocks],
  );

  const handleUpdateTask = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      updateTask(taskId, updates);
    },
    [updateTask], // include it in dependencies
  );

  const editTask = (task: Task) => {
    // Set the task as an event and open the editor
    const eventTask = {
      ...task,
      start: { date: task.start.date },
      isEvent: task.isEvent ?? false,
    };
    setEditingTask(eventTask);
  };

  const editEvent = (task: Task) => {
    // Set the task as an event and open the editor
    const eventTask = {
      ...task,
      isEvent: true,
      startTime: task.start.dateTime,
      endTime: task.end.dateTime,
      recurrence: task.recurrence || [],
    };
    setEditingTask(eventTask);
  };

  // Updated handleTaskDropped function with proper insertion logic
  const handleTaskDropped = useCallback(
    (
      draggedId: string,
      targetId: string,
      dropPosition?: "above" | "below" | "last",
    ) => {
      setTasks((prevTasks) => {
        const draggedTask = prevTasks.find((t) => t.id === draggedId);
        const targetTask = prevTasks.find((t) => t.id === targetId);

        if (!draggedTask || !targetTask || draggedId === targetId)
          return prevTasks;

        // Helper function to insert at position
        const insertAtPosition = (
          array: Task[],
          item: Task,
          targetIndex: number,
          position: "above" | "below" | "last",
        ) => {
          const newArray = [...array];
          const insertIndex =
            position === "above"
              ? targetIndex
              : position === "below"
                ? targetIndex + 1
                : newArray.length;
          newArray.splice(insertIndex, 0, item);
          return newArray;
        };

        // Case 1: Reordering within same block
        if (
          draggedTask.bloque_tareas &&
          draggedTask.bloque_tareas === targetTask.bloque_tareas
        ) {
          const block = taskBlocks.find(
            (b) => b.id === draggedTask.bloque_tareas,
          );
          if (!block) return prevTasks;

          const newTaskIds = [...block.taskIds];
          const draggedIndex = newTaskIds.indexOf(draggedId);
          const targetIndex = newTaskIds.indexOf(targetId);

          if (draggedIndex === -1 || targetIndex === -1) return prevTasks;

          // Remove dragged item
          newTaskIds.splice(draggedIndex, 1);

          // Calculate new insert position
          const newTargetIndex =
            dropPosition === "above"
              ? targetIndex
              : dropPosition === "below"
                ? targetIndex + 1
                : newTaskIds.length;

          // Insert at new position
          newTaskIds.splice(newTargetIndex, 0, draggedId);

          setTaskBlocks((prev) =>
            prev.map((b) =>
              b.id === block.id ? { ...b, taskIds: newTaskIds } : b,
            ),
          );
          return prevTasks;
        }

        // Case 2: Reordering standalone tasks
        if (!draggedTask.bloque_tareas && !targetTask.bloque_tareas) {
          const withoutDragged = prevTasks.filter((t) => t.id !== draggedId);
          const targetIndex = withoutDragged.findIndex(
            (t) => t.id === targetId,
          );

          if (targetIndex === -1) return prevTasks;

          return insertAtPosition(
            withoutDragged,
            draggedTask,
            targetIndex,
            dropPosition || "below",
          );
        }

        // Case 3: Moving from block to standalone
        if (draggedTask.bloque_tareas && !targetTask.bloque_tareas) {
          // Remove from current block
          setTaskBlocks((prev) =>
            prev.map((b) =>
              b.id === draggedTask.bloque_tareas
                ? { ...b, tareas: b.tareas?.filter((t) => t.id !== draggedId) }
                : b,
            ),
          );

          // Convert to standalone and insert at position
          const withoutDragged = prevTasks.filter((t) => t.id !== draggedId);
          const targetIndex = withoutDragged.findIndex(
            (t) => t.id === targetId,
          );

          if (targetIndex === -1) return withoutDragged;

          return insertAtPosition(
            withoutDragged,
            { ...draggedTask, bloque_tareas: undefined },
            targetIndex,
            dropPosition || "below",
          );
        }

        // Case 4: Moving from standalone to block
        if (!draggedTask.bloque_tareas && targetTask.bloque_tareas) {
          // Add to target block at position
          const targetBlock = taskBlocks.find(
            (b) => b.id === targetTask.bloque_tareas,
          );
          if (!targetBlock) return prevTasks;

          const newTaskIds = [...targetBlock.taskIds];
          const targetIndex = newTaskIds.indexOf(targetId);
          if (targetIndex === -1) return prevTasks;

          // Calculate insert position
          const insertIndex =
            dropPosition === "above"
              ? targetIndex
              : dropPosition === "below"
                ? targetIndex + 1
                : newTaskIds.length;

          newTaskIds.splice(insertIndex, 0, draggedId);

          setTaskBlocks((prev) =>
            prev.map((b) =>
              b.id === targetTask.blockId ? { ...b, taskIds: newTaskIds } : b,
            ),
          );

          // Update task's block reference
          return prevTasks.map((task) =>
            task.id === draggedId
              ? { ...task, blockId: targetTask.bloque_tareas }
              : task,
          );
        }

        // Case 5: Moving between blocks
        if (
          targetTask.bloque_tareas &&
          draggedTask.bloque_tareas !== targetTask.bloque_tareas
        ) {
          // Remove from current block
          if (draggedTask.bloque_tareas) {
            setTaskBlocks((prev) =>
              prev.map((b) =>
                b.id === draggedTask.bloque_tareas
                  ? {
                      ...b,
                      taskIds: tasks.map((task: Task) => task.id !== draggedId),
                    }
                  : b,
              ),
            );
          }

          // Add to new block at position
          const newBlock = taskBlocks.find(
            (b) => b.id === targetTask.bloque_tareas,
          );
          if (!newBlock) return prevTasks;

          const newTaskIds = [...newBlock.taskIds];
          const targetIndex = newTaskIds.indexOf(targetId);
          if (targetIndex === -1) return prevTasks;

          // Calculate insert position
          const insertIndex =
            dropPosition === "above"
              ? targetIndex
              : dropPosition === "below"
                ? targetIndex + 1
                : newTaskIds.length;

          newTaskIds.splice(insertIndex, 0, draggedId);

          setTaskBlocks((prev) =>
            prev.map((b) =>
              b.id === targetTask.bloque_tareas
                ? { ...b, taskIds: newTaskIds }
                : b,
            ),
          );

          // Update task's block reference
          return prevTasks.map((task) =>
            task.id === draggedId
              ? { ...task, blockId: targetTask.bloque_tareas }
              : task,
          );
        }

        return prevTasks;
      });
    },
    [taskBlocks],
  );

  const handleDragStateChange = useCallback(
    (dragging: boolean) => {
      if (isDraggingRef.current !== dragging) {
        isDraggingRef.current = dragging;
        setIsDragging(dragging);
        if (onDragStateChange) {
          onDragStateChange(dragging);
        }
      }
    },
    [onDragStateChange],
  );

  const addConsecutiveTask = useCallback(
    (blockId: string, text?: string) => {
      const newTaskId = `${nextId}`;
      const newTask: Task = {
        id: newTaskId,
        summary: text || "Nueva tarea",
        description: null,
        transparency: "transparent",
        isEvent: false,
        subproyecto: undefined,
        reminders: { useDefault: true },
        start: { date: new Date().toISOString().split("T")[0] }, // Default to today
        end: { date: new Date().toISOString().split("T")[0] }, // Default to today
        bloque_tareas: blockId,
      };

      setTasks((prev) => [...prev, newTask]);
      setTaskBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId
            ? { ...block, tareas: [...block.taskIds, newTaskId] }
            : block,
        ),
      );
      setNextId((prev) => prev + 1);

      // Expand block when adding task
      setTaskBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId ? { ...block, expanded: true } : block,
        ),
      );

      setAnimatingConnection(newTaskId);
      setTimeout(() => setAnimatingConnection(null), 800);
    },
    [nextId],
  );

  const updateTaskPositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newPositions: TaskPosition = {};

    container
      .querySelectorAll<HTMLElement>('[id^="task-point-"]')
      .forEach((point) => {
        const id = point.id.replace("task-point-", "");
        const rect = point.getBoundingClientRect();

        newPositions[id] = {
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top,
        };
      });

    setTaskPositions((prev) => ({ ...prev, ...newPositions }));
  }, []);

  const getConnectionPath = useCallback(
    (blockId: string, childId: string) => {
      const parent = taskPositions[blockId];
      const child = taskPositions[childId];

      if (!parent || !child) return "";

      // Corrected path: horizontal then vertical
      return `M ${parent.x} ${parent.y} L ${child.x} ${parent.y} L ${child.x} ${child.y}`;
    },
    [taskPositions],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      updateTaskPositions();
    });
    resizeObserverRef.current.observe(container);

    mutationObserverRef.current = new MutationObserver(() => {
      updateTaskPositions();
    });
    mutationObserverRef.current.observe(container, {
      childList: true,
      subtree: true,
    });

    updateTaskPositions();

    return () => {
      resizeObserverRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
    };
  }, [updateTaskPositions]);

  // Initialize expanded state for tasks with children
  useEffect(() => {
    const newExpanded: Record<string, boolean> = {};

    tasks.forEach((task) => {
      const hasChildren = tasks.some((t) => t.bloque_tareas === task.id);
      if (hasChildren && expandedTasks[task.id] === undefined) {
        newExpanded[task.id] = true;
      }
    });

    if (Object.keys(newExpanded).length > 0) {
      setExpandedTasks((prev) => ({ ...prev, ...newExpanded }));
    }
  }, [tasks]);

  const mainTasks = tasks
    .filter((t) => !t.bloque_tareas)
    .filter((t) => {
      if (t.start.dateTime) {
        return isSameLimaDay(t.start.dateTime, currentDate);
      } else if (t.start.date) {
        return isSameLimaDay(t.start.date, currentDate);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.transparency !== b.transparency) {
        return a.transparency == "transparent" ? 1 : -1;
      }
      return 0;
    });

  console.log("current date", currentDate);

  console.log("mainTasks", mainTasks);

  const handleSaveTask = (updatedTask: Task) => {
    setTasks((prev) => {
      const next = prev.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
      );
      console.log("updated tasks after save", next);
      return next;
    });
    setEditingTask(null);
  };

  const handleCancelEditing = () => {
    setEditingTask(null);
  };

  const goToNextWeek = () => {
    setCurrentDate((prev) => addDays(prev, 7));
  };

  const goToPreviousWeek = () => {
    setCurrentDate((prev) => addDays(prev, -7));
  };

  const goToPreviousDay = () => {
    setCurrentDate((prev) => addDays(prev, -1));
  };

  const goToNextDay = () => {
    setCurrentDate((prev) => addDays(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handlePremios = () => {
    setShowPremiosDrawer(true);
  };

  const handleTemplates = () => {
    setShowAimsDrawer(true);
  };

  const handleAims = () => {
    setShowAimsDrawer(true);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="grid grid-cols-1 w-full overflow-y-scroll h-[90%] p-6"
        style={{ alignContent: "baseline" }}
      >
        {viewMode === "day" && (
          <div className="flex items-center justify-between mt-2">
            <Button
              onClick={goToPreviousDay}
              size="icon"
              variant="ghost"
              className="text-gray-500 hover:text-gray-900"
            >
              <ChevronLeft
                className="h-5 w-5"
                style={{ stroke: coloresui[0].Tareas }}
              />
              <span className="sr-only">Día anterior</span>
            </Button>

            <div className="flex flex-col items-center">
              <p className="text-gray-500 text-base font-nunito-sans font-semibold">
                {formatDateShort(currentDate)}
              </p>
              <Button
                onClick={goToToday}
                variant="link"
                className="text-sm h-auto p-0 text-gray-400 font-nunito-sans"
              >
                Hoy
              </Button>
            </div>

            <Button
              onClick={goToNextDay}
              size="icon"
              variant="ghost"
              className="text-gray-500 hover:text-gray-900"
            >
              <ChevronRight
                className="h-5 w-5"
                style={{ stroke: coloresui[0].Tareas }}
              />
              <span className="sr-only">Día siguiente</span>
            </Button>
          </div>
        )}

        {viewMode === "week" && (
          <div className="flex items-center justify-between mt-2">
            <Button
              onClick={goToPreviousWeek}
              size="icon"
              variant="ghost"
              className="text-gray-500 hover:text-gray-900"
            >
              <ChevronLeft
                className="h-5 w-5"
                style={{ stroke: coloresui[0].Tareas }}
              />
              <span className="sr-only">Semana anterior</span>
            </Button>

            <div className="flex flex-col items-center">
              <p className="text-gray-500 text-base font-nunito-sans font-semibold">
                {formatWeekRange(getWeekDays(currentDate))}
              </p>
              <Button
                onClick={goToToday}
                variant="link"
                className="text-sm h-auto p-0 text-gray-400 font-nunito-sans"
              >
                Esta Semana
              </Button>
            </div>

            <Button
              onClick={goToNextWeek}
              size="icon"
              variant="ghost"
              className="text-gray-500 hover:text-gray-900"
            >
              <ChevronRight
                className="h-5 w-5"
                style={{ stroke: coloresui[0].Tareas }}
              />
              <span className="sr-only">Semana siguiente</span>
            </Button>
          </div>
        )}

        {viewMode === "day" && (
          <div ref={containerRef} className="relative bg-white w-full ">
            {taskBlocks.map((block) =>
              block.tareas?.map((task: Task) => (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 0 }}
                >
                  <defs>
                    <style>
                      {`
                .connection-path {
                  fill: none;
                  stroke: ${block.color || coloresui[0].Tareas};
                  stroke-width: 1.5;
                  stroke-dasharray: 4, 4;
                }
                .animating-path {
                  stroke-dasharray: 4, 4;
                  stroke-dashoffset: 40;
                  animation: dash 0.8s ease-in-out forwards;
                }
                @keyframes dash {
                  from {
                    stroke-dashoffset: 40;
                    opacity: 0;
                  }
                  to {
                    stroke-dashoffset: 0;
                    opacity: 0.6;
                  }
                }
              `}
                    </style>
                  </defs>
                  <path
                    key={`connection-${block.id}-${task.id}`}
                    d={getConnectionPath(block.id, task.id)}
                    className={`connection-path ${
                      animatingConnection === task.id ? "animating-path" : ""
                    }`}
                  />
                </svg>
              )),
            )}

            <div className="relative space-y-2">
              {/* Fixed empty state condition */}
              {mainTasks.length === 0 ? (
                <div className=""></div>
              ) : (
                <div className="grid gap-2">
                  {mainTasks.some((task) => task.isEvent === true) && (
                    <div className="font-semibold">Eventos</div>
                  )}
                  {mainTasks.map(
                    (task) =>
                      task.isEvent && (
                        <TaskItem
                          key={task.id + String(task.isEvent)}
                          task={task}
                          tasks={tasks}
                          setTasks={setTasks}
                          animatingConnection={animatingConnection}
                          dragOverTaskId={dragOverTaskId}
                          setDragOverTaskId={setDragOverTaskId}
                          onDeleteTask={handleDeleteTask}
                          onToggleCompletion={handleToggleCompletion}
                          onUpdateTask={handleUpdateTask}
                          editTask={editTask}
                          editEvent={editEvent}
                          onTaskDropped={handleTaskDropped}
                          onCreateBlockWithTasks={handleCreateBlockWithTasks}
                          accessToken={accessToken} // Pass the access token if needed
                          blockColor={coloresui[0].Tareas} // Use the default color for standalone tasks
                        />
                      ),
                  )}
                </div>
              )}

              {/* Fixed empty state condition */}
              {taskBlocks.length === 0 && mainTasks.length === 0 ? (
                <div className="text-center text-gray-500">
                  {/* New Task Input */}

                  <div className="flex justify-between items-center gap-2 my-4">
                    <input
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={handleNewTaskKeyDown}
                      placeholder={
                        selectedStatus == "crear_evento"
                          ? "Añadir nuevo evento..."
                          : "Añadir nueva tarea..."
                      }
                      style={{
                        borderBottomWidth: "2px",
                        borderBottomColor: coloresui[0].Tareas,
                      }}
                      className={`flex-1 font-medium  focus:outline-none ${
                        isDarkMode
                          ? "bg-gray-800 text-white placeholder-gray-400"
                          : "bg-white text-gray-900 placeholder-gray-500"
                      }`}
                    />
                    <button onClick={() => handleStatusChange("crear_tarea")}>
                      <CheckCircle2
                        style={{
                          stroke:
                            selectedStatus === "crear_tarea"
                              ? coloresui[0].Tareas
                              : "gray",
                        }}
                      />
                    </button>
                    <button onClick={() => handleStatusChange("crear_evento")}>
                      <Clock
                        style={{
                          stroke:
                            selectedStatus === "crear_evento"
                              ? coloresui[0].Tareas
                              : "gray",
                        }}
                      />
                    </button>
                  </div>

                  <div className="text-lg mb-2 py-12">📋</div>
                  <div>No tasks yet. Click "Add Task" to get started.</div>
                </div>
              ) : (
                <div className="grid gap-2">
                  {mainTasks.some((task) => task.isEvent !== true) && (
                    <div className="font-semibold">Tareas</div>
                  )}
                  {taskBlocks.map((block) => (
                    <TaskBlockComponent
                      key={block.id}
                      block={block}
                      setTaskBlocks={setTaskBlocks}
                      tasks={tasks}
                      setTasks={setTasks}
                      animatingConnection={animatingConnection}
                      addConsecutiveTask={addConsecutiveTask}
                      dragOverTaskId={dragOverTaskId}
                      setDragOverTaskId={setDragOverTaskId}
                      onDeleteTask={handleDeleteTask}
                      onBlockToggleCompletion={handleBlockToggleCompletion}
                      onToggleCompletion={handleToggleCompletion}
                      onUpdateTask={handleUpdateTask}
                      editTask={editTask}
                      editEvent={editEvent}
                      onTaskDropped={handleTaskDropped}
                      onCreateBlockWithTasks={handleCreateBlockWithTasks}
                    />
                  ))}

                  <div className="grid gap-2">
                    {mainTasks.map(
                      (task) =>
                        task.isEvent !== true && (
                          <TaskItem
                            key={task.id + String(task.isEvent)}
                            task={task}
                            tasks={tasks}
                            setTasks={setTasks}
                            animatingConnection={animatingConnection}
                            dragOverTaskId={dragOverTaskId}
                            setDragOverTaskId={setDragOverTaskId}
                            onDeleteTask={handleDeleteTask}
                            onToggleCompletion={handleToggleCompletion}
                            onUpdateTask={handleUpdateTask}
                            editTask={editTask}
                            editEvent={editEvent}
                            onTaskDropped={handleTaskDropped}
                            onCreateBlockWithTasks={handleCreateBlockWithTasks}
                            accessToken={accessToken} // Pass the access token if needed
                            blockColor={coloresui[0].Tareas} // Use the default color for standalone tasks
                          />
                        ),
                    )}
                  </div>

                  <div className="flex justify-between items-center gap-2 m-2">
                    <input
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={handleNewTaskKeyDown}
                      placeholder="Añadir nueva tarea..."
                      style={{
                        borderBottomWidth: "2px",
                        borderBottomColor: coloresui[0].Tareas,
                      }}
                      className={`flex-1 font-medium  focus:outline-none ${
                        isDarkMode
                          ? "bg-gray-800 text-white placeholder-gray-400"
                          : "bg-white text-gray-900 placeholder-gray-500"
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Task Editor Modal */}
            {editingTask && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="max-w-md w-full">
                  <TaskEditor
                    task={editingTask}
                    onSave={handleSaveTask}
                    onCancel={handleCancelEditing}
                    isDarkMode={isDarkMode}
                    accessToken={accessToken} // Pass the access token if needed
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === "week" && (
          <WeekViewRender
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        )}
        {viewMode === "schedule" && <WeeklySchedule />}
        {showPremiosDrawer && (
          <div className="absolute fixed bottom-[80px] overflow-y-auto  left-0 right-0 bg-white shadow-lg z-50 flex flex-col">
            <div className="flex justify-between gap-1 items-center p-4 border-b">
              <h2 className="font-bold">Premios</h2>
              <button onClick={() => setShowPremiosDrawer(false)}>X</button>
            </div>
            <div className="flex-1 p-4 space-y-4">
              <Premios
                ayverga={true}
                accessToken={accessToken}
                setCurrentView={setCurrentView}
              ></Premios>
            </div>
          </div>
        )}

        {showAimsDrawer && (
          <div className="absolute fixed bottom-[80px] overflow-y-auto  left-0 right-0 bg-white shadow-lg z-50 flex flex-col">
            <div className="flex justify-between gap-1 items-center p-4 border-b">
              <h2 className="font-bold">Aims</h2>
              <button onClick={() => setShowAimsDrawer(false)}>X</button>
            </div>
            <div className="flex-1 p-4 space-y-4">
              <ObjectivesTab
                isDarkMode={isDarkMode}
                onDragStateChange={onDragStateChange}
                objectives={blocks}
              />
            </div>
          </div>
        )}
      </div>
      <FloatingButton
        boton1={handleTemplates}
        boton2={handlePremios}
        boton3={handleAims}
      />
    </DndProvider>
  );
};

interface WeekViewRenderProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
}

export const WeekViewRender: React.FC<WeekViewRenderProps> = ({
  currentDate,
  setCurrentDate,
  viewMode,
  setViewMode,
}) => {
  const {
    tasks,
    blocks,
    setTasks,
    createTask,
    updateTask,
    handleDragStart,
    deleteTask,
  } = useProject();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isBreakingDown, setIsBreakingDown] = useState<string | null>(null);
  const [nextId, setNextId] = useState(1);

  const handleTaskToggle = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        String(task.id) === taskId
          ? { ...task, cumplido: task.transparency !== "opaque" }
          : task,
      ),
    );
  };

  const handleSelectDay = (date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  };

  const handleAddTaskForDay = useCallback(
    async (date: Date) => {
      const newTask: Task = {
        id: `${nextId}`,
        summary: `Nueva tarea ${new Date().toLocaleTimeString()}`,
        estimatedTime: 30,
        startTime: formatDateForSQL(date),
        endTime: formatDateForSQL(date),
        repeat: "none",
        description: null,
        subproyecto: undefined,
        isEvent: false,
      };
      // createTask(newTask.nombre); // Wait for the task to be created in the backend
      setNextId((prev) => prev + 1);

      setTasks([...tasks, newTask]);
      setCurrentDate(date);
      setViewMode("day");
    },
    [nextId, createTask, setTasks],
  );

  const handleAddEventForDay = (date: Date) => {
    // Get current time components
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Create start datetime by combining date with current time
    const startDateTime = new Date(date);
    startDateTime.setHours(hours);
    startDateTime.setMinutes(minutes);
    startDateTime.setSeconds(seconds);

    // Create end datetime by adding 1 hour
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(hours + 1);

    const newEvent: Task = {
      id: `${nextId}`,
      nombre: `Nuevo evento ${startDateTime.toLocaleTimeString()}`,
      cumplido: false,
      estimatedTime: 60,
      isEvent: true,
      startTime: formatDateForSQL(startDateTime),
      endTime: formatDateForSQL(endDateTime),
      repeat: "none",
      google_id: "",
      descripcion: "",
      sub_proyecto: undefined,
    };

    setNextId((prev) => prev + 1);
    setTasks([...tasks, newEvent]);
    setCurrentDate(date);
    setViewMode("day");
  };

  const handleStartEditing = (task: Task) => {
    setEditingTask(task);
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleDeleteTask = useCallback(
    (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      deleteTask(taskId);
      // Update blocks if needed
    },
    [],
  );

  const handleWeekViewDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Handle objective to day drop
    if (
      source.droppableId === "week-objectives" &&
      destination.droppableId.startsWith("day-")
    ) {
      const objective = blocks.find((obj) => obj.id.toString() === draggableId);
      if (objective) {
        const targetDate = destination.droppableId.replace("day-", "");
        const newTask: Task = {
          id: `${nextId}`,
          summary: objective.name,
          description: objective.description,
          transparency: "opaque",
          source: objective.type,
          startTime: formatDateForSQL(new Date(targetDate).toISOString()),
          endTime: formatDateForSQL(new Date(targetDate).toISOString()),
          proyecto: objective.id,
          recurrence: [],
          subproyecto: undefined,
          isEvent: false,
        };

        setTasks((prev) => {
          const dayTasks = prev.filter(
            (task) =>
              task.start.dateTime &&
              isSameDayCheck(task.start.dateTime, new Date(targetDate)),
          );
          const otherTasks = prev.filter(
            (task) =>
              !task.start.dateTime ||
              !isSameDayCheck(task.start.dateTime, new Date(targetDate)),
          );

          dayTasks.splice(destination.index, 0, newTask);
          return [...otherTasks, ...dayTasks];
        });
      }
    }
  };

  const tasktoevent = (task: Task) => {
    const start = new Date();
    start.setHours(start.getHours() + 1);
    start.setMinutes(0, 0, 0); // round to the next hour
    let end = new Date(start);
    end.setHours(end.getHours() + 1);
    const updates = {
      isEvent: true,
      start: { dateTime: String(start), timeZone: timeZone },
      end: { dateTime: String(end), timeZone: timeZone },
    };
    updateTask(task.id, updates);
    setEditingTask(tasks.find((t) => t.id === task.id) || null);
  };

  //   const handleBreakDownObjective = async (objectiveId: string) => {
  //     setIsBreakingDown(objectiveId)

  //     // Simular llamada a AI
  //     await new Promise((resolve) => setTimeout(resolve, 2000))

  //     const objective = objectives.find((obj) => obj.id === objectiveId)
  //     if (objective) {
  //       // Generar mini-tareas usando "AI"
  //       const miniTasks: Task[] = [
  //         {
  //           id: "1",
  //           title: `Investigar requisitos - ${objective.title}`,
  //           completed: false,
  //           priority: "high",
  //           estimatedTime: 60,
  //           source: `AI-${objective.type}`,
  //           date: new Date().toISOString(),
  //           repeat: "none",
  //           google_id: "",
  //           descripcion: "",
  //           sub_proyecto: undefined
  //         },
  //         {
  //           id: "2",
  //           title: `Crear prototipo - ${objective.title}`,
  //           completed: false,
  //           priority: "medium",
  //           estimatedTime: 90,
  //           source: `AI-${objective.type}`,
  //           date: new Date().toISOString(),
  //           repeat: "none",
  //           google_id: "",
  //           descripcion: "",
  //           sub_proyecto: undefined
  //         },
  //         {
  //           id: "3",
  //           title: `Testing y validación - ${objective.title}`,
  //           completed: false,
  //           priority: "medium",
  //           estimatedTime: 45,
  //           source: `AI-${objective.type}`,
  //           date: new Date().toISOString(),
  //           repeat: "none",
  //           google_id: "",
  //           descripcion: "",
  //           sub_proyecto: undefined
  //         },
  //       ]

  //       // Add AI tasks at the end
  //       setTasks((prev) => [...prev, ...miniTasks])
  //     }

  //     setIsBreakingDown(null)
  //   }

  const handleSaveTask = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
    );
    setEditingTask(null);
  };

  const handleCancelEditing = () => {
    setEditingTask(null);
  };

  return (
    <WeekView
      tasks={tasks}
      blocks={blocks}
      currentDate={currentDate}
      isDarkMode={isDarkMode}
      onSelectDay={handleSelectDay}
      onToggleTask={handleTaskToggle}
      onAddTask={handleAddTaskForDay}
      onAddEvent={handleAddEventForDay}
      onStartEditing={handleStartEditing}
      onDeleteTask={handleDeleteTask}
      onConvertToEvent={tasktoevent}
      onDragEnd={handleWeekViewDragEnd}
      // onBreakDownObjective={handleBreakDownObjective}
      isBreakingDown={isBreakingDown}
      setIsBreakingDown={setIsBreakingDown}
    />
  );
};
