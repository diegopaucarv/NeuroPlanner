# NeuroPlanner — Plan de Orquestación de Agentes (SOP de ejecución)

> **Rol**: Especialista fullstack. Este documento traduce el plan maestro
> (`docs/reconversion/README.md`) y sus soportes (`01`–`04`) en **briefs de
> subtareas concretos y autocontenidos** que se despachan a sub-agentes.
> Cada brief define: objetivo, alcance de escritura (disjunto), referencias,
> guardrails y "definition of done".
>
> **Regla de oro**: los agentes NO ven el historial de la conversación. Cada
> brief debe ser autocontenido (rutas, nombres de funciones, guardrails).

---

## 0. Estado actual verificado (baseline)

> **Fuentes legacy disponibles** (añadidas por el usuario):
> - `assets/calendario_antiguo/` — frontend Remix/React (rutas en `app/routes/`, lógica en `app/lib/`).
> - `assets/backend/` — backend Express/Prisma/MySQL (`server.js`, `src/`, `prisma/schema.prisma`).
> Los agentes leen de aquí para **portar**; escriben SOLO en `src/`.

### ✅ Ya portado (no tocar sin motivo)
| Pieza | Ubicación |
|---|---|
| Shell | `src/Main.tsx`, `src/NavBar.tsx`, `src/components/Header.tsx`, `src/components/ToogleTabs.tsx` |
| Contexto de vista | `src/lib/ViewContext.tsx`, `src/lib/viewRegistry.tsx` |
| Iconos | `src/lib/iconos.tsx` |
| Tipos | `src/lib/types.tsx` (⚠️ aún con tipos web: `React.MouseEvent`, `react-dnd`) |
| Algoritmia (sin extraer) | `src/lib/calendario.tsx` (⚠️ `.tsx` con deps React/DOM) |
| Stores Zustand | `src/stores/useUserStore.ts`, `useObjectiveStore.ts`, `useHabitStore.ts`, `useReflectionStore.ts`, `useSkillStore.ts` |
| DB Kysely + SQLite | `src/db/db.ts`, `src/db/schema.ts`, `src/db/CALENDARIA.sql`, `src/db/repositories/*` |
| Auth Google | `src/hooks/useGoogleAuth.ts` |
| Pantalla perfil | `src/screens/ProfileScreen.tsx` |

### ❌ Falta (objetivo de la reconversión)
- Vista de Tareas real (hoy placeholder `Tareas!` en `viewRegistry`).
- Grid de día (`DiaCalendario`/`GridWithGroups`), vista Live (arcos/donut), premios, proyectos, semana.
- Servicio de sincronización Google Calendar, servicio IA, procesamiento de imágenes.
- `MobileTimePicker`, `TaggingSystem`, `TaskEditor`, `FloatingButton`, etc.

### ⚠️ Deuda técnica detectada
1. `lib/calendario.tsx` mezcla lógica pura con DOM/React → extraer a `.ts`.
2. `lib/types.tsx` conserva tipos web (`React.MouseEvent`, `DragEvent`, `react-dnd`).
3. `lib/theme.ts` NO tiene los colores del mockup (`#1f1f1f`, `#cccaca`, `#D9B5FF`).
4. `viewRegistry` Tareas es placeholder; `NavBar`/`Header` no usan acento `#D9B5FF`.
5. No hay servicio de sync; `accessToken` es `idToken` (ver §5.4 README).

---

## 1. Equipos de agentes (por fase, alcances de escritura disjuntos)

