# 03 — Port del backend (Express/Prisma/MySQL) a NeuroPlanner (SQLite/Kysely)

> Análisis de `backend/server.js`, `backend/src/client.js`, `backend/prisma/schema.prisma`, `backend/src/pdfUtils.js`, y su relación con el esquema SQLite y los repositorios de NeuroPlanner.

---

## 1. Inventario de endpoints (`server.js`)

| # | Método | Ruta | Función | Tabla(s) |
|---|---|---|---|---|
| 1 | GET | `/login` | Redirige a Spotify OAuth (client_id hardcodeado) | — |
| 2 | GET | `/callback` | Callback Spotify: code → access/refresh token | — |
| 3 | POST | `/api/:table` | Creación genérica (upsert + relaciones connect) | cualquier tabla |
| 4 | POST | `/api/tareas/batch` | Crea lote de tareas (`createMany` + relee) | `tareas` |
| 5 | PUT | `/api/:table` | Upsert masivo (array): update si existe, create si no | cualquier tabla |
| 6 | GET | `/api/:table/:id` | Lee por id (`parseInt`) | cualquier tabla |
| 7 | GET | `/api/:table` | `readAll` con filtros; incluye relaciones para projects/tareas | `projects`, `tareas` |
| 8 | GET | `/api/projects` | `readAll("projects")` + reformatea a bloques (tasks/subBlocks) | `projects`+`tareas`+`sub_proyecto` |
| 9 | PUT | `/api/premios/:id` | Actualiza premio (convierte fechas/esfuerzo, elimina nulls) | `premios` |
| 10 | GET | `/:table/maxid` | `resetAutoIncrement` (SQL crudo `ALTER TABLE`) | cualquier tabla |
| 11 | DELETE | `/api/:table/:id` | Borra; si queda 1 registro, resetea autoincrement | cualquier tabla |
| 12 | DELETE | `/api/projects/:id` | Borra proyecto (+ tareas/subproyectos opcional) | `projects`, `tareas`, `sub_proyecto` |
| 13 | GET | `/api/images/:filename` | Sirve archivo estático | filesystem |
| 14 | POST | `/imageprocessor` | Procesa PDF/screenshot (Puppeteer+sharp+pdf-poppler) + upsert `images_premios` | `images_premios` (no existe) |
| 15 | POST | `/api/premios/:id/:action` | Star/unstar (`fav`) | `premios` |
| 16 | POST | `/uploadMetadata` | Solo loguea `req.body.image` | — |
| 17 | POST | `/uploadFile` | Sube archivo con multer | filesystem |

**Observaciones**: router genérico expone cualquier tabla; `POST /imageprocessor` usa `images_premios` (no existe en schema); `GET /:table/maxid` y `DELETE` usan SQL crudo con interpolación de tabla (inyección); `GET /api/projects` usa nombres camelCase que no coinciden con el schema.

---

## 2. Mapeo tabla por tabla (MySQL → SQLite)

### 2.1 `tareas` → `entities` + `objectives`
| Campo `tareas` | Destino SQLite |
|---|---|
| `id` (id de evento Google) | `entities.id` (UUID) + `entities.data.googleEventId` |
| `summary`, `description`, `htmlLink` | `entities.data.*` (JSON) |
| `start`, `end`, `recurrence`, `reminders` | `entities.data.*` (JSON) |
| `eventType`, `transparency`, `colorId`, `order_taskblock`, `isEvent`, `tags` | `entities.data.*` (JSON) |
| `proyecto`, `subproyecto` | `objectives.parent_id` / `objective_links` |
| `bloque_tareas` | `entities.data.habitTemplateId` / `habit_templates.id` |
| `premio` | `entities.data.rewardId` / `rewards.id` |
| `imagen` | `images.entity_id` |

### 2.2 `sub_proyecto` → `objectives` (type Project/Goal)
`id`→UUID, `name`→`entities.data.title`, `parentId`/`parent_sub_id`→`objectives.parent_id`, `startdate`/`enddate`→`entities.data.start/end`.

### 2.3 `premios` → `rewards`
`id`→UUID, `nombre`→`name`, `descripcion`→`description`, `url`→`url`, `fav`→`is_favorite`, `esfuerzo`→`effort_required`, `tags`→`tags`, `color`→`color`, `imagen`→`image_id`, `fecha_creado`→`entities.created_at`.

### 2.4 `proyectos` → `objectives` (type Project)
`id`→UUID, `name`→`entities.data.title`, `color`→`entities.data.color`, `startdate`/`enddate`→`entities.data.start/end`, `image`→`images.entity_id`, `sub_proyecto`/`tareas`→`objective_links`.

### 2.5 `task_block` → `habit_templates`
`id`→UUID, `title`→`name`, `type`/`color`→`tags`/`data`, `top`/`height`/`expanded`→descartar (UI), `image`→`image_id`, `tareas`→`habit_instances`.

### 2.6 `images` → `images`
`id`→UUID, `table_name`/`external_id`→eliminados (reemplazados por `entity_id`), `imageUrl`→`image_url`, + `created_at`.

---

## 3. Qué debe proveer el nuevo backend

