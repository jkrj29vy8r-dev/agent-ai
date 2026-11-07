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
npm run check          # typecheck + lint + check:tokens + teste unitare; înainte de orice commit
npm run test           # teste unitare (vitest)
npm run test:db        # teste de integrare pe Supabase local (după db:start și db:reset)
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
  lib/availability/       getAvailability (încarcă datele) + computeAvailability (calcul pur, testat)
  lib/agent/              nucleul agentului: prompturi, bucla de tool use, unelte, rezumat
  lib/auth/member.ts      requireMember(): utilizatorul logat și firma lui (sub RLS)
  app/intra/              logarea
  app/dashboard/          dashboard-ul firmei; testeaza-agentul/ = chat de test cu uneltele vizibile
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
2. **Referințele între tabele sunt chei compuse `(tenant_id, x_id)`.** Fiecare tabel
   referit are `unique (tenant_id, id)`, iar copilul are
   `foreign key (tenant_id, resource_id) references public.resources (tenant_id, id)`. Așa,
   baza de date refuză (eroarea `23503`) o rezervare din firma A care arată spre resursa
   firmei B, chiar dacă cineva îi știe ID-ul.
3. **RLS e activat în aceeași migrație în care se creează tabelul**, cu politici pentru
   fiecare operație folosită. Tiparul este:
   - membrii firmei: `tenant_id in (select private.member_tenant_ids())`;
   - un rol anume: `tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[]))`.

   `(select private.member_tenant_ids())` nu depinde de rând, deci Postgres calculează lista
   firmelor utilizatorului o singură dată pe interogare. Nu scrie
   `private.is_tenant_member(tenant_id)` în politici noi: primește coloana rândului și se
   evaluează pe fiecare rând. Acea funcție rămâne doar pentru `tenants` și `members`.
   Matricea folosită: date operaționale = membrii citesc, adaugă și modifică, iar doar
   proprietarul șterge; setări (`booking_rules`, `agent_settings`, `channels`) = doar
   proprietarul scrie; `usage_events` = doar backend-ul scrie.
4. **Schema se schimbă doar prin migrații** în `supabase/migrations/`
   (`npx supabase migration new <nume>`), niciodată din dashboard.
5. **Clientul cu cheia secretă (`createAdminClient`) ocolește RLS.** Se folosește doar în
   backend-ul agentului (webhook-uri, joburi), iar acolo **orice interogare filtrează
   explicit după `tenant_id`**, luat din canalul care a primit mesajul (`channels` are
   `(type, address)` unic global), nu din ce spune clientul.
6. **Funcțiile `security definer`** au `set search_path = ''`, nume complet calificate și
   verifică singure `auth.uid()` și apartenența la firmă.
7. **Singura excepție: schema `platform`**, pentru datele platformei care nu aparțin unei
   firme (de exemplu `platform.pilot_requests`, cererile din formularul de pilot, care vin
   înainte să existe un tenant). Schema nu e expusă prin API, are RLS fără politici și e
   accesibilă doar lui `service_role`, printr-o funcție din `public` cu `execute` doar pentru
   `service_role`. Nu pune acolo nimic ce aparține unei firme.
8. **`npm run db:test` trebuie să treacă.** Testele din `supabase/tests/database/`:
   - `tenant_rls.test.sql` pică automat dacă un tabel din `public` nu are `tenant_id` NOT
     NULL, cheia străină către `tenants` sau RLS;
   - `tenant_isolation.test.sql` pune câte un rând în fiecare tabel pentru două firme și
     verifică faptul că o firmă nu le poate citi, modifica, șterge sau referi pe ale celeilalte.
     **Un tabel nou se adaugă în `pg_temp.fill` și în lista de verificări.**

Șablon pentru un tabel nou:

```sql
create table public.services (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, id) -- ținta cheilor compuse din tabelele copil
);

create index services_tenant_id_idx on public.services (tenant_id);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function private.set_updated_at();

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
  for delete to authenticated
  using (tenant_id in (select private.member_tenant_ids(array['owner']::public.member_role[])));
```

### Rezervările

- **Nu se suprapun.** Constrângerea `bookings_no_overlap` (excludere GiST pe
  `resource_id` + `period`) respinge orice rezervare `hold`, `pending` sau `confirmed` care se
  suprapune pe aceeași resursă exclusivă. Intervalele sunt `[început, sfârșit)`. Resursele
  `shared` (locuri) se verifică pe capacitate, în trigger.
- **Eroarea `23P01` înseamnă „locul e luat”**, fie suprapunere, fie capacitate depășită, fie
  hold expirat. Aplicația și agentul o tratează propunând alt interval, nu ca eroare tehnică.
