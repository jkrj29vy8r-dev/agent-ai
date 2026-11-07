-- Rezervările nu se suprapun, iar hold-ul expiră după 10 minute.
-- Rulează cu: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- ── Pregătire ───────────────────────────────────────────────────────────
insert into auth.users (id, email, aud, role)
values ('33333333-0000-4000-8000-00000000000a', 'ana@test.local', 'authenticated', 'authenticated');

insert into public.tenants (id, name) values ('44444444-0000-4000-8000-000000000001', 'Salon Test');
insert into public.members (tenant_id, user_id, role)
values ('44444444-0000-4000-8000-000000000001', '33333333-0000-4000-8000-00000000000a', 'owner');

insert into public.resources (id, tenant_id, kind, name, booking_mode, capacity) values
  ('55555555-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000001', 'staff', 'Ana', 'exclusive', 1),
  ('55555555-0000-4000-8000-000000000002', '44444444-0000-4000-8000-000000000001', 'staff', 'Mihai', 'exclusive', 1),
  ('55555555-0000-4000-8000-000000000003', '44444444-0000-4000-8000-000000000001', 'vehicle', 'Microbuz', 'shared', 3);

insert into public.services (id, tenant_id, name, duration_min, price)
values ('66666666-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000001', 'Tuns', 60, 100);

-- Scurtătură pentru o rezervare: resursă, interval, status, locuri.
create function pg_temp.book(p_resource int, p_from text, p_to text, p_status text default 'confirmed', p_seats int default 1)
returns uuid language sql as $$
  insert into public.bookings (tenant_id, service_id, resource_id, period, status, seats)
  values (
    '44444444-0000-4000-8000-000000000001',
    '66666666-0000-4000-8000-000000000001',
    ('55555555-0000-4000-8000-00000000000' || p_resource)::uuid,
    tstzrange(('2030-01-07 ' || p_from || '+02')::timestamptz, ('2030-01-07 ' || p_to || '+02')::timestamptz),
    p_status::public.booking_status,
    p_seats
  )
  returning id;
$$;

-- Hold-urile nu pot expira în timpul unei tranzacții (now() e fix), așa că
-- „trecerea timpului” se simulează mutând expirarea în trecut, cu triggerul
-- oprit doar pentru această operație.
create function pg_temp.age_hold(p_id uuid) returns void language plpgsql as $$
begin
  alter table public.bookings disable trigger bookings_before_write;
  update public.bookings set hold_expires_at = now() - interval '1 minute' where id = p_id;
  alter table public.bookings enable trigger bookings_before_write;
end;
$$;

-- ── Suprapuneri pe o resursă exclusivă (Ana) ────────────────────────────
select lives_ok($$ select pg_temp.book(1, '10:00', '11:00') $$, 'Prima rezervare 10:00–11:00 intră');

select throws_ok($$ select pg_temp.book(1, '10:30', '11:30') $$, '23P01', null,
  'O rezervare confirmată care se suprapune e refuzată');
select throws_ok($$ select pg_temp.book(1, '09:30', '10:15', 'hold') $$, '23P01', null,
  'Nici un hold nu poate ține un loc deja ocupat');
select throws_ok($$ select pg_temp.book(1, '10:59', '11:30', 'pending') $$, '23P01', null,
  'Nici o rezervare care așteaptă confirmarea firmei');
select throws_ok($$ select pg_temp.book(1, '09:00', '12:00') $$, '23P01', null,
  'Nici una care o cuprinde complet');

select lives_ok($$ select pg_temp.book(1, '11:00', '12:00') $$, 'Rezervarea lipită (11:00–12:00) intră: intervalele sunt [început, sfârșit)');
select lives_ok($$ select pg_temp.book(2, '10:00', '11:00') $$, 'Aceeași oră la alt angajat (Mihai) intră');

