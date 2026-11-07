# Centrala: recepționer AI multi-tenant

@AGENTS.md

SaaS în care firmele (saloane, clinici, service-uri, restaurante, transport) își configurează
un agent AI care răspunde non-stop la telefon, pe WhatsApp și pe e-mail și face singur
rezervări. **Interfața e în română.** „Centrala” e nume provizoriu.

Principiul de bază al produsului: prețul, programul și locurile libere vin din date
structurate, citite prin unelte (tool use), nu din text scris de mână sau din prompt.

## Stack

| Strat | Alegere |
| --- | --- |
| Framework | Next.js 16 (App Router, `cacheComponents`, Turbopack), React 19, TypeScript strict |
| Stil | Tailwind CSS 4 + `tailwind.config.ts` (încărcat cu `@config`), shadcn/ui (Radix, stil `radix-nova`), Lucide |
| Date și autentificare | Supabase: Postgres, Auth, RLS, Edge Functions; `@supabase/ssr` |
| Agent | API-ul Claude cu tool use |
| Canale | Resend (e-mail), WhatsApp Cloud API, Vapi/Retell/ElevenLabs + Twilio/Telnyx (telefon) |
| Plăți | Stripe Billing + Stripe Connect |
| Găzduire | Vercel |

Next 16 diferă de ce știi: `middleware.ts` se numește acum **`proxy.ts`**, iar cu
`cacheComponents` orice citire dinamică (cookies, headers, date per utilizator) stă într-un
`<Suspense>`. Înainte să scrii cod Next, citește ghidul din `node_modules/next/dist/docs/`.

## Comenzi

```bash
npm run dev            # server de dezvoltare
npm run build          # build de producție
npm run check          # typecheck + lint + check:tokens; rulează-l înainte de orice commit
npm run check:tokens   # caută culori, umbre, raze, fonturi brute și paleta implicită Tailwind
npm run db:start       # Supabase local (Docker)
npm run db:reset       # reaplică toate migrațiile pe baza locală
npm run db:test        # testele pgTAP din supabase/tests (inclusiv paznicul RLS)
npm run db:types       # regenerează src/lib/supabase/database.types.ts
npm run capture:hero   # regenerează imaginile statice ale panoului 3D (cu site-ul pornit)
```

## Structură

```
src/
  app/                    rute (App Router); globals.css = valorile tuturor tokenilor
  components/ui/          componente shadcn/ui, trecute pe tokenii Centralei
  components/centrala/    componentele-semnătură: Lamp, Plug, Cable, ChannelPlate, ThemeSwitch
  components/landing/     secțiunile landing page-ului; hero/ = panoul 3D (React Three Fiber + drei)
  lib/supabase/           client.ts (browser), server.ts (RSC/acțiuni), admin.ts (cheie secretă), proxy.ts
  lib/channels.ts         cele trei canale: etichetă, iconiță, clasele de culoare
  lib/verticals.ts        domeniile (banda „Pentru cine” și formularul de pilot)
  lib/utils.ts            cn() cu tokenii înregistrați
  proxy.ts                reîmprospătează sesiunea Supabase
supabase/
  migrations/             SQL versionat; singurul mod de a schimba schema
  tests/database/         teste pgTAP
scripts/                  check-tokens.mjs, capture-hero.mjs
public/hero/              imaginile statice ale panoului (generate, nu desenate de mână)
tailwind.config.ts        numele tokenilor (utilitare) → variabile CSS
DESIGN.md                 sistemul de design, pe larg
```

## Convenții

- **Server Components implicit.** `"use client"` doar unde e nevoie de stare sau evenimente,
  cât mai jos în arbore.
- **Importuri cu `@/`.** `cn` se importă mereu din `@/lib/utils`, niciodată direct din `"cn"`:
  acolo sunt înregistrați tokenii, ca să se rezolve corect conflictele de clase.
- **Fișiere în kebab-case** (`channel-plate.tsx`), componente în PascalCase, funcții SQL și
  coloane în snake_case.
- **Textul din interfață e în română**, cu diacritice corecte (ș, ț cu virgulă, nu cu
  sedilă), ghilimele „…”, ton cald și direct. Fără jargon tehnic pentru patroni: „agenda”,
  nu „calendar sync”. Codul, numele de variabile și commit-urile pot fi în engleză.
