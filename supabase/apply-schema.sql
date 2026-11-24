-- Instalador idempotente do schema do Minha Escala.
--
-- Reúne supabase/migrations/001_initial_minha_escala.sql e
-- supabase/migrations/002_restrict_error_logs_insert.sql em uma versão que pode
-- ser executada repetidas vezes, sobre um banco vazio ou parcialmente migrado.
--
-- Formas de aplicar:
--   1) SQL Editor do Supabase: cole este arquivo inteiro e rode.
--   2) Terminal: SUPABASE_ACCESS_TOKEN=sbp_... npm run apply:schema
--
-- Diferente das migrações originais, este arquivo também concede privilégios ao
-- service_role. Projetos novos da Supabase não dão grants automáticos às
-- tabelas criadas por SQL, e sem isso todo acesso server-side falha com
-- 42501 (permission denied for table ...).

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

-- ---------------------------------------------------------------- tabelas ---

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text,
  email text,
  role text not null default 'user'
    constraint profiles_role_check check (role in ('user', 'admin')),
  access_status text not null default 'pending_payment'
    constraint profiles_access_status_check
    check (access_status in ('pending_payment', 'approved', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'pagbank',
  status text not null default 'pending'
    constraint payments_status_check
    check (status in ('pending', 'approved', 'rejected')),
  amount numeric(10, 2),
  external_id text constraint payments_external_id_key unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  consent_given boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_status_history (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  previous_status text,
  next_status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.access_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete restrict,
  product text not null
    constraint access_entitlements_product_check
    check (product = 'annual-calendar'),
  lifetime boolean not null default true,
  granted_at timestamptz not null default now(),
  constraint access_entitlements_user_id_product_key unique (user_id, product)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  target_url text not null,
  position text not null
    constraint banners_position_check
    check (position in ('result-top', 'result-bottom', 'sidebar')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.banner_events (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.banners(id) on delete cascade,
  event_name text not null
    constraint banner_events_event_name_check
    check (event_name in ('impression', 'click')),
  created_at timestamptz not null default now()
);

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Tabelas que já existiam (migração anterior) podem estar sem alguma constraint.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_access_status_check') then
    alter table public.profiles add constraint profiles_access_status_check
      check (access_status in ('pending_payment', 'approved', 'blocked'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check
      check (role in ('user', 'admin'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_user_id_key') then
    alter table public.profiles add constraint profiles_user_id_key unique (user_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payments_status_check') then
    alter table public.payments add constraint payments_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payments_external_id_key') then
    alter table public.payments add constraint payments_external_id_key unique (external_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'access_entitlements_user_id_product_key') then
    alter table public.access_entitlements
      add constraint access_entitlements_user_id_product_key unique (user_id, product);
  end if;
end;
$$;

-- ---------------------------------------------------------------- índices ---

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists leads_user_id_idx on public.leads (user_id);
create index if not exists payment_status_history_payment_id_idx
  on public.payment_status_history (payment_id);
create index if not exists access_entitlements_user_id_idx
  on public.access_entitlements (user_id);
create index if not exists access_entitlements_payment_id_idx
  on public.access_entitlements (payment_id);
create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists banner_events_banner_id_idx on public.banner_events (banner_id);
create index if not exists error_logs_user_id_idx on public.error_logs (user_id);

-- -------------------------------------------------------------- funções ---

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name, email)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    new.email
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles
      where user_id = (select auth.uid())
        and role = 'admin'
    );
$$;

create or replace function private.protect_profile_access_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and new.access_status is distinct from old.access_status
    and not (select private.is_admin()) then
    raise exception 'Somente administradores podem alterar access_status.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function private.validate_error_log_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.message is null or length(trim(new.message)) = 0 then
    raise exception 'error_logs.message não pode ser vazio.'
      using errcode = '23514';
  end if;

  if jsonb_typeof(new.context) != 'object' then
    raise exception 'error_logs.context deve ser um objeto JSON.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------- triggers ---

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function private.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

drop trigger if exists profiles_protect_access_status on public.profiles;
create trigger profiles_protect_access_status
  before update on public.profiles
  for each row execute function private.protect_profile_access_status();

drop trigger if exists error_logs_validate_insert on public.error_logs;
create trigger error_logs_validate_insert
  before insert on public.error_logs
  for each row execute function private.validate_error_log_insert();

-- ----------------------------------------------------------------- RLS ---

alter table public.profiles enable row level security;
alter table public.payments enable row level security;
alter table public.leads enable row level security;
alter table public.payment_status_history enable row level security;
alter table public.access_entitlements enable row level security;
alter table public.events enable row level security;
alter table public.banners enable row level security;
alter table public.banner_events enable row level security;
alter table public.error_logs enable row level security;

-- ------------------------------------------------------------- policies ---

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using ((select private.is_admin()));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and role = 'user'
    and access_status = 'pending_payment'
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists payments_select_admin on public.payments;
create policy payments_select_admin on public.payments
  for select to authenticated
  using ((select private.is_admin()));

drop policy if exists leads_insert_public on public.leads;
create policy leads_insert_public on public.leads
  for insert to anon, authenticated
  with check (consent_given = true);

drop policy if exists leads_select_own on public.leads;
create policy leads_select_own on public.leads
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists payment_history_select_own on public.payment_status_history;
create policy payment_history_select_own on public.payment_status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.payments
      where payments.id = payment_status_history.payment_id
        and payments.user_id = (select auth.uid())
    )
  );

drop policy if exists entitlements_select_own on public.access_entitlements;
create policy entitlements_select_own on public.access_entitlements
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists events_insert_limited on public.events;
create policy events_insert_limited on public.events
  for insert to anon, authenticated
  with check (event_name in (
    'page_view',
    'calculation_completed',
    'lead_captured',
    'checkout_started',
    'payment_approved',
    'banner_viewed',
    'banner_clicked'
  ));

drop policy if exists banners_select_active on public.banners;
create policy banners_select_active on public.banners
  for select to anon, authenticated
  using (active = true);

drop policy if exists banner_events_insert_public on public.banner_events;
create policy banner_events_insert_public on public.banner_events
  for insert to anon, authenticated
  with check (event_name in ('impression', 'click'));

-- Migração 002: error_logs deixa de aceitar insert anônimo e passa a validar
-- message/context.
drop policy if exists error_logs_insert_public on public.error_logs;
drop policy if exists error_logs_insert_authenticated on public.error_logs;
create policy error_logs_insert_authenticated on public.error_logs
  for insert to authenticated
  with check (
    message is not null
    and length(trim(message)) > 0
    and jsonb_typeof(context) = 'object'
  );

-- ------------------------------------------------------------- funções ---

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.protect_profile_access_status() from public, anon, authenticated;
revoke all on function private.validate_error_log_insert() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon;

grant usage on schema private to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;

-- -------------------------------------------------------------- grants ---

grant usage on schema public to anon, authenticated, service_role;

grant select on public.profiles, public.payments to authenticated;
grant insert (user_id, name, email) on public.profiles to authenticated;
grant update (name, access_status) on public.profiles to authenticated;
grant insert on public.leads, public.events, public.banner_events, public.error_logs
  to anon, authenticated;
grant select on public.leads, public.payment_status_history,
  public.access_entitlements to authenticated;
grant select on public.banners to anon, authenticated;

revoke insert, update, delete on public.payments from anon, authenticated;
revoke update (role, user_id, email) on public.profiles from anon, authenticated;
revoke insert on public.error_logs from anon;

-- O service role só é usado no servidor (service_role key). Precisa de acesso
-- total porque as rotas administrativas listam/atualizam qualquer usuário.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;

commit;
