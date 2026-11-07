"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { CHANNEL_ORDER, CHANNELS, type Channel } from "@/lib/channels"

import { Cable } from "./cable"
import { Lamp } from "./lamp"
import { Plug } from "./plug"

// Coordonatele mufelor în viewBox-ul SVG (0..600 × 0..220).
const JACK_X: Record<Channel, number> = { phone: 90, whatsapp: 300, email: 510 }
const JACK_Y = 40
const AGENDA = { x: 300, y: 190 }

/**
 * Mica centrală din specimen: un client „sună” pe un canal, lampa se aprinde,
 * agentul „bagă cablul” și leagă clientul de agendă.
 */
export function SwitchboardDemo() {
  const [active, setActive] = useState<Channel | null>("whatsapp")

  return (
    <div className="surface-plate rounded-panel p-panel">
      <div className="relative">
        <svg
          viewBox="0 0 600 220"
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={
            active
              ? `Canalul ${CHANNELS[active].label} e legat de agendă`
              : "Niciun canal legat de agendă"
          }
        >
          {active && (
            <Cable
              key={active}
              channel={active}
              from={{ x: JACK_X[active], y: JACK_Y + 10 }}
              to={{ x: AGENDA.x, y: AGENDA.y - 10 }}
              sag={30}
              animate
            />
          )}
        </svg>

        {/* Mufele și lămpile, așezate peste SVG la aceleași coordonate */}
        {CHANNEL_ORDER.map((ch) => (
          <div
            key={ch}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
            style={{ left: `${(JACK_X[ch] / 600) * 100}%`, top: `${((JACK_Y + 10) / 220) * 100}%` }}
          >
            <Plug channel={ch} connected={active === ch} className="size-6" />
          </div>
        ))}
        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ left: "50%", top: `${((AGENDA.y - 10) / 220) * 100}%` }}
        >
          <span className="type-plate rounded-control border border-border-strong bg-background px-3 py-1 text-heading shadow-plate">
            agenda
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border-strong pt-4">
        {CHANNEL_ORDER.map((ch) => (
          <Lamp
            key={ch}
            lit={active === ch}
            label={`${CHANNELS[ch].label}: ${active === ch ? "în convorbire" : "liber"}`}
          />
        ))}
        <div className="ms-auto flex flex-wrap gap-2">
          {CHANNEL_ORDER.map((ch) => (
            <Button
              key={ch}
              size="sm"
              variant={active === ch ? "default" : "outline"}
              onClick={() => setActive(active === ch ? null : ch)}
              aria-pressed={active === ch}
            >
              {CHANNELS[ch].label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
