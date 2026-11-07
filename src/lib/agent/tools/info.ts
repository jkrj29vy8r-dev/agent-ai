import { z } from "zod"

import { fold, priceLabel } from "./format"
import { defineTool, fail } from "./types"

const WEEKDAYS = ["", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă", "duminică"]
const hhmm = (t: string) => t.slice(0, 5)

/** Programul firmei pe zile: reuniunea programului tuturor resurselor active. */
function weeklyHours(rules: { weekday: number; starts_at: string; ends_at: string }[]) {
  return WEEKDAYS.slice(1).map((day, i) => {
    const intervals = rules
      .filter((r) => r.weekday === i + 1)
      .map((r) => [hhmm(r.starts_at), hhmm(r.ends_at)] as [string, string])
      .sort((a, b) => a[0].localeCompare(b[0]))
    const merged: [string, string][] = []
    for (const [s, e] of intervals) {
      const last = merged.at(-1)
      if (last && s <= last[1]) last[1] = e > last[1] ? e : last[1]
      else merged.push([s, e])
    }
    return { zi: day, program: merged.length ? merged.map(([s, e]) => `${s}–${e}`).join(", ") : "închis" }
  })
}

export const getBusinessInfo = defineTool({
  name: "get_business_info",
  description:
    "Adresa, programul general pe zile, regulile de rezervare (anunț minim, cât de departe în viitor, anulare) și zilele în care firma e închisă în curând. Folosește-o când clientul întreabă unde e firma, când e deschis sau care sunt regulile.",
  input: z.object({}).strict(),
  async run({ db, tenantId, profile, now }) {
    const horizon = new Date(now.getTime() + 60 * 86_400_000).toISOString()
    const [resources, rules, closures] = await Promise.all([
      db.from("resources").select("id").eq("tenant_id", tenantId).eq("active", true),
      db.from("availability_rules").select("resource_id, weekday, starts_at, ends_at").eq("tenant_id", tenantId),
      db
        .from("availability_exceptions")
        .select("period, note")
        .eq("tenant_id", tenantId)
        .is("resource_id", null)
        .eq("kind", "closed")
        .overlaps("period", `[${now.toISOString()},${horizon})`),
    ])
    if (resources.error || rules.error || closures.error) return fail("db_error", "Nu am putut citi datele firmei.")
    const active = new Set(resources.data.map((r) => r.id))
    const booking = await db.from("booking_rules").select("*").eq("tenant_id", tenantId).maybeSingle()

    return {
      ok: true,
      nume: profile.businessName,
      adresa: profile.address,
      fus_orar: profile.timezone,
      program: weeklyHours(rules.data.filter((r) => active.has(r.resource_id))),
      reguli: {
        anunt_minim_minute: booking.data?.min_notice_min ?? 60,
        rezervare_maxima_in_avans_zile: booking.data?.max_advance_days ?? 60,
        politica_de_anulare: booking.data?.cancellation_policy ?? null,
        anulare_cu_cel_putin_ore_inainte: profile.cancellationNoticeHours,
        confirmare: booking.data?.confirmation_mode === "manual" ? "firma confirmă manual" : "automată",
      },
      inchis_in_curand: closures.data.map((c) => ({ interval: c.period, motiv: c.note })),
    }
  },
})

export const listServices = defineTool({
  name: "list_services",
  description:
    "Lista serviciilor active, cu ID, preț, durată, avans și cine le face. Folosește-o când clientul nu știe exact ce vrea, întreabă de prețuri sau înainte de check_availability ca să afli service_id.",
  input: z.object({}).strict(),
  async run({ db, tenantId }) {
    const [services, links, resources] = await Promise.all([
      db
        .from("services")
        .select("id, name, description, duration_min, price_type, price, currency, deposit")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("sort_order"),
      db.from("service_resources").select("service_id, resource_id").eq("tenant_id", tenantId),
      db.from("resources").select("id, name").eq("tenant_id", tenantId).eq("active", true),
    ])
    if (services.error || links.error || resources.error) return fail("db_error", "Nu am putut citi serviciile.")
    const names = new Map(resources.data.map((r) => [r.id, r.name]))
    return {
      ok: true,
      servicii: services.data.map((s) => ({
        service_id: s.id,
        nume: s.name,
        descriere: s.description,
        durata_minute: s.duration_min,
        pret: priceLabel(s.price_type, s.price, s.currency),
        avans: s.deposit > 0 ? priceLabel("fixed", s.deposit, s.currency) : null,
        cine_il_face: links.data
          .filter((l) => l.service_id === s.id && names.has(l.resource_id))
          .map((l) => ({ resource_id: l.resource_id, nume: names.get(l.resource_id) })),
      })),
    }
  },
})

export const searchFaq = defineTool({
  name: "search_faq",
  description:
    "Caută în întrebările frecvente ale firmei (parcare, plată, ce să aducă clientul etc.). Folosește-o pentru orice întrebare care nu e despre prețuri, program sau locuri libere. Dacă nu găsește nimic, nu inventa: spune că verifici cu echipa și folosește handoff_to_human.",
  input: z.object({ query: z.string().trim().min(2).max(300).describe("Întrebarea clientului, cu cuvintele lui") }).strict(),
  async run({ db, tenantId }, { query }) {
    const { data, error } = await db
      .from("faq_items")
      .select("question, answer")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .not("answer", "is", null)
    if (error) return fail("db_error", "Nu am putut căuta în întrebările frecvente.")

    // Potrivire simplă pe rădăcinile cuvintelor (primele 5 litere, fără diacritice).
    const stems = (text: string) => new Set(fold(text).split(/[^a-z0-9]+/).filter((w) => w.length >= 3).map((w) => w.slice(0, 5)))
    const wanted = stems(query)
    const ranked = data
      .map((f) => {
        const have = stems(`${f.question} ${f.answer}`)
        const score = [...wanted].filter((w) => have.has(w)).length / Math.max(wanted.size, 1)
        return { intrebare: f.question, raspuns: f.answer, scor: Math.round(score * 100) / 100 }
      })
      .filter((r) => r.scor > 0)
      .sort((a, b) => b.scor - a.scor)
      .slice(0, 3)

    return ranked.length
      ? { ok: true, rezultate: ranked }
      : { ok: true, rezultate: [], nota: "Nu există un răspuns al firmei la această întrebare. Nu inventa; predă la om." }
  },
})