- **Hold-ul ține 10 minute** (`private.hold_duration()`). Expirarea o pune baza de date: nu
  se poate alege și nu se poate prelungi, iar un hold expirat nu mai poate fi confirmat. Un
  hold expirat nu blochează pe nimeni: triggerul îl marchează `expired` când cineva vrea ora,
  iar `pg_cron` le curăță în fiecare minut.
- **`period` include pauza de după serviciu** (`buffer_after_min`), ca și pauza să fie
  apărată de constrângere. Ora de final afișată clientului = `lower(period)` + durata.
- **Servicii cu mai multe resurse:** `service_resources.requirement` grupează resursele.
  Același număr = alternative (Ana SAU Mihai), numere diferite = toate necesare (angajat ȘI
  cabinet). Rezervarea unui astfel de serviciu scrie câte un rând în `bookings` pentru fiecare
  resursă, în aceeași tranzacție.
- **Disponibilitatea se calculează doar cu `getAvailability`** (`src/lib/availability`).
  Calculul pur (`computeAvailability`) nu atinge baza de date și are teste pentru ora de
  vară/iarnă, zile închise, mai multe resurse și locuri. Orele din program sunt locale
  (`tenants.timezone`) și se convertesc zi cu zi cu Temporal. Nu calcula ore cu `Date` și
  offseturi fixe. Sloturile întorc `startLocal` cu offset (`…T03:00:00+02:00`), fiindcă la
  trecerea la ora de iarnă aceeași oră locală apare de două ori.
- **Nu verifica disponibilitatea doar în aplicație.** Verifică ca să propui ore, dar lasă
  baza de date să decidă la scriere.

### Date de test

`supabase/seed.sql` (rulat de `npm run db:reset`) creează Salonul Ana: 3 angajați,
8 servicii, program, 15 întrebări frecvente, 2 clienți și 2 rezervări. Contul demo este
`demo@salon-ana.test` / `parola-demo-123`, doar local.

## Agentul

- **Model:** `claude-opus-5-5`, gândire adaptivă, efort `medium` (rezumatul: `low`), cu
  `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) pentru refuzuri. Toate
  sunt în `src/lib/agent/config.ts`; nu le scrie în altă parte.
- **Prompturile** sunt în `src/lib/agent/prompts.ts`, copiate din planul produsului.
  Variabilele vin din baza de date (`buildSystemPrompt`). `renderTemplate` refuză un prompt
  cu variabile lipsă.
- **Istoricul se trimite doar prin adăugare.** Claude Opus 5.5 leagă blocurile de gândire de
  conversație: dacă se schimbă ceva în urmă (promptul de sistem, lista de unelte, un mesaj
  vechi), blocurile se pierd, iar pe conturile noi API-ul răspunde 400. De aceea:
  - promptul de sistem se construiește o dată, la `startConversation`, și se salvează în
    `conversations.system_prompt`; nu se reconstruiește în aceeași conversație;
  - ora curentă intră la fiecare mesaj al clientului ca mesaj `role: "system"` adăugat în
    istoric, nu prin schimbarea promptului;
  - lista de unelte are ordine fixă (`TOOLS` în `tools/registry.ts`);
  - `messages.api_content` păstrează JSON-ul exact trimis sau primit, în coloană `text`
    (`jsonb` ar reordona cheile). `buildApiMessages` reconstruiește istoricul din el.
    Nu edita și nu șterge rânduri din `messages`.
- **Fiecare mesaj și fiecare apel de unealtă se salvează** în `messages` (`customer`,
  `system`, `agent`, `tool`), iar consumul de tokeni în `usage_events`.
- **Uneltele** (`src/lib/agent/tools/`) primesc firma și clientul din `ToolContext`, adică
  din canal, niciodată din ce trimite modelul. Intrarea se validează cu zod (aceeași schemă
  generează definiția trimisă la API). O unealtă nu aruncă excepții spre model: întoarce
  `{ ok: false, code, error }`. Mutarea, anularea și căutarea rezervărilor merg doar pe
  numărul de telefon verificat de canal. Confirmarea merge doar pe hold-ul pus în aceeași
  conversație.
- **Unealtă nouă:** `defineTool({ name, description, channels?, input, run })` într-un fișier
  din `tools/`, apoi adăugată la finalul lui `TOOLS`. Descrierea spune *când* se folosește.
  Adaug-o în `tools.integration.test.ts`.
- **La final** `endConversation` rulează promptul de rezumat cu ieșire structurată (zod),
  salvează `summary` / `summary_data` / `outcome`, iar întrebările fără răspuns devin
  `faq_items` inactive cu `source = 'suggestion'`.
- **Testare:** `npm run test:db` rulează bucla cu un client Claude simulat (fără cost) și
  uneltele pe Supabase local. Pentru o probă reală pune `ANTHROPIC_API_KEY` în `.env.local`
  și folosește `/dashboard/testeaza-agentul` (cont demo din seed).

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
