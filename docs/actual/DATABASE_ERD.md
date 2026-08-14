# NeuroPlanner — representación de base de datos (ERD / DEM)

Fuente: `src/db/CALENDARIA.sql`. SQLite se abre como `app_data.db`; la migración activa claves foráneas mediante `PRAGMA foreign_keys = ON`.

## Diagrama entidad-relación

```mermaid
erDiagram
  ENTITIES { TEXT id PK TEXT type INTEGER created_at INTEGER updated_at TEXT data_json }
  TIME_SERIES { TEXT entity_id FK INTEGER timestamp TEXT metric_name REAL value TEXT context_json }
  IMAGES { TEXT id PK TEXT entity_id FK TEXT image_url INTEGER created_at }
  OBJECTIVES { TEXT id PK_FK TEXT parent_id FK REAL progress INTEGER is_active INTEGER due_date }
  OBJECTIVE_LINKS { TEXT parent_id PK_FK TEXT child_id PK_FK }
  HABIT_TEMPLATES { TEXT id PK TEXT name TEXT description INTEGER default_duration_minutes INTEGER default_priority TEXT tags_json TEXT image_id FK }
  HABIT_INSTANCES { TEXT id PK TEXT template_id FK INTEGER scheduled_date INTEGER completed INTEGER streak }
  REWARDS { TEXT id PK TEXT name TEXT description TEXT url INTEGER is_favorite INTEGER effort_required TEXT tags_json TEXT color TEXT image_id FK }
  REWARD_REDEMPTIONS { TEXT id PK TEXT user_id FK TEXT reward_id FK INTEGER redeemed_at INTEGER points_spent }
  SOCIAL_BATTERY { TEXT id PK_FK INTEGER current_level REAL recovery_rate INTEGER last_updated }
  CALENDAR_ITEMS { TEXT id PK TEXT owner_id FK TEXT type INTEGER start_time INTEGER end_time TEXT data_json }
  SKILLS { TEXT id PK TEXT name REAL mastery INTEGER anxiety_required TEXT type }
  DRILLS { TEXT id PK TEXT skill_id FK INTEGER duration_seconds }
  DRILL_SESSIONS { TEXT id PK TEXT drill_id FK TEXT user_id FK INTEGER started_at INTEGER completed_at INTEGER success TEXT feedback_json }
  REFLECTIONS { TEXT id PK TEXT user_id FK TEXT type INTEGER timestamp TEXT data_json }
  SUPPORT_CONTACTS { TEXT id PK TEXT user_id FK TEXT name TEXT relation TEXT phone TEXT email INTEGER escalation_level }
  HEALTH_METRICS_DAILY { TEXT id PK TEXT user_id FK TEXT date INTEGER stress INTEGER anxiety INTEGER social_anxiety REAL recovery_pct INTEGER social_initiative }
  ENTITIES ||--o{ TIME_SERIES : tracks
  ENTITIES ||--o{ IMAGES : owns
  ENTITIES ||--o| OBJECTIVES : specializes
  OBJECTIVES o|--o{ OBJECTIVES : parent_id
  OBJECTIVES ||--o{ OBJECTIVE_LINKS : parent_child
  IMAGES o|--o{ HABIT_TEMPLATES : image
  HABIT_TEMPLATES ||--o{ HABIT_INSTANCES : instances
  IMAGES o|--o{ REWARDS : image
  ENTITIES ||--o{ REWARD_REDEMPTIONS : user
  REWARDS ||--o{ REWARD_REDEMPTIONS : reward
  ENTITIES ||--o| SOCIAL_BATTERY : battery
  ENTITIES ||--o{ CALENDAR_ITEMS : owner
  SKILLS ||--o{ DRILLS : drills
  DRILLS ||--o{ DRILL_SESSIONS : sessions
  ENTITIES ||--o{ DRILL_SESSIONS : user
  ENTITIES ||--o{ REFLECTIONS : author
  ENTITIES ||--o{ SUPPORT_CONTACTS : owner
  ENTITIES ||--o{ HEALTH_METRICS_DAILY : user
```

## Catálogo