| Agente | Fase | Alcance de escritura (disjunto) | Depende de |
|---|---|---|---|
| **A — Fundaciones** | 0 | `src/lib/theme.ts`, `src/lib/calendario.ts` (nuevo), `src/lib/geometry.ts` (nuevo), `src/lib/arcMath.ts` (nuevo), `src/lib/types.tsx` | — |
| **B — Capa de datos** | 1 | `src/db/repositories/*`, `src/stores/*`, `src/services/*` | A (tipos) |
| **C — Lista de Tareas** | 2 | `src/components/TaskList.tsx`, `TaskItem.tsx`, `NewTaskInput.tsx`, `TaskEditor.tsx`, `TaggingSystem.tsx`, `FloatingButton.tsx`, `src/routes/TaskList.tsx`, `src/lib/viewRegistry.tsx` | A, B |
| **D — Grid de día** | 3 | `src/components/DiaCalendario.tsx`, `GridWithGroups.tsx`, `DroppablePremio.tsx`, `EventCard.tsx`, `TimeDivider.tsx` | A, B |
| **E — Vista Live** | 4 | `src/components/IndependentArcTimeline.tsx`, `InteractiveDonut.tsx`, `FloatingCirclesCanvas.tsx` | A, B |
| **F — Sync/IA/Imágenes** | 5 | `src/services/googleCalendarSync.ts`, `src/services/ia.ts`, `src/services/imageProcessor.ts` | B |
| **G — Expansión Tareas** | 6 | `src/components/QuickStart.tsx`, `Timer.tsx`, `RecoveryBlock.tsx`, `CrisisMode.tsx` | C |

> **Regla de coordinación**: un agente solo edita archivos de su alcance. Si
> necesita un símbolo de otro alcance, lo declara como "contrato" (firma) y el
> agente dueño lo implementa. No duplicar lógica.

---

## 2. Briefs de agentes

### AGENTE A — Fundaciones (Fase 0)

**Objetivo**: preparar el terreno: tema del mockup, extraer lógica pura sin DOM, limpiar tipos.

**Tareas**:
1. **`src/lib/theme.ts`**: añadir `#1f1f1f` (fondo), `#cccaca` (texto 95%), `#D9B5FF` (acento 85%) como claves tipadas. Mantener las existentes.
2. **`src/lib/calendario.ts`** (NUEVO): extraer de `src/lib/calendario.tsx` las funciones puras SIN imports de React/DOM:
   `detectOverlaps`, `createCalendarGrid`, `findGridRowForTime`, `findTimeForGridRow`, `timeToMinutes`, `TimeUtils` (`angleToTime`, `timeToAngle`, `hourToAngle`, `angleToHour`), `formatMinutes`, `formatTime`, `DateUtils`, `createSquare`, `createGoogleEventFromActiveSquare`, `getTailwindColor`, `googleColors`, `eventToTask`, `taskToEvent`, `getDateRangesFrom`, `isSameLimaDay`, `generateWeekId`, `formatDateForSQL`, `formatDateTime`, `formatDate`, `formatDateShort`, `getRandomColor`, `buildHexToColorIdMapping`.
   - **Guardrail**: `findTimeForGridRow` y `createGoogleEventFromActiveSquare` NO deben asumir "hoy" → parametrizar con `day: Date` (default `new Date()`).
   - **Guardrail**: `addMinutes`/`toISOString()` (UTC) → construir fechas con offset explícito de la zona del usuario.
   - **Guardrail**: `crypto.randomUUID()` no existe en RN → usar `expo-crypto` (`Crypto.randomUUID()`).
3. **`src/lib/geometry.ts`** (NUEVO): `getEventBounds`, `getGroupBounds`, `calculateEventStyle` (de `Dia.tsx`), `polarToCartesian`, `createArc`, `createTaskArcPath`, `angleToCoords`, `detectParallelTasks`, `adjustRadiiForParallelTasks` (de `circulol.tsx`). Sin DOM.
4. **`src/lib/arcMath.ts`** (NUEVO): `minutesToAngle`, `angleToMinutes`, `normalizeAngle`, `calculateAngle` (de `circulol.tsx`/`InteractiveDonut`).
5. **`src/lib/types.tsx`**: eliminar tipos web (`React.MouseEvent`, `DragEvent`, `react-dnd`). Añadir tipos RN (`Task` con `id: string`, `start/end` con `dateTime`). Mantener compatibilidad con `useObjectiveStore`.

