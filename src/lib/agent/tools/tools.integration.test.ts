/* eslint-disable @typescript-eslint/no-explicit-any -- rezultatele uneltelor sunt JSON citit liber */
/**
 * Uneltele agentului pe Supabase local, cu salonul demo din seed.
 *   npm run db:start && npm run db:reset && npm run test:db
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { Temporal } from "temporal-polyfill"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Channel } from "@/lib/channels"
import type { Database } from "@/lib/supabase/database.types"

import { loadAgentProfile, type AgentProfile, type ConversationContext } from "../system-prompt"
import { executeTool } from "./registry"
import type { ToolContext } from "./types"

const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SECRET_KEY

const SALON = "b0000000-0000-4000-8000-000000000001"
const ANA = "c0000000-0000-4000-8000-000000000001"
const TUNS_DAMA = "d0000000-0000-4000-8000-000000000001"
const BALAYAGE = "d0000000-0000-4000-8000-000000000006"
const PHONE = "+40722000091"
const OTHER_PHONE = "+40722000092"

/** Prima miercuri la cel puțin 7 zile, în afara zilelor închise din seed. */
function nextFreeWednesday() {
  const closed = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-12-25", "2026-12-26", "2027-01-01", "2027-01-02"]
  let day = Temporal.Now.plainDateISO("Europe/Bucharest").add({ days: 7 })
  while (day.dayOfWeek !== 3 || closed.includes(day.toString())) day = day.add({ days: 1 })
  return day.toString()
}

