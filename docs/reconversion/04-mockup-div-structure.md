# 04 — Estructura de divs del mockup y reconversión de la vista de Tareas

> Documento de trabajo **muy específico** sobre la estructura de divs de `nuevo_frontend.html`. Objetivo: reconvertir tanto el JSX de `calendario_antiguo` como la app NeuroPlanner (especialmente la **vista de Tareas**) para que funcionen sobre esta estructura.
> **Advertencia**: el HTML es un mockup de Framer → tiene **divs sin usar** y **nombres de clase confusos** (hashes tipo `.framer-1qpez88`). Aquí se "limpian" a nombres semánticos y se marca qué es real y qué es CSS huérfano.

---

## 1. Árbol de divs real del mockup (lo que se renderiza en `<body>`)

```
#main
└─ ROOT  .framer-UgJjk.framer-72rtr7            (375×667, centrado)
   └─ SCREEN .framer-xiAZU.framer-1fm37uy       [data-framer-name="Hoy"] bg #1f1f1f, radius 48
      ├─ HEADER .framer-ghh44y                  (padding 40/23/23, gap 31)
      │  └─ HEADER_ROW .framer-wdnlgx           (fila: título + selector + chevrons)
      │     ├─ TITLE_BLOCK .framer-1o6alss      (columna)
      │     │  ├─ TITLE .framer-1r9s1p9         (RichText "Today" 30px #cccaca)
      │     │  └─ DATE .framer-83yydc           (RichText "Fri, Nov 21" 15px #D9B5FF)
      │     ├─ DAY_SELECTOR .framer-ehqvfl      (bg #1f1f1f)
      │     │  └─ DAY_SELECTOR_INNER .framer-1chmfyk-container
      │     │     └─ PILL .framer-Nm7tg         (píldora T/S/L)
      │     │        ├─ TAB_T .framer-6dih1i    (activo, bg #D9B5FF, texto #1f1f1f)
      │     │        │  └─ TAB_T_LABEL .framer-ry0hqa  ("T")
      │     │        ├─ TAB_S .framer-1m8fufz   (inactivo, texto #cccaca)
      │     │        │  └─ TAB_S_LABEL .framer-1b7al8p ("S")
      │     │        └─ TAB_L .framer-2qwyb4    (inactivo, texto #cccaca)
      │     │           └─ TAB_L_LABEL .framer-pl3bgb ("L")
      │     └─ CHEVRONS .framer-1vjwn96
      │        ├─ CHEVRON_PREV .framer-1pk99ew  (svg, stroke #D9B5FF)
      │        └─ CHEVRON_NEXT .framer-noal5d   (svg, stroke #D9B5FF)
      ├─ TASK_LIST .framer-4flcmv               (área de tareas)
      │  └─ TASK_SCROLL .framer-7j74qj          (scrollable)
      │     └─ TASK_LIST_INNER .framer-1ykxxan  (wrapper, absolute top:0 left:50%)
      │        ├─ TASK_ROW_1 .framer-1qpez88
      │        │  ├─ TASK_TITLE .framer-1xyjv4q (border-bottom 1px #D9B5FF)
      │        │  │  ├─ TASK_TEXT .framer-ezeog8 ("asdasd")
      │        │  │  └─ TASK_META .framer-19492rz (derecha)
      │        │  │     ├─ TASK_CIRCLE .framer-18m87zp (svg círculo #D9B5FF)
      │        │  │     └─ TASK_TIME .framer-1o53nom ("14:29pm")
      │        │  └─ TASK_ICON .framer-1pyory5
      │        │     └─ TASK_ICON_SVG .framer-2t5g6w (svg círculo)
      │        ├─ TASK_ROW_2 .framer-921qny
      │        │  ├─ TASK_TITLE .framer-73wedq  (border-bottom 1px #D9B5FF)
      │        │  │  └─ TASK_TEXT .framer-1ikverr ("asdasd")
      │        │  └─ TASK_ICON .framer-1aj2koc
      │        │     └─ TASK_ICON_SVG .framer-etwlke
      │        └─ TASK_ROW_NEW .framer-g7b7wa   (fila "New task")
      │           ├─ TASK_TITLE .framer-rpu0qi  (border-bottom 1px #cccaca ← distinto)
      │           │  └─ TASK_TEXT .framer-1rzx6nk ("New task")
      │           └─ TASK_ICON_EMPTY .framer-ftly1z (vacío)
      ├─ FAB .framer-1xqa3ca-container          (sticky top, z-index 1)
      │  └─ FAB_BTN .framer-Ib4I2              (bg #D9B5FF)
      │     └─ FAB_ICON .framer-6c64md
      │        └─ FAB_ICON_SVG .framer-ad22yd   (chevron/plus)
      └─ NAV .framer-1wphi1r                    [data-framer-name="Menu"] bg #1f1f1f, h80
         └─ NAV_INNER .framer-8ggwsy-container
            └─ NAV_ROW .framer-6dglV
               ├─ NAV_TASKS .framer-rb2iqg      (activo, bg #D9B5FF, texto #1f1f1f)
               │  ├─ NAV_ICON .framer-wnilp0     (svg calendario)
               │  └─ NAV_LABEL .framer-girugj    ("Tasks" Nunito 600)
               ├─ NAV_REWARDS .framer-b0xr47    (inactivo, #cccaca)
               │  ├─ NAV_ICON .framer-igqpvo
               │  └─ NAV_LABEL .framer-qcgf4l   ("Rewards")
               ├─ NAV_AIMS .framer-man1vj
               │  ├─ NAV_ICON .framer-14vg4yl
               │  └─ NAV_LABEL .framer-v51id3   ("Aims")
               ├─ NAV_MONITOR .framer-1g8p9ei
               │  ├─ NAV_ICON .framer-luivbr
               │  └─ NAV_LABEL .framer-gge9n6   ("Monitor")
               └─ NAV_SETTINGS .framer-1na3i4j
                  ├─ NAV_ICON .framer-11mokz8
                  └─ NAV_LABEL .framer-1j5ze01  ("Settings")
```