- **Formulare:** Server Actions + validare pe server. Erorile se scriu lângă câmp, în română.
- **Componente shadcn noi:** `npx shadcn@latest add <nume>`, apoi treci-le pe tokeni
  (vezi regula 2) și rulează `npm run check:tokens`. Importul de `cn` trebuie schimbat în
  `@/lib/utils`.
- **Secrete:** doar `NEXT_PUBLIC_SUPABASE_URL` și `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sunt
  publice. Orice altă cheie stă doar pe server și nu primește prefixul `NEXT_PUBLIC_`.

## Regula 1: orice tabel are `tenant_id` și RLS

Fiecare firmă e un *tenant*. O firmă nu are voie să vadă niciodată datele alteia, iar
garanția asta o dă baza de date, nu codul aplicației.

1. **Orice tabel nou din `public` are `tenant_id uuid not null references public.tenants (id)
   on delete cascade`** și un index pe `tenant_id`. Singura excepție e `tenants`, unde `id`
   *este* tenant_id-ul.
2. **RLS e activat în aceeași migrație în care se creează tabelul**, cu politici pentru
   fiecare operație folosită. Politicile folosesc funcțiile din schema `private`:
   - `private.is_tenant_member(tenant_id)`: utilizatorul e membru al firmei;
   - `private.has_tenant_role(tenant_id, array['owner']::public.member_role[])`: are rolul cerut.
3. **Schema se schimbă doar prin migrații** în `supabase/migrations/`
   (`npx supabase migration new <nume>`), niciodată din dashboard.
4. **Clientul cu cheia secretă (`createAdminClient`) ocolește RLS.** Se folosește doar în
   backend-ul agentului (webhook-uri, joburi), iar acolo **orice interogare filtrează
   explicit după `tenant_id`**, luat din canalul care a primit mesajul, nu din ce spune
   clientul.
5. **Funcțiile `security definer`** au `set search_path = ''`, nume complet calificate și
   verifică singure `auth.uid()` și apartenența la firmă.
6. **Singura excepție: schema `platform`**, pentru datele platformei care nu aparțin unei
   firme (de exemplu `platform.pilot_requests`, cererile din formularul de pilot, care vin
   înainte să existe un tenant). Schema nu e expusă prin API, are RLS fără politici și e
   accesibilă doar lui `service_role`, printr-o funcție din `public` cu `execute` doar pentru
   `service_role`. Nu pune acolo nimic ce aparține unei firme.
7. **`npm run db:test` trebuie să treacă.** `supabase/tests/database/tenant_rls.test.sql`
   pică automat dacă un tabel din `public` nu are `tenant_id` NOT NULL, cheia străină către
   `tenants` sau RLS. Pentru tabelele noi importante, adaugă și un test de izolare
   (utilizatorul firmei A nu vede rândurile firmei B).

Șablon pentru un tabel nou:

```sql
create table public.services (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index services_tenant_id_idx on public.services (tenant_id);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function private.set_updated_at();

alter table public.services enable row level security;

create policy "services: membrii citesc"
  on public.services for select to authenticated
  using ((select private.is_tenant_member(tenant_id)));

create policy "services: membrii adaugă"
  on public.services for insert to authenticated
  with check ((select private.is_tenant_member(tenant_id)));

create policy "services: membrii modifică"
  on public.services for update to authenticated
  using ((select private.is_tenant_member(tenant_id)))
  with check ((select private.is_tenant_member(tenant_id)));

create policy "services: proprietarul șterge"
  on public.services for delete to authenticated
  using ((select private.has_tenant_role(tenant_id, array['owner']::public.member_role[])));
```

Apelul `(select …)` în jurul funcției e intenționat: Postgres îl evaluează o singură dată pe
interogare, nu pe fiecare rând.

## Regula 2: toate componentele folosesc tokenii de design

Direcția vizuală e **centrala telefonică de epocă refăcută modern** (detaliile în
`DESIGN.md`). Ca să rămână unitară:

1. **Valorile brute (hex, rgb, px de rază, umbre, ms) există doar în `src/app/globals.css`**,
   ca variabile CSS, cu variantă light (`:root`) și dark (`.dark`). Primitivele
   (`--enamel-*`, `--graphite-*`, …) nu se folosesc direct; doar tokenii semantici.
2. **`tailwind.config.ts` dă nume tokenilor.** Componentele folosesc doar aceste nume:
   `bg-background`, `bg-panel`, `text-heading`, `text-foreground`, `text-muted-foreground`,
   `bg-primary`, `bg-lamp`, `text-channel-phone`, `rounded-control`, `rounded-panel`,
   `shadow-plate`, `shadow-socket`, `shadow-lamp`, `p-panel`, `py-section`, `max-w-measure`,
   `animate-lamp-on`, `duration-fast`, `ease-switch`, plus utilitarele `type-engraved`,
   `type-plate`, `surface-plate` și `page`.
3. **Interzis în componente:** culori hex/rgb/hsl/oklch, valori arbitrare de culoare, umbră,
   rază sau font (`bg-[#…]`, `shadow-[…]`, `rounded-[…]`, `text-[18px]`), paleta implicită
   Tailwind (`bg-red-500`, `text-white`, care oricum nu mai există: e ștearsă în
   `globals.css`), gradienți și emoji. `npm run check:tokens` le prinde. O excepție reală
   (de exemplu `<meta name="theme-color">`) se marchează pe linie cu `// token-ok: <motiv>`.
4. **Ai nevoie de o valoare nouă?** Adaug-o ca token: primitivă + semantic light + semantic
   dark în `globals.css`, nume în `tailwind.config.ts`, rând în `DESIGN.md`. Verifică
   contrastul (text ≥ 4.5:1, borduri de câmp și iconițe ≥ 3:1) în ambele teme.
5. **Semnificațiile sunt fixe:**
   - **lampa** (`lamp`, chihlimbar) înseamnă **doar „activ acum”**; nu e culoare de brand,
     nu se folosește pentru text pe fundal deschis, nu pulsează, iar starea e scrisă mereu
     și în text;
   - **cablurile** au aceeași culoare peste tot: telefon `channel-phone` (roșu), WhatsApp
     `channel-whatsapp` (albastru), e-mail `channel-email` (grafit). Folosește
     `CHANNELS` din `@/lib/channels`;
   - `accent` din shadcn e doar fundalul neutru de hover, nu un accent de culoare.
6. **Scena 3D din hero își ia culorile tot din tokeni**, citiți la rulare cu
   `readSceneColors()` (`src/components/landing/hero/scene-colors.ts`); textele de pe panou
   sunt desenate în Archivo. Nu scrie culori în scenă. Materialele au tokeni proprii (`enamel`,
   `bakelite`, `brass`, `paper`, `screen`), care nu se inversează noaptea ca `primary`. După
   orice schimbare vizuală a panoului, rulează `npm run capture:hero`.
7. **Fără umbre aruncate.** Adâncimea vine din bordura de 1px plus `shadow-plate` (linia
   deschisă sus). Singura strălucire e `shadow-lamp`.
8. **De evitat** (cerut explicit de brief): gradienți violet-albastru, glassmorphism și
   `backdrop-blur`, trei carduri identice într-o grilă, totul centrat, text cu gradient,
   etichete cu majuscule deasupra fiecărui titlu, săgeți la finalul butoanelor, emoji ca
   iconițe. Iconițele sunt Lucide, cu linie de 1.5px (setată global). 3D există doar în hero;
   restul paginilor e liniștit, fără animații la scroll.

## Înainte de a spune „gata”

- `npm run check` trece; `npm run build` trece.
- Pentru schimbări de schemă: `npm run db:reset && npm run db:test` trec, iar tipurile sunt
  regenerate cu `npm run db:types`.
- Pentru schimbări de interfață: verificat pe `/sistem` sau pe pagina afectată, în light și
  dark, de la 360px la 1440px, fără scroll orizontal.
- Textele încă necunoscute se marchează cu `<Placeholder>` ([PREȚ], [CONDIȚII PILOT],
  [CONTACT]); nu inventa prețuri, mărturii sau logo-uri de clienți.
