create extension if not exists pgcrypto;

create schema if not exists private;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text,
  email text,
  role text not null default 'user'
    check (role in ('user', 'admin')),
  access_status text not null default 'pending_payment'
    check (access_status in ('pending_payment', 'approved', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'pagbank',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  amount numeric(10, 2),
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- As tabelas abaixo pertencem às funcionalidades já existentes do app. Elas
-- continuam protegidas por RLS durante a migração gradual do fluxo de acesso.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  consent_given boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.payment_status_history (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  previous_status text,
  next_status text not null,
  created_at timestamptz not null default now()
);

create table public.access_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete restrict,
  product text not null check (product = 'annual-calendar'),
  lifetime boolean not null default true,
  granted_at timestamptz not null default now(),
  unique (user_id, product)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  target_url text not null,
  position text not null check (position in ('result-top', 'result-bottom', 'sidebar')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.banner_events (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.banners(id) on delete cascade,
  event_name text not null check (event_name in ('impression', 'click')),
  created_at timestamptz not null default now()
);

create table public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Postgres não cria índices automaticamente para FKs. Estes índices também
-- aceleram os predicados de ownership usados pelas policies.
create index payments_user_id_idx on public.payments (user_id);
create index leads_user_id_idx on public.leads (user_id);
create index payment_status_history_payment_id_idx
  on public.payment_status_history (payment_id);
create index access_entitlements_user_id_idx
  on public.access_entitlements (user_id);
create index access_entitlements_payment_id_idx
  on public.access_entitlements (payment_id);
create index events_user_id_idx on public.events (user_id);
create index banner_events_banner_id_idx on public.banner_events (banner_id);
create index error_logs_user_id_idx on public.error_logs (user_id);

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

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function private.set_updated_at();

-- O profile nasce junto com auth.users, inclusive quando a confirmação de
-- e-mail está habilitada e ainda não existe uma sessão autenticada no client.
-- raw_user_meta_data é usado somente para o nome de exibição, nunca para role.
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
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- A função evita recursão de RLS ao consultar profiles dentro de policies.
-- Ela só responde se o próprio auth.uid() atual possui role=admin.
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

-- UPDATE policies são combinadas com OR. Como a policy de ownership precisa
-- permitir a edição do nome, este trigger é a barreira adicional que impede o
-- mesmo usuário de aproveitar essa policy para aprovar o próprio acesso.
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

create trigger profiles_protect_access_status
  before update on public.profiles
  for each row execute function private.protect_profile_access_status();

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.protect_profile_access_status() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.payments enable row level security;
alter table public.leads enable row level security;
alter table public.payment_status_history enable row level security;
alter table public.access_entitlements enable row level security;
alter table public.events enable row level security;
alter table public.banners enable row level security;
alter table public.banner_events enable row level security;
alter table public.error_logs enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using ((select private.is_admin()));

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and role = 'user'
    and access_status = 'pending_payment'
  );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy payments_select_own on public.payments
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy payments_select_admin on public.payments
  for select to authenticated
  using ((select private.is_admin()));

create policy leads_insert_public on public.leads
  for insert to anon, authenticated
  with check (consent_given = true);

create policy leads_select_own on public.leads
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy payment_history_select_own on public.payment_status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.payments
      where payments.id = payment_status_history.payment_id
        and payments.user_id = (select auth.uid())
    )
  );

create policy entitlements_select_own on public.access_entitlements
  for select to authenticated
  using ((select auth.uid()) = user_id);

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

create policy banners_select_active on public.banners
  for select to anon, authenticated
  using (active = true);

create policy banner_events_insert_public on public.banner_events
  for insert to anon, authenticated
  with check (event_name in ('impression', 'click'));

create policy error_logs_insert_public on public.error_logs
  for insert to anon, authenticated
  with check (true);

-- Grants explícitos são necessários para projetos em que tabelas novas não
-- são expostas automaticamente à Data API. A permissão por coluna impede que
-- um usuário comum altere role/access_status mesmo possuindo a própria linha.
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.payments to authenticated;
grant insert (user_id, name, email) on public.profiles to authenticated;
grant update (name, access_status) on public.profiles to authenticated;
grant insert on public.leads, public.events, public.banner_events, public.error_logs
  to anon, authenticated;
grant select on public.leads, public.payment_status_history,
  public.access_entitlements to authenticated;
grant select on public.banners to anon, authenticated;

revoke insert, update, delete on public.payments from anon, authenticated;
revoke update (role, user_id, email) on public.profiles
  from anon, authenticated;

-- O service role é usado somente nas rotas de servidor (service_role key), mas
-- projetos novos da Supabase não concedem privilégios automáticos a ele nas
-- tabelas criadas por SQL. Sem estes grants toda consulta server-side falha
-- com 42501 (permission denied for table ...), e o app responde 404/500 mesmo
-- com o banco migrado.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
