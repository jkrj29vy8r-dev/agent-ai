import type Anthropic from "@anthropic-ai/sdk"
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod"
import { z } from "zod"

import type { Json } from "@/lib/supabase/database.types"

import { loadMessages } from "./agent"
import { AGENT_MODEL, FALLBACK, SUMMARY_EFFORT } from "./config"
import { fold } from "./tools/format"
import { SUMMARY_PROMPT, renderTemplate } from "./prompts"
import type { Db } from "./system-prompt"
import type { MessageRow } from "./history"

/** Forma rezumatului, exact ca în promptul din plan. */
export const SummarySchema = z.object({
  rezumat: z.string(),
  intentie: z.enum(["rezervare", "modificare", "anulare", "informatii", "reclamatie", "altele"]),
  rezultat: z.enum(["rezervat", "neterminat", "predat_la_om", "fara_actiune"]),
  sentiment: z.enum(["pozitiv", "neutru", "negativ"]),
  actiune_necesara: z.string().nullable(),
  intrebari_fara_raspuns: z.array(z.string()),
})
export type Summary = z.infer<typeof SummarySchema>

const OUTCOME = {
  rezervat: "booked",
  predat_la_om: "handoff",
  neterminat: "abandoned",
  fara_actiune: "answered",
} as const

/** Transcrierea pe care o citește modelul de rezumat: replici și ce unelte s-au folosit. */
export function transcript(rows: MessageRow[]) {
  return rows
    .filter((r) => r.role !== "system")
    .map((r) => {
      if (r.role === "customer") return `Client: ${r.content}`
      if (r.role === "agent") return r.content ? `Asistent: ${r.content}` : null
      if (r.role === "staff") return `Echipa firmei: ${r.content}`
      if (r.role === "tool") {
        const out = r.tool_output as { ok?: boolean; code?: string } | null
        return `[Asistentul a folosit ${r.tool_name}: ${out?.ok ? "reușit" : `nereușit (${out?.code ?? "eroare"})`}]`
      }
      return null
    })
    .filter(Boolean)
    .join("\n")
}

/**
 * Încheie conversația: rulează promptul de rezumat (cu ieșire JSON
 * validată), salvează rezultatul și transformă întrebările fără răspuns în
 * sugestii de întrebări frecvente pentru firmă.
 */
export async function endConversation(db: Db, claude: Anthropic, conversationId: string, now = new Date()) {
  const { data: conversation, error } = await db
    .from("conversations")
    .select("id, tenant_id, status, outcome, tenants(name)")
    .eq("id", conversationId)
    .single()
  if (error) throw new Error(error.message)

  const rows = await loadMessages(db, conversationId)
  const closeOnly = { status: "closed" as const, ended_at: now.toISOString() }

  // Fără mesaje, sau un e-mail marcat ca spam: nu e nimic de rezumat.
  if (rows.every((r) => r.role !== "customer") || conversation.outcome === "spam") {
    await db.from("conversations").update(closeOnly).eq("id", conversationId)
    return null
  }

  const response = await claude.beta.messages.parse({
    model: AGENT_MODEL,
    max_tokens: 4_000,
    system: renderTemplate(SUMMARY_PROMPT, { business_name: conversation.tenants?.name ?? "firmei" }),
    messages: [{ role: "user", content: transcript(rows) }],
    output_config: { effort: SUMMARY_EFFORT, format: betaZodOutputFormat(SummarySchema) },
    ...FALLBACK,
  })
  const summary = response.parsed_output
  if (!summary) throw new Error(`Rezumatul nu a respectat formatul (stop_reason: ${response.stop_reason}).`)

  await db
    .from("conversations")
    .update({
      ...closeOnly,
      summary: summary.rezumat,
      summary_data: summary as unknown as Json,
      outcome: OUTCOME[summary.rezultat],
    })
    .eq("id", conversationId)

  await db.from("usage_events").insert([
    { tenant_id: conversation.tenant_id, conversation_id: conversationId, kind: "ai_input_tokens", quantity: response.usage.input_tokens, metadata: { model: response.model, purpose: "summary" } },
    { tenant_id: conversation.tenant_id, conversation_id: conversationId, kind: "ai_output_tokens", quantity: response.usage.output_tokens, metadata: { model: response.model, purpose: "summary" } },
  ])

  await suggestFaq(db, conversation.tenant_id, summary.intrebari_fara_raspuns)
  return summary
}

/** Întrebările fără răspuns devin sugestii (inactive, fără răspuns) pe care firma le completează. */
async function suggestFaq(db: Db, tenantId: string, questions: string[]) {
  const wanted = questions.map((q) => q.trim()).filter((q) => q.length >= 3)
  if (wanted.length === 0) return
  const { data: existing } = await db.from("faq_items").select("question").eq("tenant_id", tenantId)
  const known = new Set((existing ?? []).map((f) => fold(f.question)))
  const fresh = wanted.filter((q) => !known.has(fold(q)))
  if (fresh.length === 0) return
  await db
    .from("faq_items")
    .insert(fresh.map((question) => ({ tenant_id: tenantId, question, active: false, source: "suggestion" })))
}
