# Reconversión de `calendario_antiguo` + `backend` → NeuroPlanner (React Native)

> Plan maestro de reconversión. **Inputs**: `calendario_antiguo/` (Remix/React web), `backend/` (Express/Prisma/MySQL), mockup `nuevo_frontend.html` (Framer). **Objetivo**: NeuroPlanner (Expo/React Native, SQLite local + Kysely, Zustand).
> **Filosofía**: `docs/idea/Affine_reqs.md`, `Component_Diagram.pdf`, `Diagrama_de_clases.pdf`.
> Documentos de soporte: [`01-drag-resize-port.md`](./01-drag-resize-port.md), [`02-live-arcs-port.md`](./02-live-arcs-port.md), [`03-backend-port.md`](./03-backend-port.md).

---

## 0. Resumen ejecutivo

- **`calendario_antiguo`** tiene la **algoritmia** (drag/resize, solapamientos, arcos, sincronización) mucho más completa; **`nuevo_frontend.html`** tiene el **diseño** (tema oscuro `#1f1f1f`/`#cccaca`/`#D9B5FF`, mobile-first) mucho más adecuado.
- **NeuroPlanner** ya tiene: shell (`Main`, `NavBar`, `Header`, `ToggleTabs`), tema oscuro (`lib/theme.ts`), stores Zustand, repositorios Kysely y esquema SQLite. **Faltan**: la vista de Tareas real (hoy es `Tareas!`), el grid de día, la vista Live, los premios, y la sincronización con Google Calendar.
- **Estrategia**: portar la **lógica pura** (funciones matemáticas) tal cual a módulos `.ts` sin DOM; reescribir la **UI** con componentes React Native; y **eliminar** el backend Express/MySQL en favor de repositorios locales + un servicio de sincronización a Google Calendar.

---

## 1. Filosofía del sistema (criterios de decisión)

De `Affine_reqs.md` (app "ResetPattern") y los diagramas:

1. **Soberanía del usuario**: datos locales, transparentes, pausables sin culpa. → *local-first SQLite*.
2. **Interacciones diarias de 2–3 min**: quick-start de 30s (estrés + recompensas), tareas con hora, earn stars, modo consecutivo.
3. **Descanso/compasión**: "rest/compassion days", bloques de recuperación, no forzar.
4. **Generalización de habilidades** y **lenguaje de autocompasión** (celebrar esfuerzo, no perfección).
5. **IA como copiloto**: descomponer tareas, recomendar descansos, preparación estratégica, detección de patrones.
6. **Vista Tareas** (Affine §Vista Tareas): 30s quick start, barritas editables, buscador de tareas por objetivo, hora si es evento, earn stars, modo consecutivo (drag una sobre otra), plantillas, mostrar/ocultar cumplidas, cronómetro, ongoing proyectos, editar tarea con tipo/estrés/autopremio, crisis protocol, veto power, context sensitivity.
7. **Vista Calendario Inteligente** (Affine §Vista de Calendario): modo día/semana, divisores de momentos del día, preparación estratégica, drag&drop de due dates, añadir descansos (recovery blocks), nudge schedule, batería social calibrada, botón crisis/mindfog.

**Criterio de reconversión**: cada pieza del sistema antiguo se evalúa contra estas 7 reglas. Si una función contradice la soberanía del usuario o el descanso, se rediseña; si aporta a la generalización de habilidades, se prioriza.

---

## 2. Inventario completo de lo que hay que portar (sin omitir nada)

### 2.1 Frontend `calendario_antiguo/app/`

