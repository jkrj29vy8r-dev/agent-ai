import { Temporal } from "temporal-polyfill"

/**
 * Calculul sloturilor libere, fără bază de date: primește tot ce trebuie și
 * întoarce sloturile. Partea care încarcă datele e în get-availability.ts.
 *
 * Reguli:
 *  - programul recurent e în ora locală a firmei; fiecare zi se convertește
 *    separat, deci trecerea la ora de vară/iarnă iese corect (o oră care nu
 *    există se mută după salt, o oră care apare de două ori se ia prima);
 *  - excepțiile „open” adaugă ore, cele „closed” scot ore; fără resursă =
 *    toată firma;
 *  - serviciul trebuie să se termine în program; pauza de după poate trece
 *    de ora de închidere, dar nu se poate suprapune cu altă rezervare;
 *  - rezervările care țin locul: confirmate, în așteptare și hold-urile
 *    încă valabile;
 *  - resursele „shared” au locuri: slotul rămâne liber cât mai sunt locuri;
 *  - un serviciu cere câte o resursă din fiecare grup de cerință.
 */

export type BookingMode = "exclusive" | "shared"
export type BookingStatus = "hold" | "pending" | "confirmed" | "cancelled" | "no_show" | "expired"

export type AvailabilityResource = {
  id: string
  name: string
  bookingMode: BookingMode
  capacity: number
}

/** Ore locale, "HH:MM" sau "HH:MM:SS"; "24:00" = miezul nopții de la final. */
export type WeeklyRule = { resourceId: string; weekday: number; startsAt: string; endsAt: string }

export type AvailabilityException = {
  resourceId: string | null
  start: string
  end: string
  kind: "closed" | "open"
}

export type ExistingBooking = {
  resourceId: string
  /** Intervalul ocupat, cu tot cu pauza de după (ca în bookings.period). */
  start: string
  end: string
  seats: number
  status: BookingStatus
  holdExpiresAt: string | null
}

export type Instantish = string | Date

export type AvailabilityInput = {
  timeZone: string
  now: Instantish
  from: Instantish
  to: Instantish
  service: { durationMin: number; bufferAfterMin: number }
  bookingRules: { minNoticeMin: number; maxAdvanceDays: number }
  /** Grupurile de cerință: câte o resursă din fiecare grup. */
  requirements: AvailabilityResource[][]
  weeklyRules: WeeklyRule[]
  exceptions: AvailabilityException[]
  bookings: ExistingBooking[]
  /** Resursa preferată: restrânge grupul ei la ea. */
  resourceId?: string
  /** Câte locuri cere clientul (pentru resurse „shared”). */
  seats?: number
  /** Pasul dintre începuturile sloturilor, în minute. */
  stepMin?: number
}

export type Slot = {
  /** Instant ISO (UTC). */
  start: string
  /** Când se termină serviciul (fără pauza de după). */
  end: string
  /** Ora locală cu offset, de exemplu 2026-11-12T15:30:00+02:00. */
  startLocal: string
  endLocal: string
  /** Pentru fiecare grup de cerință, resursele libere la ora asta, în ordinea preferată. */
  resourceOptions: string[][]
  /** Locurile rămase, dacă serviciul folosește o resursă „shared”; altfel null. */
  seatsLeft: number | null
}

export class AvailabilityError extends Error {
  constructor(
    public code: "INVALID_RANGE" | "RANGE_TOO_LONG" | "RESOURCE_NOT_FOR_SERVICE" | "SERVICE_NOT_FOUND",
    message: string
  ) {
    super(message)
    this.name = "AvailabilityError"
  }
}

export const MAX_RANGE_DAYS = 93
const MINUTE = 60_000

type Interval = [number, number]

/* ── Intervale ───────────────────────────────────────────────────────────── */

function merge(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0])
  const out: Interval[] = []
  for (const [s, e] of sorted) {
    const last = out[out.length - 1]
    if (last && s <= last[1]) last[1] = Math.max(last[1], e)
    else out.push([s, e])
  }
  return out
}