| Tabla | PK | Propósito y relaciones |
|---|---|---|
| `entities` | `id` | Raíz polimórfica: `type`, timestamps y `data` JSON. Usuarios, objetivos y tipos de dominio viven aquí. |
| `time_series` | — | Métricas de una entidad; `entity_id → entities`, cascada. Índice compuesto de historial. |
| `images` | `id` | Imagen propiedad de una entidad; cascada al borrar owner. |
| `objectives` | `id` | Extensión 1:1 de entidad; padre singular, progreso, activo y vencimiento. FK a entidades y padre auto-referente, ambos con cascada. |
| `objective_links` | `(parent_id,child_id)` | Grafo N:M de objetivos; ambas FKs con cascada. |
| `habit_templates` | `id` | Definición reutilizable; tags JSON e imagen opcional (`SET NULL`). |
| `habit_instances` | `id` | Ocurrencia diaria de template; cascada desde template. |
| `rewards` | `id` | Catálogo de premios; tags JSON e imagen opcional. |
| `reward_redemptions` | `id` | Canjes de usuario/premio; no define comportamiento `ON DELETE`. |
| `social_battery` | `id` | Una batería por usuario, compartiendo ID con entidad; nivel 0–100. |
| `calendar_items` | `id` | Slots/bloques/nudges de usuario, con payload JSON. |
| `skills` | `id` | Catálogo de habilidades. |
| `drills` | `id` | Ejercicios de habilidad; cascada desde skill. |
| `drill_sessions` | `id` | Intento de drill de un usuario; feedback JSON; FKs sin cascada explícita. |
| `reflections` | `id` | Journal/conversation/crisis/medication; datos JSON; cascada desde usuario. |
| `support_contacts` | `id` | Red de soporte de usuario; cascada. |
| `health_metrics_daily` | `id` | Métricas diarias; único por `(user_id,date)` y cascada. |

## Restricciones, tipos e índices

| Campo | Regla |
|---|---|
| `objectives.progress` | 0 a 1 |
| `social_battery.current_level` | 0 a 100 |
| `health_metrics_daily` | estrés/ansiedad/iniciativa 0–10; recuperación 0–100; único usuario+fecha |
| `calendar_items.type` | `recovery_block`, `nudge`, `task_slot` |
| `skills.type` | `social`, `emotional` o nulo |
| `reflections.type` | `journal`, `conversation`, `crisis`, `medication` |
| Índices | `entities(type,created_at)`, series `(entity,metric,timestamp)`, imágenes por owner, objetivos por parent/due/active, calendario por owner/tiempo, reflexiones por user. |

## Hallazgos de modelo

- `entities.data`, `reflections.data`, tags y contextos almacenan JSON. Es flexible, pero email, identidad Google y campos buscables se consultan mediante carga completa y parseo JavaScript; deberían tener columnas indexadas si crecen.
- La jerarquía de objetivos tiene un padre singular (`parent_id`) y un grafo N:M (`objective_links`). Definir uno como canónico y actualizar ambos transaccionalmente si se mantienen.
- Agregar `UNIQUE(template_id, scheduled_date)` a `habit_instances`: el repositorio evita duplicados, pero la base no los impide ante concurrencia.
- Decidir cascada/restricción para `drill_sessions.drill_id` y `reward_redemptions`. Con FKs activas, sesiones existentes pueden impedir borrar un drill/skill.
- `rewards` y `habit_templates` apuntan a `images`, pero cada imagen debe pertenecer a `entities`; no hay repositorio de imágenes que coordine dicho owner.
- `TrackingRepository` y `UserRepository` duplican la API de métricas diarias; consolidarla reduce divergencia.

## Cobertura por código

| Área | Implementación |
|---|---|
| Entidades/usuarios/objetivos | Repositorios `BaseEntity`, `User`, `Objective` y stores correspondientes. |
| Hábitos | `HabitRepository` + `useHabitStore`. |
| Reflexiones | `ReflectionRepository` + `useReflectionStore`. |
| Recompensas | `RewardRepository`; sin store dedicado. |
| Skills/drills | consultas directas en `useSkillStore`; no hay repository. |
| Images y calendar items | Sólo esquema; no repository/store dedicado. |

Rutas fuente: `src/db/CALENDARIA.sql`, `src/db/schema.ts`, `src/db/db.ts`, `src/db/repositories/`, `src/models/models.ts`.
