# La app: ResetPattern

* Login: 1 tap, 3 taps max
* 2-3 minute daily interactions + encourage día de scheduling + encourage rest + "rest/compassion days" - can miss 1 day per week without penalties 
* Explain why each feature exists. Make the "why" behind notifications clear
* **Explicit User Sovereignty.&#x20;**&#x53;how how data serves user goals
* Easy pause/stop without guilt-tripping
* Objetivo de generalización de habilidades.



* **Vista de Configuración Inicial:** 
  * Bienestar: K10 , CORE-10 , **Single-Item Stress Question (SISQ), PROMIS Global Health (social) + Energía social + Tolerancia a la frustración**
  ```
  1. ESCALA DE TOLERANCIA A LA FRUSTRACIÓN (ETF-A)
     • "¿Cómo manejas los cambios inesperados en planes?"
     • "¿Qué haces cuando no entiendes una señal social?"
     • Escala de malestar en situaciones ambiguas (1-10)

  2. PERFIL SENSORIAL PERSONALIZADO
     • Sensibilidades: sonido, luz, tacto, multitudes
     • Umbrales de sobrecarga por tipo de entorno
     • Estrategias de regulación existentes

  3. MAPEO DE DIFICULTADES SOCIALES ESPECÍFICAS
     • Tipos de interacción más desafiantes
     • Señales no verbales más difíciles de interpretar
     • Contextos con mayor ansiedad anticipatoria
  ```
  * Instead of enforcing a single schedule, the AI recommends **break intervals dynamically**, based on Alex’s age, work type, and recent stress data. These settings can also adapt automatically when analytically it detects more stress during certain tasks, offering *longer or more frequent micro-breaks* to prevent cognitive overload.
    * configurable: breathing, stretching, or even a two-minute cultural micro-reward — a quote, an image, or a favorite song snippet. 
  * preferencias de notificación: Notificaciones sonoras / silenciosas (solo se prende el celular). Las notificaciones pueden ser sin vibrador (solo se prende la pantalla), o pueden tener sonido (con audifonos por ejemplo). Los recordatorios contextuales deben ser totalmente configurables.
  * &#x20;**chronotype (morning/evening person)**, **task category** (creative, analytical, interpersonal), and **demographic evidence** (e.g., adolescents vs. adults benefit from different rest-to-work ratios).
    > “Based on recent research, people in your age range maintain optimal attention with a 45-10 rhythm during high-focus tasks.”
  * frecuencia de interacción con la IA, 
  * Configurar qué ventana se muestra primero
  * modo de sonido, 
    * Tiempo libre: Sonido suave
  * frecuencia de journaling o conversación
  * personalización de recompensas.
  * Vibración Para social skills tratining: Specific haptic feedback for different notification types
  * Easy "snooze" or "not now" without penalty
  * **AI Conversation Partners**: Like Replika but focused on skill practice
  * Notificación de ver KPIs: cada x días, por semana, etc.  
  * Ver qué datos se han recogido
  * Borrar datos específicos 
  * Configurar por què ganar estrellas y por que no
  * No permitir tareas de más de x horas (default: 1) sin partirlas primero. 
  * Configurar variables de tracking: estrés, ansiedad, ansiedad social, % de recuperación, iniciativa social, 
  ```
  [Deslizador Rápido]
  Estrés: │–––––––●–––––––│ 
  Energía: │––––●–––––––––│
  Satisfacción: │–––––––––●–––│
  ```
  * Pausar recolección temporalmente
  ```python
  # Las elecciones de configuración revelan patrones
  settings_analysis = {
      "sensibilidad_sensorial": {
          "preferencia_notificaciones": "silenciosas = posible sensibilidad auditiva",
          "esquema_colores": "contraste alto = sensibilidad visual",
          "animaciones": "reducidas = posible sensibilidad movimiento"
      },
      "energia_mental": {
          "complejidad_interfaz": "modo simple vs detallado según energía",
          "frecuencia_recordatorios": "mayor necesidad de estructura = posible ansiedad"
      }
  }

  #ASD
  asd_settings = {
    "int_ext_motivation": "high",
  "creativity":"high",
    "routine_flexibility": "low", 
    "social_anxiety": "medium",
    "special_interests": ["trains", "weather patterns", "coding"],
    "sensory_preferences": {
      "visual": "minimal",
      "auditory": "soft_tones", 
      "haptic": "deep_pressure"
    }
  }
  ```
