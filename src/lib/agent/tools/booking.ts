import { Temporal } from "temporal-polyfill"
import { z } from "zod"

import { AvailabilityError, type Slot } from "@/lib/availability/compute"
import { getAvailability } from "@/lib/availability/get-availability"

import { normalizePhone, priceLabel, slotLabel, startOfLocalDay } from "./format"
import { defineTool, fail, type ToolContext, type ToolResult } from "./types"

/* ── Ajutoare ────────────────────────────────────────────────────────────── */

const uuid = z.string().uuid()
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data trebuie să fie AAAA-LL-ZZ.")
const instantWithOffset = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/, "Folosește exact valoarea `start` întoarsă de check_availability.")

/** Erorile bazei de date care înseamnă „locul e luat”. */
const isSlotTaken = (error: { code?: string } | null) => error?.code === "23P01"

async function loadService(ctx: ToolContext, serviceId: string) {
  const { data } = await ctx.db
    .from("services")
    .select("id, name, duration_min, buffer_after_min, price_type, price, currency, deposit, active")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", serviceId)
    .maybeSingle()
  return data && data.active ? data : null
}

async function resourceNames(ctx: ToolContext, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>()
  const { data } = await ctx.db.from("resources").select("id, name").eq("tenant_id", ctx.tenantId).in("id", ids)
  return new Map((data ?? []).map((r) => [r.id, r.name]))
}

/** Telefonul verificat de canal: numărul de pe care sună sau scrie clientul. */
function verifiedPhone(ctx: ToolContext) {
  return normalizePhone(ctx.context.callerNumber ?? ctx.context.customerPhone)
}

function availabilityError(error: unknown): ToolResult {
  if (error instanceof AvailabilityError) return fail(error.code.toLowerCase(), error.message)
  throw error
}

/** Rândurile unei rezervări (un rând pe resursă), identificată prin group_id sau id. */
async function loadBookingRows(ctx: ToolContext, bookingId: string) {
  const { data, error } = await ctx.db
    .from("bookings")
    .select("id, group_id, service_id, resource_id, customer_id, period, status, seats, deposit_amount, customers(phone)")
    .eq("tenant_id", ctx.tenantId)
    .or(`group_id.eq.${bookingId},id.eq.${bookingId}`)
  if (error) throw new Error(error.message)
  return data
}

/** Doar rezervările clientului care scrie sau sună de pe numărul lui pot fi modificate. */
async function ownedBooking(ctx: ToolContext, bookingId: string) {
  const phone = verifiedPhone(ctx)
  if (!phone) {
    return {
      found: false as const,
      error: fail(
        "phone_not_verified",
        "Nu pot verifica numărul de telefon al clientului pe acest canal. Nu modifica nimic; predă la om cu handoff_to_human."
      ),
    }
  }
  const rows = await loadBookingRows(ctx, bookingId)
  const active = rows.filter((r) => r.status === "confirmed" || r.status === "pending")
  const owned = active.filter((r) => r.customers?.phone === phone)
  if (active.length === 0 || owned.length !== active.length) {
    return { found: false as const, error: fail("booking_not_found", "Nu găsesc o rezervare activă cu acest ID pentru numărul clientului.") }
  }
  const start = Temporal.Instant.from(parseStart(owned[0].period))
  return { found: true as const, rows: owned, start }
}

function parseStart(period: unknown) {
  const match = /^[[(]"?([^",]+)"?,/.exec(String(period))
  if (!match) throw new Error(`Interval invalid: ${String(period)}`)
  return match[1].replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00")
}

const hoursUntil = (ctx: ToolContext, start: Temporal.Instant) =>
  (start.epochMilliseconds - ctx.now.getTime()) / 3_600_000

function describeSlot(slot: Slot, names: Map<string, string>, timeZone: string) {
  return {
    start: slot.startLocal,
    eticheta: slotLabel(slot.start, timeZone),
    resurse: slot.resourceOptions.map((group) => group.map((id) => ({ resource_id: id, nume: names.get(id) ?? id }))),
    locuri_ramase: slot.seatsLeft,
  }
}

/* ── check_availability ──────────────────────────────────────────────────── */