### 3.1 Endpoints → repositorios locales (Kysely)
| Endpoint legacy | Método local |
|---|---|
| POST `/api/:table` | `BaseEntityRepository.create` / `ObjectiveRepository.createObjective` / `RewardRepository.createReward` / `HabitRepository.createTemplate` |
| POST `/api/tareas/batch` | `createMany` de `ObjectiveRepository` |
| PUT `/api/:table` | `BaseEntityRepository.update`/`patch` / `ObjectiveRepository.updateObjective` |
| GET `/api/:table/:id` | `BaseEntityRepository.findById` / `ObjectiveRepository.findById` |
| GET `/api/:table` | `BaseEntityRepository.findByType`/`findByTypes`/`listAll` |
| GET `/api/projects` | `ObjectiveRepository.getTree` + `findByTypes(['Project','Goal','Task'])` |
| PUT `/api/premios/:id` | `RewardRepository.updateReward` |
| POST `/api/premios/:id/:action` | `RewardRepository.toggleFavorite` |
| DELETE `/api/:table/:id` | `BaseEntityRepository.delete` / `ObjectiveRepository.delete` |
| DELETE `/api/projects/:id` | `ObjectiveRepository.delete` (cascada FK) + borrar `objective_links` |

### 3.2 Endpoints → servicio de sincronización Google Calendar
- `GET /api/projects` (formateo de tareas con start/end/recurrence/htmlLink/colorId/transparency/reminders) y `POST /api/tareas/batch` están ligados a eventos de Google (el `id` de `tareas` es el id de evento de Google).
- **Push**: al crear/editar una `Task` local → crear/actualizar evento en Google; guardar `googleEventId` en `entities.data.googleEventId`.
- **Pull**: job periódico consulta Calendar API y reconcilia (nuevos → crear; modificados → update; borrados → delete).
- **Resolución de conflictos**: `updated_at` como vector de versión; el más reciente gana; campo `entities.data.syncStatus` (`local|synced|conflict`).
- **Cola de outbox** para reintentar sin red.
- **OAuth en el dispositivo** (Expo AuthSession + SecureStore), sin secretos en el backend.

### 3.3 Endpoints que se eliminan
- Spotify (`/login`, `/callback`) — no es parte del dominio NeuroPlanner; además `client_secret` hardcodeado es un riesgo de seguridad.
- Autoincrement (`/:table/maxid`, `resetAutoIncrement`) — SQLite no tiene `AUTO_INCREMENT`; los ids son UUIDs.
- Servido estático de imágenes (`/api/images/:filename`), `uploadFile`, `uploadMetadata` — local-first: imágenes en Expo FileSystem, referenciadas por `images.image_url`.
- `POST /imageprocessor` — mover a **cloud function** (Puppeteer + sharp + pdf-poppler es pesado para un dispositivo).

---

## 4. Mismatches y problemas concretos

1. **`tareas.id` (id de evento Google) vs `entities.id` (UUID)** → campo de mapeo `googleEventId` + migración.
2. **`premios.id`/`proyectos.id` (Int autoincrement) vs UUID** → todos los FKs y `parseInt(id)` rompen.
3. **`images` cambia de clave `(table_name, external_id)` a `entity_id`** → reasignar cada imagen.
4. **`task_block` → `habit_templates`** → campos de UI (`top/height/expanded/color`) sin equivalente.
5. **`premios` → `rewards`** → renombrado de campos.
6. **`proyectos`/`sub_proyecto` → `objectives`** → jerarquía 2 niveles → árbol recursivo.
7. **`tareas.start/end/recurrence/reminders/transparency/colorId`** → viven en `entities.data` (JSON).
8. **`POST /imageprocessor` usa `images_premios`** (no existe en schema) → bug latente.
9. **Secretos hardcodeados** (Spotify client_id/client_secret en `server.js` L19-20).
10. **SQL crudo para autoincrement** (`$queryRawUnsafe`/`$executeRawUnsafe` con interpolación de tabla) → inyección; `ALTER TABLE AUTO_INCREMENT` no existe en SQLite.
11. **Inconsistencias de nombres en `GET /api/projects`** (`startDate`/`tasks`/`subProjects` vs `startdate`/`tareas`/`sub_proyecto`).
12. **`read`/`update`/`delete` hacen `parseInt(id, 10)`** → rompe con UUIDs.
13. **`dbClient.create` hace upsert con `where: { id: data.id }`** → el nuevo `ObjectiveRepository.createObjective` maneja UUIDs con transacciones.
14. **`reward_redemptions` y `habit_instances` son tablas nuevas** sin equivalente directo en el legacy.

---

## 5. Resumen ejecutivo

- **17 endpoints** inventariados; la mayoría son CRUD genérico sobre tablas Prisma.
- **6 tablas legacy** se absorben en el esquema polimórfico nuevo: `tareas`→`entities`+`objectives`, `sub_proyecto`→`objectives`, `premios`→`rewards`, `proyectos`→`objectives`, `task_block`→`habit_templates`, `images`→`images` (con `entity_id`).
- **El nuevo backend** es mayormente local (repositorios Kysely ya implementados), con un **servicio de sincronización a Google Calendar** para tareas/eventos, y **eliminación** de Spotify, autoincrement y servido estático de imágenes. El procesamiento de PDF/screenshot se recomienda mover a una **cloud function**.
- **Riesgos principales**: cambio de ids (Google event id / autoincrement → UUID), cambio de clave de `images`, secretos hardcodeados, SQL crudo, y bugs latentes (`images_premios`, nombres camelCase en `GET /api/projects`).
