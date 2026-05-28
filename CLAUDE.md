# Wanderpack — Contexto para Claude

## Qué es esto
App de vacaciones para un grupo de amigos (Anémonas 2026). React + Vite + Supabase + Vercel.
URL: https://wanderpack.vercel.app
Repo: https://github.com/Danilaz06/-wanderpack

## Stack
- React 18 + Vite
- Supabase (auth, db, storage, realtime)
- Vercel (deploy automático desde main)
- EmailJS (notificaciones por email, sin backend)
- date-fns, lucide-react, react-router-dom v6

## Supabase
- Proyecto: vgkmomqenoxygodxcqbe
- URL: https://vgkmomqenoxygodxcqbe.supabase.co
- Las queries usan fetches separados (sin JOINs anidados) porque Supabase no reconoce las FK en el schema cache

## Variables de entorno (están en Vercel y en .env local)
```
VITE_SUPABASE_URL=https://vgkmomqenoxygodxcqbe.supabase.co
VITE_SUPABASE_ANON_KEY=[en .env local, no commitear]
VITE_EMAILJS_SERVICE_ID=service_8nff7gr
VITE_EMAILJS_TEMPLATE_ID=template_b803m89         ← plan nuevo creado
VITE_EMAILJS_REMINDER_TEMPLATE_ID=template_8h1qgl4 ← recordatorios admin
VITE_EMAILJS_PUBLIC_KEY=WrNQk6YHEz-mYi1EF
```

## Usuarios especiales
- **Admin**: daniellazar1614@gmail.com (Dani) — ve botones de recordatorio en cada plan
- **Pareja**: daniellazar1614@gmail.com + aguedacelma@gmail.com — acceso a sección Nosotros
- **Agueda**: aguedacelma@gmail.com — NO recibe emails de planes normales, solo de planes de pareja y "queda poco"

## Rutas
- `/auth` — login/registro
- `/calendar` — calendario mensual con planes
- `/plans` — lista de planes del grupo (sin planes de pareja)
- `/plans/:id` — detalle de plan (chat, encuestas, disponibilidad, fotos si es pareja)
- `/members` — miembros del grupo
- `/profile` — perfil + compromisos personales
- `/couple` — sección privada de pareja (solo Dani y Agueda)
- `/ideas` — ideas de mejora (todos los usuarios)

## Tablas Supabase
```
profiles          (id, email, full_name, avatar_url, updated_at)
plans             (id, title, description, start_date, end_date, emoji, color_index,
                   created_by, open_dates, is_couple, created_at)
plan_members      (id, plan_id, user_id, joined_at)
messages          (id, plan_id, user_id, content, created_at) ← realtime activado
availability      (id, plan_id, user_id, status: yes/maybe/no)
polls             (id, plan_id, user_id, question, created_at)
poll_options      (id, poll_id, text)
poll_votes        (id, option_id, poll_id, user_id)
commitments       (id, user_id, title, start_date, end_date, created_at)
date_proposals    (id, plan_id, user_id, proposed_start, proposed_end, created_at)
couple_plan_photos(id, plan_id, user_id, file_path, file_name, created_at)
ideas             (id, user_id, title, description, status: pendiente/en_proceso/implementado, created_at)
idea_votes        (id, idea_id, user_id) ← UNIQUE(idea_id, user_id)
```

Storage buckets:
- `avatars` — público, fotos de perfil
- `couple-photos` — público (paths UUID), solo pareja puede subir/borrar

## RLS importante
- `plans`: planes con `is_couple=true` solo visibles para los emails de pareja
- `couple_plan_photos`: solo la pareja puede ver/subir/borrar
- El resto: visibles para cualquier usuario autenticado

## Archivos clave
```
src/
  App.jsx                    — rutas + ProtectedRoute + CoupleRoute
  index.css                  — estilos globales + responsive completo
  lib/
    supabase.js              — cliente Supabase con sesión persistente
    notifications.js         — lógica de emails via EmailJS
  hooks/
    useAuth.jsx              — contexto auth (user, profile, loading)
  components/
    Layout.jsx               — sidebar + bottom nav + Avatar/getColor/getInitials
    CreatePlanModal.jsx      — modal crear plan (acepta prop isCouple)
  pages/
    AuthPage.jsx             — login/registro
    CalendarPage.jsx         — calendario mensual
    PlansPage.jsx            — lista planes (filtra is_couple=false)
    PlanDetailPage.jsx       — detalle plan: chat+encuestas+disponibilidad+fotos+admin
    CouplePage.jsx           — lista planes de pareja
    MembersPage.jsx          — miembros del grupo
    ProfilePage.jsx          — perfil + compromisos
    IdeasPage.jsx            — ideas de mejora: lista, votos, form, admin puede cambiar estado
schema.sql                   — schema original (referencia)
schema_updates.sql           — migraciones a ejecutar en Supabase SQL Editor
```

