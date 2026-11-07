"use client"

import { CircleAlert, CircleCheck, RotateCcw, Send, Square, Wrench } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"

import { Lamp } from "@/components/centrala/lamp"
import { Plug } from "@/components/centrala/plug"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Summary } from "@/lib/agent/summary"
import { CHANNEL_ORDER, CHANNELS, type Channel } from "@/lib/channels"
import { cn } from "@/lib/utils"

import { endTestConversation, sendTestMessage, startTestConversation, type ChatEvent } from "./actions"

const CONTACT_LABEL: Record<Channel, { label: string; placeholder: string; hint: string }> = {
  whatsapp: { label: "Numărul clientului", placeholder: "0722 000 001", hint: "Numărul de pe care scrie pe WhatsApp." },
  phone: { label: "Numărul apelantului", placeholder: "0722 000 001", hint: "Numărul de pe care sună." },
  email: { label: "E-mailul clientului", placeholder: "client@exemplu.ro", hint: "Adresa de la care scrie." },
}

const SUMMARY_LABELS: Record<string, string> = {
  rezervat: "rezervat",
  neterminat: "neterminat",
  predat_la_om: "predat la om",
  fara_actiune: "fără acțiune",
}

function ToolCall({ event }: { event: Extract<ChatEvent, { kind: "tool" }> }) {
  const output = event.output as { ok?: boolean; code?: string; error?: string } | null
  const ok = output?.ok === true
  return (
    <li className="flex">
      <details className="group w-full rounded-control border border-border-strong bg-background open:shadow-plate">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Wrench className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="type-plate text-heading">{event.name}</span>
          {ok ? (
            <Badge variant="success" className="h-5">
              <CircleCheck aria-hidden />
              reușit
            </Badge>
          ) : (
            <Badge variant={event.isError ? "destructive" : "warning"} className="h-5">
              <CircleAlert aria-hidden />
              {output?.code ?? "eroare"}
            </Badge>
          )}
          <span className="type-plate ms-auto text-muted-foreground group-open:hidden">detalii</span>
        </summary>
        <div className="grid gap-3 border-t border-border-strong px-3 py-3 text-xs sm:grid-cols-2">
          <div className="min-w-0">
            <p className="type-plate mb-1 text-muted-foreground">a primit</p>
            <pre className="overflow-x-auto rounded-xs bg-panel-sunken p-2 whitespace-pre-wrap break-words">
              {JSON.stringify(event.input, null, 2)}
            </pre>
          </div>
          <div className="min-w-0">
            <p className="type-plate mb-1 text-muted-foreground">a întors</p>
            <pre className="max-h-72 overflow-auto rounded-xs bg-panel-sunken p-2 whitespace-pre-wrap break-words">
              {JSON.stringify(event.output, null, 2)}
            </pre>
          </div>
        </div>
      </details>
    </li>
  )
}

