# Mockup "Hoy" (Tasks) — Análisis de CSS y mapeo a calendario_antiguo

> Análisis del mockup `nuevo_frontend.html` (generado con Framer, 375×667px, mobile-first). Se describe el CSS general, los tokens de color y el mapeo de cada componente del mockup a los componentes de la vista de tareas de `calendario_antiguo`.

---

## 1. Resumen del mockup

El mockup es la pantalla **"Hoy" (Today / Tasks)** de la app. Es un **tema oscuro** con una sola pantalla de teléfono (375×667px, esquinas redondeadas 48px). Contiene, de arriba a abajo:

1. **Cabecera**: título "Today" + fecha "Fri, Nov 21", selector de día (T/S/L) y flechas prev/next.
2. **Lista de tareas**: filas con título, hora y un círculo de estado.
3. **Fila "New task"**: input/placeholder para crear tarea.
4. **Botón flotante** (barra sticky con icono de suma).
5. **Barra de navegación inferior** (Tasks, Rewards, Aims, Monitor, Settings).

---

## 2. CSS general / design tokens

### 2.1 Colores principales

| Token | Valor | Uso |
|---|---|---|
| **Fondo** | `rgb(31, 31, 31)` = **`#1f1f1f`** | Fondo de la pantalla, cabecera, barra de navegación. |
| **Texto primario** | `rgba(204, 202, 202, 0.95)` = **`#cccaca` 95%** | Títulos de tarea, horas, etiquetas de nav inactivas, fecha. |
| **Acento** | `rgba(217, 181, 255, 0.85)` = **`#D9B5FF` 85%** | Tab activo, nav activo, bordes inferiores, círculos de estado, fecha, flechas. |

Variantes del acento:
- `rgba(217, 181, 255, 0.95)` → flechas prev/next y círculos de estado (más opaco).
- `rgb(217, 181, 255)` (opaco) → fondo del botón flotante.
- `rgb(31, 31, 31)` sobre acento → texto/icono del elemento activo (contraste invertido).

### 2.2 Tipografías

| Uso | Fuente | Peso | Tamaño |
|---|---|---|---|
| Título "Today" | Oxygen | 300 | 30px |
| Fecha "Fri, Nov 21" | Oxygen | 300 | 15px |
| Título de tarea | Oxygen | 300 | 1rem (16px) |
| Hora de tarea | Oxygen | 300 | 0.8rem (12.8px) |
| Nav activa "Tasks" | Nunito Sans | 600 | 14px |
| Nav inactiva | Nunito Sans | 300 | 13px |

> Nota: `calendario_antiguo` ya usa la clase `font-nunito-sans` en `Main.tsx` y `Header.tsx`, y `Nunito Sans` en `NavBar.tsx`. El mockup añade **Oxygen** para el contenido de tareas.

### 2.3 Radios y layout

| Elemento | Radio |
|---|---|
| Pantalla (contenedor "Hoy") | 48px |
| Selector de día (píldora T/S/L) | 30px (items) / 15px (contenedor) |
| Items de navegación inferior | 12px |
| Botón flotante | píldora (radio alto) |

- Pantalla: `375×667px`, `overflow:auto`, columna centrada.
- Cabecera: `padding: 40px 23px 23px`, gap 31px.
- Nav inferior: `height:80px`, `padding: 8px 15px`, items de `61×61px`.
- Botón flotante: barra `sticky top:0`, `width:100%`, con icono de 20px sobre fondo acento.

---

## 3. Desglose de componentes del mockup (vista de tareas)

### 3.1 Contenedor de pantalla — `.framer-xiAZU.framer-1fm37uy` (`data-framer-name="Hoy"`)
- `background-color: rgb(31,31,31)`, `border-radius: 48px`, `width/height: 375×667px`, `overflow:auto`.
- Es el "frame" del teléfono. **Mapeo**: `MobileLayout` en `app/routes/_index.tsx` (hoy `bg-white`, `max-w-sm`). El mockup introduce el **fondo oscuro `#1f1f1f`**.

