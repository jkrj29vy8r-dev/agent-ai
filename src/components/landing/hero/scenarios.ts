import type { Channel } from "@/lib/channels"

/**
 * Clienții din secvența de pe panou. Butonul „Alt client” trece la următorul.
 * Datele sunt exemple ilustrative, nu clienți reali.
 */
export type Scenario = {
  id: string
  channel: Channel
  /** Ce scrie pe ecranul agentului când se aprinde lampa. */
  incoming: string
  /** Ora la care vine clientul: după program. */
  receivedAt: string
  /** Ce ține agentul cât clientul confirmă. */
  hold: string
  /** Rândul din agendă, exact cum apare pe pagină. */
  booking: string
  agenda: {
    title: string
    rows: { time: string; text: string }[]
    newRow: { time: string; text: string }
  }
}

export const SCENARIOS: Scenario[] = [
  {
    id: "frizerie",
    channel: "whatsapp",
    incoming: "mesaj nou pe WhatsApp",
    receivedAt: "23:40",
    hold: "ține ora 15:30",
    booking: "joi, 12 nov · 15:30 · tuns + barbă · Andrei M.",
    agenda: {
      title: "joi, 12 noiembrie",
      rows: [
        { time: "10:00", text: "tuns · Radu T." },
        { time: "12:30", text: "barbă · Vlad C." },
        { time: "14:00", text: "tuns copil · Matei" },
      ],
      newRow: { time: "15:30", text: "tuns + barbă · Andrei M." },
    },
  },
  {
    id: "service",
    channel: "phone",
    incoming: "apel nou la service",
    receivedAt: "06:52",
    hold: "ține ora 09:00",
    booking: "vineri, 13 nov · 09:00 · revizie Dacia Logan · Mihai P.",
    agenda: {
      title: "vineri, 13 noiembrie",
      rows: [
        { time: "08:00", text: "geometrie · Ford Focus" },
        { time: "11:00", text: "plăcuțe frână · Skoda" },
        { time: "13:30", text: "anvelope · VW Golf" },
      ],
      newRow: { time: "09:00", text: "revizie Logan · Mihai P." },
    },
  },
  {
    id: "pensiune",
    channel: "email",
    incoming: "e-mail nou la pensiune",
    receivedAt: "01:15",
    hold: "ține camera 4",
    booking: "21–22 nov · cameră dublă · 2 adulți · Ioana D.",
    agenda: {
      title: "noiembrie, camere",
      rows: [
        { time: "14–16", text: "camera 2 · Popa" },
        { time: "19–20", text: "camera 1 · Neagu" },
        { time: "20–23", text: "camera 3 · Marin" },
      ],
      newRow: { time: "21–22", text: "camera 4 · Ioana D." },
    },
  },
]

/**
 * Cronologia secvenței, în secunde de la pornire. Totul se termină sub 5s.
 * ring: lampa se aprinde · cable1: cablul canal → agent · search: agentul caută
 * hold: ține slotul · cable2: cablul agent → agendă · booked: rândul apare.
 */
export const TIMELINE = {
  ring: 0.3,
  cable1Start: 0.55,
  cable1End: 1.6,
  search: 1.75,
  hold: 2.75,
  cable2Start: 2.85,
  cable2End: 3.8,
  booked: 3.95,
  end: 4.6,
} as const

export type Phase = "idle" | "ring" | "search" | "hold" | "booked"

export function phaseAt(t: number): Phase {
  if (t >= TIMELINE.booked) return "booked"
  if (t >= TIMELINE.hold) return "hold"
  if (t >= TIMELINE.search) return "search"
  if (t >= TIMELINE.ring) return "ring"
  return "idle"
}
