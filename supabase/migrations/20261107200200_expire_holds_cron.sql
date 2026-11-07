-- Marchează în fiecare minut hold-urile expirate (status 'expired').
-- Rezervările noi nu depind de job: triggerul de pe bookings eliberează oricum
-- hold-urile expirate care le stau în cale. Jobul ține doar datele curate
-- pentru dashboard și pentru verificarea disponibilității.
-- pg_cron există pe Supabase; unde lipsește (unele medii de test), sărim.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('centrala-expira-hold-uri', '* * * * *', 'select private.expire_holds()');
  else
    raise notice 'pg_cron lipsește: hold-urile expirate se eliberează doar la rezervările noi.';
  end if;
end;
$$;
