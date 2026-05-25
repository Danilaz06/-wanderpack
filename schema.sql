-- ============================================
-- WANDERPACK — Schema completo para Supabase
-- Ejecuta esto en el SQL Editor de Supabase
-- ============================================

-- PROFILES (extiende auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Perfiles visibles para autenticados" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "Cada uno puede actualizar su perfil" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Cada uno puede editar su perfil" on public.profiles
  for update using (auth.uid() = id);

-- PLANS
create table if not exists public.plans (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  emoji text default '✈️',
  color_index int default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.plans enable row level security;
create policy "Planes visibles para autenticados" on public.plans
  for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden crear planes" on public.plans
  for insert with check (auth.uid() = created_by);
create policy "Creador puede editar su plan" on public.plans
  for update using (auth.uid() = created_by);
create policy "Creador puede eliminar su plan" on public.plans
  for delete using (auth.uid() = created_by);

-- PLAN MEMBERS
create table if not exists public.plan_members (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references public.plans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(plan_id, user_id)
);

alter table public.plan_members enable row level security;
create policy "Miembros visibles para autenticados" on public.plan_members
  for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden unirse a planes" on public.plan_members
  for insert with check (auth.uid() = user_id);
create policy "Miembro puede salir" on public.plan_members
  for delete using (auth.uid() = user_id);

-- MESSAGES (chat)
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references public.plans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
create policy "Mensajes visibles para autenticados" on public.messages
  for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden enviar mensajes" on public.messages
  for insert with check (auth.uid() = user_id);

-- Habilitar realtime para mensajes
alter publication supabase_realtime add table public.messages;

-- AVAILABILITY
create table if not exists public.availability (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references public.plans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text check (status in ('yes', 'maybe', 'no')) not null,
  updated_at timestamptz default now(),
  unique(plan_id, user_id)
);

alter table public.availability enable row level security;
create policy "Disponibilidad visible para autenticados" on public.availability
  for select using (auth.role() = 'authenticated');
create policy "Cada uno gestiona su disponibilidad" on public.availability
  for insert with check (auth.uid() = user_id);
create policy "Cada uno actualiza su disponibilidad" on public.availability
  for update using (auth.uid() = user_id);

-- POLLS
create table if not exists public.polls (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references public.plans(id) on delete cascade,
  user_id uuid references auth.users(id),
  question text not null,
  created_at timestamptz default now()
);

alter table public.polls enable row level security;
create policy "Encuestas visibles para autenticados" on public.polls
  for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden crear encuestas" on public.polls
  for insert with check (auth.uid() = user_id);

-- POLL OPTIONS
create table if not exists public.poll_options (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.polls(id) on delete cascade,
  text text not null
);

alter table public.poll_options enable row level security;
create policy "Opciones visibles para autenticados" on public.poll_options
  for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden crear opciones" on public.poll_options
  for insert with check (auth.role() = 'authenticated');

-- POLL VOTES
create table if not exists public.poll_votes (
  id uuid default gen_random_uuid() primary key,
  option_id uuid references public.poll_options(id) on delete cascade,
  poll_id uuid references public.polls(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(poll_id, user_id)
);

alter table public.poll_votes enable row level security;
create policy "Votos visibles para autenticados" on public.poll_votes
  for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden votar" on public.poll_votes
  for insert with check (auth.uid() = user_id);
create policy "Cada uno puede cambiar su voto" on public.poll_votes
  for delete using (auth.uid() = user_id);

-- STORAGE BUCKET para avatares
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

create policy "Avatares públicos" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "Usuarios autenticados pueden subir su avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' AND auth.role() = 'authenticated');
create policy "Usuarios autenticados pueden actualizar su avatar" on storage.objects
  for update using (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Trigger para crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
