/**
 * Core Calendar Types
 */

// Tarea
interface TareaBase {
  id: string;
  summary: string;
  description?: string | null;
  eventType?: string;
  transparency?: "opaque" | "transparent";
  colorId?: string;
  htmlLink?: string;
  imagen?: number;
}

// 2) Extend for JSON / list attributes
type ISODate = string; // e.g. "2025-07-06"
type ISODateTime = string; // e.g. "2025-07-06T10:30:00-05:00"

export interface StartEnd {
  date?: ISODate;
  dateTime?: ISODateTime;
  timeZone?: string;
}

interface TareaWithRecurrence extends TareaBase {
  start: StartEnd;
  end: StartEnd;
  recurrence?: string[]; // list of RFC5545 RRULE strings
}

export interface ReminderOverride {
  method: string;
  minutes: number;
}

export interface Reminders {
  useDefault: boolean;
  overrides?: ReminderOverride[];
}

// 3) Finally extend for your custom flag
export interface Task extends TareaWithRecurrence {
  isEvent: boolean;
  reminders: Reminders;
  tags?: TagType[]; // Array of tag IDs
  proyecto?: number;
  subproyecto?: string;
  bloque_tareas?: string;
  premio?: number;
  type: "task" | "event" | "both";
}

export interface TaskPosition {
  [id: string]: { x: number; y: number };
}

export interface TaskBlock {
  id: string;
  title: string;
  expanded: boolean;
  color?: string; // Optional color for the block
  type: "task" | "event" | "both";
  tareas?: Task[];
  top?: number; // Minutes since midnight
  height?: number; // Minutes duration
  image?: number;
}

export interface TaskItemProps {
  task: Task;
  tasks: Task[]; // Might be optional if not used
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>; // Optional if using callback handlers
  animatingConnection: string | null;
  dragOverTaskId: string | null;
  setDragOverTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  onDeleteTask: (taskId: string, e: React.MouseEvent) => void;
  onToggleCompletion: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onTaskDropped: (
    draggedId: string,
    targetId: string,
    dropPosition: any,
  ) => void;
  editTask: (task: Task) => void; // Function to convert task to event
  editEvent: (task: Task) => void; // Function to convert task to event
  blockColor?: string; // Optional color for task block
  // Optional props that might not be needed anymore:
  level?: number; // Not used in current implementation
  addConsecutiveTask?: (blockId: string, text?: string) => void; // Handled at higher level
  onDragStart?: (e: React.DragEvent) => void; // Handled by react-dnd
  onDragEnd?: () => void; // Handled by react-dnd
  onDragOver?: (e: React.DragEvent) => void; // Handled by react-dnd
  onDrop?: (e: React.DragEvent) => void; // Replaced by onTaskDropped
}

// Block (Proyecto)
type BlockBase = {
  name: string;
  description: string;
  color?: string;
  startdate: string;
  enddate: string;
  tareas?: Task[];
  isExpanded: boolean;
  image?: number;
};

export interface Block extends BlockBase {
  id: number;
  subBlocks?: SubBlock[];
}

export interface SubBlock extends BlockBase {
  id: string;
  parentId?: number;
  parent_sub_id?: string;
  subBlocks?: SubBlock[];
}

export interface BlockComponentProps {
  block: Block;
  level?: number;
  parentId?: string | null;
  color?: string;
  parentColor?: string;
  onRequestAISubBlocks: (
    blockId: number,
    blockContent: string,
  ) => Promise<{ name: string }[]>;
  onUpdateDates?: (id: string, startDate: string, endDate: string) => void;
  onToggleExpand: (id: string) => void;
  onAddSubBlock: (parentId: string) => void;
  onUpdateContent: (id: string, name: string, parentId?: string | null) => void;
  onDeleteBlock: (id: string, parentId?: string | null) => void;
  onDragStart?: (
    e: React.DragEvent<HTMLDivElement>,
    item: DraggableItem,
  ) => void;
  events: Task[];
  accessToken: string;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

// Eliminar?
export interface ProjectGroupProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

//Premio
export interface Premio {
  id: number;
  nombre: string;
  descripcion: string;
  fecha_creado: string;
  url: string;
  fav: number;
  esfuerzo: number;
  tags: [];
  color?: string;
  image?: number;
}

//Imagen de premio
export interface Image {
  id: number;
  table_name:
    | "premios"
    | "task_block"
    | "sub_proyecto"
    | "proyectos"
    | "tareas";
  external_id: string | number;
  image_url: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // Always in "HH:mm" format (for display)
  end: string; // Always in "HH:mm" format (for display)
  type: string;
  color: string;