### 3.2 Cabecera — `.framer-ghh44y` + `.framer-wdnlgx`
Contiene tres zonas en fila:

**a) Título + fecha — `.framer-1o6alss`**
- "Today" (Oxygen 300, 30px, `#cccaca` 95%) y "Fri, Nov 21" (Oxygen 300, 15px, `#D9B5FF` 85%).
- **Mapeo**: `Header` (`app/lib/header.tsx`), que hoy muestra solo la etiqueta de la vista activa. El mockup añade la **fecha** en color acento.

**b) Selector de día — `.framer-ehqvfl` → `.framer-Nm7tg` (T/S/L)**
- Píldora con 3 items: el activo "T" con fondo `#D9B5FF` 85% y texto `#1f1f1f`; los inactivos "S"/"L" transparentes con texto `#cccaca` 95%.
- **Mapeo**: `ToggleTabs` (`app/routes/cositos/menu.tsx`), que hoy recibe `backgroundColor` por vista. El mockup usa el acento `#D9B5FF` como fondo del tab activo.

**c) Flechas prev/next — `.framer-1vjwn96`**
- Dos chevrons (SVG `#2218718765` / `#3806848114`) con `stroke: rgba(217,181,255,0.95)`.
- **Mapeo**: navegación de día en `AnimatedTaskManager` (`goToPreviousDay`/`goToNextDay` en `TaskList.tsx`) y `navigateDay` en `Dia.tsx`.

### 3.3 Lista de tareas — `.framer-4flcmv` → `.framer-7j74qj` → `.framer-1ykxxan`
Contenedor scrollable (`overflow:auto`) que agrupa las filas de tarea.

**Fila de tarea — `.framer-1qpez88` / `.framer-921qny`**
- `.framer-1xyjv4q` / `.framer-73wedq`: título (Oxygen 300, 1rem, `#cccaca` 95%) con **borde inferior** `1px solid rgba(217,181,255,0.85)`.
- `.framer-19492rz`: a la derecha, un **círculo** (SVG `#svg-398112567_357`, `stroke: rgba(217,181,255,0.95)`) + hora "14:29pm" (`#cccaca` 95%, 0.8rem).
- `.framer-1pyory5` / `.framer-1aj2koc`: icono circular de estado (20px).
- **Mapeo**: `TaskItem` en `app/routes/TaskList.tsx` (checkbox de completado, título editable, hora con `MobileTimePicker`). El círculo del mockup corresponde al **estado de completado** (en `calendario_antiguo` se usa `transparency: transparent` / checkbox).

**Fila "New task" — `.framer-g7b7wa`**
- Título "New task" con borde inferior `rgba(204,202,202,0.95)` (distinto del acento de las tareas normales) y zona derecha vacía (`.framer-ftly1z`).
- **Mapeo**: el input de nueva tarea en `AnimatedTaskManager` (`newTaskText`, `handleNewTaskKeyDown` en `TaskList.tsx`).

### 3.4 Botón flotante — `.framer-1xqa3ca-container` → `.framer-Ib4I2`
- Barra `sticky top:0`, `width:100%`, con un icono (chevron/plus, SVG `#471393433`) sobre fondo `rgb(217,181,255)`.
- **Mapeo**: `FloatingButton` (`app/routes/FloatingButton.tsx`), que hoy usa `coloresui[0].Tareas` como color de fondo y abre un menú con "Templates / Add Reward / Add Aim".

### 3.5 Barra de navegación inferior — `.framer-1wphi1r` (`data-framer-name="Menu"`)
- Fondo `rgb(31,31,31)`, `height:80px`, `padding: 8px 15px`.
- Items (`.framer-6dglV`), cada uno `61×61px`, radio 12px:
  - **"Tasks" (activo)**: fondo `rgba(217,181,255,0.85)`, icono + texto `rgb(31,31,31)`, Nunito Sans 600.
  - **"Rewards" / "Aims" / "Monitor" / "Settings" (inactivos)**: fondo transparente, icono + texto `rgba(204,202,202,0.95)`, Nunito Sans 300.
