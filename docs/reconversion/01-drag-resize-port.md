# 01 — Port del sistema de drag/resize (grid de día) a React Native

> Análisis de `calendario_antiguo/app/routes/Dia.tsx` (`GridWithGroups`) y `lib/calendario.tsx`, y cómo portarlo a Expo/React Native.

---

## 1. Cómo funciona el drag/resize en `GridWithGroups`

### 1.1 Estado y refs clave
- `tempEvent` (`{ id, event: Partial<Task>, isNew }`) — el evento "fantasma" que se crea/mueve/redimensiona.
- `resizeEdge` (`"top" | "bottom" | null`) — qué borde se arrastra.
- `eventGroups` (`TaskBlock[]`) — grupos de eventos solapados (salida de `detectOverlaps`).
- `activeGroup` / `activeHuevada` — grupo/evento seleccionado para el overlay de edición.
- Refs de ancla: `startTop`, `startHeight`, `startY`.

El grid se construye con `createCalendarGrid()`: 96 filas (24h × 4 bloques de 15 min), cada una con `startTime`, `endTime`, `top` (px), `height` (px). Con `hourHeight=40`, cada fila mide 10px → **10px = 15min = 1 fila** (origen del snap a 10px).

### 1.2 Conversión píxel ↔ tiempo
- **Tiempo → px**: `findGridRowForTime(grid, time)` formatea ISO a `HH:mm` y busca la fila donde `startTime <= timehh < endTime`.
- **px → tiempo**: `findTimeForGridRow(grid, px)` toma la fila de mayor `top <= px` y devuelve `{ top, startTime, startDateTime }`. `startDateTime` se arma con `new Date()` (hoy) — **frágil** (ver guardrails).
- **px → duración**: `durationInMinutes = Math.round((newHeight / hourHeight) * 60)`; fin = `addMinutes(newStartTime, durationInMinutes)`.

### 1.3 Geometría
- `getEventBounds(event)` → `{ top, end, height }` en px (vía `findGridRowForTime`).
- `getGroupBounds(group)` → rectángulo envolvente del grupo (`top = min(tops)+5`, `height = max(bottoms)-min(tops)`).
- `calculateEventStyle(event, group)` → divide el ancho entre eventos solapados: `width = (100/total)%`, `right = (total-index-1)*(100/total)%` (lógica de "columnas").

### 1.4 Flujo del gesto (mouse down → move → up)
**`handleMouseDown`** (crea el evento temporal):
1. Si ya hay `tempEvent`, retorna.
2. `y = e.clientY - rect.top`; `snappedY = Math.floor(y/10)*10` (snap).
3. Fija anclas: `startY = startTop = snappedY`, `startHeight = 10`.
4. `createNewEvent(snappedY, snappedY+10)` → `id: crypto.randomUUID()`, `start/end` vía `findTimeForGridRow`.
5. Añade un grupo temporal a `eventGroups`.

**`handleMouseMove`** (resize/move con snap) — listener global de `document`:
- `currentY = e.clientY - rect.top`.
- Rama `resizeEdge === "top"`: `deltaY = round((currentY-anchorTop)/10)*10`; `newTop = clamp(anchorTop+deltaY, 0, anchorTop+anchorHeight-10)`; `newHeight = anchorHeight - (newTop-anchorTop)`.
- Rama `resizeEdge === "bottom"`: `newHeight = max(10, round((currentY-anchorTop)/10)*10)`, top fijo.
- Rama creación (`isNew`): `snapY = round(currentY/10)*10`; si `snapY < startY-10` → `resizeEdge="top"`; si `snapY > startY+10` → `resizeEdge="bottom"` (el primer gesto decide la dirección).
- Clamp final: `newHeight = min(newHeight, gridHeight - newTop)`.
- Convierte a tiempo: `newStartTime = findTimeForGridRow(grid, newTop)?.startDateTime`; `newEndTime = addMinutes(newStartTime, durationInMinutes)`.

**`handleMouseUp`** (commit):
1. Si `getEventBounds(tempEvent.event).height < 20` (menos de 2 filas), descarta.
2. Busca el grupo existente que contiene el evento; si existe actualiza la tarea y recalcula bounds; si no crea grupo nuevo.
3. Si `isNew` → abre overlay de edición; si no → `handleUpdateEvent` (persiste el resize).
4. Limpia `activeGroup`, `tempEvent`, `resizeEdge`.

**`handleStartResize`** (inicia resize de evento existente): fija anclas desde `getEventBounds(event)` y `setTempEvent({..., isNew:false})` + `setResizeEdge(edge)`. Se dispara desde franjas de 2px en top/bottom de cada tarjeta.

### 1.5 `detectOverlaps`
- Filtra eventos sin `start/end.dateTime`; ordena por `timeToMinutes(start)`.
- Agrupa eventos que solapan (`start < e.end && end > e.start`).
- Recalcula `top/height` del grupo como min/max de minutos.
- **Nota**: la división en columnas NO ocurre aquí; la hace `calculateEventStyle` en el render. El id de grupo usa `Math.random()`.