  // Optional raw Google dates (for calculations)
  rawStart?: {
    dateTime?: string; // ISO format
    date?: string; // All-day dates
  };
  rawEnd?: {
    dateTime?: string;
    date?: string;
  };

  // Drag & Drop Properties
  weekId?: string;
  dropTime?: string;
  hierarchyLevel?: number;
  isComponent?: boolean;
  subBlocks?: CalendarEvent[];
}

export interface GoogleEventResponse extends Omit<
  CalendarEvent,
  "start" | "end" | "color"
> {
  summary: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  colorId?: string;
}

/**
 * Calendar Layout Types
 */
export interface GridRow {
  startTime: string;
  endTime: string;
  top: number; // Pixel position
  height: number; // Pixel height
}

export interface TimeDividerData {
  hour: number;
  label: string;
  className: string;
}

/**
 * UI Component Types
 */
export interface EventCardProps {
  event: Task;
  mode?: "compact" | "detailed";
}

export interface DroppableAreaProps {
  hour: number;
  droppedEvents: CalendarEvent[];
}

/**
 * Data Structure Types
 */
export type EventsData = Record<string, CalendarEvent[]>;

/**
 * External API Types
 */

/**
 * Drag & Drop Types
 */
export interface DropResult {
  event: CalendarEvent;
  targetTime: string;
  targetDate: string;
}

/**
 * Calendar Config Types
 */
export interface CalendarConfig {
  hourHeight: number;
  sectionWidths: {
    left: number;
    middle: number;
    right: number;
  };
  timeDividers: TimeDividerData[];
}

// Utility type for React components using calendar data
export type CalendarComponentProps<T = {}> = T & {
  events: CalendarEvent[];
  grid: GridRow[];
  currentDate?: Date;
};

export interface GridProps {
  accessToken: string;
  processedEvents: TaskBlock[];
  createEvent?: (event: Task, token: string) => Promise<void>;
  handleUpdateEvent: (event: Partial<Task>) => Promise<void>;
  grid: CalendarGrid;
  localTimeZone: string;
}

export interface MiddleColumnProps {
  events: Event[];
  grid: CalendarGrid;
  time: number;
  droppedEvents: { [hour: number]: DroppableEvent[] };
  onDrop: (hour: number, event: DroppableEvent) => void;
}

export interface RightColumnProps {
  events: DroppableEvent[];
  grid: CalendarGrid;
}

export interface DroppableEvent extends CalendarEvent {
  id: string;
  start: string;
  end: string;

