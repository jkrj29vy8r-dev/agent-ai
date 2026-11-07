import type { Metadata } from "next"
import { CalendarCheck } from "lucide-react"

import { ChannelPlate } from "@/components/centrala/channel-plate"
import { Lamp } from "@/components/centrala/lamp"
import { Plug } from "@/components/centrala/plug"
import { SwitchboardDemo } from "@/components/centrala/switchboard-demo"
import { ThemeSwitch } from "@/components/centrala/theme-switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CHANNEL_ORDER } from "@/lib/channels"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Sistemul de design",
  robots: { index: false },
}

// Clasele sunt scrise întregi, ca Tailwind să le găsească la scanare.
const SURFACES = [
  { name: "background", cls: "bg-background", use: "fundalul paginii: smalțul" },
  { name: "panel", cls: "bg-panel", use: "panouri, carduri, plăcuțe" },
  { name: "panel-sunken", cls: "bg-panel-sunken", use: "zone adâncite, mufe" },
  { name: "input-background", cls: "bg-input-background", use: "câmpuri de formular" },
]

const INKS = [
  { name: "heading", cls: "bg-heading", use: "titluri" },
  { name: "foreground", cls: "bg-foreground", use: "text de corp" },
  { name: "muted-foreground", cls: "bg-muted-foreground", use: "text secundar" },
  { name: "input", cls: "bg-input", use: "bordura câmpurilor (3:1)" },
]

const SIGNALS = [
  { name: "primary", cls: "bg-primary", use: "bachelita: butoane, linkuri" },
  { name: "lamp", cls: "bg-lamp", use: "DOAR „activ acum”" },
  { name: "success", cls: "bg-success", use: "confirmat" },
  { name: "warning", cls: "bg-warning", use: "atenție" },
  { name: "destructive", cls: "bg-destructive", use: "eroare, anulare" },
]

const CABLES = [
  { name: "channel-phone", cls: "bg-channel-phone", use: "telefon" },
  { name: "channel-whatsapp", cls: "bg-channel-whatsapp", use: "WhatsApp" },
  { name: "channel-email", cls: "bg-channel-email", use: "e-mail" },
]

const TYPE_SCALE = [
  { token: "text-6xl", px: 64, cls: "text-6xl" },
  { token: "text-5xl", px: 52, cls: "text-5xl" },
  { token: "text-4xl", px: 40, cls: "text-4xl" },
  { token: "text-3xl", px: 32, cls: "text-3xl" },
  { token: "text-2xl", px: 26, cls: "text-2xl" },
  { token: "text-xl", px: 22, cls: "text-xl" },
]

const SPACING = [
  { token: "1", px: 4, cls: "w-1" },
  { token: "2", px: 8, cls: "w-2" },
  { token: "3", px: 12, cls: "w-3" },
  { token: "4", px: 16, cls: "w-4" },
  { token: "6", px: 24, cls: "w-6" },
  { token: "8", px: 32, cls: "w-8" },
  { token: "12", px: 48, cls: "w-12" },
  { token: "16", px: 64, cls: "w-16" },
  { token: "24", px: 96, cls: "w-24" },
]

function Swatches({ items }: { items: { name: string; cls: string; use: string }[] }) {
  return (
    <ul className="divide-y divide-border-strong border-y border-border-strong">
      {items.map((s) => (
        <li key={s.name} className="flex items-center gap-4 py-3">
          <span
            aria-hidden
            className={cn("size-10 shrink-0 rounded-control border border-border-strong", s.cls)}
          />
          <code className="type-plate w-36 shrink-0 text-heading sm:w-44">{s.name}</code>
          <span className="text-sm text-muted-foreground">{s.use}</span>
        </li>
      ))}
    </ul>
  )
}

