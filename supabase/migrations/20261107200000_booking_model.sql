-- ════════════════════════════════════════════════════════════════════════
-- Modelul de date al rezervărilor (planul, secțiunea „Modelul de date”).
--
-- Reguli aplicate peste tot:
--   - orice tabel are tenant_id → tenants, RLS și index pe tenant_id;
--   - referințele între tabele sunt chei compuse (tenant_id, x_id), deci un
--     rând nu poate arăta niciodată spre datele altei firme;
--   - rezervările active nu se pot suprapune pe aceeași resursă (excludere);
--   - o rezervare ținută (hold) expiră după 10 minute.
-- Politicile RLS sunt în migrația următoare.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists btree_gist with schema extensions;

-- ── Tipuri ──────────────────────────────────────────────────────────────

create type public.channel_type as enum ('phone', 'whatsapp', 'email');
create type public.resource_kind as enum ('staff', 'room', 'table', 'vehicle', 'equipment');
-- exclusive: un singur client odată (un angajat, o masă, o cameră);
-- shared: mai mulți clienți până la capacitate (locuri în autocar, la un curs).
create type public.booking_mode as enum ('exclusive', 'shared');
create type public.price_type as enum ('fixed', 'from', 'on_request');
create type public.availability_exception_kind as enum ('closed', 'open');
create type public.confirmation_mode as enum ('auto', 'manual');
-- hold: ținută 10 minute cât clientul confirmă · pending: așteaptă confirmarea
-- firmei (confirmare manuală) · confirmed · cancelled · no_show · expired.
create type public.booking_status as enum ('hold', 'pending', 'confirmed', 'cancelled', 'no_show', 'expired');
create type public.payment_status as enum ('none', 'pending', 'paid', 'refunded');
create type public.agent_tone as enum ('formal', 'friendly');
create type public.address_form as enum ('tu', 'dumneavoastra');
create type public.channel_status as enum ('pending', 'active', 'paused', 'error');
create type public.conversation_status as enum ('open', 'closed');
create type public.conversation_outcome as enum ('booked', 'rescheduled', 'cancelled', 'answered', 'handoff', 'abandoned', 'spam');
create type public.message_role as enum ('customer', 'agent', 'staff', 'tool', 'system');
create type public.handoff_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.handoff_status as enum ('open', 'claimed', 'resolved');
create type public.usage_kind as enum ('voice_minutes', 'whatsapp_message', 'sms', 'ai_input_tokens', 'ai_output_tokens');

-- Ținta cheilor compuse (tenant_id, id) pentru tabelele existente.
alter table public.members add constraint members_tenant_user_key unique (tenant_id, user_id);

-- ── resources: ce se rezervă ────────────────────────────────────────────
create table public.resources (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  kind          public.resource_kind not null,
  name          text not null check (char_length(name) between 1 and 120),
  booking_mode  public.booking_mode not null default 'exclusive',
  -- exclusive: câte persoane încap (o masă de 4); shared: câte locuri are.
  capacity      integer not null default 1 check (capacity between 1 and 1000),
  active        boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, id)
);

-- ── services: ce se vinde ───────────────────────────────────────────────
create table public.services (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 160),
  description       text,
  duration_min      integer not null check (duration_min between 5 and 1440),
  price_type        public.price_type not null default 'fixed',
  price             numeric(10, 2) check (price >= 0),
  currency          char(3) not null default 'RON',
  deposit           numeric(10, 2) not null default 0 check (deposit >= 0),
  buffer_after_min  integer not null default 0 check (buffer_after_min between 0 and 240),
  active            boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (tenant_id, id),
  -- „la cerere” nu are preț; fix și „de la” au.
  check ((price_type = 'on_request') = (price is null))
);

-- ── service_resources: ce resurse pot face un serviciu ──────────────────
create table public.service_resources (
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  service_id   uuid not null,
  resource_id  uuid not null,
  created_at   timestamptz not null default now(),
  primary key (service_id, resource_id),
  foreign key (tenant_id, service_id) references public.services (tenant_id, id) on delete cascade,
  foreign key (tenant_id, resource_id) references public.resources (tenant_id, id) on delete cascade
);

-- ── availability_rules: programul recurent ──────────────────────────────
-- Orele sunt locale, în fusul orar al firmei (tenants.timezone).
create table public.availability_rules (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  resource_id  uuid not null,
  weekday      smallint not null check (weekday between 1 and 7), -- ISO: 1 = luni
  starts_at    time not null,
  ends_at      time not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (starts_at < ends_at),
  foreign key (tenant_id, resource_id) references public.resources (tenant_id, id) on delete cascade
);

