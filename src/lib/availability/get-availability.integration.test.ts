/**
 * getAvailability pe baza de date reală, cu salonul demo din supabase/seed.sql.
 * Rulează doar cu Supabase local pornit:
 *
 *   npm run db:start && npm run db:reset
 *   npm run test:db
 *
 * (test:db citește URL-ul și cheia secretă din `supabase status`.)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, describe, expect, it } from "vitest"

import type { Database } from "@/lib/supabase/database.types"

import { getAvailability } from "./get-availability"

const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SECRET_KEY

const SALON = "b0000000-0000-4000-8000-000000000001"
const ANA = "c0000000-0000-4000-8000-000000000001"
const MIHAI = "c0000000-0000-4000-8000-000000000002"
const IOANA = "c0000000-0000-4000-8000-000000000003"
const TUNS_DAMA = "d0000000-0000-4000-8000-000000000001" // 45 min + 5 pauză, Ana sau Mihai
const FACIAL = "d0000000-0000-4000-8000-000000000008" // 60 min + 10 pauză, Ioana

// Luni, 7 ianuarie 2030: Ana lucrează 9–17, Mihai nu lucrează lunea.
const MONDAY = { from: "2030-01-07T00:00:00+02:00", to: "2030-01-08T00:00:00+02:00" }
const NOW = "2030-01-06T12:00:00+02:00"

describe.skipIf(!url || !key)("getAvailability pe Supabase local", () => {
  // Creat la primul test: corpul lui describe rulează chiar și când e sărit.
  let client: SupabaseClient<Database> | undefined
  const connect = () => (client ??= createClient<Database>(url!, key!, { auth: { persistSession: false } }))
  const cleanup: (() => PromiseLike<unknown>)[] = []
  afterAll(async () => {
    for (const undo of cleanup.reverse()) await undo()
  })

  const local = (slots: { startLocal: string }[]) => slots.map((s) => s.startLocal.slice(11, 16))

  it("citește programul, durata și pauza serviciului", async () => {
    const db = connect()
    const slots = await getAvailability(SALON, TUNS_DAMA, MONDAY.from, MONDAY.to, undefined, { client: db, now: NOW })
    expect(slots[0].startLocal).toBe("2030-01-07T09:00:00+02:00")
    expect(local(slots).at(-1)).toBe("16:15") // 16:15 + 45 min = 17:00, ora de închidere
    expect(slots).toHaveLength(30)
    expect(slots.every((s) => s.resourceOptions[0].join() === ANA)).toBe(true)
  })

  it("ține cont de o rezervare din baza de date (cu pauza ei)", async () => {
    const db = connect()
    const { data, error } = await db
      .from("bookings")
      .insert({
        tenant_id: SALON,
        service_id: TUNS_DAMA,
        resource_id: ANA,
        period: "[2030-01-07T10:00:00+02:00,2030-01-07T10:50:00+02:00)",
        status: "confirmed",
      })
      .select("id")
      .single()
    expect(error).toBeNull()
    cleanup.push(() => db.from("bookings").delete().eq("id", data!.id))

    const slots = await getAvailability(SALON, TUNS_DAMA, MONDAY.from, MONDAY.to, undefined, { client: db, now: NOW })
    const times = local(slots)
    expect(times).toContain("09:00")
    expect(times).not.toContain("09:15") // 09:15–10:05 ar intra peste rezervare
    expect(times).not.toContain("10:45")
    expect(times).toContain("11:00")
    expect(slots).toHaveLength(23)
  })

  it("dă alternativele în ordinea angajaților", async () => {
    const db = connect()
    const tuesday = await getAvailability(
      SALON,
      TUNS_DAMA,
      "2030-01-08T10:00:00+02:00",
      "2030-01-08T10:15:00+02:00",
      undefined,
      { client: db, now: NOW }
    )
    expect(tuesday[0].resourceOptions).toEqual([[ANA, MIHAI]])
  })

  it("închide ziua de Crăciun pentru tot salonul", async () => {
    const db = connect()
    const slots = await getAvailability(
      SALON,
      TUNS_DAMA,
      "2026-12-25T00:00:00+02:00",
      "2026-12-26T00:00:00+02:00",
      undefined,
      { client: db, now: "2026-12-20T12:00:00+02:00" }
    )
    expect(slots).toEqual([])
  })

  it("citește grupurile de cerință: angajat ȘI cabinet", async () => {
    const db = connect()
    const { data: room } = await db
      .from("resources")
      .insert({ tenant_id: SALON, kind: "room", name: "Cabinet cosmetică (test)" })
      .select("id")
      .single()
    cleanup.push(() => db.from("resources").delete().eq("id", room!.id))
    await db.from("service_resources").insert({ tenant_id: SALON, service_id: FACIAL, resource_id: room!.id, requirement: 2 })
    cleanup.push(() => db.from("service_resources").delete().eq("resource_id", room!.id))
    await db.from("availability_rules").insert({ tenant_id: SALON, resource_id: room!.id, weekday: 1, starts_at: "12:00", ends_at: "14:00" })
    cleanup.push(() => db.from("availability_rules").delete().eq("resource_id", room!.id))

    const slots = await getAvailability(SALON, FACIAL, MONDAY.from, MONDAY.to, undefined, { client: db, now: NOW })
    // Ioana lucrează 11–19, cabinetul doar 12–14: serviciul de 60 de minute încape 12:00–13:00.
    expect(local(slots)).toEqual(["12:00", "12:15", "12:30", "12:45", "13:00"])
    expect(slots[0].resourceOptions).toEqual([[IOANA], [room!.id]])
  })

  it("nu găsește serviciul altei firme", async () => {
    const db = connect()
    await expect(
      getAvailability("b0000000-0000-4000-8000-0000000000ff", TUNS_DAMA, MONDAY.from, MONDAY.to, undefined, {
        client: db,
        now: NOW,
      })
    ).rejects.toThrow()
  })
})