## Funcionalidades implementadas

### Responsive móvil
- Input font-size 1rem (evita zoom iOS)
- Calendario en móvil: chips → puntos de color
- Headers apilados verticalmente en móvil
- Modal como bottom-sheet en móvil
- Chat con altura adaptativa (100svh)
- Bottom nav con todos los items incluido "Nosotros" para pareja

### Sección Nosotros (/couple)
- Solo accesible a daniellazar1614@gmail.com y aguedacelma@gmail.com
- CoupleRoute en App.jsx redirige a /calendar si no eres de la pareja
- Icono Heart rosa en sidebar y bottom nav (solo visible para pareja)
- Planes marcados con `is_couple=true` en DB
- RLS oculta planes de pareja a los demás usuarios
- CreatePlanModal acepta prop `isCouple={true}` para crear planes privados

### Fotos en planes de pareja
- Tab "Fotos" en PlanDetailPage cuando `plan.is_couple === true`
- Subida a Supabase Storage bucket `couple-photos`
- Path: `{plan_id}/{uuid}.{ext}`
- Galería con lightbox (click para ver grande)
- Botón descargar + borrar (solo propio)
- En móvil los botones siempre visibles (no hace falta hover)

### Notificaciones email (EmailJS)
Lógica en `src/lib/notifications.js`:
- `notifyPlanCreated(plan)` — al crear un plan, busca TODOS los profiles en Supabase
  - Plan normal → todos excepto Agueda
  - Plan de pareja → solo Dani y Agueda
- `sendPlanReminder(plan, type)` — botones admin, busca TODOS los profiles
  - type='remember' → todos excepto Agueda (también busca los que NO están en el plan)
  - type='soon' → absolutamente TODOS sin excepción (incluye Agueda)
  - Plan de pareja → siempre solo Dani y Agueda

Template EmailJS para plan nuevo (`template_b803m89`):
- Subject: `Nuevo plan: {{plan_emoji}} {{plan_title}}`
- To: `{{to_email}}`
- Variables: plan_title, plan_emoji, plan_dates, plan_description, plan_url

Template EmailJS para recordatorios (`template_8h1qgl4`):
- Subject: `{{reminder_subject}}`
- To: `{{to_email}}`
- Variables: reminder_subject, reminder_message, plan_title, plan_emoji, plan_dates, plan_url

### Botones admin en planes
En PlanDetailPage, solo visible para daniellazar1614@gmail.com:
- Recuadro naranja con borde punteado encima de los tabs
- "🔧 Admin — solo tú ves esto"
- Botón "Recordar el plan" (Bell icon) → reminder type='remember'
- Botón "Queda poco tiempo" (Clock icon) → reminder type='soon'
- Estado visual: "Enviando..." → "✓ Enviado" (3s) → vuelve al normal
- `isAdmin` comprueba user?.email y profile?.email (toLowerCase) para evitar problemas de mayúsculas

## Flujo de trabajo
1. Cambios con Claude en `C:\Users\Danie\Documents\wanderpack`
2. Git commit + push a main
3. Vercel redespliega automáticamente
4. Supabase SQL: ejecutar schema_updates.sql en SQL Editor si hay cambios de BD

## Git
- Remote: https://github.com/Danilaz06/-wanderpack
- Credenciales: PAT de Danilaz06 guardado en Windows Credential Manager
- User: daniellazar1614@gmail.com / Danilaz06

### Chat
- Mensajes agrupados por remitente (estilo WhatsApp)
- Avatar y nombre solo aparecen en el primer mensaje de cada bloque
- Timestamp solo en el último mensaje del bloque
- Bordes de burbuja adaptativos según posición en el grupo
- Burbujas own: terracotta. Otras: blanco con sombra sutil

### Ideas de mejora (/ideas)
- Accesible a todos los usuarios autenticados
- Listado con votos (ThumbsUp), creación con form inline, ordenado por más reciente
- Admin (Dani) puede cambiar el estado: pendiente → en_proceso → implementado
- Chips de color por estado en cada idea
- Tabla `ideas` (id, user_id, title, description, status, created_at)
- Tabla `idea_votes` (id, idea_id, user_id) con UNIQUE constraint para evitar doble voto

## Problemas conocidos / pendientes
- schema_updates.sql hay que ejecutarlo manualmente en Supabase SQL Editor (si no se ha hecho ya)
- Generador de playlists en HackerGitano da 403 (app Spotify en modo desarrollo) — proyecto separado
- Responsive mejorable en pantallas muy pequeñas (<320px)
- EmailJS free tier: 200 emails/mes (suficiente para uso personal del grupo)
