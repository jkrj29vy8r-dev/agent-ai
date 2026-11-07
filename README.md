# Centrala

Recepționer AI pentru afaceri pe bază de rezervări: răspunde non-stop la telefon, pe
WhatsApp și pe e-mail, verifică locurile libere și face singur rezervarea. SaaS
multi-tenant, interfață în română.

Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase

## Pornire

```bash
npm install
cp .env.example .env.local   # completează cheile Supabase
npm run dev                  # http://localhost:3000 → /sistem
```

Fără `.env.local`, site-ul pornește oricum; doar sesiunea Supabase nu se reîmprospătează.

Baza de date locală (cere Docker):

```bash
npm run db:start   # pornește Supabase local și afișează cheile
npm run db:reset   # aplică migrațiile din supabase/migrations
npm run db:test    # testele pgTAP, inclusiv paznicul tenant_id + RLS
```

## Documente

- [`CLAUDE.md`](./CLAUDE.md): stack-ul, convențiile și cele două reguli de bază
  (`tenant_id` + RLS peste tot; doar tokeni de design în componente).
- [`DESIGN.md`](./DESIGN.md): sistemul de design „centrala telefonică”.
- `/sistem`: specimenul viu al sistemului de design, în light și dark.
