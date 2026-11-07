-- ════════════════════════════════════════════════════════════════════════
-- Cererile de înscriere în pilot, din formularul de pe landing page.
--
-- Sunt date ale platformei, nu ale unei firme-client: vin ÎNAINTE să existe
-- un tenant. De aceea stau în schema `platform`, care:
--   - nu e expusă prin API-ul REST;
--   - are RLS activat și nicio politică (nimeni nu citește prin API);
--   - e accesibilă doar rolului service_role, din backend.
-- Regula „orice tabel are tenant_id” rămâne valabilă pentru schema `public`.
-- ════════════════════════════════════════════════════════════════════════

create schema if not exists platform;
revoke all on schema platform from public, anon, authenticated;
grant usage on schema platform to service_role;

create table platform.pilot_requests (
  id             uuid primary key default gen_random_uuid(),
  business_name  text not null check (char_length(business_name) between 2 and 200),
  vertical       text not null check (char_length(vertical) between 2 and 40),
  phone          text not null check (phone ~ '^\+?[0-9 ().-]{9,20}$'),
  created_at     timestamptz not null default now()
);

alter table platform.pilot_requests enable row level security;
grant select, insert on platform.pilot_requests to service_role;

-- Formularul scrie prin această funcție, apelată doar de server (service_role).
create or replace function public.submit_pilot_request(
  p_business_name text,
  p_vertical text,
  p_phone text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  insert into platform.pilot_requests (business_name, vertical, phone)
  values (trim(p_business_name), p_vertical, trim(p_phone))
  returning id;
$$;

revoke all on function public.submit_pilot_request(text, text, text) from public, anon, authenticated;
grant execute on function public.submit_pilot_request(text, text, text) to service_role;
