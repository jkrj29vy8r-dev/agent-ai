-- Izolarea între firme: un utilizator vede și modifică doar datele firmelor
-- la care e membru. Rulează cu: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;

select plan(47);

-- ── Pregătire (ca postgres, fără RLS) ───────────────────────────────────
insert into auth.users (id, email, aud, role) values
  ('22222222-0000-4000-8000-00000000000a', 'ana@test.local', 'authenticated', 'authenticated'),
  ('22222222-0000-4000-8000-00000000000b', 'bogdan@test.local', 'authenticated', 'authenticated'),
  ('22222222-0000-4000-8000-00000000005a', 'stefan@test.local', 'authenticated', 'authenticated');

insert into public.tenants (id, name) values ('11111111-0000-4000-8000-00000000000a', 'Firma A'), ('11111111-0000-4000-8000-00000000000b', 'Firma B');
insert into public.members (tenant_id, user_id, role) values
  ('11111111-0000-4000-8000-00000000000a', '22222222-0000-4000-8000-00000000000a', 'owner'),
  ('11111111-0000-4000-8000-00000000000b', '22222222-0000-4000-8000-00000000000b', 'owner'),
  ('11111111-0000-4000-8000-00000000000a', '22222222-0000-4000-8000-00000000005a', 'staff');

-- Câte un rând în fiecare tabel, pentru fiecare firmă.
create function pg_temp.fill(p_tenant uuid, p_owner uuid, p_n int) returns void language plpgsql as $$
declare
  v_resource uuid; v_service uuid; v_customer uuid; v_channel uuid; v_conversation uuid;
begin
  insert into public.resources (tenant_id, kind, name) values (p_tenant, 'staff', 'Angajat ' || p_n) returning id into v_resource;
  insert into public.services (tenant_id, name, duration_min, price) values (p_tenant, 'Serviciu ' || p_n, 30, 100) returning id into v_service;
  insert into public.service_resources (tenant_id, service_id, resource_id) values (p_tenant, v_service, v_resource);
  insert into public.availability_rules (tenant_id, resource_id, weekday, starts_at, ends_at) values (p_tenant, v_resource, 1, '09:00', '17:00');
  insert into public.availability_exceptions (tenant_id, resource_id, period) values (p_tenant, v_resource, tstzrange('2030-12-25', '2030-12-26'));
  insert into public.booking_rules (tenant_id) values (p_tenant);
  insert into public.customers (tenant_id, name, phone) values (p_tenant, 'Client ' || p_n, '+4072200000' || p_n) returning id into v_customer;
  insert into public.channels (tenant_id, type, address) values (p_tenant, 'email', 'firma' || p_n || '@test.local') returning id into v_channel;
  insert into public.conversations (tenant_id, channel, channel_id, customer_id) values (p_tenant, 'email', v_channel, v_customer) returning id into v_conversation;
  insert into public.messages (tenant_id, conversation_id, role, content) values (p_tenant, v_conversation, 'customer', 'Bună ziua');
  insert into public.bookings (tenant_id, service_id, resource_id, customer_id, conversation_id, period, status)
    values (p_tenant, v_service, v_resource, v_customer, v_conversation, tstzrange('2030-01-07 10:00+02', '2030-01-07 10:30+02'), 'confirmed');
  insert into public.handoffs (tenant_id, conversation_id, reason) values (p_tenant, v_conversation, 'Întrebare despre alergii');
  insert into public.faq_items (tenant_id, question, answer) values (p_tenant, 'Aveți parcare?', 'Da.');
  insert into public.agent_settings (tenant_id) values (p_tenant);
  insert into public.usage_events (tenant_id, kind, quantity, conversation_id) values (p_tenant, 'ai_input_tokens', 1200, v_conversation);
end;
$$;

select pg_temp.fill('11111111-0000-4000-8000-00000000000a', '22222222-0000-4000-8000-00000000000a', 1);
select pg_temp.fill('11111111-0000-4000-8000-00000000000b', '22222222-0000-4000-8000-00000000000b', 2);

-- ID-ul unei resurse a firmei B, ținut minte înainte să schimbăm utilizatorul.
select set_config('test.b_resource', (select id::text from public.resources where tenant_id = '11111111-0000-4000-8000-00000000000b'), true);

-- ── Ana (proprietara firmei A) ──────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub": "22222222-0000-4000-8000-00000000000a", "role": "authenticated"}';

