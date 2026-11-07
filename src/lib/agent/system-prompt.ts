import type { SupabaseClient } from "@supabase/supabase-js"

import type { Channel } from "@/lib/channels"
import type { Database } from "@/lib/supabase/database.types"
import { VERTICAL_SINGULAR } from "@/lib/verticals"

import { CHANNEL_PROMPTS, MASTER_PROMPT, renderTemplate } from "./prompts"

export type Db = SupabaseClient<Database>

/** Ce știe backend-ul despre client din canal (nu din ce spune clientul). */
export type ConversationContext = {
  /** Numărul de pe care sună clientul (telefon). */
  callerNumber?: string
  /** Numărul de WhatsApp al clientului. */
  customerPhone?: string
  /** Adresa de e-mail de la care scrie clientul. */
  customerEmail?: string
}

/** Datele firmei din care se completează promptul. */
export type AgentProfile = {
  tenantId: string
  businessName: string
  vertical: string | null
  address: string | null
  timezone: string
  agentName: string
  tone: "formal" | "friendly"
  addressForm: "tu" | "dumneavoastra"
  greeting: string | null
  extraInstructions: string | null
  forbidden: string | null
  handoffRules: string | null
  humanHours: string | null
  handoffPhone: string | null
  emailSignature: string | null
  requiredFields: string[]
  cancellationPolicy: string | null
  cancellationNoticeHours: number
  maxGroupSize: number
}

export async function loadAgentProfile(db: Db, tenantId: string): Promise<AgentProfile> {
  const [tenant, settings, rules] = await Promise.all([
    db.from("tenants").select("name, vertical, address, timezone").eq("id", tenantId).single(),
    db.from("agent_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    db.from("booking_rules").select("*").eq("tenant_id", tenantId).maybeSingle(),
  ])
  if (tenant.error) throw new Error(`Agent: firma ${tenantId} nu există (${tenant.error.message}).`)
  if (settings.error) throw new Error(`Agent: nu am putut citi setările (${settings.error.message}).`)
  if (rules.error) throw new Error(`Agent: nu am putut citi regulile (${rules.error.message}).`)

  const s = settings.data
  const r = rules.data
  const required = Array.isArray(r?.required_fields) ? r.required_fields.filter((f): f is string => typeof f === "string") : []

  return {
    tenantId,
    businessName: tenant.data.name,
    vertical: tenant.data.vertical,
    address: tenant.data.address,
    timezone: tenant.data.timezone,
    agentName: s?.agent_name ?? "asistentul virtual",
    tone: s?.tone ?? "friendly",
    addressForm: s?.address_form ?? "dumneavoastra",
    greeting: s?.greeting ?? null,
    extraInstructions: s?.extra_instructions ?? null,
    forbidden: s?.forbidden ?? null,
    handoffRules: s?.handoff_rules ?? null,
    humanHours: s?.human_hours ?? null,
    handoffPhone: s?.handoff_phone ?? null,
    emailSignature: s?.email_signature ?? null,
    requiredFields: required,
    cancellationPolicy: r?.cancellation_policy ?? null,
    cancellationNoticeHours: r?.cancellation_notice_hours ?? 24,
    maxGroupSize: r?.max_group_size ?? 6,
  }
}

const CHANNEL_NAME: Record<Channel, string> = { phone: "telefon", whatsapp: "WhatsApp", email: "e-mail" }

/** Data și ora în română, în fusul firmei: „sâmbătă, 7 noiembrie 2026 la 14:05”. */
export function formatNow(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now)
}

const orFallback = (value: string | null | undefined, fallback: string) =>
  value && value.trim() ? value.trim() : fallback

/**
 * Promptul de sistem: master + completarea canalului. Se construiește o dată,
 * la începutul conversației, și se salvează (conversations.system_prompt).
 * Nu se reconstruiește în aceeași conversație: istoricul trebuie să rămână
 * neschimbat, altfel blocurile de gândire anterioare devin invalide.
 */
export function buildSystemPrompt(profile: AgentProfile, channel: Channel, context: ConversationContext, now: Date): string {
  const city = profile.address?.split(",").at(-1)?.trim() || "România"
  const extraFields = profile.requiredFields.filter((f) => !["nume", "telefon"].includes(f.toLowerCase()))

  const instructions = [
    profile.extraInstructions,
    profile.forbidden && `Nu ai voie: ${profile.forbidden}`,
    profile.handoffRules && `Când predai la om: ${profile.handoffRules}`,
  ].filter(Boolean)

  const policy = [
    profile.cancellationPolicy,
    `Anulările și mutările se fac cu cel puțin ${profile.cancellationNoticeHours} de ore înainte.`,
  ]
    .filter(Boolean)
    .join(" ")

  const vars: Record<string, string> = {
    agent_name: profile.agentName,
    business_name: profile.businessName,
    business_type: (profile.vertical && VERTICAL_SINGULAR[profile.vertical]) || orFallback(profile.vertical, "firmă"),
    city,
    now: formatNow(now, profile.timezone),
    timezone: profile.timezone,
    channel: CHANNEL_NAME[channel],
    formality: profile.addressForm === "tu" ? "„tu”" : "„dumneavoastră”",
    tone: profile.tone === "formal" ? "formal și politicos" : "prietenos și cald",
    business_summary: [profile.businessName, profile.address && `Adresa: ${profile.address}.`].filter(Boolean).join(". "),
    custom_instructions: instructions.length ? instructions.join("\n") : "Nu sunt instrucțiuni suplimentare.",
    extra_fields: extraFields.length ? extraFields.join(", ") : "nimic altceva",
    cancellation_policy: policy,
    group_limit: String(profile.maxGroupSize),
    greeting: orFallback(profile.greeting, "Bună ziua!"),
    caller_number: orFallback(context.callerNumber, "necunoscut (cere-l clientului)"),
    customer_phone: orFallback(context.customerPhone, "necunoscut (cere-l clientului)"),
    human_hours: orFallback(profile.humanHours, "niciunul (nu transferi apeluri)"),
    email_signature: orFallback(profile.emailSignature, `${profile.agentName}, asistentul virtual al ${profile.businessName}`),
  }

  return `${renderTemplate(MASTER_PROMPT, vars)}\n\n${renderTemplate(CHANNEL_PROMPTS[channel], vars)}`
}

/**
 * Ora curentă la fiecare mesaj al clientului, ca mesaj de sistem adăugat în
 * istoric (nu prin schimbarea promptului de sistem, care rămâne înghețat).
 */
export function timeNotice(now: Date, timeZone: string) {
  return `Data și ora curentă: ${formatNow(now, timeZone)} (${timeZone}).`
}