function Section({
  id,
  title,
  lead,
  children,
  className,
}: {
  id: string
  title: string
  lead: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titlu`}
      className={cn("grid gap-8 py-section md:grid-cols-12", className)}
    >
      <div className="min-w-0 md:col-span-4">
        <h2 id={`${id}-titlu`} className="text-3xl">
          {title}
        </h2>
        <p className="mt-3 max-w-measure text-muted-foreground">{lead}</p>
      </div>
      <div className="min-w-0 md:col-span-8">{children}</div>
    </section>
  )
}

export default function SistemPage() {
  return (
    <main className="page">
      {/* Antet */}
      <header className="flex flex-col gap-8 border-b border-border-strong pt-12 pb-12 md:flex-row md:items-end md:justify-between md:pt-20">
        <div className="max-w-measure">
          <h1 className="text-5xl md:text-6xl">Centrala</h1>
          <p className="mt-4 text-lg">
            Sistemul de design al recepționerului AI. O centrală telefonică de epocă refăcută
            modern: smalț gri-verde, plăcuțe gravate, mufe rotunde, lămpi de semnal și câte un
            cablu colorat pentru fiecare canal.
          </p>
        </div>
        <ThemeSwitch />
      </header>

      {/* Metafora */}
      <section aria-labelledby="metafora-titlu" className="grid gap-8 py-section md:grid-cols-12">
        <div className="md:col-span-5">
          <h2 id="metafora-titlu" className="text-3xl">
            Fiecare client aprinde o lampă
          </h2>
          <p className="mt-3 max-w-measure text-muted-foreground">
            Când cineva sună sau scrie, lampa canalului se aprinde. Agentul „bagă cablul” și leagă
            clientul de agendă. Apasă pe un canal ca să vezi legătura.
          </p>
        </div>
        <div className="md:col-span-7">
          <SwitchboardDemo />
        </div>
      </section>

      <Separator className="bg-border-strong" />

      <Section
        id="culoare"
        title="Culoare"
        lead="Smalț pentru fundal, grafit pentru text, bachelită pentru acțiuni. Chihlimbarul lămpii e singurul accent și înseamnă doar „activ acum”."
      >
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-lg">Suprafețe</h3>
            <Swatches items={SURFACES} />
          </div>
          <div>
            <h3 className="mb-3 text-lg">Cerneluri</h3>
            <Swatches items={INKS} />
          </div>
          <div>
            <h3 className="mb-3 text-lg">Semnale</h3>
            <Swatches items={SIGNALS} />
          </div>
          <div>
            <h3 className="mb-3 text-lg">Cablurile canalelor</h3>
            <Swatches items={CABLES} />
            <p className="mt-4 text-sm text-muted-foreground">
              Aceleași trei culori peste tot: mufă, cablu, grafic, filtru.
            </p>
          </div>
        </div>
      </Section>

      <Separator className="bg-border-strong" />

      <Section
        id="tipografie"
        title="Tipografie"
        lead="O singură familie variabilă, Archivo, în două roluri. Titlurile sunt lărgite la 125% și grase, ca literele gravate pe plăcuțele de alamă. Textul de corp are 17px și lățime normală."
      >
        <div className="space-y-6">
          {TYPE_SCALE.map((t) => (
            <div key={t.token} className="flex flex-col gap-1 border-b border-border pb-4 sm:flex-row sm:items-baseline sm:gap-6">
              <code className="type-plate w-24 shrink-0 text-muted-foreground">
                {t.token} · {t.px}
              </code>
              <span className={cn("type-engraved min-w-0 break-words", t.cls)}>Rezervat</span>
            </div>
          ))}
          <div className="grid gap-6 pt-4 md:grid-cols-2">
            <div>
              <code className="type-plate text-muted-foreground">text-base · 17 · corp</code>
              <p className="mt-2 max-w-measure">
                Agentul verifică locurile libere, ține slotul zece minute cât clientul confirmă și
                trimite linkul pentru avans. Prețul, programul și disponibilitatea vin mereu din
                date, nu din text scris de mână.
              </p>
            </div>
            <div>
              <code className="type-plate text-muted-foreground">type-plate · 13 · 118%</code>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>în așteptare</Badge>
                <Badge variant="success">confirmat</Badge>
                <Badge variant="warning">predat la om</Badge>
                <Badge variant="destructive">anulat</Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Cifrele sunt tabulare peste tot: 09:30 · 10:00 · 11:15 · 1.250 lei
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Separator className="bg-border-strong" />

      <Section
        id="forma"
        title="Formă și adâncime"
        lead="Raze de 4px pentru controale, 10px pentru panouri, cerc pentru lămpi și mufe. Fără umbre aruncate: adâncimea vine dintr-o bordură de 1px și o linie deschisă sus, ca o tablă presată."
      >
        <div className="grid gap-6 sm:grid-cols-[1fr_1fr_auto]">
          <div className="surface-plate flex h-32 flex-col justify-end rounded-control p-4">
            <code className="type-plate text-heading">rounded-control · 4px</code>
            <span className="text-sm text-muted-foreground">shadow-plate</span>
          </div>
          <div className="surface-plate flex h-32 flex-col justify-end rounded-panel p-4">
            <code className="type-plate text-heading">rounded-panel · 10px</code>
            <span className="text-sm text-muted-foreground">shadow-plate</span>
          </div>
          <div className="flex h-32 flex-col items-start justify-end gap-3 rounded-panel border border-border-strong bg-panel-sunken p-4 shadow-socket">
            <div className="flex gap-3">
              {CHANNEL_ORDER.map((ch) => (
                <Plug key={ch} channel={ch} />
              ))}
            </div>
            <code className="type-plate text-heading">shadow-socket</code>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <Lamp lit={false} label="stinsă: liber" />
          <Lamp lit label="aprinsă: apel în curs" />
          <span className="text-sm text-muted-foreground">
            Singura strălucire din produs e halo-ul lămpii aprinse (shadow-lamp).
          </span>
        </div>
      </Section>

      <Separator className="bg-border-strong" />

      <Section
        id="spatiu"
        title="Spațiere"
        lead="Pas de 4px. Plus trei distanțe cu nume pentru layout: gutter (marginea paginii), panel (interiorul unui panou) și section (între secțiuni). Pe ecrane mari cresc singure."
      >
        <ul className="space-y-2">
          {SPACING.map((s) => (
            <li key={s.token} className="flex items-center gap-4">
              <code className="type-plate w-20 shrink-0 text-muted-foreground">
                {s.token} · {s.px}px
              </code>
              <span aria-hidden className={cn("h-3 rounded-xs bg-primary", s.cls)} />
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge variant="outline">p-gutter</Badge>
          <Badge variant="outline">p-panel</Badge>
          <Badge variant="outline">py-section</Badge>
          <Badge variant="outline">max-w-measure · 68ch</Badge>
        </div>
      </Section>

      <Separator className="bg-border-strong" />

      <Section
        id="componente"
        title="Componente"
        lead="Componentele shadcn/ui, trecute pe tokenii Centralei. Iconițe Lucide la 1.5px, fără săgeți la finalul butoanelor."
      >
        <div className="space-y-10">
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              <CalendarCheck data-icon="inline-start" />
              Activează agentul
            </Button>
            <Button variant="secondary">Apel de test</Button>
            <Button variant="outline">Editează programul</Button>
            <Button variant="ghost">Renunță</Button>
            <Button variant="destructive">Anulează rezervarea</Button>
            <Button variant="link">Vezi conversația</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {CHANNEL_ORDER.map((ch, i) => (
              <ChannelPlate key={ch} channel={ch} connected={i !== 2} />
            ))}
          </div>

          <form className="surface-plate grid max-w-xl gap-5 rounded-panel p-panel">
            <div className="grid gap-2">
              <Label htmlFor="nume-firma">Numele firmei</Label>
              <Input id="nume-firma" placeholder="Salon Ana" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="salut">Mesajul de salut</Label>
              <Textarea
                id="salut"
                defaultValue="Bună ziua! Sunt asistentul virtual al Salonului Ana. Cu ce vă pot ajuta?"
              />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="dumneavoastra" defaultChecked />
              <Label htmlFor="dumneavoastra">Se adresează cu „dumneavoastră”</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="confirmare" />
              <Label htmlFor="confirmare">Confirmare manuală a rezervărilor</Label>
            </div>
          </form>
        </div>
      </Section>
    </main>
  )
}
