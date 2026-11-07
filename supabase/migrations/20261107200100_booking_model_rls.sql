-- ════════════════════════════════════════════════════════════════════════
-- RLS pentru modelul de rezervări: un utilizator vede și modifică doar
-- rândurile firmelor la care e membru.
--
--   date operaționale (servicii, program, clienți, rezervări, conversații…):
--     membrii citesc, adaugă și modifică; doar proprietarul șterge;
--   setări (reguli de rezervare, agent, canale): membrii citesc, doar
--     proprietarul le schimbă;
--   consum (usage_events): membrii citesc; scrie doar backend-ul
--     (service_role ocolește RLS).
--
-- Tiparul `tenant_id in (select private.member_tenant_ids())` calculează o
-- singură dată pe interogare lista firmelor utilizatorului (initPlan), în loc
-- să verifice apartenența rând cu rând.
-- ════════════════════════════════════════════════════════════════════════

create or replace function private.member_tenant_ids(p_roles public.member_role[] default null)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.tenant_id
  from public.members m
  where m.user_id = (select auth.uid())
    and (p_roles is null or m.role = any (p_roles));
$$;

revoke all on function private.member_tenant_ids(public.member_role[]) from public;
grant execute on function private.member_tenant_ids(public.member_role[]) to authenticated, service_role;


-- ── resources ──
alter table public.resources enable row level security;
create policy "resources: membrii citesc" on public.resources
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "resources: membrii adaugă" on public.resources
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids()));
create policy "resources: membrii modifică" on public.resources
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids()))
  with check (tenant_id in (select private.member_tenant_ids()));
create policy "resources: proprietarul șterge" on public.resources
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── services ──
alter table public.services enable row level security;
create policy "services: membrii citesc" on public.services
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "services: membrii adaugă" on public.services
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids()));
create policy "services: membrii modifică" on public.services
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids()))
  with check (tenant_id in (select private.member_tenant_ids()));
create policy "services: proprietarul șterge" on public.services
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── service_resources ──
alter table public.service_resources enable row level security;
create policy "service_resources: membrii citesc" on public.service_resources
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "service_resources: membrii adaugă" on public.service_resources
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids()));
create policy "service_resources: membrii modifică" on public.service_resources
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids()))
  with check (tenant_id in (select private.member_tenant_ids()));
create policy "service_resources: proprietarul șterge" on public.service_resources
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── availability_rules ──
alter table public.availability_rules enable row level security;
create policy "availability_rules: membrii citesc" on public.availability_rules
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "availability_rules: membrii adaugă" on public.availability_rules
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids()));
create policy "availability_rules: membrii modifică" on public.availability_rules
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids()))
  with check (tenant_id in (select private.member_tenant_ids()));
create policy "availability_rules: proprietarul șterge" on public.availability_rules
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── availability_exceptions ──
alter table public.availability_exceptions enable row level security;
create policy "availability_exceptions: membrii citesc" on public.availability_exceptions
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "availability_exceptions: membrii adaugă" on public.availability_exceptions
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids()));
create policy "availability_exceptions: membrii modifică" on public.availability_exceptions
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids()))
  with check (tenant_id in (select private.member_tenant_ids()));
create policy "availability_exceptions: proprietarul șterge" on public.availability_exceptions
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── customers ──
alter table public.customers enable row level security;
create policy "customers: membrii citesc" on public.customers
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "customers: membrii adaugă" on public.customers
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids()));
create policy "customers: membrii modifică" on public.customers
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids()))
  with check (tenant_id in (select private.member_tenant_ids()));
create policy "customers: proprietarul șterge" on public.customers
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── conversations ──
alter table public.conversations enable row level security;
create policy "conversations: membrii citesc" on public.conversations
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "conversations: membrii adaugă" on public.conversations
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids()));
create policy "conversations: membrii modifică" on public.conversations
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids()))
  with check (tenant_id in (select private.member_tenant_ids()));
create policy "conversations: proprietarul șterge" on public.conversations
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── messages ──
alter table public.messages enable row level security;
create policy "messages: membrii citesc" on public.messages
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "messages: membrii adaugă" on public.messages
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids()));
create policy "messages: membrii modifică" on public.messages
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids()))
  with check (tenant_id in (select private.member_tenant_ids()));
create policy "messages: proprietarul șterge" on public.messages
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── bookings ──
alter table public.bookings enable row level security;
create policy "bookings: membrii citesc" on public.bookings
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "bookings: membrii adaugă" on public.bookings
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids()));
create policy "bookings: membrii modifică" on public.bookings
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids()))
  with check (tenant_id in (select private.member_tenant_ids()));
create policy "bookings: proprietarul șterge" on public.bookings
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── handoffs ──
alter table public.handoffs enable row level security;
create policy "handoffs: membrii citesc" on public.handoffs
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "handoffs: membrii adaugă" on public.handoffs
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids()));
create policy "handoffs: membrii modifică" on public.handoffs
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids()))
  with check (tenant_id in (select private.member_tenant_ids()));
create policy "handoffs: proprietarul șterge" on public.handoffs
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── faq_items ──
alter table public.faq_items enable row level security;
create policy "faq_items: membrii citesc" on public.faq_items
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "faq_items: membrii adaugă" on public.faq_items
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids()));
create policy "faq_items: membrii modifică" on public.faq_items
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids()))
  with check (tenant_id in (select private.member_tenant_ids()));
create policy "faq_items: proprietarul șterge" on public.faq_items
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── booking_rules ──
alter table public.booking_rules enable row level security;
create policy "booking_rules: membrii citesc" on public.booking_rules
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "booking_rules: proprietarul adaugă" on public.booking_rules
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));
create policy "booking_rules: proprietarul modifică" on public.booking_rules
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])))
  with check (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));
create policy "booking_rules: proprietarul șterge" on public.booking_rules
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── agent_settings ──
alter table public.agent_settings enable row level security;
create policy "agent_settings: membrii citesc" on public.agent_settings
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "agent_settings: proprietarul adaugă" on public.agent_settings
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));
create policy "agent_settings: proprietarul modifică" on public.agent_settings
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])))
  with check (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));
create policy "agent_settings: proprietarul șterge" on public.agent_settings
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── channels ──
alter table public.channels enable row level security;
create policy "channels: membrii citesc" on public.channels
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));
create policy "channels: proprietarul adaugă" on public.channels
  for insert to authenticated with check (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));
create policy "channels: proprietarul modifică" on public.channels
  for update to authenticated
  using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])))
  with check (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));
create policy "channels: proprietarul șterge" on public.channels
  for delete to authenticated using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));

-- ── usage_events ──
alter table public.usage_events enable row level security;
create policy "usage_events: membrii citesc" on public.usage_events
  for select to authenticated using (tenant_id in (select private.member_tenant_ids()));

-- Vizitatorii neautentificați nu au acces la datele firmelor.
revoke all on all tables in schema public from anon;