- **Mapeo**: `NavBar` (`app/routes/NavBar.tsx`) con `navigationItems` (Today/Tasks, Rewards, Aims, Monitor, Settings). El mockup usa el acento `#D9B5FF` para el item activo y `#cccaca` para los inactivos.

---

## 4. Mapeo resumido mockup ↔ calendario_antiguo

| Componente del mockup | Clase Framer | Componente en calendario_antiguo |
|---|---|---|
| Pantalla "Hoy" | `.framer-xiAZU` | `MobileLayout` (`_index.tsx`) |
| Cabecera (título + fecha) | `.framer-1o6alss` | `Header` (`lib/header.tsx`) |
| Selector de día T/S/L | `.framer-Nm7tg` | `ToggleTabs` (`cositos/menu.tsx`) |
| Flechas prev/next | `.framer-1vjwn96` | `goToPreviousDay`/`goToNextDay` (`TaskList.tsx`), `navigateDay` (`Dia.tsx`) |
| Lista de tareas | `.framer-7j74qj` | `AnimatedTaskManager` (`TaskList.tsx`) |
| Fila de tarea (título + hora + círculo) | `.framer-1qpez88`/`.framer-921qny` | `TaskItem` (`TaskList.tsx`) + `MobileTimePicker` (`lib/timepicker.tsx`) |
| Fila "New task" | `.framer-g7b7wa` | input `newTaskText` (`TaskList.tsx`) |
| Botón flotante | `.framer-Ib4I2` | `FloatingButton` (`routes/FloatingButton.tsx`) |
| Nav inferior | `.framer-6dglV` | `NavBar` (`routes/NavBar.tsx`) |

---

## 5. Paleta de color vs. `coloresui` actual

`calendario_antiguo` define en `app/lib/calendario.tsx`:

```ts
export const coloresui = [
  { Tareas: "#c5e1a4", Metas: "#b45dc3", Premios: "#3fccde", Monitor: "#ff9fc0", Settings: "#fbf39b" }
]
```

El mockup introduce un **tema oscuro** con una paleta distinta:

| Rol | Mockup | calendario_antiguo (actual) |
|---|---|---|
| Fondo | `#1f1f1f` (oscuro) | `bg-white` (claro) |
| Texto | `#cccaca` 95% (claro) | `text-gray-800/900` (oscuro) |
| Acento (Tasks) | `#D9B5FF` 85% (lavanda) | `#c5e1a4` (verde claro) |

**Conclusión**: el mockup propone **invertir el tema** (fondo oscuro, texto claro) y cambiar el acento de la vista Tasks de verde a lavanda `#D9B5FF`. El patrón de uso del acento (tab activo, nav activa, bordes, círculos, fecha) es el mismo que ya usa `coloresui` por vista.

---

## 6. Recomendaciones para implementar en NeuroPlanner

1. **Tokens CSS**: definir variables para `--bg: #1f1f1f`, `--text: rgba(204,202,202,0.95)`, `--accent: rgba(217,181,255,0.85)` y reutilizarlas en cabecera, lista, botón flotante y nav.
2. **Acento por vista**: mantener el patrón de `coloresui` (un acento por vista) pero con el nuevo esquema oscuro; para Tasks usar `#D9B5FF`.
3. **Tipografía**: añadir **Oxygen** para contenido de tareas y conservar **Nunito Sans** para la navegación (ya presente en `calendario_antiguo`).
4. **Estado de tarea**: el círculo del mockup (`#D9B5FF`) corresponde al checkbox/`transparency` de `TaskItem`; mantener la hora junto al título como en `MobileTimePicker`.
5. **Bordes inferiores**: las filas de tarea usan `1px solid` del acento; la fila "New task" usa el color de texto (`#cccaca`) para diferenciarla.
6. **Nav activa**: item activo con fondo acento y texto `#1f1f1f` (contraste invertido), inactivos con texto `#cccaca` — igual que el patrón actual de `NavBar`.
