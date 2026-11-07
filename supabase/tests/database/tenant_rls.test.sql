-- Paznicul regulii multi-tenant. Rulează cu: npm run db:test
-- Pică dacă un tabel nou din `public` nu are tenant_id sau RLS.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- ── 1. Structura: regula se aplică fiecărui tabel ──────────────────────

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname <> 'tenants'
      and not exists (
        select 1
        from information_schema.columns col
        where col.table_schema = 'public'
          and col.table_name = c.relname
          and col.column_name = 'tenant_id'
          and col.is_nullable = 'NO'
      )
  $$,
  'Orice tabel din public (în afară de tenants) are tenant_id NOT NULL'
);

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id'
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not exists (
        select 1
        from pg_constraint k
        where k.conrelid = c.oid
          and k.contype = 'f'
          and k.confrelid = 'public.tenants'::regclass
          and k.conkey = array[a.attnum]
      )
  $$,
  'Orice tenant_id are cheie străină către public.tenants'
);

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'Orice tabel din public are RLS activat'
);

-- ── 2. Comportamentul: o firmă nu vede datele alteia ───────────────────

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-8000-00000000000a', 'ana@salon.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000000b', 'bogdan@service.test', 'authenticated', 'authenticated');

insert into public.tenants (id, name)
values
  ('10000000-0000-4000-8000-00000000000a', 'Salon Ana'),
  ('10000000-0000-4000-8000-00000000000b', 'Service Bogdan');

insert into public.members (tenant_id, user_id, role)
values
  ('10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a', 'owner'),
  ('10000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000b', 'owner');

-- Ana, autentificată
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

select results_eq(
  'select name from public.tenants',
  array['Salon Ana'],
  'Ana vede doar firma ei'
);

select is_empty(
  $$ select 1 from public.members where tenant_id = '10000000-0000-4000-8000-00000000000b' $$,
  'Ana nu vede membrii altei firme'
);

select throws_ok(
  $$
    insert into public.members (tenant_id, user_id, role)
    values ('10000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000a', 'owner')
  $$,
  '42501',
  null,
  'Ana nu se poate adăuga singură în altă firmă'
);

select * from finish();
rollback;