| Archivo | Componentes/funciones | Destino en NeuroPlanner |
|---|---|---|
| `routes/_index.tsx` | `ViewProvider`, `MobileLayout` | Ya portado (`ViewContext.tsx`, `Main.tsx`) |
| `routes/Main.tsx` | `useViewContext`, `viewRegistry` | Ya portado (`Main.tsx`, `viewRegistry.tsx`) |
| `routes/NavBar.tsx` | `NavBar`, `NavItem`, `navigationItems` | Ya portado (`NavBar.tsx`) |
| `lib/header.tsx` | `Header` | Ya portado (`components/Header.tsx`) |
| `routes/cositos/menu.tsx` | `ToggleTabs` | Ya portado (`components/ToogleTabs.tsx`) |
| `lib/iconos.tsx` | `TasksIcon`, `CalendarIcon`, `RewardsIcon`, `AimsIcon`, `MonitorIcon`, `SettingsIcon`, `IconoIA` | Ya portado (`lib/iconos.tsx`) |
| `lib/calendario.tsx` | **Toda la algoritmia** (ver §3) | Portar funciones puras a `lib/calendario.ts` |
| `lib/types.tsx` | Todos los tipos | Ya portado (`lib/types.tsx`) |
| `lib/timepicker.tsx` | `MobileTimePicker` (reloj analógico) | **Portar** a RN (gestos + `@react-native-community/datetimepicker`) |
| `lib/ia.tsx` | `mainIA` (LM Studio) | **Portar** a un servicio IA (ver §6) |
| `lib/data_fromgc.tsx` | `fetchEvents`, `useGetData` | **Portar** a servicio de sincronización Google |
| `lib/data_frommysql.tsx` | `loader` (axios) | **Eliminar** (reemplazado por repositorios locales) |
| `routes/TaskList.tsx` | `AnimatedTaskManager`, `TaskItem`, `TaskBlockComponent`, `WeekViewRender` | **Portar** (ver §4, §7) |
| `routes/Dia.tsx` | `DiaCalendario`, `GridWithGroups`, `DroppablePremio`, `EventCard`, `TimeDivider` | **Portar** (ver `01-drag-resize-port.md`) |
| `routes/week-view.tsx` | `WeekView` | **Portar** |
| `routes/listasemanas.tsx` | `WeekScroller` | **Portar** |
| `routes/listaproyectos.tsx` | `ProjectsPage`, `ProjectBlock`, `ProjectGroup` | **Portar** |
| `routes/proyecto-utils.tsx` | `ProjectProvider`, `useProject` (todo el CRUD + sync) | **Portar** a stores/repositorios |
| `routes/Premios.tsx` | `Premios` | **Portar** |
| `routes/premio-utils.tsx` | `fetchPremios`, `handleStar`, `handleDelete`, `handleUpdate` | **Portar** a `RewardRepository` |
| `routes/premio-list.tsx` | `PremioList`, `Carousel` | **Portar** |
| `routes/premio-item.tsx` | `PremioItem` | **Portar** |
| `routes/premio-list-swap.tsx` | `PremioListSwap` | **Portar** |
| `routes/premio-item-swap.tsx` | `PremioItem` (drag) | **Portar** |
| `routes/tags.tsx` | `TaggingSystem` | **Portar** (tags en `entities.data.tags`) |
| `routes/task-editor.tsx` | `TaskEditor` (repetición, tags, convertir) | **Portar** |
| `routes/objetivos-tab.tsx` | `ObjectivesTab`, `Objectives` | **Portar** |
| `routes/circulol.tsx` | `EventCard`, `InteractiveDonut`, `IndependentArcTimeline` | **Portar** (ver `02-live-arcs-port.md`) |
| `routes/circulos.js` | `FloatingCirclesCanvas` | **Portar** (ver `02-live-arcs-port.md`) |
| `routes/cositos/dias.tsx` | `WeeklySchedule` (horario transversal) | **Portar** |
| `routes/cositos/sunburst-crud-app.tsx` | `SunburstCRUDApp` | **Portar** |
| `routes/cositos/timelinescheduler.tsx` | `TimelineScheduler` | **Portar** |
| `routes/cositos/task-accordion.tsx` | `TaskAccordion`, `TaskItem` | **Portar** |
| `routes/events.tsx` | `EventItem` | **Portar** |
| `routes/Popup.tsx`, `PopupEdit.tsx`, `CreateTaskPopup.js`, `CreateEventPopup.js`, `Tareas_Eventos.js` | Popups de creación/edición | **Portar** a `Modal`/`BottomSheet` |
| `routes/FloatingButton.tsx` | `FloatingButton` | **Portar** |
| `routes/image-processor.tsx` | `loader`/`action` | **Portar** a cloud function |
| `routes/acceso.js` | `useGoogleAuth` | **Portar** a `hooks/useGoogleAuth.ts` (ya existe) |
| `routes/login.tsx` | Spotify login | **Eliminar** |
| `old/` | `App.js`, `Premios.js`, `Premios_spotify.js`, `FloatingButton.js`, `Popup.js`, `PopupEdit.js`, `ImageLoader.js` | **Eliminar** (obsoleto) |