-- ── availability_exceptions: concedii, sărbători, ore extra ────────────
create table public.availability_exceptions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  resource_id  uuid, -- null = toată firma (de exemplu o sărbătoare)
  period       tstzrange not null check (not isempty(period) and lower(period) is not null and upper(period) is not null),
  kind         public.availability_exception_kind not null default 'closed',
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (tenant_id, resource_id) references public.resources (tenant_id, id) on delete cascade
);

-- ── booking_rules: regulile firmei (un rând pe firmă) ───────────────────
create table public.booking_rules (
  tenant_id                  uuid primary key references public.tenants (id) on delete cascade,
  min_notice_min             integer not null default 60 check (min_notice_min between 0 and 10080),
  max_advance_days           integer not null default 60 check (max_advance_days between 1 and 730),
  cancellation_policy        text,
  cancellation_notice_hours  integer not null default 24 check (cancellation_notice_hours between 0 and 720),
  confirmation_mode          public.confirmation_mode not null default 'auto',
  -- ce cere agentul de la client, de exemplu ["nume", "marca mașinii"]
  required_fields            jsonb not null default '["nume", "telefon"]' check (jsonb_typeof(required_fields) = 'array'),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

-- ── customers: clienții finali ──────────────────────────────────────────
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  name        text check (char_length(name) <= 160),
  phone       text check (phone ~ '^\+[1-9][0-9]{6,14}$'), -- E.164
  email       text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, id),
  check (phone is not null or email is not null)
);
create unique index customers_tenant_phone_key on public.customers (tenant_id, phone) where phone is not null;
create unique index customers_tenant_email_key on public.customers (tenant_id, lower(email)) where email is not null;

-- ── channels: canalele conectate ────────────────────────────────────────
create table public.channels (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  type          public.channel_type not null,
  address       text not null, -- numărul (E.164) sau adresa de e-mail
  external_ids  jsonb not null default '{}' check (jsonb_typeof(external_ids) = 'object'),
  status        public.channel_status not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, id)
);
-- Un număr sau o adresă duce la o singură firmă: așa știe backend-ul cui îi
-- aparține un mesaj care intră.
create unique index channels_type_address_key on public.channels (type, lower(address));

-- ── conversations, messages: istoricul ──────────────────────────────────
create table public.conversations (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  channel       public.channel_type not null,
  channel_id    uuid,
  customer_id   uuid,
  external_ref  text, -- ID-ul apelului, firului WhatsApp sau al e-mailului
  status        public.conversation_status not null default 'open',
  summary       text,
  outcome       public.conversation_outcome,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, id),
  check (ended_at is null or ended_at >= started_at),
  foreign key (tenant_id, channel_id) references public.channels (tenant_id, id) on delete set null (channel_id),
  foreign key (tenant_id, customer_id) references public.customers (tenant_id, id) on delete set null (customer_id)
);

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  conversation_id  uuid not null,
  role             public.message_role not null,
  content          text,
  -- fiecare apel de unealtă se salvează, ca să se vadă exact ce a făcut agentul
  tool_name        text,
  tool_input       jsonb,
  tool_output      jsonb,
  created_at       timestamptz not null default now(),
  check (content is not null or tool_name is not null),
  foreign key (tenant_id, conversation_id) references public.conversations (tenant_id, id) on delete cascade
);

-- ── bookings: rezervările ───────────────────────────────────────────────
create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  service_id       uuid not null,
  resource_id      uuid not null,
  customer_id      uuid,
  conversation_id  uuid,
  period           tstzrange not null,
  seats            integer not null default 1 check (seats between 1 and 1000),
  status           public.booking_status not null default 'hold',
  hold_expires_at  timestamptz,
  channel          public.channel_type,
  payment_status   public.payment_status not null default 'none',
  deposit_amount   numeric(10, 2) not null default 0 check (deposit_amount >= 0),
  payment_ref      text,
  notes            text,
  -- Copiat din resources.booking_mode de trigger; nu se scrie din aplicație.
  exclusive        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (tenant_id, id),
  check (not isempty(period) and lower(period) is not null and upper(period) is not null and lower_inc(period) and not upper_inc(period)),
  check ((status = 'hold') = (hold_expires_at is not null)),
  foreign key (tenant_id, service_id) references public.services (tenant_id, id) on delete restrict,
  foreign key (tenant_id, resource_id) references public.resources (tenant_id, id) on delete restrict,
  foreign key (tenant_id, customer_id) references public.customers (tenant_id, id) on delete set null (customer_id),
  foreign key (tenant_id, conversation_id) references public.conversations (tenant_id, id) on delete set null (conversation_id),

  -- Nicio suprapunere pe aceeași resursă între rezervările care țin locul.
  -- Intervalele sunt [început, sfârșit), deci 10:00–11:00 și 11:00–12:00 nu
  -- se suprapun. Resursele „shared” se verifică pe capacitate, în trigger.
  constraint bookings_no_overlap exclude using gist (
    resource_id with =,
    period with &&
  ) where (status in ('hold', 'pending', 'confirmed') and exclusive)
);

