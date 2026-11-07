import { z } from "zod"

import { defineTool, fail } from "./types"

export const handoffToHuman = defineTool({
  name: "handoff_to_human",
  description:
    "Creează un caz pentru echipa firmei. Folosește-o când clientul cere un om, e nemulțumit sau face o reclamație, cererea e de grup mare sau ofertă specială, nu găsești un răspuns în search_faq ori nu poți rezolva după două încercări. Apoi spune-i clientului că revine cineva din echipă.",
  input: z
    .object({
      reason: z.string().trim().min(3).max(500).describe("Ce vrea clientul și de ce predai, într-o propoziție-două"),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    })
    .strict(),
  async run(ctx, input) {
    const { data, error } = await ctx.db
      .from("handoffs")
      .insert({ tenant_id: ctx.tenantId, conversation_id: ctx.conversationId, reason: input.reason, priority: input.priority })
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    return { ok: true, handoff_id: data.id, nota: "Cazul a ajuns la echipa firmei." }
  },
})

export const transferCall = defineTool({
  name: "transfer_call",
  description:
    "Transferă apelul către un om din echipă. Doar la telefon și doar în intervalul în care echipa preia apeluri; în afara lui folosește handoff_to_human.",
  channels: ["phone"],
  input: z.object({ reason: z.string().trim().max(300).optional() }).strict(),
  async run(ctx, input) {
    if (!ctx.profile.handoffPhone) return fail("transfer_unavailable", "Firma nu are un număr pentru transfer. Folosește handoff_to_human.")
    await ctx.db
      .from("handoffs")
      .insert({ tenant_id: ctx.tenantId, conversation_id: ctx.conversationId, reason: input.reason ?? "Apel transferat", status: "open" })
    // Transferul propriu-zis îl face platforma de voce, după tură.
    return { ok: true, action: "transfer", catre: ctx.profile.handoffPhone }
  },
})

export const endCall = defineTool({
  name: "end_call",
  description: "Închide apelul, după ce te-ai despărțit politicos de client. Doar la telefon.",
  channels: ["phone"],
  input: z.object({}).strict(),
  async run() {
    return { ok: true, action: "end_call" }
  },
})

export const classifyEmail = defineTool({
  name: "classify_email",
  description:
    "Marchează un e-mail care nu vine de la un client (furnizor, factură, newsletter, spam). Un astfel de e-mail nu primește răspuns. Doar pe e-mail.",
  channels: ["email"],
  input: z
    .object({
      category: z.enum(["supplier", "invoice", "newsletter", "spam", "other_not_customer"]),
      reason: z.string().trim().max(300).optional(),
    })
    .strict(),
  async run(ctx, input) {
    const { error } = await ctx.db
      .from("conversations")
      .update({ outcome: "spam", status: "closed", ended_at: ctx.now.toISOString(), summary: `E-mail marcat: ${input.category}. ${input.reason ?? ""}`.trim() })
      .eq("id", ctx.conversationId)
      .eq("tenant_id", ctx.tenantId)
    if (error) throw new Error(error.message)
    return { ok: true, action: "no_reply" }
  },
})