### 2.2 Backend `backend/`

| Archivo | Contenido | Destino |
|---|---|---|
| `server.js` | 17 endpoints Express | Ver `03-backend-port.md` |
| `src/client.js` | `DatabaseClient` (Prisma) | **Eliminar** → repositorios Kysely |
| `src/pdfUtils.js` | `copyPDF`, `processPDF` | **Portar** a cloud function |
| `prisma/schema.prisma` | 6 modelos MySQL | **Eliminar** → esquema SQLite `CALENDARIA.sql` |
| `src/index.js`, `index.css`, `client.js` | CRA boilerplate | **Eliminar** |

---

## 3. Algoritmia a portar tal cual (funciones puras)

Estas funciones **no dependen de DOM** y se copian sin cambios a módulos `.ts` compartidos (testeables con Jest, reutilizables en web y RN):

**De `lib/calendario.tsx`:**
- `detectOverlaps` (agrupa eventos solapados)
- `createCalendarGrid` (grid de 96 filas de 15 min)
- `findGridRowForTime` / `findTimeForGridRow` (px ↔ tiempo)
- `timeToMinutes`, `TimeUtils` (`angleToTime`, `timeToAngle`, `hourToAngle`, `angleToHour`), `formatMinutes`, `formatTime`, `DateUtils`
- `createSquare` (lógica de resize)
- `createGoogleEventFromActiveSquare`
- `getTailwindColor` / `googleColors` (mapeo colorId → color)
- `eventToTask` / `taskToEvent` (conversión tarea ↔ evento)
- `upsertEvent` / `createEvent` / `updateEvent` / `deleteEvent` (CRUD Google, solo `fetch`)

**De `routes/Dia.tsx`:** `getEventBounds`, `getGroupBounds`, `calculateEventStyle` (extraer a helper).

**De `routes/circulol.tsx`:** `detectParallelTasks`, `adjustRadiiForParallelTasks`, `polarToCartesian`, `createArc`, `createTaskArcPath`, `angleToCoords`.

**Guardrail**: extraer a `lib/geometry.ts` y `lib/calendario.ts` **sin imports de React/DOM**. Parametrizar la fecha (no asumir "hoy") en `findTimeForGridRow`/`createGoogleEventFromActiveSquare`.

---

## 4. Lista de cambios por orden de dificultad

### 🟢 Nivel 1 — Bajo (fundaciones, sin gestos)

1. **Tema oscuro del mockup** → actualizar `lib/theme.ts` con `#1f1f1f`, `#cccaca` 95%, `#D9B5FF` 85% y aplicarlo a `Header`, `NavBar`, `ToggleTabs`, `Main`. *(Ref: `MOCKUP_TASKS_ANALISIS.md`)*
2. **Extraer funciones puras** de `calendario.tsx`/`Dia.tsx`/`circulol.tsx` a módulos `.ts` sin DOM. *(Ref: §3)*
3. **Portar `MobileTimePicker`** a RN (reloj analógico con gestos + `datetimepicker`).
4. **Portar `TaggingSystem`** (tags en `entities.data.tags`).
5. **Portar `TaskEditor`** (repetición, tags, convertir tarea↔evento) a un `Modal`.
6. **Portar `FloatingButton`** a RN.
7. **Portar `PremioList`/`PremioItem`/`Carousel`** a RN (FlatList horizontal).
8. **Portar `WeekView`** (grid de 7 días) a RN.
9. **Portar `ObjectivesTab`** a RN.
10. **Portar `WeeklySchedule`** (horario transversal) a RN.

### 🟡 Nivel 2 — Medio (gestos, drag&drop, listas)

