-- ============================================================
-- WANDERPACK — Actualizaciones de schema
-- Ejecuta todo esto en el SQL Editor de Supabase
-- ============================================================

-- 1. Hacer start_date y end_date nullable (para planes sin fecha)
ALTER TABLE public.plans
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

-- 2. Añadir columnas open_dates e is_couple a plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS open_dates boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_couple boolean DEFAULT false;

-- 3. Actualizar política RLS de planes para ocultar planes de pareja a no-pareja
DROP POLICY IF EXISTS "Planes visibles para autenticados" ON public.plans;
CREATE POLICY "Planes visibles para autenticados" ON public.plans
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      is_couple = false
      OR (auth.jwt() ->> 'email') IN ('daniellazar1614@gmail.com', 'aguedacelma@gmail.com')
    )
  );

-- 4. Crear tabla commitments (usada en código, faltaba en schema original)
CREATE TABLE IF NOT EXISTS public.commitments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Compromisos visibles para autenticados" ON public.commitments;
CREATE POLICY "Compromisos visibles para autenticados" ON public.commitments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Cada uno gestiona sus compromisos" ON public.commitments;
CREATE POLICY "Cada uno gestiona sus compromisos" ON public.commitments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cada uno borra sus compromisos" ON public.commitments;
CREATE POLICY "Cada uno borra sus compromisos" ON public.commitments
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Crear tabla date_proposals (usada en código, faltaba en schema original)
CREATE TABLE IF NOT EXISTS public.date_proposals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  proposed_start date NOT NULL,
  proposed_end date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.date_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Propuestas visibles para autenticados" ON public.date_proposals;
CREATE POLICY "Propuestas visibles para autenticados" ON public.date_proposals
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Autenticados pueden proponer fechas" ON public.date_proposals;
CREATE POLICY "Autenticados pueden proponer fechas" ON public.date_proposals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cada uno borra su propuesta" ON public.date_proposals;
CREATE POLICY "Cada uno borra su propuesta" ON public.date_proposals
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Crear tabla couple_plan_photos
CREATE TABLE IF NOT EXISTS public.couple_plan_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.couple_plan_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo la pareja ve las fotos" ON public.couple_plan_photos;
CREATE POLICY "Solo la pareja ve las fotos" ON public.couple_plan_photos
  FOR SELECT USING (
    (auth.jwt() ->> 'email') IN ('daniellazar1614@gmail.com', 'aguedacelma@gmail.com')
  );

DROP POLICY IF EXISTS "Solo la pareja sube fotos" ON public.couple_plan_photos;
CREATE POLICY "Solo la pareja sube fotos" ON public.couple_plan_photos
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'email') IN ('daniellazar1614@gmail.com', 'aguedacelma@gmail.com')
    AND auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Cada uno borra sus fotos" ON public.couple_plan_photos;
CREATE POLICY "Cada uno borra sus fotos" ON public.couple_plan_photos
  FOR DELETE USING (
    (auth.jwt() ->> 'email') IN ('daniellazar1614@gmail.com', 'aguedacelma@gmail.com')
    AND auth.uid() = user_id
  );

-- 8. Permitir al admin borrar cualquier plan (creadores solo pueden borrar los suyos)
DROP POLICY IF EXISTS "Creador puede borrar su plan" ON public.plans;
CREATE POLICY "Creador puede borrar su plan" ON public.plans
  FOR DELETE USING (
    auth.uid() = created_by
    OR (auth.jwt() ->> 'email') = 'daniellazar1614@gmail.com'
  );

-- 9. Tabla ideas de mejora
CREATE TABLE IF NOT EXISTS public.ideas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'implementado')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ideas visibles para autenticados" ON public.ideas;
CREATE POLICY "Ideas visibles para autenticados" ON public.ideas
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Autenticados pueden crear ideas" ON public.ideas;
CREATE POLICY "Autenticados pueden crear ideas" ON public.ideas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin puede actualizar ideas" ON public.ideas;
CREATE POLICY "Admin puede actualizar ideas" ON public.ideas
  FOR UPDATE USING (
    (auth.jwt() ->> 'email') = 'daniellazar1614@gmail.com'
  );

-- 9. Tabla votos de ideas
CREATE TABLE IF NOT EXISTS public.idea_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id uuid REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(idea_id, user_id)
);

ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Votos visibles para autenticados" ON public.idea_votes;
CREATE POLICY "Votos visibles para autenticados" ON public.idea_votes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Autenticados pueden votar" ON public.idea_votes;
CREATE POLICY "Autenticados pueden votar" ON public.idea_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cada uno borra su voto" ON public.idea_votes;
CREATE POLICY "Cada uno borra su voto" ON public.idea_votes
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Storage bucket para fotos de pareja (publico con paths UUID, control via RLS insert/delete)
INSERT INTO storage.buckets (id, name, public)
VALUES ('couple-photos', 'couple-photos', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Fotos pareja publicas" ON storage.objects;
CREATE POLICY "Fotos pareja publicas" ON storage.objects
  FOR SELECT USING (bucket_id = 'couple-photos');

DROP POLICY IF EXISTS "Solo la pareja sube fotos al storage" ON storage.objects;
CREATE POLICY "Solo la pareja sube fotos al storage" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'couple-photos'
    AND (auth.jwt() ->> 'email') IN ('daniellazar1614@gmail.com', 'aguedacelma@gmail.com')
  );

DROP POLICY IF EXISTS "Solo la pareja borra fotos del storage" ON storage.objects;
CREATE POLICY "Solo la pareja borra fotos del storage" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'couple-photos'
    AND (auth.jwt() ->> 'email') IN ('daniellazar1614@gmail.com', 'aguedacelma@gmail.com')
  );
