import { describe, expect, it } from "vitest"

import {
  AvailabilityError,
  computeAvailability,
  type AvailabilityInput,
  type AvailabilityResource,
  type ExistingBooking,
  type Slot,
} from "./compute"

const TZ = "Europe/Bucharest"
// 7 ianuarie 2030 e luni.
const MONDAY = "2030-01-07"

const ana: AvailabilityResource = { id: "ana", name: "Ana", bookingMode: "exclusive", capacity: 1 }
const mihai: AvailabilityResource = { id: "mihai", name: "Mihai", bookingMode: "exclusive", capacity: 1 }
const cabinet: AvailabilityResource = { id: "cabinet", name: "Cabinet", bookingMode: "exclusive", capacity: 1 }
const microbuz: AvailabilityResource = { id: "microbuz", name: "Microbuz", bookingMode: "shared", capacity: 3 }

const rule = (resourceId: string, weekday: number, startsAt: string, endsAt: string) => ({
  resourceId,
  weekday,
  startsAt,
  endsAt,
})

/** Luni 9–12 la Ana, serviciu de 60 de minute, pas de 30. Fiecare test schimbă ce-l privește. */
function input(over: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    timeZone: TZ,
    now: "2030-01-01T00:00:00Z",
    from: `${MONDAY}T00:00:00+02:00`,
    to: "2030-01-08T00:00:00+02:00",
    service: { durationMin: 60, bufferAfterMin: 0 },
    bookingRules: { minNoticeMin: 0, maxAdvanceDays: 365 },
    requirements: [[ana]],
    weeklyRules: [rule("ana", 1, "09:00", "12:00")],
    exceptions: [],
    bookings: [],
    stepMin: 30,
    ...over,
  }
}

function booking(resourceId: string, from: string, to: string, extra: Partial<ExistingBooking> = {}): ExistingBooking {
  return {
    resourceId,
    start: `${MONDAY}T${from}:00+02:00`,
    end: `${MONDAY}T${to}:00+02:00`,
    seats: 1,
    status: "confirmed",
    holdExpiresAt: null,
    ...extra,
  }
}

/** Orele locale de început, "HH:MM". */
const times = (slots: Slot[]) => slots.map((s) => s.startLocal.slice(11, 16))