11. **Portar `AnimatedTaskManager`** (lista de tareas con drag&drop, bloques, modo consecutivo) a RN. *(Ref: `TaskList.tsx`)*
12. **Portar `TaskItem`/`TaskBlockComponent`** con `react-native-draggable-flatlist` o `Gesture.Pan`.
13. **Portar `WeekScroller`** (scroll de semanas con drop de proyectos).
14. **Portar `ProjectsPage`/`ProjectBlock`** (jerarquía de proyectos con drag&drop y descomposición IA).
15. **Portar `PremioListSwap`/`PremioItemSwap`** (círculos arrastrables).
16. **Portar `SunburstCRUDApp`** (d3 → `react-native-svg`).
17. **Portar `TimelineScheduler`** a RN.
18. **Portar `TaskAccordion`** a RN.

### 🔴 Nivel 3 — Alto (grid de día, arcos, sincronización)

19. **Portar `DiaCalendario`/`GridWithGroups`** (grid de día con drag/resize/snap) → **el más complejo**. *(Ref: `01-drag-resize-port.md`)*
20. **Portar `DroppablePremio`** (premios arrastrables a eventos).
21. **Portar `IndependentArcTimeline` + `InteractiveDonut`** (vista Live) y **conectar a datos reales**. *(Ref: `02-live-arcs-port.md`)*
22. **Portar `FloatingCirclesCanvas`** (círculos flotantes) con `react-native-skia` o Reanimated.
23. **Servicio de sincronización Google Calendar** (push/pull, cola de outbox, resolución de conflictos). *(Ref: `03-backend-port.md`)*
24. **Servicio IA** (descomposición de tareas, recomendaciones) — LM Studio local o API remota.
25. **Procesamiento de imágenes** (PDF/screenshot) → cloud function.

---

## 5. Mismatches, optimizaciones y problemas

### 5.1 Mismatches de datos (MySQL → SQLite)

| Legacy | Nuevo | Problema |
|---|---|---|
| `tareas.id` = id de evento Google (string) | `entities.id` = UUID | Necesita `entities.data.googleEventId` + migración |
| `premios.id`/`proyectos.id` = `Int autoincrement` | UUID | Todos los FKs y `parseInt(id)` rompen |
| `images` clave `(table_name, external_id)` | `images.entity_id` | Reasignar cada imagen a su entidad |
| `task_block` | `habit_templates` | `top/height/expanded/color` no tienen equivalente |
| `premios` | `rewards` | `fav→is_favorite`, `esfuerzo→effort_required`, `nombre→name` |
| `proyectos`/`sub_proyecto` | `objectives` (type Project) | Jerarquía 2 niveles → árbol recursivo |
| `tareas.start/end/recurrence/reminders/transparency/colorId` (JSON/enum) | `entities.data` (JSON) | Se conserva como JSON |

### 5.2 Problemas del backend legacy

1. **Secretos hardcodeados**: `client_id`/`client_secret` de Spotify en `server.js` (L19-20). → eliminar/mover a env.
2. **SQL crudo con interpolación de tabla** (`$queryRawUnsafe`, `$executeRawUnsafe`) → riesgo de inyección; `ALTER TABLE AUTO_INCREMENT` no existe en SQLite.
3. **Bug latente**: `POST /imageprocessor` usa tabla `images_premios` que no existe en `schema.prisma`.
4. **Inconsistencia de nombres**: `GET /api/projects` accede a `project.startDate/tasks/subProjects` (camelCase) pero el schema usa `startdate/tareas/sub_proyecto` → rompe en runtime.
5. **Router genérico** `POST /api/:table` expone cualquier tabla por URL.
6. **`parseInt(id, 10)`** en `read/update/delete` rompe con UUIDs.

### 5.3 Optimizaciones para RN