### 1.6 `DroppablePremio`
- Zona de drop sobre cada grupo; asocia un premio (`idEvento`) y muestra su imagen circular; doble clic lo desasocia. Usa `useDrop` de `react-dnd`.

### 1.7 Persistencia
- `upsertEvent` (POST/PATCH a Google Calendar v3), `createEvent`/`updateEvent`/`deleteEvent` wrappers.
- `createGoogleEventFromActiveSquare` convierte el rectángulo activo a un `Task` con `colorId` mapeado desde hex vía `buildHexToColorIdMapping`.

---

## 2. Cómo portar a React Native

### 2.1 Librerías
| Librería | Rol |
|---|---|
| `react-native-gesture-handler` | `GestureDetector` + `Gesture.Pan()` (o `PanResponder`) |
| `react-native-reanimated` | posición en hilo de UI sin re-render |
| `react-native-svg` | dibujar grid/líneas horarias como vectores |
| `expo-image` / `expo-linear-gradient` | imágenes de premios, estilos |
| `@react-native-community/datetimepicker` | reemplaza `<input type="time">` |
| `react-native-keyboard-aware-scroll-view` | overlay de edición con teclado |

### 2.2 Reemplazo de eventos de ratón
- `onMouseDown` del grid → `Gesture.Pan().onBegin()`.
- `onMouseMove` global → `onUpdate` (provee `translationY`, `absoluteY`).
- `onMouseUp` global → `onEnd`/`onFinalize`.
- `e.clientY - rect.top` → `event.absoluteY - gridLayout.y` (vía `onLayout`) o `translationY` acumulado.

```tsx
const pan = Gesture.Pan()
  .onBegin(() => { /* fijar anclas: startTop, startHeight, startY */ })
  .onUpdate((e) => {
    // e.translationY en px; snap: Math.round(translationY/10)*10
    // calcular newTop/newHeight y newStartTime/newEndTime
    // escribir en sharedValue (sin setState)
  })
  .onEnd(() => { /* commit: handleMouseUp equivalente */ });
```

Los bordes de resize (top/bottom) usan dos `Gesture.Pan()` separados con `hitSlop`.

### 2.3 Qué se reutiliza tal cual (funciones puras)
`detectOverlaps`, `createCalendarGrid`, `findGridRowForTime`, `findTimeForGridRow`, `timeToMinutes`, `TimeUtils`, `formatMinutes`, `DateUtils`, `createSquare`, `createGoogleEventFromActiveSquare`, `getEventBounds`, `getGroupBounds`, `calculateEventStyle`.

### 2.4 Qué debe cambiar
| Web | RN |
|---|---|
| `onMouseDown/Move/Up` + `document.addEventListener` | `GestureDetector` + `Gesture.Pan()` |
| `getBoundingClientRect()` | `onLayout` del contenedor |
| `crypto.randomUUID()` | `expo-crypto` |
| Clases Tailwind | objetos de estilo RN |
| `document.body.classList.add("no-select")` | no necesario |
| `<img>` | `<Image source={{uri}} />` |
| `react-dnd` (`useDrop`) | `Gesture.Pan` + drop manual |
| `Intl.DateTimeFormat().resolvedOptions().timeZone` | `expo-localization` |
| `setTimeout(...,0)` | `InteractionManager.runAfterInteractions` |

---

## 3. Guardrails

1. **Reanimated worklets no cierran sobre estado React** → copiar a `sharedValue` en `onBegin`; `runOnJS` solo en `onEnd`.
2. **Gestos con refs, no closures** → `useRef`/`sharedValue` para anclas.
3. **Evitar re-renders por frame** → geometría en shared values; `setState` al soltar.
4. **`findTimeForGridRow` asume "hoy"** → parametrizar la fecha del día visible.
5. **`crypto.randomUUID()` no existe en RN** → `expo-crypto`; `detectOverlaps` usa `Math.random()` (colisiones).
6. **No hay `document`/`window`** → ciclo de vida del gesto.
7. **Funciones matemáticas puras sin DOM** en módulos `.ts`.
8. **Hacks visuales** (`+5` de `getGroupBounds`, `-7%` de `calculateEventStyle`) → escalar con `PixelRatio`/`useWindowDimensions`.
9. **`addMinutes` usa `toISOString()` (UTC)** → construir fechas con offset explícito de la zona del usuario.
10. **`DroppablePremio` depende de `react-dnd`** → reescribir con `Gesture.Pan`; doble clic → `onPress` + temporizador o `onLongPress`.
11. **Overlay de edición** → `TextInput` + `Pressable`; selector de color → fila de `Pressable` circulares.
12. **Grid de 96 filas** → `FlatList` con `getItemLayout` o `react-native-svg` (no 96 `View`).
