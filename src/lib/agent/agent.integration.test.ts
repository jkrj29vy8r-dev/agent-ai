/**
 * Bucla agentului pe Supabase local, cu un client Claude simulat (fără apeluri reale).
 *   npm run db:start && npm run db:reset && npm run test:db
 */
import type Anthropic from "@anthropic-ai/sdk"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Database } from "@/lib/supabase/database.types"

import { loadMessages, runAgentTurn, startConversation } from "./agent"
import { endConversation, type Summary } from "./summary"

const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SECRET_KEY
const SALON = "b0000000-0000-4000-8000-000000000001"

type Block = Anthropic.Beta.BetaContentBlock
type Step = { content: Block[]; stop: Anthropic.Beta.BetaStopReason }

/** Un client Claude care întoarce răspunsurile din `script` și ține minte ce a primit. */
function fakeClaude(script: Step[], summary?: Summary) {
  const calls: Anthropic.Beta.MessageCreateParamsNonStreaming[] = []
  let i = 0
  const message = (step: Step) => ({
    id: `msg_${i}`,
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: step.content,
    stop_reason: step.stop,
    stop_details: null,
    usage: { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  })
  const client = {
    beta: {
      messages: {
        create: async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => {
          calls.push(structuredClone(params)) // ce ar pleca pe fir în momentul apelului
          const step = script[i++]
          if (!step) throw new Error("Scriptul s-a terminat.")
          return message(step)
        },
        parse: async () => ({ ...message({ content: [], stop: "end_turn" }), parsed_output: summary ?? null }),
      },
    },
  } as unknown as Anthropic
  return { client, calls }
}

const thinking = (sig: string): Block => ({ type: "thinking", thinking: "", signature: sig }) as Block
const text = (t: string): Block => ({ type: "text", text: t, citations: null }) as Block
const toolUse = (id: string, name: string, input: Record<string, unknown>): Block => ({ type: "tool_use", id, name, input }) as Block

describe.skipIf(!url || !key)("bucla agentului (Claude simulat)", () => {
  let db: SupabaseClient<Database>
  const conversations: string[] = []
  const open = async (channel: "whatsapp" | "email" = "whatsapp", context = { customerPhone: "+40722000093" }) => {
    const id = await startConversation(db, { tenantId: SALON, channel, context, isTest: true })
    conversations.push(id)
    return id
  }

  beforeAll(() => {
    db = createClient<Database>(url!, key!, { auth: { persistSession: false } })
  })
  afterAll(async () => {
    if (!db) return
    await db.from("handoffs").delete().in("conversation_id", conversations)
    await db.from("usage_events").delete().in("conversation_id", conversations)
    await db.from("conversations").delete().in("id", conversations)
    await db.from("faq_items").delete().eq("tenant_id", SALON).eq("source", "suggestion")
  })

  it("salvează mesajele și apelurile de unelte și trimite istoricul doar prin adăugare", async () => {
    const id = await open()
    // Cheile argumentelor într-o ordine „nealfabetică”, ca să prindem orice reordonare.
    const args = { service_id: "d0000000-0000-4000-8000-000000000001", date_from: "2030-01-09" }
    const { client, calls } = fakeClaude([
      { content: [thinking("sig-1"), text("Verific."), toolUse("tu_1", "list_services", {})], stop: "tool_use" },
      { content: [thinking("sig-2"), toolUse("tu_2", "check_availability", args)], stop: "tool_use" },
      { content: [text("Avem loc miercuri la 9:00.")], stop: "end_turn" },
      { content: [text("Cu plăcere!")], stop: "end_turn" },
    ])

    const first = await runAgentTurn(db, client, { conversationId: id, text: "Vreau un tuns miercuri." })
    expect(first.reply).toBe("Avem loc miercuri la 9:00.")
    expect(first.rows.map((r) => r.role)).toEqual(["customer", "system", "agent", "tool", "agent", "tool", "agent"])
    const tool = first.rows.find((r) => r.tool_name === "check_availability")!
    expect(tool.tool_use_id).toBe("tu_2")
    expect((tool.tool_output as { ok: boolean }).ok).toBe(true)

    await runAgentTurn(db, client, { conversationId: id, text: "Mulțumesc!" })

    // Fiecare apel începe exact cu istoricul apelului anterior + răspunsul lui.
    for (let n = 1; n < calls.length; n++) {
      const before = JSON.stringify(calls[n - 1].messages).slice(0, -1)
      expect(JSON.stringify(calls[n].messages).startsWith(before)).toBe(true)
      expect(calls[n].system).toEqual(calls[0].system)
      expect(calls[n].tools).toEqual(calls[0].tools)
    }
    // Argumentele uneltei se retrimit cu aceeași ordine a cheilor.
    expect(JSON.stringify(calls[3].messages)).toContain(JSON.stringify(args))
    // Ora curentă vine ca mesaj de sistem după fiecare mesaj al clientului.
    expect(calls[3].messages.filter((m) => m.role === "system")).toHaveLength(2)
    expect(calls[0]).toMatchObject({ model: "claude-opus-5-5", thinking: { type: "adaptive" }, fallbacks: "default" })

    const saved = await loadMessages(db, id)
    expect(saved).toHaveLength(10)
  })

  it("trimite modelului erorile de validare, fără să oprească tura", async () => {
    const id = await open()
    const { client, calls } = fakeClaude([
      { content: [toolUse("tu_x", "hold_slot", { service_id: "nu-e-uuid" })], stop: "tool_use" },
      { content: [text("Scuze, verific din nou.")], stop: "end_turn" },
    ])
    const turn = await runAgentTurn(db, client, { conversationId: id, text: "Țineți-mi ora." })
    expect(turn.reply).toBe("Scuze, verific din nou.")
    const result = (calls[1].messages.at(-1)!.content as Anthropic.Beta.BetaToolResultBlockParam[])[0]
    expect(result).toMatchObject({ tool_use_id: "tu_x", is_error: true })
  })

  it("la refuz răspunde politicos și predă la om", async () => {
    const id = await open()
    const { client } = fakeClaude([{ content: [], stop: "refusal" }])
    const turn = await runAgentTurn(db, client, { conversationId: id, text: "…" })
    expect(turn.reply).toMatch(/coleg/)
    const { count } = await db.from("handoffs").select("id", { count: "exact", head: true }).eq("conversation_id", id)
    expect(count).toBe(1)
  })

  it("un e-mail marcat ca spam nu primește răspuns", async () => {
    const id = await open("email", { customerEmail: "newsletter@example.test" } as never)
    const { client } = fakeClaude([
      { content: [toolUse("tu_e", "classify_email", { category: "newsletter" })], stop: "tool_use" },
      { content: [text("Marcat.")], stop: "end_turn" },
    ])
    const turn = await runAgentTurn(db, client, { conversationId: id, text: "Ofertele săptămânii!" })
    expect(turn.reply).toBeNull()
    expect(turn.actions).toContain("no_reply")
  })

  it("la final salvează rezumatul și propune întrebările fără răspuns", async () => {
    const id = await open()
    const { client } = fakeClaude([{ content: [text("Nu știu, verific cu echipa.")], stop: "end_turn" }], {
      rezumat: "Clientul a întrebat de parcarea pentru biciclete.",
      intentie: "informatii",
      rezultat: "predat_la_om",
      sentiment: "neutru",
      actiune_necesara: "Răspundeți despre parcarea pentru biciclete.",
      intrebari_fara_raspuns: ["Aveți loc pentru biciclete?"],
    })
    await runAgentTurn(db, client, { conversationId: id, text: "Aveți loc pentru biciclete?" })
    const summary = await endConversation(db, client, id)
    expect(summary?.rezultat).toBe("predat_la_om")

    const { data: conv } = await db.from("conversations").select("status, outcome, summary").eq("id", id).single()
    expect(conv).toMatchObject({ status: "closed", outcome: "handoff", summary: "Clientul a întrebat de parcarea pentru biciclete." })
    const { data: faq } = await db.from("faq_items").select("active, source, answer").eq("tenant_id", SALON).eq("question", "Aveți loc pentru biciclete?").single()
    expect(faq).toEqual({ active: false, source: "suggestion", answer: null })

    await expect(runAgentTurn(db, client, { conversationId: id, text: "Alo?" })).rejects.toThrow(/încheiată/)
  })
})