- **Grid de 96 filas**: no renderizar 96 `View`; usar `FlatList` con `getItemLayout` o dibujar líneas con `react-native-svg`.
- **Drag sin re-renders**: usar `sharedValue` (Reanimated) para `top/height`; `setState` solo en `onEnd`.
- **Canvas vs SVG**: arcos/donut (pocos) → `react-native-svg`; círculos flotantes (muchos animados) → `react-native-skia`.
- **`TextPath` de `react-native-svg` es limitado**: plan B = `Text` posicionado con `polarToCartesian` + rotación.
- **Coordenadas de gestos**: convertir `e.x * (viewBoxWidth / layoutWidth)`.

### 5.4 Problemas de filosofía a corregir

- **`IndependentArcTimeline` usa datos hardcodeados** → viola la soberanía del usuario (no refleja sus tareas). Conectar a `useProject()`.
- **`accessToken` es un `idToken`** (Google Identity) pero Calendar REST necesita OAuth access token → corregir con `expo-auth-session`.
- **Tags en `localStorage`** → mover a `entities.data.tags` (persistente y sincronizable).
- **Doble fuente de verdad** (Google + MySQL) sin sync robusta → unificar con SQLite local + servicio de sync.

---

## 6. Backend: qué portar y qué eliminar

Ver detalle completo en [`03-backend-port.md`](./03-backend-port.md). Resumen:

- **Eliminar**: Spotify (`/login`, `/callback`), autoincrement (`/:table/maxid`, `resetAutoIncrement`), servido estático de imágenes, `uploadFile`/`uploadMetadata`, `DatabaseClient` Prisma, schema MySQL.
- **Convertir a repositorios locales** (Kysely): todo el CRUD de tareas/proyectos/premios/imágenes → `ObjectiveRepository`, `RewardRepository`, `HabitRepository`, `BaseEntityRepository`.
- **Convertir a servicio de sincronización Google Calendar**: `GET /api/projects` (formateo de tareas), `POST /api/tareas/batch`, y el CRUD de eventos. Estrategia: SQLite como fuente de verdad del dominio; Google como fuente de verdad de eventos; push/pull con cola de outbox y resolución por `updated_at`.
- **Mover a cloud function**: `POST /imageprocessor` (Puppeteer + sharp + pdf-poppler).

---

## 7. Expansión de Tareas (propuesta)

Basado en `Affine_reqs.md` §Vista Tareas y §Vista de Calendario Inteligente, y en el mockup:

### 7.1 Quick-start de 30s
- Al entrar: dos inputs rápidos — **estrés del día** (slider) y **recompensa del día**.
- Barritas horizontales editables bajo cada elemento; arriba un placeholder "nueva tarea" con buscador de tareas por objetivo (nodos sin outgoing connections), coloreadas por objetivo.

### 7.2 Modo consecutivo
- Drag&drop una tarea sobre otra → al completar una, empieza la siguiente (aparece sobre estrés/placeres). *(Ya existe `addConsecutiveTask` en `TaskList.tsx`)*.

### 7.3 Earn stars + animación de win
- Completar tarea arroja un color satisfactorio y estrellas. *(Ref: `handleToggleCompletion`, `handleBlockToggleCompletion`)*.

### 7.4 Cronómetro de tarea/evento
- Botón de play → cronómetro con editor de minutos/horas y botones inicio/pausa. *(Ref: `MobileTimePicker`)*.

### 7.5 Editor de tarea enriquecido
- Nombre | hora inicio/fin; tipo (default Auto → IA clasifica con etiquetas); qué tarea/hábito lo triggea; dónde; autopremio; biometric stress PRE/POST; lista de objetivos (click cambia color de fondo); IA genera íconos; botón calendarizar. *(Ref: `task-editor.tsx`)*.

### 7.6 Vista de día con divisores de momentos
- Divisores Morning/Noon/Evening/Night (`TIME_DIVIDERS`) como equalizador, con fondo gris. *(Ref: `Dia.tsx` `TimeDivider`)*.

### 7.7 Preparación estratégica + IA
- Botón "IA recomienda" por evento: detecta tipo de evento y dificultades, sugiere ejercicios de 3 min. *(Ref: `ia.tsx`)*.

### 7.8 Recovery blocks / descansos
- Botón "añadir descansos": propone ciclos 25-5 / 50-10 según carga cognitiva; aparecen como "Recovery Blocks" sincronizados con Google. *(Ref: `calendar_items` en SQLite)*.