function subtract(from: Interval[], remove: Interval[]): Interval[] {
  let result = from
  for (const [rs, re] of merge(remove)) {
    const next: Interval[] = []
    for (const [s, e] of result) {
      if (re <= s || rs >= e) next.push([s, e])
      else {
        if (rs > s) next.push([s, rs])
        if (re < e) next.push([re, e])
      }
    }
    result = next
  }
  return result
}

const contains = (list: Interval[], s: number, e: number) => list.some(([a, b]) => a <= s && e <= b)
const overlapping = <T extends { span: Interval }>(list: T[], s: number, e: number) =>
  list.filter(({ span: [a, b] }) => a < e && s < b)

/* ── Timp ────────────────────────────────────────────────────────────────── */

export function toEpochMs(value: Instantish): number {
  return typeof value === "string" ? Temporal.Instant.from(value).epochMilliseconds : value.getTime()
}

/** O oră locală dintr-o zi, ca instant. „24:00” = 00:00 a zilei următoare. */
function localToEpochMs(date: Temporal.PlainDate, time: string, timeZone: string): number {
  const isMidnightEnd = /^24:00(:00)?$/.test(time)
  const day = isMidnightEnd ? date.add({ days: 1 }) : date
  const plainTime = Temporal.PlainTime.from(isMidnightEnd ? "00:00" : time)
  // „compatible”: o oră sărită (vara) se mută după salt; o oră dublă (iarna) se ia prima.
  return day.toZonedDateTime({ timeZone, plainTime }).epochMilliseconds
}

function localString(ms: number, timeZone: string) {
  return Temporal.Instant.fromEpochMilliseconds(ms)
    .toZonedDateTimeISO(timeZone)
    .toString({ timeZoneName: "never", smallestUnit: "second" })
}

const iso = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms).toString()

/* ── Calculul ────────────────────────────────────────────────────────────── */

const BLOCKING: BookingStatus[] = ["hold", "pending", "confirmed"]

