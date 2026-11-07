-- ════════════════════════════════════════════════════════════════════════
-- Fundația multi-tenant: firmele (tenants), membrii lor și funcțiile pe care
-- se sprijină TOATE regulile RLS din proiect.
--
-- Regula proiectului: orice tabel din `public` are `tenant_id` + RLS.
-- Singura excepție e `tenants`, unde `id` ESTE tenant_id-ul.
-- ════════════════════════════════════════════════════════════════════════

-- Schema `private` nu e expusă prin API-ul REST; ține funcțiile ajutătoare.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ── Tipuri ──────────────────────────────────────────────────────────────
create type public.member_role as enum ('owner', 'staff');

-- ── updated_at automat ──────────────────────────────────────────────────
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── tenants: firma-client ───────────────────────────────────────────────
create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 200),
  slug        text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  vertical    text,                                    -- domeniul (șablonul)
  cui         text,
  address     text,
  timezone    text not null default 'Europe/Bucharest',
  locale      text not null default 'ro',
  plan        text not null default 'trial',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function private.set_updated_at();

-- ── members: utilizatorii unei firme ────────────────────────────────────
create table public.members (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.member_role not null default 'staff',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index members_tenant_id_idx on public.members (tenant_id);
create index members_user_id_idx on public.members (user_id);

create trigger members_set_updated_at
  before update on public.members
  for each row execute function private.set_updated_at();

-- ── Funcțiile folosite în politicile RLS ───────────────────────────────
-- SECURITY DEFINER ca să citească `members` fără să declanșeze recursiv
-- politicile lui `members`. `search_path = ''` + nume complet calificate.

create or replace function private.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.tenant_id = p_tenant_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_tenant_role(
  p_tenant_id uuid,
  p_roles public.member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.tenant_id = p_tenant_id
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

revoke all on function private.is_tenant_member(uuid) from public;
revoke all on function private.has_tenant_role(uuid, public.member_role[]) from public;
grant execute on function private.is_tenant_member(uuid) to authenticated, service_role;
grant execute on function private.has_tenant_role(uuid, public.member_role[]) to authenticated, service_role;

-- ── RLS: tenants ────────────────────────────────────────────────────────
alter table public.tenants enable row level security;

create policy "tenants: membrii își văd firma"
  on public.tenants for select to authenticated
  using ((select private.is_tenant_member(id)));

create policy "tenants: proprietarul modifică firma"
  on public.tenants for update to authenticated
  using ((select private.has_tenant_role(id, array['owner']::public.member_role[])))
  with check ((select private.has_tenant_role(id, array['owner']::public.member_role[])));

-- Fără politică de insert/delete: firmele se creează doar prin
-- public.create_tenant() și se șterg doar din backend.

-- ── RLS: members ────────────────────────────────────────────────────────
alter table public.members enable row level security;

create policy "members: membrii își văd colegii"
  on public.members for select to authenticated
  using ((select private.is_tenant_member(tenant_id)));

create policy "members: proprietarul adaugă membri"
  on public.members for insert to authenticated
  with check ((select private.has_tenant_role(tenant_id, array['owner']::public.member_role[])));

create policy "members: proprietarul modifică membri"
  on public.members for update to authenticated
  using ((select private.has_tenant_role(tenant_id, array['owner']::public.member_role[])))
  with check ((select private.has_tenant_role(tenant_id, array['owner']::public.member_role[])));

create policy "members: proprietarul scoate membri"
  on public.members for delete to authenticated
  using ((select private.has_tenant_role(tenant_id, array['owner']::public.member_role[])));

-- ── RPC: creează o firmă și îl face pe utilizator proprietar ───────────
create or replace function public.create_tenant(p_name text, p_vertical text default null)
returns public.tenants
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_tenant  public.tenants;
begin
  if v_user_id is null then
    raise exception 'Trebuie să fii autentificat ca să creezi o firmă.'
      using errcode = '28000';
  end if;

  insert into public.tenants (name, vertical)
  values (p_name, p_vertical)
  returning * into v_tenant;

  insert into public.members (tenant_id, user_id, role)
  values (v_tenant.id, v_user_id, 'owner');

  return v_tenant;
end;
$$;

revoke all on function public.create_tenant(text, text) from public, anon;
grant execute on function public.create_tenant(text, text) to authenticated;