-- ── handoffs: cazurile predate la om ────────────────────────────────────
create table public.handoffs (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  conversation_id  uuid,
  reason           text not null,
  priority         public.handoff_priority not null default 'normal',
  status           public.handoff_status not null default 'open',
  claimed_by       uuid,
  claimed_at       timestamptz,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((status = 'open') = (claimed_by is null) or status = 'resolved'),
  foreign key (tenant_id, conversation_id) references public.conversations (tenant_id, id) on delete set null (conversation_id),
  -- doar un membru al firmei poate prelua un caz
  foreign key (tenant_id, claimed_by) references public.members (tenant_id, user_id) on delete set null (claimed_by)
);

-- ── faq_items: întrebările frecvente ────────────────────────────────────
-- Prețurile și programul NU stau aici: vin din services și availability_*.
create table public.faq_items (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  question    text not null check (char_length(question) between 3 and 500),
  answer      text check (char_length(answer) <= 4000),
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── agent_settings: personalitatea agentului (un rând pe firmă) ─────────
create table public.agent_settings (
  tenant_id           uuid primary key references public.tenants (id) on delete cascade,
  agent_name          text not null default 'asistentul virtual' check (char_length(agent_name) between 1 and 60),
  tone                public.agent_tone not null default 'friendly',
  address_form        public.address_form not null default 'dumneavoastra',
  greeting            text,
  extra_instructions  text,
  forbidden           text, -- ce nu are voie să spună sau să promită
  handoff_rules       text,
  handoff_phone       text check (handoff_phone ~ '^\+[1-9][0-9]{6,14}$'),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── usage_events: consumul (scris doar de backend) ──────────────────────
create table public.usage_events (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  kind             public.usage_kind not null,
  quantity         numeric(14, 4) not null check (quantity >= 0),
  conversation_id  uuid,
  metadata         jsonb not null default '{}',
  occurred_at      timestamptz not null default now(),
  foreign key (tenant_id, conversation_id) references public.conversations (tenant_id, id) on delete set null (conversation_id)
);

-- ── Indexuri ────────────────────────────────────────────────────────────
create index resources_tenant_id_idx on public.resources (tenant_id);
create index services_tenant_id_idx on public.services (tenant_id);
create index service_resources_tenant_id_idx on public.service_resources (tenant_id);
create index service_resources_resource_id_idx on public.service_resources (resource_id);
create index availability_rules_tenant_id_idx on public.availability_rules (tenant_id);
create index availability_rules_resource_idx on public.availability_rules (resource_id, weekday);
create index availability_exceptions_tenant_id_idx on public.availability_exceptions (tenant_id);
create index availability_exceptions_period_idx on public.availability_exceptions using gist (tenant_id, period);
create index customers_tenant_id_idx on public.customers (tenant_id);
create index channels_tenant_id_idx on public.channels (tenant_id);
create index conversations_tenant_id_idx on public.conversations (tenant_id, started_at desc);
create index conversations_customer_id_idx on public.conversations (customer_id);
create index messages_tenant_id_idx on public.messages (tenant_id);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index bookings_tenant_id_idx on public.bookings (tenant_id);
create index bookings_tenant_period_idx on public.bookings using gist (tenant_id, period);
create index bookings_customer_id_idx on public.bookings (customer_id);
create index bookings_service_id_idx on public.bookings (service_id);
create index bookings_hold_expiry_idx on public.bookings (hold_expires_at) where status = 'hold';
create index handoffs_tenant_id_idx on public.handoffs (tenant_id, status);
create index handoffs_conversation_id_idx on public.handoffs (conversation_id);
create index faq_items_tenant_id_idx on public.faq_items (tenant_id);
create index usage_events_tenant_id_idx on public.usage_events (tenant_id, occurred_at);
create index usage_events_conversation_id_idx on public.usage_events (conversation_id);

-- ── updated_at automat ──────────────────────────────────────────────────
create trigger resources_set_updated_at before update on public.resources for each row execute function private.set_updated_at();
create trigger services_set_updated_at before update on public.services for each row execute function private.set_updated_at();
create trigger availability_rules_set_updated_at before update on public.availability_rules for each row execute function private.set_updated_at();
create trigger availability_exceptions_set_updated_at before update on public.availability_exceptions for each row execute function private.set_updated_at();
create trigger booking_rules_set_updated_at before update on public.booking_rules for each row execute function private.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function private.set_updated_at();
create trigger channels_set_updated_at before update on public.channels for each row execute function private.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations for each row execute function private.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings for each row execute function private.set_updated_at();
create trigger handoffs_set_updated_at before update on public.handoffs for each row execute function private.set_updated_at();
create trigger faq_items_set_updated_at before update on public.faq_items for each row execute function private.set_updated_at();
create trigger agent_settings_set_updated_at before update on public.agent_settings for each row execute function private.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- Hold-ul de 10 minute și capacitatea
-- ════════════════════════════════════════════════════════════════════════

-- Cât ține agentul un slot cât clientul confirmă.
create or replace function private.hold_duration()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '10 minutes' $$;

-- Statusurile care țin locul ocupat.
create or replace function private.is_blocking(p_status public.booking_status)
returns boolean
language sql
immutable
set search_path = ''
as $$ select p_status in ('hold', 'pending', 'confirmed') $$;

/*
  Rulează înainte de fiecare scriere în bookings:
  1. hold-ul primește mereu expirarea de acum + 10 minute (nu se poate alege
     și nu se poate prelungi);
  2. un hold expirat nu mai poate fi confirmat;
  3. hold-urile expirate care se suprapun cu rezervarea nouă sunt marcate
     „expired”, ca să nu blocheze locul până trece jobul periodic;
  4. resursele „shared” nu se pot umple peste capacitate; resursele
     „exclusive” nu primesc mai multe persoane decât încap.
  Rândul resursei e blocat (FOR UPDATE), deci două rezervări simultane pe
  aceeași resursă se verifică una după alta.
*/
create or replace function private.bookings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resource public.resources;
  v_used integer;
begin
  -- 1–2. Expirarea hold-ului
  if new.status = 'hold' then
    if tg_op = 'INSERT' or old.status is distinct from 'hold' then
      new.hold_expires_at := now() + private.hold_duration();
    else
      new.hold_expires_at := old.hold_expires_at; -- nu se prelungește
    end if;
  else
    if tg_op = 'UPDATE' and old.status = 'hold' and private.is_blocking(new.status)
       and old.hold_expires_at <= now() then
      raise exception 'Ora ținută a expirat. Verifică din nou disponibilitatea.'
        using errcode = '23P01';
    end if;
    if tg_op = 'UPDATE' and old.status = 'expired' and private.is_blocking(new.status) then
      raise exception 'O rezervare expirată nu se mai poate reactiva.' using errcode = '23P01';
    end if;
    new.hold_expires_at := null;
  end if;

  if not private.is_blocking(new.status) then
    return new;
  end if;

  select * into v_resource
  from public.resources r
  where r.id = new.resource_id and r.tenant_id = new.tenant_id
  for update;

  if not found then
    return new; -- cheia străină va da eroarea potrivită
  end if;

  new.exclusive := v_resource.booking_mode = 'exclusive';

  -- 3. Hold-urile expirate nu mai țin locul
  update public.bookings b
  set status = 'expired'
  where b.resource_id = new.resource_id
    and b.status = 'hold'
    and b.hold_expires_at <= now()
    and b.period && new.period
    and b.id <> new.id;

  -- 4. Capacitatea
  if new.seats > v_resource.capacity and new.exclusive then
    raise exception 'Resursa „%” primește cel mult % persoane.', v_resource.name, v_resource.capacity
      using errcode = '23514';
  end if;

  if not new.exclusive then
    select coalesce(sum(b.seats), 0) into v_used
    from public.bookings b
    where b.resource_id = new.resource_id
      and private.is_blocking(b.status)
      and (b.status <> 'hold' or b.hold_expires_at > now())
      and b.period && new.period
      and b.id <> new.id;

    if v_used + new.seats > v_resource.capacity then
      raise exception 'Nu mai sunt locuri: % ocupate din %.', v_used, v_resource.capacity
        using errcode = '23P01'; -- același cod ca suprapunerea: „locul e luat”
    end if;
  end if;

  return new;
end;
$$;

-- La orice modificare (nu doar pe anumite coloane): altfel cineva ar putea
-- schimba direct hold_expires_at sau exclusive și ar ocoli regulile.
create trigger bookings_before_write
  before insert or update on public.bookings
  for each row execute function private.bookings_before_write();

-- Rulat periodic (vezi migrația cu pg_cron): marchează hold-urile expirate.
create or replace function private.expire_holds()
returns integer
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.bookings
    set status = 'expired'
    where status = 'hold' and hold_expires_at <= now()
    returning 1
  )
  select count(*)::integer from expired;
$$;

revoke all on function private.expire_holds() from public;
grant execute on function private.expire_holds() to service_role;