---

## 2. Divs sin usar / CSS huérfano (importante)

> **Nota sobre `schedule.html`**: `schedule.html` es **byte-idéntico** a `nuevo_frontend.html` (verificado con `diff`). NO contiene una vista Live separada; es una copia de la vista de Tasks. Por tanto, **no aporta un frontend nuevo para la vista L (Live)**. La vista Live solo existe como CSS huérfano (abajo) y como implementación real en `circulol.tsx`/`circulos.js`.

El `<body>` **solo renderiza la vista T (Tasks)**. Pero la hoja de estilos contiene clases para las vistas **S (Schedule)** y **L (Live)** que **no aparecen en el body**:

| Clase CSS (huérfana) | Significado | Vista |
|---|---|---|
| `.framer-13prhc4` | `grid-template-rows: repeat(24, minmax(0,1fr))` → **grid de 24 horas** | S (Schedule) |
| `.framer-1lu2arb` … `.framer-15pkmsu` | filas horarias posicionadas (top/bottom en px) | S (Schedule) |
| `.framer-1787d8n`, `.framer-sn738i`, `.framer-1kyboi7` | columnas del grid | S (Schedule) |
| `.framer-10x2d26` | elemento `200×200` | L (Live) |
| `.framer-1b1ngss` | `width: calc(100% - 147px)`, aspect-ratio 1 → **círculo** | L (Live) |
| `.framer-176gy2m` | `150×150` → **dona** | L (Live) |
| `.framer-1gzil4h`, `.framer-u6g7ij`, `.framer-10s0f3y` | contenedores del círculo | L (Live) |
| `.framer-41ojjl`, `.framer-cbl96a`, `.framer-tl4a62`, `.framer-x1a0ih`, `.framer-1l0p38w` | elementos del grid/reloj | S/L |

**Conclusión**: el mockup ya "anticipa" las vistas S y L en su CSS, pero solo muestra T. Esto **confirma** el mapeo T/S/L → Tasks / Schedule / Live (ver `MOCKUP_TASKS_VIEWS_ALTERNATIVAS.md`). Al reconvertir, **no** hay que portar estas clases tal cual; hay que reconstruir S y L desde `Dia.tsx` y `circulol.tsx`/`circulos.js`.