export const checkAvailability = defineTool({
  name: "check_availability",
  description:
    "Sloturile libere pentru un serviciu, într-o perioadă (cel mult 14 zile), opțional la un anumit specialist. Întoarce orele exacte (`start`) de folosit la hold_slot. Apeleaz-o de fiecare dată înainte să propui ore: disponibilitatea se schimbă.",
  input: z
    .object({
      service_id: uuid.describe("ID-ul din list_services"),
      date_from: localDate.describe("Prima zi, AAAA-LL-ZZ, în fusul orar al firmei"),
      date_to: localDate.optional().describe("Ultima zi (inclusiv); implicit aceeași cu date_from"),
      resource_id: uuid.optional().describe("Specialistul preferat, dacă clientul a cerut unul"),
      after_time: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional()
        .describe("Doar sloturi după această oră locală, HH:MM"),
      seats: z.number().int().min(1).max(100).optional().describe("Câte persoane sau locuri"),
    })
    .strict(),
  async run(ctx, input) {
    const tz = ctx.profile.timezone
    const fromDay = Temporal.PlainDate.from(input.date_from)
    const toDay = Temporal.PlainDate.from(input.date_to ?? input.date_from)
    if (Temporal.PlainDate.compare(toDay, fromDay) < 0) return fail("invalid_range", "date_to e înainte de date_from.")
    if (fromDay.until(toDay).days > 13) return fail("range_too_long", "Caută cel mult 14 zile odată.")

    let slots: Slot[]
    try {
      slots = await getAvailability(
        ctx.tenantId,
        input.service_id,
        startOfLocalDay(input.date_from, tz),
        startOfLocalDay(toDay.add({ days: 1 }).toString(), tz),
        input.resource_id,
        { client: ctx.db, now: ctx.now, seats: input.seats }
      )
    } catch (error) {
      return availabilityError(error)
    }

    if (input.after_time) slots = slots.filter((s) => s.startLocal.slice(11, 16) >= input.after_time!)
    const shown = slots.slice(0, 12)
    const names = await resourceNames(ctx, [...new Set(shown.flatMap((s) => s.resourceOptions.flat()))])
    return {
      ok: true,
      sloturi: shown.map((s) => describeSlot(s, names, tz)),
      total_gasite: slots.length,
      nota: slots.length === 0 ? "Nu e nimic liber în perioada asta. Propune altă zi." : undefined,
    }
  },
})

/* ── hold_slot ───────────────────────────────────────────────────────────── */

export const holdSlot = defineTool({
  name: "hold_slot",
  description:
    "Ține un slot 10 minute cât clientul confirmă și dă datele. Apeleaz-o imediat ce clientul a ales o oră din check_availability. Un hold nou din aceeași conversație îl eliberează pe cel vechi.",
  input: z
    .object({
      service_id: uuid,
      start: instantWithOffset.describe("Valoarea `start` a slotului ales, exact cum a venit din check_availability"),
      resource_ids: z.array(uuid).max(9).optional().describe("Specialistul (sau resursele) alese dintre cele libere"),
      seats: z.number().int().min(1).max(100).optional(),
    })
    .strict(),
  async run(ctx, input) {
    const service = await loadService(ctx, input.service_id)
    if (!service) return fail("service_not_found", "Serviciul nu există sau nu mai e activ.")

    const start = Temporal.Instant.from(input.start)
    let slots: Slot[]
    try {
      slots = await getAvailability(
        ctx.tenantId,
        input.service_id,
        start.toString(),
        start.add({ minutes: 1 }).toString(),
        undefined,
        { client: ctx.db, now: ctx.now, seats: input.seats }
      )
    } catch (error) {
      return availabilityError(error)
    }
    const slot = slots.find((s) => Temporal.Instant.compare(Temporal.Instant.from(s.start), start) === 0)
    if (!slot) return fail("slot_taken", "Ora asta nu mai e liberă. Verifică din nou cu check_availability.")

    // Câte o resursă din fiecare grup: cea cerută, dacă e liberă, altfel prima.
    const chosen = slot.resourceOptions.map((group) => group.find((id) => input.resource_ids?.includes(id)) ?? group[0])

    // Un singur hold pe conversație: cel vechi se eliberează.
    await ctx.db
      .from("bookings")
      .update({ status: "cancelled", notes: "Înlocuit de un hold nou în aceeași conversație." })
      .eq("tenant_id", ctx.tenantId)
      .eq("conversation_id", ctx.conversationId)
      .eq("status", "hold")

    const groupId = crypto.randomUUID()
    const end = start.add({ minutes: service.duration_min + service.buffer_after_min })
    const { data, error } = await ctx.db
      .from("bookings")
      .insert(
        chosen.map((resourceId) => ({
          tenant_id: ctx.tenantId,
          group_id: groupId,
          service_id: service.id,
          resource_id: resourceId,
          conversation_id: ctx.conversationId,
          period: `[${start.toString()},${end.toString()})`,
          seats: input.seats ?? 1,
          status: "hold" as const,
          channel: ctx.channel,
        }))
      )
      .select("hold_expires_at")
    if (isSlotTaken(error)) return fail("slot_taken", "Altcineva a luat ora chiar acum. Propune altă variantă.")
    if (error) throw new Error(error.message)

    const names = await resourceNames(ctx, chosen)
    return {
      ok: true,
      hold_id: groupId,
      serviciu: service.name,
      cand: slotLabel(start.toString(), ctx.profile.timezone),
      cu: chosen.map((id) => names.get(id)),
      pret: priceLabel(service.price_type, service.price, service.currency),
      avans: service.deposit > 0 ? priceLabel("fixed", service.deposit, service.currency) : null,
      tinut_pana_la: slotLabel(data[0].hold_expires_at!, ctx.profile.timezone),
    }
  },
})