describe("programul și durata", () => {
  it("dă sloturile care încap în program", () => {
    expect(times(computeAvailability(input()))).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"])
  })

  it("serviciul se termină în program; pauza de după poate trece de închidere", () => {
    const slots = computeAvailability(
      input({ service: { durationMin: 45, bufferAfterMin: 15 }, weeklyRules: [rule("ana", 1, "09:00", "10:00")], stepMin: 15 })
    )
    expect(times(slots)).toEqual(["09:00", "09:15"])
    expect(slots[1].endLocal).toBe(`${MONDAY}T10:00:00+02:00`) // finalul fără pauză
  })

  it("unește intervalele de program care se suprapun și acceptă HH:MM:SS", () => {
    const slots = computeAvailability(
      input({ weeklyRules: [rule("ana", 1, "09:00:00", "11:00:00"), rule("ana", 1, "10:00", "12:00")] })
    )
    expect(times(slots)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"])
  })

  it("respectă pauza de masă dintre două intervale", () => {
    const slots = computeAvailability(input({ weeklyRules: [rule("ana", 1, "09:00", "11:00"), rule("ana", 1, "12:00", "14:00")] }))
    expect(times(slots)).toEqual(["09:00", "09:30", "10:00", "12:00", "12:30", "13:00"])
  })

  it("înțelege 24:00 ca miezul nopții de la final", () => {
    const slots = computeAvailability(input({ weeklyRules: [rule("ana", 1, "22:00", "24:00")] }))
    expect(times(slots)).toEqual(["22:00", "22:30", "23:00"])
  })

  it("nu dă nimic în zilele fără program", () => {
    const sunday = computeAvailability(input({ from: "2030-01-06T00:00:00+02:00", to: "2030-01-07T00:00:00+02:00" }))
    expect(sunday).toEqual([])
  })
})

describe("rezervările existente", () => {
  it("o rezervare confirmată ocupă locul", () => {
    const slots = computeAvailability(input({ bookings: [booking("ana", "10:00", "11:00")] }))
    expect(times(slots)).toEqual(["09:00", "11:00"])
  })

  it("pauza serviciului nou nu se poate suprapune cu rezervarea următoare", () => {
    const slots = computeAvailability(
      input({ service: { durationMin: 45, bufferAfterMin: 15 }, stepMin: 15, bookings: [booking("ana", "10:00", "11:00")] })
    )
    expect(times(slots)).toEqual(["09:00", "11:00", "11:15"])
  })

  it("un hold valabil ține locul, unul expirat nu", () => {
    const now = `${MONDAY}T08:00:00+02:00`
    const active = booking("ana", "09:00", "10:00", { status: "hold", holdExpiresAt: `${MONDAY}T08:05:00+02:00` })
    const stale = booking("ana", "11:00", "12:00", { status: "hold", holdExpiresAt: `${MONDAY}T07:55:00+02:00` })
    expect(times(computeAvailability(input({ now, bookings: [active, stale] })))).toEqual(["10:00", "10:30", "11:00"])
  })

  it("rezervările anulate, expirate sau neprezentate nu țin locul", () => {
    const slots = computeAvailability(
      input({
        bookings: [
          booking("ana", "09:00", "10:00", { status: "cancelled" }),
          booking("ana", "10:00", "11:00", { status: "expired" }),
          booking("ana", "11:00", "12:00", { status: "no_show" }),
        ],
      })
    )
    expect(times(slots)).toHaveLength(5)
  })

  it("o rezervare care așteaptă confirmarea firmei ține locul", () => {
    const slots = computeAvailability(input({ bookings: [booking("ana", "09:00", "12:00", { status: "pending" })] }))
    expect(slots).toEqual([])
  })
})

describe("anunțul minim și rezervarea maximă în avans", () => {
  it("nu oferă sloturi mai devreme de anunțul minim", () => {
    const slots = computeAvailability(
      input({ now: `${MONDAY}T09:20:00+02:00`, bookingRules: { minNoticeMin: 60, maxAdvanceDays: 365 } })
    )
    expect(times(slots)).toEqual(["10:30", "11:00"])
  })

  it("nu oferă sloturi trecute", () => {
    const slots = computeAvailability(input({ now: `${MONDAY}T10:10:00+02:00` }))
    expect(times(slots)).toEqual(["10:30", "11:00"])
  })

  it("nu oferă sloturi după limita de avans", () => {
    const slots = computeAvailability(
      input({ now: "2030-01-01T10:00:00+02:00", bookingRules: { minNoticeMin: 0, maxAdvanceDays: 6 } })
    )
    expect(times(slots)).toEqual(["09:00", "09:30", "10:00"])
  })
})

describe("zile închise și excepții", () => {
  it("o sărbătoare pentru toată firma închide ziua", () => {
    const holiday = { resourceId: null, kind: "closed" as const, start: `${MONDAY}T00:00:00+02:00`, end: "2030-01-08T00:00:00+02:00" }
    expect(computeAvailability(input({ exceptions: [holiday] }))).toEqual([])
  })

  it("concediul unui angajat lasă liberi colegii", () => {
    const vacation = { resourceId: "ana", kind: "closed" as const, start: `${MONDAY}T00:00:00+02:00`, end: "2030-01-08T00:00:00+02:00" }
    const slots = computeAvailability(
      input({
        requirements: [[ana, mihai]],
        weeklyRules: [rule("ana", 1, "09:00", "12:00"), rule("mihai", 1, "09:00", "12:00")],
        exceptions: [vacation],
      })
    )
    expect(slots).toHaveLength(5)
    expect(slots.every((s) => s.resourceOptions[0].join() === "mihai")).toBe(true)
  })

  it("o închidere de câteva ore scoate doar acele ore", () => {
    const closed = { resourceId: "ana", kind: "closed" as const, start: `${MONDAY}T10:00:00+02:00`, end: `${MONDAY}T11:00:00+02:00` }
    expect(times(computeAvailability(input({ exceptions: [closed] })))).toEqual(["09:00", "11:00"])
  })

  it("orele extra („open”) deschid o zi fără program", () => {
    const extra = { resourceId: "ana", kind: "open" as const, start: "2030-01-06T10:00:00+02:00", end: "2030-01-06T12:00:00+02:00" }
    const slots = computeAvailability(
      input({ from: "2030-01-06T00:00:00+02:00", to: "2030-01-07T00:00:00+02:00", exceptions: [extra] })
    )
    expect(times(slots)).toEqual(["10:00", "10:30", "11:00"])
  })
})

describe("trecerea la ora de vară și de iarnă (Europe/Bucharest)", () => {
  // 28 martie 2027, duminică: la 03:00 ceasul sare la 04:00.
  const SPRING = "2027-03-28"
  // 25 octombrie 2026, duminică: la 04:00 ceasul se dă înapoi la 03:00.
  const AUTUMN = "2026-10-25"
  const night = { service: { durationMin: 60, bufferAfterMin: 0 }, stepMin: 60, bookingRules: { minNoticeMin: 0, maxAdvanceDays: 3650 } }

  it("primăvara: ora 03:00 nu există, deci nu e slot la 03:00", () => {
    const slots = computeAvailability(
      input({
        ...night,
        now: "2027-01-01T00:00:00Z",
        from: `${SPRING}T00:00:00+02:00`,
        to: "2027-03-29T00:00:00+03:00",
        weeklyRules: [rule("ana", 7, "00:00", "06:00")],
      })
    )
    expect(slots.map((s) => s.startLocal.slice(11))).toEqual([
      "00:00:00+02:00",
      "01:00:00+02:00",
      "02:00:00+02:00",
      "04:00:00+03:00",
      "05:00:00+03:00",
    ])
    // În timp real, sloturile sunt tot la o oră distanță: noaptea are 5 ore lucrate.
    expect(slots.map((s) => s.start)).toEqual([
      "2027-03-27T22:00:00Z",
      "2027-03-27T23:00:00Z",
      "2027-03-28T00:00:00Z",
      "2027-03-28T01:00:00Z",
      "2027-03-28T02:00:00Z",
    ])
  })

  it("primăvara: un program care începe la o oră inexistentă (03:30) pornește după salt", () => {
    const slots = computeAvailability(
      input({
        ...night,
        now: "2027-01-01T00:00:00Z",
        from: `${SPRING}T00:00:00+02:00`,
        to: "2027-03-29T00:00:00+03:00",
        weeklyRules: [rule("ana", 7, "03:30", "06:30")],
      })
    )
    expect(slots[0].startLocal).toBe(`${SPRING}T04:30:00+03:00`)
  })

  it("toamna: ora 03:00 apare de două ori, deci noaptea are un slot în plus", () => {
    const slots = computeAvailability(
      input({
        ...night,
        now: "2026-01-01T00:00:00Z",
        from: `${AUTUMN}T00:00:00+03:00`,
        to: "2026-10-26T00:00:00+02:00",
        weeklyRules: [rule("ana", 7, "00:00", "06:00")],
      })
    )
    expect(slots.map((s) => s.startLocal.slice(11))).toEqual([
      "00:00:00+03:00",
      "01:00:00+03:00",
      "02:00:00+03:00",
      "03:00:00+03:00",
      "03:00:00+02:00",
      "04:00:00+02:00",
      "05:00:00+02:00",
    ])
  })

  it("toamna: o rezervare în prima oră 03:00 nu o blochează pe a doua", () => {
    const first = {
      resourceId: "ana",
      start: `${AUTUMN}T03:00:00+03:00`,
      end: `${AUTUMN}T03:00:00+02:00`, // o oră reală mai târziu
      seats: 1,
      status: "confirmed" as const,
      holdExpiresAt: null,
    }
    const slots = computeAvailability(
      input({
        ...night,
        now: "2026-01-01T00:00:00Z",
        from: `${AUTUMN}T00:00:00+03:00`,
        to: "2026-10-26T00:00:00+02:00",
        weeklyRules: [rule("ana", 7, "00:00", "06:00")],
        bookings: [first],
      })
    )
    const local = slots.map((s) => s.startLocal.slice(11))
    expect(local).not.toContain("03:00:00+03:00")
    expect(local).toContain("03:00:00+02:00")
  })

  it("programul rămâne la aceeași oră locală înainte și după schimbare", () => {
    const slots = computeAvailability(
      input({
        ...night,
        now: "2027-01-01T00:00:00Z",
        from: "2027-03-27T00:00:00+02:00",
        to: "2027-03-29T00:00:00+03:00",
        weeklyRules: [rule("ana", 6, "09:00", "10:00"), rule("ana", 7, "09:00", "10:00")],
      })
    )
    expect(slots.map((s) => s.startLocal)).toEqual(["2027-03-27T09:00:00+02:00", "2027-03-28T09:00:00+03:00"])
    expect(slots.map((s) => s.start)).toEqual(["2027-03-27T07:00:00Z", "2027-03-28T06:00:00Z"])
  })

  it("limita de avans se numără în zile din calendar, nu în blocuri de 24 de ore", () => {
    // Sâmbătă 12:00 + 1 zi = duminică 12:00 ora locală, adică doar 23 de ore mai târziu.
    const slots = computeAvailability(
      input({
        ...night,
        now: "2027-03-27T12:00:00+02:00",
        bookingRules: { minNoticeMin: 0, maxAdvanceDays: 1 },
        from: `${SPRING}T00:00:00+02:00`,
        to: "2027-03-29T00:00:00+03:00",
        weeklyRules: [rule("ana", 7, "09:00", "14:00")],
      })
    )
    expect(times(slots)).toEqual(["09:00", "10:00", "11:00", "12:00"])
  })
})

describe("servicii care cer două resurse", () => {
  const twoResources = {
    requirements: [[ana, mihai], [cabinet]],
    weeklyRules: [rule("ana", 1, "09:00", "12:00"), rule("mihai", 1, "09:00", "12:00"), rule("cabinet", 1, "09:00", "12:00")],
    stepMin: 60,
  }

  it("cere un angajat liber ȘI cabinetul liber", () => {
    const slots = computeAvailability(
      input({ ...twoResources, bookings: [booking("ana", "09:00", "10:00"), booking("cabinet", "10:00", "11:00")] })
    )
    expect(times(slots)).toEqual(["09:00", "11:00"])
    expect(slots[0].resourceOptions).toEqual([["mihai"], ["cabinet"]])
    expect(slots[1].resourceOptions).toEqual([["ana", "mihai"], ["cabinet"]])
  })

  it("angajatul preferat restrânge doar grupul lui", () => {
    const slots = computeAvailability(input({ ...twoResources, resourceId: "ana", bookings: [booking("ana", "09:00", "10:00")] }))
    expect(times(slots)).toEqual(["10:00", "11:00"])
    expect(slots[0].resourceOptions).toEqual([["ana"], ["cabinet"]])
  })

  it("se ține cont de programul fiecărei resurse", () => {
    const slots = computeAvailability(
      input({ ...twoResources, weeklyRules: [...twoResources.weeklyRules.slice(0, 2), rule("cabinet", 1, "10:00", "12:00")] })
    )
    expect(times(slots)).toEqual(["10:00", "11:00"])
  })

  it("dacă un grup nu are pe nimeni liber, nu e slot", () => {
    const slots = computeAvailability(input({ ...twoResources, bookings: [booking("cabinet", "09:00", "12:00")] }))
    expect(slots).toEqual([])
  })

  it("refuză o resursă care nu face serviciul", () => {
    expect(() => computeAvailability(input({ ...twoResources, resourceId: "altcineva" }))).toThrowError(AvailabilityError)
  })
})

describe("rezervări pe capacitate (locuri)", () => {
  const trip = {
    requirements: [[microbuz]],
    weeklyRules: [rule("microbuz", 1, "06:00", "16:00")],
    service: { durationMin: 600, bufferAfterMin: 0 },
  }
  const seat = (seats: number, extra: Partial<ExistingBooking> = {}) => booking("microbuz", "06:00", "16:00", { seats, ...extra })

  it("arată locurile rămase", () => {
    const slots = computeAvailability(input({ ...trip, bookings: [seat(2)] }))
    expect(slots).toHaveLength(1)
    expect(slots[0].seatsLeft).toBe(1)
  })

  it("ascunde cursa dacă nu mai sunt destule locuri pentru grup", () => {
    expect(computeAvailability(input({ ...trip, seats: 2, bookings: [seat(2)] }))).toEqual([])
  })

  it("un hold valabil ocupă locuri, unul expirat nu", () => {
    const now = `${MONDAY}T05:00:00+02:00`
    const slots = computeAvailability(
      input({
        ...trip,
        now,
        bookings: [
          seat(1, { status: "hold", holdExpiresAt: `${MONDAY}T05:05:00+02:00` }),
          seat(2, { status: "hold", holdExpiresAt: `${MONDAY}T04:55:00+02:00` }),
        ],
      })
    )
    expect(slots[0].seatsLeft).toBe(2)
  })

  it("plin = fără slot", () => {
    expect(computeAvailability(input({ ...trip, bookings: [seat(3)] }))).toEqual([])
  })

  it("o resursă exclusivă nu primește un grup mai mare decât încape", () => {
    const masa = { id: "masa", name: "Masa 4", bookingMode: "exclusive" as const, capacity: 4 }
    const base = { requirements: [[masa]], weeklyRules: [rule("masa", 1, "18:00", "20:00")] }
    expect(computeAvailability(input({ ...base, seats: 4 }))).not.toEqual([])
    expect(computeAvailability(input({ ...base, seats: 6 }))).toEqual([])
  })
})

describe("fusul orar al firmei", () => {
  it("programul e în ora locală a firmei, nu a serverului", () => {
    const slots = computeAvailability(
      input({ timeZone: "America/New_York", from: `${MONDAY}T00:00:00-05:00`, to: "2030-01-08T00:00:00-05:00" })
    )
    expect(slots[0].start).toBe(`${MONDAY}T14:00:00Z`)
    expect(slots[0].startLocal).toBe(`${MONDAY}T09:00:00-05:00`)
  })
})

describe("validarea cererii", () => {
  it("refuză un interval invers", () => {
    expect(() => computeAvailability(input({ from: "2030-01-08T00:00:00Z", to: "2030-01-07T00:00:00Z" }))).toThrowError(
      AvailabilityError
    )
  })

  it("refuză intervale mai lungi de 93 de zile", () => {
    expect(() => computeAvailability(input({ to: "2030-06-01T00:00:00Z" }))).toThrowError(/93/)
  })

  it("acceptă și obiecte Date", () => {
    const slots = computeAvailability(input({ from: new Date(`${MONDAY}T00:00:00+02:00`), to: new Date("2030-01-08T00:00:00+02:00") }))
    expect(slots).toHaveLength(5)
  })
})