* **Vista Objetivos:&#x20;**
  * Cuánto esfuerzo es (Días, Mes) "No se cuánto durará pero sé que durará días"
    * DIAS - 1
    1. Ofrecer posibilidad de añadir due dates. 
  * Encima de tareas: barra objetivos - Últimos cambios y fecha: creaste nuevas tareas, optimizaste pasos
  * Organizador de calendario, extensible a gantt
  * OBJETIVOS semanales o diarios por HORAS o convertirlos en EVENTOS
  * Gráfico de árbol para editar los objetivos. Solo lista de pasos en vista proyectos.
  * Proyectos con base de datos relacional (dos tablas)
* **Vista Tareas:** 
  * 30s quick start: me gustaría que el usuario pueda configurar dos cosas cada día al entrar a la app: mi estrés (Actividades o tareas diarias) y mis recompensas. 
    * mostrar barritas delgadas horizontales bajo cada elemento para poder editarlos y arriba un nueva elemento con "placeholder". Cuando se hace click: se escribe y sale buscador de tareas que es base de nodos de objetivos que no tienen outgoing connections. se indican con colores distintos por objetivo. También se pueden hallar habilidades sociales para practicar.
    * Cada tarea tiene hora si es evento.
    * Earn stars
    * Modo consecutivo: Drag a drop una tarea sobre otra hace que cuando acabas una tarea en el dia, empieza otra (esto aparece sobre estreses y placeres). 
      * Botón de plantilla (Crear o reusar). 
  * Mostrar u ocultar cumplidas. Animación chévere, un win. Completar tarea arroja un color satisfactorio
  * Ícono con número de objetivos activos
    * Abre lista de objetivos:
      * Nombre de objetivo
      * Fecha inicio y fin - cambia color de fechas a rojo si esta vencido
      * botón de activar: si se desactiva, objetivo se pone en pause y sale: actualizar calendario? (checkbox de no volver a mostrar) 
      * tareas completas
    * Selector según proyectos configurados + Editor autoñadir - Unir a proyecto
  * Que además se puedan establecer rewards específicos luego de retos o tareas si así se desea de antemano, sin pasar por la pantalla de selección (eso debe tener su botón dedicado)
  * ¿Notificar inicio de dia? (Si no, igual se muestra gráfica de cumplimiento de metas sociales). Default: no notificar.
  * resumen semanal de logros, 
  * habilidades en curso, 
  * Plantillas de fase editables:
    * Fase de estabilización: medicinas, hidratación, cambiarme, caminata de 5min, 15min interés especial
    * Fase de descubrimiento: Experimento 1, Revisión de data.
      * Baseline (3d) vs trial (7d)
      * variables: daytime fog / sleep quality. Tracking hará preguntas del 1-5. Y X son otras variables : cambio de lugar por ejemplo como afecta
      * Simple chart comparing scores.
      * Based on your data, should we keep old schedule or replace it?
      * Sharing
  * Botón de play para iniciar
    * Cronómetro de tarea/evento con editor de minutos/horas y botones de inicio pausa
    * cuando pones click en una tarea, aparecen los botones.
  * Ongoing proyectos
    * Objetivos Mes 
    * Objetivo Semana
    * Opción de ir al editor para dividir y colocar premios
  * Hoy (varios dias, dia-tareas-eventos, dia-horas (Tareas + eventos) / Premio
  * accesos directos a “Practicar habilidad”, “Preparación estratégica” y “Recomendación IA”.
  * Editar tarea Ventana (OJO: TAMBIÉN A RUTINASS DE VARIAS TAREAS):
    * Nombre | Hora de inicio y fin
    * Tipo: default (Auto), Estrés: default auto. Auto hace que IA genere / clasifique con etiquetas existentes.
      * Ejemplo: todas las actividades que se repiten (ojo: ver tareas por cumplidas y por cumplir) - imagen + Responsabilidades diarias  + Proyectos de trabajo, etc. 
    * qué tarea/hábito existente triggeará esto? (opcional)
    * Dónde será esto (opcional)
    * ¿Qué haré para autopremiarme? (opcional)
    * Biometric stress tracking? PRE + POST
    * Lista de objetivos (no shrinkeable). Click y cambia el color de fondo de la tarea.
    * IA Generar íconos o imágenes para todas las actividades
    * Botón de calendarizar 
  * Eventos calendarizados arriba?
  * Crisis Protocol: "if zero tasks completed for 2 days alert therapist"
  * Prompt Frequency: How often to check in 
  * Veto Power Settings: "Allow rescheduling if anxiety > 7/10"
  * Context Sensitivity: How tightly bound to location/time
  ```
  [Calendario del Día]
  • 10:00 AM - Reunión de equipo (🟡 Moderado)
  • 2:00 PM - Almuerzo con colegas (🟢 Fácil) 
  • 6:00 PM - Evento networking (🔴 Difícil)


  ```

  ```
  [Gráfica de Progreso Semanal] 
  🟢 🟢 🟢 🟡 ⚪ ⚪ ⚪ 
  "4/7 días de práctica social exitosa"

  [Habilidad del Día - Opcional]
  🎯 "Conversaciones breves" (2 minutos)
  [Empezar] [Posponer] [Saltar]
  ```
* **Vista de Calendario Inteligente:** 
  * modo día o semana, 
  * Divisor de momentos del día (semana) antes de la vista de Día como equalizador y coloreado de background con gris
  * Debe haber otro botón para preparación estratégica para el evento. El sistema debe detectar automaticamente el tipo de evento que es, en función a las dificultades que el usuario enfrenta en diferentes situaciones. Luego, el sistema mismo recomendará actividades de preparación y misión del día.
  1. drag and drop aim due dates into a calendar
  * Botón de añadir descansos
    * afeter cognitively demanding tasks, it might propose a *“25-5 cycle”* (25 minutes of focus, 5 minutes of micro-rest), while on lighter days it might suggest *“50-10 cycles.”* 
    * rest sessions appear as *“Recovery Blocks”* that sync with the therapeutic and Google calendars, 4that balance remains visible and planned — but never forced.
  ```
  REUNIÓN DE EQUIPO - 10:00 AM
  Tipo detectado: 🔄 Interacción grupal
  Dificades comunes: Turnos de palabra, mantener atención

  [Preparación Estratégica] [Misión del Día] [IA Recomienda]

  AL PRESIONAR "IA RECOMIENDA":
  "Basado en tus patrones: practica hacer 1 pregunta por persona.
  Te ayudará a participar sin dominar la conversación."

  AL PRESIONAR "PREPARACIÓN ESTRATÉGICA":
  🎯 Ejercicios de 3 minutos:
  • Respiración para atención (1 min)
  • Formular 2 preguntas relevantes (1 min) 
  • Recordatorio de postura (1 min)
  ```
  * **User-Designed "Nudge Schedule"**: "When should I remind you about your social goals?"
  * **Context-Aware Timing**: Only suggest practice during low-stress moments
  * Stimulus Control: Block distracting apps during x blocks
  * Botón de practicar habilidades
  * Botones aparecen cuando se hace zoom en el evento.
  * Que hayan un pequeño texto que aparezca si se activa otro botón para la vista de día o de semana, una recomendación de ia. 
  * eventos sincronizados, 
  * Puedes poner reglas (NUNCA hacer esto entre estos horarios) 
  * Batería social calibrada
  * accesos a ejercicios previos a cada evento.
  * Boton de crisis mindfog, activa layout minimalista con tareas bien pequeñas (10min) y guiadas (te parece bien?)
  1. Dividirla en tareas? Si sí, seleccionar tareas, dividir duración de tarea, 
  2. o editar duración de actividades a mano (como si fuera otro editor) 
  ```
  [Recordatorio Contextual - Pantalla Only]
  "Buen momento para hacer tu pregunta planeada"
  ```
* **Vista de Skills:** 
  * Social skills: empieza determinando con quienes te es màs difìcil hablar
  * **Scenario Library**: Practice job interviews, dating, networking. Evaluation is the key.
  * Ansiedad: què situaciones te cansan màs ansiedad
  * Te propone Skills por niveles: Start with low-anxiety scenarios, progress gradually.
    * **Fluidez Conversacional** (Duración de interacciones exitosas)
    * **Iniciativa Social** (% de interacciones iniciadas por el usuario)
    * **Habilidades de Reparación** (Capacidad de recuperar conversaciones)
    * **Detección de Señales Sociales** (Precisión en ejercicios de reconocimiento)
    * **Generalización de Habilidades** (Aplicación en múltiples contextos)
  * **5-Minute Drills**: Like Otsimo's discrete trials for social scenarios
    * Emotion recognition games (2 mins)
    * Conversation simulation (3 mins)
    * Body language matching (90 secs)
    * Grabación de situaciones sociales con IA. Dar instrucciones de bulla. 
  * Knoledge base de psicología que nutre a la IA
    * Normalize social awkwardness as part of learning
  * 30s micro skill diario - earn stars + option de Go Deep (Social quest setup) - Context aware mode
    * From 2-minute check-in to full coaching mode
  * Social network viz showing real world impact
  * **Social Skill Trees**
    * **Mastery Badges**: Otsimo-style achievement system for real-world application
    * "Active Listener" (5 people commented you're a good listener)
    * "Small Talk Specialist" (10 successful initiations)
  * **Errorless Learning Built-in**: Multiple attempts, gentle correction. Celebration animations for small wins
  * **Instant Feedback**: "Great eye contact!" or "Try pausing 2 seconds before responding"
  * "Anything you'd like to try differently next?" (skill se pone arriba)
  ```
  Complete Skill Drill → Earn 3 "Social Stars" 
  3 Stars = Unlock 5-minute "Reward Activity"
  ```
  * **"Insight Unlocks"**: New understanding about social patterns as the real reward
  ```
  Workflow:
  1. **Intention Setting** (User-driven)
     - "What social skill would you like to practice this week?"
     - "What specific situations feel challenging?"

  2. **Preparation** (Guided practice)
     - Low-stakes scenarios and role-playing
     - Cognitive reframing exercises
     - Breathwork and grounding techniques

  3. **Real-world Application** (Minimal app involvement)
     - Optional pre-event "game plan"
     - Discreet in-the-moment cues (vibration patterns)
     - No mandatory data entry during interactions

  4. **Reflection & Integration** (User-controlled)
     - Post-interaction journaling prompts
     - "What went better than expected?"
     - "What's one small insight you gained?"
  ```
* **Vista de Reflexión:** 
  * **"Mission Debrief" Model**: After social interactions, users voluntarily debrief their experience (notification with explanation and reinforcement during the night).
  * Contactos de apoyo configurados
  * (Técnicas de grounding inmediatas): Chat de emergencia con IA / Ejercicios guiados sin internet 
  * Luego de hacer click en la notificación, vista de IA de reflexión al final del día, o vista de journaling.
    * La reflexión rápida debe ser una suerte de chat con una IA que, como sistema, ayude a analizar situaciones sociales. Prefiero que sea Gemini, que el chat pueda ser basado en audio, y que el agente le pregunte al usuario preguntas de analisis conductual para que el usuario describa cada parte de la interacción.  Una pregunta importante: tu batería social / nivel de estrés a lo largo del día. 
      * Fundamental frequency (pitch variability)
      * Jitter and shimmer (voice stability)
      * Speech rate and pause patterns
      * Spectral energy distribution
    * Journaling: **Scientific Support:** Multiple studies show 75-85% accuracy in stress detection
      * Typing speed variability (J. Hernandez et al., 2021)
      * Pressure patterns on touchscreen
      * Error rates and backspacing frequency
      * Response time latency
    * Incentivar a lo largo del día con notificaciones opcionales.
    ```
    VOICE + TYPING SYNERGY:
    • Analyze voice during AI conversations (natural context)
    • Monitor typing in journaling features
    • Combine for cross-validation

    Limitations: 

    VOICE ANALYSIS:
    • Background noise reduces accuracy by 15-20%
    • Cultural and individual voice pattern differences
    • Requires periodic calibration

    TYPNG DYNAMICS:
    • Needs individual baseline establishment
    • Affected by physical conditions (tiredness, caffeine)
    • Keyboard app differences

    CAMERA-BASED:
    • Lighting conditions critical
    • Privacy concerns
    • Processing intensive

    Optional: 

    INTEGRACIÓN CALENDARIO (con permiso):
    • Consistencia en horarios (autistas suelen preferir rutinas)
    • Patrones de cancelación/reprogramación
    • Tipo de eventos evitados vs aceptados
    • Tiempo entre eventos sociales (recuperación)

    Pupillometry: Pupil dilation responses (requires front camera)

    JUEGO DE RESOLUCIÓN DE PROBLEMAS
    • Dificultad aumenta gradualmente
    • Se mide: intentos antes de éxito, tiempo persistencia
    • Respuesta a retroalimentación negativa
    • Uso de ayudas vs intentos independientes

    # Análisis de patrones lingüísticos en chats con la IA
    nlp_analysis = {
        "indicadores_emocionales": {
            "frecuencia_palabras_negativas": "no puedo, difícil, agotador",
            "uso_extremos": "siempre, nunca, todo, nada (pensamiento polarizado)",
            "longitud_respuestas": "respuestas cortas pueden indicar agotamiento",
            "cambios_tema_bruscos": "posible evitación de temas difíciles"
        },
        "patrones_cognitivos": {
            "flexibilidad_mental": "capacidad de considerar múltiples perspectivas",
            "concretitud_vs_abstracto": "nivel de pensamiento literal",
            "organización_ideas": "coherencia en narrativas"
        }
    }

        "indicadores_salud_mental": {
            "estabilidad_rutinas": "autistas saludables mantienen rutinas estables",
            "flexibilidad_adaptacion": "capacidad de ajustar planes cuando es necesario",
            "recuperacion_contratiempos": "tiempo en volver a baseline después de problemas"
        }

    REGISTRO AUTOMÁTICO DE TIMESTAMPS:
    • Tiempo entre evento social y uso de la app (recuperación)
    • Frecuencia de uso de features de emergencia
    • Patrones estacionales/horarios de mayor estrés
    • Duración de sesiones de preparación vs. eventos reales
    ```
  * Modo crisis: acceso inmediato desde fuera de la app (shortcut o combinación de botones) a herramientas de contención emocional y apoyo.
    * The AI should **keep records** of conversations (with user consent).
    * It should **show transparency** about what is saved and how.
    * Encourage the user to **take screenshots** of key parts of the chat:
      * Crisis summaries
      * Instructions for techniques
      * Safety plans
    * Allow users to **discuss previous resources** they tried and **report outcomes** (e.g., “That hotline didn’t help” or “This therapist was useful”).
      * Discuss the patient history of symptoms and cue different life events 
    * Enable the AI to **adapt based on user feedback** over time.
    * The assistant should engage in **ongoing, day-to-day mental health support**, not only during acute crises.
    * It should be able to **escalate** appropriately to 988 (suicide), 911 (emergency), or 211 (resources) when needed.
    * Include features to help **track medications**, dosages, and effects.
    * Optionally integrate or connect with **hospital or medical records** (with privacy compliance).
    * **Avoid offering lists of resource links** (e.g., “Here are 3 food banks to call”). These links often **don’t work** or **create false hope**. Instead, the assistant should **talk through needs** (e.g., “Do you currently have access to food?”) and **suggest next steps**, not dump links.
    * ai interactions have to go through a confidentiality assurance process to redact pii
  * **Vista de Recompensas y Cultura:** 
    * Que los rewards así como otras personalizaciones sean establecidas en una pantalla dedicada en interacción con la IA. 
    * Ayudarte a descubrir qué productos culturales son tus favoritos, con links configurable a fuentes de recursos.
      * Eventos, canciones (spotify), videos (tiktok, insta, youtube)... pero siempre desde una fuente de recursos.
    * marcadores de favoritos y 
      * Que el sistema registre las elecciones del usuario (por ejemplo, para completar un libro si se decide, con un botón de favoritos). 
    * Y que además se puedan seleccionar y añadir nuevas opciones de manera abierta. 
    * Deben poder desbloquearse rewards personalizados al final del día. Especialmente si son relajantes. Esto debe haberse podido establecer usando IA en una pantalla aparte.
      ```
      "Basado en tu energía actual: Sesión de música relajante de 10 minutos"

      [Redimir Ahora] [Guardar para Mañana]
      ```
* **Vista de Indicadores Emocionales:** 
  * **Pre-commitment Settings**: Users define what data matters to them during onboarding
  * **Data Ownership Dashboard**: Clear visualization of "your data, your insights"
  * **Optional Sharing**: Choose to share progress with therapist/accountability partner
  * monitoreo de niveles de estrés, 
  * progreso en habilidades, 
  * **Frecuencia de Meltdowns/Shutdowns** (Registro con desencadenantes)
  * estados de ánimo.
  * &#x20;The language avoids perfectionism and leverages **self-compassion and mastery orientation**. It focuses on measurable growth (“learning balance”), emphasizes effort over outcome, and provides a clear behavioral anchor (“handled interruptions calmly”). Celebrate "courage to try" over "success". Celebrate consistency, not performance.
    ```
    Dashboard Preview (once opened):
    📊 Progress Highlight
     "Your post-social stress decreased by 25% this month — your nervous system is learning balance 🧘‍♂️"

    💡 Insight of the Week
     "You handled 3 interruptions in your last meeting without stress spikes. That’s improved emotional regulation 👏"

    🌱 Gentle Reflection
     "Small, consistent regulation moments shape lasting change. You’re training calm, not chasing perfection."

    ALERTA DE PATRÓN: 
    "Noté que tu estrés aumenta los lunes por la mañana.
    ¿Quieres programar preparación automática para reuniones matutinas?" - Abrir IA 

    DETECCIÓN DE REGRESIÓN:
    "Tu tolerancia a multitudes ha disminuido 15% esta semana.
    ¿Ha habido cambios en tu rutina o sueño?" - Abrir IA

    Gráficos
    🎯 METAS CUMPLIDAS: 12/15 (80%)
    😌 ESTRÉS PROMEDIO: 5.2/10 (▼0.8)
    🔄 EVENTOS SOCIALES: 7 completados, 2 pospuestos
    📈 HABILIDAD PRINCIPAL: Contacto visual +15%

    🎯 HABILIDADES EN DESARROLLO:
    - Iniciar conversaciones: 🟡 65% dominio
    - Mantener contacto visual: 🟢 82% dominio  
    - Manejar interrupciones: 🔴 42% dominio

    ¿Deseas configurar nuevos objetivos para la próxima semana?
    ```
  * Reporte para Terapeuta (Opcional)
    ```
    DATOS ANONIMIZADOS PARA TERAPEUTA:
    • Patrones de estrés identificados
    • Progreso en objetivos terapéuticos
    • Efectividad de estrategias enseñadas
    • Áreas que requieren atención
    ```
  * Reportes de crisis
  ```
  REGISTRO DE Crisis
  • Desencadenante identificado: [ ] Sensorial [ ] Social [ ] Cambio
  • Intensidad: 1-10
  • Duración: minutos
  • Estrategias usadas: [ ] Aislamiento [ ] Estímulo controlado [ ] Otro
  • Efectividad estrategias: 1-5
  ```
  * Reporte de uso
  ```
  INSIGHT AUTOMÁTICO (Opcional):
  "Basado en tus patrones de uso, noté que:
  • Tu energía mental es más estable por las tardes
  • Las recompensas de música te ayudan 40% más que otras
  • Te recuperas más rápido cuando usas preparación estratégica

  ¿Quieres ajustar tu rutina basado en esto?"
  ```
  ```python
  logging_data = {
      "patrones_uso_app": {
          "horarios_pico_actividad": "timestamps",
          "features_mas_utilizados": "preparacion,analisis,recompensas",
          "duracion_sesiones_promedio": "minutes"
      },
      "indicadores_conductuales": {
          "frecuencia_analisis_post_evento": "count",
          "tipo_eventos_preparados": "categorias",
          "patrones_evitacion": "eventos_skipados",
          "ratio de recompensa por actividad": "reward_ratio"
      },
      "respuesta_recompensas": {
          "efectividad_por_tipo": "reduccion_estres",
          "preferencias_evolucion": "cambios_tiempo",
          "engagement_post_recompensa": "retencion"
      },    
      "participacion_vida": {
          "variedad_eventos_calendario": "diversificación de actividades",
          "frecuencia_salidas_no_obligatorias": "iniciativa social",
          "tiempo_entre_eventos_sociales": "tolerancia recuperación mejorada"
      },
      "autoregulacion": {
          "uso_preparacion_proactiva": "vs uso reactivo post-problema",
          "eleccion_recompensas_reguladoras": "conciencia necesidades propias",
          "personalizacion_herramientas": "comprensión de qué funciona",
          "lugar_favorito": "top contextos"
      }
  }

  PROGRESO EN MÚLTIPLES CONTEXTOS:
  • Uso de habilidades en diferentes tipos de eventos (trabajo, social, familiar)
  • Aplicación de estrategias sin prompts de la app
  • Reducción en uso de modos de emergencia
  • Aumento en eventos sociales espontáneos (no calendarizados)
  ```

The "Discovery Engine"
Pattern Detection:
"You complete 89% more tasks when they're under 10 minutes"
"Your energy peaks between 10-11 AM- schedule important tasks then"
"Job-search tasks cause biggest energy drop-suggest more frequent rewards" Adaptive Learning:
Gradually increases task duration as success rate improves
Learns which rewards are most effective for which task types
Detects and flags emerging routines for "automation"


