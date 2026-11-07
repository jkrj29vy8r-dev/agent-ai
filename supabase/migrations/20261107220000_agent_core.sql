-- ════════════════════════════════════════════════════════════════════════
-- Ce îi trebuie nucleului agentului:
--   - istoricul exact al conversației cu Claude, ca să poată fi retrimis
--     neschimbat (blocurile de gândire sunt legate de conversație: orice
--     editare a istoricului le invalidează);
--   - promptul de sistem înghețat la începutul conversației;
--   - legătura dintre rândurile unei rezervări pe mai multe resurse;
--   - câmpurile din care se completează variabilele promptului master.
-- ════════════════════════════════════════════════════════════════════════

-- ── messages: ordine sigură și conținutul exact trimis la API ───────────
alter table public.messages
  add column seq bigint generated always as identity,
  -- Conținutul exact trimis/primit de la API (blocurile de gândire, text,
  -- tool_use; textul unui tool_result), ca JSON în coloană TEXT: jsonb ar
  -- reordona cheile, iar istoricul retrimis trebuie să fie identic.
  add column api_content text,
  -- Pentru apelurile de unealtă: ID-ul blocului tool_use la care răspund.
  add column tool_use_id text,
  add column is_error boolean not null default false;

-- Un răspuns al agentului poate conține doar apeluri de unelte (fără text).
alter table public.messages drop constraint messages_check;
alter table public.messages
  add constraint messages_has_content check (content is not null or tool_name is not null or api_content is not null);

create index messages_conversation_seq_idx on public.messages (conversation_id, seq);

comment on column public.messages.api_content is
  'JSON-ul exact trimis sau primit de la API-ul Claude (text, nu jsonb, ca să păstreze ordinea cheilor). Nu se modifică niciodată după scriere.';

-- ── conversations: promptul înghețat și contextul canalului ─────────────
alter table public.conversations
  add column system_prompt text,
  -- Ce știe backend-ul despre client, nu ce spune clientul: numărul de pe
  -- care sună sau scrie, adresa de e-mail etc.
  add column context jsonb not null default '{}' check (jsonb_typeof(context) = 'object'),
  add column summary_data jsonb,
  add column is_test boolean not null default false,
  add column model text;

comment on column public.conversations.system_prompt is
  'Promptul de sistem, construit o dată la începutul conversației și apoi neschimbat.';

-- ── bookings: rândurile unei rezervări pe mai multe resurse ─────────────
alter table public.bookings add column group_id uuid;
create index bookings_group_idx on public.bookings (tenant_id, group_id);

comment on column public.bookings.group_id is
  'Leagă rândurile aceleiași rezervări (câte unul pe resursă). Se confirmă, se mută și se anulează împreună.';

-- ── Variabilele promptului ──────────────────────────────────────────────
alter table public.booking_rules
  add column max_group_size integer not null default 6 check (max_group_size between 1 and 1000);

alter table public.agent_settings
  add column human_hours text,      -- când se pot transfera apelurile, de exemplu „luni–vineri, 9–17”
  add column email_signature text;

-- Întrebările la care agentul nu a știut răspunsul devin sugestii pentru firmă.
alter table public.faq_items
  add column source text not null default 'manual' check (source in ('manual', 'suggestion', 'import'));