-- Citire: își vede datele, nu le vede pe ale firmei B
select ok((select count(*) from public.resources where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede resources');
select is((select count(*) from public.resources where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede resources ale firmei B');
select ok((select count(*) from public.services where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede services');
select is((select count(*) from public.services where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede services ale firmei B');
select ok((select count(*) from public.service_resources where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede service_resources');
select is((select count(*) from public.service_resources where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede service_resources ale firmei B');
select ok((select count(*) from public.availability_rules where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede availability_rules');
select is((select count(*) from public.availability_rules where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede availability_rules ale firmei B');
select ok((select count(*) from public.availability_exceptions where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede availability_exceptions');
select is((select count(*) from public.availability_exceptions where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede availability_exceptions ale firmei B');
select ok((select count(*) from public.booking_rules where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede booking_rules');
select is((select count(*) from public.booking_rules where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede booking_rules ale firmei B');
select ok((select count(*) from public.customers where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede customers');
select is((select count(*) from public.customers where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede customers ale firmei B');
select ok((select count(*) from public.channels where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede channels');
select is((select count(*) from public.channels where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede channels ale firmei B');
select ok((select count(*) from public.conversations where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede conversations');
select is((select count(*) from public.conversations where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede conversations ale firmei B');
select ok((select count(*) from public.messages where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede messages');
select is((select count(*) from public.messages where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede messages ale firmei B');
select ok((select count(*) from public.bookings where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede bookings');
select is((select count(*) from public.bookings where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede bookings ale firmei B');
select ok((select count(*) from public.handoffs where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede handoffs');
select is((select count(*) from public.handoffs where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede handoffs ale firmei B');
select ok((select count(*) from public.faq_items where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede faq_items');
select is((select count(*) from public.faq_items where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede faq_items ale firmei B');
select ok((select count(*) from public.agent_settings where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede agent_settings');
select is((select count(*) from public.agent_settings where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede agent_settings ale firmei B');
select ok((select count(*) from public.usage_events where tenant_id = '11111111-0000-4000-8000-00000000000a') > 0, 'Ana își vede usage_events');
select is((select count(*) from public.usage_events where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 0, 'Ana nu vede usage_events ale firmei B');

-- Scriere: nu poate adăuga, modifica sau șterge nimic în firma B
select throws_ok(
  $$ insert into public.faq_items (tenant_id, question) values ('11111111-0000-4000-8000-00000000000b', 'Întrebare străină') $$,
  '42501', null, 'Ana nu poate adăuga întrebări în firma B'
);
select throws_ok(
  $$ insert into public.customers (tenant_id, name, phone) values ('11111111-0000-4000-8000-00000000000b', 'Intrus', '+40722999999') $$,
  '42501', null, 'Ana nu poate adăuga clienți în firma B'
);
select is_empty(
  $$ update public.services set price = 1 where tenant_id = '11111111-0000-4000-8000-00000000000b' returning 1 $$,
  'Ana nu poate modifica serviciile firmei B'
);
select is_empty(
  $$ update public.bookings set status = 'cancelled' where tenant_id = '11111111-0000-4000-8000-00000000000b' returning 1 $$,
  'Ana nu poate anula rezervările firmei B'
);
select is_empty(
  $$ delete from public.customers where tenant_id = '11111111-0000-4000-8000-00000000000b' returning 1 $$,
  'Ana nu poate șterge clienții firmei B'
);
select throws_ok(
  $$ update public.services set tenant_id = '11111111-0000-4000-8000-00000000000b' where tenant_id = '11111111-0000-4000-8000-00000000000a' $$,
  '42501', null, 'Ana nu își poate muta serviciile în firma B'
);

-- Referințe: nu poate lega o rezervare din firma A de resursa firmei B
select throws_ok(
  $$ insert into public.bookings (tenant_id, service_id, resource_id, period, status)
     values (
       '11111111-0000-4000-8000-00000000000a',
       (select id from public.services where tenant_id = '11111111-0000-4000-8000-00000000000a' limit 1),
       current_setting('test.b_resource')::uuid,
       tstzrange('2030-01-08 10:00+02', '2030-01-08 10:30+02'), 'confirmed'
     ) $$,
  '23503', null, 'Ana nu poate folosi resursa firmei B, nici știindu-i ID-ul'
);

-- ── Ștefan (angajat în firma A, nu proprietar) ──────────────────────────
set local request.jwt.claims to '{"sub": "22222222-0000-4000-8000-00000000005a", "role": "authenticated"}';

select ok((select count(*) from public.bookings) > 0, 'Ștefan vede rezervările firmei lui');
select is_empty(
  $$ delete from public.bookings returning 1 $$,
  'Ștefan nu poate șterge rezervări (doar proprietarul)'
);
select is_empty(
  $$ update public.agent_settings set agent_name = 'Altul' returning 1 $$,
  'Ștefan nu poate schimba setările agentului'
);
select throws_ok(
  $$ insert into public.usage_events (tenant_id, kind, quantity) values ('11111111-0000-4000-8000-00000000000a', 'sms', 1) $$,
  '42501', null, 'Nimeni nu scrie consum din aplicație (doar backend-ul)'
);

-- ── Bogdan (firma B) nu vede nimic din firma A ─────────────────────────
set local request.jwt.claims to '{"sub": "22222222-0000-4000-8000-00000000000b", "role": "authenticated"}';
select is((select count(*) from public.bookings where tenant_id = '11111111-0000-4000-8000-00000000000a')::int, 0, 'Bogdan nu vede rezervările firmei A');
select is((select count(*) from public.customers where tenant_id = '11111111-0000-4000-8000-00000000000a')::int, 0, 'Bogdan nu vede clienții firmei A');

-- ── Vizitator neautentificat ────────────────────────────────────────────
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select throws_ok('select * from public.bookings', '42501', null, 'Un vizitator anonim nu are acces la rezervări');

-- ── Datele firmei B au rămas neatinse ───────────────────────────────────
reset role;
select is((select price from public.services where tenant_id = '11111111-0000-4000-8000-00000000000b')::numeric, 100::numeric, 'Prețul firmei B e neschimbat');
select is((select status::text from public.bookings where tenant_id = '11111111-0000-4000-8000-00000000000b'), 'confirmed', 'Rezervarea firmei B e neschimbată');
select is((select count(*) from public.customers where tenant_id = '11111111-0000-4000-8000-00000000000b')::int, 1, 'Clientul firmei B există încă');

select * from finish();
rollback;