---

## 3. Mapeo nodo → mockup → calendario_antiguo → NeuroPlanner

| Nodo semántico | Clase mockup | Componente `calendario_antiguo` | Componente NeuroPlanner (objetivo) |
|---|---|---|---|
| `ROOT` | `.framer-UgJjk` | `MobileLayout` (`_index.tsx`) | `Main` (`src/Main.tsx`) |
| `SCREEN` | `.framer-xiAZU` | `MobileLayout` (bg) | `Main` root (`theme.black`) |
| `HEADER` | `.framer-ghh44y` | `Header` (`lib/header.tsx`) | `Header` (`components/Header.tsx`) |
| `TITLE_BLOCK` | `.framer-1o6alss` | `Header` (label) | `Header` (label) |
| `TITLE` | `.framer-1r9s1p9` | `Header` label | `Header` label |
| `DATE` | `.framer-83yydc` | *(no existe)* → añadir fecha | `Header` + fecha (nuevo) |
| `DAY_SELECTOR` | `.framer-ehqvfl` | `ToggleTabs` (`cositos/menu.tsx`) | `ToggleTabs` (`components/ToogleTabs.tsx`) |
| `PILL` | `.framer-Nm7tg` | `ToggleTabs` | `ToggleTabs` |
| `TAB_T/S/L` | `.framer-6dih1i/1m8fufz/2qwyb4` | tabs `day/week/schedule` | tabs `day/week/schedule` |
| `CHEVRONS` | `.framer-1vjwn96` | `goToPreviousDay`/`goToNextDay` (`TaskList.tsx`) | botones prev/next (nuevo) |
| `TASK_LIST` | `.framer-4flcmv` | `AnimatedTaskManager` (`TaskList.tsx`) | `TaskList` (nuevo) |
| `TASK_SCROLL` | `.framer-7j74qj` | `AnimatedTaskManager` scroll | `FlatList`/`ScrollView` |
| `TASK_ROW` | `.framer-1qpez88/921qny` | `TaskItem` (`TaskList.tsx`) | `TaskItem` (nuevo) |
| `TASK_TITLE` | `.framer-1xyjv4q/73wedq` | `TaskItem` título | `TaskItem` título |
| `TASK_META` | `.framer-19492rz` | `MobileTimePicker` (`lib/timepicker.tsx`) | `TaskItem` hora |
| `TASK_CIRCLE` | `.framer-18m87zp` | checkbox/`transparency` | `TaskItem` estado |
| `TASK_ROW_NEW` | `.framer-g7b7wa` | input `newTaskText` (`TaskList.tsx`) | `TaskItem` "nueva tarea" |
| `FAB` | `.framer-1xqa3ca-container` | `FloatingButton` (`routes/FloatingButton.tsx`) | `FloatingButton` (nuevo) |
| `NAV` | `.framer-1wphi1r` | `NavBar` (`routes/NavBar.tsx`) | `NavBar` (`src/NavBar.tsx`) |
| `NAV_TASKS/REWARDS/AIMS/MONITOR/SETTINGS` | `.framer-rb2iqg/…` | `navigationItems` | `navigationItems` |

---

## 4. Estructura objetivo de la vista de Tareas en NeuroPlanner (React Native)

Componentes a crear/ajustar en `src/`, siguiendo el árbol del mockup:

```
src/
├─ components/
│  ├─ Header.tsx            (ajustar: añadir DATE en #D9B5FF)
│  ├─ ToogleTabs.tsx        (ajustar: píldora T/S/L con acento #D9B5FF)
│  ├─ DaySelector.tsx       (nuevo: píldora T/S/L, reutiliza ToggleTabs)
│  ├─ Chevrons.tsx          (nuevo: prev/next día)
│  ├─ TaskList.tsx          (nuevo: lista de tareas, reemplaza el placeholder "Tareas!")
│  ├─ TaskItem.tsx          (nuevo: fila título + hora + círculo estado)
│  ├─ NewTaskInput.tsx      (nuevo: fila "New task")
│  ├─ FloatingButton.tsx    (nuevo: FAB sticky)
│  └─ NavBar.tsx            (ajustar: item activo con acento #D9B5FF)
├─ routes/
│  └─ TaskList.tsx          (reemplazar placeholder por <TaskList/>)
└─ lib/
   ├─ theme.ts              (añadir #1f1f1f, #cccaca, #D9B5FF)
   └─ viewRegistry.tsx      (Vista.Tareas → <TaskList/>)
```

### 4.1 `TaskItem` (fila de tarea) — estructura RN
```tsx
<View style={styles.row}>                       // TASK_ROW
  <View style={styles.titleRow}>                // TASK_TITLE (border-bottom acento)
    <Text style={styles.title}>{task.summary}</Text>   // TASK_TEXT
    <View style={styles.meta}>                  // TASK_META
      <View style={styles.circle} />            // TASK_CIRCLE (#D9B5FF)
      <Text style={styles.time}>{time}</Text>   // TASK_TIME
    </View>
  </View>
  <View style={styles.icon}>                    // TASK_ICON
    <CircleIcon color={accent} />
  </View>
</View>
```

### 4.2 `TaskList` (lista) — estructura RN
```tsx
<View style={styles.list}>                      // TASK_LIST
  <ScrollView style={styles.scroll}>            // TASK_SCROLL
    {tasks.map(t => <TaskItem key={t.id} task={t} />)}
    <NewTaskInput />                            // TASK_ROW_NEW
  </ScrollView>
</View>
```

---

## 5. Guardrails sobre los nombres confusos del mockup

1. **No portar los hashes de Framer** (`.framer-1qpez88`, etc.). Usar nombres semánticos (`TaskItem`, `TaskRow`, `TaskTitle`).
2. **No portar el CSS huérfano** de las vistas S/L (grid 24h, círculo). Reconstruirlas desde `Dia.tsx` y `circulol.tsx`/`circulos.js`.
3. **El `TASK_ROW_NEW` usa borde `#cccaca`** (no acento) para diferenciarse de las tareas normales → mantener esa distinción.
4. **El `DATE` (fecha) no existe en `calendario_antiguo`** → añadirlo al `Header` en color acento.
5. **El `FAB` es sticky** (`position: sticky; top: 0`) en el mockup → en RN usar `position: 'absolute'` o un `View` fijo.
6. **El `NAV` está dentro del `SCREEN`** (no fuera) → en RN el `NavBar` debe estar dentro del contenedor de la vista, no en un overlay global.
7. **Los chevrons prev/next** no están en `calendario_antiguo` como componente propio → crear `Chevrons.tsx` y conectarlo a `goToPreviousDay`/`goToNextDay`.
8. **El `DAY_SELECTOR` (T/S/L) y los `CHEVRONS` están en la misma fila** que el título → el `Header` debe combinar título+fecha+selector+chevrons en una sola fila (hoy `Header` solo muestra el label).

---

## 6. Resumen de acciones

1. **Ajustar `theme.ts`** con `#1f1f1f`, `#cccaca` 95%, `#D9B5FF` 85%.
2. **Ajustar `Header`** para incluir fecha + selector T/S/L + chevrons en una fila.
3. **Crear `TaskList`/`TaskItem`/`NewTaskInput`** y reemplazar el placeholder `Tareas!` en `viewRegistry`.
4. **Ajustar `NavBar`** para el item activo con acento `#D9B5FF`.
5. **Crear `FloatingButton`** sticky.
6. **Reconstruir S y L** desde `Dia.tsx` y `circulol.tsx`/`circulos.js` (no desde el CSS huérfano del mockup).

Ver también: [`README.md`](./README.md), [`01-drag-resize-port.md`](./01-drag-resize-port.md), [`02-live-arcs-port.md`](./02-live-arcs-port.md), [`../idea/MOCKUP_TASKS_ANALISIS.md`](../idea/MOCKUP_TASKS_ANALISIS.md).
