# 🌍 Wanderpack — Guía de instalación

## Paso 1: Configurar Supabase (base de datos)

1. Ve a **https://supabase.com** y crea una cuenta gratuita
2. Crea un nuevo proyecto (elige nombre y contraseña)
3. Espera ~2 minutos a que se cree
4. Ve a **SQL Editor** (menú izquierdo) → "New query"
5. Copia y pega todo el contenido de `schema.sql` y pulsa **Run**
6. Ve a **Project Settings → API** y copia:
   - `Project URL` → lo necesitarás en el paso 3
   - `anon public key` → lo necesitarás en el paso 3

## Paso 2: Subir el código a GitHub

1. Ve a **https://github.com** y crea una cuenta gratuita
2. Crea un nuevo repositorio (botón verde "New")
3. Ponle nombre: `wanderpack` (o el que quieras)
4. Descarga el código de esta app y súbelo al repositorio
   - Opción fácil: arrastra los archivos al repositorio en el navegador
   - O usa Git si sabes: `git init && git add . && git commit -m "init" && git push`

## Paso 3: Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con:

```
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

(Reemplaza con los valores del Paso 1)

## Paso 4: Publicar en Vercel

1. Ve a **https://vercel.com** y crea cuenta gratuita (puedes entrar con GitHub)
2. Pulsa "New Project" → selecciona tu repositorio de GitHub
3. En "Environment Variables" añade las dos variables:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon key
4. Pulsa **Deploy** — en 2 minutos tendrás la URL

## ¡Listo! 🎉

Tu app estará en: `https://wanderpack.vercel.app` (o similar)

Comparte esa URL con tus amigos y que cada uno cree su cuenta.

---

## Para desarrollo local

```bash
npm install
cp .env.example .env   # y rellena con tus credenciales de Supabase
npm run dev
```

La app se abrirá en http://localhost:5173
