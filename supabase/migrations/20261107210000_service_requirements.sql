-- ════════════════════════════════════════════════════════════════════════
-- Servicii care cer mai multe resurse deodată (de exemplu un medic ȘI un
-- cabinet, sau un instructor ȘI o mașină).
--
-- service_resources.requirement grupează resursele:
--   - același număr = alternative (Ana SAU Mihai);
--   - numere diferite = toate sunt necesare (un angajat ȘI o cameră).
-- Un serviciu cu un singur grup (cazul obișnuit) nu se schimbă: totul e 1.
-- ════════════════════════════════════════════════════════════════════════

alter table public.service_resources
  add column requirement smallint not null default 1 check (requirement between 1 and 9);

comment on column public.service_resources.requirement is
  'Grupul de cerință: resursele cu același număr sunt alternative; serviciul cere câte una din fiecare grup.';

-- Intervalul unei rezervări include pauza de după serviciu, ca și pauza să fie
-- apărată de constrângerea bookings_no_overlap. Ora de final afișată
-- clientului este lower(period) + services.duration_min.
comment on column public.bookings.period is
  'Intervalul în care resursa e ocupată: durata serviciului plus pauza de după (buffer_after_min).';
