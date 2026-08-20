# 02 — Port de las vistas circulares "Live" y conexión de los arcos a datos reales

> Análisis de `calendario_antiguo/app/routes/circulol.tsx` (`IndependentArcTimeline`, `InteractiveDonut`) y `circulos.js` (`FloatingCirclesCanvas`), y cómo portarlas a React Native conectándolas a datos reales.

---

## 1. Cómo funcionan las vistas circulares

### 1.1 `IndependentArcTimeline` (L289–563)
- Dibuja tareas como **arcos** sobre un círculo (SVG puro, `width/height=500`, centro `(250,250)`, `baseRadius=200`).
- **Estado hardcodeado**: `tasks = [{id:1, startAngle:0, endAngle:90, color:"#3b82f6", radius:200}, {id:2, startAngle:180, endAngle:270, color:"#10b981", radius:200}]`. **No lee `useProject()`**.
- `detectParallelTasks()`: agrupa tareas que solapan angularmente (`start < other.end && end > other.start`).
- `adjustRadiiForParallelTasks(tasks)`: desplaza el radio de tareas paralelas (`radiusOffset = (groupIndex - (len-1)/2) * (radiusVariation/(len-1))`) para separarlas en anillos concéntricos.
- `angleToCoords(angle, radius)`: `radians = (angle-90)*PI/180`; devuelve `{x: centerX + r*cos, y: centerY + r*sin}`.
- `createTaskArcPath(task)`: `M start A radius radius 0 largeArcFlag 1 end` (con `largeArcFlag = arcLength>180`).
- **Arrastre**: `useEffect` registra `window.addEventListener("mousemove"/"mouseup")` cuando `dragging` no es null. `handleMouseMove` calcula el ángulo desde el centro al cursor y actualiza `startAngle`/`endAngle` (con límites 0–360 y garantía `end > start`). `handleMouseUp` filtra arcos de longitud ~0 y re-ajusta radios.
- **Render**: `renderTasks()` dibuja cada arco con grosor según paralelismo (`baseThickness/group.length`) y **handles** circulares arrastrables en ambos extremos (`onMouseDown` → `setDragging({taskId, type:"start"|"end"})`).

### 1.2 `InteractiveDonut` (L59–282)
- Donut SVG (`viewBox="0 0 200 200"`, centro `(100,100)`) con segmentos arrastrables.
- **Sí lee datos reales**: `const { tasks } = useProject()` (L64), filtra `filteredEvents` y calcula `processedEvents` con `detectOverlaps` (aunque no los usa para dibujar segmentos).
- `calculateAngle(event)`: `((atan2(y,x)*180/PI + 450) % 360)`.
- `normalizeAngle(angle)`: `((angle%360)+360)%360`.
- `handleDonutMouseDown`: crea un segmento nuevo (`id: Date.now()`, `color: hsl(random)`).
- `handleSegmentMouseDown`: selecciona un segmento para arrastrar.
- `handleMouseMove`: redimensiona con `SMOOTHING_FACTOR=0.5` y `requestAnimationFrame` (coalesce renders).
- `polarToCartesian`, `createArc`, `createCurvedText` (texto curvo con `<textPath>`).
- **Render**: arcos de `TIME_DIVIDERS` (Morning/Noon/Evening/Night) con colores, etiquetas curvas, donut de fondo, segmentos con etiqueta de hora (`TimeUtils.angleToTime`).

### 1.3 `FloatingCirclesCanvas` (circulos.js)
- Canvas 2D (800×600) con círculos flotantes animados.
- `recreateCircles()`: mapea `tasks` a círculos con posición/velocidad aleatoria.
- `updateCircles()`: bucle con `requestAnimationFrame`; rebota en bordes, añade ruido aleatorio, actualiza `smallCircles`.
- `handleCircleClick`: doble clic (`event.detail===2`) abre `EventFromTaskPopup`; clic simple pausa/reanuda movimiento.
- `handleMouseDown/Move/Up`: arrastre de círculos.

---

## 2. La brecha clave: conectar `IndependentArcTimeline` a datos reales

`InteractiveDonut` ya demuestra el patrón correcto (`useProject()`). `IndependentArcTimeline` usa datos hardcodeados.

### Algoritmo concreto
**Paso 1 — Leer tareas reales y mapearlas a arcos:**
```ts
const { tasks } = useProject()
const filteredTasks = useMemo(
  () => tasks.filter((t): t is Task => Boolean(t?.id && t?.start?.dateTime && t?.end?.dateTime)),
  [tasks]
)
const arcTasks = useMemo(() => filteredTasks.map((task) => ({
  id: task.id,                       // string, no number
  startAngle: minutesToAngle(timeToMinutes(task.start!.dateTime!)),
  endAngle:   minutesToAngle(timeToMinutes(task.end!.dateTime!)),
  color: getTailwindColor(task.colorId) ?? "#3b82f6",
  radius: baseRadius,
  task,                              // conservar la Task original para persistir
})), [filteredTasks])
```
Donde `minutesToAngle = (minutes) => (minutes / (24*60)) * 360`. Alternativa: extraer `HH:MM` del ISO y usar `TimeUtils.timeToAngle("HH:MM")`.

