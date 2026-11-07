import { Check, Hand, PhoneForwarded } from "lucide-react"

import { Lamp } from "@/components/centrala/lamp"
import { Plug } from "@/components/centrala/plug"
import { Badge } from "@/components/ui/badge"
import { CHANNEL_ORDER, CHANNELS, type Channel } from "@/lib/channels"
import { cn } from "@/lib/utils"

import { SectionIntro } from "./section-intro"

type Row = {
  channel: Channel
  who: string
  summary: string
  time: string
  status: "live" | "booked" | "handoff" | "answered"
}

// Inbox-ul unei frizerii, cu date inventate pentru ilustrație.
const ROWS: Row[] = [
  { channel: "whatsapp", who: "+40 7•• ••• 412", summary: "Întreabă dacă mai e loc sâmbătă dimineață", time: "acum", status: "live" },
  { channel: "phone", who: "Elena R.", summary: "Vrea 4 coafuri la domiciliu pentru o nuntă", time: "22:31", status: "handoff" },
  { channel: "whatsapp", who: "Andrei M.", summary: "Tuns + barbă, joi 12 nov, 15:30", time: "23:40", status: "booked" },
  { channel: "email", who: "Cristian V.", summary: "Întreabă dacă se poate plăti cu cardul", time: "01:05", status: "answered" },
  { channel: "phone", who: "Radu T.", summary: "A mutat tunsul de joi pe vineri, 10:00", time: "07:12", status: "booked" },
]

const POINTS = [
  { icon: Check, text: "Vezi fiecare conversație, ce a răspuns agentul și ce a făcut în spate." },
  { icon: Hand, text: "Preiei tu oricând: agentul se oprește și conversația îți rămâne ție." },
  { icon: PhoneForwarded, text: "Cazurile predate la om ajung la tine pe telefon, cu tot contextul." },
]

function Status({ status }: { status: Row["status"] }) {
  if (status === "live") return <Lamp lit label="în convorbire" />
  if (status === "handoff") return <Badge variant="warning">predat la om</Badge>
  if (status === "answered") return <Badge>a răspuns</Badge>
  return <Badge variant="success">rezervat</Badge>
}

export function InboxPreview() {
  return (
    <section
      aria-labelledby="control-titlu"
      className="page grid gap-x-12 gap-y-10 py-section lg:grid-cols-12"
    >
      <div className="lg:col-span-5">
        <SectionIntro id="control-titlu" title="Tu rămâi la control">
          <p>
            Toate canalele ajung într-un singur inbox. Fiecare cablu are culoarea lui, iar lampa se
            aprinde doar la conversațiile care au loc chiar acum.
          </p>
        </SectionIntro>
        <ul className="mt-8 flex flex-col gap-4">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-3">
              <Icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <figure className="min-w-0 lg:col-span-7">
        <div className="surface-plate overflow-hidden rounded-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-strong px-4 py-3">
            <span className="type-engraved text-lg">Conversații</span>
            <ul className="flex flex-wrap gap-2" aria-label="Canale">
              {CHANNEL_ORDER.map((ch) => (
                <li key={ch} className="type-plate inline-flex items-center gap-1.5 text-muted-foreground">
                  <Plug channel={ch} connected className="size-4 border-[1.5px]" />
                  {CHANNELS[ch].label}
                </li>
              ))}
            </ul>
          </div>

          <ul className="divide-y divide-border bg-input-background">
            {ROWS.map((row) => (
              <li key={row.who} className="relative flex gap-3 py-3 pr-4 pl-5">
                {/* cablul canalului, pe marginea rândului */}
                <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", CHANNELS[row.channel].bg)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-heading">{row.who}</span>
                    <span className="type-plate text-muted-foreground">
                      {CHANNELS[row.channel].label} · {row.time}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm sm:truncate">{row.summary}</p>
                </div>
                <div className="shrink-0 self-center">
                  <Status status={row.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <figcaption className="mt-3 text-sm text-muted-foreground">
          Inbox-ul unei frizerii, cu date de exemplu.
        </figcaption>
      </figure>
    </section>
  )
}