/* ── create_booking ──────────────────────────────────────────────────────── */

export const createBooking = defineTool({
  name: "create_booking",
  description:
    "Transformă hold-ul în rezervare. Apeleaz-o DOAR după ce ai recapitulat serviciul, data, ora, specialistul, numele, telefonul, prețul și avansul și clientul a spus „da”. Rezervarea e confirmată doar dacă unealta întoarce ok: true.",
  input: z
    .object({
      hold_id: uuid.describe("hold_id întors de hold_slot"),
      customer_name: z.string().trim().min(2).max(120),
      customer_phone: z.string().trim().max(30).optional().describe("Doar dacă nu e deja cunoscut din canal"),
      customer_email: z.string().trim().email().max(200).optional(),
      notes: z.string().trim().max(500).optional().describe("Datele cerute în plus de firmă"),
    })
    .strict(),
  async run(ctx, input) {
    const { data: rows, error } = await ctx.db
      .from("bookings")
      .select("id, service_id, period, status, hold_expires_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("group_id", input.hold_id)
      .eq("conversation_id", ctx.conversationId) // doar hold-urile puse în conversația asta
    if (error) throw new Error(error.message)
    const holds = rows.filter((r) => r.status === "hold")
    if (holds.length === 0) return fail("hold_not_found", "Nu găsesc acest hold în conversație. Pune altul cu hold_slot.")
    if (holds.some((h) => new Date(h.hold_expires_at!).getTime() <= ctx.now.getTime()))
      return fail("hold_expired", "Au trecut cele 10 minute și ora nu mai e ținută. Verifică din nou disponibilitatea.")

    // Telefonul verificat de canal are prioritate față de ce scrie clientul.
    const phone = verifiedPhone(ctx) ?? normalizePhone(input.customer_phone)
    const email = (ctx.context.customerEmail ?? input.customer_email)?.toLowerCase() ?? null
    if (input.customer_phone && !normalizePhone(input.customer_phone))
      return fail("invalid_phone", "Numărul de telefon nu pare valid. Cere-l din nou, cifră cu cifră.")
    if (!phone && !email) return fail("contact_missing", "Ai nevoie de telefonul sau e-mailul clientului.")

    // Clientul: îl găsim după telefon (sau e-mail) în firma asta, altfel îl creăm.
    const lookup = ctx.db.from("customers").select("id, name").eq("tenant_id", ctx.tenantId)
    const { data: existing } = phone ? await lookup.eq("phone", phone).maybeSingle() : await lookup.eq("email", email!).maybeSingle()
    let customerId = existing?.id
    if (!customerId) {
      const { data: created, error: insertError } = await ctx.db
        .from("customers")
        .insert({ tenant_id: ctx.tenantId, name: input.customer_name, phone, email })
        .select("id")
        .single()
      if (insertError) return fail("invalid_customer", "Datele clientului nu sunt valide.", { detaliu: insertError.message })
      customerId = created.id
    } else if (!existing?.name) {
      await ctx.db.from("customers").update({ name: input.customer_name }).eq("id", customerId).eq("tenant_id", ctx.tenantId)
    }

    const service = await loadService(ctx, holds[0].service_id)
    const { data: rules } = await ctx.db.from("booking_rules").select("confirmation_mode").eq("tenant_id", ctx.tenantId).maybeSingle()
    const status = rules?.confirmation_mode === "manual" ? ("pending" as const) : ("confirmed" as const)
    const deposit = service?.deposit ?? 0

    const { error: updateError } = await ctx.db
      .from("bookings")
      .update({
        status,
        customer_id: customerId,
        deposit_amount: deposit,
        payment_status: deposit > 0 ? "pending" : "none",
        notes: input.notes ?? null,
      })
      .eq("tenant_id", ctx.tenantId)
      .eq("group_id", input.hold_id)
      .eq("status", "hold")
    if (isSlotTaken(updateError)) return fail("hold_expired", "Ora nu mai e ținută. Verifică din nou disponibilitatea.")
    if (updateError) throw new Error(updateError.message)

    await ctx.db.from("conversations").update({ customer_id: customerId }).eq("id", ctx.conversationId).eq("tenant_id", ctx.tenantId)

    return {
      ok: true,
      booking_id: input.hold_id,
      status: status === "confirmed" ? "confirmată" : "trimisă firmei spre confirmare",
      serviciu: service?.name,
      cand: slotLabel(parseStart(holds[0].period), ctx.profile.timezone),
      avans: deposit > 0 ? priceLabel("fixed", deposit, service?.currency ?? "RON") : null,
    }
  },
})

/* ── find_customer_bookings ──────────────────────────────────────────────── */

export const findCustomerBookings = defineTool({
  name: "find_customer_bookings",
  description:
    "Rezervările viitoare ale clientului, după numărul de telefon de pe care sună sau scrie (verificat de canal, nu cel spus de client). Folosește-o înainte de orice mutare sau anulare.",
  input: z.object({}).strict(),
  async run(ctx) {
    const phone = verifiedPhone(ctx)
    if (!phone)
      return fail("phone_not_verified", "Nu pot identifica clientul după telefon pe acest canal. Predă la om cu handoff_to_human.")

    const { data: customer } = await ctx.db.from("customers").select("id").eq("tenant_id", ctx.tenantId).eq("phone", phone).maybeSingle()
    if (!customer) return { ok: true, rezervari: [] }

    const { data, error } = await ctx.db
      .from("bookings")
      .select("id, group_id, period, status, services(name), resources(name)")
      .eq("tenant_id", ctx.tenantId)
      .eq("customer_id", customer.id)
      .in("status", ["pending", "confirmed"])
    if (error) throw new Error(error.message)
    // Doar cele viitoare (filtrul pe capătul unui interval nu e disponibil prin REST).
    const rows = data.filter((r) => new Date(parseStart(r.period)).getTime() > ctx.now.getTime())

    const byBooking = new Map<string, typeof rows>()
    for (const r of rows) byBooking.set(r.group_id ?? r.id, [...(byBooking.get(r.group_id ?? r.id) ?? []), r])
    return {
      ok: true,
      rezervari: [...byBooking.entries()].map(([id, group]) => ({
        booking_id: id,
        serviciu: group[0].services?.name,
        cand: slotLabel(parseStart(group[0].period), ctx.profile.timezone),
        start: Temporal.Instant.from(parseStart(group[0].period))
          .toZonedDateTimeISO(ctx.profile.timezone)
          .toString({ timeZoneName: "never" }),
        cu: group.map((g) => g.resources?.name),
        status: group[0].status === "confirmed" ? "confirmată" : "așteaptă confirmarea firmei",
      })),
    }
  },
})

/* ── reschedule_booking ──────────────────────────────────────────────────── */

export const rescheduleBooking = defineTool({
  name: "reschedule_booking",
  description:
    "Mută o rezervare a clientului la o oră nouă, păstrând aceeași persoană sau resursă. Verifică întâi ora nouă cu check_availability (cu resource_id-ul rezervării) și cere acordul clientului.",
  input: z
    .object({
      booking_id: uuid.describe("booking_id din find_customer_bookings"),
      new_start: instantWithOffset.describe("Valoarea `start` a noului slot, din check_availability"),
    })
    .strict(),
  async run(ctx, input) {
    const owned = await ownedBooking(ctx, input.booking_id)
    if (!owned.found) return owned.error
    if (hoursUntil(ctx, owned.start) < ctx.profile.cancellationNoticeHours)
      return fail("too_late", `Rezervarea începe în mai puțin de ${ctx.profile.cancellationNoticeHours} de ore și nu se mai poate muta. Predă la om.`)

    const first = owned.rows[0]
    const service = await loadService(ctx, first.service_id)
    if (!service) return fail("service_not_found", "Serviciul rezervării nu mai e activ. Predă la om.")

    const start = Temporal.Instant.from(input.new_start)
    let slots: Slot[]
    try {
      slots = await getAvailability(ctx.tenantId, service.id, start.toString(), start.add({ minutes: 1 }).toString(), undefined, {
        client: ctx.db,
        now: ctx.now,
        seats: first.seats,
        excludeBookingIds: owned.rows.map((r) => r.id),
      })
    } catch (error) {
      return availabilityError(error)
    }
    const slot = slots.find((s) => Temporal.Instant.compare(Temporal.Instant.from(s.start), start) === 0)
    const sameResourcesFree = slot && owned.rows.every((r) => slot.resourceOptions.some((group) => group.includes(r.resource_id)))
    if (!sameResourcesFree) return fail("slot_taken", "Ora nouă nu e liberă la aceeași persoană. Propune altă oră.")

    const end = start.add({ minutes: service.duration_min + service.buffer_after_min })
    const { error } = await ctx.db
      .from("bookings")
      .update({ period: `[${start.toString()},${end.toString()})` })
      .eq("tenant_id", ctx.tenantId)
      .in(
        "id",
        owned.rows.map((r) => r.id)
      )
    if (isSlotTaken(error)) return fail("slot_taken", "Altcineva a luat ora chiar acum. Propune altă variantă.")
    if (error) throw new Error(error.message)
    return { ok: true, booking_id: input.booking_id, serviciu: service.name, noua_ora: slotLabel(start.toString(), ctx.profile.timezone) }
  },
})

/* ── cancel_booking ──────────────────────────────────────────────────────── */

export const cancelBooking = defineTool({
  name: "cancel_booking",
  description:
    "Anulează o rezervare a clientului și aplică politica de anulare. Cere confirmarea clientului înainte. Spune-i dacă anularea e târzie și ce se întâmplă cu avansul.",
  input: z
    .object({
      booking_id: uuid.describe("booking_id din find_customer_bookings"),
      reason: z.string().trim().max(300).optional(),
    })
    .strict(),
  async run(ctx, input) {
    const owned = await ownedBooking(ctx, input.booking_id)
    if (!owned.found) return owned.error
    const late = hoursUntil(ctx, owned.start) < ctx.profile.cancellationNoticeHours
    const deposit = owned.rows.reduce((sum, r) => sum + Number(r.deposit_amount), 0)

    const { error } = await ctx.db
      .from("bookings")
      .update({ status: "cancelled", notes: input.reason ? `Anulată de client: ${input.reason}` : "Anulată de client." })
      .eq("tenant_id", ctx.tenantId)
      .in(
        "id",
        owned.rows.map((r) => r.id)
      )
    if (error) throw new Error(error.message)
    return {
      ok: true,
      booking_id: input.booking_id,
      anulare_tarzie: late,
      avans_retinut: late && deposit > 0,
      politica: ctx.profile.cancellationPolicy,
    }
  },
})

/* ── send_payment_link ───────────────────────────────────────────────────── */

export const sendPaymentLink = defineTool({
  name: "send_payment_link",
  description: "Trimite clientului linkul de plată pentru avansul unei rezervări din această conversație. Nu cere niciodată date de card.",
  input: z.object({ booking_id: uuid }).strict(),
  async run(ctx, input) {
    const { data } = await ctx.db
      .from("bookings")
      .select("deposit_amount, conversation_id")
      .eq("tenant_id", ctx.tenantId)
      .eq("group_id", input.booking_id)
    const rows = (data ?? []).filter((r) => r.conversation_id === ctx.conversationId)
    if (rows.length === 0) return fail("booking_not_found", "Nu găsesc rezervarea în această conversație.")
    if (rows.every((r) => Number(r.deposit_amount) === 0)) return { ok: true, nota: "Rezervarea nu are avans; nu e nimic de plătit." }
    // Plățile (Stripe) vin în etapa de facturare; până atunci nu trimitem linkuri.
    return fail(
      "payments_not_configured",
      "Plata online a avansului nu e încă activată. Spune-i clientului că echipa îl contactează pentru avans și folosește handoff_to_human."
    )
  },
})