function SummaryPanel({ summary }: { summary: Summary }) {
  const rows: [string, string][] = [
    ["Intenție", summary.intentie],
    ["Rezultat", SUMMARY_LABELS[summary.rezultat] ?? summary.rezultat],
    ["Ton", summary.sentiment],
    ["De făcut", summary.actiune_necesara ?? "nimic"],
  ]
  return (
    <section aria-labelledby="rezumat-titlu" className="surface-plate rounded-panel p-panel">
      <h2 id="rezumat-titlu" className="text-xl">
        Rezumatul conversației
      </h2>
      <p className="mt-2 max-w-measure">{summary.rezumat}</p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-semibold text-heading">{v}</dd>
          </div>
        ))}
      </dl>
      {summary.intrebari_fara_raspuns.length > 0 && (
        <div className="mt-4">
          <p className="type-plate text-muted-foreground">întrebări fără răspuns, adăugate ca sugestii</p>
          <ul className="mt-1 list-disc ps-5 text-sm">
            {summary.intrebari_fara_raspuns.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export function TestChat({ businessName }: { businessName: string }) {
  const [channel, setChannel] = useState<Channel>("whatsapp")
  const [contact, setContact] = useState("0722 000 001")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [events, setEvents] = useState<ChatEvent[]>([])
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [ended, setEnded] = useState(false)
  const [pending, startTransition] = useTransition()
  const bottom = useRef<HTMLLIElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" })
  }, [events, pending])

  function reset() {
    setConversationId(null)
    setEvents([])
    setSummary(null)
    setEnded(false)
    setError(null)
    setNote(null)
  }

  function send() {
    const text = draft.trim()
    if (!text || pending || ended) return
    setError(null)
    setNote(null)
    startTransition(async () => {
      let id = conversationId
      if (!id) {
        const started = await startTestConversation({ channel, contact })
        if (!started.ok) return setError(started.error)
        id = started.conversationId
        setConversationId(id)
      }
      setDraft("")
      const result = await sendTestMessage({ conversationId: id, text })
      if (!result.ok) {
        setDraft(text)
        return setError(result.error)
      }
      setEvents((prev) => [...prev, ...result.events])
      if (result.noReply) setNote("Agentul a marcat e-mailul și nu răspunde.")
      if (result.actions.includes("transfer")) setNote("Agentul a cerut transferul apelului către un om.")
      if (result.actions.includes("end_call")) setNote("Agentul a închis apelul. Încheie conversația ca să vezi rezumatul.")
    })
  }

  function end() {
    if (!conversationId) return
    setError(null)
    startTransition(async () => {
      const result = await endTestConversation(conversationId)
      if (!result.ok) return setError(result.error)
      setSummary(result.summary)
      setEnded(true)
    })
  }

  const contactInfo = CONTACT_LABEL[channel]
  const locked = conversationId !== null

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      {/* Setările testului */}
      <aside className="surface-plate h-fit rounded-panel p-panel">
        <fieldset disabled={locked}>
          <legend className="type-engraved text-lg">Clientul de test</legend>
          <div role="radiogroup" aria-label="Canal" className="mt-4 flex flex-wrap gap-2 xl:flex-col">
            {CHANNEL_ORDER.map((ch) => (
              <button
                key={ch}
                type="button"
                role="radio"
                aria-checked={channel === ch}
                onClick={() => setChannel(ch)}
                className={cn(
                  "type-plate flex h-10 items-center gap-2 rounded-control border px-3 text-heading transition-colors duration-fast outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
                  channel === ch ? "border-primary bg-background shadow-plate" : "border-border-strong hover:bg-muted"
                )}
              >
                <Plug channel={ch} connected={channel === ch} className="size-4 border-[1.5px]" />
                {CHANNELS[ch].label}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-2">
            <Label htmlFor="contact">{contactInfo.label}</Label>
            <Input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={contactInfo.placeholder}
              inputMode={channel === "email" ? "email" : "tel"}
            />
            <p className="text-sm text-muted-foreground">{contactInfo.hint} Agentul îl primește de la canal.</p>
          </div>
        </fieldset>
        {locked && (
          <Button variant="outline" className="mt-5 w-full" onClick={reset} disabled={pending}>
            <RotateCcw data-icon="inline-start" aria-hidden />
            Conversație nouă
          </Button>
        )}
      </aside>

      {/* Chat-ul */}
      <section aria-label="Conversația de test" className="flex min-w-0 flex-col gap-4">
        <div className="surface-plate flex min-h-[28rem] flex-col rounded-panel">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-strong px-4 py-3">
            <Plug channel={channel} connected={locked} />
            <span className="font-semibold text-heading">
              {businessName} · {CHANNELS[channel].label}
            </span>
            <Lamp lit={pending} label={pending ? "agentul lucrează" : ended ? "încheiată" : "în așteptare"} className="ms-auto" />
          </div>

          <ol aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {events.length === 0 && !pending && (
              <li className="m-auto max-w-sm text-center text-muted-foreground">
                Scrie primul mesaj ca un client, de exemplu „Bună, aș vrea un tuns joi după-amiază”.
              </li>
            )}
            {events.map((event) =>
              event.kind === "tool" ? (
                <ToolCall key={event.id} event={event} />
              ) : (
                <li key={event.id} className={cn("flex", event.kind === "customer" ? "justify-end" : "justify-start")}>
                  <p
                    className={cn(
                      "max-w-[85%] rounded-panel px-4 py-2.5 whitespace-pre-wrap",
                      event.kind === "customer"
                        ? "rounded-br-xs bg-primary text-primary-foreground"
                        : "rounded-bl-xs border border-border-strong bg-input-background text-heading"
                    )}
                  >
                    <span className="sr-only">{event.kind === "customer" ? "Tu: " : "Agentul: "}</span>
                    {event.text}
                  </p>
                </li>
              )
            )}
            {pending && (
              <li className="flex">
                <Lamp lit label="Agentul verifică și răspunde…" />
              </li>
            )}
            <li ref={bottom} aria-hidden />
          </ol>

          <form
            className="flex items-end gap-2 border-t border-border-strong p-3"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <Label htmlFor="mesaj" className="sr-only">
              Mesajul clientului
            </Label>
            <Textarea
              id="mesaj"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={ended ? "Conversația s-a încheiat." : "Scrie ca un client…"}
              disabled={ended}
              className="max-h-40 min-h-10"
            />
            <Button type="submit" disabled={pending || ended || !draft.trim()} aria-label="Trimite">
              <Send aria-hidden />
              <span className="hidden sm:inline">Trimite</span>
            </Button>
          </form>
        </div>

        {(error || note) && (
          <p role={error ? "alert" : "status"} className={cn("text-sm font-semibold", error ? "text-destructive" : "text-foreground")}>
            {error ?? note}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={end} disabled={!conversationId || pending || ended}>
            <Square data-icon="inline-start" aria-hidden />
            Încheie și rezumă
          </Button>
          <p className="text-sm text-muted-foreground">
            La final, agentul scrie rezumatul, iar întrebările la care nu a știut răspunde devin sugestii de întrebări frecvente.
          </p>
        </div>

        {summary && <SummaryPanel summary={summary} />}
        {ended && !summary && <p className="text-sm text-muted-foreground">Conversația s-a încheiat fără rezumat.</p>}
      </section>
    </div>
  )
}