### 7.9 Crisis / mindfog
- Botón de crisis → layout minimalista con tareas pequeñas (10 min) y guiadas; dividir tarea en subtareas o editar duración a mano.

### 7.10 Veto power / context sensitivity
- "Permitir reprogramar si ansiedad > 7/10"; sensibilidad contextual (ubicación/tiempo).

---

## 8. Guardrails transversales

1. **Funciones puras sin DOM** en módulos `.ts` compartidos (testeables).
2. **Reanimated worklets no cierran sobre estado React** → usar `sharedValue` + `runOnJS` solo en `onEnd`.
3. **Gestos con refs, no closures** → `useRef`/`sharedValue` para anclas.
4. **No re-render por frame** → geometría en shared values; `setState` al soltar.
5. **Parametrizar la fecha** en conversiones px↔tiempo (no asumir "hoy").
6. **`crypto.randomUUID()` no existe en RN** → `expo-crypto`.
7. **No hay `document`/`window`/`getBoundingClientRect`** → `onLayout` + gestos.
8. **OAuth en el dispositivo** (`expo-auth-session` + `expo-secure-store`), sin secretos en el backend.
9. **IDs string (UUID)** en todo el nuevo esquema; eliminar `parseInt`.
10. **Mantener la filosofía**: soberanía del usuario, descanso, autocompasión, generalización de habilidades.

---

## 9. Orden de ejecución recomendado

1. **Fase 0 (fundaciones)**: tema oscuro, extraer funciones puras, tipos.
2. **Fase 1 (CRUD local)**: portar repositorios/stores para tareas, proyectos, premios, imágenes; eliminar backend MySQL.
3. **Fase 2 (lista de Tareas)**: `AnimatedTaskManager` + `TaskItem` + `TaskEditor` + tags + premios.
4. **Fase 3 (grid de día)**: `DiaCalendario`/`GridWithGroups` + `DroppablePremio` (drag/resize).
5. **Fase 4 (vista Live)**: `IndependentArcTimeline` + `InteractiveDonut` conectados a datos reales.
6. **Fase 5 (sincronización)**: servicio Google Calendar + IA + procesamiento de imágenes.
7. **Fase 6 (expansión Tareas)**: quick-start, modo consecutivo, cronómetro, recovery blocks, crisis.

---

## 10. Documentos de soporte

- [`01-drag-resize-port.md`](./01-drag-resize-port.md) — sistema de drag/resize del grid de día y su port a RN.
- [`02-live-arcs-port.md`](./02-live-arcs-port.md) — vistas circulares "Live" y cómo conectar los arcos a datos reales.
- [`03-backend-port.md`](./03-backend-port.md) — inventario de endpoints y mapeo tabla por tabla MySQL → SQLite.
- [`04-mockup-div-structure.md`](./04-mockup-div-structure.md) — estructura de divs del mockup, nombres confusos, divs sin usar, y árbol objetivo de la vista de Tareas en RN.

> **Nota**: `docs/idea/schedule.html` es **byte-idéntico** a `nuevo_frontend.html` (verificado con `diff`). No contiene una vista Live separada; es una copia de la vista de Tasks. La vista Live (L) debe reconstruirse desde `circulol.tsx`/`circulos.js` siguiendo el CSS huérfano del mockup (ver `04-mockup-div-structure.md` §2 y `02-live-arcs-port.md`).

Ver también: [`../idea/MOCKUP_TASKS_ANALISIS.md`](../idea/MOCKUP_TASKS_ANALISIS.md), [`../idea/MOCKUP_TASKS_VIEWS_ALTERNATIVAS.md`](../idea/MOCKUP_TASKS_VIEWS_ALTERNATIVAS.md), [`../idea/CALENDARIO_ANTIGUO_FUNCIONALIDADES.md`](../idea/CALENDARIO_ANTIGUO_FUNCIONALIDADES.md), [`../actual/ARCHITECTURE.md`](../actual/ARCHITECTURE.md), [`../actual/DATABASE_ERD.md`](../actual/DATABASE_ERD.md).
