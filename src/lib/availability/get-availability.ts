import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/supabase/database.types"

import {
  AvailabilityError,
  computeAvailability,
  toEpochMs,
  type AvailabilityResource,
  type ExistingBooking,
  type Instantish,
  type Slot,
} from "./compute"
import { parseTstzRange, toTstzRange } from "./range"

export type GetAvailabilityOptions = {
  /** Câte locuri cere clientul (resurse „shared”). Implicit 1. */
  seats?: number
  /** Pasul dintre sloturi, în minute. Implicit 15. */
  stepMin?: number
  /** „Acum”, pentru teste. */
  now?: Instantish
  /** Clientul Supabase. Implicit cel de backend (cheia secretă), care ocolește RLS. */
  client?: SupabaseClient<Database>
  /** Rezervări de ignorat (de exemplu cea care se mută la altă oră). */
  excludeBookingIds?: string[]
}

// Aceleași valori implicite ca în tabelul booking_rules.
const DEFAULT_RULES = { minNoticeMin: 60, maxAdvanceDays: 60 }
const DAY_MS = 24 * 60 * 60 * 1000

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Disponibilitate: nu am putut citi ${what}: ${error?.message ?? "fără date"}`)
}

/**
 * Sloturile libere pentru un serviciu, între `from` și `to`.
 *
 * Folosește clientul de backend, care ocolește RLS, așa că FIECARE interogare
 * filtrează explicit după `tenantId` (regula 1 din CLAUDE.md).
 */
export async function getAvailability(
  tenantId: string,
  serviceId: string,
  from: Instantish,
  to: Instantish,
  resourceId?: string,
  options: GetAvailabilityOptions = {}
): Promise<Slot[]> {
  const db = options.client ?? createAdminClient()

  const [tenant, rules, service, links] = await Promise.all([
    db.from("tenants").select("timezone").eq("id", tenantId).maybeSingle(),
    db.from("booking_rules").select("min_notice_min, max_advance_days").eq("tenant_id", tenantId).maybeSingle(),
    db
      .from("services")
      .select("duration_min, buffer_after_min, active")
      .eq("tenant_id", tenantId)
      .eq("id", serviceId)
      .maybeSingle(),
    db.from("service_resources").select("resource_id, requirement").eq("tenant_id", tenantId).eq("service_id", serviceId),
  ])
  if (tenant.error || !tenant.data) fail("firma", tenant.error)
  if (rules.error) fail("regulile de rezervare", rules.error)
  if (service.error) fail("serviciul", service.error)
  if (links.error) fail("resursele serviciului", links.error)
  if (!service.data || !service.data.active)
    throw new AvailabilityError("SERVICE_NOT_FOUND", "Serviciul nu există sau nu mai e activ.")

  const resourceIds = [...new Set(links.data.map((l) => l.resource_id))]
  if (resourceIds.length === 0) return []

  const fromMs = toEpochMs(from)
  const toMs = toEpochMs(to)
  const occupiedMs = (service.data.duration_min + service.data.buffer_after_min) * 60_000
  const fromIso = new Date(fromMs).toISOString()
  const toIso = new Date(toMs).toISOString()

  const [resources, weekly, exceptions, bookings] = await Promise.all([
    db
      .from("resources")
      .select("id, name, booking_mode, capacity, sort_order")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .in("id", resourceIds)
      .order("sort_order")
      .order("name"),
    db
      .from("availability_rules")
      .select("resource_id, weekday, starts_at, ends_at")
      .eq("tenant_id", tenantId)
      .in("resource_id", resourceIds),
    db
      .from("availability_exceptions")
      .select("resource_id, period, kind")
      .eq("tenant_id", tenantId)
      .or(`resource_id.is.null,resource_id.in.(${resourceIds.join(",")})`)
      .overlaps("period", toTstzRange(new Date(fromMs - DAY_MS).toISOString(), new Date(toMs + DAY_MS).toISOString())),
    db
      .from("bookings")
      .select("id, resource_id, period, seats, status, hold_expires_at")
      .eq("tenant_id", tenantId)
      .in("resource_id", resourceIds)
      .in("status", ["hold", "pending", "confirmed"])
      .overlaps("period", toTstzRange(fromIso, new Date(toMs + occupiedMs).toISOString())),
  ])
  if (resources.error) fail("resursele", resources.error)
  if (weekly.error) fail("programul", weekly.error)
  if (exceptions.error) fail("excepțiile", exceptions.error)
  if (bookings.error) fail("rezervările", bookings.error)

  // Grupurile de cerință, în ordinea resurselor (sort_order, apoi nume).
  const byId = new Map<string, AvailabilityResource>(
    resources.data.map((r) => [r.id, { id: r.id, name: r.name, bookingMode: r.booking_mode, capacity: r.capacity }])
  )
  const groupNumbers = [...new Set(links.data.map((l) => l.requirement))].sort((a, b) => a - b)
  const requirements = groupNumbers.map((n) =>
    resources.data
      .filter((r) => links.data.some((l) => l.requirement === n && l.resource_id === r.id))
      .map((r) => byId.get(r.id)!)
  )

  return computeAvailability({
    timeZone: tenant.data.timezone,
    now: options.now ?? new Date(),
    from: fromIso,
    to: toIso,
    service: { durationMin: service.data.duration_min, bufferAfterMin: service.data.buffer_after_min },
    bookingRules: rules.data
      ? { minNoticeMin: rules.data.min_notice_min, maxAdvanceDays: rules.data.max_advance_days }
      : DEFAULT_RULES,
    requirements,
    weeklyRules: weekly.data.map((w) => ({
      resourceId: w.resource_id,
      weekday: w.weekday,
      startsAt: w.starts_at,
      endsAt: w.ends_at,
    })),
    exceptions: exceptions.data.flatMap((x) => {
      const span = parseTstzRange(x.period)
      return span ? [{ resourceId: x.resource_id, kind: x.kind, ...span }] : []
    }),
    bookings: bookings.data.flatMap((b): ExistingBooking[] => {
      if (options.excludeBookingIds?.includes(b.id)) return []
      const span = parseTstzRange(b.period)
      return span
        ? [{ resourceId: b.resource_id, seats: b.seats, status: b.status, holdExpiresAt: b.hold_expires_at, ...span }]
        : []
    }),
    resourceId,
    seats: options.seats,
    stepMin: options.stepMin,
  })
}