update public.bookings set status = 'cancelled'
where resource_id = '55555555-0000-4000-8000-000000000001' and lower(period) = '2030-01-07 10:00+02';
select lives_ok($$ select pg_temp.book(1, '10:00', '11:00') $$, 'După anulare, locul se poate rezerva din nou');

-- ── Hold-ul de 10 minute ────────────────────────────────────────────────
select set_config('test.hold', pg_temp.book(1, '14:00', '15:00', 'hold')::text, true);

select is(
  (select hold_expires_at from public.bookings where id = current_setting('test.hold')::uuid),
  now() + interval '10 minutes',
  'Un hold expiră la 10 minute după ce a fost pus'
);

update public.bookings set hold_expires_at = now() + interval '1 day' where id = current_setting('test.hold')::uuid;
select is(
  (select hold_expires_at from public.bookings where id = current_setting('test.hold')::uuid),
  now() + interval '10 minutes',
  'Expirarea nu se poate prelungi din aplicație'
);

select throws_ok($$ select pg_temp.book(1, '14:30', '15:30') $$, '23P01', null,
  'Cât hold-ul e valabil, ora rămâne ținută');

select pg_temp.age_hold(current_setting('test.hold')::uuid);
select lives_ok($$ select pg_temp.book(1, '14:30', '15:30') $$,
  'După 10 minute, hold-ul nu mai blochează ora');
select is(
  (select status::text from public.bookings where id = current_setting('test.hold')::uuid),
  'expired',
  'Hold-ul expirat e marcat „expired” când altcineva ia ora'
);

select set_config('test.hold2', pg_temp.book(1, '16:00', '17:00', 'hold')::text, true);
select pg_temp.age_hold(current_setting('test.hold2')::uuid);
select throws_ok(
  $$ update public.bookings set status = 'confirmed' where id = current_setting('test.hold2')::uuid $$,
  '23P01', null,
  'Un hold expirat nu mai poate fi confirmat'
);

select set_config('test.hold3', pg_temp.book(2, '16:00', '17:00', 'hold')::text, true);
select lives_ok(
  $$ update public.bookings set status = 'confirmed' where id = current_setting('test.hold3')::uuid $$,
  'Un hold valabil se confirmă'
);
select is(
  (select hold_expires_at from public.bookings where id = current_setting('test.hold3')::uuid),
  null,
  'După confirmare, rezervarea nu mai are expirare'
);

select set_config('test.hold4', pg_temp.book(2, '18:00', '19:00', 'hold')::text, true);
select pg_temp.age_hold(current_setting('test.hold4')::uuid);
select ok(private.expire_holds() >= 1, 'Jobul periodic marchează hold-urile expirate');

-- ── Ocolirea regulilor ──────────────────────────────────────────────────
update public.bookings set exclusive = false
where resource_id = '55555555-0000-4000-8000-000000000001' and status = 'confirmed';
select throws_ok($$ select pg_temp.book(1, '10:15', '10:45') $$, '23P01', null,
  'Rezervarea nu devine „neexclusivă” dacă cineva schimbă coloana direct');

-- ── Resursă cu locuri (microbuz cu 3 locuri) ────────────────────────────
select lives_ok($$ select pg_temp.book(3, '08:00', '12:00', 'confirmed', 2) $$, 'Două locuri în microbuz');
select lives_ok($$ select pg_temp.book(3, '08:00', '12:00', 'hold', 1) $$, 'Al treilea loc, ținut');
select throws_ok($$ select pg_temp.book(3, '08:00', '12:00', 'confirmed', 1) $$, '23P01', null,
  'Al patrulea loc e refuzat: microbuzul e plin');

-- ── Și ca utilizator autentificat (cu RLS) ──────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub": "33333333-0000-4000-8000-00000000000a", "role": "authenticated"}';
select throws_ok($$ select pg_temp.book(2, '10:30', '11:00') $$, '23P01', null,
  'Și din aplicație, suprapunerea e refuzată de baza de date');

select * from finish();
rollback;