export function computeAvailability(input: AvailabilityInput): Slot[] {
  const { timeZone, service, bookingRules } = input
  const seats = input.seats ?? 1
  const stepMs = (input.stepMin ?? 15) * MINUTE
  const durationMs = service.durationMin * MINUTE
  const occupiedMs = (service.durationMin + service.bufferAfterMin) * MINUTE

  const nowMs = toEpochMs(input.now)
  const fromMs = toEpochMs(input.from)
  const toMs = toEpochMs(input.to)
  if (!(toMs > fromMs)) throw new AvailabilityError("INVALID_RANGE", "Sfârșitul trebuie să fie după început.")
  if (toMs - fromMs > MAX_RANGE_DAYS * 24 * 60 * MINUTE)
    throw new AvailabilityError("RANGE_TOO_LONG", `Cel mult ${MAX_RANGE_DAYS} de zile pe o cerere.`)

  // Fereastra în care pot începe sloturile: anunț minim și avans maxim.
  const earliest = Math.max(fromMs, nowMs + bookingRules.minNoticeMin * MINUTE)
  const latest = Math.min(
    toMs - 1,
    Temporal.Instant.fromEpochMilliseconds(nowMs)
      .toZonedDateTimeISO(timeZone)
      .add({ days: bookingRules.maxAdvanceDays }).epochMilliseconds
  )
  if (earliest > latest) return []

  // Resursa preferată restrânge grupul ei.
  let groups = input.requirements
  if (input.resourceId) {
    const index = groups.findIndex((g) => g.some((r) => r.id === input.resourceId))
    if (index === -1)
      throw new AvailabilityError("RESOURCE_NOT_FOR_SERVICE", "Resursa aleasă nu face acest serviciu.")
    groups = groups.map((g, i) => (i === index ? g.filter((r) => r.id === input.resourceId) : g))
  }
  if (groups.length === 0 || groups.some((g) => g.length === 0)) return []

  // Zilele locale de parcurs (cu una înainte, pentru intervalele de la miezul nopții).
  const days: Temporal.PlainDate[] = []
  const lastDay = Temporal.Instant.fromEpochMilliseconds(latest).toZonedDateTimeISO(timeZone).toPlainDate()
  for (
    let d = Temporal.Instant.fromEpochMilliseconds(earliest).toZonedDateTimeISO(timeZone).toPlainDate().subtract({ days: 1 });
    Temporal.PlainDate.compare(d, lastDay) <= 0;
    d = d.add({ days: 1 })
  ) {
    days.push(d)
  }

  const exceptions = input.exceptions.map((x) => ({ ...x, span: [toEpochMs(x.start), toEpochMs(x.end)] as Interval }))
  const bookings = input.bookings
    .filter((b) => BLOCKING.includes(b.status))
    .filter((b) => b.status !== "hold" || (b.holdExpiresAt !== null && toEpochMs(b.holdExpiresAt) > nowMs))
    .map((b) => ({ ...b, span: [toEpochMs(b.start), toEpochMs(b.end)] as Interval }))

  // Programul efectiv și ocuparea, pe resursă.
  const resources = new Map<string, { resource: AvailabilityResource; working: Interval[]; busy: typeof bookings }>()
  for (const resource of groups.flat()) {
    if (resources.has(resource.id)) continue
    const fromRules: Interval[] = []
    for (const day of days) {
      for (const rule of input.weeklyRules) {
        if (rule.resourceId !== resource.id || rule.weekday !== day.dayOfWeek) continue
        fromRules.push([localToEpochMs(day, rule.startsAt, timeZone), localToEpochMs(day, rule.endsAt, timeZone)])
      }
    }
    const applies = (x: (typeof exceptions)[number]) => x.resourceId === null || x.resourceId === resource.id
    const open = exceptions.filter((x) => x.kind === "open" && applies(x)).map((x) => x.span)
    const closed = exceptions.filter((x) => x.kind === "closed" && applies(x)).map((x) => x.span)
    resources.set(resource.id, {
      resource,
      working: subtract(merge([...fromRules, ...open]), closed),
      busy: bookings.filter((b) => b.resourceId === resource.id),
    })
  }

  /** Locurile rămase dacă resursa e liberă la `start`, altfel null. */
  function remaining(resourceId: string, start: number): number | null {
    const { resource, working, busy } = resources.get(resourceId)!
    if (!contains(working, start, start + durationMs)) return null
    const clashes = overlapping(busy, start, start + occupiedMs)
    if (resource.bookingMode === "exclusive") {
      return clashes.length === 0 && seats <= resource.capacity ? resource.capacity : null
    }
    const used = clashes.reduce((sum, b) => sum + b.seats, 0)
    const left = resource.capacity - used
    return left >= seats ? left : null
  }

  // Începuturile posibile: din pas în pas, de la începutul fiecărui interval de program.
  const starts = new Set<number>()
  for (const { working } of resources.values()) {
    for (const [s, e] of working) {
      for (let t = s; t + durationMs <= e; t += stepMs) {
        if (t >= earliest && t <= latest) starts.add(t)
      }
    }
  }

  const slots: Slot[] = []
  for (const start of [...starts].sort((a, b) => a - b)) {
    let seatsLeft: number | null = null
    const resourceOptions: string[][] = []
    let ok = true
    for (const group of groups) {
      const free: string[] = []
      let bestShared = -1
      for (const r of group) {
        const left = remaining(r.id, start)
        if (left === null) continue
        free.push(r.id)
        if (r.bookingMode === "shared") bestShared = Math.max(bestShared, left)
      }
      if (free.length === 0) {
        ok = false
        break
      }
      resourceOptions.push(free)
      if (bestShared >= 0) seatsLeft = seatsLeft === null ? bestShared : Math.min(seatsLeft, bestShared)
    }
    if (!ok) continue
    slots.push({
      start: iso(start),
      end: iso(start + durationMs),
      startLocal: localString(start, timeZone),
      endLocal: localString(start + durationMs, timeZone),
      resourceOptions,
      seatsLeft,
    })
  }
  return slots
}
