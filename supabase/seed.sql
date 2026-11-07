-- ════════════════════════════════════════════════════════════════════════
-- Date de test pentru dezvoltare locală (rulate de `npm run db:reset`).
-- O firmă demo: Salonul Ana, cu 3 angajați, 8 servicii, program,
-- 15 întrebări frecvente și un cont de proprietar:
--   demo@salon-ana.test / parola-demo-123
-- NU rulați acest fișier în producție.
-- ════════════════════════════════════════════════════════════════════════

-- ── Contul demo (proprietarul salonului) ────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'demo@salon-ana.test',
  extensions.crypt('parola-demo-123', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}', '{"name": "Ana Demo"}',
  now(), now(), '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(),
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '{"sub": "a0000000-0000-4000-8000-000000000001", "email": "demo@salon-ana.test", "email_verified": true}',
  'email', now(), now(), now()
);

-- ── Firma ───────────────────────────────────────────────────────────────
insert into public.tenants (id, name, slug, vertical, cui, address, timezone, locale, plan)
values (
  'b0000000-0000-4000-8000-000000000001',
  'Salonul Ana', 'salonul-ana', 'salon', 'RO00000000',
  'Str. Exemplului 12, Cluj-Napoca', 'Europe/Bucharest', 'ro', 'pilot'
);

insert into public.members (tenant_id, user_id, role)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'owner');

-- ── Angajații (resurse) ─────────────────────────────────────────────────
insert into public.resources (id, tenant_id, kind, name, booking_mode, capacity, sort_order) values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'staff', 'Ana (coafor)', 'exclusive', 1, 1),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'staff', 'Mihai (frizer)', 'exclusive', 1, 2),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'staff', 'Ioana (manichiură și cosmetică)', 'exclusive', 1, 3);