**Definition of done**: `tsc --noEmit` sin errores; los módulos `.ts` no importan `react`/`react-native`/`document`/`window`.

---

### AGENTE B — Capa de datos (Fase 1)

**Objetivo**: exponer repositorios/stores para tareas, proyectos, premios, imágenes; preparar servicios.

**Tareas**:
1. Verificar/ajustar `ObjectiveRepository` para el CRUD de Tasks (type `Task`) con `data` JSON conteniendo `summary`, `start`, `end`, `colorId`, `isEvent`, `googleEventId`, `tags`, `rewardId`, `habitTemplateId`.
2. Ajustar `RewardRepository` (premios) y `HabitRepository` (task_block → habit_templates) según mapeo de `03-backend-port.md` §2.
3. Añadir `ImageRepository` si no existe (tabla `images` con `entity_id`).
4. Crear `src/services/` con stubs tipados: `googleCalendarSync.ts`, `ia.ts`, `imageProcessor.ts` (firmas, sin implementación completa).
5. **No** eliminar nada del backend legacy todavía (fuera de alcance; se hace en F).

**Definition of done**: stores exponen `create/update/delete/find` para Task/Project/Reward/Image; `tsc --noEmit` limpio.

---

### AGENTE C — Lista de Tareas (Fase 2)

**Objetivo**: reemplazar el placeholder `Tareas!` por la vista de Tareas real siguiendo `04-mockup-div-structure.md`.

**Tareas**:
1. `src/components/TaskList.tsx` (NUEVO): lista de tareas (FlatList/ScrollView) con filas `TaskItem` + `NewTaskInput`. Estructura según `04` §4.2.
2. `src/components/TaskItem.tsx` (NUEVO): fila título + hora + círculo estado (estructura `04` §4.1). Borde inferior acento `#D9B5FF`.
3. `src/components/NewTaskInput.tsx` (NUEVO): fila "New task" con borde `#cccaca` (distinto de tareas normales).
4. `src/components/TaskEditor.tsx` (NUEVO): Modal de edición (nombre, hora inicio/fin, tipo, tags, convertir tarea↔evento). Usar `@react-native-community/datetimepicker` (instalar si falta).
5. `src/components/TaggingSystem.tsx` (NUEVO): tags persistidos en `entities.data.tags`.
6. `src/components/FloatingButton.tsx` (NUEVO): FAB sticky (acento `#D9B5FF`).
7. `src/routes/TaskList.tsx`: reemplazar placeholder por `<TaskList/>`.
8. `src/lib/viewRegistry.tsx`: `Vista.Tareas` → `<TaskList/>`.
9. Ajustar `Header.tsx` (añadir fecha en `#D9B5FF`) y `NavBar.tsx` (item activo con acento `#D9B5FF`) — **solo si no lo hace otro agente** (coordinación con A).

**Guardrails**: `04` §5 (no portar hashes Framer, no CSS huérfano, FAB sticky, NAV dentro del SCREEN, chevrons prev/next).

**Definition of done**: la vista Tareas renderiza tareas reales desde `useObjectiveStore`; crear/editar/completar persiste en SQLite.

---

### AGENTE D — Grid de día (Fase 3) — DESCOMPUESTO EN SUB-FASES SECUENCIALES

> **Mockup ideal**: `docs/idea/schedule.html` (vista S — grid de día: columna izquierda con divisores de momentos, grid de 24h con etiquetas horarias, tarjetas de evento redondeadas con fondo de color, línea divisoria horizontal).
> **Lógica de gestos**: `01-drag-resize-port.md`. **Funciones puras**: `lib/calendario.ts` + `lib/geometry.ts`.

