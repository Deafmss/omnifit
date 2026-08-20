-- ==============================================================================
-- OMNIFIT DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Execute este script no SQL Editor do seu projeto Supabase.
--
-- Requisito: a sincronização só funciona para usuários autenticados via
-- Supabase Auth (login com Google). As políticas abaixo usam auth.uid(), que é
-- NULL para contas puramente locais — nesse caso os INSERTs são bloqueados.
-- ==============================================================================

-- 1. Tabela de Perfis de Usuário (Antropometria e Metas)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  age integer not null,
  gender text not null check (gender in ('male', 'female')),
  height_cm numeric not null,
  weight_kg numeric not null,
  body_fat_percentage numeric,
  experience_level text not null default 'intermediate',
  goal text not null check (goal in ('recomposition', 'fat_loss', 'hypertrophy', 'maintenance')),
  training_days_per_week integer not null default 4,
  session_duration_min integer not null default 60,
  diet_mode text not null default 'guided',
  meals_per_day integer not null default 4,
  is_calibrated boolean not null default false,
  pre_workout_formula jsonb,
  coffee_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Um perfil por usuário. Necessário para o upsert com
  -- `onConflict: 'user_id'` do cliente: sem esta constraint o Postgres
  -- rejeita a operação com o erro 42P10.
  constraint profiles_user_id_key unique (user_id)
);

-- Habilitar RLS em profiles
alter table public.profiles enable row level security;

create policy "Usuários podem visualizar apenas seu próprio perfil"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Usuários podem inserir seu próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar seu próprio perfil"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuários podem excluir seu próprio perfil"
  on public.profiles for delete
  using (auth.uid() = user_id);


-- 2. Tabela de Planos de Refeição (Dietas & Alimentos)
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  order_index integer not null default 0,
  suggested_time text,
  target_calories integer not null default 0,
  target_protein_g numeric not null default 0,
  target_carbs_g numeric not null default 0,
  target_fat_g numeric not null default 0,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS em meal_plans
alter table public.meal_plans enable row level security;

create policy "Usuários podem gerenciar apenas suas próprias refeições"
  on public.meal_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 3. Tabela de Fichas de Treino (Divisão de Treinos Semanal)
create table if not exists public.workout_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  split_code text not null,
  name text not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  target_muscles text[] not null default '{}',
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS em workout_routines
alter table public.workout_routines enable row level security;

create policy "Usuários podem gerenciar apenas suas próprias fichas de treino"
  on public.workout_routines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 4. Tabela de Logs de Execução de Treino
create table if not exists public.workout_session_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  routine_id uuid,
  name text not null,
  date date not null default current_date,
  duration_minutes integer not null default 0,
  total_volume_load_kg numeric not null default 0,
  calories_burned_estimate integer not null default 0,
  completed boolean not null default true,
  exercise_logs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Habilitar RLS em workout_session_logs
alter table public.workout_session_logs enable row level security;

create policy "Usuários podem gerenciar apenas seus próprios logs de treino"
  on public.workout_session_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 5. Tabela de Histórico de Pesagens e EMA
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  weight_kg numeric not null,
  ema_weight_kg numeric,
  body_fat_percentage numeric,
  created_at timestamptz not null default now()
);

-- Habilitar RLS em weight_logs
alter table public.weight_logs enable row level security;

create policy "Usuários podem gerenciar apenas suas próprias pesagens"
  on public.weight_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 6. Tabela de Check-Ins Semanais & Diagnósticos Adaptativos
create table if not exists public.check_in_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  adherence_score integer not null,
  hunger_level integer not null check (hunger_level between 1 and 5),
  energy_level integer not null check (energy_level between 1 and 5),
  weekly_avg_weight_kg numeric not null,
  calculated_tdee integer not null,
  recommended_calorie_delta integer not null default 0,
  applied_calorie_adjustment integer not null default 0,
  diagnosis_text text not null,
  created_at timestamptz not null default now()
);

-- Habilitar RLS em check_in_logs
alter table public.check_in_logs enable row level security;

create policy "Usuários podem gerenciar apenas seus próprios check-ins"
  on public.check_in_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. Diário Alimentar (o que foi efetivamente consumido, por dia)
--
-- Os valores nutricionais são um SNAPSHOT do momento do consumo: o alimento
-- pode ser editado ou excluído depois, e o histórico precisa continuar
-- refletindo o que foi comido de fato.
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  food_id text not null,
  food_name text not null,
  grams numeric not null,
  calories integer not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric not null default 0,
  meal_name text not null,
  meal_order integer not null default 0,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- Uma porção por alimento, por refeição, por dia. Permite upsert idempotente
  -- em vez de duplicar o registro a cada sincronização.
  constraint food_logs_unique_entry unique (user_id, date, food_id, meal_order)
);

-- Habilitar RLS em food_logs
alter table public.food_logs enable row level security;

create policy "Usuários podem gerenciar apenas seu próprio diário alimentar"
  on public.food_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Índices de alta performance
create index if not exists idx_meal_plans_user on public.meal_plans(user_id);
create index if not exists idx_workout_routines_user on public.workout_routines(user_id);
create index if not exists idx_session_logs_user_date on public.workout_session_logs(user_id, date);
create index if not exists idx_weight_logs_user_date on public.weight_logs(user_id, date);
create index if not exists idx_check_in_logs_user_date on public.check_in_logs(user_id, date);
create index if not exists idx_food_logs_user_date on public.food_logs(user_id, date);