-- ── Serviciile ──────────────────────────────────────────────────────────
insert into public.services (id, tenant_id, name, description, duration_min, price_type, price, deposit, buffer_after_min, sort_order) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Tuns damă', 'Spălat, tuns și uscat.', 45, 'fixed', 120, 0, 5, 1),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Tuns bărbați', null, 30, 'fixed', 70, 0, 0, 2),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Tuns + barbă', 'Tuns, contur și aranjat barba.', 45, 'fixed', 100, 0, 0, 3),
  ('d0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Vopsit rădăcină', 'Prețul depinde de lungimea părului.', 90, 'from', 180, 0, 10, 4),
  ('d0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'Coafat', null, 40, 'fixed', 90, 0, 0, 5),
  ('d0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'Balayage', 'Include tuns și tratament.', 180, 'from', 450, 100, 15, 6),
  ('d0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'Manichiură semipermanentă', null, 60, 'fixed', 110, 0, 10, 7),
  ('d0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 'Tratament facial', 'Prețul se stabilește după consultație.', 60, 'on_request', null, 0, 10, 8);

-- Cine face ce
insert into public.service_resources (tenant_id, service_id, resource_id) values
  -- Ana: tuns damă, vopsit, coafat, balayage
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001'),
  -- Mihai: tuns bărbați, tuns + barbă, tuns damă
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002'),
  -- Ioana: manichiură, tratament facial, coafat
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000003');

-- ── Programul (ore locale, Europe/Bucharest; 1 = luni) ──────────────────
insert into public.availability_rules (tenant_id, resource_id, weekday, starts_at, ends_at)
select 'b0000000-0000-4000-8000-000000000001', r.resource_id, r.weekday, r.starts_at, r.ends_at
from (values
  -- Ana: luni–vineri 9–17, sâmbătă 9–14
  ('c0000000-0000-4000-8000-000000000001'::uuid, 1, '09:00'::time, '17:00'::time),
  ('c0000000-0000-4000-8000-000000000001', 2, '09:00', '17:00'),
  ('c0000000-0000-4000-8000-000000000001', 3, '09:00', '17:00'),
  ('c0000000-0000-4000-8000-000000000001', 4, '09:00', '17:00'),
  ('c0000000-0000-4000-8000-000000000001', 5, '09:00', '17:00'),
  ('c0000000-0000-4000-8000-000000000001', 6, '09:00', '14:00'),
  -- Mihai: marți–vineri 10–14 și 15–19 (pauză de masă), sâmbătă 9–15
  ('c0000000-0000-4000-8000-000000000002', 2, '10:00', '14:00'),
  ('c0000000-0000-4000-8000-000000000002', 2, '15:00', '19:00'),
  ('c0000000-0000-4000-8000-000000000002', 3, '10:00', '14:00'),
  ('c0000000-0000-4000-8000-000000000002', 3, '15:00', '19:00'),
  ('c0000000-0000-4000-8000-000000000002', 4, '10:00', '14:00'),
  ('c0000000-0000-4000-8000-000000000002', 4, '15:00', '19:00'),
  ('c0000000-0000-4000-8000-000000000002', 5, '10:00', '14:00'),
  ('c0000000-0000-4000-8000-000000000002', 5, '15:00', '19:00'),
  ('c0000000-0000-4000-8000-000000000002', 6, '09:00', '15:00'),
  -- Ioana: luni, miercuri, vineri 11–19, sâmbătă 10–15
  ('c0000000-0000-4000-8000-000000000003', 1, '11:00', '19:00'),
  ('c0000000-0000-4000-8000-000000000003', 3, '11:00', '19:00'),
  ('c0000000-0000-4000-8000-000000000003', 5, '11:00', '19:00'),
  ('c0000000-0000-4000-8000-000000000003', 6, '10:00', '15:00')
) as r(resource_id, weekday, starts_at, ends_at);

-- Sărbători (tot salonul) și un concediu
insert into public.availability_exceptions (tenant_id, resource_id, period, kind, note) values
  ('b0000000-0000-4000-8000-000000000001', null,
   tstzrange('2026-12-25 00:00 Europe/Bucharest', '2026-12-27 00:00 Europe/Bucharest'), 'closed', 'Crăciun'),
  ('b0000000-0000-4000-8000-000000000001', null,
   tstzrange('2027-01-01 00:00 Europe/Bucharest', '2027-01-03 00:00 Europe/Bucharest'), 'closed', 'Anul Nou'),
  ('b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   tstzrange('2026-11-23 00:00 Europe/Bucharest', '2026-11-28 00:00 Europe/Bucharest'), 'closed', 'Ana în concediu');

-- ── Regulile de rezervare și agentul ────────────────────────────────────
insert into public.booking_rules (tenant_id, min_notice_min, max_advance_days, cancellation_policy, cancellation_notice_hours, confirmation_mode, required_fields, max_group_size)
values (
  'b0000000-0000-4000-8000-000000000001', 120, 60,
  'Anularea e gratuită cu cel puțin 24 de ore înainte. La anulări mai târzii, avansul se reține.',
  24, 'auto', '["nume", "telefon"]', 3
);

insert into public.agent_settings (tenant_id, agent_name, tone, address_form, greeting, extra_instructions, forbidden, handoff_rules, handoff_phone, human_hours, email_signature)
values (
  'b0000000-0000-4000-8000-000000000001',
  'Clara', 'friendly', 'dumneavoastra',
  'Bună ziua!',
  'Dacă clientul nu știe ce serviciu vrea, întreabă cât de lung e părul și ce rezultat își dorește.',
  'Nu dă sfaturi medicale sau dermatologice. Nu promite reduceri și nu negociază prețul.',
  'Predă la om cererile pentru evenimente, plângerile și orice întrebare despre alergii.',
  '+40700000001',
  'luni–vineri, 9:00–17:00',
  'Clara, asistentul virtual al Salonului Ana'
);

-- ── Canale ──────────────────────────────────────────────────────────────
insert into public.channels (tenant_id, type, address, status) values
  ('b0000000-0000-4000-8000-000000000001', 'email', 'salonul-ana@inbox.centrala.test', 'active'),
  ('b0000000-0000-4000-8000-000000000001', 'whatsapp', '+40700000002', 'pending');

-- ── Întrebările frecvente (fără prețuri și program: acelea vin din date) ──
insert into public.faq_items (tenant_id, question, answer, sort_order)
select 'b0000000-0000-4000-8000-000000000001', q, a, n
from (values
  (1, 'Aveți parcare?', 'Da, avem trei locuri în curtea din spate, gratuite pentru clienți. Intrarea e prin stânga clădirii.'),
  (2, 'Se poate plăti cu cardul?', 'Da, primim card, numerar și plată cu telefonul.'),
  (3, 'Ce se întâmplă dacă întârzii?', 'Vă așteptăm 15 minute. După aceea s-ar putea să scurtăm serviciul sau să mutăm programarea, ca să nu întârziem următorul client.'),
  (4, 'Pot veni cu copilul?', 'Da, copiii sunt bineveniți. Avem un colț cu cărți și creioane colorate.'),
  (5, 'Se poate intra cu câinele?', 'Da, câinii mici și liniștiți sunt bineveniți, în lesă.'),
  (6, 'Ce vopsea folosiți?', 'Lucrăm cu vopsele profesionale fără amoniac. Coloristul alege nuanța împreună cu dumneavoastră la programare.'),
  (7, 'Faceți test de alergie înainte de vopsit?', 'Da. Dacă vopsiți părul la noi prima dată, vă rugăm să treceți cu 48 de ore înainte pentru un test scurt, gratuit.'),
  (8, 'Vindeți vouchere cadou?', 'Da, pe orice sumă sau pe un serviciu anume. Le puteți cumpăra de la salon.'),
  (9, 'Trebuie să vin cu părul spălat?', 'Nu e nevoie. Spălatul e inclus la tuns și la vopsit.'),
  (10, 'Pot cere un anumit coafor?', 'Sigur. Spuneți-ne cu cine doriți să lucrați și căutăm o oră liberă la persoana respectivă.'),
  (11, 'Faceți coafuri pentru nunți sau la domiciliu?', 'Pentru evenimente stabilim totul direct cu Ana. Vă notăm datele și vă sună ea.'),
  (12, 'Vindeți produsele pe care le folosiți?', 'Da, șampoanele și tratamentele pe care le folosim sunt de vânzare la recepție.'),
  (13, 'Cum ajung cu transportul în comun?', 'Stația „Piața Mihai Viteazu” e la 3 minute de mers pe jos, cu liniile 9, 25 și 30.'),
  (14, 'Ce fac dacă nu-mi place rezultatul?', 'Spuneți-ne în cel mult 7 zile și refacem gratuit ce nu v-a plăcut.'),
  (15, 'Salonul este accesibil cu scaun cu rotile?', 'Da, intrarea e la nivelul străzii și avem o toaletă accesibilă.')
) as f(n, q, a);

-- ── Câțiva clienți și rezervări (relative la ziua de azi) ───────────────
insert into public.customers (id, tenant_id, name, phone, email) values
  ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Andrei M.', '+40722000001', null),
  ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Maria P.', '+40722000002', 'maria@example.test');

insert into public.bookings (tenant_id, service_id, resource_id, customer_id, period, status, channel)
values
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000001',
   tstzrange(((current_date + 3) + time '15:30') at time zone 'Europe/Bucharest',
             ((current_date + 3) + time '16:15') at time zone 'Europe/Bucharest'),
   'confirmed', 'whatsapp'),
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   tstzrange(((current_date + 4) + time '10:00') at time zone 'Europe/Bucharest',
             ((current_date + 4) + time '10:45') at time zone 'Europe/Bucharest'),
   'confirmed', 'phone');