  weekId: string;
  dropTime: string;
  hierarchyLevel: number;
  isComponent: boolean;
  subBlocks?: DroppableEvent[];
  // Add missing required fields from GoogleEvent
  summary: string; // Add title property
  colorId?: string;
}

export interface Event {
  id: string;
  summary: string;
  start: string;
  end: string;
  colorId: string;
  type: string;
}

export interface ActiveEvent {
  id: string;
  top: number;
  height: number;
}

// Define the eventsData type, mapping string keys (dates) to Event arrays
export type CalendarGrid = GridRow[];

export interface DroppableRowProps {
  hour: number;
  droppedEvents: DroppableEvent[];
  onDrop: (event: DroppableEvent) => void;
}

export const TIME_DIVIDERS: TimeDividerData[] = [
  { hour: 6, label: "Morning", className: "text-blue-600" },
  { hour: 12, label: "Noon", className: "text-yellow-600" },
  { hour: 18, label: "Evening", className: "text-orange-600" },
  { hour: 0, label: "Night", className: "text-indigo-600" },
];

export interface EventAndTaskListProps {
  accessToken: string;
  celular: boolean; // Added celular prop
  eventos: Task[];
}

export interface BaseBlock {
  id?: number;
}
// Draggable item interface for drag-and-drop actions
export interface DraggableItem extends BaseBlock {
  type: "component" | "subcomponent";
  summary: string; // Required for draggable items
  isExpanded?: boolean;
  subBlocks?: DraggableItem[]; // Nested draggable items
  hierarchyLevel: number; // Represents depth in hierarchy
  parentColor?: string; // Parent block color for nested styling
  [key: string]: any; // Additional properties
}

export interface DroppedItem extends DraggableItem {
  weekId: string; // Unique ID for the week
  dropTime: string; // Timestamp for when item was dropped
  color: string; // Color of the dropped item
  parentColor?: string; // Inherits parent block color
  hierarchyLevel: number; // Depth in hierarchy
  isComponent: boolean; // True if it's a top-level component
  subBlocks?: DroppedItem[]; // Nested dropped items
}

export interface Week {
  year: number;
  weekNum: number;
  startDate: string;
  endDate: string;
}

export interface WeekScrollerProps {
  droppedItems?: DroppedItem[];
  setDroppedItems: React.Dispatch<React.SetStateAction<DroppedItem[]>>;
}

export type ZoomState = {
  scale: number;
  initialDistance: number;
  initialScale: number;
  isDragging: boolean;
  showAlternate: boolean;
  debugInfo: {
    lastAction: string;
    containerHeight: number | null;
    squareHeight: number | null;
    threshold: number | null;
  };
};

export type ZoomAction =
  | { type: "SET_SCALE"; payload: number }
  | { type: "START_TOUCH"; payload: { distance: number; scale: number } }
  | { type: "MOVE_TOUCH"; payload: { distance: number } }
  | { type: "END_TOUCH" }
  | { type: "TOGGLE_ALTERNATE"; payload: boolean }
  | { type: "UPDATE_DEBUG"; payload: Partial<ZoomState["debugInfo"]> }
  | { type: "RESET" };

export enum Vista {
  Tareas = "Tareas",
  Premios = "Premios",
  Proyectos = "Proyectos",
  Dia_2 = "Dia_2",
  Settings = "Settings",
}

// Define the context type
export interface ViewContextType {
  currentView: Vista;
  changeView: (view: Vista) => void;
}

export interface Segment {
  id: number;
  startAngle: number;
  endAngle: number;
  color: string;
}

export interface TagType {
  id: string;
  name: string;
  color: string;
  vista: string;
}

export interface TaggingSystemProps {
  onTagsChange?: (tags: TagType[]) => void;
  initialTags?: TagType[];
  accessToken: string | ""; // Optional access token for Google API
}

export interface WeekViewProps {
  tasks: Task[];
  objectives: Block[];
  currentDate: Date;
  isDarkMode: boolean;
  onSelectDay: (date: Date) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (date: Date) => void;
  onAddEvent: (date: Date) => void;
  onStartEditing: (task: Task) => void;
  onDeleteTask: (taskId: string, e: React.MouseEvent) => void;
  onConvertToEvent: (task: Task) => void;
  onDragEnd: (result: DropResult) => void;
  onBreakDownObjective: (objectiveId: string) => void;
  isBreakingDown: string | null;
  setIsBreakingDown: (objectiveId: string | null) => void;
}

export interface GoogleColorsResponse {
  event: Record<string, { background: string; foreground: string }>;
  calendar: Record<string, { background: string; foreground: string }>;
}

export interface EventDropdownProps {
  events: Task[];
  onTaskCreated: (task: Task) => void;
}

export interface TaskEditorProps {
  task: Task;
  onSave: (task: Task) => void;
  onCancel: () => void;
  isDarkMode: boolean;
  accessToken: string | "";
}

export interface TaskAccordionProps {
  blockId: number;
  subBlockId: number | undefined;
  tareas: Task[];
  events: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
  onRequestAISubBlocks: (blockId: number) => void;
  accessToken: string;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export interface ProjectContextType {
  // State
  tasks: Task[];
  taskBlocks: TaskBlock[];
  blocks: Block[];
  subBlocks: SubBlock[];
  premios: Premio[];
  imagenes: Image[];

  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  setSubBlock: React.Dispatch<React.SetStateAction<SubBlock[]>>;
  setTaskBlock: React.Dispatch<React.SetStateAction<TaskBlock[]>>;
  setPremio: React.Dispatch<React.SetStateAction<Premio[]>>;
  setImagen: React.Dispatch<React.SetStateAction<Image[]>>;

  selectedEvent: Task | null;
  draggedTaskId: string | null;
  draggedBlockId: number | null;
  currentSelectedBlockId: number | null;
  isLoading: boolean;

  // Task handlers
  createTask: (
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
      reminders?: Reminders[];
      tags?: TagType[];
      htmlLink?: string;
      proyecto?: number;
      subproyecto?: string;
      bloque_tareas?: string;
      premio?: number;
      image?: number;
    },
  ) => Promise<Task | undefined>;
  createTasks: (
    taskInputs: {
      summary: string;
      description?: string;
      blockId?: number;
      colorId?: string;
    }[],
  ) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  // TaskBlock handlers
  createTaskBlock: (taskBlockInput: Partial<TaskBlock>) => Promise<void>;
  updateTaskBlock: (
    taskBlockId: string,
    updates: Partial<TaskBlock>,
  ) => Promise<void>;
  deleteTaskBlock: (taskBlockId: string) => Promise<void>;
  // Block handlers
  createBlock: (blockInput: Partial<Omit<Block, "id">>) => Promise<void>;
  createSubBlock: (subInput: Partial<SubBlock>) => Promise<void>;
  updateBlock: (
    input: { id: number | string } & Partial<
      Omit<Block, "id"> & Omit<SubBlock, "id">
    >,
  ) => Promise<void>;
  deleteBlock: (blockId: number) => Promise<void>;
  buildBlockHierarchy: (
    projects: Block[],
    subProjects: SubBlock[],
  ) => Promise<Block[]>;
  // Premio handlers
  createPremio: (premioInput: Partial<Omit<Premio, "id">>) => Promise<void>;
  updatePremio: (premioId: number, updates: Partial<Premio>) => Promise<void>;
  deletePremio: (premioId: number) => Promise<void>;
  // Image handlers
  createImage: (imageInput: Partial<Omit<Image, "id">>) => Promise<void>;
  updateImage: (
    tableName: Image["table_name"],
    externalId: string | number,
    updates: Partial<Image>,
  ) => Promise<void>;
  deleteImage: (
    tableName: Image["table_name"],
    externalId: string | number,
  ) => Promise<void>;

  // toggleTaskCompletion: (taskId: string) => void

  // Block handlers
  // updateBlockContent: (blockId: number, name: string) => void
  // updateBlockDates: (blockId: number, startDate: string, endDate: string) => void
  // addSubBlock: (parentId: number) => void
  // toggleBlockExpand: (blockId: number) => void
  groupByDate: (items: { startdate?: string; type?: string }[]) => {};
  getTabLabel: (tabType: string) => void;
  getTypeIcon: (type: string, isDarkMode: boolean) => void;

  // Integration handlers
  selectEvent: (event: Task) => void;
  requestAIOperation: (
    type: "splitTask" | "generateSubBlocks",
    sourceData: any,
    targetId: string,
    setBlocks: any,
  ) => Promise<void>;

  // Drag and drop handlers
  handleDragStart: (
    e: React.DragEvent,
    id: string,
    type: "task" | "block",
  ) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (
    e: React.DragEvent,
    targetId: string,
    targetType: "task" | "block",
  ) => void;

  // Relationship handlers
  // syncTasksWithBlock: (taskId: string, blockId: number, action: "add" | "remove" | "update") => void
  // setCurrentSelectedBlock: (blockId: number) => void
}