| Sub-fase | Agente | Alcance | Depende de |
|---|---|---|---|
| **3a — Shell del grid (estático)** | D1 | `DiaCalendario.tsx`, `GridWithGroups.tsx` (grid estático: líneas horarias + etiquetas + `TimeDivider`), `TimeDivider.tsx`, wire `viewRegistry` (tab schedule → `<DiaCalendario/>`). Sin gestos ni eventos. | A, B, C |
| **3b — Render de eventos** | D2 | `EventCard.tsx` + render de tareas existentes posicionadas (`getEventBounds`/`detectOverlaps`/`calculateEventStyle`). Solo lectura. | D1 |
| **3c — Drag/resize/snap** | D3 | `Gesture.Pan` para crear/mover/redimensionar con snap a 10px; commit vía `useObjectiveStore.update`. | D2 |
| **3d — DroppablePremio + pulido** | D4 | `DroppablePremio.tsx` (zonas de drop de premios), pulido visual final. | D3 |

**Objetivo**: portar `DiaCalendario`/`GridWithGroups` con drag/resize/snap. **El más complejo**. Seguir `01-drag-resize-port.md`.

**Tareas**:
1. `src/components/DiaCalendario.tsx` (NUEVO): grid de 96 filas. **No** renderizar 96 `View` → `FlatList` con `getItemLayout` o `react-native-svg`.
2. `src/components/GridWithGroups.tsx` (NUEVO): gestos con `GestureDetector` + `Gesture.Pan()` (no `onMouseDown/Move/Up`). Refs/sharedValues para anclas (`startTop`, `startHeight`, `startY`). `setState` solo en `onEnd`.
3. `src/components/EventCard.tsx` (NUEVO): tarjeta de evento con franjas de resize (2px) top/bottom usando dos `Gesture.Pan` con `hitSlop`.
4. `src/components/DroppablePremio.tsx` (NUEVO): reescribir `react-dnd` `useDrop` con `Gesture.Pan`; doble clic → `onPress` + temporizador o `onLongPress`.
5. `src/components/TimeDivider.tsx` (NUEVO): divisores Morning/Noon/Evening/Night (`TIME_DIVIDERS`).

**Guardrails** (`01` §3): worklets no cierran sobre estado React (copiar a sharedValue en `onBegin`, `runOnJS` solo en `onEnd`); gestos con refs; geometría en shared values; parametrizar fecha; `expo-crypto`; `onLayout` en vez de `getBoundingClientRect`; escalar hacks visuales (`+5`, `-7%`) con `PixelRatio`/`useWindowDimensions`.

**Definition of done**: crear/mover/redimensionar eventos con snap a 10px; commit persiste vía `useObjectiveStore.update`.

---

### AGENTE E — Vista Live (Fase 4)

**Objetivo**: portar `IndependentArcTimeline` + `InteractiveDonut` + `FloatingCirclesCanvas` y **conectarlos a datos reales**. Seguir `02-live-arcs-port.md`.

**Tareas**:
1. `src/components/IndependentArcTimeline.tsx` (NUEVO): arcos sobre círculo con `react-native-svg`. **Conectar a `useObjectiveStore`** (no datos hardcodeados). `arcTasks` como `useMemo` derivado de `tasks`.
2. `src/components/InteractiveDonut.tsx` (NUEVO): donut con segmentos arrastrables (`Gesture.Pan` por handle). Persistir ángulos → horas con `updateTask` en `onFinalize`.
3. `src/components/FloatingCirclesCanvas.tsx` (NUEVO): círculos flotantes con `react-native-skia` o Reanimated (`useFrameCallback`).

**Guardrails** (`02` §4): `TextPath` limitado → plan B `Text` posicionado con `polarToCartesian`; shared values para ángulos; convertir `e.x * (viewBoxWidth/layoutWidth)`; doble clic → `Gesture.Tap().numberOfTaps(2)`; IDs string.

**Definition of done**: la vista Live refleja tareas reales; arrastrar un handle actualiza la hora y persiste.

---

### AGENTE F — Sync/IA/Imágenes (Fase 5)

**Objetivo**: servicio de sincronización Google Calendar, servicio IA, procesamiento de imágenes. Seguir `03-backend-port.md`.