describe.skipIf(!url || !key)("uneltele agentului pe Supabase local", () => {
  let db: SupabaseClient<Database>
  let profile: AgentProfile
  const conversations: string[] = []
  const DAY = nextFreeWednesday()
  const at = (hhmm: string, plusDays = 0) =>
    Temporal.PlainDateTime.from(`${DAY}T${hhmm}`)
      .add({ days: plusDays })
      .toZonedDateTime("Europe/Bucharest")
      .toString({ timeZoneName: "never" })

  async function ctx(channel: Channel, context: ConversationContext = {}): Promise<ToolContext> {
    const { data, error } = await db
      .from("conversations")
      .insert({ tenant_id: SALON, channel, context, is_test: true })
      .select("id")
      .single()
    if (error) throw error
    conversations.push(data.id)
    return { db, tenantId: SALON, conversationId: data.id, channel, context, profile, now: new Date() }
  }

  const run = async (c: ToolContext, name: string, input: unknown = {}) => (await executeTool(c, name, input)).result as Record<string, any>

  beforeAll(async () => {
    db = createClient<Database>(url!, key!, { auth: { persistSession: false } })
    profile = await loadAgentProfile(db, SALON)
  })

  afterAll(async () => {
    if (!db) return
    await db.from("handoffs").delete().in("conversation_id", conversations)
    await db.from("bookings").delete().in("conversation_id", conversations)
    await db.from("conversations").delete().in("id", conversations)
    await db.from("customers").delete().eq("tenant_id", SALON).in("phone", [PHONE, OTHER_PHONE])
  })

  it("validează intrarea și refuză uneltele altui canal", async () => {
    const c = await ctx("whatsapp", { customerPhone: PHONE })
    const bad = await executeTool(c, "check_availability", { service_id: "nu-e-uuid", date_from: "mâine" })
    expect(bad.isError).toBe(true)
    expect(bad.result).toMatchObject({ ok: false, code: "invalid_input" })
    expect((await executeTool(c, "classify_email", { category: "spam" })).result).toMatchObject({ code: "unknown_tool" })
  })

  it("list_services și get_business_info citesc datele firmei", async () => {
    const c = await ctx("whatsapp")
    const services = await run(c, "list_services")
    expect(services.servicii).toHaveLength(8)
    expect(services.servicii.find((s: any) => s.nume === "Tratament facial").pret).toBe("la cerere")
    const info = await run(c, "get_business_info")
    expect(info.program[0]).toEqual({ zi: "luni", program: "09:00–19:00" }) // Ana 9–17 + Ioana 11–19
    expect(info.program[6]).toEqual({ zi: "duminică", program: "închis" })
  })

  it("search_faq găsește răspunsul firmei, fără diacritice", async () => {
    const result = await run(await ctx("email"), "search_faq", { query: "aveti parcare la salon?" })
    expect(result.rezultate[0].intrebare).toBe("Aveți parcare?")
  })

  it("hold → rezervare, cu telefonul verificat de canal", async () => {
    const c = await ctx("whatsapp", { customerPhone: PHONE })
    const slots = await run(c, "check_availability", { service_id: TUNS_DAMA, date_from: DAY })
    expect(slots.sloturi[0].start).toBe(at("09:00"))

    const hold = await run(c, "hold_slot", { service_id: TUNS_DAMA, start: at("12:00"), resource_ids: [ANA] })
    expect(hold).toMatchObject({ ok: true, cu: ["Ana (coafor)"] })

    // Altă conversație vede ora ca ocupată la Ana.
    const other = await ctx("whatsapp", { customerPhone: OTHER_PHONE })
    const seen = await run(other, "check_availability", { service_id: TUNS_DAMA, date_from: DAY, resource_id: ANA })
    expect(seen.sloturi.map((s: any) => s.start)).not.toContain(at("12:00"))
    // …și nu poate confirma hold-ul altcuiva, nici știindu-i ID-ul.
    expect(await run(other, "create_booking", { hold_id: hold.hold_id, customer_name: "Intrus" })).toMatchObject({ code: "hold_not_found" })

    const booking = await run(c, "create_booking", { hold_id: hold.hold_id, customer_name: "Test Client", customer_phone: "0799 999 999" })
    expect(booking).toMatchObject({ ok: true, status: "confirmată" })
    const { data: customer } = await db.from("customers").select("phone").eq("tenant_id", SALON).eq("phone", PHONE).single()
    expect(customer?.phone).toBe(PHONE) // numărul canalului, nu cel dictat
  })

  it("un hold nou în aceeași conversație îl eliberează pe cel vechi", async () => {
    const c = await ctx("whatsapp", { customerPhone: OTHER_PHONE })
    const first = await run(c, "hold_slot", { service_id: TUNS_DAMA, start: at("15:00"), resource_ids: [ANA] })
    await run(c, "hold_slot", { service_id: TUNS_DAMA, start: at("15:45"), resource_ids: [ANA] })
    const { data } = await db.from("bookings").select("status").eq("group_id", first.hold_id)
    expect(data?.[0].status).toBe("cancelled")
  })

  it("un hold expirat nu se mai confirmă", async () => {
    const c = await ctx("whatsapp", { customerPhone: OTHER_PHONE })
    const hold = await run(c, "hold_slot", { service_id: TUNS_DAMA, start: at("16:15"), resource_ids: [ANA] })
    const later = { ...c, now: new Date(Date.now() + 11 * 60_000) }
    expect(await run(later, "create_booking", { hold_id: hold.hold_id, customer_name: "Prea Târziu" })).toMatchObject({ code: "hold_expired" })
  })

  it("găsește, mută și anulează doar rezervările numărului verificat", async () => {
    const c = await ctx("phone", { callerNumber: PHONE })
    const found = await run(c, "find_customer_bookings")
    const mine = found.rezervari.find((r: any) => r.start === at("12:00"))
    expect(mine).toBeDefined()

    const stranger = await ctx("phone", { callerNumber: OTHER_PHONE })
    expect(await run(stranger, "cancel_booking", { booking_id: mine.booking_id })).toMatchObject({ code: "booking_not_found" })
    expect(await run(await ctx("email"), "find_customer_bookings")).toMatchObject({ code: "phone_not_verified" })

    const moved = await run(c, "reschedule_booking", { booking_id: mine.booking_id, new_start: at("13:00") })
    expect(moved).toMatchObject({ ok: true })
    const after = await run(c, "find_customer_bookings")
    expect(after.rezervari.map((r: any) => r.start)).toContain(at("13:00"))

    expect(await run(c, "cancel_booking", { booking_id: mine.booking_id, reason: "test" })).toMatchObject({ ok: true, anulare_tarzie: false })
  })

  it("send_payment_link: fără avans nu e nimic de plătit; cu avans, plățile nu sunt încă active", async () => {
    const c = await ctx("whatsapp", { customerPhone: OTHER_PHONE })
    const hold = await run(c, "hold_slot", { service_id: BALAYAGE, start: at("09:00", 1), resource_ids: [ANA] })
    const booking = await run(c, "create_booking", { hold_id: hold.hold_id, customer_name: "Cu Avans" })
    expect(booking.avans).toBe("100 lei")
    expect(await run(c, "send_payment_link", { booking_id: hold.hold_id })).toMatchObject({ code: "payments_not_configured" })
  })

  it("handoff_to_human și classify_email scriu în baza de date", async () => {
    const c = await ctx("email", { customerEmail: "furnizor@example.test" })
    const handoff = await run(c, "handoff_to_human", { reason: "Cere ofertă pentru nuntă", priority: "high" })
    const { data: h } = await db.from("handoffs").select("priority").eq("id", handoff.handoff_id).single()
    expect(h?.priority).toBe("high")

    expect(await executeTool(c, "classify_email", { category: "invoice" })).toMatchObject({ action: "no_reply" })
    const { data: conv } = await db.from("conversations").select("status, outcome").eq("id", c.conversationId).single()
    expect(conv).toEqual({ status: "closed", outcome: "spam" })
  })
})