**Paso 2 — Asignar colores desde `colorId`:** usar `getTailwindColor(colorId)` o `googleColors` con fallback.

**Paso 3 — Persistir cambios de ángulo de vuelta a las horas:**
```ts
const angleToMinutes = (angle) => Math.round((angle / 360) * 24 * 60)
// en handleMouseUp (o con debounce):
const startDate = new Date(task.start!.dateTime!)
startDate.setHours(Math.floor(angleToMinutes(task.startAngle)/60), angleToMinutes(task.startAngle)%60, 0, 0)
const endDate = new Date(task.end!.dateTime!)
endDate.setHours(Math.floor(angleToMinutes(task.endAngle)/60), angleToMinutes(task.endAngle)%60, 0, 0)
updateTask(task.id, {
  start: { ...task.start, dateTime: startDate.toISOString() },
  end:   { ...task.end,   dateTime: endDate.toISOString() },
})
```

**Paso 4 — Ajustar tipos:** `dragging.taskId` debe ser `string` (no `number`).

**Paso 5 — Estado derivado:** `arcTasks` como `useMemo` derivado de `tasks` (no `useState` independiente) para que `updateTask` se refleje.

---

## 3. Cómo portar a React Native

### 3.1 Librerías
- `react-native-svg` (Svg, Path, Circle, Text, TextPath, G, Defs, Line).
- `react-native-gesture-handler` (GestureDetector/Gesture.Pan).
- `react-native-reanimated` (o Animated) para la animación de canvas.

### 3.2 Reemplazo de `window mousemove/mouseup`
Un `Gesture.Pan` por handle:
```tsx
const panStart = Gesture.Pan()
  .onBegin(() => setDragging({ taskId: task.id, type: 'start' }))
  .onUpdate((e) => {
    const dx = e.x - centerX
    const dy = e.y - centerY
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360
    // actualizar startAngle (misma lógica que handleMouseMove)
  })
  .onFinalize(() => { /* persistir con updateTask */ setDragging(null) })
```
`e.x/e.y` ya son relativos al contenedor (no hace falta `getBoundingClientRect`).

### 3.3 Reemplazo de `requestAnimationFrame` (canvas)
- **Reanimated**: `useSharedValue` para `x/y/dx/dy` + `useFrameCallback` (rebote en bordes en hilo de UI).
- **Animated**: `Animated.loop(Animated.timing(...))` (menos flexible para rebote condicional).
- Dibujo: `Svg`/`Circle` o `View` con `borderRadius` posicionados con `useAnimatedStyle`.

### 3.4 Qué se reutiliza tal cual (matemática pura)
`TimeUtils` (angleToTime, timeToAngle, hourToAngle, angleToHour), `timeToMinutes`, `formatMinutes`, `formatTime`, `detectOverlaps`, `detectParallelTasks`, `adjustRadiiForParallelTasks`, `polarToCartesian`, `createArc`, `createTaskArcPath`, `angleToCoords`, `getTailwindColor`/`googleColors`. → extraer a `lib/geometry.ts` / `lib/arcMath.ts`.

---

## 4. Guardrails

1. **`TextPath` de `react-native-svg` es limitado** → plan B: `Text` posicionado con `polarToCartesian` + rotación, o `SvgText` con `textAnchor="middle"`. Validar en dispositivo real.
2. **Refs de gestos y re-renders** → `useMemo`/`useRef` para gestos; shared values para ángulos; estado React solo en `onFinalize`.
3. **Evitar re-renders por frame** → geometría en shared values; sincronizar con `updateTask` al soltar.
4. **Matemática pura framework-agnóstica** → no importar React/DOM en `TimeUtils`, `detectParallelTasks`, etc.
5. **Canvas vs SVG** → arcos/donut (pocos) con `react-native-svg`; círculos flotantes (muchos animados) con `react-native-skia` o limitar el número.
6. **Coordenadas y `viewBox`** → convertir `e.x * (viewBoxWidth / layoutWidth)`; usar `useWindowDimensions`.
7. **`getBoundingClientRect` no existe** → `onLayout` del contenedor.
8. **Doble clic** (`event.detail===2`) no existe en RN → temporizador de doble toque o `Gesture.Tap().numberOfTaps(2)`; popup → `Modal`.
9. **IDs numéricos vs string** → cambiar a `string` al conectar a `useProject()`.
10. **Persistencia y estado derivado** → `arcTasks` como `useMemo` derivado de `tasks`; estado transitorio confirmado en `onFinalize`.
