import { CalendarPlus, Clock, MessageSquareText, Search, type LucideIcon } from "lucide-react"

import { Plug } from "@/components/centrala/plug"
import { cn } from "@/lib/utils"

import { SectionIntro } from "./section-intro"

type Line =
  | { who: "client" | "agent"; text: string }
  | { who: "action"; text: string; icon: LucideIcon }

// Un apel transcris, ca exemplu. Prețul și orele vin din datele firmei.
const CALL: Line[] = [
  { who: "client", text: "Bună seara, aș vrea să fac revizia la mașină săptămâna viitoare." },
  {
    who: "agent",
    text: "Bună seara! Sunt asistentul virtual al Service Auto Dinamic. Pentru ce mașină ar fi revizia?",
  },
  { who: "client", text: "O Dacia Logan din 2019, pe benzină." },
  {
    who: "agent",
    text: "Revizia completă durează cam două ore și costă 450 de lei, cu uleiul inclus. Ce zi v-ar conveni?",
  },
  { who: "client", text: "Marți dimineață, dacă se poate." },
  { who: "action", text: "caută locuri libere", icon: Search },
  { who: "agent", text: "Marți, 17 noiembrie, am liber la 8:30 și la 11:00. Care vă convine?" },
  { who: "client", text: "La 8:30." },
  { who: "action", text: "ține ora 10 minute", icon: Clock },
  { who: "agent", text: "Am notat marți, 17 noiembrie, la 8:30. Pe ce nume fac programarea?" },
  { who: "client", text: "Mihai Popescu." },
  { who: "action", text: "pune programarea în agendă", icon: CalendarPlus },
  { who: "action", text: "trimite confirmarea pe SMS", icon: MessageSquareText },
  { who: "agent", text: "Gata, domnule Popescu. V-am trimis confirmarea pe SMS. Vă așteptăm marți la 8:30." },
]

export function CallTranscript() {
  return (
    <section
      id="pas-cu-pas"
      aria-labelledby="pas-cu-pas-titlu"
      className="page grid scroll-mt-8 gap-x-12 gap-y-10 py-section lg:grid-cols-12"
    >
      <div className="lg:col-span-5">
        <SectionIntro id="pas-cu-pas-titlu" title="Un apel, pas cu pas">
          <p>
            Un client sună la service seara, după închidere. Agentul răspunde, întreabă ce trebuie,
            verifică programul și face programarea. Plăcuțele dintre replici arată ce face în spate.
          </p>
          <p className="text-base text-muted-foreground">
            Prețul și orele libere nu sunt scrise în prompt: agentul le citește din datele firmei
            în momentul întrebării.
          </p>
        </SectionIntro>
      </div>

      <div className="min-w-0 lg:col-span-7">
        <div className="surface-plate rounded-panel">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-strong px-4 py-3 sm:px-panel">
            <Plug channel="phone" connected />
            <span className="font-semibold text-heading">Apel la Service Auto Dinamic</span>
            <span className="type-plate text-muted-foreground">transcriere · 22:14</span>
          </div>

          <ol className="flex flex-col gap-3 p-4 sm:p-panel" aria-label="Transcrierea apelului">
            {CALL.map((line, i) => {
              if (line.who === "action") {
                const Icon = line.icon
                return (
                  <li key={i} className="flex items-center gap-3 py-0.5">
                    <span aria-hidden className="h-px flex-1 bg-border-strong" />
                    <span className="type-plate inline-flex items-center gap-1.5 rounded-control border border-border-strong bg-background px-2 py-1 text-muted-foreground">
                      <Icon className="size-3.5" aria-hidden />
                      <span className="sr-only">Agentul: </span>
                      {line.text}
                    </span>
                    <span aria-hidden className="h-px flex-1 bg-border-strong" />
                  </li>
                )
              }
              const agent = line.who === "agent"
              return (
                <li key={i} className={cn("flex", agent ? "justify-end" : "justify-start")}>
                  <p
                    className={cn(
                      "max-w-[85%] rounded-panel px-4 py-2.5 text-base sm:max-w-[75%]",
                      agent
                        ? "rounded-br-xs bg-primary text-primary-foreground"
                        : "rounded-bl-xs border border-border-strong bg-input-background text-heading"
                    )}
                  >
                    <span className="sr-only">{agent ? "Agentul: " : "Clientul: "}</span>
                    {line.text}
                  </p>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