**Tareas**:
1. `src/services/googleCalendarSync.ts`: push/pull, cola de outbox, resolución por `updated_at`, campo `entities.data.syncStatus` (`local|synced|conflict`), `googleEventId`. OAuth en dispositivo (`expo-auth-session` + `expo-secure-store`), sin secretos.
2. `src/services/ia.ts`: descomposición de tareas, recomendaciones (LM Studio local o API remota).
3. `src/services/imageProcessor.ts`: stub para cloud function (Puppeteer+sharp+pdf-poppler).
4. **Eliminar** backend legacy: Spotify (`/login`, `/callback`), autoincrement, servido estático de imágenes, `DatabaseClient` Prisma, schema MySQL. **Solo si el repo legacy está en el workspace**; si no, documentar.

**Guardrails** (`03` §4): UUIDs en todo (eliminar `parseInt`); `images` con `entity_id`; no SQL crudo con interpolación de tabla.

**Definition of done**: crear/editar una Task local → push a Google; pull reconcilia; conflictos resueltos por `updated_at`.

---

### AGENTE G — Expansión Tareas (Fase 6)

**Objetivo**: quick-start 30s, modo consecutivo, earn stars, cronómetro, recovery blocks, crisis. Seguir `README` §7.

**Tareas**:
1. `src/components/QuickStart.tsx`: estrés del día (slider) + recompensa del día.
2. `src/components/Timer.tsx`: cronómetro de tarea/evento (play/pausa, editor de minutos).
3. `src/components/RecoveryBlock.tsx`: ciclos 25-5 / 50-10 según carga cognitiva.
4. `src/components/CrisisMode.tsx`: layout minimalista con tareas de 10 min guiadas.
5. Modo consecutivo: drag una tarea sobre otra → al completar empieza la siguiente.

**Definition of done**: cada feature persiste en SQLite y respeta la filosofía (soberanía, descanso, autocompasión).

---

## 3. Guardrails transversales (para TODOS los agentes)

1. **Funciones puras sin DOM** en módulos `.ts` compartidos (testeables).
2. **Reanimated worklets no cierran sobre estado React** → `sharedValue` + `runOnJS` solo en `onEnd`.
3. **Gestos con refs, no closures** → `useRef`/`sharedValue` para anclas.
4. **No re-render por frame** → geometría en shared values; `setState` al soltar.
5. **Parametrizar la fecha** en conversiones px↔tiempo (no asumir "hoy").
6. **`crypto.randomUUID()` no existe en RN** → `expo-crypto`.
7. **No hay `document`/`window`/`getBoundingClientRect`** → `onLayout` + gestos.
8. **OAuth en el dispositivo** (`expo-auth-session` + `expo-secure-store`), sin secretos en el backend.
9. **IDs string (UUID)** en todo el nuevo esquema; eliminar `parseInt`.
10. **Mantener la filosofía**: soberanía del usuario, descanso, autocompasión, generalización de habilidades.

---

## 4. Orden de ejecución y validación

1. **A** (fundaciones) → **B** (datos) → **C** (tareas) → **D** (grid) → **E** (live) → **F** (sync) → **G** (expansión).
2. Cada agente valida con `npx tsc --noEmit` (o `npm run` si existe) antes de entregar.
3. Tras cada fase, correr `npx expo start` (o `--web`) para smoke-test manual.
4. Los agentes **no** deben tocar archivos fuera de su alcance de escritura.

---

## 5. Contratos entre agentes (firmas compartidas)

- `Task` (de `lib/types.tsx`): `{ id: string; summary: string; start: StartEnd; end: StartEnd; isEvent: boolean; colorId?: string; tags?: TagType[]; type: "task"|"event"|"both"; reminders: Reminders }`.
- `useObjectiveStore.update(id, data, objectiveFields?)` — fuente de verdad para persistir tareas.
- `lib/calendario.ts` y `lib/geometry.ts` — funciones puras compartidas (sin DOM).
- `lib/theme.ts` — `theme.black`, `theme["#cccaca"]` (o alias `text`), `theme["#D9B5FF"]` (o alias `accent`).
